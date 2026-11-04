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
