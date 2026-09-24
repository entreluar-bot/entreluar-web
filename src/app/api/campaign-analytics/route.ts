import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type VisitRow = { path: string | null; session_id: string | null; utm_campaign: string | null; created_at: string };
type ConversionRow = { email: string | null; path: string | null; source: string | null; utm_campaign: string | null; created_at: string };

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

function countByPath(rows: VisitRow[]) {
  const counts = new Map<string, number>();
  rows.forEach((row) => counts.set(row.path || "/", (counts.get(row.path || "/") || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, visits]) => ({ path, visits }));
}

export async function GET(req: Request) {
  try {
    const supabase = await getAuthenticatedClient(req);
    if (!supabase) return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const campaign = searchParams.get("campaign") || "lancamentos_50mais";
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [visitsResult, conversionsResult] = await Promise.all([
      supabase.from("site_visits").select("path,session_id,utm_campaign,created_at").eq("utm_campaign", campaign).gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
      supabase.from("newsletter_conversions").select("email,path,source,utm_campaign,created_at").eq("utm_campaign", campaign).gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    ]);

    if (visitsResult.error) throw new Error("Não foi possível consultar visitas da campanha.");
    if (conversionsResult.error) throw new Error("Não foi possível consultar cadastros da campanha.");

    const visits = (visitsResult.data || []) as VisitRow[];
    const conversions = (conversionsResult.data || []) as ConversionRow[];
    const uniqueSessions = new Set(visits.map((visit) => visit.session_id).filter(Boolean)).size;
    const conversionRate = visits.length ? (conversions.length / visits.length) * 100 : 0;

    return NextResponse.json({
      campaign,
      visits: visits.length,
      uniqueSessions,
      conversions: conversions.length,
      conversionRate,
      topPages: countByPath(visits),
      recentConversions: conversions.slice(0, 6),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar campanha.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
