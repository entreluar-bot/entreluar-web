"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NewsletterPopover from "./NewsletterPopover";

const items = [
  { href: "/", label: "Início", icon: "⌂" },
  { href: "/vitrine", label: "Achados", icon: "◇" },
  { href: "/blog", label: "Diário", icon: "✦" },
  { href: "/sobre", label: "Mais", icon: "☾" },
];

export default function SiteChrome() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const active = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <>
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Entreluar, início">Entreluar<span>◔</span></Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {items.map(item => <Link key={item.href} href={item.href} data-active={active(item.href)}>{item.label}</Link>)}
          <Link href="/resenhas" data-active={pathname.startsWith("/resenhas")}>Ciência</Link>
          <Link href="/pilulas" data-active={pathname.startsWith("/pilulas")}>Pílulas</Link>
        </nav>
        <div className="header-actions"><NewsletterPopover/><a className="luxe-button header-cta" href="https://instagram.com/entreluarBeauty" target="_blank" rel="noreferrer">Instagram ↗</a></div>
      </div>
    </header>
    <nav className="bottom-nav" aria-label="Navegação rápida">{items.map(item => <Link key={item.href} href={item.href} data-active={active(item.href)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav>
  </>;
}
