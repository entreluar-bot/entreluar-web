"use client";

import { useState } from "react";

type QuoteShareButtonProps = {
  quote: string;
  className?: string;
};

const WIDTH = 1080;
const HEIGHT = 1350;
const FILE_NAME = "pilula-entreluar.png";

function getCanvasContext() {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponivel neste navegador.");
  return { canvas, context };
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().replace(/\s+/g, " ").split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width <= maxWidth || !line) {
      line = testLine;
      continue;
    }
    lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines;
}

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

function drawTexture(context: CanvasRenderingContext2D) {
  context.save();
  context.globalAlpha = 0.08;
  for (let i = 0; i < 850; i += 1) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    const radius = Math.random() * 1.6 + 0.4;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = i % 3 === 0 ? "#f7e8d0" : "#b85f73";
    context.fill();
  }
  context.restore();
}

async function createQuoteImage(quote: string) {
  await document.fonts?.ready;

  const { canvas, context } = getCanvasContext();
  const background = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#3b101a");
  background.addColorStop(0.5, "#21090f");
  background.addColorStop(1, "#16070b");
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = context.createRadialGradient(240, 170, 20, 240, 170, 560);
  glow.addColorStop(0, "rgba(230,189,120,0.22)");
  glow.addColorStop(1, "rgba(230,189,120,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  drawTexture(context);

  context.strokeStyle = "rgba(230,189,120,0.56)";
  context.lineWidth = 4;
  context.strokeRect(54, 54, WIDTH - 108, HEIGHT - 108);

  context.strokeStyle = "rgba(247,232,208,0.12)";
  context.lineWidth = 1;
  context.strokeRect(76, 76, WIDTH - 152, HEIGHT - 152);

  context.textAlign = "center";
  context.fillStyle = "#e6bd78";
  context.font = '800 30px Manrope, Arial, sans-serif';
  context.letterSpacing = "7px";
  context.fillText("P\u00cdLULAS DA MATURIDADE", WIDTH / 2, 172);
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
  context.font = '600 50px "Cormorant Garamond", Georgia, serif';
  context.fillText("Entreluar", WIDTH / 2, HEIGHT - 186);
  context.fillStyle = "rgba(247,232,208,0.78)";
  context.font = "700 25px Manrope, Arial, sans-serif";
  context.fillText("entreluar.com.br", WIDTH / 2, HEIGHT - 142);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Nao consegui gerar o PNG."));
    }, "image/png");
  });

  return new File([blob], FILE_NAME, { type: "image/png" });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function QuoteShareButton({ quote, className = "" }: QuoteShareButtonProps) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const share = async () => {
    setMessage("");
    setIsGenerating(true);

    try {
      const file = await createQuoteImage(quote);
      const shareData = { files: [file], title: "P\u00edlulas da Maturidade" };

      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }

      downloadFile(file);
      setMessage("Prontinho: baixei a imagem da pilula para voce enviar no WhatsApp.");
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
        {isGenerating ? "Criando imagem..." : "Compartilhar como imagem"}
      </button>
      {message && <p className="share-message quote-share__message" role="status">{message}</p>}
    </div>
  );
}
