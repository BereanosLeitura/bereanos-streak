-- Cria automaticamente a linha em perfis quando o ADMIN cria um usuário no
-- painel do Supabase (Authentication > Add user). Antes disso, era preciso
-- rodar um INSERT manual em perfis para cada membro novo — agora o admin só
-- precisa criar o login (e-mail + senha temporária) e o resto já funciona:
-- o membro entra, cai direto na tela "Primeiro acesso" (CompletarPerfil),
-- que preenche nome, nome de exibição e data de nascimento.

create or replace function public.lidar_novo_usuario()
returns trigger as $$
begin
  insert into public.perfis (id, nome_completo, nome_exibicao, role, senha_temporaria)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome_completo', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'nome_exibicao', split_part(new.email, '@', 1)),
    'membro',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_novo_usuario on auth.users;
create trigger trg_novo_usuario
  after insert on auth.users
  for each row execute function public.lidar_novo_usuario();

comment on function public.lidar_novo_usuario() is
  'Cria a linha em perfis no momento em que o admin cria o usuário no painel do Supabase. nome_completo/nome_exibicao começam com o prefixo do e-mail e são sobrescritos pela tela CompletarPerfil no primeiro login.';
