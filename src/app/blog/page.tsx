import { createClient } from "@/utils/supabase/server";
import BlogFilters from "./BlogFilters";
import type { JournalPost } from "../types";

export const revalidate = 0;

export default async function Blog() {
  const supabase = await createClient();
  const { data } = await supabase.from("journal").select("*").order("created_at", { ascending: false });
  const posts = ((data || []) as JournalPost[]).filter((post) => post.category !== "Estudei para te explicar");

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro page-intro--compact">
          <p className="eyebrow">Papo de mulher para mulher</p>
          <h1 className="section-title mt-4">Papo de Mulher<br /><em>Madura</em></h1>
          <p>Menopausa, corpo, recomeços, descanso, beleza e liberdade — para ler pelo que você está sentindo hoje.</p>
        </header>
        {posts.length ? <BlogFilters posts={posts} /> : <div className="empty-state">A próxima conversa ainda está tomando forma. Volta daqui a pouco — eu prometo contar tudo. ☕</div>}
      </div>
    </main>
  );
}
