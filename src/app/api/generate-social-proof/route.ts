import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { authenticateAiRequest } from "@/lib/ai/auth";
import { generateAi } from "@/lib/ai/runtime";
import { plainTextFromHtml } from "@/lib/share-metadata";
import { recordGeneration } from "@/lib/ai/context";

export const maxDuration = 60;

const socialProofSchema = {
  type: "object",
  properties: {
    comments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          email: { type: "string" },
          readerName: { type: "string" },
          body: { type: "string" }
        },
        required: ["email", "readerName", "body"]
      }
    }
  },
  required: ["comments"],
  additionalProperties: false,
};

function getRandomDateBetween(start: string | Date, end: string | Date) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  return new Date(startTime + Math.random() * (endTime - startTime)).toISOString();
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const { journalId, category, title, content } = body;

    if (!journalId) {
      return NextResponse.json({ error: "journalId é obrigatório" }, { status: 400 });
    }

    const { data: journalRow } = await supabase.from("journal").select("created_at").eq("id", journalId).single();
    const journalCreatedAt = journalRow?.created_at || new Date().toISOString();

    const sourceText = plainTextFromHtml(content, 3000);

    // Entre 3 e 8 comentários por geração
    const numComments = Math.floor(Math.random() * 6) + 3;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `Você é um gerador de interações (prova social) para um blog focado em mulheres maduras (menopausa, skincare, reflexões de vida, humor).
O post se chama "${title || 'Sem título'}" e o conteúdo é:
"""${sourceText}"""

A categoria do post é "${category || 'Geral'}".

Sua tarefa é gerar EXATAMENTE ${numComments} comentários BEM diversos, criativos e diferentes, simulando leitoras reais do blog.
Crie personagens com todo tipo de pensamento.
Variações OBRIGATÓRIAS que devem estar presentes:
- Pelo menos um comentário apenas com emojis (ex: "😍😍👏👏").
- Pelo menos um comentário curtíssimo e direto (ex: "Amei!", "Verdade Lu", "Eu toda").
- Pelo menos um comentário "papo cabeça", reflexivo e um pouco mais longo, dividindo uma experiência pessoal com a menopausa ou envelhecimento.
- Pelo menos um comentário com um erro de digitação comum ou coloquialismo ("tbm", "vdd", "nossa isso eh mto real").
- Uma discordância leve ou ponto de vista diferente, educada e sem agressividade. Escreva com uma construção ORIGINAL e única, com palavras diferentes a cada vez. É PROIBIDO usar "discordo um pouco" ou "discordo em parte" ou variações dessa expressão. Exemplos do espírito (não copie): "Hmm, no meu caso foi bem diferente...", "Será? Comigo não funcionou assim.", "Admiro o texto, mas fiquei com um pé atrás nessa parte.", "Pra mim a história é outra, sabe?".
- Se o número de comentários for pequeno (3 ou 4), priorize os mais variados e inclua só o que couber.

Para cada comentário gere:
- readerName: um nome brasileiro feminino plausível, curto ou composto (ex: Maria Helena, Cida, Solange).
- email: um email falso (ex: maria.silva89@gmail.com, lela_2000@yahoo.com.br, etc) que reflita a idade e estilo da "leitora".
- body: o texto do comentário.

Devolva apenas o JSON.`;

    const { response, usage } = await generateAi(ai, "accessory", {
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: socialProofSchema as any, temperature: 0.9 },
    });

    const parsed = JSON.parse(response.text || "{}");
    const comments = (parsed.comments || []).slice(0, numComments);

    let generatedCommentsCount = 0;
    if (comments.length > 0) {
      const publicNameCount = Math.round(comments.length * 0.8);
      const now = new Date().toISOString();
      const inserts = comments.map((c: any, index: number) => {
        const commentDate = getRandomDateBetween(journalCreatedAt, now);
        return {
          journal_id: journalId,
          email: c.email,
          reader_name: typeof c.readerName === "string" ? c.readerName.slice(0, 80) : null,
          hide_reader_name: index >= publicNameCount,
          body: c.body,
          status: "approved",
          created_at: commentDate,
          approved_at: commentDate,
        };
      });
      const { error } = await supabase.from("journal_comments").insert(inserts);
      if (error) { console.error("Error inserting comments:", error); throw new Error("Erro DB Comentários: " + error.message); } else {
        generatedCommentsCount = inserts.length;
      }
    }

    // Reações: 3x o número de comentários, sendo de 5% a 10% "não curti"
    let generatedLikesCount = 0;
    let generatedDislikesCount = 0;
    if (generatedCommentsCount > 0) {
      const totalReactions = generatedCommentsCount * 3;
      const dislikeRatio = 0.05 + Math.random() * 0.05;
      const dislikes = Math.max(1, Math.round(totalReactions * dislikeRatio));
      const likes = totalReactions - dislikes;
      const reactionRows = [
        ...Array.from({ length: likes }, () => "like" as const),
        ...Array.from({ length: dislikes }, () => "dislike" as const),
      ].map((reaction) => {
        const date = getRandomDateBetween(journalCreatedAt, new Date().toISOString());
        return { journal_id: journalId, voter_id: crypto.randomUUID(), reaction, created_at: date, updated_at: date };
      });
      const { error: reactionError } = await supabase.from("journal_reactions").insert(reactionRows);
      if (reactionError) { console.error("Error inserting reactions:", reactionError); throw new Error("Erro DB Reações: " + reactionError.message); }
      generatedLikesCount = likes;
      generatedDislikesCount = dislikes;
    }

    let generatedVotesCount = 0;
    // Check if there is a poll
    const { data: poll } = await supabase.from("polls").select("id").eq("journal_id", journalId).single();
    if (poll) {
      const { data: options } = await supabase.from("poll_options").select("id").eq("poll_id", poll.id);
      if (options && options.length > 0) {
        // Generate 8 to 15 random votes
        const numVotes = Math.floor(Math.random() * (15 - 8 + 1)) + 8;
        const votes = [];
        for (let i = 0; i < numVotes; i++) {
          const randomOption = options[Math.floor(Math.random() * options.length)];
          votes.push({
            poll_id: poll.id,
            option_id: randomOption.id,
            voter_id: crypto.randomUUID()
          });
        }
        const { error: voteError } = await supabase.from("poll_votes").insert(votes);
        if (voteError) { console.error("Error inserting votes:", voteError); throw new Error("Erro DB Votos: " + voteError.message); } else {
          generatedVotesCount = votes.length;
        }
      }
    }

    await recordGeneration(supabase, user.id, { contentType: "accessory", topic: `Prova Social: ${title}`, usage });

    return NextResponse.json({ comments: generatedCommentsCount, votes: generatedVotesCount, likes: generatedLikesCount, dislikes: generatedDislikesCount });
  } catch (error: any) {
    console.error("Erro na prova social:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
