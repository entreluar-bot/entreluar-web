"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ROUTINE_PERIODS, type Routine } from "@/lib/routine";
import ShareButton from "../ui/ShareButton";

function hasAnyActiveStep(routine: Routine) {
  return ROUTINE_PERIODS.some((period) => routine[period.key].order.some((step) => routine[period.key][step].active));
}

export default function RoutineShareButton({ routine, className = "" }: { routine: Routine; className?: string }) {
  const [shareUrl, setShareUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const generateLink = async () => {
    setError("");
    setIsGenerating(true);
    try {
      const shareCode = crypto.randomUUID();
      const supabase = createClient();
      const { error: insertError } = await supabase.from("shared_routines").insert({ share_code: shareCode, snapshot: routine });
      if (insertError) throw insertError;
      setShareUrl(`${window.location.origin}/minha-rotina/r/${shareCode}`);
    } catch {
      setError("Não consegui gerar o link agora. Tente novamente em instantes.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!hasAnyActiveStep(routine)) return null;

  return (
    <div className={`share-action flex-1 ${className}`}>
      {shareUrl ? (
        <ShareButton title="Minha rotina Entreluar" url={shareUrl} shareText="Essa é a minha rotina ✨ Dá uma olhada e monte a sua também:" />
      ) : (
        <button type="button" onClick={generateLink} disabled={isGenerating} className="ghost-button share-button">
          {isGenerating ? "Gerando link..." : "🔗 Link para compartilhar"}
        </button>
      )}
      {error && <p className="share-message" role="status">{error}</p>}
    </div>
  );
}
