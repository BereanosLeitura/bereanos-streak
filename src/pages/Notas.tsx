import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase, type Perfil } from '../lib/supabase'
import { apagarComDesfazer, useAviso } from '../components/Toast'
import Icone, { type NomeIcone } from '../components/Icone'
import Avatar from '../components/Avatar'
import { tempoRelativo } from '../lib/estatisticas'
import type { LivroAtivo } from './Inicio'
import RespostasMural from '../components/RespostasMural'
import ProtecaoSpoiler, { aFrente } from '../components/ProtecaoSpoiler'
import CadernoAnotacoes from '../components/CadernoAnotacoes'
import Vazio from '../components/Vazio'
import { entreAspas } from '../lib/regras'
import { useMinhaLeitura } from '../lib/leitura'

// Anotações de leitura: trecho, reflexão, pergunta para o encontro e aplicação
// (o "Aplicar" do lema). Privadas por padrão; o membro decide o que vai ao mural.

type Tipo = 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'
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
  referencia: string | null
  livro_id: string
  livro_titulo?: string
}

const TIPOS: Record<Tipo, { rotulo: string; plural: string; icone: NomeIcone; dica: string }> = {
  trecho: { rotulo: 'Trecho', plural: 'Trechos', icone: 'aspas', dica: 'Copie a frase do livro exatamente como está.' },
  reflexao: { rotulo: 'Reflexão', plural: 'Reflexões', icone: 'lampada', dica: 'O que isso te fez pensar? Onde concorda ou discorda?' },
  pergunta: { rotulo: 'Pergunta', plural: 'Perguntas', icone: 'interrogacao', dica: 'Uma dúvida para examinar nas Escrituras ou levar ao encontro.' },
  aplicacao: { rotulo: 'Aplicação', plural: 'Aplicações', icone: 'alvo', dica: 'O que você quer praticar a partir desta leitura? Seja concreto: o quê, quando, com quem.' }
}

/** Ordem em que os tipos aparecem em listas e cópias. */
const ORDEM_TIPOS: Tipo[] = ['pergunta', 'trecho', 'reflexao', 'aplicacao']

export interface FiltroInicialNotas {
  vista: Vista
  filtro: Tipo | 'todas'
  novaTipo?: Tipo
  abrirCaderno?: boolean
  /** termo já digitado na busca global */
  busca?: string
  /** abre procurando em todos os livros, não só no do ciclo */
  todosLivros?: boolean
}

type Filtro = Tipo | 'todas' | 'favoritas' | 'escrituras' | 'destaques'

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  inicial?: FiltroInicialNotas | null
  onCompartilhar: (n: { tipo: Tipo; texto: string; pagina: number | null; autor: string }) => void
}

export default function Notas({ perfil, livro, inicial, onCompartilhar }: Props) {
  const [vista, setVista] = useState<Vista>(inicial?.vista ?? 'minhas')
  const [notas, setNotas] = useState<Nota[] | null>(null)
  const [filtro, setFiltro] = useState<Filtro>(inicial?.filtro ?? 'todas')
  const [todosLivros, setTodosLivros] = useState(inicial?.todosLivros ?? false)
  const [referencia, setReferencia] = useState('')
  const [destaques, setDestaques] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState(inicial?.busca ?? '')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [editor, setEditor] = useState<{ id: string | null } | null>(null) // null = fechado; id null = nova
  const [tipo, setTipo] = useState<Tipo>('trecho')
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState('')
  const [noMural, setNoMural] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroTabela, setErroTabela] = useState(false)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [caderno, setCaderno] = useState(!!inicial?.abrirCaderno)
  const [revelarTudo, setRevelarTudo] = useState(false)
  const [revelados, setRevelados] = useState<Set<string>>(new Set())
  const [qtdMural, setQtdMural] = useState<number | null>(null)
  useEffect(() => {
    supabase.from('anotacoes').select('id', { count: 'exact', head: true }).eq('livro_id', livro.id).eq('compartilhada', true)
      .then(({ count }) => setQtdMural(count ?? null))
  }, [livro.id, notas])
  const leitura = useMinhaLeitura(perfil, livro)
  // página em que a pessoa está (null enquanto carrega: protege por garantia)
  const minhaPagina = leitura.carregando ? 0 : leitura.paginasLivro >= livro.paginas_totais ? null : leitura.paginasLivro
  const avisar = useAviso()
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())
  const [recuperado, setRecuperado] = useState(false)
  const [ditando, setDitando] = useState(false)
  const reconhecimento = useRef<any>(null)
  const podeDitar = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)

  // Rascunho da anotação nova: se a pessoa sair da tela ou o app fechar no
  // meio, o texto volta na próxima vez que tocar em "Nova".
  const chaveRascunho = `bereanos-streak-rascunho-${perfil.id}-${livro.id}`
  useEffect(() => {
    if (!editor || editor.id !== null) return
    try {
      if (texto.trim()) localStorage.setItem(chaveRascunho, JSON.stringify({ tipo, texto, pagina, referencia, noMural }))
      else localStorage.removeItem(chaveRascunho)
    } catch { /* ok */ }
  }, [editor, tipo, texto, pagina, referencia, noMural])
  function descartarRascunho() {
    try { localStorage.removeItem(chaveRascunho) } catch { /* ok */ }
    setRecuperado(false)
    setTexto(''); setPagina(''); setReferencia(''); setNoMural(false)
  }

  // Ditado por voz (Chrome no Android e no computador; o Safari do iPhone usa o microfone do teclado).
  function alternarDitado() {
    if (ditando) { reconhecimento.current?.stop(); return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.lang = 'pt-BR'
    r.continuous = true
    r.interimResults = false
    r.onresult = (e: any) => {
      let novo = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) novo += e.results[i][0].transcript
      if (novo.trim()) setTexto((t) => (t && !/\s$/.test(t) ? t + ' ' : t) + novo.trim())
    }
    r.onerror = () => { setDitando(false); avisar('Não deu para usar o microfone agora', 'erro') }
    r.onend = () => setDitando(false)
    reconhecimento.current = r
    r.start()
    setDitando(true)
  }
  useEffect(() => () => reconhecimento.current?.stop(), [])
  useEffect(() => { if (!editor) reconhecimento.current?.stop() }, [editor])

  useEffect(() => {
    if (inicial?.novaTipo) { abrirNova(); setTipo(inicial.novaTipo) }
  }, [])

  const buscaGeral = todosLivros && vista === 'minhas'
  useEffect(() => { carregar() }, [livro.id, vista, buscaGeral])

  async function carregar() {
    setNotas(null)
    let q = supabase
      .from('anotacoes')
      .select('id, membro_id, livro_id, tipo, texto, pagina, referencia, compartilhada, favorita, created_at, perfis(nome_exibicao), livros(titulo)')
      .order('created_at', { ascending: false })
    if (!buscaGeral) q = q.eq('livro_id', livro.id)
    q = vista === 'minhas' ? q.eq('membro_id', perfil.id) : q.eq('compartilhada', true)
    if (vista === 'mural') {
      supabase.from('destaques').select('anotacao_id').then(({ data }) => setDestaques(new Set((data ?? []).map((d) => d.anotacao_id))))
    }
    const { data, error } = await q
    if (error) {
      setErroTabela(true)
      setNotas([])
      return
    }
    setErroTabela(false)
    setNotas((data ?? []).map((n: any) => ({ ...n, nome: n.perfis?.nome_exibicao ?? 'Membro', livro_titulo: n.livros?.titulo })))
  }

  function abrirNova() {
    setEditor({ id: null })
    let r: { tipo: Tipo; texto: string; pagina: string; referencia: string; noMural: boolean } | null = null
    try { r = JSON.parse(localStorage.getItem(chaveRascunho) ?? 'null') } catch { r = null }
    setTipo(r?.tipo ?? 'trecho')
    setTexto(r?.texto ?? '')
    setPagina(r?.pagina ?? '')
    setReferencia(r?.referencia ?? '')
    setNoMural(r?.noMural ?? false)
    setRecuperado(!!r?.texto)
  }

  function abrirEdicao(n: Nota) {
    setEditor({ id: n.id })
    setTipo(n.tipo)
    setTexto(n.texto)
    setPagina(n.pagina ? String(n.pagina) : '')
    setReferencia(n.referencia ?? '')
    setNoMural(n.compartilhada)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar() {
    if (!texto.trim() || !editor) return
    setSalvando(true)
    const pg = pagina ? parseInt(pagina, 10) : NaN
    const campos = { tipo, texto: texto.trim(), pagina: pg > 0 ? Math.min(pg, livro.paginas_totais) : null, referencia: referencia.trim() || null, compartilhada: noMural }
    const { error } = editor.id
      ? await supabase.from('anotacoes').update(campos).eq('id', editor.id)
      : await supabase.from('anotacoes').insert({ ...campos, membro_id: perfil.id, livro_id: livro.id })
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar a anotação', 'erro')
    avisar(editor.id ? 'Anotação atualizada' : noMural ? 'Anotação salva e posta no mural' : 'Anotação salva')
    if (!editor.id) { try { localStorage.removeItem(chaveRascunho) } catch { /* ok */ } }
    setRecuperado(false)
    setEditor(null)
    carregar()
  }

  async function alternarDestaque(n: Nota) {
    const tem = destaques.has(n.id)
    const { error } = tem
      ? await supabase.from('destaques').delete().eq('anotacao_id', n.id)
      : await supabase.from('destaques').insert({ anotacao_id: n.id, created_by: perfil.id })
    if (error) return avisar('Não foi possível alterar o destaque', 'erro')
    setDestaques((d) => { const x = new Set(d); if (tem) x.delete(n.id); else x.add(n.id); return x })
    avisar(tem ? 'Saiu dos destaques do clube' : 'Entrou nos destaques do clube')
  }

  async function atualizar(n: Nota, campos: Partial<Nota>, msg: string) {
    setNotas((lista) => lista?.map((x) => (x.id === n.id ? { ...x, ...campos } : x)) ?? null)
    const { error } = await supabase.from('anotacoes').update(campos).eq('id', n.id)
    if (error) {
      avisar('Não foi possível alterar', 'erro')
      carregar()
    } else if (msg) avisar(msg)
  }

  function excluir(n: Nota) {
    setConfirmando(null)
    const antes = notas
    apagarComDesfazer({
      avisar, texto: n.membro_id === perfil.id ? 'Anotação apagada' : 'Anotação retirada do mural',
      esconder: () => setNotas((l) => l?.filter((x) => x.id !== n.id) ?? null),
      restaurar: () => setNotas(antes),
      apagar: async () => {
        if (n.membro_id === perfil.id) return !(await supabase.from('anotacoes').delete().eq('id', n.id)).error
        // Anotação de outro membro: o admin só tira do mural; o texto continua
        // no caderno de quem escreveu (migração 0019).
        const { error } = await supabase.rpc('retirar_do_mural', { anotacao: n.id })
        return !error
      }
    })
  }

  async function copiarParaEncontro() {
    // só deste livro, mesmo quando a busca está em todos os livros
    const minhas = (notas ?? []).filter((n) => n.membro_id === perfil.id && n.livro_id === livro.id)
    if (minhas.length === 0) return avisar('Você ainda não tem anotações neste livro', 'erro')
    const porTipo = (t: Tipo) => minhas.filter((n) => n.tipo === t).sort((a, b) => (a.pagina ?? 9999) - (b.pagina ?? 9999))
    const linha = (n: Nota) => `${n.pagina ? `(p. ${n.pagina}) ` : ''}${n.tipo === 'trecho' ? entreAspas(n.texto) : n.texto}${n.referencia ? ` [${n.referencia}]` : ''}`
    const partes = [`${livro.titulo}${livro.autor ? `, ${livro.autor}` : ''}`, `Anotações de ${perfil.nome_exibicao}`]
    ORDEM_TIPOS.forEach((t) => {
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
      (filtro === 'todas' || (filtro === 'favoritas' ? n.favorita : filtro === 'escrituras' ? !!n.referencia : filtro === 'destaques' ? destaques.has(n.id) : n.tipo === filtro)) &&
      (!termo || n.texto.toLowerCase().includes(termo) || (n.referencia ?? '').toLowerCase().includes(termo) ||
        (n.livro_titulo ?? '').toLowerCase().includes(termo) || (vista === 'mural' && n.nome.toLowerCase().includes(termo)))
    )
    if (ordem === 'pagina') l = [...l].sort((a, b) => (a.pagina ?? 99999) - (b.pagina ?? 99999))
    return l
  }, [notas, filtro, busca, ordem, vista, destaques])

  const ocultasAFrente = vista === 'mural' ? visiveis.filter((n) => !revelados.has(n.id) && aFrente(n, perfil.id, minhaPagina)).length : 0

  const contagem = useMemo(() => {
    const c = { trecho: 0, reflexao: 0, pergunta: 0, aplicacao: 0 }
    for (const n of notas ?? []) if (n.livro_id === livro.id) c[n.tipo]++
    return c
  }, [notas])

  const filtros: Filtro[] = vista === 'minhas'
    ? ['todas', 'favoritas', 'trecho', 'reflexao', 'pergunta', 'aplicacao', 'escrituras']
    : ['todas', 'destaques', 'trecho', 'reflexao', 'pergunta', 'aplicacao', 'escrituras']
  const ROTULO_FILTRO: Record<string, string> = { todas: 'Todas', favoritas: 'Favoritas', escrituras: 'Com referência bíblica', destaques: 'Destaques do clube' }

  return (
    <div className="min-h-screen px-5 pt-8 pb-28">
      {caderno && <CadernoAnotacoes perfil={perfil} livro={livro} paginaAtual={leitura.paginasLivro} onFechar={() => setCaderno(false)} />}
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
              <button onClick={() => setEditor(null)} aria-label="Fechar" className="p-1 text-texto/65 dark:text-bege/55"><Icone nome="x" /></button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`rounded-xl border py-2.5 flex flex-col items-center gap-1 text-[13px] font-medium transition-colors ${
                    tipo === t ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/70 dark:text-bege/60'
                  }`}>
                  <Icone nome={TIPOS[t].icone} />
                  {TIPOS[t].rotulo}
                </button>
              ))}
            </div>
            {recuperado && (
              <p className="text-xs text-dourado-escuro dark:text-dourado mb-2 flex items-center gap-2">
                Rascunho recuperado.
                <button type="button" onClick={descartarRascunho} className="underline underline-offset-2">Descartar</button>
              </p>
            )}
            <textarea aria-label="Texto da anotação" value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={2000} autoFocus placeholder={TIPOS[tipo].dica}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); salvar() } }}
              className={`campo resize-none ${tipo === 'trecho' ? 'font-serif italic text-[18px]' : ''}`} />
            <div className="flex items-center justify-between mt-1">
              {podeDitar ? (
                <button type="button" onClick={alternarDitado} aria-pressed={ditando}
                  className={`chip text-[12px] flex items-center gap-1.5 ${ditando ? 'chip-ativo animate-pulse' : ''}`}>
                  <Icone nome="som" className="w-3.5 h-3.5" /> {ditando ? 'Ouvindo… toque para parar' : 'Ditar'}
                </button>
              ) : <span />}
              <p className="text-xs text-texto/65 dark:text-bege/55">{texto.length}/2000</p>
            </div>
            <label className="block mt-2">
              <span className="text-sm text-texto/70 dark:text-bege/70">Referência bíblica <span className="text-texto/65 dark:text-bege/55">(opcional)</span></span>
              <input value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={80} placeholder="Ex.: Atos 17:11" className="campo mt-1 py-2" />
            </label>
            <div className="flex items-center gap-3 mt-3">
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
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${vista === v ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/65 dark:text-bege/55'}`}>
              {rotulo}
              {v === 'mural' && !!qtdMural && (
                <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] tabular align-[1px] ${vista === 'mural' ? 'bg-dourado text-marinho' : 'bg-marinho/10 dark:bg-bege/10'}`}>{qtdMural}</span>
              )}
            </button>
          ))}
        </div>

        {vista === 'minhas' && notas && notas.length > 0 && (
          <div className="cartao mt-4 p-4 flex items-center gap-4">
            <dl className="flex gap-3 flex-1">
              {(Object.keys(TIPOS) as Tipo[]).map((t) => (
                <button key={t} type="button" onClick={() => setFiltro(filtro === t ? 'todas' : t)} aria-pressed={filtro === t}
                  title={`Mostrar só ${TIPOS[t].plural.toLowerCase()}`}
                  className={`text-left rounded-lg -m-1 p-1 transition-colors ${filtro === t ? 'bg-dourado/15' : 'hover:bg-marinho/[0.04] dark:hover:bg-bege/[0.05]'}`}>
                  <dd className="font-serif tabular text-xl text-marinho dark:text-bege leading-none">{contagem[t]}</dd>
                  <dt className="text-[10px] text-texto/65 dark:text-bege/55 mt-0.5">{(contagem[t] === 1 ? TIPOS[t].rotulo : TIPOS[t].plural).toLowerCase()}</dt>
                </button>
              ))}
            </dl>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <button onClick={copiarParaEncontro} className="flex items-center gap-1.5 text-sm font-semibold text-dourado-escuro dark:text-dourado" title="Copia tudo organizado por tipo e página">
                <Icone nome="copiar" className="w-4 h-4" /> Copiar texto
              </button>
              <button onClick={() => setCaderno(true)} className="flex items-center gap-1.5 text-sm font-semibold text-dourado-escuro dark:text-dourado" title="Caderno para imprimir ou salvar em PDF">
                <Icone nome="baixar" className="w-4 h-4" /> Baixar caderno
              </button>
            </div>
          </div>
        )}

        <div className="relative mt-4">
          <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-texto/65 dark:text-bege/55" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" />
          </svg>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={vista === 'mural' ? 'Buscar no mural ou por nome' : 'Buscar nas suas anotações'}
            className="campo pl-10" aria-label="Buscar anotações" />
        </div>
        {vista === 'minhas' && (
          <label className="flex items-center gap-2 text-sm text-texto/65 dark:text-bege/65 mt-2 cursor-pointer select-none">
            <input type="checkbox" checked={todosLivros} onChange={(e) => setTodosLivros(e.target.checked)} className="w-4 h-4 accent-[#B8912F]" />
            Procurar em todos os livros
          </label>
        )}

        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 sem-barra">
          {filtros.map((f) => (
            <button key={f} onClick={() => setFiltro(f)} className={`chip shrink-0 ${filtro === f ? 'chip-ativo' : ''}`}>
              {ROTULO_FILTRO[f] ?? TIPOS[f as Tipo].plural}
            </button>
          ))}
          <button onClick={() => setOrdem((o) => (o === 'recentes' ? 'pagina' : 'recentes'))} className="chip shrink-0 ml-auto" title="Mudar a ordem">
            {ordem === 'recentes' ? 'Recentes' : 'Por página'}
          </button>
        </div>

        {erroTabela && <p className="cartao p-4 mt-5 text-sm text-red-700 dark:text-red-400">Não foi possível carregar as anotações. Confira a conexão e tente de novo.</p>}
        {notas === null && <div className="space-y-3 mt-5">{[0, 1].map((i) => <div key={i} className="esqueleto h-24" />)}</div>}

        {notas !== null && visiveis.length === 0 && !erroTabela && (
          <Vazio
            titulo={busca ? undefined : vista === 'minhas' ? 'Seu caderno começa aqui' : 'O mural está esperando'}
            texto={busca ? 'Nada encontrado com essa busca.' : vista === 'minhas' ? 'Marque o que te chamou atenção na leitura. Isso ajuda muito na hora do encontro.' : 'Ninguém pôs anotações deste livro no mural ainda. A primeira pode ser sua.'}
            acao={vista === 'minhas' && !busca ? <button onClick={abrirNova} className="botao-texto">Criar a primeira</button> : undefined}
          />
        )}

        {vista === 'mural' && !revelarTudo && ocultasAFrente > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-dourado/10 border border-dourado/30 px-3.5 py-2.5 text-sm text-marinho dark:text-bege">
            <Icone nome="cadeado" className="w-4 h-4 text-dourado shrink-0" />
            <span className="flex-1">{ocultasAFrente === 1 ? '1 anotação é' : `${ocultasAFrente} anotações são`} de páginas que você ainda não leu.</span>
            <button onClick={() => setRevelarTudo(true)} className="botao-texto shrink-0">Revelar todas</button>
          </div>
        )}

        <ul className="space-y-3 mt-5">
          {visiveis.map((n, i) => {
            const minha = n.membro_id === perfil.id
            const protegida = vista === 'mural' && !revelarTudo && !revelados.has(n.id) && aFrente(n, perfil.id, minhaPagina)
            const longa = n.texto.length > 420 && !expandidas.has(n.id)
            // em "Por página", um título a cada 25 páginas ajuda a achar o trecho
            const grupo = ordem === 'pagina' ? faixaDePaginas(n.pagina) : null
            const novoGrupo = grupo !== null && (i === 0 || faixaDePaginas(visiveis[i - 1].pagina) !== grupo)
            return (
              <Fragment key={n.id}>
              {novoGrupo && <li className="pt-2 text-xs font-semibold uppercase tracking-[.14em] text-dourado-escuro dark:text-dourado" aria-hidden="true">{grupo}</li>}
              <li className={`cartao p-4 ${(n.favorita && vista === 'minhas') || (vista === 'mural' && destaques.has(n.id)) ? 'border-dourado/45' : ''}`}>
                {buscaGeral && n.livro_titulo && <p className="text-[11px] font-semibold text-texto/65 dark:text-bege/55 mb-1 truncate">{n.livro_titulo}</p>}
                {vista === 'mural' && destaques.has(n.id) && <p className="text-[11px] font-semibold text-dourado-escuro dark:text-dourado mb-1">Destaque do clube</p>}
                <div className="flex items-center gap-2 text-sm text-dourado-escuro dark:text-dourado mb-2">
                  <Icone nome={TIPOS[n.tipo].icone} className="w-4 h-4" />
                  <span className="font-medium">{TIPOS[n.tipo].rotulo}</span>
                  {n.pagina && <span className="text-texto/65 dark:text-bege/55">p. {n.pagina}</span>}
                  {minha && n.compartilhada && vista === 'minhas' && (
                    <span className="text-xs text-texto/65 dark:text-bege/55 flex items-center gap-1"><Icone nome="grupo" className="w-3.5 h-3.5" /> no mural</span>
                  )}
                  {minha && vista === 'minhas' && (
                    <button onClick={() => atualizar(n, { favorita: !n.favorita }, '')} aria-label={n.favorita ? 'Tirar das favoritas' : 'Marcar como favorita'} aria-pressed={n.favorita}
                      className={`ml-auto p-1 ${n.favorita ? 'text-dourado' : 'text-texto/30 dark:text-bege/30 hover:text-dourado'}`}>
                      <Estrela cheia={n.favorita} />
                    </button>
                  )}
                </div>
                <ProtecaoSpoiler ativo={protegida} pagina={n.pagina} minhaPagina={minhaPagina} onRevelar={() => setRevelados((r) => new Set(r).add(n.id))}>
                <p className={`texto-nota text-marinho dark:text-bege whitespace-pre-line ${longa ? 'line-clamp-[8]' : ''} ${n.tipo === 'trecho' ? 'font-serif italic text-[18px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}>
                  <ComDestaque texto={n.tipo === 'trecho' ? entreAspas(n.texto) : n.texto} termo={busca} />
                </p>
                {n.texto.length > 420 && (
                  <button onClick={() => setExpandidas((s) => { const x = new Set(s); if (x.has(n.id)) x.delete(n.id); else x.add(n.id); return x })}
                    className="botao-texto text-sm mt-1">{longa ? 'Ler mais' : 'Mostrar menos'}</button>
                )}
                </ProtecaoSpoiler>
                {n.referencia && (
                  <p className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-marinho/[0.05] dark:bg-bege/[0.07] px-2.5 py-1 text-xs font-semibold text-marinho/80 dark:text-bege/80">
                    <Icone nome="livro" className="w-3.5 h-3.5 text-dourado" /> {n.referencia}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {vista === 'mural' && <Avatar nome={n.nome} tamanho={22} />}
                  <span className="text-xs text-texto/65 dark:text-bege/55">{vista === 'mural' ? `${n.nome}, ` : ''}{tempoRelativo(n.created_at)}</span>
                  <div className="ml-auto flex items-center">
                    <BotaoIcone icone="imagem" rotulo="Criar imagem para compartilhar" onClick={() => onCompartilhar({ ...n, autor: n.membro_id === perfil.id ? perfil.nome_exibicao : n.nome })} />
                    {minha && (
                      <>
                        <BotaoIcone icone="pena" rotulo="Editar" onClick={() => abrirEdicao(n)} />
                        <BotaoIcone icone="grupo" rotulo={n.compartilhada ? 'Tirar do mural' : 'Pôr no mural'} ativo={n.compartilhada}
                          onClick={() => atualizar(n, { compartilhada: !n.compartilhada }, n.compartilhada ? 'Agora só você vê' : 'Posta no mural')} />
                        <BotaoIcone icone="lixeira" rotulo="Apagar anotação" perigo onClick={() => excluir(n)} />
                      </>
                    )}
                    {vista === 'mural' && perfil.role === 'admin' && (
                      <button onClick={() => alternarDestaque(n)} aria-label={destaques.has(n.id) ? 'Tirar dos destaques' : 'Destacar para o clube'} title={destaques.has(n.id) ? 'Tirar dos destaques' : 'Destacar para o clube'}
                        className={`p-1.5 ${destaques.has(n.id) ? 'text-dourado' : 'text-texto/65 dark:text-bege/55 hover:text-dourado'}`}>
                        <Estrela cheia={destaques.has(n.id)} />
                      </button>
                    )}
                    {!minha && perfil.role === 'admin' && (confirmando === n.id ? (
                      <button onClick={() => excluir(n)} className="text-xs font-semibold text-red-700 dark:text-red-400 px-2 py-1">Retirar do mural</button>
                    ) : (
                      <BotaoIcone icone="lixeira" rotulo="Retirar do mural (admin)" perigo onClick={() => setConfirmando(n.id)} />
                    ))}
                  </div>
                </div>
                {vista === 'mural' && !protegida && <RespostasMural anotacaoId={n.id} perfil={perfil} autorNota={n.membro_id} />}
              </li>
              </Fragment>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/** "p. 1–25", "p. 26–50"... ou "Sem página". */
function faixaDePaginas(pagina: number | null): string {
  if (!pagina) return 'Sem página'
  const ini = Math.floor((pagina - 1) / 25) * 25 + 1
  return `p. ${ini}–${ini + 24}`
}

/** Marca o termo buscado dentro do texto (sem diferenciar maiúsculas). */
function ComDestaque({ texto, termo }: { texto: string; termo: string }) {
  const t = termo.trim()
  if (t.length < 2) return <>{texto}</>
  const partes: ReactNode[] = []
  const baixo = texto.toLowerCase()
  const alvo = t.toLowerCase()
  let i = 0
  for (let j = baixo.indexOf(alvo); j !== -1; j = baixo.indexOf(alvo, i)) {
    if (j > i) partes.push(texto.slice(i, j))
    partes.push(<mark key={j} className="bg-dourado/30 text-inherit rounded px-0.5">{texto.slice(j, j + t.length)}</mark>)
    i = j + t.length
  }
  partes.push(texto.slice(i))
  return <>{partes}</>
}

function BotaoIcone({ icone, rotulo, onClick, ativo, perigo }: { icone: NomeIcone; rotulo: string; onClick: () => void; ativo?: boolean; perigo?: boolean }) {
  return (
    <button onClick={onClick} aria-label={rotulo} title={rotulo}
      className={`p-2.5 -m-0.5 rounded-lg transition-colors ${
        ativo ? 'text-dourado-escuro dark:text-dourado' : perigo ? 'text-texto/65 dark:text-bege/55 hover:text-red-700 dark:hover:text-red-400' : 'text-texto/65 dark:text-bege/55 hover:text-dourado-escuro dark:hover:text-dourado'
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
