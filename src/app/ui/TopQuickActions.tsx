import ShareButton from "./ShareButton";

type TopQuickActionsProps = {
  title: string;
  shareUrl: string;
  shareText: string;
  storeUrl?: string;
  className?: string;
};

export default function TopQuickActions({ title, shareUrl, shareText, storeUrl, className = "" }: TopQuickActionsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>
      {storeUrl && (
        <a href={storeUrl} target="_blank" rel="noreferrer" className="quick-link shrink-0">
          <span className="quick-link__star" aria-hidden="true">✦</span>
          <span className="quick-link__purchase">Comprar<br />na loja ↗</span>
        </a>
      )}
      <ShareButton title={title} url={shareUrl} shareText={shareText} storeUrl={storeUrl} variant="inline" />
    </div>
  );
}
