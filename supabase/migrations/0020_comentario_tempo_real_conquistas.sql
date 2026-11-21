-- 0020: comentário no trecho, grupo e mural ao vivo, nomes das conquistas por nível.
--
-- 1) Comentário do trecho
--    Hoje quem guarda um trecho e quer dizer o que pensou escreve tudo junto
--    ("...nosso trabalho é mantê-las fora delas. (Mente vazia, oficina do
--    diabo)"). A coluna nova separa o texto do livro do comentário pessoal.
--    Opcional: anotações antigas ficam como estão.
--
-- 2) Ao vivo (Supabase Realtime)
--    O Início e o mural passam a atualizar sozinhos quando alguém registra
--    leitura, posta ou responde. O Realtime respeita o RLS: cada pessoa só
--    recebe aviso do que já podia ver.
--
-- 3) Conquistas com o mesmo nome em níveis diferentes
--    "Maratonista" aparecia três vezes (3, 5 e 10 livros) e "Hora de leitura"
--    também (10, 50 e 100 sessões). Agora levam o nível no nome.
--
-- Risco: baixo. Uma coluna nova opcional, tabelas adicionadas à publicação do
-- Realtime e troca de nomes. Nada é apagado. Pode rodar com o app no ar e
-- pode rodar mais de uma vez.
--
-- Para desfazer:
--   alter table public.anotacoes drop column if exists comentario;
--   alter publication supabase_realtime drop table public.registros_leitura, public.anotacoes, public.respostas_mural;
--   (os nomes antigos das conquistas estão nas migrações 0001 e 0004)

-- 1) comentário
alter table public.anotacoes
  add column if not exists comentario text
  check (comentario is null or char_length(comentario) <= 1000);
comment on column public.anotacoes.comentario is 'Comentário pessoal sobre o trecho (opcional), separado do texto do livro.';

-- 2) tempo real
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['registros_leitura', 'anotacoes', 'respostas_mural'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- 3) nomes por nível
update public.conquistas set nome = 'Maratonista I'     where chave = 'maratonista_3';
update public.conquistas set nome = 'Maratonista II'    where chave = 'maratonista_5';
update public.conquistas set nome = 'Maratonista III'   where chave = 'maratonista_10';
update public.conquistas set nome = 'Hora de leitura I'   where chave = 'hora_de_leitura_10';
update public.conquistas set nome = 'Hora de leitura II'  where chave = 'hora_de_leitura_50';
update public.conquistas set nome = 'Hora de leitura III' where chave = 'hora_de_leitura_100';

-- conferência: não deve sobrar nome repetido no catálogo
select nome, count(*) from public.conquistas group by nome having count(*) > 1;
