"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MORE_LINKS = [
  { href: "/temas", label: "Temas", hint: "Descubra por assunto" },
  { href: "/me-ajuda-a-escolher", label: "Me ajuda a escolher", hint: "Duas perguntas, um caminho" },
  { href: "/minha-rotina", label: "Minha rotina", hint: "Sua manhã e sua noite, do seu jeito" },
  { href: "/comece-por-aqui", label: "Comece por aqui", hint: "Pra quem chegou agora" },
  { href: "/drops", label: "Drops", hint: "Direto do Instagram" },
  { href: "/sobre", label: "Sobre", hint: "Quem é a Luana" },
];

export default function MoreMenu({ variant }: { variant: "desktop" | "mobile" }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isActive = MORE_LINKS.some((link) => pathname.startsWith(link.href));

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <div className={`more-menu more-menu--${variant}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="more-menu-panel"
        data-active={isActive}
      >
        {variant === "mobile" && <span className="nav-icon" aria-hidden="true">⋯</span>}
        Mais
      </button>
      {open && (
        <div id="more-menu-panel" className="more-menu__panel glass-panel">
          {MORE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="more-menu__link" onClick={() => setOpen(false)}>
              <strong>{link.label}</strong>
              <span>{link.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
