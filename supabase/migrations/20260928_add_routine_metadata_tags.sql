-- Metadados de "Monte sua Rotina" reaproveitando o vocabulario de tags que
-- ja existe (tags + content_tags, ver 20260925_add_content_tags.sql) em vez
-- de criar colunas novas em products. Isso deixa o admin atribuir fase da
-- rotina, periodo, tipo de pele e origem por produto usando a mesma tela de
-- chips que ja existe para queixa/ativo/vida-50/categoria.
--
-- Atencao para nao confundir os dois vocabularios parecidos:
--   - "protecao-solar" (type: concern) descreve uma QUEIXA/necessidade.
--   - "protetor_solar" (type: routine_phase, com underscore, igual ao
--     RoutineStepKey em src/lib/routine.ts) descreve EM QUAL PASSO da rotina
--     o produto entra. Sao tags diferentes, de proposito.
-- Sensibilidade de pele nao ganha tag nova: reaproveita a tag "sensibilidade"
-- (type: concern) que ja existe.

alter table public.tags drop constraint if exists tags_type_check;

alter table public.tags add constraint tags_type_check
  check (type in ('concern', 'ingredient', 'life_topic', 'category', 'routine_phase', 'routine_period', 'skin_type', 'origin'));

insert into public.tags (name, slug, type) values
  ('Limpeza', 'limpeza', 'routine_phase'),
  ('Sérum', 'serum', 'routine_phase'),
  ('Tratamento', 'tratamento', 'routine_phase'),
  ('Área dos olhos', 'area_olhos', 'routine_phase'),
  ('Hidratante', 'hidratante', 'routine_phase'),
  ('Protetor solar', 'protetor_solar', 'routine_phase'),
  ('Cabelo', 'cabelo', 'routine_phase'),
  ('Suplementos', 'suplementos', 'routine_phase'),
  ('Manhã', 'manha', 'routine_period'),
  ('Noite', 'noite', 'routine_period'),
  ('Manhã e noite', 'ambos', 'routine_period'),
  ('Pele oleosa', 'oleosa', 'skin_type'),
  ('Pele seca', 'seca', 'skin_type'),
  ('Pele mista', 'mista', 'skin_type'),
  ('Pele normal', 'normal', 'skin_type'),
  ('Brasileiro', 'brasileiro', 'origin'),
  ('Coreano', 'coreano', 'origin'),
  ('Outra origem', 'outro', 'origin')
on conflict (slug) do nothing;

comment on constraint tags_type_check on public.tags is 'Vocabulario de tipos de tag: queixa/ativo/vida-50/categoria (navegacao e busca) + fase/periodo/tipo-de-pele/origem (Monte sua Rotina)';
