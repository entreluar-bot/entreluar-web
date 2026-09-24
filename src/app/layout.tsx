import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import SiteChrome from "./ui/SiteChrome";
import JsonLd from "./ui/JsonLd";
import CampaignTracker from "./ui/CampaignTracker";

const display=Cormorant_Garamond({subsets:["latin"],variable:"--font-display",weight:["400","500","600","700"]});
const body=Manrope({subsets:["latin"],variable:"--font-body"});

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://entreluar.com.br';

export const metadata:Metadata={
  metadataBase: new URL(baseUrl),
  title:{default:"Entreluar | Madura. Luminosa. Sem pedir licença.",template:"%s | Entreluar"},
  description:"Pele madura, menopausa, autocuidado e achados honestos — com ciência, humor e conversa de amiga.",
  applicationName:"Entreluar",
  manifest:"/manifest.webmanifest",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Entreluar | Madura. Luminosa. Sem pedir licença.",
    description: "Pele madura, menopausa, autocuidado e achados honestos — com ciência, humor e conversa de amiga.",
    url: baseUrl,
    siteName: "Entreluar",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Entreluar | Madura. Luminosa. Sem pedir licença.",
    description: "Pele madura, menopausa, autocuidado e achados honestos — com ciência, humor e conversa de amiga.",
  },
  icons:{
    icon:[
      {url:"/favicon.ico",type:"image/x-icon"},
      {url:"/icons/entreluar-192.png",type:"image/png",sizes:"192x192"},
      {url:"/icons/entreluar-512.png",type:"image/png",sizes:"512x512"},
    ],
    apple:[{url:"/icons/entreluar-apple-touch.png",type:"image/png",sizes:"180x180"}],
  },
  appleWebApp:{capable:true,title:"Entreluar",statusBarStyle:"black-translucent"},
  formatDetection:{telephone:false},
};
export const viewport:Viewport={themeColor:"#16070b",colorScheme:"dark",width:"device-width",initialScale:1,viewportFit:"cover"};

export default function RootLayout({children}:LayoutProps<"/">){
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Entreluar",
    "url": baseUrl,
    "description": "Pele madura, menopausa, autocuidado e achados honestos — com ciência, humor e conversa de amiga."
  };

  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>
        <JsonLd data={jsonLdData} />
        <CampaignTracker/>
        <SiteChrome/>
        {children}
      </body>
    </html>
  );
}
