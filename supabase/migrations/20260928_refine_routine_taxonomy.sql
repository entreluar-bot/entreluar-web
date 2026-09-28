-- Refino da taxonomia de "Monte sua Rotina" depois da primeira leva de
-- classificacao (ver 20260928_add_routine_metadata_tags.sql): a fase da
-- rotina fica mais simples (5 verbos, so pra skincare facial) e ganha uma
-- dimensao nova, independente, de "parte do corpo".
--
-- 1) Renomeia 5 fases (mantem o id da tag, preserva os content_tags ja
--    aplicados aos produtos que continuam validos nessa fase).
-- 2) Remove as fases que deixam de existir (area_olhos, cabelo,
--    suplementos) -- o "on delete cascade" de content_tags ja limpa os
--    vinculos dos produtos que tinham essas fases.
-- 3) Adiciona o tipo de tag "body_part" (parte do corpo).
-- 4) Corrige a categoria de 3 produtos que foram cadastrados como
--    "SkinCare" por engano (na verdade sao Cabelos/Suplementos).
-- 5) Retageia os 4 produtos de area dos olhos com a fase real
--    (hidratar/tratar) + parte do corpo = olhos.

update public.tags set slug = 'limpar', name = 'Limpar' where slug = 'limpeza' and type = 'routine_phase';
update public.tags set slug = 'tonificar', name = 'Tonificar' where slug = 'serum' and type = 'routine_phase';
update public.tags set slug = 'tratar', name = 'Tratar' where slug = 'tratamento' and type = 'routine_phase';
update public.tags set slug = 'hidratar', name = 'Hidratar' where slug = 'hidratante' and type = 'routine_phase';
update public.tags set slug = 'proteger', name = 'Proteger' where slug = 'protetor_solar' and type = 'routine_phase';

delete from public.tags where type = 'routine_phase' and slug in ('area_olhos', 'cabelo', 'suplementos');

alter table public.tags drop constraint if exists tags_type_check;

alter table public.tags add constraint tags_type_check
  check (type in ('concern', 'ingredient', 'life_topic', 'category', 'routine_phase', 'routine_period', 'skin_type', 'origin', 'body_part'));

insert into public.tags (name, slug, type) values
  ('Rosto', 'rosto', 'body_part'),
  ('Olhos', 'olhos', 'body_part'),
  ('Pescoço', 'pescoco', 'body_part'),
  ('Cabelo', 'cabelo', 'body_part'),
  ('Mãos', 'maos', 'body_part'),
  ('Pés', 'pes', 'body_part'),
  ('Pernas', 'pernas', 'body_part'),
  ('Corpo inteiro', 'corpo-inteiro', 'body_part')
on conflict (slug) do nothing;

-- Corrige categoria de produtos cadastrados como "SkinCare" por engano.
update public.products set category = 'Cabelos' where id = 'c2e6c1c0-a8ba-4086-b50d-2252b79e6bcc'; -- Koleston Spray Retoque Instantâneo
update public.products set category = 'Suplementos' where id = '18139e52-0a25-41d5-9d20-3dadb9d3c74b'; -- Fórmula 4mag Rituária
update public.products set category = 'Suplementos' where id = '127d1540-deb5-4ae6-bccd-90ac452e7367'; -- Fórmula Fabulosa Rituarê

-- Retageia os 4 produtos de área dos olhos: fase real + parte do corpo = olhos.
-- (o período de uso de cada um já foi aplicado na leva anterior e continua valendo.)

insert into public.content_tags (tag_id, content_type, content_id)
select id, 'product', 'e74c17c7-b9e0-4847-9b10-21218a921abf' from public.tags where (slug = 'hidratar' and type = 'routine_phase') or (slug = 'olhos' and type = 'body_part')
on conflict (tag_id, content_type, content_id) do nothing;

insert into public.content_tags (tag_id, content_type, content_id)
select id, 'product', 'e8b240e2-e108-4a49-a963-1c71c7473f06' from public.tags where (slug = 'tratar' and type = 'routine_phase') or (slug = 'olhos' and type = 'body_part')
on conflict (tag_id, content_type, content_id) do nothing;

insert into public.content_tags (tag_id, content_type, content_id)
select id, 'product', '3e960395-8c78-4d55-837c-3f0f55b57b4f' from public.tags where (slug = 'tratar' and type = 'routine_phase') or (slug = 'olhos' and type = 'body_part')
on conflict (tag_id, content_type, content_id) do nothing;

insert into public.content_tags (tag_id, content_type, content_id)
select id, 'product', 'c94a5bcf-6589-45ce-879f-bcb9282097e7' from public.tags where (slug = 'tratar' and type = 'routine_phase') or (slug = 'olhos' and type = 'body_part')
on conflict (tag_id, content_type, content_id) do nothing;

comment on constraint tags_type_check on public.tags is 'Vocabulario de tipos de tag: queixa/ativo/vida-50/categoria (navegacao e busca) + fase/periodo/tipo-de-pele/origem/parte-do-corpo (Monte sua Rotina)';
