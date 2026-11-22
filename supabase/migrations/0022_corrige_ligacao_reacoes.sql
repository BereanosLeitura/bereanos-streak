-- 0022: corrige o mural e as anotações, que pararam de carregar depois da 0021.
--
-- O que aconteceu: a tabela reacoes_mural (0021) tinha chave estrangeira para
-- anotacoes E para perfis. Com isso o Supabase (PostgREST) passou a enxergar
-- dois caminhos entre anotacoes e perfis (o direto, pelo autor, e um "muitos
-- para muitos" pelas reações) e recusava toda consulta que pedia o nome do
-- autor junto com a anotação (erro PGRST201). Mural, Início, Encontro e
-- relatórios deixaram de carregar as anotações.
--
-- A correção: o membro da reação passa a apontar para auth.users (a conta),
-- não para perfis. Cada perfil tem o mesmo id da conta, então nada muda para
-- o app, e o caminho duplicado deixa de existir. O app também passou a dizer
-- explicitamente qual ligação usar (perfis!anotacoes_membro_id_fkey).
--
-- Risco: nenhum dado é apagado. Pode rodar com o app no ar e mais de uma vez.

alter table public.reacoes_mural drop constraint if exists reacoes_mural_membro_id_fkey;
alter table public.reacoes_mural add constraint reacoes_mural_membro_id_fkey
  foreign key (membro_id) references auth.users(id) on delete cascade;
notify pgrst, 'reload schema';

-- conferência: deve listar anotacoes e auth.users (não perfis)
select conname, confrelid::regclass as aponta_para
from pg_constraint where conrelid = 'public.reacoes_mural'::regclass and contype = 'f';
