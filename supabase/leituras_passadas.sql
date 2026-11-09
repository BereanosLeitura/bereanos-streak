-- Leituras que o clube fez antes do app (julho a outubro de 2026).
--
-- O script faz três coisas:
--   1. cria os quatro livros como ciclos concluídos, com capa;
--   2. lança o progresso de cada membro dentro do período de cada livro,
--      em quatro registros por livro (um por semana, o último no fim do ciclo),
--      somando exatamente o total de páginas;
--   3. marca cada membro como quem terminou a leitura.
--
-- Com isso, as páginas entram no mês certo do gráfico "mês a mês", no total do
-- ano e no progresso de cada livro. O tempo de leitura fica em branco, porque
-- ninguém cronometrou essas leituras.
--
-- Rode uma vez no SQL Editor do Supabase. Rodar de novo não duplica nada.
-- Para desfazer, use o bloco comentado no fim do arquivo.

with dados (titulo, autor, paginas, inicio, fim, capa, leram) as (
  values
    ('Simplesmente Cristão', 'N. T. Wright', 240,
     date '2026-07-01', date '2026-07-31', 'simplesmente-cristao',
     array['Felipe Magalhães', 'Madson Sousa']),

    ('Revestidos de Poder', 'Gutierres Fernandes Siqueira', 144,
     date '2026-08-01', date '2026-08-31', 'revestidos-de-poder',
     array['Felipe Magalhães', 'Madson Sousa']),

    ('O Peregrino', 'John Bunyan', 280,
     date '2026-09-01', date '2026-09-30', 'o-peregrino',
     array['Felipe Magalhães', 'Madson Sousa']),

    ('O Cristão e a Política', 'Nikolas Ferreira', 160,
     date '2026-10-01', date '2026-10-31', 'o-cristao-e-a-politica',
     array['Felipe Magalhães', 'Madson Sousa'])
),

-- cria só o que ainda não existe (confere pelo título)
novos as (
  insert into public.livros (titulo, autor, paginas_totais, ciclo_inicio, ciclo_fim, status, capa_url, created_at)
  select d.titulo, d.autor, d.paginas, d.inicio, d.fim, 'concluido',
         'https://olkytbwvqgnhkbbddabe.supabase.co/storage/v1/object/public/capas-livros/livros-do-clube/' || d.capa || '.jpg',
         d.fim::timestamptz
  from dados d
  where not exists (select 1 from public.livros l where l.titulo = d.titulo)
  returning id, titulo
),

todos as (
  select id, titulo from novos
  union
  select l.id, l.titulo from public.livros l where l.titulo in (select titulo from dados)
),

-- quem leu cada livro
quem as (
  select t.id as livro_id, d.titulo, d.paginas, d.inicio, d.fim, p.id as membro_id
  from dados d
  join todos t on t.titulo = d.titulo
  join public.perfis p on p.nome_exibicao = any (d.leram)
),

-- quatro marcos por livro, espalhados pelo período, o último no fim do ciclo
marcos as (
  select q.*,
         k,
         (q.inicio + (round((q.fim - q.inicio)::numeric * k / 4))::int)::date as dia,
         (floor(q.paginas::numeric * k / 4) - floor(q.paginas::numeric * (k - 1) / 4))::int as paginas_no_dia
  from quem q
  cross join generate_series(1, 4) as k
)

insert into public.registros_leitura (id, membro_id, livro_id, origem, paginas_lidas, minutos_lidos, registrado_em)
select md5(m.livro_id::text || m.membro_id::text || m.dia::text)::uuid,
       m.membro_id, m.livro_id, 'manual', m.paginas_no_dia, null,
       (m.dia + time '20:00') at time zone 'America/Fortaleza'
from marcos m
where m.paginas_no_dia > 0
on conflict (id) do nothing;

-- marca quem terminou cada leitura
with dados (titulo, leram) as (
  values
    ('Simplesmente Cristão',   array['Felipe Magalhães', 'Madson Sousa']),
    ('Revestidos de Poder',    array['Felipe Magalhães', 'Madson Sousa']),
    ('O Peregrino',            array['Felipe Magalhães', 'Madson Sousa']),
    ('O Cristão e a Política', array['Felipe Magalhães', 'Madson Sousa'])
)
insert into public.leituras_status (livro_id, membro_id, status, marcado_por)
select l.id, p.id, 'terminou', (select id from public.perfis where role = 'admin' order by created_at limit 1)
from dados d
join public.livros l on l.titulo = d.titulo
join public.perfis p on p.nome_exibicao = any (d.leram)
on conflict (livro_id, membro_id) do nothing;

-- Conferência: cinco livros, com o que foi lançado para cada um.
select l.titulo, l.paginas_totais as paginas_do_livro, l.ciclo_inicio, l.ciclo_fim, l.status,
       (l.capa_url is not null) as tem_capa,
       (select count(*) from public.leituras_status s where s.livro_id = l.id and s.status = 'terminou') as terminaram,
       (select count(distinct r.membro_id) from public.registros_leitura r where r.livro_id = l.id) as com_registro,
       (select coalesce(sum(r.paginas_lidas), 0) from public.registros_leitura r where r.livro_id = l.id) as paginas_no_total
from public.livros l
order by l.created_at;

-- DESFAZER (apaga só o que este script criou; rode apenas se precisar):
-- delete from public.registros_leitura r
--   using public.livros l
--   where r.livro_id = l.id
--     and l.titulo in ('Simplesmente Cristão','Revestidos de Poder','O Peregrino','O Cristão e a Política');
-- delete from public.leituras_status s
--   using public.livros l
--   where s.livro_id = l.id
--     and l.titulo in ('Simplesmente Cristão','Revestidos de Poder','O Peregrino','O Cristão e a Política');
-- delete from public.livros
--   where titulo in ('Simplesmente Cristão','Revestidos de Poder','O Peregrino','O Cristão e a Política');
