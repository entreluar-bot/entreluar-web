import type { Metadata } from "next";
import Link from "next/link";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata: Metadata = {
  title: "Sair da lista | Entreluar",
  robots: { index: false, follow: false },
};

export default async function Sair({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const email = typeof params.e === "string" ? params.e.trim().toLowerCase() : "";
  const token = typeof params.t === "string" ? params.t : "";
  const valid = Boolean(email) && verifyUnsubscribeToken(email, token);

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <section className="page-intro">
          <p className="eyebrow">Emails Entreluar</p>
          {valid ? (
            <UnsubscribeClient email={email} token={token} />
          ) : (
            <div>
              <h1 className="section-title mt-4">Esse link<br /><em>não funcionou.</em></h1>
              <p className="muted mx-auto mt-5 max-w-md leading-7">Ele pode estar incompleto ou ter expirado. Sem problema: responda qualquer email meu pedindo para sair, ou escreva para luana@entreluar.com.br, que eu tiro você da lista.</p>
              <div className="mt-8"><Link href="/" className="luxe-button">Ir para o site →</Link></div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
