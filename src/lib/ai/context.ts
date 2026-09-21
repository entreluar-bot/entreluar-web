import type { SupabaseClient } from "@supabase/supabase-js";

export type AiMemory = {
  id: string;
  category: string;
  content: string;
  tags: string[];
  privacy: "publica" | "editorial" | "privada";
  allow_in_content: boolean;
};

type HistoryItem = {
  opening_style?: string | null;
  structure_style?: string | null;
  closing_style?: string | null;
  title?: string | null;
  notable_phrases?: string[] | null;
};

const MAX_MEMORY_CHARS = 1800;
const MAX_HISTORY_CHARS = 900;
const stopWords = new Set(["para", "como", "sobre", "uma", "com", "sem", "que", "por", "dos", "das", "nas", "nos", "produto", "texto"]);

function compact(value: string, maxChars: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

export function topicTags(...values: Array<string | undefined>) {
  return Array.from(new Set(values.join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !stopWords.has(word)))).slice(0, 10);
}

export async function loadAiContext(supabase: SupabaseClient, userId: string, contentType: string, tags: string[]) {
  const now = new Date().toISOString();
  const [{ data: tagged }, { data: identity }, { data: history }] = await Promise.all([
    tags.length ? supabase.from("luana_memories").select("id,category,content,tags,privacy,allow_in_content")
      .eq("user_id", userId).eq("status", "aprovada").neq("privacy", "privada")
      .or(`valid_until.is.null,valid_until.gt.${now}`).overlaps("tags", tags).limit(8) : Promise.resolve({ data: [] }),
    supabase.from("luana_memories").select("id,category,content,tags,privacy,allow_in_content")
      .eq("user_id", userId).eq("status", "aprovada").neq("privacy", "privada")
      .in("category", ["identidade", "linguagem", "limite"]).or(`valid_until.is.null,valid_until.gt.${now}`).limit(8),
    supabase.from("ai_generation_history").select("opening_style,structure_style,closing_style,title,notable_phrases")
      .eq("user_id", userId).eq("content_type", contentType).order("created_at", { ascending: false }).limit(6),
  ]);

  const byId = new Map<string, AiMemory>();
  for (const item of [...((identity || []) as AiMemory[]), ...((tagged || []) as AiMemory[])]) byId.set(item.id, item);
  const memories = Array.from(byId.values());
  const memoryText = compact(memories.map((item) => {
    const usage = item.allow_in_content ? "pode ser citada" : "serve apenas para orientar a voz";
    return `- [${item.category}; ${usage}] ${item.content}`;
  }).join("\n"), MAX_MEMORY_CHARS);

  const recent = (history || []) as HistoryItem[];
  const historyText = compact(recent.map((item) => [item.title, item.opening_style, item.structure_style, item.closing_style, ...(item.notable_phrases || [])]
    .filter(Boolean).join(" | ")).join("\n"), MAX_HISTORY_CHARS);

  return {
    memoryIds: memories.map((item) => item.id),
    memoryPrompt: memoryText ? `MEMÓRIAS SELETIVAS DA LUANA:\n${memoryText}` : "Não há memória pessoal aprovada pertinente. Não invente fatos para preencher essa ausência.",
    antiRepetitionPrompt: historyText ? `EVITE REPETIR ESCOLHAS DOS CONTEÚDOS RECENTES:\n${historyText}` : "Não há histórico recente disponível; ainda assim, evite fórmulas prontas.",
  };
}

export async function recordGeneration(supabase: SupabaseClient, userId: string, data: {
  contentType: string; topic?: string; title?: string; openingStyle?: string; structureStyle?: string;
  closingStyle?: string; notablePhrases?: string[]; memoryIds?: string[]; sourceCount?: number;
  inputTokens?: number; outputTokens?: number; searchQueries?: number;
}) {
  await supabase.from("ai_generation_history").insert({
    user_id: userId,
    content_type: data.contentType,
    topic: compact(data.topic || "", 300),
    title: compact(data.title || "", 240),
    opening_style: compact(data.openingStyle || "", 180),
    structure_style: compact(data.structureStyle || "", 180),
    closing_style: compact(data.closingStyle || "", 180),
    notable_phrases: (data.notablePhrases || []).slice(0, 3).map((value) => compact(value, 140)),
    memory_ids: data.memoryIds || [],
    source_count: data.sourceCount || 0,
    input_tokens: data.inputTokens || 0,
    output_tokens: data.outputTokens || 0,
    search_queries: data.searchQueries || 0,
  });

  if (data.memoryIds?.length) {
    await supabase.from("luana_memories").update({ last_used_at: new Date().toISOString() }).in("id", data.memoryIds);
  }
}

export async function suggestMemoryFromNotes(supabase: SupabaseClient, userId: string, notes: string | undefined, tags: string[]) {
  const content = compact(notes || "", 1200);
  if (content.length < 30) return;
  const { data: existing } = await supabase.from("luana_memories").select("id").eq("user_id", userId).eq("content", content).maybeSingle();
  if (existing) return;
  await supabase.from("luana_memories").insert({
    user_id: userId,
    category: "experiencia",
    content,
    tags: tags.slice(0, 10),
    privacy: "editorial",
    status: "sugerida",
    allow_in_content: false,
  });
}

export function parseJson<T>(raw: string | undefined): T {
  const cleaned = (raw || "{}").replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    throw new Error("A resposta da IA veio incompleta. Tente gerar novamente.");
  }
}
