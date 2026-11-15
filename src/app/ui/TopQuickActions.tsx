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
    <div className={`flex flex-nowrap items-center gap-4 overflow-x-auto ${className}`}>
      {storeUrl && (
        <a href={storeUrl} target="_blank" rel="noreferrer" className="quick-link shrink-0">
          <span className="quick-link__star" aria-hidden="true">✦</span> Comprar na loja ↗
        </a>
      )}
      <ShareButton title={title} url={shareUrl} shareText={shareText} storeUrl={storeUrl} variant="inline" />
    </div>
  );
}
