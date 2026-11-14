// Edge Function "admin-membros": ações que exigem a service_role key, que
// nunca fica no app. Só responde a quem é admin no perfil.
//   criar        { email, nome }           -> cria o login com senha temporária
//   nova_senha   { membro_id }             -> gera senha temporária nova
//   suspender    { membro_id }             -> bloqueia o login (dados ficam)
//   reativar     { membro_id }             -> desbloqueia o login
//   convidar     { email, nome, dias }     -> gera um link de convite de uso único
//   revogar      { convite_id }            -> cancela um convite ainda aberto
//
// Duas ações são públicas, porque quem foi convidado ainda não tem login:
//   convite_info { token }                 -> diz se o link vale e para quem é
//   aceitar      { token, senha }          -> cria o login com a senha escolhida
// Elas não dependem de sessão, mas exigem um token válido, de uso único e com
// prazo. A tabela guarda só o hash do token.
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

/** Token do convite: 32 bytes aleatórios em base64url. Só existe em memória e no link. */
function gerarToken(): string {
  const v = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...v)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Guardamos o hash, nunca o token: um vazamento do banco não vira acesso. */
async function hashToken(token: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(b), (n) => n.toString(16).padStart(2, '0')).join('')
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const servico = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const corpoBruto = await req.json().catch(() => ({}))

    // ---- ações públicas do convite (quem foi convidado ainda não tem login) ----
    if (corpoBruto?.acao === 'convite_info' || corpoBruto?.acao === 'aceitar') {
      const token = String(corpoBruto.token ?? '')
      if (token.length < 20) return resposta({ erro: 'Convite inválido' }, 400)
      const { data: convite } = await servico.from('convites')
        .select('id, nome, email, expira_em, usado_em, revogado_em')
        .eq('token_hash', await hashToken(token)).maybeSingle()

      // Mesma resposta para link inexistente, usado, cancelado ou vencido:
      // ninguém descobre nada tentando links no escuro.
      const vale = convite && !convite.usado_em && !convite.revogado_em && new Date(convite.expira_em).getTime() > Date.now()
      if (!vale) return resposta({ erro: 'Este convite não vale mais. Peça um novo ao admin.' }, 400)

      if (corpoBruto.acao === 'convite_info') {
        return resposta({ ok: true, nome: convite!.nome, email: convite!.email })
      }

      const senha = String(corpoBruto.senha ?? '')
      if (senha.length < 8) return resposta({ erro: 'A senha precisa de pelo menos 8 caracteres' }, 400)

      const { data: criado, error: erroCriar } = await servico.auth.admin.createUser({
        email: convite!.email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome_completo: convite!.nome, nome_exibicao: convite!.nome.split(/\s+/)[0] }
      })
      if (erroCriar) {
        const ja = /already|registered|exists/i.test(erroCriar.message)
        return resposta({ erro: ja ? 'Já existe um acesso com esse e-mail. Entre pela tela de login.' : erroCriar.message }, 400)
      }

      // Uso único: queima o convite mesmo que algo falhe daqui para a frente.
      await servico.from('convites').update({ usado_em: new Date().toISOString(), usado_por: criado.user?.id ?? null }).eq('id', convite!.id)
      // A senha é escolhida pela própria pessoa, então não é temporária.
      await servico.from('perfis').update({ senha_temporaria: false }).eq('id', criado.user!.id)
      return resposta({ ok: true, email: convite!.email })
    }

    const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }
    })
    const { data: { user } } = await usuario.auth.getUser()
    if (!user) return resposta({ erro: 'Sessão inválida' }, 401)

    const admin = servico
    const { data: perfil } = await admin.from('perfis').select('role').eq('id', user.id).single()
    if (perfil?.role !== 'admin') return resposta({ erro: 'Somente o admin pode fazer isso' }, 403)

    const corpo = corpoBruto
    const acao = corpo?.acao

    if (acao === 'criar') {
      const email = String(corpo.email ?? '').trim().toLowerCase()
      const nome = String(corpo.nome ?? '').trim()
      if (!EMAIL.test(email)) return resposta({ erro: 'E-mail inválido' }, 400)
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

    if (acao === 'convidar') {
      const email = String(corpo.email ?? '').trim().toLowerCase()
      const nome = String(corpo.nome ?? '').trim()
      const dias = Math.min(14, Math.max(1, Number(corpo.dias) || 7))
      if (!EMAIL.test(email)) return resposta({ erro: 'E-mail inválido' }, 400)
      if (nome.length < 2) return resposta({ erro: 'Informe o nome' }, 400)

      const { data: usuarios } = await admin.auth.admin.listUsers({ perPage: 200 })
      if (usuarios?.users.some((u) => u.email?.toLowerCase() === email)) {
        return resposta({ erro: 'Já existe um acesso com esse e-mail' }, 400)
      }

      // Um convite aberto por e-mail: gerar outro cancela o anterior.
      await admin.from('convites').update({ revogado_em: new Date().toISOString() })
        .eq('email', email).is('usado_em', null).is('revogado_em', null)

      const token = gerarToken()
      const expira = new Date(Date.now() + dias * 86_400_000).toISOString()
      const { data, error } = await admin.from('convites')
        .insert({ token_hash: await hashToken(token), nome, email, criado_por: user.id, expira_em: expira })
        .select('id').single()
      if (error) return resposta({ erro: error.message }, 400)
      return resposta({ ok: true, id: data.id, token, nome, email, expira_em: expira })
    }

    if (acao === 'revogar') {
      const id = String(corpo.convite_id ?? '')
      if (!id) return resposta({ erro: 'Convite não informado' }, 400)
      const { error } = await admin.from('convites').update({ revogado_em: new Date().toISOString() })
        .eq('id', id).is('usado_em', null)
      if (error) return resposta({ erro: error.message }, 400)
      return resposta({ ok: true })
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
