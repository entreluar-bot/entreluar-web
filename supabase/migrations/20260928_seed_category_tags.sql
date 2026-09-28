-- Semeia o vocabulario de tags tipo 'category', espelhando as 10 categorias
-- da Vitrine (src/lib/product-categories.ts), para que a fileira "Categoria"
-- no painel deixe de ficar vazia e a Luana consiga selecionar/a IA classificar.
--
-- Slug prefixado com "categoria-" porque tags.slug e unico globalmente (nao
-- por tipo), e "Corpo" ja existe como slug de life_topic ('corpo').
-- Ver categoryTagSlug() em src/lib/tags.ts, que deve gerar o mesmo slug.

insert into public.tags (name, slug, type) values
  ('SkinCare', 'categoria-skincare', 'category'),
  ('Maquiagem', 'categoria-maquiagem', 'category'),
  ('Cabelos', 'categoria-cabelos', 'category'),
  ('Corpo', 'categoria-corpo', 'category'),
  ('Mãos', 'categoria-maos', 'category'),
  ('Unhas', 'categoria-unhas', 'category'),
  ('Suplementos', 'categoria-suplementos', 'category'),
  ('Acessórios', 'categoria-acessorios', 'category'),
  ('Roupas', 'categoria-roupas', 'category'),
  ('Outros Achadinhos', 'categoria-outros-achadinhos', 'category')
on conflict (slug) do nothing;
