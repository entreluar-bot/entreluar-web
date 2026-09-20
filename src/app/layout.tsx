import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import SiteChrome from "./ui/SiteChrome";
const display=Cormorant_Garamond({subsets:["latin"],variable:"--font-display",weight:["400","500","600","700"]});
const body=Manrope({subsets:["latin"],variable:"--font-body"});
export const metadata:Metadata={title:{default:"Entreluar | Beleza madura, sem pedir licença",template:"%s | Entreluar"},description:"Autocuidado, beleza madura, menopausa e achados sinceros — numa conversa entre amigas."};
export default function RootLayout({children}:LayoutProps<"/">){return <html lang="pt-BR" className={`${display.variable} ${body.variable}`}><body><SiteChrome/>{children}</body></html>}
