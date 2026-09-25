import { ThinkingLevel, type GoogleGenAI, type ThinkingConfig } from "@google/genai";

export type AiTask = "brainstorm" | "quote" | "newsletter" | "blog" | "accessory" | "identify" | "research" | "product" | "summary";

type TaskPolicy = {
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  thinkingConfig: ThinkingConfig;
};

export type AiUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  thoughtTokens: number;
  toolTokens: number;
  totalTokens: number;
  durationMs: number;
  estimatedCostUsd: number;
  estimatedCostBrl: number;
};

const policies: Record<AiTask, TaskPolicy> = {
  brainstorm: { model: "gemini-3.5-flash-lite", maxOutputTokens: 300, timeoutMs: 10_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  quote: { model: "gemini-3.5-flash-lite", maxOutputTokens: 1_400, timeoutMs: 15_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  newsletter: { model: "gemini-3.1-flash-lite", maxOutputTokens: 900, timeoutMs: 10_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  blog: { model: "gemini-3.1-flash-lite", maxOutputTokens: 3_200, timeoutMs: 15_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  accessory: { model: "gemini-3.1-flash-lite", maxOutputTokens: 900, timeoutMs: 10_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  identify: { model: "gemini-3.1-flash-lite", maxOutputTokens: 300, timeoutMs: 10_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  research: { model: "gemini-3.6-flash", maxOutputTokens: 1_400, timeoutMs: 12_000, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
  product: { model: "gemini-3.1-flash-lite", maxOutputTokens: 3_200, timeoutMs: 12_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
  summary: { model: "gemini-3.1-flash-lite", maxOutputTokens: 500, timeoutMs: 10_000, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL } },
};

const prices: Record<string, { input: number; output: number }> = {
  "gemini-3.5-flash-lite": { input: 0.30, output: 2.50 },
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.50 },
  "gemini-3.6-flash": { input: 0.75, output: 3.75 },
};

export function getAiPolicy(task: AiTask): TaskPolicy {
  const policy = policies[task];
  const safeModel = (model: string) => {
    const normalized = model.replace(/^models\//, "");
    if ((task === "quote" || task === "brainstorm") && normalized === "gemini-2.5-flash-lite") return policy.model;
    return normalized;
  };
  if (process.env.AI_FORCE_LEGACY_MODEL === "true") {
    return { ...policy, model: safeModel(process.env.AI_LEGACY_MODEL || "gemini-3.6-flash"), thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } };
  }
  return { ...policy, model: safeModel(process.env[`AI_MODEL_${task.toUpperCase()}`] || policy.model) };
}

export async function generateAi(
  ai: GoogleGenAI,
  task: AiTask,
  params: { contents: unknown; config?: Record<string, unknown> },
) {
  const policy = getAiPolicy(task);
  const startedAt = Date.now();
  const response = await ai.models.generateContent({
    model: policy.model,
    contents: params.contents as never,
    config: {
      ...(params.config || {}),
      maxOutputTokens: policy.maxOutputTokens,
      thinkingConfig: policy.thinkingConfig,
      httpOptions: { timeout: policy.timeoutMs },
    },
  });
  return { response, usage: readUsage(policy.model, response.usageMetadata, Date.now() - startedAt) };
}

export function readUsage(model: string, metadata: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  toolUsePromptTokenCount?: number;
  totalTokenCount?: number;
} | undefined, durationMs: number): AiUsage {
  const inputTokens = metadata?.promptTokenCount || 0;
  const outputTokens = metadata?.candidatesTokenCount || 0;
  const thoughtTokens = metadata?.thoughtsTokenCount || 0;
  const toolTokens = metadata?.toolUsePromptTokenCount || 0;
  const totalTokens = metadata?.totalTokenCount || inputTokens + outputTokens + thoughtTokens + toolTokens;
  const rate = prices[model] || prices["gemini-3.6-flash"];
  const estimatedCostUsd = ((inputTokens + toolTokens) * rate.input + (outputTokens + thoughtTokens) * rate.output) / 1_000_000;
  const brlRate = Number(process.env.AI_USD_TO_BRL || "5.50");
  return { model, inputTokens, outputTokens, thoughtTokens, toolTokens, totalTokens, durationMs, estimatedCostUsd, estimatedCostBrl: estimatedCostUsd * brlRate };
}

export function combineUsage(usages: AiUsage[]): AiUsage {
  return usages.reduce<AiUsage>((sum, usage) => ({
    model: Array.from(new Set(`${sum.model},${usage.model}`.split(",").filter(Boolean))).join(","),
    inputTokens: sum.inputTokens + usage.inputTokens,
    outputTokens: sum.outputTokens + usage.outputTokens,
    thoughtTokens: sum.thoughtTokens + usage.thoughtTokens,
    toolTokens: sum.toolTokens + usage.toolTokens,
    totalTokens: sum.totalTokens + usage.totalTokens,
    durationMs: sum.durationMs + usage.durationMs,
    estimatedCostUsd: sum.estimatedCostUsd + usage.estimatedCostUsd,
    estimatedCostBrl: sum.estimatedCostBrl + usage.estimatedCostBrl,
  }), { model: "", inputTokens: 0, outputTokens: 0, thoughtTokens: 0, toolTokens: 0, totalTokens: 0, durationMs: 0, estimatedCostUsd: 0, estimatedCostBrl: 0 });
}

export function normalizeCacheSubject(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/https?:\/\/(www\.)?/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 112);
}
