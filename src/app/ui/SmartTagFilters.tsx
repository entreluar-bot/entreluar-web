"use client";

import { useState } from "react";

export type SmartTagGroup = { key: string; label: string; options: Array<{ slug: string; name: string; count?: number }> };

export default function SmartTagFilters({
  groups,
  selected,
  onToggle,
  onClear,
  onApply,
}: {
  groups: SmartTagGroup[];
  selected: Record<string, string[]>;
  onToggle: (groupKey: string, slug: string) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  const hasSelection = Object.values(selected).some((slugs) => slugs.length > 0);
  const activeGroups = groups.filter((group) => group.options.length > 0);
  const [activeGroupKey, setActiveGroupKey] = useState("");
  const activeGroup = activeGroups.find((group) => group.key === activeGroupKey);
  if (!activeGroups.length) return null;

  return (
    <div className="grid gap-3">
      <label className="filter-drawer__label" htmlFor="smart-filter-type">Quero filtrar por</label>
      <select id="smart-filter-type" value={activeGroupKey} onChange={(event) => setActiveGroupKey(event.target.value)} className="smart-filter-select">
        <option value="">Escolha o tipo de filtro</option>
        {activeGroups.map((group) => <option key={group.key} value={group.key}>{group.label}{selected[group.key]?.length ? ` (${selected[group.key].length})` : ""}</option>)}
      </select>
      {activeGroup && (
        <div className="smart-filter-group__options" role="group" aria-label={activeGroup.label}>
          {activeGroup.options.map((option) => {
              const active = selected[activeGroup.key]?.includes(option.slug) || false;
              return (
                <button
                  key={option.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle(activeGroup.key, option.slug)}
                  className={`min-h-10 rounded-full border px-4 text-[11px] font-bold uppercase tracking-[.1em] transition ${active ? "border-[var(--champagne)] bg-[var(--champagne)] text-[var(--ink)]" : "border-[var(--line)] bg-white/[.03] text-[var(--champagne-pale)] hover:border-[var(--champagne)]/60"}`}
                >
                  {option.name}{typeof option.count === "number" ? ` (${option.count})` : ""}
                </button>
              );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onApply} disabled={!hasSelection} className="ghost-button disabled:cursor-not-allowed disabled:opacity-45">Atualizar resultados</button>
        {hasSelection && <button type="button" onClick={onClear} className="text-xs font-bold uppercase tracking-wider text-[var(--champagne)] underline underline-offset-4">Limpar filtros</button>}
      </div>
    </div>
  );
}
