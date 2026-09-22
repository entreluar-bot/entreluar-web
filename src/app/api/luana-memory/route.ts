import { NextResponse } from "next/server";
import { authenticateAiRequest } from "@/lib/ai/auth";

const categories = new Set(["identidade", "rotina", "experiencia", "opiniao", "linguagem", "limite"]);
const privacyLevels = new Set(["publica", "editorial", "privada"]);
const statuses = new Set(["sugerida", "aprovada", "arquivada"]);

type UsageRow = {
  content_type?: string | null; input_tokens?: number | null; output_tokens?: number | null; thought_tokens?: number | null;
  tool_tokens?: number | null; total_tokens?: number | null; search_queries?: number | null; duration_ms?: number | null;
  estimated_cost_brl?: number | string | null; cache_hit?: boolean | null; retry_count?: number | null; created_at: string;
};

export async function GET(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const [{ data, error }, extendedUsage] = await Promise.all([
      supabase.from("luana_memories").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("ai_generation_history").select("content_type,input_tokens,output_tokens,thought_tokens,tool_tokens,total_tokens,search_queries,duration_ms,estimated_cost_brl,cache_hit,retry_count,created_at")
        .eq("user_id", user.id).gte("created_at", monthStart.toISOString()).order("created_at", { ascending: false }).limit(1000),
    ]);
    if (error) throw error;
    let usageRows = (extendedUsage.data || []) as UsageRow[];
    if (extendedUsage.error) {
      const fallback = await supabase.from("ai_generation_history").select("content_type,input_tokens,output_tokens,search_queries,created_at").eq("user_id", user.id).gte("created_at", monthStart.toISOString()).order("created_at", { ascending: false }).limit(1000);
      usageRows = (fallback.data || []) as UsageRow[];
    }
    const now = Date.now();
    const summarize = (rows: typeof usageRows) => rows.reduce((total, row) => ({
      inputTokens: total.inputTokens + (row.input_tokens || 0), outputTokens: total.outputTokens + (row.output_tokens || 0),
      thoughtTokens: total.thoughtTokens + Number(row.thought_tokens || 0),
      totalTokens: total.totalTokens + Number(row.total_tokens || Number(row.input_tokens || 0) + Number(row.output_tokens || 0)),
      searches: total.searches + (row.search_queries || 0), costBrl: total.costBrl + Number(row.estimated_cost_brl || 0),
      retries: total.retries + Number(row.retry_count || 0),
    }), { inputTokens: 0, outputTokens: 0, thoughtTokens: 0, totalTokens: 0, searches: 0, costBrl: 0, retries: 0 });
    const durations = usageRows.map((row) => Number(row.duration_ms || 0)).filter((value) => value > 0).sort((a, b) => a - b);
    const percentile = (values: number[], ratio: number) => values.length ? values[Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1)] : 0;
    const grouped = usageRows.reduce<Record<string, UsageRow[]>>((result, row) => { const key = row.content_type || "outro"; (result[key] ||= []).push(row); return result; }, {});
    const byType = Object.entries(grouped).map(([type, rows]) => ({ type, ...summarize(rows) })).sort((a, b) => b.costBrl - a.costBrl);
    const usage = {
      ...summarize(usageRows),
      last24h: summarize(usageRows.filter((row) => now - new Date(row.created_at).getTime() <= 24 * 60 * 60 * 1000)),
      last7d: summarize(usageRows.filter((row) => now - new Date(row.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000)),
      latency: { p50: percentile(durations, 0.5), p95: percentile(durations, 0.95) },
      cacheHits: usageRows.filter((row) => row.cache_hit).length,
      byType,
    };
    return NextResponse.json({ memories: data || [], usage });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Não foi possível carregar a memória";
    return NextResponse.json({ error: message }, { status: message.includes("autoriz") || message.includes("Sessão") ? 401 : 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const content = String(body.content || "").trim();
    const category = categories.has(body.category) ? body.category : "opiniao";
    const privacy = privacyLevels.has(body.privacy) ? body.privacy : "editorial";
    if (content.length < 3 || content.length > 1200) throw new Error("A memória deve ter entre 3 e 1.200 caracteres");
    const tags = Array.from(new Set((Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(","))
      .map((tag: unknown) => String(tag).trim().toLowerCase()).filter(Boolean))).slice(0, 12);
    const { data, error } = await supabase.from("luana_memories").insert({
      user_id: user.id, category, content, tags, privacy, status: "aprovada",
      allow_in_content: privacy === "publica" && Boolean(body.allowInContent),
      valid_until: body.validUntil || null,
    }).select("*").single();
    if (error) throw error;
    return NextResponse.json({ memory: data });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a memória" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    if (!body.id) throw new Error("Memória não informada");
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.content === "string") {
      const content = body.content.trim();
      if (content.length < 3 || content.length > 1200) throw new Error("A memória deve ter entre 3 e 1.200 caracteres");
      updates.content = content;
    }
    if (categories.has(body.category)) updates.category = body.category;
    if (privacyLevels.has(body.privacy)) updates.privacy = body.privacy;
    if (statuses.has(body.status)) updates.status = body.status;
    if (typeof body.allowInContent === "boolean") updates.allow_in_content = body.allowInContent;
    if (Array.isArray(body.tags)) updates.tags = body.tags.map((tag: unknown) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 12);
    if (body.validUntil !== undefined) updates.valid_until = body.validUntil || null;
    const { data, error } = await supabase.from("luana_memories").update(updates).eq("id", body.id).eq("user_id", user.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ memory: data });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível atualizar a memória" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new Error("Memória não informada");
    const { error } = await supabase.from("luana_memories").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível excluir a memória" }, { status: 400 });
  }
}
