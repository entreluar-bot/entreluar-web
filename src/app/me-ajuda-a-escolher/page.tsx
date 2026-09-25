import { createClient } from "@/utils/supabase/server";
import type { Tag } from "@/lib/tags";
import QuizWizard from "./QuizWizard";

export const revalidate = 0;

export default async function MeAjudaAEscolher() {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id,name,slug,type").eq("type", "concern").order("name", { ascending: true });
  const concernTags = ((data || []) as Tag[]).map((tag) => ({ slug: tag.slug, name: tag.name }));

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Uma ferramenta editorial, não um diagnóstico</p>
          <h1 className="section-title mt-4">Me ajuda<br /><em>a escolher</em></h1>
          <p>Duas perguntas rápidas e eu separo o que já existe por aqui — conversa, ciência e achados — que combina com o que você quer cuidar hoje.</p>
        </header>
        <QuizWizard concernTags={concernTags} />
      </div>
    </main>
  );
}
