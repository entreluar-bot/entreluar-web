"use client";

import { useState, type ReactNode } from "react";

const STEP = 6;

export default function LoadMoreGrid({ items, noun = "artigos" }: { items: ReactNode[]; noun?: string }) {
  const [visible, setVisible] = useState(STEP);
  if (!items.length) return null;
  const shown = Math.min(visible, items.length);
  return (
    <>
      <div className="editorial-grid">{items.slice(0, shown)}</div>
      {shown < items.length && (
        <div className="load-more">
          <p className="muted text-sm">Mostrando {shown} de {items.length} {noun}</p>
          <button type="button" className="ghost-button" onClick={() => setVisible((current) => current + STEP)}>
            Ver mais {noun}
          </button>
        </div>
      )}
    </>
  );
}
