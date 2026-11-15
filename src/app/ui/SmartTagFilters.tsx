"use client";

export type SmartTagGroup = { key: string; label: string; options: Array<{ slug: string; name: string; count?: number }> };

export default function SmartTagFilters({
  groups,
  selected,
  onToggle,
  onClear,
}: {
  groups: SmartTagGroup[];
  selected: Record<string, string[]>;
  onToggle: (groupKey: string, slug: string) => void;
  onClear: () => void;
}) {
  const hasSelection = Object.values(selected).some((slugs) => slugs.length > 0);
  const activeGroups = groups.filter((group) => group.options.length > 0);
  if (!activeGroups.length) return null;

  return (
    <div className="grid gap-2">
      {activeGroups.map((group) => {
        const selectedCount = selected[group.key]?.length || 0;
        return (
        <details key={group.key} className="smart-filter-group">
          <summary>
            <span>{group.label}</span>
            <span className="smart-filter-group__count">{selectedCount ? `${selectedCount} selecionado${selectedCount === 1 ? "" : "s"}` : "Escolher"}</span>
          </summary>
          <div className="smart-filter-group__options" role="group" aria-label={group.label}>
            {group.options.map((option) => {
              const active = selected[group.key]?.includes(option.slug) || false;
              return (
                <button
                  key={option.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle(group.key, option.slug)}
                  className={`min-h-10 rounded-full border px-4 text-[11px] font-bold uppercase tracking-[.1em] transition ${active ? "border-[var(--champagne)] bg-[var(--champagne)] text-[var(--ink)]" : "border-[var(--line)] bg-white/[.03] text-[var(--champagne-pale)] hover:border-[var(--champagne)]/60"}`}
                >
                  {option.name}{typeof option.count === "number" ? ` (${option.count})` : ""}
                </button>
              );
            })}
          </div>
        </details>
      )})}
      {hasSelection && <button type="button" onClick={onClear} className="w-fit text-xs font-bold uppercase tracking-wider text-[var(--champagne)] underline underline-offset-4">Limpar filtros inteligentes</button>}
    </div>
  );
}
