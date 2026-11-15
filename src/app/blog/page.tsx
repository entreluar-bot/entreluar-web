import { createClient } from "@/utils/supabase/server";
import BlogFilters from "./BlogFilters";
import type { JournalPost } from "../types";
import type { Tag } from "@/lib/tags";

export const revalidate = 0;

export default async function Blog() {
  const supabase = await createClient();
  const { data } = await supabase.from("journal").select("*").order("created_at", { ascending: false });
  const posts = ((data || []) as JournalPost[]).filter((post) => post.category !== "Estudei para te explicar");
  const postIds = posts.map((post) => post.id);
  const { data: lifeTagRows } = await supabase.from("tags").select("id,name,slug,type").eq("type", "life_topic");
  const lifeTags = (lifeTagRows || []) as Tag[];
  const { data: links } = lifeTags.length && postIds.length
    ? await supabase.from("content_tags").select("tag_id,content_id").eq("content_type", "journal").in("content_id", postIds).in("tag_id", lifeTags.map((tag) => tag.id))
    : { data: [] as Array<{ tag_id: string; content_id: string }> };
  const tagsById = new Map(lifeTags.map((tag) => [tag.id, tag.slug]));
  const tagSlugsByPostId = new Map<string, string[]>();
  for (const link of (links || []) as Array<{ tag_id: string; content_id: string }>) {
    const slug = tagsById.get(link.tag_id);
    if (slug) tagSlugsByPostId.set(link.content_id, [...(tagSlugsByPostId.get(link.content_id) || []), slug]);
  }
  const taggedPosts = posts.map((post) => ({ ...post, tagSlugs: tagSlugsByPostId.get(post.id) || [] }));
  const tagGroups = [{ key: "life_topic", label: "Assunto da conversa", options: lifeTags.filter((tag) => taggedPosts.some((post) => post.tagSlugs.includes(tag.slug))).map((tag) => ({ slug: tag.slug, name: tag.name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")) }];

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro page-intro--compact">
          <h1 className="section-title">Papo de Mulher<br /><em>Madura</em></h1>
          <p>Menopausa, corpo, recomeços, descanso, beleza e liberdade — para ler pelo que você está sentindo hoje.</p>
        </header>
        {posts.length ? <BlogFilters posts={taggedPosts} tagGroups={tagGroups} /> : <div className="empty-state">A próxima conversa ainda está tomando forma. Volta daqui a pouco — eu prometo contar tudo. ☕</div>}
      </div>
    </main>
  );
}
