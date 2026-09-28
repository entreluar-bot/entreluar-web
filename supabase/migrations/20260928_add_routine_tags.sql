-- Adiciona dois tipos de tag pra modelar a rotina de skincare como vocabulario
-- de tag (reaproveitando o mesmo mecanismo de filtro/sugestao por IA que ja
-- existe pra queixa/ativo/categoria), em vez de um campo novo isolado:
--   routine_step  -> em qual etapa da rotina o produto entra (limpar, tonificar...)
--   usage_period  -> quando usar (manha e/ou noite; produtos pra ambos ganham as duas tags)

alter table public.tags drop constraint if exists tags_type_check;
alter table public.tags add constraint tags_type_check
  check (type in ('concern', 'ingredient', 'life_topic', 'category', 'routine_step', 'usage_period'));

insert into public.tags (name, slug, type) values
  ('Limpar', 'limpar', 'routine_step'),
  ('Tonificar', 'tonificar', 'routine_step'),
  ('Tratar', 'tratar', 'routine_step'),
  ('Hidratar', 'hidratar', 'routine_step'),
  ('Proteger', 'proteger', 'routine_step'),
  ('Firmar', 'firmar', 'routine_step'),
  ('Manhã', 'manha', 'usage_period'),
  ('Noite', 'noite', 'usage_period')
on conflict (slug) do nothing;
