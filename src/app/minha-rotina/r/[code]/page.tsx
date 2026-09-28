import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { absoluteUrl, siteUrl } from "@/lib/share-metadata";
import { ROUTINE_PERIODS, ROUTINE_STEP_LABELS, type Routine } from "@/lib/routine";
import UseRoutineButton from "./UseRoutineButton";

export const revalidate = 0;

type SharedRoutinePageProps = { params: Promise<{ code: string }> };

async function getSharedRoutine(code: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("shared_routines").select("snapshot").eq("share_code", code).maybeSingle();
  return (data?.snapshot as Routine) || null;
}

function routineSummary(routine: Routine) {
  const activeLabels = ROUTINE_PERIODS.flatMap((period) =>
    routine[period.key].order.filter((step) => routine[period.key][step].active).map((step) => ROUTINE_STEP_LABELS[step]),
  );
  if (!activeLabels.length) return "Uma rotina de skincare montada no Entreluar.";
  return `Rotina com ${activeLabels.length} passo${activeLabels.length > 1 ? "s" : ""}: ${activeLabels.join(", ")}.`;
}

function firstProductImage(routine: Routine) {
  for (const period of ROUTINE_PERIODS) {
    for (const step of routine[period.key].order) {
      const image = routine[period.key][step].product?.image_url;
      if (image) return image;
    }
  }
  return null;
}

export async function generateMetadata({ params }: SharedRoutinePageProps): Promise<Metadata> {
  const { code } = await params;
  const routine = await getSharedRoutine(code);
  if (!routine) return {};
  const url = `${siteUrl}/minha-rotina/r/${code}`;
  const description = routineSummary(routine);
  const image = absoluteUrl(firstProductImage(routine));

  return {
    title: "Uma rotina montada no Entreluar",
    description,
    alternates: { canonical: `/minha-rotina/r/${code}` },
    openGraph: { title: "Uma rotina montada no Entreluar", description, url, type: "article", images: [{ url: image, alt: "Rotina Entreluar" }] },
    twitter: { card: "summary_large_image", title: "Uma rotina montada no Entreluar", description, images: [image] },
  };
}

export default async function SharedRoutinePage({ params }: SharedRoutinePageProps) {
  const { code } = await params;
  const routine = await getSharedRoutine(code);
  if (!routine) notFound();

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Rotina compartilhada</p>
          <h1 className="section-title mt-4">Uma rotina<br /><em>montada no Entreluar</em></h1>
          <p>Alguém separou esses passos com carinho. Dá uma olhada e, se combinar com você, é só clonar com um clique.</p>
        </header>

        <div className="section-space flex flex-col items-center gap-3 text-center">
          <UseRoutineButton routine={routine} />
          <p className="muted text-sm">
            Vai copiar tudo pro seu aparelho, do seu jeito. <Link href="/minha-rotina" className="underline">Ou comece do zero →</Link>
          </p>
        </div>

        {ROUTINE_PERIODS.map((period) => {
          const activeSteps = routine[period.key].order.filter((step) => routine[period.key][step].active);
          if (!activeSteps.length) return null;
          return (
            <section key={period.key} className="section-space">
              <div className="section-kicker"><span className="eyebrow">{period.icon} {period.label}</span></div>
              <div className="mt-6 grid gap-3">
                {activeSteps.map((step) => {
                  const entry = routine[period.key][step];
                  return (
                    <div key={step} className="luxe-card p-5">
                      <p className="poll-option-btn" data-active="true">{ROUTINE_STEP_LABELS[step]}</p>
                      <div className="mt-4">
                        {entry.product ? (
                          <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white/[.03] p-3">
                            {entry.product.image_url && (
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                                <Image src={entry.product.image_url} alt={entry.product.title} fill sizes="56px" className="object-cover" unoptimized />
                              </div>
                            )}
                            <p className="flex-1 text-sm font-bold text-[var(--champagne-pale)]">{entry.product.title}</p>
                          </div>
                        ) : entry.note ? (
                          <p className="muted text-sm">{entry.note}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="section-space text-center">
          <p className="eyebrow mb-4">Gostou?</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/minha-rotina" className="luxe-button">Montar minha rotina também</Link>
            <a href="https://instagram.com/entreluarBeauty" target="_blank" rel="noreferrer" className="ghost-button">Seguir @entreluarBeauty</a>
          </div>
        </section>
      </div>
    </main>
  );
}
