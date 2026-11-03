-- 0009: mais conquistas + correção de fuso horário nas contas por dia.
--
-- Correção: as contas de "dia" usavam a data em UTC. Uma leitura registrada
-- às 22h em Fortaleza (01h UTC) caía no dia seguinte e podia quebrar a
-- sequência. Agora tudo é contado no fuso America/Fortaleza.
--
-- Princípio mantido: constância vale mais que quantidade, e nenhuma conquista
-- nova compara membros entre si.

-- ========== Catálogo ==========
update public.conquistas set nome = 'Três dias seguidos', descricao = '3 dias seguidos com leitura' where chave = 'streak';
update public.conquistas set descricao = 'Cumpriu uma meta semanal pessoal (páginas, dias ou sessões)' where chave = 'meta_batida';

insert into public.conquistas (chave, nome, descricao, icone) values
  ('constancia_7', 'Uma semana inteira', '7 dias seguidos com leitura', 'flame'),
  ('constancia_30', 'Um mês de constância', '30 dias seguidos com leitura', 'flame'),
  ('dias_30', '30 dias de leitura', 'Leu em 30 dias diferentes, seguidos ou não', 'calendar'),
  ('dias_100', '100 dias de leitura', 'Leu em 100 dias diferentes, seguidos ou não', 'calendar'),
  ('paginas_500', '500 páginas', 'Somou 500 páginas lidas no app', 'book'),
  ('paginas_1000', 'Mil páginas', 'Somou 1.000 páginas lidas no app', 'book'),
  ('leitura_manha', 'Leitura da manhã', 'Registrou uma leitura entre 4h e 7h', 'sun'),
  ('leitura_noite', 'Leitura da noite', 'Registrou uma leitura depois das 22h', 'moon'),
  ('fim_de_semana', 'Sábado e domingo', 'Leu no sábado e no domingo do mesmo fim de semana', 'calendar'),
  ('no_prazo', 'No prazo', 'Terminou o livro até o fim do ciclo', 'target'),
  ('meta_mensal', 'Meta do mês', 'Cumpriu uma meta mensal de páginas', 'target'),
  ('imersao', 'Imersão', 'Concluiu uma sessão de foco de 45 minutos ou mais', 'timer'),
  ('ciclo_completo', 'Ciclo completo', '4 sessões de foco no mesmo dia', 'timer'),
  ('primeira_anotacao', 'Primeira marca', 'Fez a primeira anotação de leitura', 'pen'),
  ('examinador', 'Examinador', 'Registrou 10 perguntas para examinar', 'question'),
  ('guardador_trechos', 'Guardador de trechos', 'Guardou 25 trechos de livros', 'quote'),
  ('reflexivo', 'Reflexivo', 'Escreveu 10 reflexões', 'bulb'),
  ('voz_no_mural', 'Voz no mural', 'Pôs a primeira anotação no mural do grupo', 'group')
on conflict (chave) do nothing;

-- ========== Registro de leitura ==========
create or replace function public.verificar_conquistas_registro()
returns trigger as $$
declare
  tz constant text := 'America/Fortaleza';
  v_ritmo numeric;
  v_total_livro_atual numeric;
  v_livro record;
  v_livros_concluidos integer;
  v_ja_tem_dianteira boolean;
  v_hoje date := (now() at time zone tz)::date;
  v_dia_reg date := (new.registrado_em at time zone tz)::date;
  v_hora integer := extract(hour from new.registrado_em at time zone tz);
  v_dia date;
  v_streak integer := 0;
  v_dias_distintos integer;
  v_paginas_total numeric;
  v_meta record;
  v_valor numeric;
begin
  select coalesce(ritmo_leitura_min_por_pagina, 2) into v_ritmo from public.perfis where id = new.membro_id;
  select * into v_livro from public.livros where id = new.livro_id;

  select coalesce(sum(paginas_lidas), 0) + coalesce(sum(minutos_lidos), 0) / v_ritmo into v_total_livro_atual
  from public.registros_leitura where membro_id = new.membro_id and livro_id = new.livro_id;

  -- terminou o livro
  if v_livro.paginas_totais is not null and v_total_livro_atual >= v_livro.paginas_totais then
    select not exists (
      select 1 from public.membro_conquistas mc join public.conquistas c on c.id = mc.conquista_id
      where c.chave = 'na_dianteira' and mc.livro_id = new.livro_id
    ) into v_ja_tem_dianteira;
    if v_ja_tem_dianteira then
      perform public.conceder_conquista(new.membro_id, 'na_dianteira', new.livro_id);
    end if;

    if v_livro.ciclo_fim is not null and v_hoje <= v_livro.ciclo_fim then
      perform public.conceder_conquista(new.membro_id, 'no_prazo', new.livro_id);
    end if;

    select count(*) into v_livros_concluidos
    from (
      select coalesce(sum(r.paginas_lidas), 0) + coalesce(sum(r.minutos_lidos), 0) / v_ritmo as total, l.paginas_totais as totais
      from public.registros_leitura r join public.livros l on l.id = r.livro_id
      where r.membro_id = new.membro_id
      group by r.livro_id, l.paginas_totais
    ) sub
    where total >= totais;

    if v_livros_concluidos >= 1 then perform public.conceder_conquista(new.membro_id, 'primeira_leitura'); end if;
    if v_livros_concluidos >= 3 then perform public.conceder_conquista(new.membro_id, 'maratonista_3'); end if;
    if v_livros_concluidos >= 5 then perform public.conceder_conquista(new.membro_id, 'maratonista_5'); end if;
    if v_livros_concluidos >= 10 then perform public.conceder_conquista(new.membro_id, 'maratonista_10'); end if;
  end if;

  -- sequência de dias (no fuso local), contando a partir de hoje
  v_dia := v_hoje;
  loop
    exit when not exists (
      select 1 from public.registros_leitura
      where membro_id = new.membro_id and (registrado_em at time zone tz)::date = v_dia
    );
    v_streak := v_streak + 1;
    v_dia := v_dia - 1;
    exit when v_streak > 400;
  end loop;
  if v_streak >= 3 then perform public.conceder_conquista(new.membro_id, 'streak'); end if;
  if v_streak >= 7 then perform public.conceder_conquista(new.membro_id, 'constancia_7'); end if;
  if v_streak >= 30 then perform public.conceder_conquista(new.membro_id, 'constancia_30'); end if;

  -- dias diferentes com leitura (seguidos ou não)
  select count(distinct (registrado_em at time zone tz)::date) into v_dias_distintos
  from public.registros_leitura where membro_id = new.membro_id;
  if v_dias_distintos >= 30 then perform public.conceder_conquista(new.membro_id, 'dias_30'); end if;
  if v_dias_distintos >= 100 then perform public.conceder_conquista(new.membro_id, 'dias_100'); end if;

  -- páginas somadas em todos os livros
  select coalesce(sum(paginas_lidas), 0) + coalesce(sum(minutos_lidos), 0) / v_ritmo into v_paginas_total
  from public.registros_leitura where membro_id = new.membro_id;
  if v_paginas_total >= 500 then perform public.conceder_conquista(new.membro_id, 'paginas_500'); end if;
  if v_paginas_total >= 1000 then perform public.conceder_conquista(new.membro_id, 'paginas_1000'); end if;

  -- horário (só para registros do próprio dia; lançamentos retroativos não contam)
  if v_dia_reg = v_hoje then
    if v_hora between 4 and 6 then perform public.conceder_conquista(new.membro_id, 'leitura_manha'); end if;
    if v_hora >= 22 then perform public.conceder_conquista(new.membro_id, 'leitura_noite'); end if;
  end if;

  -- sábado e domingo do mesmo fim de semana (dow: 0 = domingo, 6 = sábado)
  if extract(dow from v_dia_reg) = 6 and exists (
       select 1 from public.registros_leitura
       where membro_id = new.membro_id and (registrado_em at time zone tz)::date = v_dia_reg + 1)
     or extract(dow from v_dia_reg) = 0 and exists (
       select 1 from public.registros_leitura
       where membro_id = new.membro_id and (registrado_em at time zone tz)::date = v_dia_reg - 1) then
    perform public.conceder_conquista(new.membro_id, 'fim_de_semana');
  end if;

  -- metas do período atual deste livro
  for v_meta in
    select * from public.metas
    where membro_id = new.membro_id and livro_id = new.livro_id
      and periodo_inicio <= v_hoje and periodo_fim >= v_hoje
      and tipo in ('semanal', 'mensal', 'dias_semanais')
  loop
    if v_meta.tipo = 'dias_semanais' then
      select count(distinct (registrado_em at time zone tz)::date) into v_valor
      from public.registros_leitura
      where membro_id = new.membro_id and livro_id = new.livro_id
        and (registrado_em at time zone tz)::date between v_meta.periodo_inicio and v_meta.periodo_fim;
      if v_meta.valor_dias is not null and v_valor >= v_meta.valor_dias then
        perform public.conceder_conquista(new.membro_id, 'meta_batida', new.livro_id);
      end if;
    else
      select coalesce(sum(paginas_lidas), 0) + coalesce(sum(minutos_lidos), 0) / v_ritmo into v_valor
      from public.registros_leitura
      where membro_id = new.membro_id and livro_id = new.livro_id
        and (registrado_em at time zone tz)::date between v_meta.periodo_inicio and v_meta.periodo_fim;
      if v_meta.valor_paginas is not null and v_valor >= v_meta.valor_paginas then
        perform public.conceder_conquista(new.membro_id, case when v_meta.tipo = 'mensal' then 'meta_mensal' else 'meta_batida' end, new.livro_id);
      end if;
    end if;
  end loop;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ========== Sessão de foco ==========
create or replace function public.verificar_conquistas_pomodoro()
returns trigger as $$
declare
  tz constant text := 'America/Fortaleza';
  v_total integer;
  v_no_dia integer;
  v_meta record;
  v_sessoes integer;
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    select count(*) into v_total from public.sessoes_pomodoro where membro_id = new.membro_id and status = 'concluida';
    if v_total >= 1 then perform public.conceder_conquista(new.membro_id, 'foco_de_verdade'); end if;
    if v_total >= 10 then perform public.conceder_conquista(new.membro_id, 'hora_de_leitura_10'); end if;
    if v_total >= 50 then perform public.conceder_conquista(new.membro_id, 'hora_de_leitura_50'); end if;
    if v_total >= 100 then perform public.conceder_conquista(new.membro_id, 'hora_de_leitura_100'); end if;

    if coalesce(new.duracao_minutos, 0) >= 45 then
      perform public.conceder_conquista(new.membro_id, 'imersao');
    end if;

    select count(*) into v_no_dia from public.sessoes_pomodoro
    where membro_id = new.membro_id and status = 'concluida'
      and (coalesce(fim, inicio) at time zone tz)::date = (coalesce(new.fim, new.inicio) at time zone tz)::date;
    if v_no_dia >= 4 then perform public.conceder_conquista(new.membro_id, 'ciclo_completo'); end if;

    -- meta de sessões na semana
    for v_meta in
      select * from public.metas
      where membro_id = new.membro_id and livro_id = new.livro_id and tipo = 'sessoes_semanais'
        and periodo_inicio <= (now() at time zone tz)::date and periodo_fim >= (now() at time zone tz)::date
    loop
      select count(*) into v_sessoes from public.sessoes_pomodoro
      where membro_id = new.membro_id and livro_id = new.livro_id and status = 'concluida'
        and (coalesce(fim, inicio) at time zone tz)::date between v_meta.periodo_inicio and v_meta.periodo_fim;
      if v_meta.valor_sessoes is not null and v_sessoes >= v_meta.valor_sessoes then
        perform public.conceder_conquista(new.membro_id, 'meta_batida', new.livro_id);
      end if;
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ========== Anotações ==========
create or replace function public.verificar_conquistas_anotacao()
returns trigger as $$
declare
  v_perguntas integer;
  v_trechos integer;
  v_reflexoes integer;
begin
  perform public.conceder_conquista(new.membro_id, 'primeira_anotacao');

  select count(*) filter (where tipo = 'pergunta'), count(*) filter (where tipo = 'trecho'), count(*) filter (where tipo = 'reflexao')
    into v_perguntas, v_trechos, v_reflexoes
  from public.anotacoes where membro_id = new.membro_id;

  if v_perguntas >= 10 then perform public.conceder_conquista(new.membro_id, 'examinador'); end if;
  if v_trechos >= 25 then perform public.conceder_conquista(new.membro_id, 'guardador_trechos'); end if;
  if v_reflexoes >= 10 then perform public.conceder_conquista(new.membro_id, 'reflexivo'); end if;

  if new.compartilhada then
    perform public.conceder_conquista(new.membro_id, 'voz_no_mural');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_conquistas_anotacao on public.anotacoes;
create trigger trg_conquistas_anotacao
  after insert or update of compartilhada, tipo on public.anotacoes
  for each row execute function public.verificar_conquistas_anotacao();
