-- Concessão automática de conquistas, no servidor (não no cliente).
-- Mantém o princípio do schema original: membro_conquistas não tem policy
-- de insert para o cliente (ninguém se autoconcede conquista) — a única
-- exceção deliberada é "compartilhou_jornada", no fim deste arquivo.

-- Função auxiliar: concede 1 conquista a 1 membro se ele ainda não tiver.
-- security definer = roda com permissão do dono (ignora RLS), por isso
-- os triggers abaixo conseguem inserir em membro_conquistas mesmo sem policy.
create or replace function public.conceder_conquista(
  p_membro_id uuid,
  p_chave text,
  p_livro_id uuid default null
)
returns void as $$
declare
  v_conquista_id uuid;
  v_existe boolean;
begin
  select id into v_conquista_id from public.conquistas where chave = p_chave;
  if v_conquista_id is null then
    return; -- chave desconhecida: não quebra o fluxo, só não concede nada
  end if;

  -- checagem manual em vez de "on conflict": livro_id pode ser NULL, e dois
  -- NULLs nunca são iguais pra UNIQUE do Postgres, então on conflict não
  -- bastaria para evitar duplicata quando livro_id é nulo.
  select exists(
    select 1 from public.membro_conquistas
    where membro_id = p_membro_id
      and conquista_id = v_conquista_id
      and ((p_livro_id is null and livro_id is null) or livro_id = p_livro_id)
  ) into v_existe;

  if not v_existe then
    insert into public.membro_conquistas (membro_id, conquista_id, livro_id)
    values (p_membro_id, v_conquista_id, p_livro_id);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ========== Gatilho: registro de leitura (páginas ou pomodoro convertido) ==========

create or replace function public.verificar_conquistas_registro()
returns trigger as $$
declare
  v_ritmo numeric;
  v_total_livro_atual numeric;
  v_paginas_totais integer;
  v_livros_concluidos integer;
  v_ja_tem_dianteira boolean;
  v_streak integer := 0;
  v_dia date := current_date;
  v_meta record;
  v_soma_meta numeric;
begin
  select coalesce(ritmo_leitura_min_por_pagina, 2) into v_ritmo
  from public.perfis where id = new.membro_id;

  select coalesce(sum(paginas_lidas), 0) + coalesce(sum(minutos_lidos), 0) / v_ritmo
    into v_total_livro_atual
  from public.registros_leitura
  where membro_id = new.membro_id and livro_id = new.livro_id;

  select paginas_totais into v_paginas_totais from public.livros where id = new.livro_id;

  if v_paginas_totais is not null and v_total_livro_atual >= v_paginas_totais then
    -- "na_dianteira": primeiro do grupo a terminar ESTE livro
    select not exists (
      select 1 from public.membro_conquistas mc
      join public.conquistas c on c.id = mc.conquista_id
      where c.chave = 'na_dianteira' and mc.livro_id = new.livro_id
    ) into v_ja_tem_dianteira;
    if v_ja_tem_dianteira then
      perform public.conceder_conquista(new.membro_id, 'na_dianteira', new.livro_id);
    end if;

    -- quantos livros esse membro já concluiu no total (recalculado a cada registro)
    select count(*) into v_livros_concluidos
    from (
      select r.livro_id,
             coalesce(sum(r.paginas_lidas), 0) + coalesce(sum(r.minutos_lidos), 0) / v_ritmo as total,
             l.paginas_totais as totais
      from public.registros_leitura r
      join public.livros l on l.id = r.livro_id
      where r.membro_id = new.membro_id
      group by r.livro_id, l.paginas_totais
    ) sub
    where total >= totais;

    if v_livros_concluidos >= 1 then perform public.conceder_conquista(new.membro_id, 'primeira_leitura'); end if;
    if v_livros_concluidos >= 3 then perform public.conceder_conquista(new.membro_id, 'maratonista_3'); end if;
    if v_livros_concluidos >= 5 then perform public.conceder_conquista(new.membro_id, 'maratonista_5'); end if;
    if v_livros_concluidos >= 10 then perform public.conceder_conquista(new.membro_id, 'maratonista_10'); end if;
  end if;

  -- "streak": dias seguidos (consecutivos, terminando hoje) com pelo menos 1 registro.
  -- Limiar de 3 dias é uma suposição razoável, não veio de especificação — ajuste
  -- fácil: troque o ">= 3" abaixo.
  loop
    exit when not exists (
      select 1 from public.registros_leitura
      where membro_id = new.membro_id and registrado_em::date = v_dia
    );
    v_streak := v_streak + 1;
    v_dia := v_dia - 1;
    exit when v_streak > 365; -- trava de segurança
  end loop;
  if v_streak >= 3 then
    perform public.conceder_conquista(new.membro_id, 'streak');
  end if;

  -- "meta_batida": bateu alguma meta semanal ativa (desse livro) com esse registro
  for v_meta in
    select * from public.metas
    where membro_id = new.membro_id
      and livro_id = new.livro_id
      and tipo = 'semanal'
      and periodo_inicio <= current_date
      and periodo_fim >= current_date
  loop
    select coalesce(sum(paginas_lidas), 0) + coalesce(sum(minutos_lidos), 0) / v_ritmo
      into v_soma_meta
    from public.registros_leitura
    where membro_id = new.membro_id
      and livro_id = new.livro_id
      and registrado_em::date between v_meta.periodo_inicio and v_meta.periodo_fim;

    if v_meta.valor_paginas is not null and v_soma_meta >= v_meta.valor_paginas then
      perform public.conceder_conquista(new.membro_id, 'meta_batida', new.livro_id);
    end if;
  end loop;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_conquistas_registro on public.registros_leitura;
create trigger trg_conquistas_registro
  after insert on public.registros_leitura
  for each row execute function public.verificar_conquistas_registro();

-- ========== Gatilho: sessão de pomodoro concluída ==========
-- Importante: o app sempre grava a sessão já com status='concluida' num único
-- upsert (nunca "em_andamento" seguido de update), então isso é um INSERT, não
-- um UPDATE. O gatilho cobre os dois casos.

create or replace function public.verificar_conquistas_pomodoro()
returns trigger as $$
declare
  v_total_concluidas integer;
begin
  if new.status = 'concluida'
     and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then

    select count(*) into v_total_concluidas
    from public.sessoes_pomodoro
    where membro_id = new.membro_id and status = 'concluida';

    if v_total_concluidas >= 1 then perform public.conceder_conquista(new.membro_id, 'foco_de_verdade'); end if;
    if v_total_concluidas >= 10 then perform public.conceder_conquista(new.membro_id, 'hora_de_leitura_10'); end if;
    if v_total_concluidas >= 50 then perform public.conceder_conquista(new.membro_id, 'hora_de_leitura_50'); end if;
    if v_total_concluidas >= 100 then perform public.conceder_conquista(new.membro_id, 'hora_de_leitura_100'); end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_conquistas_pomodoro on public.sessoes_pomodoro;
create trigger trg_conquistas_pomodoro
  after insert or update on public.sessoes_pomodoro
  for each row execute function public.verificar_conquistas_pomodoro();

-- ========== Exceção deliberada: "compartilhou_jornada" ==========
-- Única conquista que o próprio cliente pode gravar, porque não existe um
-- evento de banco pra ela (é a pessoa clicando em "compartilhar"). O app
-- confere antes se o membro já tem, mas a policy abaixo também impede
-- conceder qualquer OUTRA conquista pelo cliente.
create policy "membro_conquistas_insert_compartilhou" on public.membro_conquistas
  for insert to authenticated
  with check (
    auth.uid() = membro_id
    and conquista_id = (select id from public.conquistas where chave = 'compartilhou_jornada')
  );
