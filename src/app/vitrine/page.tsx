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
          <p className="eyebrow">Testado sem cerimônia</p>
          <h1 className="section-title mt-4">Meus achados.<br /><em>Sem promessa vazia.</em></h1>
          <p>Eu separo o que merece espaço na bancada do que só merece um belo tchau. E te conto por quê.</p>
        </header>
        {products.length > 0 ? (
          <ProductFilters products={products} />
        ) : (
          <div className="empty-state">A bancada está respirando. Já já entram novos achados — só os que merecerem espaço. ✨</div>
        )}
      </div>
    </main>
  );
}
