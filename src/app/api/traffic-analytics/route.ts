import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TrafficSource = "instagram" | "facebook" | "direct" | "internet";
type VisitRow = { path: string | null; session_id: string | null; referrer: string | null; utm_source: string | null; created_at: string };
type ConversionRow = { email: string | null; path: string | null; source: string | null; utm_source: string | null; created_at: string };

const sourceLabels: Record<TrafficSource, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  direct: "Direto",
  internet: "Internet",
};

async function getAuthenticatedClient(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Configuração do Supabase ausente.");

  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return null;

  return createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function fetchAll<T>(queryFactory: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 10000; from += pageSize) {
    const { data, error } = await queryFactory(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function classifySource(row: { referrer?: string | null; source?: string | null; utm_source?: string | null }): TrafficSource {
  const values = `${row.utm_source || ""} ${row.referrer || ""} ${row.source || ""}`.toLowerCase();
  if (values.includes("instagram") || values.includes("l.instagram.com")) return "instagram";
  if (values.includes("facebook") || values.includes("fb.com") || values.includes("l.facebook.com")) return "facebook";
  if (!row.utm_source && !row.referrer && (!row.source || row.source === "site" || row.source === "direct")) return "direct";
  return "internet";
}

function startOfSaoPauloToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "01";
  return new Date(`${value("year")}-${value("month")}-${value("day")}T03:00:00.000Z`);
}

function countByPath(rows: VisitRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.path || "/", (counts.get(row.path || "/") || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, visits]) => ({ path, visits }));
}

function summarize(visits: VisitRow[], conversions: ConversionRow[], since?: Date) {
  const filteredVisits = since ? visits.filter((visit) => new Date(visit.created_at) >= since) : visits;
  const filteredConversions = since ? conversions.filter((conversion) => new Date(conversion.created_at) >= since) : conversions;
  const sources = (Object.keys(sourceLabels) as TrafficSource[]).map((source) => {
    const sourceVisits = filteredVisits.filter((visit) => classifySource(visit) === source);
    const sourceConversions = filteredConversions.filter((conversion) => classifySource(conversion) === source);
    return {
      source,
      label: sourceLabels[source],
      visits: sourceVisits.length,
      uniqueSessions: new Set(sourceVisits.map((visit) => visit.session_id).filter(Boolean)).size,
      conversions: sourceConversions.length,
      conversionRate: sourceVisits.length ? (sourceConversions.length / sourceVisits.length) * 100 : 0,
    };
  });

  return {
    visits: filteredVisits.length,
    uniqueSessions: new Set(filteredVisits.map((visit) => visit.session_id).filter(Boolean)).size,
    conversions: filteredConversions.length,
    conversionRate: filteredVisits.length ? (filteredConversions.length / filteredVisits.length) * 100 : 0,
    sources,
    topPages: countByPath(filteredVisits),
  };
}

export async function GET(req: Request) {
  try {
    const supabase = await getAuthenticatedClient(req);
    if (!supabase) return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });

    const [visits, conversions] = await Promise.all([
      fetchAll<VisitRow>((from, to) => supabase.from("site_visits").select("path,session_id,referrer,utm_source,created_at").order("created_at", { ascending: false }).range(from, to)),
      fetchAll<ConversionRow>((from, to) => supabase.from("newsletter_conversions").select("email,path,source,utm_source,created_at").order("created_at", { ascending: false }).range(from, to)),
    ]);

    const today = startOfSaoPauloToday();
    const last7 = new Date(today);
    last7.setUTCDate(last7.getUTCDate() - 6);
    const last30 = new Date(today);
    last30.setUTCDate(last30.getUTCDate() - 29);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      periods: {
        today: { label: "Hoje", ...summarize(visits, conversions, today) },
        last7: { label: "7 dias", ...summarize(visits, conversions, last7) },
        last30: { label: "30 dias", ...summarize(visits, conversions, last30) },
        all: { label: "Geral", ...summarize(visits, conversions) },
      },
      recentConversions: conversions.slice(0, 6),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar tráfego.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
