"use client";

export type FilterChipOption = { key: string; label: string; count?: number };

export default function FilterChipBar({
  options,
  activeKey,
  onSelect,
  ariaLabel,
}: {
  options: FilterChipOption[];
  activeKey: string;
  onSelect: (key: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="-mx-5 mt-8 overflow-x-auto px-5 pb-3 [scrollbar-width:none] md:mx-0 md:px-0" aria-label={ariaLabel}>
      <div className="flex min-w-max gap-2" role="group">
        {options.map((option) => {
          const active = option.key === activeKey;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option.key)}
              className={`min-h-11 rounded-full border px-5 text-xs font-bold uppercase tracking-[.14em] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--champagne)] ${active ? "border-[var(--champagne)] bg-[var(--champagne)] text-[var(--ink)] shadow-[0_8px_30px_rgba(213,178,107,.2)]" : "border-[var(--line)] bg-white/[.03] text-[var(--champagne-pale)] hover:border-[var(--champagne)]/60"}`}
            >
              {option.label}
              {typeof option.count === "number" && <span className="opacity-70"> ({option.count})</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
