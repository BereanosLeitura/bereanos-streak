import { supabase } from './supabase'

// Chama a Edge Function "admin-membros" (Supabase). Ela usa a service_role
// key no servidor; o app só manda o pedido com a sessão do admin.
export async function chamarAdmin<T = Record<string, unknown>>(acao: string, dados: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-membros', { body: { acao, ...dados } })
  if (error) {
    let msg = 'Não foi possível falar com o servidor. Verifique a conexão.'
    try {
      const corpo = await (error as { context?: Response }).context?.json()
      if (corpo?.erro) msg = corpo.erro
    } catch { /* resposta sem corpo */ }
    if (/not found|404/i.test(String(error.message)) ) msg = 'A função de membros ainda não foi publicada no Supabase.'
    throw new Error(msg)
  }
  if (data?.erro) throw new Error(data.erro)
  return data as T
}

export function mensagemAcesso(nome: string, email: string, senha: string, nova = false): string {
  const quem = nome.trim().split(/\s+/)[0] || 'tudo bem'
  const link = typeof window !== 'undefined' ? window.location.origin : ''
  return nova
    ? `Oi, ${quem}! Gerei uma senha nova para você entrar no app de leitura dos Bereanos.\n\n${link}\nE-mail: ${email}\nSenha temporária: ${senha}\n\nAo entrar, o app pede para você criar sua própria senha.`
    : `Oi, ${quem}! Seu acesso ao app de leitura dos Bereanos está pronto.\n\n${link}\nE-mail: ${email}\nSenha temporária: ${senha}\n\nNo primeiro acesso você cria sua própria senha e completa seu perfil. Dá para instalar no celular pelo próprio app. Qualquer dúvida, me chama.`
}

// ---------- convite por link ----------

/** Link que o admin manda no privado. O token só existe aqui e no WhatsApp dele. */
export function linkDoConvite(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/?convite=${encodeURIComponent(token)}`
}

export function mensagemConvite(nome: string, token: string, expiraEm: string): string {
  const quem = nome.trim().split(/\s+/)[0] || 'tudo bem'
  const prazo = new Date(expiraEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  return `Oi, ${quem}! Seu convite para o app de leitura dos Bereanos está pronto.\n\n${linkDoConvite(token)}\n\nÉ só abrir o link e criar sua senha. Ele vale até ${prazo} e funciona uma vez só, então não repasse para ninguém.\n\nDepois dá para instalar no celular pelo próprio app. Qualquer dúvida, me chama.`
}

/**
 * Chamadas do convite que acontecem antes de existir login. Vão direto na Edge
 * Function com a chave pública do app; quem autoriza é o token do link.
 */
export async function chamarConvite<T = Record<string, unknown>>(acao: 'convite_info' | 'aceitar', dados: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-membros', { body: { acao, ...dados } })
  if (error) {
    let msg = 'Não foi possível falar com o servidor. Verifique a conexão.'
    try {
      const corpo = await (error as { context?: Response }).context?.json()
      if (corpo?.erro) msg = corpo.erro
    } catch { /* resposta sem corpo */ }
    throw new Error(msg)
  }
  if (data?.erro) throw new Error(data.erro)
  return data as T
}

/** Token do convite na barra de endereço, se houver. */
export function tokenDaUrl(): string | null {
  try {
    const t = new URLSearchParams(window.location.search).get('convite')
    return t && t.length >= 20 ? t : null
  } catch { return null }
}

/** Tira o token do endereço depois de usado, para não ficar no histórico. */
export function limparTokenDaUrl() {
  try {
    const u = new URL(window.location.href)
    u.searchParams.delete('convite')
    window.history.replaceState({}, '', u.pathname + (u.search || '') + u.hash)
  } catch { /* ok */ }
}
