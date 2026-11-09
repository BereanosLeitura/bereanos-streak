-- Leituras que o clube fez antes do app (julho a outubro de 2026).
-- Os quatro livros entram como ciclos concluídos, com capa, e cada membro fica
-- marcado como quem terminou a leitura.
--
-- Nenhuma página é lançada: os números de 2026 (páginas lidas, dias de leitura,
-- gráfico mês a mês, sequência) continuam exatamente como estão hoje. Os livros
-- aparecem na Estante do clube, em Livros do ano e na imagem Minha estante.
--
-- Rode uma vez no SQL Editor do Supabase. Rodar de novo não duplica nada.

with dados (titulo, autor, paginas, inicio, fim, capa, terminaram) as (
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

-- os recém-criados mais os que já existiam
todos as (
  select id, titulo from novos
  union
  select l.id, l.titulo from public.livros l where l.titulo in (select titulo from dados)
)

-- marca quem terminou cada leitura
insert into public.leituras_status (livro_id, membro_id, status, marcado_por)
select t.id, p.id, 'terminou', (select id from public.perfis where role = 'admin' order by created_at limit 1)
from dados d
join todos t on t.titulo = d.titulo
join public.perfis p on p.nome_exibicao = any (d.terminaram)
on conflict (livro_id, membro_id) do nothing;

-- Conferência: devem aparecer os 5 livros em ordem, com 2 pessoas em cada
-- leitura passada e a capa preenchida.
select l.titulo, l.paginas_totais as paginas, l.ciclo_inicio, l.ciclo_fim, l.status,
       (l.capa_url is not null) as tem_capa,
       count(s.membro_id) as terminaram
from public.livros l
left join public.leituras_status s on s.livro_id = l.id and s.status = 'terminou'
group by l.id
order by l.created_at;
