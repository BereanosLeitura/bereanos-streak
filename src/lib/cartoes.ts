// Motor dos cartões de compartilhamento (imagens para Instagram, WhatsApp etc.).
// Tudo é desenhado em <canvas>. A logo do clube entra sempre como arquivo
// oficial (preta ou branca), com a proporção preservada: nunca é redesenhada,
// recolorida ou esticada.

export type Formato = 'story' | 'post' | 'quadrado'
export type TipoTexto = 'trecho' | 'reflexao' | 'pergunta'
export type ModeloTexto = 'pergaminho' | 'marinho' | 'caderno' | 'noturno' | 'debate' | 'polaroid' | 'foto' | 'minimal'
export type ModeloLeitura = 'lendo' | 'progresso' | 'anel' | 'semana' | 'constancia' | 'terminei' | 'foto-leitura' | 'retrospectiva' | 'grupo'

export const FORMATOS: Record<Formato, { w: number; h: number; rotulo: string; dica: string }> = {
  story: { w: 1080, h: 1920, rotulo: 'Story', dica: 'Instagram e WhatsApp Status' },
  post: { w: 1080, h: 1350, rotulo: 'Post', dica: 'Feed do Instagram' },
  quadrado: { w: 1080, h: 1080, rotulo: 'Quadrado', dica: 'WhatsApp e Facebook' }
}

export const MODELOS_TEXTO: { id: ModeloTexto; nome: string; cores: [string, string] }[] = [
  { id: 'pergaminho', nome: 'Pergaminho', cores: ['#F6F1E3', '#B8912F'] },
  { id: 'marinho', nome: 'Marinho', cores: ['#1B2A4A', '#B8912F'] },
  { id: 'caderno', nome: 'Caderno', cores: ['#1A1A1A', '#FFFCF4'] },
  { id: 'noturno', nome: 'Noturno', cores: ['#141414', '#B8912F'] },
  { id: 'debate', nome: 'Debate', cores: ['#1B2A4A', '#F6F1E3'] },
  { id: 'polaroid', nome: 'Polaroid', cores: ['#EDE6D3', '#FFFFFF'] },
  { id: 'foto', nome: 'Foto inteira', cores: ['#3a3a3a', '#F6F1E3'] },
  { id: 'minimal', nome: 'Minimal', cores: ['#FFFCF4', '#1B2A4A'] }
]

export const MODELOS_LEITURA: { id: ModeloLeitura; nome: string; cores: [string, string] }[] = [
  { id: 'lendo', nome: 'Estou lendo', cores: ['#1B2A4A', '#F6F1E3'] },
  { id: 'progresso', nome: 'Progresso', cores: ['#F6F1E3', '#8A6D2B'] },
  { id: 'anel', nome: 'Anel', cores: ['#1B2A4A', '#B8912F'] },
  { id: 'semana', nome: 'Minha semana', cores: ['#FFFCF4', '#B8912F'] },
  { id: 'constancia', nome: 'Constância', cores: ['#141414', '#B8912F'] },
  { id: 'terminei', nome: 'Terminei', cores: ['#FFFCF4', '#B8912F'] },
  { id: 'foto-leitura', nome: 'Sua foto', cores: ['#3a3a3a', '#B8912F'] },
  { id: 'retrospectiva', nome: 'Retrospectiva', cores: ['#1B2A4A', '#B8912F'] },
  { id: 'grupo', nome: 'O clube', cores: ['#F6F1E3', '#1B2A4A'] }
]

/** Modelos que dependem da página inteira e não viram adesivo sem fundo. */
export const SO_COM_FUNDO: ModeloLeitura[] = ['foto-leitura', 'retrospectiva', 'grupo']

export interface DadosTexto {
  tipo: TipoTexto
  texto: string
  fonte: string // ex.: "C. S. Lewis, Cartas de um Diabo a Seu Aprendiz, p. 12"
  nome: string | null
  foto: HTMLImageElement | null
  parte?: { i: number; n: number } // texto longo dividido em vários cartões
}

export interface DadosLeitura {
  titulo: string
  autor: string | null
  capa: HTMLImageElement | null
  pct: number
  paginas: number
  total: number
  sequencia: number
  nome: string | null
  foto: HTMLImageElement | null
  semana?: { rotulo: string; paginas: number }[]
  retro?: {
    paginas: number; dias: number; maiorSequencia: number; minutos: number; anotacoes: number
    melhorDia: { rotulo: string; paginas: number } | null
    periodo: string | null
    trecho: string | null
  }
  grupo?: {
    paginas: number; leitores: number; terminaram: number; mural: number; mediaPct: number
    dias: { rotulo: string; paginas: number }[]
  }
}

// ---------- cores e fontes ----------
const C = {
  marinho: '#1B2A4A',
  dourado: '#B8912F',
  douradoEscuro: '#8A6D2B',
  bege: '#F6F1E3',
  folha: '#FFFCF4',
  texto: '#222222',
  preto: '#1A1A1A'
}
const SERIFA = '"EB Garamond", Garamond, "Times New Roman", serif'
const SANS = '"Source Sans 3", system-ui, sans-serif'

const ROTULO_TIPO: Record<TipoTexto, string> = {
  trecho: 'Trecho',
  reflexao: 'Reflexão',
  pergunta: 'Pergunta para o encontro'
}

// ---------- carregamento ----------
const cacheImg = new Map<string, Promise<HTMLImageElement>>()

export function carregarImagem(src: string): Promise<HTMLImageElement> {
  if (!cacheImg.has(src)) {
    cacheImg.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => {
          cacheImg.delete(src)
          reject(new Error('imagem não carregou: ' + src))
        }
        img.src = src
      })
    )
  }
  return cacheImg.get(src)!
}

type NomeLogo = 'simbolo' | 'horizontal' | 'vertical' | 'texto'
function logo(nome: NomeLogo, cor: 'preto' | 'branco') {
  return carregarImagem(`/logo/${nome}-${cor}.png`)
}

let fontesProntas: Promise<unknown> | null = null
function garantirFontes() {
  if (!fontesProntas) {
    fontesProntas = Promise.all(
      [
        `400 40px ${SERIFA}`, `italic 400 40px ${SERIFA}`, `500 40px ${SERIFA}`,
        `600 40px ${SERIFA}`, `700 40px ${SERIFA}`, `italic 500 40px ${SERIFA}`,
        `400 40px ${SANS}`, `600 40px ${SANS}`, `700 40px ${SANS}`
      ].map((f) => document.fonts.load(f))
    ).catch(() => {})
  }
  return fontesProntas
}

/** Lê um arquivo escolhido pelo usuário (foto) como imagem. */
export function arquivoParaImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = leitor.result as string
    }
    leitor.onerror = reject
    leitor.readAsDataURL(arquivo)
  })
}

// ---------- utilitários de desenho ----------
function quebrar(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number): string[] {
  const linhas: string[] = []
  for (const paragrafo of texto.split(/\n+/)) {
    const palavras = paragrafo.trim().split(/\s+/).filter(Boolean)
    let linha = ''
    for (const p of palavras) {
      const teste = linha ? linha + ' ' + p : p
      if (ctx.measureText(teste).width > larguraMax && linha) {
        linhas.push(linha)
        linha = p
      } else {
        linha = teste
      }
    }
    if (linha) linhas.push(linha)
  }
  return linhas
}

interface Ajuste { tam: number; linhas: string[]; alturaLinha: number; alturaTotal: number }

/** Encontra o maior tamanho de fonte em que o texto cabe na caixa. */
function ajustar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMax: number,
  alturaMax: number,
  fonte: (tam: number) => string,
  maxTam: number,
  minTam: number,
  entrelinha = 1.3
): Ajuste {
  for (let tam = maxTam; tam >= minTam; tam -= 2) {
    ctx.font = fonte(tam)
    const linhas = quebrar(ctx, texto, larguraMax)
    const alturaLinha = tam * entrelinha
    const alturaTotal = linhas.length * alturaLinha
    if (alturaTotal <= alturaMax) return { tam, linhas, alturaLinha, alturaTotal }
  }
  ctx.font = fonte(minTam)
  let linhas = quebrar(ctx, texto, larguraMax)
  const alturaLinha = minTam * entrelinha
  const maxLinhas = Math.max(1, Math.floor(alturaMax / alturaLinha))
  if (linhas.length > maxLinhas) {
    linhas = linhas.slice(0, maxLinhas)
    linhas[maxLinhas - 1] = linhas[maxLinhas - 1].replace(/\s*\S*$/, '') + '…'
  }
  return { tam: minTam, linhas, alturaLinha, alturaTotal: linhas.length * alturaLinha }
}

function escrever(
  ctx: CanvasRenderingContext2D,
  linhas: string[],
  x: number,
  yTopo: number,
  alturaLinha: number,
  tam: number,
  alinhar: CanvasTextAlign = 'center'
) {
  ctx.textAlign = alinhar
  ctx.textBaseline = 'alphabetic'
  linhas.forEach((l, i) => ctx.fillText(l, x, yTopo + i * alturaLinha + tam * 0.95))
}

function texto1(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, fonte: string, cor: string, alinhar: CanvasTextAlign = 'center', larguraMax?: number) {
  ctx.font = fonte
  ctx.fillStyle = cor
  ctx.textAlign = alinhar
  ctx.textBaseline = 'alphabetic'
  if (larguraMax) {
    let s = t
    while (ctx.measureText(s).width > larguraMax && s.length > 4) s = s.slice(0, -2)
    if (s !== t) s = s.trimEnd() + '…'
    ctx.fillText(s, x, y)
  } else {
    ctx.fillText(t, x, y)
  }
}

function desenharLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cx: number, y: number, largura: number) {
  const altura = largura * (img.height / img.width)
  ctx.drawImage(img, cx - largura / 2, y, largura, altura)
  return altura
}

function desenharLogoAltura(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, altura: number, alinhar: 'esq' | 'centro' | 'dir' = 'centro') {
  const largura = altura * (img.width / img.height)
  const x0 = alinhar === 'esq' ? x : alinhar === 'dir' ? x - largura : x - largura / 2
  ctx.drawImage(img, x0, y, largura, altura)
  return largura
}

function cobrir(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height)
  const sw = w / r
  const sh = h / r
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

function ornamento(ctx: CanvasRenderingContext2D, cx: number, y: number, largura: number, cor = C.dourado) {
  ctx.save()
  ctx.strokeStyle = cor
  ctx.globalAlpha = 0.75
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - largura / 2, y)
  ctx.lineTo(cx + largura / 2, y)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.fillStyle = cor
  ctx.translate(cx, y)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-9, -9, 18, 18)
  ctx.restore()
}

function moldura(ctx: CanvasRenderingContext2D, W: number, H: number, cor = C.dourado) {
  ctx.save()
  ctx.strokeStyle = cor
  ctx.lineWidth = 5
  ctx.strokeRect(40, 40, W - 80, H - 80)
  ctx.lineWidth = 1.5
  ctx.strokeRect(58, 58, W - 116, H - 116)
  ctx.restore()
}

function retArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const raio = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + raio, y)
  ctx.arcTo(x + w, y, x + w, y + h, raio)
  ctx.arcTo(x + w, y + h, x, y + h, raio)
  ctx.arcTo(x, y + h, x, y, raio)
  ctx.arcTo(x, y, x + w, y, raio)
  ctx.closePath()
}

function barra(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pct: number, fundo: string, cor: string) {
  ctx.fillStyle = fundo
  retArredondado(ctx, x, y, w, h, h / 2)
  ctx.fill()
  if (pct > 0) {
    ctx.fillStyle = cor
    retArredondado(ctx, x, y, Math.max(h, (w * Math.min(100, pct)) / 100), h, h / 2)
    ctx.fill()
  }
}

function sombraEscura(ctx: CanvasRenderingContext2D, W: number, H: number, forte = 0.82) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(10,14,26,0.55)')
  g.addColorStop(0.35, 'rgba(10,14,26,0.25)')
  g.addColorStop(0.6, 'rgba(10,14,26,0.55)')
  g.addColorStop(1, `rgba(10,14,26,${forte})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

const CHAMA = new Path2D('M12 21c-3.6 0-6-2.4-6-5.6 0-3.3 2.4-5.2 3.6-7.9.4 1.6 1.2 2.6 2.2 3.2.2-2.8 1.4-5.2 3.6-7.2-.3 3.2 2.6 5.5 2.6 9.5 0 3.7-2.6 8-6 8z')

/** Margens seguras: no story, o Instagram cobre o topo e a base com a interface. */
function zonas(f: Formato, H: number) {
  if (f === 'story') return { topo: H * 0.12, base: H * 0.86 }
  if (f === 'post') return { topo: H * 0.085, base: H * 0.915 }
  return { topo: H * 0.08, base: H * 0.92 }
}

function aspas(t: TipoTexto, texto: string) {
  const limpo = texto.trim().replace(/^["“”]+|["“”]+$/g, '')
  return t === 'trecho' ? `“${limpo}”` : limpo
}

// ======================================================================
// Modelos de frase / reflexão
// ======================================================================

export async function desenharTexto(canvas: HTMLCanvasElement, modelo: ModeloTexto, formato: Formato, d: DadosTexto) {
  await desenharTextoModelo(canvas, modelo, formato, d)
  if (d.parte && d.parte.n > 1) {
    // selo "1/3" no canto, legível sobre qualquer fundo
    const ctx = canvas.getContext('2d')!
    const { w: W, h: H } = FORMATOS[formato]
    const z = zonas(formato, H)
    const rotulo = `${d.parte.i}/${d.parte.n}`
    ctx.font = `700 30px ${SANS}`
    const lw = ctx.measureText(rotulo).width + 44
    const x = W - 90 - lw
    const y = formato === 'story' ? z.topo - 70 : 84
    ctx.fillStyle = 'rgba(27,42,74,0.88)'
    retArredondado(ctx, x, y, lw, 54, 27)
    ctx.fill()
    texto1(ctx, rotulo, x + lw / 2, y + 37, `700 30px ${SANS}`, '#F6F1E3')
  }
}

/** Divide um texto longo em partes que cabem bem em cada cartão (quebra entre frases). */
export function dividirTexto(texto: string, limite: number): string[] {
  const limpo = texto.trim()
  if (limpo.length <= limite) return [limpo]
  const frases = limpo.split(/(?<=[.!?…;:])\s+/)
  const partes: string[] = []
  let atual = ''
  const empurrar = () => { if (atual.trim()) partes.push(atual.trim()); atual = '' }
  for (const f of frases) {
    if ((atual + ' ' + f).trim().length <= limite) {
      atual = (atual + ' ' + f).trim()
      continue
    }
    empurrar()
    if (f.length <= limite) {
      atual = f
    } else {
      // frase enorme: quebra por palavras
      for (const p of f.split(/\s+/)) {
        if ((atual + ' ' + p).trim().length > limite) empurrar()
        atual = (atual + ' ' + p).trim()
      }
    }
  }
  empurrar()
  return partes
}

/** Quantos caracteres cabem com folga em cada modelo/formato. */
export function limiteDeCaracteres(modelo: ModeloTexto, formato: Formato): number {
  const base = formato === 'story' ? 380 : formato === 'post' ? 270 : 200
  const fator = modelo === 'polaroid' ? 0.55 : modelo === 'debate' ? 0.8 : modelo === 'noturno' ? 0.85 : 1
  return Math.round(base * fator)
}

async function desenharTextoModelo(canvas: HTMLCanvasElement, modelo: ModeloTexto, formato: Formato, d: DadosTexto) {
  await garantirFontes()
  const { w: W, h: H } = FORMATOS[formato]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const z = zonas(formato, H)
  const corpo = aspas(d.tipo, d.texto || 'Escreva aqui a frase ou reflexão.')
  const italico = d.tipo === 'trecho'
  const fonteCorpo = (tam: number) => `${italico ? 'italic ' : ''}500 ${tam}px ${SERIFA}`
  const assinatura = d.nome ? (d.tipo === 'trecho' ? `Destacado por ${d.nome}` : d.nome) : ''

  if (modelo === 'pergaminho') {
    ctx.fillStyle = C.bege
    ctx.fillRect(0, 0, W, H)
    moldura(ctx, W, H)
    const simb = await logo('simbolo', 'preto')
    const hSimb = formato === 'quadrado' ? 120 : 150
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 10, hSimb)
    let y = z.topo - 10 + hSimb + 56
    texto1(ctx, ROTULO_TIPO[d.tipo], W / 2, y, `600 30px ${SANS}`, C.douradoEscuro)
    y += 50
    const yFimTexto = z.base - 230
    const a = ajustar(ctx, corpo, W - 220, yFimTexto - y, fonteCorpo, formato === 'story' ? 76 : 64, 30, 1.32)
    ctx.fillStyle = C.marinho
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, W / 2, y + (yFimTexto - y - a.alturaTotal) / 2, a.alturaLinha, a.tam)
    ornamento(ctx, W / 2, yFimTexto + 40, 200)
    texto1(ctx, d.fonte, W / 2, yFimTexto + 108, `600 30px ${SANS}`, C.texto, 'center', W - 220)
    if (assinatura) texto1(ctx, assinatura, W / 2, yFimTexto + 152, `400 26px ${SANS}`, 'rgba(34,34,34,0.6)', 'center', W - 220)
    const txt = await logo('texto', 'preto')
    const lTxt = formato === 'quadrado' ? 250 : 300
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 20, H - 84 - lTxt * (txt.height / txt.width)), lTxt)
    return
  }

  if (modelo === 'marinho') {
    ctx.fillStyle = C.marinho
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.42, H * 0.7)
    g.addColorStop(0, 'rgba(255,255,255,0.07)')
    g.addColorStop(1, 'rgba(0,0,0,0.18)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    const M = 110
    texto1(ctx, ROTULO_TIPO[d.tipo], M, z.topo + 40, `600 32px ${SANS}`, C.dourado, 'left')
    ctx.fillStyle = C.dourado
    ctx.fillRect(M, z.topo + 70, 80, 4)
    const areaTopo = z.topo + 150
    const yFim = z.base - 200
    const extraAspas = d.tipo === 'trecho' ? 190 : 0
    const a = ajustar(ctx, d.tipo === 'trecho' ? corpo.slice(1) : corpo, W - 2 * M, yFim - areaTopo - extraAspas - 150, fonteCorpo, formato === 'story' ? 82 : 68, 30, 1.3)
    const bloco = extraAspas + a.alturaTotal + 150
    const yIni = areaTopo + Math.max(0, (yFim - areaTopo - bloco) / 2) + extraAspas
    if (d.tipo === 'trecho') texto1(ctx, '“', M - 14, yIni, `700 300px ${SERIFA}`, 'rgba(184,145,47,0.9)', 'left')
    ctx.fillStyle = C.bege
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, M, yIni, a.alturaLinha, a.tam, 'left')
    const yAssin = yIni + a.alturaTotal + 70
    ctx.fillStyle = C.dourado
    ctx.fillRect(M, yAssin - 10, 50, 3)
    texto1(ctx, d.fonte, M, yAssin + 40, `600 30px ${SANS}`, C.dourado, 'left', W - 2 * M)
    if (assinatura) texto1(ctx, assinatura, M, yAssin + 82, `400 26px ${SANS}`, 'rgba(246,241,227,0.65)', 'left', W - 2 * M)
    const hor = await logo('horizontal', 'branco')
    desenharLogoAltura(ctx, hor, M, z.base - 110, 110, 'esq')
    return
  }

  if (modelo === 'caderno') {
    ctx.fillStyle = C.folha
    ctx.fillRect(0, 0, W, H)
    // no story as faixas crescem para a logo e o lema ficarem fora da interface do Instagram
    const faixa = formato === 'story' ? 340 : formato === 'quadrado' ? 150 : 190
    ctx.fillStyle = C.preto
    ctx.fillRect(0, 0, W, faixa)
    ctx.fillRect(0, H - faixa, W, faixa)
    ctx.fillStyle = C.dourado
    ctx.fillRect(0, faixa, W, 5)
    ctx.fillRect(0, H - faixa - 5, W, 5)
    const hor = await logo('horizontal', 'branco')
    const hLogo = formato === 'story' ? 120 : faixa * 0.6
    desenharLogoAltura(ctx, hor, W / 2, formato === 'story' ? faixa - hLogo - 50 : (faixa - hLogo) / 2, hLogo)
    const M = 120
    const areaTopo = faixa + 90
    const areaFim = H - faixa - 90
    const a = ajustar(ctx, corpo, W - 2 * M - 90, areaFim - areaTopo - 220, fonteCorpo, formato === 'story' ? 76 : 62, 28, 1.32)
    const altCaixa = a.alturaTotal + 70
    const bloco = 40 + altCaixa + 110
    const yIni = areaTopo + Math.max(0, (areaFim - areaTopo - bloco) / 2)
    texto1(ctx, ROTULO_TIPO[d.tipo], M, yIni, `700 30px ${SANS}`, C.preto, 'left')
    const caixaY = yIni + 40
    ctx.fillStyle = '#F6F1E3'
    ctx.fillRect(M, caixaY, W - 2 * M, altCaixa)
    ctx.fillStyle = C.dourado
    ctx.fillRect(M, caixaY, 8, altCaixa)
    ctx.fillStyle = C.texto
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, M + 50, caixaY + 35, a.alturaLinha, a.tam, 'left')
    texto1(ctx, d.fonte, M, caixaY + altCaixa + 60, `600 30px ${SANS}`, C.texto, 'left', W - 2 * M)
    if (assinatura) texto1(ctx, assinatura, M, caixaY + altCaixa + 102, `400 26px ${SANS}`, 'rgba(34,34,34,0.6)', 'left', W - 2 * M)
    const yLema = formato === 'story' ? H - faixa + 110 : H - faixa / 2 + 14
    texto1(ctx, 'Ler. Examinar. Dialogar. Aplicar.', W / 2, yLema, `italic 500 40px ${SERIFA}`, C.bege)
    return
  }

  if (modelo === 'noturno') {
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H * 0.45, H * 0.6)
    g.addColorStop(0, 'rgba(184,145,47,0.12)')
    g.addColorStop(1, 'rgba(184,145,47,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    moldura(ctx, W, H)
    const vert = await logo('vertical', 'branco')
    const lV = formato === 'quadrado' ? 170 : 220
    const hV = desenharLogo(ctx, vert, W / 2, z.topo - 20, lV)
    const areaTopo = z.topo - 20 + hV + 60
    const areaFim = z.base - 120
    texto1(ctx, ROTULO_TIPO[d.tipo], W / 2, areaTopo, `600 30px ${SANS}`, C.dourado)
    const a = ajustar(ctx, corpo, W - 220, areaFim - areaTopo - 260, fonteCorpo, formato === 'story' ? 76 : 62, 30, 1.32)
    const bloco = a.alturaTotal + 150
    const yTexto = areaTopo + 50 + Math.max(0, (areaFim - areaTopo - 50 - bloco) / 2)
    ctx.fillStyle = C.bege
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, W / 2, yTexto, a.alturaLinha, a.tam)
    const yOrn = yTexto + a.alturaTotal + 60
    ornamento(ctx, W / 2, yOrn, 200)
    texto1(ctx, d.fonte, W / 2, yOrn + 70, `600 30px ${SANS}`, C.dourado, 'center', W - 220)
    if (assinatura) texto1(ctx, assinatura, W / 2, yOrn + 114, `400 26px ${SANS}`, 'rgba(246,241,227,0.6)', 'center', W - 220)
    return
  }

  if (modelo === 'debate') {
    ctx.fillStyle = C.marinho
    ctx.fillRect(0, 0, W, H)
    const tamQ = formato === 'quadrado' ? 300 : 420
    texto1(ctx, '?', W / 2, z.topo + tamQ * 0.82, `600 ${tamQ}px ${SERIFA}`, C.dourado)
    let y = z.topo + tamQ * 0.82 + 70
    texto1(ctx, d.tipo === 'pergunta' ? 'Pergunta para o encontro' : `Para pensar: ${ROTULO_TIPO[d.tipo].toLowerCase()}`, W / 2, y, `600 32px ${SANS}`, C.dourado)
    y += 50
    const yFim = z.base - 260
    const a = ajustar(ctx, corpo, W - 200, yFim - y, (t) => `${italico ? 'italic ' : ''}500 ${t}px ${SERIFA}`, formato === 'story' ? 78 : 64, 30, 1.3)
    const yTexto = y + Math.max(0, (yFim - y - a.alturaTotal) / 2)
    ctx.fillStyle = C.bege
    ctx.font = `${italico ? 'italic ' : ''}500 ${a.tam}px ${SERIFA}`
    escrever(ctx, a.linhas, W / 2, yTexto, a.alturaLinha, a.tam)
    texto1(ctx, d.fonte, W / 2, yFim + 50, `600 28px ${SANS}`, 'rgba(246,241,227,0.7)', 'center', W - 200)
    texto1(ctx, 'O que você acha?', W / 2, yFim + 110, `italic 500 40px ${SERIFA}`, C.dourado)
    const txt = await logo('texto', 'branco')
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 40, H - 120), 240)
    return
  }

  if (modelo === 'polaroid') {
    ctx.fillStyle = '#EDE6D3'
    ctx.fillRect(0, 0, W, H)
    // moldura branca levemente inclinada, como foto revelada
    const larg = formato === 'quadrado' ? 520 : formato === 'post' ? 600 : 720
    const altFoto = larg * (formato === 'story' ? 0.95 : 0.8)
    const margem = 30
    const altMoldura = altFoto + margem + 110
    const yMoldura = z.topo
    ctx.save()
    ctx.translate(W / 2, yMoldura + altMoldura / 2)
    ctx.rotate(-0.035)
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 16
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(-larg / 2 - margem, -altMoldura / 2, larg + 2 * margem, altMoldura)
    ctx.shadowColor = 'transparent'
    const xF = -larg / 2
    const yF = -altMoldura / 2 + margem
    if (d.foto) {
      cobrir(ctx, d.foto, xF, yF, larg, altFoto)
    } else {
      ctx.fillStyle = C.marinho
      ctx.fillRect(xF, yF, larg, altFoto)
      const simb = await logo('simbolo', 'branco')
      desenharLogoAltura(ctx, simb, 0, yF + altFoto * 0.15, altFoto * 0.7)
    }
    texto1(ctx, d.nome ? `com ${d.nome}` : 'Clube do Livro Bereanos', 0, altMoldura / 2 - 45, `italic 400 38px ${SERIFA}`, 'rgba(34,34,34,0.7)')
    ctx.restore()
    const yIni = yMoldura + altMoldura + 70
    const yFim = z.base - 150
    const a = ajustar(ctx, corpo, W - 220, yFim - yIni, fonteCorpo, formato === 'story' ? 64 : 54, 26, 1.3)
    ctx.fillStyle = C.marinho
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, W / 2, yIni + Math.max(0, (yFim - yIni - a.alturaTotal) / 2), a.alturaLinha, a.tam)
    texto1(ctx, d.fonte, W / 2, yFim + 40, `600 28px ${SANS}`, C.douradoEscuro, 'center', W - 220)
    const txt = await logo('texto', 'preto')
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 20, H - 100), 220)
    return
  }

  if (modelo === 'foto') {
    if (d.foto) cobrir(ctx, d.foto, 0, 0, W, H)
    else {
      ctx.fillStyle = '#2b3550'
      ctx.fillRect(0, 0, W, H)
    }
    sombraEscura(ctx, W, H)
    const hor = await logo('horizontal', 'branco')
    desenharLogoAltura(ctx, hor, W / 2, z.topo - 20, 100)
    if (!d.foto) texto1(ctx, 'Escolha uma foto', W / 2, H * 0.32, `600 40px ${SANS}`, 'rgba(246,241,227,0.6)')
    const M = 100
    const yFim = z.base - 150
    const yIniMax = H * (formato === 'story' ? 0.42 : 0.36)
    const a = ajustar(ctx, corpo, W - 2 * M, yFim - yIniMax, fonteCorpo, formato === 'story' ? 80 : 66, 30, 1.3)
    const yIni = yFim - a.alturaTotal
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 18
    ctx.fillStyle = '#FFFFFF'
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, M, yIni, a.alturaLinha, a.tam, 'left')
    ctx.restore()
    ctx.fillStyle = C.dourado
    ctx.fillRect(M, yFim + 30, 60, 4)
    texto1(ctx, d.fonte, M, yFim + 86, `600 30px ${SANS}`, C.dourado, 'left', W - 2 * M)
    if (assinatura) texto1(ctx, assinatura, M, yFim + 128, `400 26px ${SANS}`, 'rgba(255,255,255,0.75)', 'left', W - 2 * M)
    return
  }

  // minimal
  ctx.fillStyle = C.folha
  ctx.fillRect(0, 0, W, H)
  const M = 110
  const simb = await logo('simbolo', 'preto')
  desenharLogoAltura(ctx, simb, M, z.topo - 20, 110, 'esq')
  const yIni = z.topo + 170
  const yFim = z.base - 240
  const a = ajustar(ctx, corpo, W - 2 * M, yFim - yIni, (t) => `${italico ? 'italic ' : ''}400 ${t}px ${SERIFA}`, formato === 'story' ? 92 : 76, 30, 1.25)
  ctx.fillStyle = C.marinho
  ctx.font = `${italico ? 'italic ' : ''}400 ${a.tam}px ${SERIFA}`
  escrever(ctx, a.linhas, M, yIni + (yFim - yIni - a.alturaTotal) / 2, a.alturaLinha, a.tam, 'left')
  texto1(ctx, d.fonte, M, z.base - 150, `600 30px ${SANS}`, C.douradoEscuro, 'left', W - 2 * M)
  if (assinatura) texto1(ctx, assinatura, M, z.base - 108, `400 26px ${SANS}`, 'rgba(34,34,34,0.55)', 'left', W - 2 * M)
  ctx.fillStyle = 'rgba(27,42,74,0.15)'
  ctx.fillRect(M, z.base - 60, W - 2 * M, 2)
  const txt = await logo('texto', 'preto')
  desenharLogoAltura(ctx, txt, W - M, z.base - 20, 56, 'dir')
}

// ======================================================================
// Modelos de leitura
// ======================================================================

export async function desenharLeitura(canvas: HTMLCanvasElement, modelo: ModeloLeitura, formato: Formato, d: DadosLeitura) {
  await garantirFontes()
  const { w: W, h: H } = FORMATOS[formato]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const z = zonas(formato, H)
  const pct = Math.max(0, Math.min(100, Math.round(d.pct)))
  const fonteTitulo = (t: number) => `600 ${t}px ${SERIFA}`

  if (modelo === 'lendo') {
    ctx.fillStyle = C.marinho
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.4, H * 0.75)
    g.addColorStop(0, 'rgba(255,255,255,0.08)')
    g.addColorStop(1, 'rgba(0,0,0,0.2)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    // sem capa, o emblema do clube ocupa o lugar dela (arquivo oficial, sem alteração)
    const simb = d.capa ? null : await logo('simbolo', 'branco')
    const hVisual = formato === 'quadrado' ? 340 : formato === 'post' ? 460 : 620
    const visual = d.capa ?? simb!
    const wVisual = hVisual * (visual.width / visual.height)
    const a = ajustar(ctx, d.titulo, W - 200, formato === 'quadrado' ? 150 : 220, fonteTitulo, formato === 'quadrado' ? 64 : 76, 38, 1.15)
    const bloco = 50 + hVisual + 70 + a.alturaTotal + 20 + (d.autor ? 70 : 0) + 120
    const areaTopo = z.topo
    const areaFim = z.base - 150
    let y = areaTopo + Math.max(0, (areaFim - areaTopo - bloco) / 2)
    texto1(ctx, 'Estou lendo', W / 2, y + 30, `600 34px ${SANS}`, C.dourado)
    y += 50
    ctx.save()
    if (d.capa) {
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 50
      ctx.shadowOffsetY = 20
    }
    ctx.drawImage(visual, W / 2 - wVisual / 2, y, wVisual, hVisual)
    ctx.restore()
    y += hVisual + 70
    ctx.fillStyle = C.bege
    ctx.font = fonteTitulo(a.tam)
    escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
    y += a.alturaTotal + 20
    if (d.autor) {
      texto1(ctx, d.autor, W / 2, y + 44, `400 36px ${SANS}`, 'rgba(246,241,227,0.75)')
      y += 70
    }
    barra(ctx, 240, y + 40, W - 480, 12, pct, 'rgba(246,241,227,0.15)', C.dourado)
    texto1(ctx, `${pct}% lido`, W / 2, y + 100, `600 30px ${SANS}`, C.dourado)
    const hor = await logo('texto', 'branco')
    desenharLogo(ctx, hor, W / 2, z.base - 90, 280)
    return
  }

  if (modelo === 'progresso') {
    ctx.fillStyle = C.bege
    ctx.fillRect(0, 0, W, H)
    moldura(ctx, W, H)
    const simb = await logo('simbolo', 'preto')
    const hS = formato === 'quadrado' ? 110 : 140
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 20, hS)
    let y = z.topo - 20 + hS + 60
    const a = ajustar(ctx, d.titulo, W - 240, formato === 'quadrado' ? 120 : 190, fonteTitulo, 62, 34, 1.15)
    ctx.fillStyle = C.marinho
    ctx.font = fonteTitulo(a.tam)
    escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
    y += a.alturaTotal + 10
    if (d.autor) {
      texto1(ctx, d.autor, W / 2, y + 40, `400 32px ${SANS}`, C.texto)
      y += 60
    }
    const tamPct = formato === 'story' ? 300 : formato === 'post' ? 240 : 190
    const yPct = y + tamPct * 0.95 + (formato === 'story' ? 100 : 30)
    ctx.fillStyle = C.douradoEscuro
    ctx.font = `600 ${tamPct}px ${SERIFA}`
    ctx.textAlign = 'center'
    ctx.fillText(String(pct), W / 2 - tamPct * 0.12, yPct)
    const larguraNum = ctx.measureText(String(pct)).width
    texto1(ctx, '%', W / 2 - tamPct * 0.12 + larguraNum / 2 + 8, yPct - tamPct * 0.45, `500 ${tamPct * 0.4}px ${SERIFA}`, C.dourado, 'left')
    const yBarra = yPct + 60
    barra(ctx, 160, yBarra, W - 320, 16, pct, 'rgba(27,42,74,0.1)', C.dourado)
    texto1(ctx, `${Math.round(d.paginas)} de ${d.total} páginas`, W / 2, yBarra + 70, `600 32px ${SANS}`, C.marinho)
    if (d.nome) texto1(ctx, d.nome, W / 2, yBarra + 116, `400 28px ${SANS}`, 'rgba(34,34,34,0.6)')
    const txt = await logo('texto', 'preto')
    const lTxt = formato === 'quadrado' ? 250 : 300
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 30, H - 84 - lTxt * (txt.height / txt.width)), lTxt)
    return
  }

  if (modelo === 'anel') {
    ctx.fillStyle = C.marinho
    ctx.fillRect(0, 0, W, H)
    const cx = W / 2
    const raio = formato === 'quadrado' ? 250 : 320
    const cy = formato === 'quadrado' ? H * 0.42 : H * 0.42
    ctx.lineCap = 'round'
    ctx.lineWidth = 34
    ctx.strokeStyle = 'rgba(246,241,227,0.1)'
    ctx.beginPath()
    ctx.arc(cx, cy, raio, 0, Math.PI * 2)
    ctx.stroke()
    if (pct > 0) {
      ctx.strokeStyle = C.dourado
      ctx.beginPath()
      ctx.arc(cx, cy, raio, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100)
      ctx.stroke()
    }
    const tam = formato === 'quadrado' ? 190 : 240
    ctx.fillStyle = C.bege
    ctx.font = `600 ${tam}px ${SERIFA}`
    ctx.textAlign = 'center'
    ctx.fillText(String(pct), cx - tam * 0.1, cy + tam * 0.32)
    const lw = ctx.measureText(String(pct)).width
    texto1(ctx, '%', cx - tam * 0.1 + lw / 2 + 6, cy - tam * 0.1, `500 ${tam * 0.38}px ${SERIFA}`, C.dourado, 'left')
    texto1(ctx, `página ${Math.round(d.paginas)} de ${d.total}`, cx, cy + tam * 0.32 + 70, `600 30px ${SANS}`, 'rgba(246,241,227,0.7)')
    let y = cy + raio + 110
    const a = ajustar(ctx, d.titulo, W - 200, 170, fonteTitulo, 64, 36, 1.15)
    ctx.fillStyle = C.bege
    ctx.font = fonteTitulo(a.tam)
    escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
    y += a.alturaTotal
    if (d.autor) texto1(ctx, d.autor, W / 2, y + 44, `400 32px ${SANS}`, 'rgba(246,241,227,0.7)')
    const hor = await logo('horizontal', 'branco')
    desenharLogoAltura(ctx, hor, W / 2, Math.min(z.base - 100, H - 150), 90)
    return
  }

  if (modelo === 'semana') {
    ctx.fillStyle = C.folha
    ctx.fillRect(0, 0, W, H)
    moldura(ctx, W, H)
    const simb = await logo('simbolo', 'preto')
    const hS = formato === 'quadrado' ? 100 : 130
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 20, hS)
    let y = z.topo - 20 + hS + 70
    texto1(ctx, 'Minha semana de leitura', W / 2, y, `600 34px ${SANS}`, C.douradoEscuro)
    const semana = d.semana ?? []
    const total = semana.reduce((s, x) => s + x.paginas, 0)
    const dias = semana.filter((x) => x.paginas > 0).length
    const tamTot = formato === 'quadrado' ? 150 : 200
    y += tamTot * 0.9 + 20
    texto1(ctx, String(total), W / 2, y, `600 ${tamTot}px ${SERIFA}`, C.marinho)
    texto1(ctx, total === 1 ? 'página' : 'páginas', W / 2, y + 56, `600 34px ${SANS}`, C.texto)
    y += 120
    const altBarras = formato === 'quadrado' ? 200 : formato === 'post' ? 280 : 420
    const largArea = W - 280
    const passo = largArea / 7
    const max = Math.max(1, ...semana.map((x) => x.paginas))
    semana.forEach((x, i) => {
      const bx = 140 + i * passo + passo * 0.2
      const bw = passo * 0.6
      const bh = x.paginas > 0 ? Math.max(14, (x.paginas / max) * altBarras) : 6
      ctx.fillStyle = x.paginas > 0 ? C.dourado : 'rgba(27,42,74,0.1)'
      retArredondado(ctx, bx, y + altBarras - bh, bw, bh, 10)
      ctx.fill()
      if (x.paginas > 0) texto1(ctx, String(x.paginas), bx + bw / 2, y + altBarras - bh - 14, `600 24px ${SANS}`, C.texto)
      texto1(ctx, x.rotulo, bx + bw / 2, y + altBarras + 44, `600 28px ${SANS}`, 'rgba(34,34,34,0.55)')
    })
    y += altBarras + 110
    texto1(ctx, `${dias} ${dias === 1 ? 'dia' : 'dias'} com leitura${d.titulo ? `, lendo ${d.titulo}` : ''}`, W / 2, y, `italic 400 36px ${SERIFA}`, C.marinho, 'center', W - 200)
    if (d.nome) texto1(ctx, d.nome, W / 2, y + 48, `400 28px ${SANS}`, 'rgba(34,34,34,0.55)')
    const txt = await logo('texto', 'preto')
    const lTxt = formato === 'quadrado' ? 230 : 280
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 20, H - 84 - lTxt * (txt.height / txt.width)), lTxt)
    return
  }

  if (modelo === 'constancia') {
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, H * 0.5)
    g.addColorStop(0, 'rgba(184,145,47,0.22)')
    g.addColorStop(1, 'rgba(184,145,47,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    const centro = formato === 'quadrado' ? H * 0.4 : H * 0.42
    const escala = formato === 'quadrado' ? 11 : 14
    ctx.save()
    ctx.translate(W / 2 - 12 * escala, centro - 25 * escala)
    ctx.scale(escala, escala)
    ctx.fillStyle = C.dourado
    ctx.fill(CHAMA)
    ctx.restore()
    const tamNum = formato === 'quadrado' ? 220 : 280
    texto1(ctx, String(d.sequencia), W / 2, centro + tamNum * 0.75, `600 ${tamNum}px ${SERIFA}`, C.bege)
    texto1(ctx, d.sequencia === 1 ? 'dia seguido de leitura' : 'dias seguidos de leitura', W / 2, centro + tamNum * 0.75 + 80, `600 40px ${SANS}`, C.dourado)
    if (d.titulo) texto1(ctx, `Lendo ${d.titulo}`, W / 2, centro + tamNum * 0.75 + 150, `italic 400 38px ${SERIFA}`, 'rgba(246,241,227,0.8)', 'center', W - 200)
    if (d.nome) texto1(ctx, d.nome, W / 2, centro + tamNum * 0.75 + 200, `400 28px ${SANS}`, 'rgba(246,241,227,0.55)')
    const hor = await logo('horizontal', 'branco')
    desenharLogoAltura(ctx, hor, W / 2, z.base - 110, 100)
    return
  }

  if (modelo === 'terminei') {
    ctx.fillStyle = C.folha
    ctx.fillRect(0, 0, W, H)
    moldura(ctx, W, H)
    const vert = await logo('vertical', 'preto')
    const lV = formato === 'quadrado' ? 260 : 340
    const hV = desenharLogo(ctx, vert, W / 2, z.topo - 10, lV)
    let y = z.topo - 10 + hV + (formato === 'quadrado' ? 50 : 90)
    ornamento(ctx, W / 2, y, 240)
    y += 80
    texto1(ctx, d.titulo ? 'Terminei de ler' : 'Terminei mais um livro', W / 2, y, `600 40px ${SANS}`, C.douradoEscuro)
    y += 40
    const a = ajustar(ctx, d.titulo, W - 220, formato === 'quadrado' ? 200 : 360, fonteTitulo, formato === 'story' ? 104 : 84, 40, 1.12)
    ctx.fillStyle = C.marinho
    ctx.font = fonteTitulo(a.tam)
    escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
    y += a.alturaTotal + 20
    if (d.autor) {
      texto1(ctx, d.autor, W / 2, y + 50, `italic 400 44px ${SERIFA}`, C.texto)
      y += 80
    }
    texto1(ctx, `${d.total} páginas`, W / 2, y + (d.titulo ? 50 : 70), `600 30px ${SANS}`, 'rgba(34,34,34,0.6)')
    if (d.nome) texto1(ctx, `Leitura de ${d.nome}`, W / 2, y + 96, `400 28px ${SANS}`, 'rgba(34,34,34,0.55)')
    ornamento(ctx, W / 2, z.base + 10, 160)
    return
  }

  if (modelo === 'retrospectiva') {
    const r = d.retro
    ctx.fillStyle = C.marinho
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createRadialGradient(W / 2, H * 0.3, 40, W / 2, H * 0.3, H * 0.8)
    g.addColorStop(0, 'rgba(184,145,47,0.14)')
    g.addColorStop(1, 'rgba(0,0,0,0.18)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    const compacto = formato === 'quadrado'
    const simb = await logo('simbolo', 'branco')
    const hS = compacto ? 80 : 110
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 30, hS)
    let y = z.topo - 30 + hS + (compacto ? 60 : 80)
    texto1(ctx, d.titulo ? 'Minha leitura de' : 'Minha retrospectiva', W / 2, y, `600 32px ${SANS}`, C.dourado)
    y += 24
    if (d.titulo) {
      const a = ajustar(ctx, d.titulo, W - 200, compacto ? 120 : 200, fonteTitulo, compacto ? 60 : 78, 36, 1.12)
      ctx.fillStyle = C.bege
      ctx.font = fonteTitulo(a.tam)
      escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
      y += a.alturaTotal
    }
    if (r?.periodo) { texto1(ctx, r.periodo, W / 2, y + 46, `400 30px ${SANS}`, 'rgba(246,241,227,0.65)'); y += 50 }
    y += compacto ? 40 : 70
    // grade de números
    const itens: [string, string][] = r ? [
      [String(r.paginas), r.paginas === 1 ? 'página' : 'páginas'],
      [String(r.dias), r.dias === 1 ? 'dia de leitura' : 'dias de leitura'],
      [String(r.maiorSequencia), r.maiorSequencia === 1 ? 'dia seguido, no máximo' : 'dias seguidos, no máximo'],
      [r.minutos >= 60 ? `${Math.round(r.minutos / 6) / 10}`.replace('.', ',') : String(r.minutos), r.minutos >= 60 ? 'horas de foco' : 'minutos de foco'],
      [String(r.anotacoes), r.anotacoes === 1 ? 'anotação' : 'anotações'],
      [r.melhorDia ? String(r.melhorDia.paginas) : '0', r.melhorDia ? `páginas em ${r.melhorDia.rotulo}` : 'melhor dia']
    ] : []
    const cols = 2
    const linhasG = Math.ceil(itens.length / cols)
    const espaco = z.base - 170 - y
    const altCel = Math.min(compacto ? 130 : formato === 'post' ? 150 : 180, Math.floor(espaco / 3))
    const M = 120
    const larg = (W - 2 * M) / cols
    ctx.strokeStyle = 'rgba(184,145,47,0.35)'
    ctx.lineWidth = 1.5
    for (let i = 1; i < linhasG; i++) {
      ctx.beginPath(); ctx.moveTo(M, y + i * altCel); ctx.lineTo(W - M, y + i * altCel); ctx.stroke()
    }
    ctx.beginPath(); ctx.moveTo(W / 2, y + 16); ctx.lineTo(W / 2, y + linhasG * altCel - 16); ctx.stroke()
    const tamN = compacto ? 64 : formato === 'post' ? 76 : 92
    itens.forEach(([v, rot], i) => {
      const cx = M + (i % cols) * larg + larg / 2
      const cy = y + Math.floor(i / cols) * altCel
      texto1(ctx, v, cx, cy + altCel * 0.52, `600 ${tamN}px ${SERIFA}`, C.bege)
      texto1(ctx, rot, cx, cy + altCel * 0.52 + 44, `500 26px ${SANS}`, 'rgba(246,241,227,0.7)', 'center', larg - 30)
    })
    y += linhasG * altCel + (compacto ? 30 : 50)
    // trecho favorito, só se couber
    const limiteTrecho = z.base - 175
    if (r?.trecho && y + 140 < limiteTrecho) {
      ornamento(ctx, W / 2, y, 160)
      y += 50
      const a = ajustar(ctx, `“${r.trecho.replace(/^["“”]+|["“”]+$/g, '')}”`, W - 240, limiteTrecho - y, (n) => `italic 400 ${n}px ${SERIFA}`, 44, 24, 1.35)
      ctx.fillStyle = 'rgba(246,241,227,0.9)'
      ctx.font = `italic 400 ${a.tam}px ${SERIFA}`
      escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
      y += a.alturaTotal
    }
    if (d.nome) texto1(ctx, d.nome, W / 2, z.base - 130, `400 28px ${SANS}`, 'rgba(246,241,227,0.6)')
    const txt = await logo('texto', 'branco')
    desenharLogo(ctx, txt, W / 2, z.base - 90, compacto ? 220 : 260)
    return
  }

  if (modelo === 'grupo') {
    const gr = d.grupo
    ctx.fillStyle = C.bege
    ctx.fillRect(0, 0, W, H)
    moldura(ctx, W, H)
    const compacto = formato === 'quadrado'
    const simb = await logo('simbolo', 'preto')
    const hS = compacto ? 80 : 120
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 30, hS)
    let y = z.topo - 30 + hS + (compacto ? 55 : 80)
    texto1(ctx, 'O clube neste livro', W / 2, y, `600 32px ${SANS}`, C.douradoEscuro)
    y += 20
    if (d.titulo) {
      const a = ajustar(ctx, d.titulo, W - 220, compacto ? 110 : 170, fonteTitulo, compacto ? 54 : 66, 34, 1.12)
      ctx.fillStyle = C.marinho
      ctx.font = fonteTitulo(a.tam)
      escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
      y += a.alturaTotal
    }
    y += compacto ? 30 : 60
    const tamTot = compacto ? 150 : 210
    texto1(ctx, String(gr?.paginas ?? 0), W / 2, y + tamTot * 0.8, `600 ${tamTot}px ${SERIFA}`, C.marinho)
    y += tamTot * 0.8 + 56
    texto1(ctx, 'páginas lidas juntos', W / 2, y, `600 34px ${SANS}`, C.texto)
    y += compacto ? 50 : 80
    const txt = await logo('texto', 'preto')
    const lTxt = compacto ? 220 : 280
    const yLogo = Math.min(z.base - 30, H - 84 - lTxt * (txt.height / txt.width))
    const yStats = yLogo - (compacto ? 150 : 175)
    const dias = gr?.dias ?? []
    const alt = Math.min(260, yStats - y - 110)
    if (dias.length && alt >= 60) {
      const passo = (W - 280) / dias.length
      const max = Math.max(1, ...dias.map((x) => x.paginas))
      const y0 = y + 10
      dias.forEach((x, i) => {
        const bx = 140 + i * passo + passo * 0.18
        const bw = passo * 0.64
        const bh = x.paginas > 0 ? Math.max(10, (x.paginas / max) * alt) : 6
        ctx.fillStyle = x.paginas > 0 ? C.dourado : 'rgba(27,42,74,0.1)'
        retArredondado(ctx, bx, y0 + alt - bh, bw, bh, 8)
        ctx.fill()
        texto1(ctx, x.rotulo, bx + bw / 2, y0 + alt + 30, `600 22px ${SANS}`, 'rgba(34,34,34,0.5)')
      })
      texto1(ctx, 'últimos 14 dias', W / 2, y0 + alt + 72, `italic 400 28px ${SERIFA}`, 'rgba(34,34,34,0.55)')
    }
    const itens: [string, string][] = gr ? [
      [String(gr.leitores), gr.leitores === 1 ? 'leitor' : 'leitores'],
      [String(gr.terminaram), gr.terminaram === 1 ? 'terminou' : 'terminaram'],
      [String(gr.mural), gr.mural === 1 ? 'nota no mural' : 'notas no mural']
    ] : []
    const larg = (W - 240) / 3
    itens.forEach(([v, rot], i) => {
      const cx = 120 + larg * i + larg / 2
      texto1(ctx, v, cx, yStats + 70, `600 ${compacto ? 64 : 80}px ${SERIFA}`, C.douradoEscuro)
      texto1(ctx, rot, cx, yStats + 115, `500 26px ${SANS}`, C.texto)
    })
    desenharLogo(ctx, txt, W / 2, yLogo, lTxt)
    return
  }

  // foto-leitura
  if (d.foto) cobrir(ctx, d.foto, 0, 0, W, H)
  else {
    ctx.fillStyle = '#2b3550'
    ctx.fillRect(0, 0, W, H)
  }
  sombraEscura(ctx, W, H, 0.88)
  const hor = await logo('horizontal', 'branco')
  desenharLogoAltura(ctx, hor, W / 2, z.topo - 20, 100)
  if (!d.foto) texto1(ctx, 'Escolha uma foto', W / 2, H * 0.32, `600 40px ${SANS}`, 'rgba(246,241,227,0.6)')
  const M = 100
  const yBase = z.base - 60
  barra(ctx, M, yBase, W - 2 * M, 12, pct, 'rgba(255,255,255,0.2)', C.dourado)
  texto1(ctx, `${pct}%`, M, yBase - 40, `600 72px ${SERIFA}`, C.dourado, 'left')
  texto1(ctx, `${Math.round(d.paginas)} de ${d.total} páginas`, W - M, yBase - 44, `600 30px ${SANS}`, 'rgba(255,255,255,0.8)', 'right')
  const a = ajustar(ctx, d.titulo, W - 2 * M, 260, fonteTitulo, 84, 40, 1.12)
  const yTit = yBase - 150 - a.alturaTotal - (d.autor ? 50 : 0)
  texto1(ctx, 'Lendo agora', M, yTit - 30, `600 32px ${SANS}`, C.dourado, 'left')
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 18
  ctx.fillStyle = '#FFFFFF'
  ctx.font = fonteTitulo(a.tam)
  escrever(ctx, a.linhas, M, yTit, a.alturaLinha, a.tam, 'left')
  ctx.restore()
  if (d.autor) texto1(ctx, d.autor, M, yTit + a.alturaTotal + 40, `400 34px ${SANS}`, 'rgba(255,255,255,0.8)', 'left')
}

// ======================================================================
// Adesivo: a mesma informação da leitura, sem fundo (PNG transparente),
// para colar por cima de uma foto ou story. O recorte acompanha o conteúdo.
// ======================================================================

export type CorAdesivo = 'claro' | 'escuro'

export async function desenharAdesivo(canvas: HTMLCanvasElement, modelo: ModeloLeitura, d: DadosLeitura, cor: CorAdesivo) {
  await garantirFontes()
  const W = 1080
  const rascunho = document.createElement('canvas')
  rascunho.width = W
  rascunho.height = 2000
  const ctx = rascunho.getContext('2d')!
  const principal = cor === 'claro' ? '#FFFFFF' : C.marinho
  const secundaria = cor === 'claro' ? 'rgba(255,255,255,0.88)' : 'rgba(27,42,74,0.78)'
  const trilho = cor === 'claro' ? 'rgba(255,255,255,0.3)' : 'rgba(27,42,74,0.15)'
  const destaque = cor === 'claro' ? '#E2BC5C' : C.douradoEscuro
  const pct = Math.max(0, Math.min(100, Math.round(d.pct)))
  const comSombra = (fn: () => void) => {
    ctx.save()
    if (cor === 'claro') {
      ctx.shadowColor = 'rgba(0,0,0,0.45)'
      ctx.shadowBlur = 14
      ctx.shadowOffsetY = 2
    }
    fn()
    ctx.restore()
  }
  const t = (txt: string, x: number, y: number, fonte: string, c: string, al: CanvasTextAlign = 'center') =>
    comSombra(() => texto1(ctx, txt, x, y, fonte, c, al, W - 120))
  let y = 60

  if (modelo === 'constancia') {
    comSombra(() => {
      ctx.save()
      ctx.translate(W / 2 - 12 * 9, y)
      ctx.scale(9, 9)
      ctx.fillStyle = C.dourado
      ctx.fill(CHAMA)
      ctx.restore()
    })
    y += 230
    t(String(d.sequencia), W / 2, y + 180, `600 230px ${SERIFA}`, principal)
    y += 250
    t(d.sequencia === 1 ? 'dia seguido de leitura' : 'dias seguidos de leitura', W / 2, y, `600 46px ${SANS}`, destaque)
    y += 50
    if (d.titulo) { t(d.titulo, W / 2, y + 30, `italic 500 40px ${SERIFA}`, secundaria); y += 60 }
  } else if (modelo === 'semana') {
    t('Minha semana de leitura', W / 2, y + 40, `600 44px ${SANS}`, destaque)
    y += 60
    const semana = d.semana ?? []
    const total = semana.reduce((a, x) => a + x.paginas, 0)
    t(String(total), W / 2, y + 190, `600 210px ${SERIFA}`, principal)
    t(total === 1 ? 'página' : 'páginas', W / 2, y + 250, `600 40px ${SANS}`, secundaria)
    y += 300
    const alt = 260
    const passo = (W - 240) / 7
    const max = Math.max(1, ...semana.map((x) => x.paginas))
    semana.forEach((x, i) => {
      const bx = 120 + i * passo + passo * 0.2
      const bw = passo * 0.6
      const bh = x.paginas > 0 ? Math.max(14, (x.paginas / max) * alt) : 8
      comSombra(() => {
        ctx.fillStyle = x.paginas > 0 ? C.dourado : trilho
        retArredondado(ctx, bx, y + alt - bh, bw, bh, 10)
        ctx.fill()
      })
      t(x.rotulo, bx + bw / 2, y + alt + 46, `600 30px ${SANS}`, secundaria)
    })
    y += alt + 70
    if (d.titulo) { t(d.titulo, W / 2, y + 30, `italic 500 40px ${SERIFA}`, secundaria); y += 60 }
  } else if (modelo === 'anel') {
    const r = 230
    const cx = W / 2
    const cy = y + r + 20
    comSombra(() => {
      ctx.lineCap = 'round'
      ctx.lineWidth = 30
      ctx.strokeStyle = trilho
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
      if (pct > 0) {
        ctx.strokeStyle = C.dourado
        ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100); ctx.stroke()
      }
    })
    t(`${pct}%`, cx, cy + 60, `600 170px ${SERIFA}`, principal)
    t(`página ${Math.round(d.paginas)} de ${d.total}`, cx, cy + 120, `600 34px ${SANS}`, secundaria)
    y = cy + r + 50
    if (d.titulo) {
      const a = ajustar(ctx, d.titulo, W - 160, 180, (n) => `600 ${n}px ${SERIFA}`, 68, 40, 1.15)
      comSombra(() => { ctx.fillStyle = principal; ctx.font = `600 ${a.tam}px ${SERIFA}`; escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam) })
      y += a.alturaTotal + 20
    }
  } else if (modelo === 'terminei') {
    t(d.titulo ? 'Terminei de ler' : 'Terminei mais um livro', W / 2, y + 40, `600 48px ${SANS}`, destaque)
    y += 70
    if (d.titulo) {
      const a = ajustar(ctx, d.titulo, W - 140, 300, (n) => `600 ${n}px ${SERIFA}`, 100, 46, 1.12)
      comSombra(() => { ctx.fillStyle = principal; ctx.font = `600 ${a.tam}px ${SERIFA}`; escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam) })
      y += a.alturaTotal + 10
    }
    if (d.autor && d.titulo) { t(d.autor, W / 2, y + 44, `italic 400 46px ${SERIFA}`, secundaria); y += 70 }
    t(`${d.total} páginas`, W / 2, y + 44, `600 34px ${SANS}`, secundaria)
    y += 70
  } else {
    // lendo, progresso, foto-leitura
    t(modelo === 'progresso' ? 'Meu progresso' : 'Estou lendo', W / 2, y + 40, `600 44px ${SANS}`, destaque)
    y += 70
    if (d.titulo) {
      const a = ajustar(ctx, d.titulo, W - 140, 260, (n) => `600 ${n}px ${SERIFA}`, 92, 44, 1.12)
      comSombra(() => { ctx.fillStyle = principal; ctx.font = `600 ${a.tam}px ${SERIFA}`; escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam) })
      y += a.alturaTotal + 10
      if (d.autor) { t(d.autor, W / 2, y + 40, `400 40px ${SANS}`, secundaria); y += 64 }
    }
    y += 40
    comSombra(() => barra(ctx, 120, y, W - 240, 22, pct, trilho, C.dourado))
    y += 22
    t(`${pct}% lido, página ${Math.round(d.paginas)} de ${d.total}`, W / 2, y + 60, `600 38px ${SANS}`, principal)
    y += 80
  }

  if (d.nome) { t(d.nome, W / 2, y + 30, `400 32px ${SANS}`, secundaria); y += 50 }
  y += 40
  const img = await logo('horizontal', cor === 'claro' ? 'branco' : 'preto')
  const hLogo = 96
  comSombra(() => desenharLogoAltura(ctx, img, W / 2, y, hLogo))
  y += hLogo + 50

  canvas.width = W
  canvas.height = Math.min(2000, Math.ceil(y))
  const final = canvas.getContext('2d')!
  final.clearRect(0, 0, W, canvas.height)
  final.drawImage(rascunho, 0, 0, W, canvas.height, 0, 0, W, canvas.height)
}

/** Converte o canvas em arquivo PNG para compartilhar ou baixar. */
export function canvasParaArquivo(canvas: HTMLCanvasElement, nome: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('não foi possível gerar a imagem'))
      resolve(new File([blob], nome, { type: 'image/png' }))
    }, 'image/png')
  })
}
