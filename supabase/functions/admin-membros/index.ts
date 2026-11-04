// Edge Function "admin-membros": ações que exigem a service_role key, que
// nunca fica no app. Só responde a quem é admin no perfil.
//   criar        { email, nome }           -> cria o login com senha temporária
//   nova_senha   { membro_id }             -> gera senha temporária nova
//   suspender    { membro_id }             -> bloqueia o login (dados ficam)
//   reativar     { membro_id }             -> desbloqueia o login
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
function gerarSenha(): string {
  const v = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(v, (n) => ALFABETO[n % ALFABETO.length]).join('')
}

function resposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })
    const { data: { user } } = await usuario.auth.getUser()
    if (!user) return resposta({ erro: 'Sessão inválida' }, 401)

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: perfil } = await admin.from('perfis').select('role').eq('id', user.id).single()
    if (perfil?.role !== 'admin') return resposta({ erro: 'Somente o admin pode fazer isso' }, 403)

    const corpo = await req.json()
    const acao = corpo?.acao

    if (acao === 'criar') {
      const email = String(corpo.email ?? '').trim().toLowerCase()
      const nome = String(corpo.nome ?? '').trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resposta({ erro: 'E-mail inválido' }, 400)
      if (nome.length < 2) return resposta({ erro: 'Informe o nome' }, 400)
      const senha = gerarSenha()
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome_completo: nome, nome_exibicao: nome.split(/\s+/)[0] }
      })
      if (error) {
        const ja = /already|registered|exists/i.test(error.message)
        return resposta({ erro: ja ? 'Já existe um acesso com esse e-mail' : error.message }, 400)
      }
      return resposta({ ok: true, id: data.user?.id, senha })
    }

    if (acao === 'status') {
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })
      if (error) return resposta({ erro: error.message }, 400)
      const agora = Date.now()
      return resposta({
        ok: true,
        membros: data.users.map((u) => ({
          id: u.id,
          email: u.email,
          ultimo_acesso: u.last_sign_in_at,
          suspenso: !!(u as { banned_until?: string }).banned_until && new Date((u as { banned_until?: string }).banned_until!).getTime() > agora
        }))
      })
    }

    const membroId = String(corpo.membro_id ?? '')
    if (!membroId) return resposta({ erro: 'Membro não informado' }, 400)
    if (membroId === user.id && acao === 'suspender') return resposta({ erro: 'Você não pode suspender o próprio acesso' }, 400)

    if (acao === 'nova_senha') {
      const senha = gerarSenha()
      const { error } = await admin.auth.admin.updateUserById(membroId, { password: senha })
      if (error) return resposta({ erro: error.message }, 400)
      await admin.from('perfis').update({ senha_temporaria: true }).eq('id', membroId)
      return resposta({ ok: true, senha })
    }
    if (acao === 'suspender' || acao === 'reativar') {
      const { error } = await admin.auth.admin.updateUserById(membroId, { ban_duration: acao === 'suspender' ? '876000h' : 'none' })
      if (error) return resposta({ erro: error.message }, 400)
      return resposta({ ok: true })
    }
    return resposta({ erro: 'Ação desconhecida' }, 400)
  } catch (e) {
    return resposta({ erro: e instanceof Error ? e.message : 'Erro inesperado' }, 500)
  }
})
