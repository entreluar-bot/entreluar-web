"use client";

import { useEffect, useState } from "react";

const SIZES = [
  { value: "normal", label: "A", title: "Letra normal" },
  { value: "large", label: "A+", title: "Letra maior" },
  { value: "xlarge", label: "A++", title: "Letra bem maior" },
] as const;

type Size = (typeof SIZES)[number]["value"];
const STORAGE_KEY = "entreluar-text-size";
const EVENT_NAME = "entreluar-text-size";

function readCurrent(): Size {
  const current = document.documentElement.dataset.textSize;
  return current === "large" || current === "xlarge" ? current : "normal";
}

export default function TextSizeControl() {
  const [size, setSize] = useState<Size>("normal");

  useEffect(() => {
    const sync = () => setSize(readCurrent());
    sync();
    window.addEventListener(EVENT_NAME, sync);
    return () => window.removeEventListener(EVENT_NAME, sync);
  }, []);

  const choose = (next: Size) => {
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
    <div className="text-size-control" role="group" aria-label="Tamanho da letra">
      <span className="text-size-control__label">Tamanho da letra</span>
      <div className="text-size-control__buttons">
        {SIZES.map((item) => (
          <button key={item.value} type="button" title={item.title} aria-label={item.title} aria-pressed={size === item.value} onClick={() => choose(item.value)}>{item.label}</button>
        ))}
      </div>
    </div>
  );
}
