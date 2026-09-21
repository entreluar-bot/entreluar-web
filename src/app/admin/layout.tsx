import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Ateliê da Luana",
  description: "Painel de conteúdo da Entreluar.",
  applicationName: "Ateliê da Luana",
  manifest: "/admin.webmanifest",
  icons: {
    icon: [
      { url: "/icons/admin-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/admin-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/admin-apple-touch.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    title: "Ateliê",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
