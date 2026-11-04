-- 0013: tempo de leitura informado à mão no registro (quem não usou o Foco).
-- Fica separado de minutos_lidos, que é convertido em páginas pelo ritmo:
-- assim o tempo não conta páginas em dobro nas metas e conquistas.
alter table public.registros_leitura
  add column if not exists tempo_minutos integer
  check (tempo_minutos is null or tempo_minutos between 1 and 1440);
