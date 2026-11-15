"use client";

import { useState } from "react";

type ShareButtonProps = {
  title: string;
  url: string;
  shareText: string;
  storeUrl?: string;
  className?: string;
  variant?: "button" | "inline";
};

export default function ShareButton({ title, url, shareText, storeUrl, className = "", variant = "button" }: ShareButtonProps) {
  const [message, setMessage] = useState("");

  const share = async () => {
    setMessage("");
    const text = storeUrl ? `${shareText}\n\nComprar na loja: ${storeUrl}` : shareText;
    const shareData = { title, text, url };
    const copyText = `${text}\n\nVer o achado: ${url}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(copyText);
      setMessage("Mensagem com os links do achado e da loja copiada. Agora é só mandar para aquela amiga que vai amar isso.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(copyText);
        setMessage("Mensagem com os links do achado e da loja copiada. Agora é só mandar para aquela amiga que vai amar isso.");
      } catch {
        setMessage("Não consegui copiar agora. Você pode copiar o link direto da barra do navegador.");
      }
    }
  };

  if (variant === "inline") {
    return (
      <span className={`inline-flex flex-col shrink-0 ${className}`}>
        <button type="button" onClick={share} className="quick-link shrink-0">
          <span className="quick-link__star" aria-hidden="true">✦</span> Compartilhar ↗
        </button>
        {message && <span className="quick-share-message" role="status">{message}</span>}
      </span>
    );
  }

  return (
    <div className={`share-action ${className}`}>
      <button type="button" onClick={share} className="ghost-button share-button">
        Compartilhar com uma amiga
      </button>
      {message && <p className="share-message" role="status">{message}</p>}
    </div>
  );
}
