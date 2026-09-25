alter table public.journal
  add column if not exists papo_filter text;

comment on column public.journal.papo_filter is 'Gancho editorial do Papo de Mulher Madura baseado na sensacao do dia';

update public.journal
set papo_filter = 'Me escolhendo de novo'
where title = 'A audácia de descartar o que não nos serve mais';

update public.journal
set papo_filter = 'Pausa sem culpa'
where title = 'A arte de não fazer absolutamente nada (sem pedir desculpas)';

update public.journal
set papo_filter = 'Beleza sem tribunal'
where title = 'O cheiro de tinta, a nova patrulha e a minha raiz aos 50';

update public.journal
set papo_filter = 'Corpo em modo surpresa'
where title in (
  'Crônica de uma mulher madura: entre o caos invisível e o carinho necessário',
  'Minha Memória, foi embora junto com minha paciência!',
  'Como Escolhi Usar Terapia Hormonal',
  'A desobediência dos olhos após os 40'
);

update public.journal
set papo_filter = 'Rindo para não surtar'
where title in (
  'Viva a maturidade!',
  'Crônica da Luana',
  'Envelhecer é sempre a melhor opção'
);

update public.journal
set papo_filter = 'Confissões da maturidade'
where title = 'Como tudo começou....';
