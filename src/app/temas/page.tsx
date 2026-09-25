import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { THEME_GROUPS } from "@/lib/theme-groups";
import type { Tag } from "@/lib/tags";

export const revalidate = 0;

export default async function Temas() {
  const supabase = await createClient();
  const [{ data: tagRows }, { data: linkRows }] = await Promise.all([
    supabase.from("tags").select("id,name,slug,type"),
    supabase.from("content_tags").select("tag_id"),
  ]);

  const tags = (tagRows || []) as Tag[];
  const slugById = new Map(tags.map((tag) => [tag.id, tag.slug]));
  const countBySlug = new Map<string, number>();
  for (const link of (linkRows || []) as Array<{ tag_id: string }>) {
    const slug = slugById.get(link.tag_id);
    if (!slug) continue;
    countBySlug.set(slug, (countBySlug.get(slug) || 0) + 1);
  }

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Escolha por onde entrar</p>
          <h1 className="section-title mt-4">O que você quer<br /><em>descobrir hoje?</em></h1>
          <p>Junto tudo que já existe no site por tema e necessidade — nada de conteúdo novo, só um jeito mais rápido de achar o que você precisa.</p>
        </header>

        <div className="intent-grid">
          {THEME_GROUPS.map((group) => {
            const total = group.tagSlugs.reduce((sum, slug) => sum + (countBySlug.get(slug) || 0), 0);
            return (
              <Link key={group.slug} href={`/temas/${group.slug}`} className="intent-tile">
                <span><span aria-hidden="true">{group.icon}</span> {group.label}</span>
                <strong>{group.subtitle}{total > 0 ? ` · ${total} ${total === 1 ? "achado" : "achados"}` : ""}</strong>
              </Link>
            );
          })}
        </div>

        <div className="section-space text-center">
          <Link href="/me-ajuda-a-escolher" className="ghost-button">Não sabe por onde começar? Me ajuda a escolher →</Link>
        </div>
      </div>
    </main>
  );
}
