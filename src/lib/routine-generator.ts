import type { RoutineCandidate } from "@/app/api/routine-candidates/route";
import { ROUTINE_STEPS, emptyRoutine, type Routine, type RoutineMeta, type RoutinePeriodKey, type RoutineStepKey } from "@/lib/routine";

export type RoutineCriteria = {
  skinType: "oleosa" | "seca" | "mista" | "normal";
  sensitive: boolean;
  origin: "brasileiro" | "coreano" | "indiferente";
  concernSlug?: string;
  complexity: "essencial" | "completa";
};

const ESSENTIAL_PHASES: RoutineStepKey[] = ["limpeza", "hidratante", "protetor_solar"];

// Fases com ativos fortes (retinol/retinal e afins) só entram na rotina da
// noite, mesmo que o produto não tenha uma tag de período explícita — regra
// de segurança fixa, não é um critério que a usuária escolhe.
const NIGHT_ONLY_PHASES = new Set<RoutineStepKey>(["tratamento"]);
const MORNING_ONLY_PHASES = new Set<RoutineStepKey>(["protetor_solar"]);

function phasesForComplexity(complexity: RoutineCriteria["complexity"], candidates: RoutineCandidate[]): RoutineStepKey[] {
  const canonicalOrder = ROUTINE_STEPS.map((step) => step.key);
  const availablePhases = new Set(candidates.map((candidate) => candidate.phase).filter((phase): phase is RoutineStepKey => Boolean(phase)));
  if (complexity === "completa") return canonicalOrder.filter((phase) => availablePhases.has(phase));

  const essentialPhases = new Set(ESSENTIAL_PHASES.filter((phase) => availablePhases.has(phase)));
  if (availablePhases.has("tratamento")) essentialPhases.add("tratamento");
  return canonicalOrder.filter((phase) => essentialPhases.has(phase));
}

function periodAllowsPhase(period: RoutinePeriodKey, phase: RoutineStepKey) {
  if (period === "manha" && NIGHT_ONLY_PHASES.has(phase)) return false;
  if (period === "noite" && MORNING_ONLY_PHASES.has(phase)) return false;
  return true;
}

function scoreCandidate(candidate: RoutineCandidate, criteria: RoutineCriteria) {
  let score = 0;
  if (candidate.skinTypes.includes(criteria.skinType)) score += 3;
  if (criteria.sensitive && candidate.sensitiveFriendly) score += 2;
  if (criteria.origin !== "indiferente" && candidate.origin === criteria.origin) score += 2;
  if (criteria.concernSlug && candidate.concernSlugs.includes(criteria.concernSlug)) score += 1;
  return score;
}

function pickBestCandidate(candidates: RoutineCandidate[], phase: RoutineStepKey, period: RoutinePeriodKey, criteria: RoutineCriteria, used: Set<string>) {
  const pool = candidates.filter(
    (candidate) => candidate.phase === phase && candidate.periods.includes(period) && periodAllowsPhase(period, phase) && !used.has(candidate.id),
  );
  if (!pool.length) return null;

  const scored = pool.map((candidate) => ({ candidate, score: scoreCandidate(candidate, criteria) })).sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

export function generateRoutine(candidates: RoutineCandidate[], criteria: RoutineCriteria): Routine {
  const routine = emptyRoutine();
  const phases = phasesForComplexity(criteria.complexity, candidates);

  // As fases escolhidas assumem o topo da lista, na ordem de skincare
  // (limpeza → tratamento → hidratante → protetor solar → ...); o restante
  // fica depois, na ordem padrão, pronto para a usuária ativar manualmente.
  const generatedOrder = [...phases, ...routine.manha.order.filter((key) => !phases.includes(key))];

  for (const period of ["manha", "noite"] as RoutinePeriodKey[]) {
    // "used" é reiniciado por período (não globalmente): o mesmo hidratante
    // pode muito bem ser o escolhido de manhã e de noite, só não repetimos o
    // mesmo produto em duas fases diferentes dentro do mesmo período.
    const used = new Set<string>();
    for (const phase of phases) {
      if (!periodAllowsPhase(period, phase)) continue;
      const best = pickBestCandidate(candidates, phase, period, criteria, used);
      if (!best) continue;
      used.add(best.id);
      routine[period][phase] = {
        active: true,
        note: "",
        product: { id: best.id, title: best.title, image_url: best.image_url },
      };
    }
    routine[period].order = [...generatedOrder];
  }

  const meta: RoutineMeta = {
    skinType: criteria.skinType,
    sensitive: criteria.sensitive,
    origin: criteria.origin,
    concernSlug: criteria.concernSlug,
    complexity: criteria.complexity,
  };

  return { ...routine, meta };
}
