import { createClient } from "@/utils/supabase/server";
import type { Product } from "../types";
import ProductFilters from "./ProductFilters";

export const revalidate = 0;

export default async function Vitrine() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  const products = (data || []) as Product[];

  return (
    <main className="site-shell">
      <div className="content-wrap">
        <header className="page-intro">
          <p className="eyebrow">Testado, estudado e contado sem filtro</p>
          <h1 className="section-title mt-4">A minha coleção<br /><em>de achados</em></h1>
          <p>Eu testo cada escolha como se fosse indicar para uma amiga — porque é exatamente isso que estou fazendo.</p>
        </header>
        {products.length > 0 ? (
          <ProductFilters products={products} />
        ) : (
          <div className="empty-state">Minha penteadeira está sendo organizada. Os novos achados chegam já já. ✨</div>
        )}
      </div>
    </main>
  );
}
