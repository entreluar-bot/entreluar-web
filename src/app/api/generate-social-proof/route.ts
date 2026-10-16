import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { combineUsage, generateAi, type AiUsage } from "@/lib/ai/runtime";
import { plainTextFromHtml } from "@/lib/share-metadata";
import { recordGeneration } from "@/lib/ai/context";
import { chooseCommentCount, drawPersonaBatch } from "@/lib/social-proof/personas";
import { loadSocialProofMemory } from "@/lib/social-proof/memory";
import { buildRetrySocialProofPrompt, buildSocialProofPrompt } from "@/lib/social-proof/prompt";
import { validateCommentBatch } from "@/lib/social-proof/validate";
import { generateReaderIdentity } from "@/lib/social-proof/names";
import { generateReactionCounts, generateSafeCommentDate, isFuturePostDate } from "@/lib/social-proof/timing";

export const maxDuration = 60;

const socialProofSchema = {
  type: "object",
  properties: {
    comments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "number" },
          body: { type: "string" },
        },
        required: ["index", "body"],
      },
    },
  },
  required: ["comments"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const { journalId, productId, contentType, category, title, content, dryRun } = body;

    // Trava inegociável: Vitrine (produtos) nunca pode ter prova social
    if (productId || contentType === "product") {
      return NextResponse.json(
        { error: "Prova social não é permitida na Vitrine de produtos." },
        { status: 400 },
      );
    }

    if (!journalId) {
      return NextResponse.json({ error: "journalId é obrigatório" }, { status: 400 });
    }

    const { data: journalRow, error: journalError } = await supabase
      .from("journal")
      .select("id,created_at,title,category,content")
      .eq("id", journalId)
      .single();

    if (journalError || !journalRow) {
      return NextResponse.json({ error: "Postagem do Diário não encontrada." }, { status: 404 });
    }

    const journalCreatedAt = journalRow.created_at || new Date().toISOString();
    const now = new Date();

    // Trava de data: impede gerar prova social para post agendado no futuro
    if (isFuturePostDate(journalCreatedAt, now)) {
      return NextResponse.json(
        { error: "Esse post está com data futura. Publique ou ajuste a data antes de gerar a prova social 🌙" },
        { status: 400 },
      );
    }

    const effectiveTitle = title || journalRow.title || "Sem título";
    const effectiveCategory = category || journalRow.category || "Geral";
    const sourceText = plainTextFromHtml(content || journalRow.content || "", 2000);

    // 1. Carrega memória anti-repetição (comentários do post + últimos do blog)
    const memory = await loadSocialProofMemory(supabase, journalId);

    // 2. Sorteia quantidade contextual e fichas de persona independentes
    const numComments = chooseCommentCount(memory.existingPostCount);
    const cards = drawPersonaBatch(numComments, sourceText);

    // 3. Chama o modelo apenas para dar voz às fichas (sem gerar nome/email/data)
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = buildSocialProofPrompt({
      title: effectiveTitle,
      category: effectiveCategory,
      sourceText,
      cards,
      memory,
    });

    const usages: AiUsage[] = [];
    const { response, usage } = await generateAi(ai, "socialProof", {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: socialProofSchema as never,
        temperature: 1.0,
        topP: 0.95,
      },
    });
    usages.push(usage);

    const parsed = JSON.parse(response.text || "{}");
    const rawItems: Array<{ index: number; body: string }> = Array.isArray(parsed.comments)
      ? parsed.comments.map((c: { index?: number; body?: string }, idx: number) => ({
          index: typeof c.index === "number" ? c.index : idx + 1,
          body: String(c.body || ""),
        }))
      : [];

    // 4. Valida lote contra clichês, aberturas repetidas e similaridade
    const { approved, rejected } = validateCommentBatch(rawItems, cards, memory);

    // 5. No máximo 1 rodada de regeração agrupada para os reprovados
    let retryCount = 0;
    if (rejected.length > 0) {
      retryCount = 1;
      const rejectedCards = cards.filter((c) => !approved.has(c.index));
      const retryPrompt = buildRetrySocialProofPrompt({
        title: effectiveTitle,
        sourceText,
        rejectedCards,
        issues: rejected,
        alreadyApprovedBodies: Array.from(approved.values()),
        memory,
      });

      try {
        const retryResult = await generateAi(ai, "socialProof", {
          contents: retryPrompt,
          config: {
            responseMimeType: "application/json",
            responseJsonSchema: socialProofSchema as never,
            temperature: 1.05,
            topP: 0.95,
          },
        });
        usages.push(retryResult.usage);
        const retryParsed = JSON.parse(retryResult.response.text || "{}");
        const retryItems: Array<{ index: number; body: string }> = Array.isArray(retryParsed.comments)
          ? retryParsed.comments.map((c: { index?: number; body?: string }, idx: number) => ({
              index: typeof c.index === "number" ? c.index : rejectedCards[idx]?.index || idx + 1,
              body: String(c.body || ""),
            }))
          : [];

        const retryValidation = validateCommentBatch(retryItems, rejectedCards, {
          existingPostBodies: [...memory.existingPostBodies, ...Array.from(approved.values())],
          recentOpenings: memory.recentOpenings,
          repeatedTrigrams: memory.repeatedTrigrams,
        });
        for (const [idx, text] of retryValidation.approved.entries()) {
          approved.set(idx, text);
        }
      } catch (retryErr) {
        console.warn("Aviso na regeração pontual da prova social:", retryErr);
      }
    }

    // 6. Monta registros finais com nomes, e-mails e datas seguras gerados em código
    const usedNames = new Set(memory.usedNames);
    const preparedComments = cards
      .filter((card) => approved.has(card.index))
      .map((card) => {
        const identity = generateReaderIdentity(card.ageBracket, usedNames);
        const commentDate = generateSafeCommentDate(journalCreatedAt, card.intent, now);
        return {
          journal_id: journalId,
          email: identity.email,
          reader_name: identity.readerName,
          hide_reader_name: identity.hideReaderName,
          body: approved.get(card.index)!,
          status: "approved" as const,
          origin: "social_proof" as const,
          created_at: commentDate,
          approved_at: commentDate,
          _persona: {
            ageBracket: card.ageBracket,
            fluency: card.fluency,
            intent: card.intent,
            lengthTier: card.lengthTier,
            opening: card.opening.id,
          },
        };
      });

    const totalUsage = combineUsage(usages);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        comments: preparedComments.length,
        preview: preparedComments,
        usage: totalUsage,
        retryCount,
      });
    }

    let generatedCommentsCount = 0;
    if (preparedComments.length > 0) {
      const dbRowsWithOrigin = preparedComments.map(({ _persona: _, ...row }) => row);
      let { error } = await supabase.from("journal_comments").insert(dbRowsWithOrigin);
      // Fallback caso a migration da coluna origin ainda não tenha rodado no banco
      if (error && /origin/i.test(error.message)) {
        const dbRowsLegacy = dbRowsWithOrigin.map(({ origin: _, ...rest }) => rest);
        ({ error } = await supabase.from("journal_comments").insert(dbRowsLegacy));
      }
      if (error) {
        console.error("Error inserting comments:", error);
        throw new Error("Erro DB Comentários: " + error.message);
      }
      generatedCommentsCount = preparedComments.length;
    }

    // 7. Reações com proporção variável e datas sempre posteriores ao post
    let generatedLikesCount = 0;
    let generatedDislikesCount = 0;
    if (generatedCommentsCount > 0) {
      const { likes, dislikes } = generateReactionCounts(generatedCommentsCount);
      const reactionRows = [
        ...Array.from({ length: likes }, () => "like" as const),
        ...Array.from({ length: dislikes }, () => "dislike" as const),
      ].map((reaction) => {
        const date = generateSafeCommentDate(journalCreatedAt, undefined, now);
        return {
          journal_id: journalId,
          voter_id: crypto.randomUUID(),
          reaction,
          created_at: date,
          updated_at: date,
        };
      });
      const { error: reactionError } = await supabase.from("journal_reactions").insert(reactionRows);
      if (reactionError) {
        console.error("Error inserting reactions:", reactionError);
        throw new Error("Erro DB Reações: " + reactionError.message);
      }
      generatedLikesCount = likes;
      generatedDislikesCount = dislikes;
    }

    // 8. Votos na enquete (se existir)
    let generatedVotesCount = 0;
    const { data: poll } = await supabase.from("polls").select("id").eq("journal_id", journalId).maybeSingle();
    if (poll) {
      const { data: options } = await supabase.from("poll_options").select("id").eq("poll_id", poll.id);
      if (options && options.length > 0) {
        const numVotes = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
        const votes = Array.from({ length: numVotes }, () => {
          const randomOption = options[Math.floor(Math.random() * options.length)];
          return {
            poll_id: poll.id,
            option_id: randomOption.id,
            voter_id: crypto.randomUUID(),
          };
        });
        const { error: voteError } = await supabase.from("poll_votes").insert(votes);
        if (voteError) {
          console.error("Error inserting votes:", voteError);
          throw new Error("Erro DB Votos: " + voteError.message);
        }
        generatedVotesCount = votes.length;
      }
    }

    await recordGeneration(supabase, user.id, {
      contentType: "socialProof",
      topic: `Prova Social: ${effectiveTitle}`,
      usage: totalUsage,
      retryCount,
    });

    return NextResponse.json({
      comments: generatedCommentsCount,
      votes: generatedVotesCount,
      likes: generatedLikesCount,
      dislikes: generatedDislikesCount,
    });
  } catch (error: unknown) {
    console.error("Erro na prova social:", error);
    const message = error instanceof Error ? error.message : "Erro ao gerar prova social";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
