import type { GenerateContentResponse } from "@google/genai";

export type AiSource = { title: string; url: string };

export function extractGroundingSources(response: GenerateContentResponse): AiSource[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = chunks.flatMap((chunk) => chunk.web?.uri ? [{ title: chunk.web.title || "Fonte consultada", url: chunk.web.uri }] : []);
  return Array.from(new Map(sources.map((source) => [source.url, source])).values()).slice(0, 8);
}

export function sourcesHtml(sources: AiSource[]) {
  if (!sources.length) return "";
  return `<h3>🔎 Fontes que consultei</h3><ul>${sources.map((source) => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a></li>`).join("")}</ul>`;
}
