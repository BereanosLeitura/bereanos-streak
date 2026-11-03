-- 0007: aceita o tema "azul" além de claro, escuro e sistema.
alter table public.perfis drop constraint if exists perfis_tema_preferido_check;
alter table public.perfis add constraint perfis_tema_preferido_check
  check (tema_preferido in ('claro', 'escuro', 'azul', 'sistema'));
