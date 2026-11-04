-- 0014: ajustes de segurança antes do lançamento.

-- 1) Funções internas não podem ser chamadas direto pelo app.
-- conceder_conquista é security definer: qualquer pessoa logada conseguiria
-- dar conquista a qualquer membro chamando a função. Os gatilhos continuam
-- funcionando, porque rodam com a permissão do dono.
revoke execute on function public.conceder_conquista(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.verificar_conquistas_registro() from public, anon, authenticated;
revoke execute on function public.verificar_conquistas_pomodoro() from public, anon, authenticated;
revoke execute on function public.verificar_conquistas_anotacao() from public, anon, authenticated;
revoke execute on function public.lidar_novo_usuario() from public, anon, authenticated;
revoke execute on function public.proteger_role() from public, anon, authenticated;

-- 2) Limites nos números da leitura (evita registro com valor absurdo ou
-- negativo distorcer o progresso do grupo). "not valid" = vale para os
-- registros novos sem travar por causa de algum antigo.
alter table public.registros_leitura drop constraint if exists registros_paginas_validas;
alter table public.registros_leitura
  add constraint registros_paginas_validas check (paginas_lidas is null or paginas_lidas between 1 and 3000) not valid;
alter table public.registros_leitura drop constraint if exists registros_minutos_validos;
alter table public.registros_leitura
  add constraint registros_minutos_validos check (minutos_lidos is null or minutos_lidos between 1 and 1440) not valid;
alter table public.sessoes_pomodoro drop constraint if exists sessoes_duracao_valida;
alter table public.sessoes_pomodoro
  add constraint sessoes_duracao_valida check (duracao_minutos is null or duracao_minutos between 0 and 1440) not valid;

-- 3) Conferência: contas existentes (para ver se entrou alguém de fora
-- enquanto o cadastro público estava aberto).
select u.email, u.created_at, u.last_sign_in_at, p.nome_exibicao, p.role
from auth.users u left join public.perfis p on p.id = u.id
order by u.created_at;
