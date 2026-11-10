import ShareButton from "./ShareButton";

type TopQuickActionsProps = {
  title: string;
  shareUrl: string;
  shareText: string;
  className?: string;
};

export default function TopQuickActions({ title, shareUrl, shareText, className = "" }: TopQuickActionsProps) {
  return (
    <div className={`flex flex-nowrap items-center gap-4 overflow-x-auto ${className}`}>
      <ShareButton title={title} url={shareUrl} shareText={shareText} variant="inline" />
    </div>
  );
}
