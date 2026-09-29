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
          body: { type: "string" }
        },
        required: ["email", "body"]
      }
    }
  },
  required: ["comments"],
  additionalProperties: false,
};

export async function POST(req: Request) {
  try {
    const { supabase, user } = await authenticateAiRequest(req);
    const body = await req.json();
    const { journalId, category, title, content } = body;

    if (!journalId) {
      return NextResponse.json({ error: "journalId é obrigatório" }, { status: 400 });
    }

    const sourceText = plainTextFromHtml(content, 3000);

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `Você é um gerador de interações (prova social) para um blog focado em mulheres maduras (menopausa, skincare, reflexões de vida, humor).
O post se chama "${title || 'Sem título'}" e o conteúdo é:
"""${sourceText}"""

A categoria do post é "${category || 'Geral'}".

Sua tarefa é gerar de 5 a 13 comentários BEM diversos, criativos e diferentes, simulando leitoras reais do blog.
Crie personagens com todo tipo de pensamento.
Variações OBRIGATÓRIAS que devem estar presentes:
- Pelo menos um comentário apenas com emojis (ex: "😍😍👏👏").
- Pelo menos um comentário curtíssimo e direto (ex: "Amei!", "Verdade Lu", "Eu toda").
- Pelo menos um comentário "papo cabeça", reflexivo e um pouco mais longo, dividindo uma experiência pessoal com a menopausa ou envelhecimento.
- Pelo menos um comentário com um erro de digitação comum ou coloquialismo ("tbm", "vdd", "nossa isso eh mto real").
- Pelo menos uma discordância leve ou ponto de vista diferente ("Entendo você, mas no meu caso...", "Eu discordo um pouco porque...").

Para cada comentário gere um email falso (ex: maria.silva89@gmail.com, lela_2000@yahoo.com.br, etc) que reflita a idade e estilo da "leitora", e o corpo (body) com o texto do comentário.

Devolva apenas o JSON.`;

    const { response, usage } = await generateAi(ai, "accessory", {
      contents: prompt,
      config: { responseMimeType: "application/json", responseJsonSchema: socialProofSchema as any, temperature: 0.9 },
    });

    const parsed = JSON.parse(response.text || "{}");
    const comments = parsed.comments || [];

    let generatedCommentsCount = 0;
    if (comments.length > 0) {
      const inserts = comments.map((c: any) => ({
        journal_id: journalId,
        email: c.email,
        body: c.body,
        status: "approved",
        approved_at: new Date().toISOString()
      }));
      const { error } = await supabase.from("journal_comments").insert(inserts);
      if (error) {
        console.error("Error inserting comments:", error);
      } else {
        generatedCommentsCount = inserts.length;
      }
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
        if (voteError) {
          console.error("Error inserting votes:", voteError);
        } else {
          generatedVotesCount = votes.length;
        }
      }
    }

    await recordGeneration(supabase, user.id, { contentType: "accessory", topic: `Prova Social: ${title}`, usage });

    return NextResponse.json({ comments: generatedCommentsCount, votes: generatedVotesCount });
  } catch (error: any) {
    console.error("Erro na prova social:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
