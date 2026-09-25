import { SUMMARY_FIELD_KEYS, hasAnySummaryContent, summaryFieldLabels, type ContentSummary } from "@/lib/summary";

export default function QuickSummaryCard({ summary }: { summary?: ContentSummary | null }) {
  if (!summary || !hasAnySummaryContent(summary)) return null;
  const labels = summaryFieldLabels(summary.content_type);

  return (
    <details className="quick-summary">
      <summary className="quick-summary__toggle">Em 30 segundos</summary>
      <div className="quick-summary__panel glass-panel">
        <p className="muted text-xs">Porque nem sempre dá tempo (ou paciência) de ler tudo.</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {SUMMARY_FIELD_KEYS.map((key) => {
            const value = summary?.[key]?.trim();
            if (!value) return null;
            return (
              <div key={key}>
                <dt className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--champagne)]">{labels[key]}</dt>
                <dd className="mt-1 text-sm leading-6 text-[var(--champagne-pale)]">{value}</dd>
              </div>
            );
          })}
        </dl>
      </div>
    </details>
  );
}
