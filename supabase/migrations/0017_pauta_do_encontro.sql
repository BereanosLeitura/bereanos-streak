-- 0017: pauta do encontro
--
-- O que faz: guarda, em cada encontro, quais perguntas do mural o grupo decidiu
-- levar à conversa e em que ordem. Hoje o Modo Encontro mostra todas as
-- perguntas do mural numa lista só; com isto, o mediador monta a pauta antes.
--
-- Risco: nenhum. É só uma coluna nova, com valor padrão vazio. Nada é apagado
-- nem alterado, e o app continua funcionando igual enquanto a pauta estiver
-- vazia. Pode ser rodada com o app no ar.
--
-- Para desfazer:
--   alter table public.encontros drop column if exists perguntas_pauta;

alter table public.encontros
  add column if not exists perguntas_pauta text[] not null default '{}';

comment on column public.encontros.perguntas_pauta is
  'IDs de anotacoes do tipo pergunta, na ordem em que o grupo vai conversar.';
