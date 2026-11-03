-- 0008: meta diária pessoal, anotações favoritas e próximo encontro do ciclo.

-- Meta diária de páginas de cada membro (usada no anel "Meta de hoje" do Início).
alter table public.perfis
  add column if not exists meta_diaria_paginas integer not null default 10
  check (meta_diaria_paginas between 1 and 500);

-- Anotação marcada com estrela pelo próprio autor.
alter table public.anotacoes
  add column if not exists favorita boolean not null default false;

-- Próximo encontro do ciclo, preenchido pelo admin (data/hora e local).
alter table public.livros
  add column if not exists encontro_em timestamptz,
  add column if not exists encontro_local text check (encontro_local is null or char_length(encontro_local) <= 120);
