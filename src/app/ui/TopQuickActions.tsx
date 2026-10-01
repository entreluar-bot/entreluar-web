import ShareButton from "./ShareButton";

type TopQuickActionsProps = {
  buyHref?: string | null;
  title: string;
  shareUrl: string;
  shareText: string;
  className?: string;
};

export default function TopQuickActions({ buyHref, title, shareUrl, shareText, className = "" }: TopQuickActionsProps) {
  return (
    <div className={`quick-actions ${className}`}>
      {buyHref && (
        <a href={buyHref} target="_blank" rel="noreferrer" className="quick-link">
          🛍️ Quer o seu? ↗
        </a>
      )}
      <ShareButton title={title} url={shareUrl} shareText={shareText} variant="inline" />
    </div>
  );
}
