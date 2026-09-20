import { NextResponse } from "next/server";
import { authenticateAiRequest } from "@/lib/ai/auth";

const categories = new Set(["identidade", "rotina", "experiencia", "opiniao", "linguagem", "limite"]);
const privacyLevels = new Set(["publica", "editorial", "privada"]);
const statuses = new Set(["sugerida", "aprovada", "arquivada"]);

export async function GET(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const [{ data, error }, { data: usageRows }] = await Promise.all([
      supabase.from("luana_memories").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.from("ai_generation_history").select("input_tokens,output_tokens,search_queries").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    if (error) throw error;
    const usage = (usageRows || []).reduce((total, row) => ({ inputTokens: total.inputTokens + (row.input_tokens || 0), outputTokens: total.outputTokens + (row.output_tokens || 0), searches: total.searches + (row.search_queries || 0) }), { inputTokens: 0, outputTokens: 0, searches: 0 });
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
