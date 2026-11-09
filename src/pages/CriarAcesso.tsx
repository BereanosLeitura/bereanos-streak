import { useState } from 'react'
import { chamarAdmin, mensagemAcesso } from '../lib/adminMembros'
import { useAviso } from '../components/Toast'

// O admin cria o acesso direto pelo app. Quem cria de fato é a Edge Function
// "admin-membros" no Supabase (com a service_role key, que nunca fica no app).

export default function CriarAcesso({ onCriado }: { onCriado?: () => void }) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ nome: string; email: string; senha: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const avisar = useAviso()

  async function criar() {
    setErro(null)
    setEnviando(true)
    try {
      const r = await chamarAdmin<{ senha: string }>('criar', { nome: nome.trim(), email: email.trim() })
      setResultado({ nome: nome.trim(), email: email.trim().toLowerCase(), senha: r.senha })
      setNome(''); setEmail('')
      onCriado?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar o acesso')
    } finally {
      setEnviando(false)
    }
  }

  async function copiar(texto: string) {
    try { await navigator.clipboard.writeText(texto); avisar('Mensagem copiada') } catch { avisar('Selecione e copie o texto', 'erro') }
  }

  const msg = resultado ? mensagemAcesso(resultado.nome, resultado.email, resultado.senha) : ''

  return (
    <div className="px-5 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <p className="legenda">Antes de convidar alguém novo, avise o grupo, como combinado no clube.</p>
        <div className="cartao p-5 space-y-4">
          <div>
            <label className="rotulo" htmlFor="novo-nome">Nome do membro</label>
            <input id="novo-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="campo" placeholder="Nome e sobrenome" />
          </div>
          <div>
            <label className="rotulo" htmlFor="novo-email">E-mail que ele vai usar</label>
            <input id="novo-email" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className="campo" placeholder="email@exemplo.com" />
          </div>
          {erro && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{erro}</p>}
          <button onClick={criar} disabled={enviando || nome.trim().length < 2 || !email.includes('@')} className="botao-primario">
            {enviando ? 'Criando…' : 'Criar acesso'}
          </button>
        </div>

        {resultado && (
          <div className="cartao p-5 space-y-3 border-dourado/50">
            <p className="font-semibold text-marinho dark:text-bege">Acesso criado para {resultado.nome}</p>
            <p className="text-sm text-texto/70 dark:text-bege/70">Mande a mensagem abaixo só para ele, no privado. A senha é temporária: no primeiro acesso ele cria a dele.</p>
            <p className="text-sm whitespace-pre-wrap text-texto dark:text-bege bg-marinho/[0.03] dark:bg-bege/[0.04] rounded-lg p-3 select-all">{msg}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => copiar(msg)} className="botao-secundario">Copiar</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener" className="botao-secundario text-center">WhatsApp</a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
