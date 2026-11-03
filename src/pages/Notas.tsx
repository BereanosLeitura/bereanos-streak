import { useEffect, useMemo, useState } from 'react'
import { supabase, type Perfil } from '../lib/supabase'
import { useAviso } from '../components/Toast'
import Icone, { type NomeIcone } from '../components/Icone'
import Avatar from '../components/Avatar'
import { tempoRelativo } from '../lib/estatisticas'
import type { LivroAtivo } from './Inicio'

// Anotações de leitura: trecho marcado, reflexão ou pergunta para o encontro.
// Privadas por padrão; o membro decide o que vai para o mural do grupo.

type Tipo = 'trecho' | 'reflexao' | 'pergunta'
type Vista = 'minhas' | 'mural'
type Ordem = 'recentes' | 'pagina'

interface Nota {
  id: string
  membro_id: string
  tipo: Tipo
  texto: string
  pagina: number | null
  compartilhada: boolean
  favorita: boolean
  created_at: string
  nome: string
}

const TIPOS: Record<Tipo, { rotulo: string; plural: string; icone: NomeIcone; dica: string }> = {
  trecho: { rotulo: 'Trecho', plural: 'Trechos', icone: 'aspas', dica: 'Copie a frase do livro exatamente como está.' },
  reflexao: { rotulo: 'Reflexão', plural: 'Reflexões', icone: 'lampada', dica: 'O que isso te fez pensar? Onde concorda ou discorda?' },
  pergunta: { rotulo: 'Pergunta', plural: 'Perguntas', icone: 'interrogacao', dica: 'Uma dúvida para examinar nas Escrituras ou levar ao encontro.' }
}

export interface FiltroInicialNotas {
  vista: Vista
  filtro: Tipo | 'todas'
}

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  inicial?: FiltroInicialNotas | null
  onCompartilhar: (n: { tipo: Tipo; texto: string; pagina: number | null; autor: string }) => void
}

export default function Notas({ perfil, livro, inicial, onCompartilhar }: Props) {
  const [vista, setVista] = useState<Vista>(inicial?.vista ?? 'minhas')
  const [notas, setNotas] = useState<Nota[] | null>(null)
  const [filtro, setFiltro] = useState<Tipo | 'todas' | 'favoritas'>(inicial?.filtro ?? 'todas')
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [editor, setEditor] = useState<{ id: string | null } | null>(null) // null = fechado; id null = nova
  const [tipo, setTipo] = useState<Tipo>('trecho')
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState('')
  const [noMural, setNoMural] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroTabela, setErroTabela] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const avisar = useAviso()

  useEffect(() => { carregar() }, [livro.id, vista])

  async function carregar() {
    setNotas(null)
    let q = supabase
      .from('anotacoes')
      .select('id, membro_id, tipo, texto, pagina, compartilhada, favorita, created_at, perfis(nome_exibicao)')
      .eq('livro_id', livro.id)
      .order('created_at', { ascending: false })
    q = vista === 'minhas' ? q.eq('membro_id', perfil.id) : q.eq('compartilhada', true)
    const { data, error } = await q
    if (error) {
      setErroTabela(true)
      setNotas([])
      return
    }
    setErroTabela(false)
    setNotas((data ?? []).map((n: any) => ({ ...n, nome: n.perfis?.nome_exibicao ?? 'Membro' })))
  }

  function abrirNova() {
    setEditor({ id: null })
    setTipo('trecho')
    setTexto('')
    setPagina('')
    setNoMural(false)
  }

  function abrirEdicao(n: Nota) {
    setEditor({ id: n.id })
    setTipo(n.tipo)
    setTexto(n.texto)
    setPagina(n.pagina ? String(n.pagina) : '')
    setNoMural(n.compartilhada)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar() {
    if (!texto.trim() || !editor) return
    setSalvando(true)
    const campos = { tipo, texto: texto.trim(), pagina: pagina ? parseInt(pagina, 10) : null, compartilhada: noMural }
    const { error } = editor.id
      ? await supabase.from('anotacoes').update(campos).eq('id', editor.id)
      : await supabase.from('anotacoes').insert({ ...campos, membro_id: perfil.id, livro_id: livro.id })
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar a anotação', 'erro')
    avisar(editor.id ? 'Anotação atualizada' : noMural ? 'Anotação salva e posta no mural' : 'Anotação salva')
    setEditor(null)
    carregar()
  }

  async function atualizar(n: Nota, campos: Partial<Nota>, msg: string) {
    setNotas((lista) => lista?.map((x) => (x.id === n.id ? { ...x, ...campos } : x)) ?? null)
    const { error } = await supabase.from('anotacoes').update(campos).eq('id', n.id)
    if (error) {
      avisar('Não foi possível alterar', 'erro')
      carregar()
    } else if (msg) avisar(msg)
  }

  async function excluir(n: Nota) {
    setConfirmando(null)
    const { error } = await supabase.from('anotacoes').delete().eq('id', n.id)
    if (error) return avisar('Não foi possível apagar', 'erro')
    avisar('Anotação apagada')
    carregar()
  }

  async function copiarParaEncontro() {
    const minhas = (notas ?? []).filter((n) => n.membro_id === perfil.id)
    if (minhas.length === 0) return avisar('Você ainda não tem anotações neste livro', 'erro')
    const porTipo = (t: Tipo) => minhas.filter((n) => n.tipo === t).sort((a, b) => (a.pagina ?? 9999) - (b.pagina ?? 9999))
    const linha = (n: Nota) => `${n.pagina ? `(p. ${n.pagina}) ` : ''}${n.tipo === 'trecho' ? `“${n.texto}”` : n.texto}`
    const partes = [`${livro.titulo}${livro.autor ? `, ${livro.autor}` : ''}`, `Anotações de ${perfil.nome_exibicao}`]
    ;(['pergunta', 'trecho', 'reflexao'] as Tipo[]).forEach((t) => {
      const l = porTipo(t)
      if (l.length) partes.push('', `${TIPOS[t].plural}:`, ...l.map((n) => `- ${linha(n)}`))
    })
    try {
      await navigator.clipboard.writeText(partes.join('\n'))
      avisar('Anotações copiadas. Cole no WhatsApp ou no bloco de notas.')
    } catch {
      avisar('Não foi possível copiar', 'erro')
    }
  }

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let l = (notas ?? []).filter((n) =>
      (filtro === 'todas' || (filtro === 'favoritas' ? n.favorita : n.tipo === filtro)) &&
      (!termo || n.texto.toLowerCase().includes(termo) || (vista === 'mural' && n.nome.toLowerCase().includes(termo)))
    )
    if (ordem === 'pagina') l = [...l].sort((a, b) => (a.pagina ?? 99999) - (b.pagina ?? 99999))
    return l
  }, [notas, filtro, busca, ordem, vista])

  const contagem = useMemo(() => {
    const c = { trecho: 0, reflexao: 0, pergunta: 0 }
    for (const n of notas ?? []) c[n.tipo]++
    return c
  }, [notas])

  const filtros: (Tipo | 'todas' | 'favoritas')[] = vista === 'minhas'
    ? ['todas', 'favoritas', 'trecho', 'reflexao', 'pergunta']
    : ['todas', 'trecho', 'reflexao', 'pergunta']

  return (
    <div className="min-h-screen px-5 pt-8 pb-28">
      <div className="max-w-md mx-auto">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-[30px] text-marinho dark:text-bege">Anotações</h1>
            <p className="legenda mt-0.5 truncate">{livro.titulo}</p>
          </div>
          {!editor && (
            <button onClick={abrirNova}
              className="flex items-center gap-1.5 rounded-full bg-marinho dark:bg-dourado text-bege dark:text-noite px-4 py-2 text-sm font-semibold hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dourado">
              <Icone nome="mais" className="w-4 h-4" traco={2} /> Nova
            </button>
          )}
        </div>

        {editor && (
          <div className="cartao p-5 mt-5 animate-subir-suave">
            <div className="flex items-center justify-between mb-3">
              <h2 className="titulo-secao">{editor.id ? 'Editar anotação' : 'Nova anotação'}</h2>
              <button onClick={() => setEditor(null)} aria-label="Fechar" className="p-1 text-texto/50 dark:text-bege/50"><Icone nome="x" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`rounded-xl border py-2.5 flex flex-col items-center gap-1 text-sm font-medium transition-colors ${
                    tipo === t ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/60 dark:text-bege/60'
                  }`}>
                  <Icone nome={TIPOS[t].icone} />
                  {TIPOS[t].rotulo}
                </button>
              ))}
            </div>
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={2000} autoFocus placeholder={TIPOS[tipo].dica}
              className={`campo resize-none ${tipo === 'trecho' ? 'font-serif italic text-[18px]' : ''}`} />
            <p className="text-xs text-right text-texto/40 dark:text-bege/40 mt-1">{texto.length}/2000</p>
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-2 text-sm text-texto/70 dark:text-bege/70">
                Página
                <input type="number" inputMode="numeric" min={1} max={livro.paginas_totais} value={pagina} onChange={(e) => setPagina(e.target.value)} className="campo w-20 py-1.5 text-center" />
              </label>
              <label className="ml-auto flex items-center gap-2 text-sm text-texto/70 dark:text-bege/70 cursor-pointer select-none">
                <input type="checkbox" checked={noMural} onChange={(e) => setNoMural(e.target.checked)} className="w-4 h-4 accent-[#B8912F]" />
                Pôr no mural
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={salvar} disabled={salvando || !texto.trim()} className="botao-primario">{salvando ? 'Salvando…' : editor.id ? 'Salvar alterações' : 'Salvar anotação'}</button>
              <button onClick={() => setEditor(null)} className="botao-secundario">Cancelar</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mt-6" role="tablist">
          {([['minhas', 'Minhas'], ['mural', 'Mural do grupo']] as [Vista, string][]).map(([v, rotulo]) => (
            <button key={v} role="tab" aria-selected={vista === v} onClick={() => { setVista(v); if (v === 'mural' && filtro === 'favoritas') setFiltro('todas') }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${vista === v ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
              {rotulo}
            </button>
          ))}
        </div>

        {vista === 'minhas' && notas && notas.length > 0 && (
          <div className="cartao mt-4 p-4 flex items-center gap-4">
            <dl className="flex gap-4 flex-1">
              {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                <div key={t}>
                  <dd className="font-serif tabular text-xl text-marinho dark:text-bege leading-none">{contagem[t]}</dd>
                  <dt className="text-[11px] text-texto/50 dark:text-bege/50 mt-0.5">{TIPOS[t].plural.toLowerCase()}</dt>
                </div>
              ))}
            </dl>
            <button onClick={copiarParaEncontro} className="flex items-center gap-1.5 text-sm font-semibold text-dourado-escuro dark:text-dourado shrink-0" title="Copia tudo organizado por tipo e página">
              <Icone nome="copiar" className="w-4 h-4" /> Levar ao encontro
            </button>
          </div>
        )}

        <div className="relative mt-4">
          <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-texto/40 dark:text-bege/40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
          </svg>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={vista === 'mural' ? 'Buscar no mural ou por nome' : 'Buscar nas suas anotações'}
            className="campo pl-10" aria-label="Buscar anotações" />
        </div>

        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 sem-barra">
          {filtros.map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`chip shrink-0 ${filtro === f ? 'chip-ativo' : ''}`}>
              {f === 'todas' ? 'Todas' : f === 'favoritas' ? 'Favoritas' : TIPOS[f].plural}
            </button>
          ))}
          <button onClick={() => setOrdem((o) => (o === 'recentes' ? 'pagina' : 'recentes'))} className="chip shrink-0 ml-auto" title="Mudar a ordem">
            {ordem === 'recentes' ? 'Recentes' : 'Por página'}
          </button>
        </div>

        {erroTabela && <p className="cartao p-4 mt-5 text-sm text-red-700 dark:text-red-400">Não foi possível carregar as anotações. Confira a conexão e tente de novo.</p>}
        {notas === null && <div className="space-y-3 mt-5">{[0, 1].map((i) => <div key={i} className="esqueleto h-24" />)}</div>}

        {notas !== null && visiveis.length === 0 && !erroTabela && (
          <div className="text-center py-12">
            <Icone nome="pena" className="w-8 h-8 mx-auto text-dourado/60" />
            <p className="legenda mt-3 max-w-[260px] mx-auto">
              {busca ? 'Nada encontrado com essa busca.' : vista === 'minhas' ? 'Marque o que te chamou atenção na leitura. Isso ajuda muito na hora do encontro.' : 'Ninguém pôs anotações deste livro no mural ainda.'}
            </p>
            {vista === 'minhas' && !busca && <button onClick={abrirNova} className="botao-texto mt-3">Criar a primeira</button>}
          </div>
        )}

        <ul className="space-y-3 mt-5">
          {visiveis.map((n) => {
            const minha = n.membro_id === perfil.id
            return (
              <li key={n.id} className={`cartao p-4 ${n.favorita && vista === 'minhas' ? 'border-dourado/45' : ''}`}>
                <div className="flex items-center gap-2 text-sm text-dourado-escuro dark:text-dourado mb-2">
                  <Icone nome={TIPOS[n.tipo].icone} className="w-4 h-4" />
                  <span className="font-medium">{TIPOS[n.tipo].rotulo}</span>
                  {n.pagina && <span className="text-texto/45 dark:text-bege/45">p. {n.pagina}</span>}
                  {minha && n.compartilhada && vista === 'minhas' && (
                    <span className="text-xs text-texto/45 dark:text-bege/45 flex items-center gap-1"><Icone nome="grupo" className="w-3.5 h-3.5" /> no mural</span>
                  )}
                  {minha && vista === 'minhas' && (
                    <button onClick={() => atualizar(n, { favorita: !n.favorita }, '')} aria-label={n.favorita ? 'Tirar das favoritas' : 'Marcar como favorita'} aria-pressed={n.favorita}
                      className={`ml-auto p-1 ${n.favorita ? 'text-dourado' : 'text-texto/30 dark:text-bege/30 hover:text-dourado'}`}>
                      <Estrela cheia={n.favorita} />
                    </button>
                  )}
                </div>
                <p className={`text-marinho dark:text-bege whitespace-pre-line ${n.tipo === 'trecho' ? 'font-serif italic text-[18px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}>
                  {n.tipo === 'trecho' ? `“${n.texto}”` : n.texto}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {vista === 'mural' && <Avatar nome={n.nome} tamanho={22} />}
                  <span className="text-xs text-texto/45 dark:text-bege/45">{vista === 'mural' ? `${n.nome}, ` : ''}{tempoRelativo(n.created_at)}</span>
                  <div className="ml-auto flex items-center">
                    <BotaoIcone icone="imagem" rotulo="Criar imagem para compartilhar" onClick={() => onCompartilhar({ ...n, autor: n.membro_id === perfil.id ? perfil.nome_exibicao : n.nome })} />
                    {minha && (
                      <>
                        <BotaoIcone icone="pena" rotulo="Editar" onClick={() => abrirEdicao(n)} />
                        <BotaoIcone icone="grupo" rotulo={n.compartilhada ? 'Tirar do mural' : 'Pôr no mural'} ativo={n.compartilhada}
                          onClick={() => atualizar(n, { compartilhada: !n.compartilhada }, n.compartilhada ? 'Agora só você vê' : 'Posta no mural')} />
                        {confirmando === n.id ? (
                          <button onClick={() => excluir(n)} className="text-xs font-semibold text-red-700 dark:text-red-400 px-2 py-1">Confirmar</button>
                        ) : (
                          <BotaoIcone icone="lixeira" rotulo="Apagar anotação" perigo onClick={() => setConfirmando(n.id)} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function BotaoIcone({ icone, rotulo, onClick, ativo, perigo }: { icone: NomeIcone; rotulo: string; onClick: () => void; ativo?: boolean; perigo?: boolean }) {
  return (
    <button onClick={onClick} aria-label={rotulo} title={rotulo}
      className={`p-1.5 rounded-lg transition-colors ${
        ativo ? 'text-dourado-escuro dark:text-dourado' : perigo ? 'text-texto/40 dark:text-bege/40 hover:text-red-700 dark:hover:text-red-400' : 'text-texto/45 dark:text-bege/45 hover:text-dourado-escuro dark:hover:text-dourado'
      }`}>
      <Icone nome={icone} className="w-[18px] h-[18px]" />
    </button>
  )
}

function Estrela({ cheia }: { cheia: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={cheia ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8z" />
    </svg>
  )
}
