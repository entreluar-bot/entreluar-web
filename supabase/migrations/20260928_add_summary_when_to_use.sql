-- Novo campo do "Em 30 segundos": quando/em que ordem da rotina usar o
-- produto (ou o ativo, no artigo de "Estudei para te explicar").

alter table public.content_summaries add column if not exists when_to_use text;
