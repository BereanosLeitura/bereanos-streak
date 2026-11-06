import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent as PE, type ReactNode, type WheelEvent as WE } from 'react'
import { supabase, type Perfil } from '../lib/supabase'
import { useMinhaLeitura } from '../lib/leitura'
import { useAviso } from '../components/Toast'
import Icone, { type NomeIcone } from '../components/Icone'
import {
  FORMATOS, MODELOS_LEITURA, MODELOS_TEXTO, arquivoParaImagem, canvasParaArquivo, carregarImagem,
  desenharAdesivo, desenharLeitura, desenharTexto, dividirTexto, limiteDeCaracteres, SO_COM_FUNDO, FONTES_CARTAO, precarregarFontes, type FonteCartao,
  AJUSTE_PADRAO, MODELOS_COM_FOTO, VERSOES, type AjusteFoto, type FiltroFoto, type FundoCaber,
  type CorAdesivo, type Formato, type ModeloLeitura, type ModeloTexto, type TipoTexto
} from '../lib/cartoes'
import type { LivroAtivo } from './Inicio'
import { calcularPanorama, calcularRetrospectiva, type Panorama, type Retrospectiva } from '../lib/infograficos'
import { formatarData } from '../lib/estatisticas'
import { useContagem } from '../lib/preferencias'

export interface PreCarga {
  modo: 'texto' | 'leitura'
  tipo?: TipoTexto
  texto?: string
  pagina?: number | null
  modeloLeitura?: ModeloLeitura
  autor?: string | null // quem escreveu a anotação (quando não é você)
}

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  preCarga: PreCarga | null
}

interface NotaResumo { id: string; tipo: TipoTexto; texto: string; pagina: number | null }

const TIPOS: { id: TipoTexto; rotulo: string; icone: NomeIcone }[] = [
  { id: 'trecho', rotulo: 'Trecho', icone: 'aspas' },
  { id: 'reflexao', rotulo: 'Reflexão', icone: 'lampada' },
  { id: 'pergunta', rotulo: 'Pergunta', icone: 'interrogacao' },
  { id: 'aplicacao', rotulo: 'Aplicação', icone: 'alvo' }
]

const LIMITE_TEXTO = 1500
const CHAVE_VERSOES = 'bereanos-streak-versoes-cartao'
const CHAVE_RASCUNHO = 'bereanos-streak-rascunho-cartao'

interface Rascunho { livroId: string; tipo: TipoTexto; texto: string; pagina: string }
function lerRascunho(livroId: string): Rascunho | null {
  try {
    const r = JSON.parse(localStorage.getItem(CHAVE_RASCUNHO) || 'null') as Rascunho | null
    return r && r.livroId === livroId && r.texto ? r : null
  } catch { return null }
}

const FILTROS: [FiltroFoto, string][] = [['original', 'Original'], ['pb', 'Preto e branco'], ['sepia', 'Sépia'], ['quente', 'Quente']]
const FUNDOS_CABER: [FundoCaber, string][] = [['desfocado', 'Desfocado'], ['marinho', 'Marinho'], ['bege', 'Bege'], ['preto', 'Preto']]

export default function Compartilhar({ perfil, livro, preCarga }: Props) {
  const leitura = useMinhaLeitura(perfil, livro)
  const contagem = useContagem()
  const [modo, setModo] = useState<'texto' | 'leitura'>(preCarga?.modo ?? 'texto')
  const [formato, setFormato] = useState<Formato>('story')
  const [modeloTexto, setModeloTexto] = useState<ModeloTexto>('pergaminho')
  const [modeloLeitura, setModeloLeitura] = useState<ModeloLeitura>(preCarga?.modeloLeitura ?? 'lendo')
  // sem texto vindo de uma anotação, volta o rascunho que ficou na tela
  const [rascunhoInicial] = useState(() => (preCarga?.texto ? null : lerRascunho(livro.id)))
  const [tipo, setTipo] = useState<TipoTexto>(preCarga?.tipo ?? rascunhoInicial?.tipo ?? 'trecho')
  const [texto, setTexto] = useState(preCarga?.texto ?? rascunhoInicial?.texto ?? '')
  const [pagina, setPagina] = useState(preCarga?.pagina ? String(preCarga.pagina) : rascunhoInicial?.pagina ?? '')
  const [mostrarNome, setMostrarNome] = useState(true)
  // o nome no cartão de frase é de quem escreveu: você, ou o membro do mural
  const [autorTexto, setAutorTexto] = useState(preCarga?.autor ?? perfil.nome_exibicao)
  const [mostrarLivro, setMostrarLivro] = useState(true)
  const [fundo, setFundo] = useState<'com' | 'transparente'>('com')
  const [corAdesivo, setCorAdesivo] = useState<CorAdesivo>('claro')
  const [fonteCartao, setFonteCartaoEstado] = useState<FonteCartao>(() => {
    try { return (localStorage.getItem('bereanos-streak-fonte-cartao') as FonteCartao) || 'garamond' } catch { return 'garamond' }
  })
  useEffect(() => { precarregarFontes() }, [])
  function setFonteCartao(f: FonteCartao) {
    setFonteCartaoEstado(f)
    try { localStorage.setItem('bereanos-streak-fonte-cartao', f) } catch { /* ok */ }
  }
  const [parte, setParte] = useState(0)
  const [foto, setFoto] = useState<HTMLImageElement | null>(null)
  const [ajuste, setAjuste] = useState<AjusteFoto>(AJUSTE_PADRAO)
  const [mostrarCapa, setMostrarCapa] = useState(() => { try { return localStorage.getItem('bereanos-streak-mostrar-capa') !== '0' } catch { return true } })
  const [capaLado, setCapaLado] = useState(false)
  function mudarMostrarCapa(v: boolean) {
    setMostrarCapa(v)
    try { localStorage.setItem('bereanos-streak-mostrar-capa', v ? '1' : '0') } catch { /* ok */ }
  }
  const [versoes, setVersoes] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_VERSOES) || '{}') } catch { return {} }
  })
  const [capa, setCapa] = useState<HTMLImageElement | null>(null)
  const [notas, setNotas] = useState<NotaResumo[]>([])
  const [legenda, setLegenda] = useState('')
  const [legendaEditada, setLegendaEditada] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [retro, setRetro] = useState<Retrospectiva | null>(null)
  const [panorama, setPanorama] = useState<Panorama | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const modeloVisivel = useRef<string | null>(null)
  const fotoRef = useRef<HTMLInputElement>(null)
  const avisar = useAviso()

  useEffect(() => {
    supabase.from('anotacoes').select('id, tipo, texto, pagina').eq('membro_id', perfil.id).eq('livro_id', livro.id)
      .order('created_at', { ascending: false }).limit(40)
      .then(({ data }) => setNotas((data ?? []) as NotaResumo[]))
    if (livro.capa_url) carregarImagem(livro.capa_url).then(setCapa).catch(() => setCapa(null))
  }, [livro.id])

  // dados extras só quando o modelo pede
  useEffect(() => {
    if (modo !== 'leitura') return
    if (modeloLeitura === 'retrospectiva' && !retro) calcularRetrospectiva(perfil.id, leitura.ritmo, livro).then(setRetro).catch(() => null)
    if (modeloLeitura === 'grupo' && !panorama) calcularPanorama(livro).then(setPanorama).catch(() => null)
  }, [modo, modeloLeitura, livro.id])
  // adesivo sem fundo não existe para os modelos de página inteira
  useEffect(() => { if (SO_COM_FUNDO.includes(modeloLeitura) && fundo === 'transparente') setFundo('com') }, [modeloLeitura])
  useEffect(() => { if (fundo === 'transparente' && SO_COM_FUNDO.includes(modeloLeitura)) setModeloLeitura('lendo') }, [fundo])

  // rascunho do texto: continua lá se a pessoa sair da tela e voltar
  useEffect(() => {
    try {
      if (texto.trim()) localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ livroId: livro.id, tipo, texto, pagina } satisfies Rascunho))
      else localStorage.removeItem(CHAVE_RASCUNHO)
    } catch { /* sem armazenamento: segue sem rascunho */ }
  }, [texto, tipo, pagina, livro.id])

  const modeloAtual = modo === 'texto' ? modeloTexto : modeloLeitura
  const listaVersoes = VERSOES[modeloAtual] ?? []
  const versao = Math.min(versoes[modeloAtual] ?? 0, Math.max(0, listaVersoes.length - 1))
  function escolherVersao(v: number) {
    const novo = { ...versoes, [modeloAtual]: v }
    setVersoes(novo)
    try { localStorage.setItem(CHAVE_VERSOES, JSON.stringify(novo)) } catch { /* ok */ }
  }

  const transparente = modo === 'leitura' && fundo === 'transparente'
  const precisaFoto = !transparente && ((modo === 'texto' && MODELOS_COM_FOTO.includes(modeloTexto)) || (modo === 'leitura' && modeloLeitura === 'foto-leitura'))
  const aceitaFoto = precisaFoto || (modo === 'texto' && modeloTexto === 'polaroid')

  const fonte = useMemo(() => {
    const pg = pagina ? `p. ${pagina}` : ''
    if (!mostrarLivro) return ''
    if (tipo === 'trecho') return [livro.autor, livro.titulo, pg].filter(Boolean).join(', ')
    return `Sobre ${livro.titulo}${pg ? `, ${pg}` : ''}`
  }, [tipo, pagina, livro, mostrarLivro])

  // texto longo: divide em partes que cabem com boa leitura em cada cartão
  const partes = useMemo(() => {
    const t = texto.trim()
    if (!t) return ['']
    const ps = dividirTexto(t, limiteDeCaracteres(modeloTexto, formato))
    if (ps.length === 1) return ps
    // reticências só quando a quebra caiu no meio de uma frase
    const fechada = (t: string) => /[.!?…;:]["”]?$/.test(t)
    return ps.map((p, i) => `${i > 0 && !fechada(ps[i - 1]) ? '…' : ''}${p}${i < ps.length - 1 && !fechada(p) ? '…' : ''}`)
  }, [texto, modeloTexto, formato])
  const parteAtual = Math.min(parte, partes.length - 1)
  useEffect(() => { if (parte > partes.length - 1) setParte(0) }, [partes.length])

  const semana = leitura.semana.map((d) => ({ rotulo: d.rotulo, paginas: d.paginas }))
  const capaVisivel = mostrarCapa && mostrarLivro && !!capa
  const capaBaixa = !!capa && Math.min(capa.naturalWidth, capa.naturalHeight * 0.66) < 420
  const dadosLeitura = {
    fonteCartao,
    titulo: mostrarLivro ? livro.titulo : '',
    autor: mostrarLivro ? livro.autor : null,
    capa: mostrarLivro ? capa : null,
    pct: leitura.pct,
    paginas: leitura.paginasLivro,
    total: livro.paginas_totais,
    sequencia: leitura.seq.dias,
    nome: mostrarNome ? perfil.nome_exibicao : null,
    foto,
    ajuste,
    versao,
    mostrarCapa: capaVisivel,
    capaLado,
    semana,
    retro: retro ? {
      paginas: retro.paginas,
      dias: retro.dias,
      maiorSequencia: retro.maiorSequencia,
      sessoes: retro.sessoes,
      semContagem: !contagem,
      minutos: retro.minutos,
      anotacoes: retro.anotacoes.trecho + retro.anotacoes.reflexao + retro.anotacoes.pergunta + retro.anotacoes.aplicacao,
      melhorDia: retro.melhorDia ? { rotulo: formatarData(retro.melhorDia.data), paginas: retro.melhorDia.paginas } : null,
      periodo: retro.inicio && retro.fim
        ? (formatarData(retro.inicio) === formatarData(retro.fim) ? formatarData(retro.inicio) : `${formatarData(retro.inicio)} a ${formatarData(retro.fim)}`)
        : null,
      trecho: mostrarLivro && retro.trechoFavorito ? encurtar(retro.trechoFavorito.texto, 180) : null
    } : undefined,
    grupo: panorama ? {
      paginas: panorama.paginasGrupo,
      leitores: panorama.leitores,
      terminaram: panorama.terminaram,
      mural: panorama.mural.trecho + panorama.mural.reflexao + panorama.mural.pergunta + panorama.mural.aplicacao,
      mediaPct: panorama.mediaPct,
      dias: panorama.ultimos14.map((x) => ({ rotulo: 'DSTQQSS'[new Date(x.chave + 'T12:00:00').getDay()], paginas: x.paginas }))
    } : undefined
  }

  // legenda automática (até a pessoa editar à mão)
  useEffect(() => {
    if (!legendaEditada) setLegenda(gerarLegenda())
  }, [modo, tipo, texto, fonte, autorTexto, modeloLeitura, leitura.pct, leitura.paginasLivro, leitura.seq.dias, leitura.paginasSemana, mostrarLivro, legendaEditada, retro, panorama])

  function gerarLegenda(): string {
    const nomeLivro = mostrarLivro ? `${livro.titulo}${livro.autor ? `, de ${livro.autor}` : ''}` : ''
    if (modo === 'texto') {
      const t = texto.trim()
      if (!t) return ''
      if (tipo === 'trecho') return `“${t.replace(/^["“]|["”]$/g, '')}”${fonte ? `\n${fonte}` : ''}\n\nLendo com o Clube do Livro Bereanos.`
      if (tipo === 'reflexao') return `${t}${autorTexto !== perfil.nome_exibicao ? `\n(${autorTexto})` : ''}\n\n${nomeLivro ? `Reflexão da leitura de ${nomeLivro}.\n` : ''}Clube do Livro Bereanos`
      if (tipo === 'aplicacao') return `${t}\n\n${nomeLivro ? `O que levo para a vida da leitura de ${nomeLivro}.\n` : ''}Ler, examinar, dialogar e aplicar. Clube do Livro Bereanos`
      return `${t}\n\n${nomeLivro ? `Uma pergunta da leitura de ${nomeLivro}. ` : ''}O que você acha?`
    }
    const de = nomeLivro ? ` ${nomeLivro}` : ' o livro do ciclo'
    const s = leitura.seq.dias
    switch (modeloLeitura) {
      case 'progresso':
      case 'anel':
        return `${leitura.pct}% lido de${de}: página ${leitura.paginasLivro} de ${livro.paginas_totais}. Seguimos com o Clube do Livro Bereanos.`
      case 'semana':
        return `Minha semana de leitura: ${leitura.paginasSemana} páginas. Uma página por vez, com o Clube do Livro Bereanos.`
      case 'constancia':
        return `${s} ${s === 1 ? 'dia seguido' : 'dias seguidos'} de leitura${nomeLivro ? `, lendo ${nomeLivro}` : ''}. Clube do Livro Bereanos.`
      case 'retrospectiva':
        return retro
          ? `Minha leitura de${de}: ${retro.paginas} páginas em ${retro.dias} ${retro.dias === 1 ? 'dia' : 'dias'}${retro.anotacoes.trecho + retro.anotacoes.reflexao + retro.anotacoes.pergunta + retro.anotacoes.aplicacao ? `, com ${retro.anotacoes.trecho + retro.anotacoes.reflexao + retro.anotacoes.pergunta + retro.anotacoes.aplicacao} anotações` : ''}. Clube do Livro Bereanos.`
          : ''
      case 'grupo':
        return panorama
          ? `${panorama.paginasGrupo} páginas lidas juntos${nomeLivro ? ` em ${nomeLivro}` : ''}, por ${panorama.leitores} ${panorama.leitores === 1 ? 'leitor' : 'leitores'}. Ler, examinar, dialogar e aplicar, no Clube do Livro Bereanos.`
          : ''
      case 'terminei':
        return `Terminei de ler${nomeLivro ? ` ${nomeLivro}` : ' mais um livro'}. ${livro.paginas_totais} páginas com o Clube do Livro Bereanos.`
      default:
        return `Estou lendo${de} com o Clube do Livro Bereanos. Já li ${leitura.pct}%.`
    }
  }

  async function desenharEm(canvas: HTMLCanvasElement, indiceParte = parteAtual) {
    if (modo === 'texto') {
      await desenharTexto(canvas, modeloTexto, formato, {
        fonteCartao, tipo, texto: partes[indiceParte], fonte, nome: mostrarNome ? autorTexto : null, foto, ajuste, versao,
        parte: partes.length > 1 ? { i: indiceParte + 1, n: partes.length } : undefined
      })
    } else if (transparente) {
      await desenharAdesivo(canvas, modeloLeitura, dadosLeitura, corAdesivo)
    } else {
      await desenharLeitura(canvas, modeloLeitura, formato, dadosLeitura)
    }
  }

  // redesenha a prévia: desenha fora da tela e só mostra o desenho mais recente
  // (espera curta ao digitar; quase nenhuma ao arrastar ou dar zoom na foto)
  const rodada = useRef(0)
  const rapido = useRef(false)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || leitura.carregando) return
    const minha = ++rodada.current
    const espera = rapido.current ? 0 : 160
    rapido.current = false
    if (espera) setGerando(true)
    let cancelado = false
    const t = setTimeout(async () => {
      try {
        const fora = document.createElement('canvas')
        await desenharEm(fora)
        if (cancelado || minha !== rodada.current) return
        canvas.width = fora.width
        canvas.height = fora.height
        canvas.getContext('2d')!.drawImage(fora, 0, 0)
      } catch (e) {
        console.error('Falha ao desenhar o cartão:', e)
      } finally {
        if (!cancelado && minha === rodada.current) setGerando(false)
      }
    }, espera)
    return () => { cancelado = true; clearTimeout(t) }
  }, [modo, formato, modeloTexto, modeloLeitura, tipo, partes, parteAtual, fonte, mostrarNome, autorTexto, mostrarLivro, foto, capa, ajuste, versao,
      leitura.carregando, leitura.pct, leitura.seq.dias, leitura.paginasSemana, fundo, corAdesivo, retro, panorama, fonteCartao, capaVisivel, capaLado])

  // ----- gestos na prévia: arrastar move a foto, pinça ou rodinha dão zoom -----
  const editandoFoto = aceitaFoto && !!foto && !transparente
  const ponteiros = useRef(new Map<number, { x: number; y: number }>())
  const pinca = useRef<{ dist: number; zoom: number } | null>(null)
  const mudarAjuste = (f: (a: AjusteFoto) => AjusteFoto, gesto = false) => { if (gesto) rapido.current = true; setAjuste(f) }
  const limitarZoom = (z: number) => Math.max(0.5, Math.min(4, z))
  function aoTocar(e: PE<HTMLDivElement>) {
    if (!editandoFoto) return
    e.currentTarget.setPointerCapture(e.pointerId)
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()]
      pinca.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: ajuste.zoom }
    }
  }
  function aoMover(e: PE<HTMLDivElement>) {
    const antes = ponteiros.current.get(e.pointerId)
    if (!editandoFoto || !antes) return
    const agora = { x: e.clientX, y: e.clientY }
    ponteiros.current.set(e.pointerId, agora)
    const caixa = e.currentTarget.getBoundingClientRect()
    if (ponteiros.current.size >= 2 && pinca.current) {
      const [a, b] = [...ponteiros.current.values()]
      const z = limitarZoom(pinca.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinca.current.dist)))
      mudarAjuste((x) => ({ ...x, zoom: z }), true)
    } else if (ponteiros.current.size === 1) {
      const ddx = (agora.x - antes.x) / caixa.width
      const ddy = (agora.y - antes.y) / caixa.height
      mudarAjuste((x) => ({ ...x, dx: Math.max(-1, Math.min(1, x.dx + ddx)), dy: Math.max(-1, Math.min(1, x.dy + ddy)) }), true)
    }
  }
  function aoSoltar(e: PE<HTMLDivElement>) {
    ponteiros.current.delete(e.pointerId)
    if (ponteiros.current.size < 2) pinca.current = null
  }
  function aoRolar(e: WE<HTMLDivElement>) {
    if (!editandoFoto) return
    mudarAjuste((x) => ({ ...x, zoom: limitarZoom(x.zoom * (e.deltaY < 0 ? 1.08 : 0.92)) }), true)
  }

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    try {
      setFoto(await arquivoParaImagem(arq))
      setAjuste(AJUSTE_PADRAO)
    } catch {
      avisar('Não foi possível abrir essa foto', 'erro')
    }
  }

  function usarNota(id: string) {
    const n = notas.find((x) => x.id === id)
    if (!n) return
    setTipo(n.tipo)
    setTexto(n.texto)
    setAutorTexto(perfil.nome_exibicao)
    setPagina(n.pagina ? String(n.pagina) : '')
    setParte(0)
    setLegendaEditada(false)
  }

  function nomeArquivo(sufixo = '') {
    const base = modo === 'texto' ? tipo : transparente ? `${modeloLeitura}-sem-fundo` : modeloLeitura
    return `bereanos-${base}${sufixo}-${Date.now()}.png`
  }

  /** Gera todos os arquivos: uma imagem, ou uma por parte quando o texto foi dividido. */
  async function gerarArquivos(): Promise<File[]> {
    if (modo === 'texto' && partes.length > 1) {
      const arquivos: File[] = []
      for (let i = 0; i < partes.length; i++) {
        const c = document.createElement('canvas')
        await desenharEm(c, i)
        arquivos.push(await canvasParaArquivo(c, nomeArquivo(`-${i + 1}de${partes.length}`)))
      }
      return arquivos
    }
    return [await canvasParaArquivo(canvasRef.current!, nomeArquivo())]
  }

  async function marcarConquista() {
    try {
      const { data: c } = await supabase.from('conquistas').select('id').eq('chave', 'compartilhou_jornada').single()
      if (!c) return
      const { data: tem } = await supabase.from('membro_conquistas').select('id').eq('membro_id', perfil.id).eq('conquista_id', c.id).is('livro_id', null).maybeSingle()
      if (!tem) await supabase.from('membro_conquistas').insert({ membro_id: perfil.id, conquista_id: c.id, livro_id: null })
    } catch {
      // não crítico
    }
  }

  async function compartilhar() {
    if (!canvasRef.current || !podeGerar) return
    setEnviando(true)
    try {
      const arquivos = await gerarArquivos()
      if (navigator.canShare?.({ files: arquivos })) {
        try {
          await navigator.share({ files: arquivos, text: legenda || undefined })
          marcarConquista()
          return
        } catch (e: any) {
          if (e?.name === 'AbortError') return
        }
      }
      // computador ou navegador sem compartilhamento de arquivo: baixa e copia a legenda
      arquivos.forEach((a, i) => setTimeout(() => baixarArquivo(a), i * 400))
      if (legenda) await copiarTexto(legenda, false)
      avisar(arquivos.length > 1 ? `${arquivos.length} imagens baixadas e legenda copiada` : 'Imagem baixada e legenda copiada')
      marcarConquista()
    } finally {
      setEnviando(false)
    }
  }

  async function baixar() {
    if (!canvasRef.current || !podeGerar) return
    const arquivos = await gerarArquivos()
    arquivos.forEach((a, i) => setTimeout(() => baixarArquivo(a), i * 400))
    avisar(arquivos.length > 1 ? `${arquivos.length} imagens baixadas` : transparente ? 'Imagem sem fundo baixada (PNG)' : 'Imagem baixada')
    marcarConquista()
  }

  function baixarArquivo(arquivo: File) {
    const url = URL.createObjectURL(arquivo)
    const a = document.createElement('a')
    a.href = url
    a.download = arquivo.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }

  async function copiarTexto(t: string, comAviso = true) {
    try {
      await navigator.clipboard.writeText(t)
      if (comAviso) avisar('Legenda copiada')
    } catch {
      if (comAviso) avisar('Não foi possível copiar', 'erro')
    }
  }

  const podeGerar = modo === 'leitura' || texto.trim().length > 0
  const { w, h } = FORMATOS[formato]
  const fundoPrevia = transparente
    ? corAdesivo === 'claro'
      ? 'linear-gradient(135deg, #3a4a6b, #6b5a3a)'
      : 'repeating-conic-gradient(#e9e4d6 0% 25%, #fbf8f0 0% 50%) 50% / 24px 24px'
    : undefined

  return (
    <div className="min-h-screen px-5 pt-8 pb-28">
      <div className="max-w-md mx-auto">
        <h1 className="font-serif text-[30px] text-marinho dark:text-bege">Compartilhar</h1>
        <p className="legenda mt-0.5">Monte uma imagem pronta para o Instagram, WhatsApp ou onde quiser.</p>

        {livro.status === 'concluido' && (
          <p className="cartao px-4 py-3 mt-4 text-sm text-texto/70 dark:text-bege/70 flex items-center gap-2">
            <Icone nome="estante" className="w-4 h-4 text-dourado-escuro dark:text-dourado shrink-0" />
            Livro de um ciclo concluído: {livro.titulo}
          </p>
        )}

        <Segmentado
          className="mt-5"
          valor={modo}
          opcoes={[['texto', 'Frase ou reflexão'], ['leitura', 'Minha leitura']]}
          onMudar={(m) => { setModo(m); setLegendaEditada(false) }}
        />

        {/* Prévia */}
        <div className="relative mt-5 flex justify-center">
          {transparente ? (
            <div className="relative w-full max-w-[340px] rounded-2xl overflow-hidden ring-1 ring-black/5 p-4" style={{ background: fundoPrevia }}>
              <canvas ref={canvasRef} className="w-full h-auto block" aria-label="Prévia da imagem sem fundo" />
              {gerando && <Girando />}
            </div>
          ) : (
            <div
              className={`relative rounded-2xl overflow-hidden shadow-xl shadow-marinho/20 ring-1 ring-black/5 bg-marinho/5 ${editandoFoto ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
              style={{ aspectRatio: `${w} / ${h}`, height: formato === 'story' ? 'min(62vh, 560px)' : formato === 'post' ? 'min(50vh, 440px)' : 'min(42vh, 360px)', touchAction: editandoFoto ? 'none' : undefined }}
              onPointerDown={aoTocar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar} onWheel={aoRolar}
            >
              <canvas ref={canvasRef} className="w-full h-full block" aria-label="Prévia da imagem" />
              {gerando && <Girando />}
            </div>
          )}
        </div>
        {editandoFoto && (
          <p className="text-xs text-center text-texto/50 dark:text-bege/50 mt-2">Arraste a foto na prévia para enquadrar. Dois dedos dão zoom.</p>
        )}

        {/* partes de um texto longo */}
        {modo === 'texto' && partes.length > 1 && (
          <div className="mt-3 text-center animate-subir-suave">
            <p className="text-sm text-texto/60 dark:text-bege/60">Texto longo: dividido em {partes.length} imagens, para a letra continuar legível.</p>
            <div className="flex justify-center gap-2 mt-2">
              {partes.map((_, i) => (
                <button key={i} onClick={() => setParte(i)} className={`chip w-11 ${parteAtual === i ? 'chip-ativo' : ''}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}

        {/* Formato */}
        {!transparente && (
          <>
            <div className="flex justify-center gap-2 mt-4">
              {(Object.keys(FORMATOS) as Formato[]).map((f) => (
                <button key={f} onClick={() => setFormato(f)} title={FORMATOS[f].dica} className={`chip ${formato === f ? 'chip-ativo' : ''}`}>
                  {FORMATOS[f].rotulo}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-texto/45 dark:text-bege/45 mt-2">{FORMATOS[formato].dica}</p>
          </>
        )}

        {/* Fundo (só na leitura) */}
        {modo === 'leitura' && (
          <section className="cartao p-4 mt-5">
            <Segmentado valor={fundo} opcoes={[['com', 'Com fundo'], ['transparente', 'Sem fundo (PNG)']]} onMudar={setFundo} />
            {transparente && (
              <div className="mt-3 animate-subir-suave">
                <p className="text-sm text-texto/65 dark:text-bege/65">
                  Sai só o conteúdo, sem fundo, para colar por cima de uma foto ou story. Escolha a cor pensando na foto:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => setCorAdesivo('claro')} className={`chip ${corAdesivo === 'claro' ? 'chip-ativo' : ''}`}>Texto claro (foto escura)</button>
                  <button onClick={() => setCorAdesivo('escuro')} className={`chip ${corAdesivo === 'escuro' ? 'chip-ativo' : ''}`}>Texto escuro (foto clara)</button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Modelos */}
        <section className="mt-6">
          <h2 className="rotulo">Modelo</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 sem-barra">
            {(modo === 'texto' ? MODELOS_TEXTO : MODELOS_LEITURA)
              .filter((m) => !(transparente && SO_COM_FUNDO.includes(m.id as ModeloLeitura)) && !(!contagem && m.id === 'constancia'))
              .map((m) => {
                const ativo = modo === 'texto' ? modeloTexto === m.id : modeloLeitura === m.id
                return (
                  <button
                    key={m.id}
                    ref={ativo ? (el) => { if (el && modeloVisivel.current !== m.id) { modeloVisivel.current = m.id; const lista = el.parentElement; if (lista) lista.scrollLeft = el.offsetLeft - lista.clientWidth / 2 + el.clientWidth / 2 } } : undefined}
                    onClick={() => {
                      if (modo === 'texto') setModeloTexto(m.id as ModeloTexto)
                      else setModeloLeitura(m.id as ModeloLeitura)
                      setLegendaEditada(false)
                    }}
                    aria-pressed={ativo}
                    className="shrink-0 flex flex-col items-center gap-1.5 focus-visible:outline-none group"
                  >
                    <span
                      className={`w-16 h-[88px] rounded-xl border-2 flex items-end justify-center overflow-hidden transition-all ${
                        ativo ? 'border-dourado scale-105 shadow-md' : 'border-transparent ring-1 ring-marinho/10 dark:ring-bege/10 group-hover:ring-dourado/60'
                      }`}
                      style={{ background: transparente ? fundoPrevia : m.cores[0] }}
                    >
                      {m.id.startsWith('foto') ? (
                        <Icone nome="camera" className="w-6 h-6 mb-7 text-white/80" />
                      ) : modo === 'leitura' && capaVisivel ? (
                        <span className="w-6 h-9 mb-5 rounded-[3px] bg-cover bg-center ring-1 ring-black/10" style={{ backgroundImage: `url(${livro.capa_url})`, boxShadow: '0 3px 8px rgba(0,0,0,0.35)' }} />
                      ) : (
                        <span className="w-8 h-1.5 rounded-full mb-5" style={{ background: transparente ? (corAdesivo === 'claro' ? '#fff' : '#1B2A4A') : m.cores[1] }} />
                      )}
                    </span>
                    <span className={`text-xs ${ativo ? 'font-semibold text-marinho dark:text-bege' : 'text-texto/60 dark:text-bege/60'}`}>{m.nome}</span>
                  </button>
                )
              })}
          </div>
          {modo === 'leitura' && (
            <div className="cartao px-4 py-3 mt-3 space-y-3">
              <Alternar ligado={capaVisivel} onMudar={(v) => mudarMostrarCapa(v)} titulo="Mostrar a capa do livro"
                detalhe={!livro.capa_url ? 'Este livro não tem capa cadastrada' : !mostrarLivro ? 'Ligue “Mostrar nome do livro” para a capa aparecer' : capaVisivel ? 'A capa entra no modelo escolhido' : 'O modelo sai com o emblema do clube'} />
              {capaVisivel && transparente && modeloLeitura === 'lendo' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setCapaLado(false)} aria-pressed={!capaLado} className={`chip ${!capaLado ? 'chip-ativo' : ''}`}>Capa em cima</button>
                  <button onClick={() => setCapaLado(true)} aria-pressed={capaLado} className={`chip ${capaLado ? 'chip-ativo' : ''}`}>Capa ao lado</button>
                </div>
              )}
              {capaVisivel && capaBaixa && (
                <p className="text-xs text-dourado-escuro dark:text-dourado">A capa deste livro está em baixa resolução e pode sair borrada. O admin pode enviar uma foto maior da capa em Painel do admin, Editar livro e capa.</p>
              )}
            </div>
          )}
          {listaVersoes.length > 1 && !transparente && (
            <div className="mt-2">
              <h3 className="text-xs font-semibold text-texto/55 dark:text-bege/55 mb-1.5">Versão</h3>
              <div className="flex flex-wrap gap-2">
                {listaVersoes.map((nome, i) => (
                  <button key={nome} onClick={() => escolherVersao(i)} aria-pressed={versao === i} className={`chip ${versao === i ? 'chip-ativo' : ''}`}>{nome}</button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Fonte */}
        <section className="mt-4">
          <h2 className="rotulo">Fonte</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sem-barra">
            {FONTES_CARTAO.map((f) => (
              <button key={f.id} onClick={() => setFonteCartao(f.id)} aria-pressed={fonteCartao === f.id}
                className={`shrink-0 rounded-xl border px-3.5 py-2 text-left transition-colors ${fonteCartao === f.id ? 'border-dourado bg-dourado/10' : 'border-marinho/15 dark:border-bege/15'}`}>
                <span className="block text-[19px] leading-tight text-marinho dark:text-bege" style={{ fontFamily: f.css }}>Aa</span>
                <span className={`block text-[11px] ${fonteCartao === f.id ? 'font-semibold text-dourado-escuro dark:text-dourado' : 'text-texto/55 dark:text-bege/55'}`}>{f.nome}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Foto */}
        {aceitaFoto && (
          <section className="cartao p-4 mt-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-dourado/15 text-dourado-escuro dark:text-dourado flex items-center justify-center shrink-0">
              <Icone nome="camera" />
            </span>
            <p className="text-sm text-texto/70 dark:text-bege/70 flex-1">
              {modo === 'texto' && modeloTexto === 'polaroid'
                ? foto ? 'Foto escolhida. Ela entra na moldura branca; ajuste logo abaixo.' : 'Opcional: sem foto, a moldura mostra o emblema do clube.'
                : foto ? 'Foto escolhida. Ajuste zoom, posição, giro e filtro logo abaixo.' : 'Use uma foto sua: o livro aberto, a mesa de estudo, o encontro.'}
            </p>
            <input ref={fotoRef} type="file" accept="image/*" onChange={escolherFoto} className="hidden" />
            <div className="flex flex-col gap-1">
              <button onClick={() => fotoRef.current?.click()} className="rounded-lg bg-marinho dark:bg-dourado text-bege dark:text-noite px-3 py-1.5 text-sm font-semibold">
                {foto ? 'Trocar' : 'Escolher'}
              </button>
              {foto && <button onClick={() => setFoto(null)} className="text-xs text-texto/50 dark:text-bege/50">Remover</button>}
            </div>
          </section>
        )}
        {editandoFoto && (
          <EditorFoto ajuste={ajuste} onMudar={(a) => setAjuste(a)} comEscurecer={modo === 'leitura' || ['foto', 'foto-faixa', 'foto-destaque'].includes(modeloTexto)} />
        )}

        {/* Conteúdo */}
        {modo === 'texto' ? (
          <section className="cartao p-5 mt-4 space-y-4">
            <div className="grid grid-cols-4 gap-1.5">
              {TIPOS.map((t) => (
                <button key={t.id} onClick={() => { setTipo(t.id); setLegendaEditada(false) }}
                  className={`rounded-xl border py-2.5 flex flex-col items-center gap-1 text-sm font-medium transition-colors ${
                    tipo === t.id ? 'border-dourado bg-dourado/10 text-dourado-escuro dark:text-dourado' : 'border-marinho/15 dark:border-bege/15 text-texto/60 dark:text-bege/60'
                  }`}>
                  <Icone nome={t.icone} />
                  {t.rotulo}
                </button>
              ))}
            </div>

            {notas.length > 0 && (
              <div>
                <label className="rotulo" htmlFor="usar-nota">Usar uma anotação sua</label>
                <select id="usar-nota" className="campo" defaultValue="" onChange={(e) => usarNota(e.target.value)}>
                  <option value="" disabled>Escolher…</option>
                  {notas.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.pagina ? `p. ${n.pagina}: ` : ''}{n.texto.slice(0, 60)}{n.texto.length > 60 ? '…' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="rotulo" htmlFor="texto-cartao">{tipo === 'trecho' ? 'Trecho do livro' : tipo === 'reflexao' ? 'Sua reflexão' : tipo === 'aplicacao' ? 'O que você vai aplicar' : 'Sua pergunta'}</label>
              <textarea
                id="texto-cartao" rows={5} maxLength={LIMITE_TEXTO} value={texto}
                onChange={(e) => { setTexto(e.target.value); setLegendaEditada(false) }}
                placeholder={tipo === 'trecho' ? 'Copie a frase exatamente como está no livro.' : tipo === 'reflexao' ? 'O que essa leitura te fez pensar?' : tipo === 'aplicacao' ? 'O que você quer praticar a partir desta leitura?' : 'Uma dúvida para examinar ou levar ao encontro.'}
                className={`campo resize-y ${tipo === 'trecho' ? 'font-serif italic text-[18px]' : ''}`}
              />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-texto/45 dark:text-bege/45">
                  {partes.length > 1 ? `Vai em ${partes.length} imagens neste formato` : `Cabe em 1 imagem (até ${limiteDeCaracteres(modeloTexto, formato)} caracteres)`}
                </span>
                <span className="text-texto/45 dark:text-bege/45 flex items-center gap-3">
                  {texto && <button onClick={() => { setTexto(''); setLegendaEditada(false) }} className="underline underline-offset-2">Limpar</button>}
                  {texto.length}/{LIMITE_TEXTO}
                </span>
              </div>
            </div>

            <div className="w-24">
              <label className="rotulo" htmlFor="pag-cartao">Página</label>
              <input id="pag-cartao" type="number" inputMode="numeric" min={1} value={pagina} onChange={(e) => setPagina(e.target.value)} className="campo text-center" />
            </div>
          </section>
        ) : (
          <section className="cartao p-5 mt-4">
            <dl className={`grid ${contagem ? "grid-cols-4" : "grid-cols-3"} text-center`}>
              <Num valor={`${leitura.pct}%`} rotulo="lido" />
              <Num valor={leitura.paginasLivro} rotulo="página" />
              <Num valor={leitura.paginasSemana} rotulo="na semana" />
              {contagem && <Num valor={leitura.seq.dias} rotulo="dias seguidos" />}
            </dl>
            {modeloLeitura === 'terminei' && leitura.pct < 100 && <Dica>Esse modelo é para quando você terminar o livro.</Dica>}
            {modeloLeitura === 'constancia' && leitura.seq.dias === 0 && <Dica>Você ainda não tem dias seguidos. Registre uma leitura hoje para começar.</Dica>}
            {modeloLeitura === 'retrospectiva' && retro && retro.dias === 0 && <Dica>Você ainda não registrou leitura neste livro.</Dica>}
            {modeloLeitura === 'semana' && leitura.paginasSemana === 0 && <Dica>Nenhuma página registrada nesta semana ainda.</Dica>}
          </section>
        )}

        {/* O que aparece */}
        <section className="cartao p-4 mt-4 space-y-3">
          <Alternar ligado={mostrarLivro} onMudar={setMostrarLivro} titulo="Mostrar nome do livro e autor"
            detalhe={mostrarLivro ? `Aparece ${livro.titulo}${livro.autor ? `, ${livro.autor}` : ''}` : 'O cartão sai sem o livro (bom para frases e reflexões gerais)'} />
          {modo === 'texto' && autorTexto !== perfil.nome_exibicao ? (
            <Alternar ligado={mostrarNome} onMudar={setMostrarNome} titulo="Mostrar quem escreveu" detalhe={`${autorTexto} (anotação do mural)`} />
          ) : (
            <Alternar ligado={mostrarNome} onMudar={setMostrarNome} titulo="Mostrar meu nome" detalhe={perfil.nome_exibicao} />
          )}
        </section>

        {/* Legenda */}
        <section className="mt-5">
          <div className="flex items-baseline justify-between">
            <label className="rotulo" htmlFor="legenda">Legenda</label>
            {legendaEditada && <button onClick={() => setLegendaEditada(false)} className="botao-texto text-xs">Refazer automática</button>}
          </div>
          <textarea id="legenda" rows={4} value={legenda} onChange={(e) => { setLegenda(e.target.value); setLegendaEditada(true) }}
            className="campo resize-y text-[15px]" placeholder="O texto que vai junto com a imagem." />
        </section>

        {/* Ações */}
        <div className="mt-5 space-y-2">
          <button onClick={compartilhar} disabled={!podeGerar || enviando || (precisaFoto && !foto)} className="botao-primario flex items-center justify-center gap-2 text-[17px]">
            <Icone nome="compartilhar" className="w-5 h-5" />
            {enviando ? 'Preparando…' : partes.length > 1 && modo === 'texto' ? `Compartilhar ${partes.length} imagens e legenda` : 'Compartilhar imagem e legenda'}
          </button>
          {precisaFoto && !foto && <p className="text-xs text-center text-texto/50 dark:text-bege/50">Escolha uma foto para esse modelo.</p>}
          <div className="grid grid-cols-3 gap-2">
            <BotaoAcao icone="baixar" rotulo={transparente ? 'Baixar PNG' : 'Baixar'} onClick={baixar} desativado={!podeGerar || (precisaFoto && !foto)} />
            <BotaoAcao icone="copiar" rotulo="Copiar legenda" onClick={() => copiarTexto(legenda)} desativado={!legenda} />
            <BotaoAcao icone="whatsapp" rotulo="WhatsApp" desativado={!legenda}
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(legenda)}`, '_blank', 'noopener')} />
          </div>
          <p className="text-xs text-center text-texto/40 dark:text-bege/40 pt-1">
            No celular, “Compartilhar” abre o Instagram, WhatsApp e outros apps com a imagem. O botão do WhatsApp envia só o texto.
          </p>
        </div>
      </div>
    </div>
  )
}

function EditorFoto({ ajuste, onMudar, comEscurecer }: { ajuste: AjusteFoto; onMudar: (a: AjusteFoto) => void; comEscurecer: boolean }) {
  const mudar = (parcial: Partial<AjusteFoto>) => onMudar({ ...ajuste, ...parcial })
  const zoomPct = Math.round(ajuste.zoom * 100)
  return (
    <section className="cartao p-4 mt-3 space-y-4 animate-subir-suave" aria-label="Ajustar a foto">
      <div className="flex items-baseline justify-between">
        <h2 className="titulo-secao text-[17px]">Ajustar a foto</h2>
        <button onClick={() => onMudar({ ...AJUSTE_PADRAO })} className="botao-texto text-xs">Recomeçar</button>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm text-texto/70 dark:text-bege/70 mb-1">
          <label htmlFor="zoom-foto">Zoom</label>
          <span className="tabular text-xs">{zoomPct}%</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => mudar({ zoom: Math.max(0.5, +(ajuste.zoom - 0.1).toFixed(2)) })} className="chip w-10" aria-label="Diminuir zoom">−</button>
          <input id="zoom-foto" type="range" min={0.5} max={4} step={0.05} value={ajuste.zoom}
            onChange={(e) => mudar({ zoom: Number(e.target.value) })} className="flex-1 accent-[#B8912F]" />
          <button onClick={() => mudar({ zoom: Math.min(4, +(ajuste.zoom + 0.1).toFixed(2)) })} className="chip w-10" aria-label="Aumentar zoom">+</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => mudar({ rot: (((ajuste.rot + 90) % 360) as AjusteFoto['rot']) })} className="chip">Girar 90°</button>
        <button onClick={() => mudar({ espelhar: !ajuste.espelhar })} aria-pressed={ajuste.espelhar} className={`chip ${ajuste.espelhar ? 'chip-ativo' : ''}`}>Espelhar</button>
        <button onClick={() => mudar({ dx: 0, dy: 0 })} className="chip">Centralizar</button>
      </div>

      <div>
        <p className="text-sm text-texto/70 dark:text-bege/70 mb-1.5">Enquadramento</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => mudar({ modo: 'preencher', zoom: 1, dx: 0, dy: 0 })} aria-pressed={ajuste.modo === 'preencher'} className={`chip ${ajuste.modo === 'preencher' ? 'chip-ativo' : ''}`}>Preencher</button>
          <button onClick={() => mudar({ modo: 'caber', zoom: 1, dx: 0, dy: 0 })} aria-pressed={ajuste.modo === 'caber'} className={`chip ${ajuste.modo === 'caber' ? 'chip-ativo' : ''}`}>Caber inteira</button>
        </div>
        {ajuste.modo === 'caber' && (
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs text-texto/55 dark:text-bege/55 self-center mr-1">Fundo:</span>
            {FUNDOS_CABER.map(([id, nome]) => (
              <button key={id} onClick={() => mudar({ fundo: id })} aria-pressed={ajuste.fundo === id} className={`chip ${ajuste.fundo === id ? 'chip-ativo' : ''}`}>{nome}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-sm text-texto/70 dark:text-bege/70 mb-1.5">Filtro</p>
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(([id, nome]) => (
            <button key={id} onClick={() => mudar({ filtro: id })} aria-pressed={ajuste.filtro === id} className={`chip ${ajuste.filtro === id ? 'chip-ativo' : ''}`}>{nome}</button>
          ))}
        </div>
      </div>

      {comEscurecer && (
        <div>
          <div className="flex items-center justify-between text-sm text-texto/70 dark:text-bege/70 mb-1">
            <label htmlFor="escurecer-foto">Escurecimento</label>
            <span className="tabular text-xs">{ajuste.escurecer}%</span>
          </div>
          <input id="escurecer-foto" type="range" min={0} max={100} step={5} value={ajuste.escurecer}
            onChange={(e) => mudar({ escurecer: Number(e.target.value) })} className="w-full accent-[#B8912F]" />
          <p className="text-xs text-texto/45 dark:text-bege/45 mt-1">Mais escuro deixa o texto mais fácil de ler sobre a foto.</p>
        </div>
      )}
    </section>
  )
}

function Segmentado<T extends string>({ valor, opcoes, onMudar, className = '' }: { valor: T; opcoes: [T, string][]; onMudar: (v: T) => void; className?: string }) {
  return (
    <div className={`grid p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] ${className}`} style={{ gridTemplateColumns: `repeat(${opcoes.length}, 1fr)` }} role="tablist">
      {opcoes.map(([v, rotulo]) => (
        <button key={v} role="tab" aria-selected={valor === v} onClick={() => onMudar(v)}
          className={`rounded-lg py-2 text-sm font-semibold transition-colors ${valor === v ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
          {rotulo}
        </button>
      ))}
    </div>
  )
}

function Alternar({ ligado, onMudar, titulo, detalhe }: { ligado: boolean; onMudar: (v: boolean) => void; titulo: string; detalhe: string }) {
  return (
    <button onClick={() => onMudar(!ligado)} role="switch" aria-checked={ligado} className="w-full flex items-center gap-3 text-left">
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-medium text-marinho dark:text-bege">{titulo}</span>
        <span className="block text-xs text-texto/50 dark:text-bege/50 truncate">{detalhe}</span>
      </span>
      <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${ligado ? 'bg-dourado' : 'bg-marinho/20 dark:bg-bege/20'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  )
}

function Num({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return (
    <div>
      <dd className="font-serif tabular text-2xl text-marinho dark:text-bege">{valor}</dd>
      <dt className="text-[11px] text-texto/50 dark:text-bege/50">{rotulo}</dt>
    </div>
  )
}

function Dica({ children }: { children: ReactNode }) {
  return <p className="text-xs text-dourado-escuro dark:text-dourado mt-4 text-center">{children}</p>
}

function Girando() {
  return <span className="absolute top-3 right-3 w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
}

function BotaoAcao({ icone, rotulo, onClick, desativado }: { icone: NomeIcone; rotulo: string; onClick: () => void; desativado?: boolean }) {
  return (
    <button onClick={onClick} disabled={desativado}
      className="rounded-xl border border-marinho/15 dark:border-bege/15 py-2.5 flex flex-col items-center gap-1 text-xs font-semibold text-marinho dark:text-bege hover:border-dourado disabled:opacity-40 transition-colors">
      <Icone nome={icone} className="w-5 h-5" />
      {rotulo}
    </button>
  )
}

function encurtar(t: string, max: number) {
  const limpo = t.trim()
  if (limpo.length <= max) return limpo
  const corte = limpo.slice(0, max)
  return corte.slice(0, Math.max(corte.lastIndexOf(' '), max - 20)).replace(/[,;:.\s]+$/, '') + '…'
}
