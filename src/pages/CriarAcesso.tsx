import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { chamarAdmin, mensagemAcesso, mensagemConvite, linkDoConvite } from '../lib/adminMembros'
import { useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import { formatarData } from '../lib/estatisticas'

// O admin dá acesso de dois jeitos. O convite por link é o caminho normal: a
// própria pessoa cria a senha dela, e o link vale uma vez só e tem prazo.
// A senha temporária continua como saída para quem não conseguir abrir o link.
// Quem cria de fato é a Edge Function "admin-membros" (service_role no servidor).

type Modo = 'convite' | 'senha'

interface ConviteAberto {
  id: string
  nome: string
  email: string
  criado_em: string
  expira_em: string
}

export default function CriarAcesso({ onCriado }: { onCriado?: () => void }) {
  const [modo, setModo] = useState<Modo>('convite')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [dias, setDias] = useState(7)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [senhaFeita, setSenhaFeita] = useState<{ nome: string; email: string; senha: string } | null>(null)
  const [conviteFeito, setConviteFeito] = useState<{ nome: string; token: string; expira_em: string } | null>(null)
  const [abertos, setAbertos] = useState<ConviteAberto[] | null>(null)
  const avisar = useAviso()

  async function carregarAbertos() {
    const { data, error } = await supabase.from('convites')
      .select('id, nome, email, criado_em, expira_em')
      .is('usado_em', null).is('revogado_em', null)
      .gt('expira_em', new Date().toISOString())
      .order('criado_em', { ascending: false })
    // sem a tabela (migration ainda não rodada) a seção simplesmente não aparece
    setAbertos(error ? [] : (data ?? []) as ConviteAberto[])
  }
  useEffect(() => { carregarAbertos() }, [])

  const valido = nome.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function enviar() {
    setErro(null)
    setEnviando(true)
    try {
      if (modo === 'convite') {
        const r = await chamarAdmin<{ token: string; expira_em: string }>('convidar', { nome: nome.trim(), email: email.trim(), dias })
        setConviteFeito({ nome: nome.trim(), token: r.token, expira_em: r.expira_em })
        setSenhaFeita(null)
        carregarAbertos()
      } else {
        const r = await chamarAdmin<{ senha: string }>('criar', { nome: nome.trim(), email: email.trim() })
        setSenhaFeita({ nome: nome.trim(), email: email.trim().toLowerCase(), senha: r.senha })
        setConviteFeito(null)
      }
      setNome(''); setEmail('')
      onCriado?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível dar o acesso')
    } finally {
      setEnviando(false)
    }
  }

  async function revogar(c: ConviteAberto) {
    try {
      await chamarAdmin('revogar', { convite_id: c.id })
      avisar(`Convite de ${c.nome.split(/\s+/)[0]} cancelado`)
      carregarAbertos()
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível cancelar', 'erro')
    }
  }

  async function copiar(texto: string, aviso = 'Mensagem copiada') {
    try { await navigator.clipboard.writeText(texto); avisar(aviso) } catch { avisar('Selecione e copie o texto', 'erro') }
  }

  const msgConvite = conviteFeito ? mensagemConvite(conviteFeito.nome, conviteFeito.token, conviteFeito.expira_em) : ''
  const msgSenha = senhaFeita ? mensagemAcesso(senhaFeita.nome, senhaFeita.email, senhaFeita.senha) : ''

  return (
    <div className="px-5 py-6">
      <div className="max-w-md mx-auto space-y-4">
        <p className="legenda">Antes de convidar alguém novo, avise o grupo, como combinado no clube.</p>

        <div className="cartao p-5 space-y-4">
          <div role="group" aria-label="Como dar o acesso" className="grid grid-cols-2 gap-2">
            {([['convite', 'Convite por link'], ['senha', 'Senha temporária']] as [Modo, string][]).map(([v, r]) => (
              <button key={v} onClick={() => { setModo(v); setErro(null) }} aria-pressed={modo === v}
                className={`rounded-xl border py-2.5 text-sm font-medium ${modo === v ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/70 dark:text-bege/60'}`}>
                {r}
              </button>
            ))}
          </div>
          <p className="legenda">
            {modo === 'convite'
              ? 'A pessoa abre o link e escolhe a própria senha. O link vale uma vez só e vence no prazo escolhido.'
              : 'Você manda uma senha temporária e ela troca no primeiro acesso. Use quando o link não for prático.'}
          </p>

          <div>
            <label className="rotulo" htmlFor="novo-nome">Nome do membro</label>
            <input id="novo-nome" value={nome} onChange={(e) => setNome(e.target.value)} className="campo" placeholder="Nome e sobrenome" />
          </div>
          <div>
            <label className="rotulo" htmlFor="novo-email">E-mail que ele vai usar</label>
            <input id="novo-email" type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className="campo" placeholder="email@exemplo.com" />
          </div>

          {modo === 'convite' && (
            <fieldset>
              <legend className="rotulo">O link vale por</legend>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 7].map((d) => (
                  <button key={d} onClick={() => setDias(d)} aria-pressed={dias === d}
                    className={`rounded-xl border py-2 text-sm ${dias === d ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/70 dark:text-bege/60'}`}>
                    {d === 1 ? '1 dia' : `${d} dias`}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {erro && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{erro}</p>}
          <button onClick={enviar} disabled={enviando || !valido} className="botao-primario">
            {enviando ? 'Gerando…' : modo === 'convite' ? 'Gerar convite' : 'Criar acesso'}
          </button>
        </div>

        {conviteFeito && (
          <div className="cartao p-5 space-y-3 border-dourado/50">
            <p className="font-semibold text-marinho dark:text-bege">Convite pronto para {conviteFeito.nome}</p>
            <p className="text-sm text-texto/70 dark:text-bege/70">
              Mande no privado, só para ele. Vale uma vez só e vence em {formatarData(conviteFeito.expira_em, { day: 'numeric', month: 'long' })}.
              O link aparece aqui agora e não dá para vê-lo de novo depois.
            </p>
            <p className="text-sm whitespace-pre-wrap text-texto dark:text-bege bg-marinho/[0.03] dark:bg-bege/[0.04] rounded-lg p-3 select-all">{msgConvite}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => copiar(msgConvite)} className="botao-secundario">Copiar</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(msgConvite)}`} target="_blank" rel="noopener" className="botao-secundario text-center">WhatsApp</a>
            </div>
            <button onClick={() => copiar(linkDoConvite(conviteFeito.token), 'Link copiado')} className="botao-texto">Copiar só o link</button>
          </div>
        )}

        {senhaFeita && (
          <div className="cartao p-5 space-y-3 border-dourado/50">
            <p className="font-semibold text-marinho dark:text-bege">Acesso criado para {senhaFeita.nome}</p>
            <p className="text-sm text-texto/70 dark:text-bege/70">Mande a mensagem abaixo só para ele, no privado. A senha é temporária: no primeiro acesso ele cria a dele.</p>
            <p className="text-sm whitespace-pre-wrap text-texto dark:text-bege bg-marinho/[0.03] dark:bg-bege/[0.04] rounded-lg p-3 select-all">{msgSenha}</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => copiar(msgSenha)} className="botao-secundario">Copiar</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(msgSenha)}`} target="_blank" rel="noopener" className="botao-secundario text-center">WhatsApp</a>
            </div>
          </div>
        )}

        {abertos && abertos.length > 0 && (
          <div className="cartao p-5">
            <h2 className="titulo-secao">Convites em aberto</h2>
            <p className="legenda mt-1 mb-3">Ainda não usados. Saem daqui sozinhos quando a pessoa entra ou quando o prazo vence.</p>
            <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.08]">
              {abertos.map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-marinho dark:text-bege truncate">{c.nome}</p>
                    <p className="text-xs text-texto/65 dark:text-bege/55 truncate">
                      {c.email} · vence em {formatarData(c.expira_em, { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <button onClick={() => revogar(c)} aria-label={`Cancelar o convite de ${c.nome}`}
                    className="p-2 text-texto/40 dark:text-bege/40 hover:text-red-700 dark:hover:text-red-400">
                    <Icone nome="x" className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
