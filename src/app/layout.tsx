import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import SiteChrome from "./ui/SiteChrome";
const display=Cormorant_Garamond({subsets:["latin"],variable:"--font-display",weight:["400","500","600","700"]});
const body=Manrope({subsets:["latin"],variable:"--font-body"});
export const metadata:Metadata={
  title:{default:"Entreluar | Beleza madura, sem pedir licença",template:"%s | Entreluar"},
  description:"Autocuidado, beleza madura, menopausa e achados sinceros — numa conversa entre amigas.",
  applicationName:"Entreluar",
  manifest:"/manifest.webmanifest",
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
export default function RootLayout({children}:LayoutProps<"/">){return <html lang="pt-BR" className={`${display.variable} ${body.variable}`}><body><SiteChrome/>{children}</body></html>}
