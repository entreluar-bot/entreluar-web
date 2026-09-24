"use client";

import { useEffect, useRef, useState } from "react";
import NewsletterSignup from "./NewsletterSignup";

export default function NewsletterPopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return <div className="newsletter-popover" ref={containerRef}>
    <button type="button" className="newsletter-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="newsletter-panel">
      <span aria-hidden="true">✉</span><span className="newsletter-trigger__full">Ficar por dentro</span><span className="newsletter-trigger__short">Por dentro</span>
    </button>
    {open && <div id="newsletter-panel" className="newsletter-panel glass-panel">
      <button type="button" className="newsletter-close" onClick={() => setOpen(false)} aria-label="Fechar formulário">×</button>
      <p className="eyebrow">Emails Entreluar</p>
      <h2 className="font-display mt-2 text-3xl leading-none">Fique por dentro<br/>do que vale a pena.</h2>
      <p className="muted mt-3 text-sm leading-6">Novidades 50+, achados sinceros, conversas e convites especiais. Só o que combina com a Entreluar, sem spam.</p>
      <NewsletterSignup source="header-popover" compact />
    </div>}
  </div>;
}
