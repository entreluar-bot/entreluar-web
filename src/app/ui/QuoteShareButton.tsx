"use client";

import { useState } from "react";
import { STORY_WIDTH as WIDTH, STORY_HEIGHT as HEIGHT, getCanvasContext, wrapText, drawBackground, canvasToFile, downloadFile } from "@/lib/share-canvas";

type QuoteShareButtonProps = {
  quote: string;
  className?: string;
};

const FILE_NAME = "pilula-entreluar.png";
const SHARE_URL = "https://www.entreluar.com.br";
const SHARE_TEXT = `Quer ver mais? Acesse: ${SHARE_URL}`;

function findQuoteLayout(context: CanvasRenderingContext2D, quote: string) {
  const maxWidth = 780;
  const maxHeight = 760;

  for (let size = 86; size >= 52; size -= 2) {
    context.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
    const lines = wrapText(context, quote, maxWidth);
    const lineHeight = size * 1.16;
    if (lines.length * lineHeight <= maxHeight) return { lines, size, lineHeight };
  }

  const size = 50;
  context.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
  return { lines: wrapText(context, quote, maxWidth), size, lineHeight: size * 1.12 };
}

async function createQuoteImage(quote: string) {
  await document.fonts?.ready;

  const { canvas, context } = getCanvasContext();
  drawBackground(context);

  context.textAlign = "center";
  context.fillStyle = "#e6bd78";
  context.font = '800 28px Manrope, Arial, sans-serif';
  context.letterSpacing = "6px";
  context.fillText("P\u00cdLULAS PARA BRILHAR", WIDTH / 2, 172);
  context.fillText("NA MATURIDADE", WIDTH / 2, 214);
  context.letterSpacing = "0px";

  const normalizedQuote = quote.replace(/[“”]/g, "\"").replace(/^"+|"+$/g, "");
  const { lines, size, lineHeight } = findQuoteLayout(context, normalizedQuote);
  const totalHeight = lines.length * lineHeight;
  let y = HEIGHT / 2 - totalHeight / 2 + size * 0.76;

  context.font = `italic 600 ${size}px "Cormorant Garamond", Georgia, serif`;
  context.fillStyle = "#fff8ef";
  context.shadowColor = "rgba(0,0,0,0.28)";
  context.shadowBlur = 16;
  context.shadowOffsetY = 8;

  lines.forEach((line, index) => {
    const prefix = index === 0 ? "\u201c" : "";
    const suffix = index === lines.length - 1 ? "\u201d" : "";
    context.fillText(`${prefix}${line}${suffix}`, WIDTH / 2, y);
    y += lineHeight;
  });

  context.shadowColor = "transparent";
  context.fillStyle = "#e6bd78";
  context.font = '600 54px "Cormorant Garamond", Georgia, serif';
  context.fillText("Entreluar", WIDTH / 2, HEIGHT - 154);

  return canvasToFile(canvas, FILE_NAME);
}

export default function QuoteShareButton({ quote, className = "" }: QuoteShareButtonProps) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const share = async () => {
    setMessage("");
    setIsGenerating(true);

    try {
      const file = await createQuoteImage(quote);
      const shareData = { files: [file], title: "P\u00edlulas para Brilhar na Maturidade", text: SHARE_TEXT };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }

      downloadFile(file);
      try {
        await navigator.clipboard?.writeText(SHARE_TEXT);
        setMessage("Prontinho: baixei a imagem e copiei o convite com o site.");
      } catch {
        setMessage(`Prontinho: baixei a imagem. ${SHARE_TEXT}`);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Nao consegui abrir o compartilhamento agora. Tente novamente em instantes.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`share-action quote-share ${className}`}>
      <button type="button" onClick={share} disabled={isGenerating} className="ghost-button share-button quote-share__button">
        {isGenerating ? "Criando imagem..." : "Compartilhe com uma amiga"}
      </button>
      {message && <p className="share-message quote-share__message" role="status">{message}</p>}
    </div>
  );
}
