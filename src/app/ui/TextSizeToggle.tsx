"use client";

import { useEffect, useState } from "react";

const ORDER = ["normal", "large", "xlarge"] as const;
type Size = (typeof ORDER)[number];
const STORAGE_KEY = "entreluar-text-size";
const EVENT_NAME = "entreluar-text-size";
const LABELS: Record<Size, string> = { normal: "Aa", large: "Aa+", xlarge: "Aa++" };

function readCurrent(): Size {
  const current = document.documentElement.dataset.textSize;
  return current === "large" || current === "xlarge" ? current : "normal";
}

export default function TextSizeToggle() {
  const [size, setSize] = useState<Size>("normal");

  useEffect(() => {
    const sync = () => setSize(readCurrent());
    sync();
    window.addEventListener(EVENT_NAME, sync);
    return () => window.removeEventListener(EVENT_NAME, sync);
  }, []);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(readCurrent()) + 1) % ORDER.length];
    if (next === "normal") document.documentElement.removeAttribute("data-text-size");
    else document.documentElement.setAttribute("data-text-size", next);
    try {
      if (next === "normal") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem armazenamento (modo privado): a escolha vale só nesta visita.
    }
    window.dispatchEvent(new Event(EVENT_NAME));
  };

  return (
    <button type="button" className="text-size-toggle" onClick={cycle} title="Mudar o tamanho da letra" aria-label={`Tamanho da letra: ${LABELS[size]}. Toque para aumentar.`}>
      {LABELS[size]}
    </button>
  );
}
