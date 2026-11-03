import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { supabase, type Perfil } from '../lib/supabase'
import { useMinhaLeitura } from '../lib/leitura'
import { useAviso } from '../components/Toast'
import Icone, { type NomeIcone } from '../components/Icone'
import {
  FORMATOS, MODELOS_LEITURA, MODELOS_TEXTO, arquivoParaImagem, canvasParaArquivo, carregarImagem,
  desenharAdesivo, desenharLeitura, desenharTexto, dividirTexto, limiteDeCaracteres, SO_COM_FUNDO,
  type CorAdesivo, type Formato, type ModeloLeitura, type ModeloTexto, type TipoTexto
} from '../lib/cartoes'
import type { LivroAtivo } from './Inicio'
import { calcularPanorama, calcularRetrospectiva, type Panorama, type Retrospectiva } from '../lib/infograficos'
import { formatarData } from '../lib/estatisticas'

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
  { id: 'pergunta', rotulo: 'Pergunta', icone: 'interrogacao' }
]

const LIMITE_TEXTO = 1500

export default function Compartilhar({ perfil, livro, preCarga }: Props) {
  const leitura = useMinhaLeitura(perfil, livro)
  const [modo, setModo] = useState<'texto' | 'leitura'>(preCarga?.modo ?? 'texto')
  const [formato, setFormato] = useState<Formato>('story')
  const [modeloTexto, setModeloTexto] = useState<ModeloTexto>('pergaminho')
  const [modeloLeitura, setModeloLeitura] = useState<ModeloLeitura>(preCarga?.modeloLeitura ?? 'lendo')
  const [tipo, setTipo] = useState<TipoTexto>(preCarga?.tipo ?? 'trecho')
  const [texto, setTexto] = useState(preCarga?.texto ?? '')
  const [pagina, setPagina] = useState(preCarga?.pagina ? String(preCarga.pagina) : '')
  const [mostrarNome, setMostrarNome] = useState(true)
  // o nome no cartão de frase é de quem escreveu: você, ou o membro do mural
  const [autorTexto, setAutorTexto] = useState(preCarga?.autor ?? perfil.nome_exibicao)
  const [mostrarLivro, setMostrarLivro] = useState(true)
  const [fundo, setFundo] = useState<'com' | 'transparente'>('com')
  const [corAdesivo, setCorAdesivo] = useState<CorAdesivo>('claro')
  const [parte, setParte] = useState(0)
  const [foto, setFoto] = useState<HTMLImageElement | null>(null)
  const [capa, setCapa] = useState<HTMLImageElement | null>(null)
  const [notas, setNotas] = useState<NotaResumo[]>([])
  const [legenda, setLegenda] = useState('')
  const [legendaEditada, setLegendaEditada] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [retro, setRetro] = useState<Retrospectiva | null>(null)
  const [panorama, setPanorama] = useState<Panorama | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

  const transparente = modo === 'leitura' && fundo === 'transparente'
  const precisaFoto = !transparente && ((modo === 'texto' && modeloTexto === 'foto') || (modo === 'leitura' && modeloLeitura === 'foto-leitura'))
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
  const dadosLeitura = {
    titulo: mostrarLivro ? livro.titulo : '',
    autor: mostrarLivro ? livro.autor : null,
    capa: mostrarLivro ? capa : null,
    pct: leitura.pct,
    paginas: leitura.paginasLivro,
    total: livro.paginas_totais,
    sequencia: leitura.seq.dias,
    nome: mostrarNome ? perfil.nome_exibicao : null,
    foto,
    semana,
    retro: retro ? {
      paginas: retro.paginas,
      dias: retro.dias,
      maiorSequencia: retro.maiorSequencia,
      minutos: retro.minutos,
      anotacoes: retro.anotacoes.trecho + retro.anotacoes.reflexao + retro.anotacoes.pergunta,
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
      mural: panorama.mural.trecho + panorama.mural.reflexao + panorama.mural.pergunta,
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
          ? `Minha leitura de${de}: ${retro.paginas} páginas em ${retro.dias} ${retro.dias === 1 ? 'dia' : 'dias'}${retro.anotacoes.trecho + retro.anotacoes.reflexao + retro.anotacoes.pergunta ? `, com ${retro.anotacoes.trecho + retro.anotacoes.reflexao + retro.anotacoes.pergunta} anotações` : ''}. Clube do Livro Bereanos.`
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
        tipo, texto: partes[indiceParte], fonte, nome: mostrarNome ? autorTexto : null, foto,
        parte: partes.length > 1 ? { i: indiceParte + 1, n: partes.length } : undefined
      })
    } else if (transparente) {
      await desenharAdesivo(canvas, modeloLeitura, dadosLeitura, corAdesivo)
    } else {
      await desenharLeitura(canvas, modeloLeitura, formato, dadosLeitura)
    }
  }

  // redesenha a prévia (com pequena espera para não travar enquanto digita)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || leitura.carregando) return
    setGerando(true)
    let cancelado = false
    const t = setTimeout(async () => {
      try {
        await desenharEm(canvas)
      } catch (e) {
        console.error('Falha ao desenhar o cartão:', e)
      } finally {
        if (!cancelado) setGerando(false)
      }
    }, 160)
    return () => { cancelado = true; clearTimeout(t) }
  }, [modo, formato, modeloTexto, modeloLeitura, tipo, partes, parteAtual, fonte, mostrarNome, autorTexto, mostrarLivro, foto, capa,
      leitura.carregando, leitura.pct, leitura.seq.dias, leitura.paginasSemana, fundo, corAdesivo, retro, panorama])

  async function escolherFoto(e: ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0]
    e.target.value = ''
    if (!arq) return
    try {
      setFoto(await arquivoParaImagem(arq))
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
              className="relative rounded-2xl overflow-hidden shadow-xl shadow-marinho/20 ring-1 ring-black/5 bg-marinho/5"
              style={{ aspectRatio: `${w} / ${h}`, height: formato === 'story' ? 'min(62vh, 560px)' : formato === 'post' ? 'min(50vh, 440px)' : 'min(42vh, 360px)' }}
            >
              <canvas ref={canvasRef} className="w-full h-full block" aria-label="Prévia da imagem" />
              {gerando && <Girando />}
            </div>
          )}
        </div>

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
              .filter((m) => !(transparente && SO_COM_FUNDO.includes(m.id as ModeloLeitura)))
              .map((m) => {
                const ativo = modo === 'texto' ? modeloTexto === m.id : modeloLeitura === m.id
                return (
                  <button
                    key={m.id}
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
                      {m.id === 'foto' || m.id === 'foto-leitura' ? (
                        <Icone nome="camera" className="w-6 h-6 mb-7 text-white/80" />
                      ) : (
                        <span className="w-8 h-1.5 rounded-full mb-5" style={{ background: transparente ? (corAdesivo === 'claro' ? '#fff' : '#1B2A4A') : m.cores[1] }} />
                      )}
                    </span>
                    <span className={`text-xs ${ativo ? 'font-semibold text-marinho dark:text-bege' : 'text-texto/60 dark:text-bege/60'}`}>{m.nome}</span>
                  </button>
                )
              })}
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
                ? foto ? 'Foto escolhida. Ela entra na moldura branca.' : 'Opcional: sem foto, a moldura mostra o emblema do clube.'
                : foto ? 'Foto escolhida. O texto fica por cima, com um escurecimento para dar leitura.' : 'Use uma foto sua: o livro aberto, a mesa de estudo, o encontro.'}
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

        {/* Conteúdo */}
        {modo === 'texto' ? (
          <section className="cartao p-5 mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
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
              <label className="rotulo" htmlFor="texto-cartao">{tipo === 'trecho' ? 'Trecho do livro' : tipo === 'reflexao' ? 'Sua reflexão' : 'Sua pergunta'}</label>
              <textarea
                id="texto-cartao" rows={5} maxLength={LIMITE_TEXTO} value={texto}
                onChange={(e) => { setTexto(e.target.value); setLegendaEditada(false) }}
                placeholder={tipo === 'trecho' ? 'Copie a frase exatamente como está no livro.' : tipo === 'reflexao' ? 'O que essa leitura te fez pensar?' : 'Uma dúvida para examinar ou levar ao encontro.'}
                className={`campo resize-y ${tipo === 'trecho' ? 'font-serif italic text-[18px]' : ''}`}
              />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-texto/45 dark:text-bege/45">
                  {partes.length > 1 ? `Vai em ${partes.length} imagens neste formato` : `Cabe em 1 imagem (até ${limiteDeCaracteres(modeloTexto, formato)} caracteres)`}
                </span>
                <span className="text-texto/45 dark:text-bege/45">{texto.length}/{LIMITE_TEXTO}</span>
              </div>
            </div>

            <div className="w-24">
              <label className="rotulo" htmlFor="pag-cartao">Página</label>
              <input id="pag-cartao" type="number" inputMode="numeric" min={1} value={pagina} onChange={(e) => setPagina(e.target.value)} className="campo text-center" />
            </div>
          </section>
        ) : (
          <section className="cartao p-5 mt-4">
            <dl className="grid grid-cols-4 text-center">
              <Num valor={`${leitura.pct}%`} rotulo="lido" />
              <Num valor={leitura.paginasLivro} rotulo="página" />
              <Num valor={leitura.paginasSemana} rotulo="na semana" />
              <Num valor={leitura.seq.dias} rotulo="dias seguidos" />
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
