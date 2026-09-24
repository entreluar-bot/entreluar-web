"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import InstallAppButton from "./InstallAppButton";
import NewsletterPopover from "./NewsletterPopover";

const items = [
  { href: "/", label: "Início", icon: "⌂" },
  { href: "/vitrine", label: "Vitrine", icon: "◇" },
  { href: "/blog", label: "Papo de Mulher", mobileLabel: "Papo", icon: "✦" },
  { href: "/resenhas", label: "Te Explico", mobileLabel: "Explico", icon: "?" },
  { href: "/pilulas", label: "Pílulas", icon: "☾" },
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
          <Link href="/drops" data-active={pathname.startsWith("/drops")}>Drops</Link>
          <Link href="/sobre" data-active={pathname.startsWith("/sobre")}>Mais</Link>
        </nav>
        <div className="header-actions"><InstallAppButton/><NewsletterPopover/><a className="luxe-button header-cta" href="https://instagram.com/entreluarBeauty" target="_blank" rel="noreferrer">Instagram ↗</a></div>
      </div>
    </header>
    <nav className="bottom-nav" aria-label="Navegação rápida">{items.map(item => <Link key={item.href} href={item.href} data-active={active(item.href)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{"mobileLabel" in item ? item.mobileLabel : item.label}</Link>)}</nav>
  </>;
}
