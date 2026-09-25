import { SUMMARY_FIELD_KEYS, SUMMARY_FIELD_LABELS, hasAnySummaryContent, type ContentSummary } from "@/lib/summary";

export default function QuickSummaryCard({ summary }: { summary?: ContentSummary | null }) {
  if (!hasAnySummaryContent(summary)) return null;

  return (
    <section className="glass-panel my-8 rounded-[28px] p-6 md:p-8" aria-label="Em 30 segundos">
      <p className="eyebrow">Em 30 segundos</p>
      <p className="muted mt-1 text-xs">Porque nem sempre dá tempo (ou paciência) de ler tudo.</p>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {SUMMARY_FIELD_KEYS.map((key) => {
          const value = summary?.[key]?.trim();
          if (!value) return null;
          return (
            <div key={key}>
              <dt className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--champagne)]">{SUMMARY_FIELD_LABELS[key]}</dt>
              <dd className="mt-1 text-sm leading-6 text-[var(--champagne-pale)]">{value}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
