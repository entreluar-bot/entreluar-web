import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeForMatch } from "./blocklist";
import { extractOpeningSignature } from "./openings";

export interface SocialProofMemory {
  existingPostCount: number;
  existingPostBodies: string[];
  usedNames: Set<string>;
  recentOpenings: string[];
  repeatedTrigrams: string[];
}

export function buildMemoryFromTexts(
  postComments: Array<{ body?: string | null; reader_name?: string | null }>,
  globalComments: Array<{ body?: string | null }>,
): SocialProofMemory {
  const usedNames = new Set<string>();
  const existingPostBodies: string[] = [];
  const openingSet = new Set<string>();
  const trigramCounts = new Map<string, number>();

  for (const row of postComments) {
    if (row.reader_name) {
      usedNames.add(normalizeForMatch(row.reader_name));
      const first = normalizeForMatch(row.reader_name).split(" ")[0];
      if (first) usedNames.add(first);
    }
    if (row.body) {
      existingPostBodies.push(row.body);
      const opening = extractOpeningSignature(row.body, 3);
      if (opening && opening.length >= 4) openingSet.add(opening);
    }
  }

  const allBodies = [
    ...existingPostBodies,
    ...globalComments.map((r) => r.body || "").filter(Boolean),
  ];

  for (const body of allBodies) {
    const opening = extractOpeningSignature(body, 3);
    if (opening && opening.length >= 5) openingSet.add(opening);

    const words = normalizeForMatch(body)
      .split(" ")
      .filter((w) => w.length >= 2);
    const seenInComment = new Set<string>();
    for (let i = 0; i <= words.length - 3; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (trigram.length < 10 || seenInComment.has(trigram)) continue;
      seenInComment.add(trigram);
      trigramCounts.set(trigram, (trigramCounts.get(trigram) || 0) + 1);
    }
  }

  const repeatedTrigrams = Array.from(trigramCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 35)
    .map(([phrase]) => phrase);

  return {
    existingPostCount: postComments.length,
    existingPostBodies,
    usedNames,
    recentOpenings: Array.from(openingSet).slice(0, 35),
    repeatedTrigrams,
  };
}

export async function loadSocialProofMemory(
  supabase: SupabaseClient,
  journalId: string,
): Promise<SocialProofMemory> {
  const [{ data: postRows }, { data: globalRows }] = await Promise.all([
    supabase
      .from("journal_comments")
      .select("body,reader_name")
      .eq("journal_id", journalId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("journal_comments")
      .select("body")
      .not("journal_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  return buildMemoryFromTexts(postRows || [], globalRows || []);
}
