import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, type Perfil } from '../lib/supabase'
import { useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import Avatar from '../components/Avatar'
import { baixarIcs, linkGoogleAgenda } from '../lib/agenda'
import type { LivroAtivo } from './Inicio'
import { ROTEIRO_PADRAO, type Bloco } from '../lib/roteiro'

// Modo Encontro: o roteiro de cerca de 2h30, as perguntas do mural, a presença
// Admin e o anotador do dia editam; todos podem acompanhar.

interface EncontroRow {
  id: string; livro_id: string; data: string; local: string | null; mediador: string | null
  anotador_id: string | null; roteiro: Bloco[]; perguntas_discutidas: string[]; ata: string | null
}
interface Pergunta { id: string; texto: string; pagina: number | null; perfis: { nome_exibicao: string } | null }
interface Membro { id: string; nome_exibicao: string }


interface Props {
  perfil: Perfil
  livro: LivroAtivo
  onVoltar: () => void
  rotuloVoltar?: string
}

export default function Encontro({ perfil, livro, onVoltar, rotuloVoltar = 'Voltar' }: Props) {
  const [enc, setEnc] = useState<EncontroRow | null | undefined>(undefined)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [membros, setMembros] = useState<Membro[]>([])
  const [presentes, setPresentes] = useState<Set<string>>(new Set())
  const avisar = useAviso()
  const admin = perfil.role === 'admin'

  async function carregar() {
    const [e, p, m] = await Promise.all([
      supabase.from('encontros').select('*').eq('livro_id', livro.id).order('data', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('anotacoes').select('id, texto, pagina, perfis(nome_exibicao)').eq('livro_id', livro.id).eq('compartilhada', true).eq('tipo', 'pergunta').order('pagina', { ascending: true, nullsFirst: false }),
      supabase.from('perfis').select('id, nome_exibicao').order('nome_exibicao')
    ])
    let row = (e.data ?? null) as EncontroRow | null
    // data removida no Painel: um encontro futuro deixa de valer
    if (row && !livro.encontro_em && new Date(row.data).getTime() > Date.now()) row = null
    // o encontro nasce sozinho quando o admin já definiu a data no Painel
    if (!row && admin && livro.encontro_em) {
      const { data } = await supabase.from('encontros').insert({
        livro_id: livro.id, data: livro.encontro_em, local: livro.encontro_local ?? null, roteiro: ROTEIRO_PADRAO, created_by: perfil.id
      }).select('*').single()
      row = (data ?? null) as EncontroRow | null
    }
    setEnc(row)
    setPerguntas((p.data ?? []) as unknown as Pergunta[])
    setMembros((m.data ?? []) as Membro[])
    if (row) {
      const { data } = await supabase.from('presencas').select('membro_id').eq('encontro_id', row.id)
      setPresentes(new Set((data ?? []).map((x) => x.membro_id)))
    }
  }
  useEffect(() => { carregar() }, [livro.id])

  const podeEditar = !!enc && (admin || enc.anotador_id === perfil.id)

  async function atualizar(campos: Partial<EncontroRow>, msg?: string) {
    if (!enc) return
    setEnc({ ...enc, ...campos })
    const { error } = await supabase.from('encontros').update({ ...campos, updated_at: new Date().toISOString() }).eq('id', enc.id)
    if (error) { avisar('Não foi possível salvar', 'erro'); carregar() } else if (msg) avisar(msg)
  }


  async function alternarPresenca(id: string) {
    if (!enc || !podeEditar) return
    const tem = presentes.has(id)
    setPresentes((s) => { const n = new Set(s); if (tem) n.delete(id); else n.add(id); return n })
    const { error } = tem
      ? await supabase.from('presencas').delete().eq('encontro_id', enc.id).eq('membro_id', id)
      : await supabase.from('presencas').insert({ encontro_id: enc.id, membro_id: id })
    if (error) { avisar('Não foi possível marcar a presença', 'erro'); carregar() }
  }

  function alternarPergunta(id: string) {
    if (!enc || !podeEditar) return
    const l = enc.perguntas_discutidas.includes(id) ? enc.perguntas_discutidas.filter((x) => x !== id) : [...enc.perguntas_discutidas, id]
    atualizar({ perguntas_discutidas: l })
  }

  if (enc === undefined) {
    return <div className="min-h-screen px-5 pt-6 max-w-md mx-auto space-y-4"><div className="esqueleto h-8 w-24" /><div className="esqueleto h-40" /></div>
  }

  return (
    <div className="min-h-screen px-5 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1">
          <Icone nome="seta-esquerda" className="w-4 h-4" /> {rotuloVoltar}
        </button>
        <p className="text-sm font-semibold text-dourado-escuro dark:text-dourado mt-4">Encontro do clube</p>
        <h1 className="font-serif text-[28px] leading-tight text-marinho dark:text-bege">{livro.titulo}</h1>

        {!enc && !livro.encontro_em && (
          <p className="cartao p-5 mt-5 legenda">
            {admin
              ? 'Defina a data do encontro em Painel do admin, Livro do ciclo, Próximo encontro. Depois disso esta tela libera mediação e presença.'
              : 'A data do encontro ainda não foi definida. Enquanto isso, deixe suas perguntas no mural: elas entram aqui.'}
          </p>
        )}
        {!enc && livro.encontro_em && new Date(livro.encontro_em).getTime() > Date.now() && (() => {
          const ev = { titulo: `Encontro Bereanos: ${livro.titulo}`, local: livro.encontro_local ?? undefined, descricao: 'Encontro do Clube do Livro Bereanos.', inicio: new Date(livro.encontro_em), duracaoMin: 90 }
          return (
            <div className="cartao p-5 mt-4">
              <p className="text-[15px] text-marinho dark:text-bege first-letter:uppercase">{new Date(livro.encontro_em).toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}{livro.encontro_local ? `, ${livro.encontro_local}` : ''}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <a href={linkGoogleAgenda(ev)} target="_blank" rel="noopener" className="botao-secundario text-center text-sm">Google Agenda</a>
                <button onClick={() => baixarIcs(ev, 'encontro-bereanos.ics')} className="botao-secundario text-sm">iPhone / outro</button>
              </div>
            </div>
          )
        })()}

        {!enc && (
          <>
            <Roteiro blocos={ROTEIRO_PADRAO} podeEditar={false} onSalvar={() => {}} />
            <section className="cartao p-5 mt-4">
              <h2 className="titulo-secao">Perguntas do mural</h2>
              {perguntas.length === 0
                ? <p className="legenda mt-2">Nenhuma pergunta ainda. As perguntas que o grupo puser no mural aparecem aqui para o encontro.</p>
                : <ul className="mt-3 space-y-2">{perguntas.map((p) => (
                    <li key={p.id} className="rounded-xl p-3 bg-marinho/[0.03] dark:bg-bege/[0.04]">
                      <span className="block text-[15px] text-marinho dark:text-bege">{p.texto}</span>
                      <span className="block text-xs text-texto/45 dark:text-bege/45 mt-0.5">{p.perfis?.nome_exibicao ?? 'Membro'}{p.pagina ? `, p. ${p.pagina}` : ''}</span>
                    </li>
                  ))}</ul>}
            </section>
          </>
        )}

        {enc && (
          <>
            <section className="cartao p-5 mt-5">
              <p className="font-serif text-xl text-marinho dark:text-bege first-letter:uppercase">
                {new Date(enc.data).toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
              {enc.local && <p className="legenda mt-0.5">{enc.local}</p>}
              <dl className="grid grid-cols-2 gap-3 mt-4 text-sm">
                <div><dt className="text-xs text-texto/50 dark:text-bege/50">Mediação</dt><dd className="text-marinho dark:text-bege">{enc.mediador || 'a definir'}</dd></div>
                <div><dt className="text-xs text-texto/50 dark:text-bege/50">Anotação</dt><dd className="text-marinho dark:text-bege">{membros.find((m) => m.id === enc.anotador_id)?.nome_exibicao ?? 'a definir'}</dd></div>
              </dl>
              {(() => {
                const ev = { titulo: `Encontro Bereanos: ${livro.titulo}`, local: enc.local ?? undefined, descricao: 'Encontro do Clube do Livro Bereanos.', inicio: new Date(enc.data), duracaoMin: 90 }
                return new Date(enc.data).getTime() > Date.now() ? (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <a href={linkGoogleAgenda(ev)} target="_blank" rel="noopener" className="botao-secundario text-center text-sm">Google Agenda</a>
                    <button onClick={() => baixarIcs(ev, 'encontro-bereanos.ics')} className="botao-secundario text-sm">iPhone / outro</button>
                  </div>
                ) : null
              })()}
              {admin && <EditarCabecalho enc={enc} membros={membros} onSalvar={(c) => atualizar(c, 'Encontro atualizado')} />}
            </section>

            <Roteiro blocos={enc.roteiro.length ? enc.roteiro : ROTEIRO_PADRAO} podeEditar={podeEditar} onSalvar={(r) => atualizar({ roteiro: r }, 'Roteiro salvo')} />

            <section className="cartao p-5 mt-4">
              <div className="flex items-baseline justify-between">
                <h2 className="titulo-secao">Perguntas do mural</h2>
                <span className="legenda">{enc.perguntas_discutidas.filter((id) => perguntas.some((p) => p.id === id)).length} de {perguntas.length}</span>
              </div>
              {perguntas.length === 0 && <p className="legenda mt-2">Nenhuma pergunta no mural ainda.</p>}
              <ul className="mt-3 space-y-2">
                {perguntas.map((p) => {
                  const feita = enc.perguntas_discutidas.includes(p.id)
                  return (
                    <li key={p.id}>
                      <button onClick={() => alternarPergunta(p.id)} disabled={!podeEditar} className={`w-full text-left flex gap-3 rounded-xl p-3 ${feita ? 'bg-dourado/10' : 'bg-marinho/[0.03] dark:bg-bege/[0.04]'}`}>
                        <span className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${feita ? 'bg-dourado border-dourado text-marinho' : 'border-marinho/25 dark:border-bege/30'}`}>
                          {feita && <Icone nome="check" className="w-3.5 h-3.5" />}
                        </span>
                        <span className="flex-1">
                          <span className={`block text-[15px] ${feita ? 'text-texto/55 dark:text-bege/55' : 'text-marinho dark:text-bege'}`}>{p.texto}</span>
                          <span className="block text-xs text-texto/45 dark:text-bege/45 mt-0.5">{p.perfis?.nome_exibicao ?? 'Membro'}{p.pagina ? `, p. ${p.pagina}` : ''}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="cartao p-5 mt-4">
              <div className="flex items-baseline justify-between">
                <h2 className="titulo-secao">Presença</h2>
                <span className="legenda">{presentes.size} {presentes.size === 1 ? 'pessoa' : 'pessoas'}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {membros.map((m) => {
                  const ok = presentes.has(m.id)
                  return (
                    <button key={m.id} onClick={() => alternarPresenca(m.id)} disabled={!podeEditar} aria-pressed={ok}
                      className={`flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 text-sm ${ok ? 'border-dourado bg-dourado/10 text-marinho dark:text-bege' : 'border-marinho/15 dark:border-bege/15 text-texto/55 dark:text-bege/55'}`}>
                      <Avatar nome={m.nome_exibicao} tamanho={24} destaque={ok} />{m.nome_exibicao}
                    </button>
                  )
                })}
              </div>
              {!podeEditar && <p className="legenda mt-3">Quem marca a presença é o anotador do encontro.</p>}
            </section>

          </>
        )}
      </div>
    </div>
  )
}

function EditarCabecalho({ enc, membros, onSalvar }: { enc: EncontroRow; membros: Membro[]; onSalvar: (c: Partial<EncontroRow>) => void }) {
  const [aberto, setAberto] = useState(false)
  const [data, setData] = useState(paraCampo(enc.data))
  const [local, setLocal] = useState(enc.local ?? '')
  const [mediador, setMediador] = useState(enc.mediador ?? '')
  const [anotador, setAnotador] = useState(enc.anotador_id ?? '')
  if (!aberto) return <button onClick={() => setAberto(true)} className="botao-texto mt-4">Editar data, mediação e anotação</button>
  return (
    <div className="mt-4 pt-4 border-t border-marinho/[0.07] dark:border-bege/[0.08] space-y-3">
      <input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} className="campo" aria-label="Data e hora" />
      <input value={local} maxLength={120} onChange={(e) => setLocal(e.target.value)} placeholder="Local" className="campo" aria-label="Local" />
      <input value={mediador} maxLength={80} onChange={(e) => setMediador(e.target.value)} placeholder="Quem media" className="campo" aria-label="Quem media" />
      <select value={anotador} onChange={(e) => setAnotador(e.target.value)} className="campo" aria-label="Quem anota">
        <option value="">A definir</option>
        {membros.map((m) => <option key={m.id} value={m.id}>{m.nome_exibicao}</option>)}
      </select>
      <div className="flex gap-2">
        <button onClick={async () => {
          const iso = data ? new Date(data).toISOString() : enc.data
          onSalvar({ data: iso, local: local.trim() || null, mediador: mediador.trim() || null, anotador_id: anotador || null })
          await supabase.from('livros').update({ encontro_em: iso, encontro_local: local.trim() || null }).eq('id', enc.livro_id)
          setAberto(false)
        }} className="botao-primario">Salvar</button>
        <button onClick={() => setAberto(false)} className="botao-secundario">Cancelar</button>
      </div>
    </div>
  )
}

function Roteiro({ blocos, podeEditar, onSalvar }: { blocos: Bloco[]; podeEditar: boolean; onSalvar: (b: Bloco[]) => void }) {
  const [lista, setLista] = useState<Bloco[]>(blocos)
  const [editando, setEditando] = useState(false)
  const [atual, setAtual] = useState<number | null>(null)
  const [inicioBloco, setInicioBloco] = useState<number | null>(null)
  const [, setTique] = useState(0)
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => { setLista(blocos) }, [JSON.stringify(blocos)])
  useEffect(() => () => { if (intervalo.current) clearInterval(intervalo.current) }, [])

  const total = useMemo(() => lista.reduce((a, b) => a + b.minutos, 0), [lista])

  function iniciar(i: number) {
    setAtual(i)
    setInicioBloco(Date.now())
    if (intervalo.current) clearInterval(intervalo.current)
    intervalo.current = setInterval(() => setTique((t) => t + 1), 1000)
  }
  function parar() {
    setAtual(null); setInicioBloco(null)
    if (intervalo.current) clearInterval(intervalo.current)
  }

  const restante = atual !== null && inicioBloco ? lista[atual].minutos * 60 - Math.floor((Date.now() - inicioBloco) / 1000) : 0
  const mmss = (seg: number) => `${seg < 0 ? '+' : ''}${Math.floor(Math.abs(seg) / 60)}:${String(Math.abs(seg) % 60).padStart(2, '0')}`

  return (
    <section className="cartao p-5 mt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="titulo-secao">Roteiro</h2>
        <span className="legenda">{Math.floor(total / 60)}h{String(total % 60).padStart(2, '0')}</span>
      </div>
      {atual !== null && (
        <div className="rounded-2xl bg-marinho text-bege dark:bg-noite p-4 mt-3 text-center">
          <p className="text-sm text-dourado">{lista[atual].titulo}</p>
          <p className={`font-serif tabular text-5xl mt-1 ${restante < 0 ? 'text-red-300' : ''}`}>{mmss(restante)}</p>
          <p className="text-xs text-bege/60 mt-1">{restante < 0 ? 'passou do tempo previsto' : 'restantes neste bloco'}</p>
          <div className="flex gap-2 mt-3 justify-center">
            {atual < lista.length - 1 && <button onClick={() => iniciar(atual + 1)} className="rounded-lg bg-dourado text-marinho px-4 py-2 text-sm font-semibold">Próximo bloco</button>}
            <button onClick={parar} className="rounded-lg border border-bege/30 px-4 py-2 text-sm">Encerrar</button>
          </div>
        </div>
      )}
      <ol className="mt-3 space-y-1.5">
        {lista.map((b, i) => (
          <li key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${atual === i ? 'bg-dourado/10' : ''}`}>
            <span className="w-5 text-xs text-texto/45 dark:text-bege/45 tabular">{i + 1}.</span>
            {editando ? (
              <>
                <input value={b.titulo} onChange={(e) => setLista((l) => l.map((x, k) => (k === i ? { ...x, titulo: e.target.value } : x)))} className="campo py-1.5 text-sm flex-1" aria-label="Nome do bloco" />
                <input type="number" min={1} max={120} value={b.minutos} onChange={(e) => setLista((l) => l.map((x, k) => (k === i ? { ...x, minutos: Math.max(1, Math.min(120, Number(e.target.value) || 1)) } : x)))} className="campo py-1.5 text-sm w-16 text-center" aria-label="Minutos" />
              </>
            ) : (
              <>
                <span className="flex-1 min-w-0 text-[15px] leading-snug text-marinho dark:text-bege">{b.titulo}</span>
                <span className="text-sm tabular whitespace-nowrap text-texto/55 dark:text-bege/55">{b.minutos} min</span>
                {atual === null && <button onClick={() => iniciar(i)} aria-label={`Iniciar ${b.titulo}`} className="text-xs font-semibold text-dourado-escuro dark:text-dourado px-1">Iniciar</button>}
              </>
            )}
          </li>
        ))}
      </ol>
      {podeEditar && (
        editando ? (
          <div className="flex gap-2 mt-3">
            <button onClick={() => { onSalvar(lista); setEditando(false) }} className="botao-primario">Salvar roteiro</button>
            <button onClick={() => { setLista(blocos); setEditando(false) }} className="botao-secundario">Cancelar</button>
          </div>
        ) : <button onClick={() => setEditando(true)} className="botao-texto mt-3">Ajustar blocos e tempos</button>
      )}
      <p className="legenda mt-3">Quem não terminou o livro participa normalmente. O roteiro é um guia, não um relógio.</p>
    </section>
  )
}

function paraCampo(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
