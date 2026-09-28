export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1350;

export function getCanvasContext(width = STORY_WIDTH, height = STORY_HEIGHT) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponivel neste navegador.");
  return { canvas, context };
}

export function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
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

export function drawTexture(context: CanvasRenderingContext2D, width = STORY_WIDTH, height = STORY_HEIGHT) {
  context.save();
  context.globalAlpha = 0.08;
  for (let i = 0; i < 850; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 1.6 + 0.4;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = i % 3 === 0 ? "#f7e8d0" : "#b85f73";
    context.fill();
  }
  context.restore();
}

export function drawElegantAccents(context: CanvasRenderingContext2D, width = STORY_WIDTH, height = STORY_HEIGHT) {
  context.save();

  const topGlow = context.createRadialGradient(810, 120, 20, 810, 120, 520);
  topGlow.addColorStop(0, "rgba(230,189,120,0.2)");
  topGlow.addColorStop(1, "rgba(230,189,120,0)");
  context.fillStyle = topGlow;
  context.fillRect(0, 0, width, height);

  const roseGlow = context.createRadialGradient(150, 1080, 30, 150, 1080, 620);
  roseGlow.addColorStop(0, "rgba(184,95,115,0.24)");
  roseGlow.addColorStop(1, "rgba(184,95,115,0)");
  context.fillStyle = roseGlow;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.26;
  context.strokeStyle = "#e6bd78";
  context.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    context.beginPath();
    context.ellipse(118 + i * 18, 228 + i * 5, 170 + i * 22, 48 + i * 7, -0.72, 0.15, Math.PI * 1.72);
    context.stroke();
  }

  context.globalAlpha = 0.18;
  context.strokeStyle = "#f7e8d0";
  context.lineWidth = 1.5;
  for (let i = 0; i < 3; i += 1) {
    context.beginPath();
    context.ellipse(925 - i * 20, 1032 + i * 10, 190 + i * 24, 56 + i * 5, -0.76, Math.PI * 1.04, Math.PI * 1.9);
    context.stroke();
  }

  context.globalAlpha = 0.78;
  context.fillStyle = "#e6bd78";
  const sparkles = [
    [210, 300, 13],
    [858, 250, 10],
    [192, 1010, 9],
    [842, 1120, 12],
    [928, 410, 7],
  ];
  sparkles.forEach(([x, y, size]) => {
    context.beginPath();
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.24, y - size * 0.24);
    context.lineTo(x + size, y);
    context.lineTo(x + size * 0.24, y + size * 0.24);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.24, y + size * 0.24);
    context.lineTo(x - size, y);
    context.lineTo(x - size * 0.24, y - size * 0.24);
    context.closePath();
    context.fill();
  });

  context.restore();
}

export function drawBackground(context: CanvasRenderingContext2D, width = STORY_WIDTH, height = STORY_HEIGHT) {
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#3b101a");
  background.addColorStop(0.5, "#21090f");
  background.addColorStop(1, "#16070b");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(240, 170, 20, 240, 170, 560);
  glow.addColorStop(0, "rgba(230,189,120,0.22)");
  glow.addColorStop(1, "rgba(230,189,120,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  drawTexture(context, width, height);
  drawElegantAccents(context, width, height);

  context.strokeStyle = "rgba(230,189,120,0.56)";
  context.lineWidth = 4;
  context.strokeRect(54, 54, width - 108, height - 108);

  context.strokeStyle = "rgba(247,232,208,0.12)";
  context.lineWidth = 1;
  context.strokeRect(76, 76, width - 152, height - 152);
}

export function canvasToFile(canvas: HTMLCanvasElement, fileName: string) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(new File([result], fileName, { type: "image/png" }));
      else reject(new Error("Nao consegui gerar o PNG."));
    }, "image/png");
  });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
