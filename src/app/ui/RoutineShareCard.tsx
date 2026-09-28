"use client";

import { useState } from "react";
import { ROUTINE_PERIODS, ROUTINE_STEP_LABELS, type Routine, type RoutinePeriodKey } from "@/lib/routine";
import { STORY_WIDTH as WIDTH, STORY_HEIGHT as HEIGHT, getCanvasContext, drawBackground, canvasToFile, downloadFile } from "@/lib/share-canvas";

const FILE_NAME = "minha-rotina-entreluar.png";
const SHARE_URL = "https://www.entreluar.com.br/minha-rotina";
const SHARE_TEXT = `Essa é a minha rotina ✨ Monte a sua: ${SHARE_URL}`;

function activeLinesForPeriod(routine: Routine, period: RoutinePeriodKey) {
  return routine[period].order
    .filter((step) => routine[period][step].active)
    .map((step) => {
      const entry = routine[period][step];
      const detail = entry.product?.title || entry.note || "";
      return detail ? `${ROUTINE_STEP_LABELS[step]} — ${detail}` : ROUTINE_STEP_LABELS[step];
    });
}

function usageTip(routine: Routine) {
  if (routine.meta?.sensitive) return "Dica: sempre teste um produto novo na dobra do braço antes de levar pro rosto.";
  if (routine.meta?.complexity === "completa") return "Dica: vá devagar — introduza um passo novo por semana pra pele se acostumar.";
  return "Dica: constância vale mais que quantidade. Um passo bem feito todo dia já muda a pele.";
}

async function createRoutineImage(routine: Routine) {
  await document.fonts?.ready;

  const { canvas, context } = getCanvasContext();
  drawBackground(context);

  context.textAlign = "center";
  context.fillStyle = "#e6bd78";
  context.font = '800 30px Manrope, Arial, sans-serif';
  context.letterSpacing = "5px";
  context.fillText("MONTEI MINHA ROTINA", WIDTH / 2, 168);
  context.letterSpacing = "0px";
  context.fillStyle = "#f7e8d0";
  context.font = '600 24px "Cormorant Garamond", Georgia, serif';
  context.fillText("no Entreluar", WIDTH / 2, 204);

  let y = 300;
  context.textAlign = "left";

  for (const period of ROUTINE_PERIODS) {
    const lines = activeLinesForPeriod(routine, period.key);
    if (!lines.length) continue;

    context.fillStyle = "#e6bd78";
    context.font = '800 32px Manrope, Arial, sans-serif';
    context.fillText(`${period.icon} ${period.label}`, 130, y);
    y += 46;

    context.font = '500 27px Manrope, Arial, sans-serif';
    context.fillStyle = "#fff8ef";
    for (const line of lines) {
      const trimmed = line.length > 46 ? `${line.slice(0, 45)}…` : line;
      context.fillText(`· ${trimmed}`, 150, y);
      y += 40;
    }
    y += 34;
  }

  context.textAlign = "center";
  context.font = 'italic 500 26px "Cormorant Garamond", Georgia, serif';
  context.fillStyle = "#d9bfc1";
  const tip = usageTip(routine);
  context.fillText(tip.length > 68 ? `${tip.slice(0, 67)}…` : tip, WIDTH / 2, HEIGHT - 210);

  context.fillStyle = "#e6bd78";
  context.font = '600 46px "Cormorant Garamond", Georgia, serif';
  context.fillText("Entreluar", WIDTH / 2, HEIGHT - 150);
  context.font = '600 24px Manrope, Arial, sans-serif';
  context.fillStyle = "#f7e8d0";
  context.fillText("Monte a sua em entreluar.com.br  ·  Siga @entreluarBeauty", WIDTH / 2, HEIGHT - 108);

  return canvasToFile(canvas, FILE_NAME);
}

export default function RoutineShareCard({ routine, className = "" }: { routine: Routine; className?: string }) {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const hasAnyActiveStep = ROUTINE_PERIODS.some((period) => activeLinesForPeriod(routine, period.key).length > 0);

  const share = async () => {
    setMessage("");
    setIsGenerating(true);

    try {
      const file = await createRoutineImage(routine);
      const shareData = { files: [file], title: "Minha rotina Entreluar", text: SHARE_TEXT };

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
      setMessage("Não consegui abrir o compartilhamento agora. Tente novamente em instantes.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasAnyActiveStep) return null;

  return (
    <div className={`share-action ${className}`}>
      <button type="button" onClick={share} disabled={isGenerating} className="ghost-button share-button flex-1">
        {isGenerating ? "Criando imagem..." : "📸 Card para compartilhar"}
      </button>
      {message && <p className="share-message" role="status">{message}</p>}
    </div>
  );
}
