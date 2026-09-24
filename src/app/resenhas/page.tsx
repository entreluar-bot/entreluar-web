import { createClient } from "@/utils/supabase/server";
import type { JournalPost, Product } from "../types";
import ReviewFilters from "./ReviewFilters";

export const revalidate = 0;

export default async function Resenhas() {
  const supabase = await createClient();
  const [{ data: journalData }, { data: productData }] = await Promise.all([
    supabase.from("journal").select("*").eq("category", "Estudei para te explicar").order("created_at", { ascending: false }),
    supabase.from("products").select("image_url,category,is_featured,is_most_purchased,is_most_viewed"),
  ]);

  const highlightsByImage = new Map(
    ((productData || []) as Pick<Product, "image_url" | "category" | "is_featured" | "is_most_purchased" | "is_most_viewed">[])
      .filter((product) => Boolean(product.image_url))
      .map((product) => [product.image_url as string, product]),
  );
  const posts = ((journalData || []) as JournalPost[]).map((post) => {
    const product = post.image_url ? highlightsByImage.get(post.image_url) : undefined;
    return {
      ...post,
      is_featured: product?.is_featured,
      is_most_purchased: product?.is_most_purchased,
      is_most_viewed: product?.is_most_viewed,
      filter_category: product?.category,
    };
  });

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Estudei para te explicar</p>
          <h1 className="section-title mt-4">Estudei para<br /><em>te explicar</em></h1>
          <p>Eu estudo os ativos, separo evidência de promessa e te conto o que importa — sem complicar e sem enrolação.</p>
        </header>
        {posts.length ? <ReviewFilters posts={posts} /> : <div className="empty-state">A lupa está trabalhando. Quando a evidência chegar, eu traduzo sem enrolação. 🔬</div>}
      </div>
    </main>
  );
}
