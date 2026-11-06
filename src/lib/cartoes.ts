// Motor dos cartões de compartilhamento (imagens para Instagram, WhatsApp etc.).
// Tudo é desenhado em <canvas>. A logo do clube entra sempre como arquivo
// oficial (preta ou branca), com a proporção preservada: nunca é redesenhada,
// recolorida ou esticada.

export type Formato = 'story' | 'post' | 'quadrado'
export type TipoTexto = 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'
export type ModeloTexto = 'pergaminho' | 'marinho' | 'caderno' | 'noturno' | 'debate' | 'polaroid' | 'foto' | 'foto-faixa' | 'foto-dividida' | 'foto-moldura' | 'foto-destaque' | 'minimal'
export type ModeloLeitura = 'lendo' | 'progresso' | 'anel' | 'semana' | 'constancia' | 'terminei' | 'foto-leitura' | 'retrospectiva' | 'grupo' | 'capa'

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
  { id: 'foto-faixa', nome: 'Foto com faixa', cores: ['#3a3a3a', '#1B2A4A'] },
  { id: 'foto-dividida', nome: 'Foto dividida', cores: ['#3a3a3a', '#F6F1E3'] },
  { id: 'foto-moldura', nome: 'Foto emoldurada', cores: ['#F6F1E3', '#3a3a3a'] },
  { id: 'foto-destaque', nome: 'Foto em destaque', cores: ['#2b2b2b', '#F6F1E3'] },
  { id: 'minimal', nome: 'Minimal', cores: ['#FFFCF4', '#1B2A4A'] }
]

export const MODELOS_LEITURA: { id: ModeloLeitura; nome: string; cores: [string, string] }[] = [
  { id: 'capa', nome: 'Com a capa', cores: ['#3a4a6b', '#B8912F'] },
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

/** Modelos que só existem como adesivo sem fundo (com fundo, o "Estou lendo" já mostra a capa). */
export const SO_SEM_FUNDO: ModeloLeitura[] = ['capa']

/** Modelos de frase que usam foto (a foto é obrigatória neles). */
export const MODELOS_COM_FOTO: ModeloTexto[] = ['foto', 'foto-faixa', 'foto-dividida', 'foto-moldura', 'foto-destaque']

/** Versões de cada modelo (cores e arranjos). A primeira é a original. */
export const VERSOES: Record<ModeloTexto | ModeloLeitura, string[]> = {
  pergaminho: ['Clássico', 'Sem moldura', 'Marinho'],
  marinho: ['Marinho', 'Claro', 'Preto'],
  caderno: ['Faixas pretas', 'Faixas marinho', 'Pautado'],
  noturno: ['Preto', 'Marinho', 'Sem moldura'],
  debate: ['Marinho', 'Preto', 'Claro'],
  polaroid: ['Bege', 'Marinho', 'Reta'],
  foto: ['Texto embaixo', 'Texto no centro', 'Texto em cima'],
  'foto-faixa': ['Faixa marinho', 'Faixa bege', 'Faixa preta'],
  'foto-dividida': ['Bege', 'Marinho', 'Branco'],
  'foto-moldura': ['Bege', 'Branco', 'Marinho'],
  'foto-destaque': ['Escuro', 'Claro'],
  minimal: ['Claro', 'Bege', 'Escuro'],
  lendo: ['Marinho', 'Preto', 'Bege'],
  progresso: ['Bege', 'Marinho', 'Branco'],
  anel: ['Marinho', 'Preto'],
  semana: ['Claro', 'Marinho', 'Bege'],
  constancia: ['Preto', 'Marinho'],
  terminei: ['Claro', 'Marinho', 'Bege'],
  'foto-leitura': ['Texto embaixo', 'Faixa marinho', 'Faixa bege'],
  retrospectiva: ['Marinho', 'Preto'],
  grupo: ['Bege', 'Marinho', 'Branco'],
  capa: ['Capa em cima', 'Capa ao lado']
}

/** Como a foto entra no cartão: enquadramento, giro, filtro. */
export type FiltroFoto = 'original' | 'pb' | 'sepia' | 'quente'
export type FundoCaber = 'desfocado' | 'marinho' | 'bege' | 'preto'
export interface AjusteFoto {
  zoom: number // 1 = enquadramento automático
  dx: number // deslocamento horizontal, em fração da largura do cartão
  dy: number // deslocamento vertical, em fração da altura do cartão
  rot: 0 | 90 | 180 | 270
  espelhar: boolean
  modo: 'preencher' | 'caber'
  fundo: FundoCaber
  escurecer: number // 0 a 100; 60 é o padrão
  filtro: FiltroFoto
}
export const AJUSTE_PADRAO: AjusteFoto = { zoom: 1, dx: 0, dy: 0, rot: 0, espelhar: false, modo: 'preencher', fundo: 'desfocado', escurecer: 60, filtro: 'original' }

/** Modelos que dependem da página inteira e não viram adesivo sem fundo. */
export const SO_COM_FUNDO: ModeloLeitura[] = ['foto-leitura', 'retrospectiva', 'grupo']

export interface DadosTexto {
  fonteCartao?: FonteCartao
  tipo: TipoTexto
  texto: string
  fonte: string // ex.: "C. S. Lewis, Cartas de um Diabo a Seu Aprendiz, p. 12"
  nome: string | null
  foto: HTMLImageElement | null
  ajuste?: AjusteFoto
  versao?: number
  parte?: { i: number; n: number } // texto longo dividido em vários cartões
}

export interface DadosLeitura {
  fonteCartao?: FonteCartao
  titulo: string
  autor: string | null
  capa: HTMLImageElement | null
  pct: number
  paginas: number
  total: number
  sequencia: number
  nome: string | null
  foto: HTMLImageElement | null
  ajuste?: AjusteFoto
  versao?: number
  semana?: { rotulo: string; paginas: number }[]
  retro?: {
    paginas: number; dias: number; maiorSequencia: number; minutos: number; anotacoes: number
    sessoes?: number; semContagem?: boolean
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
// Fontes que a pessoa pode escolher para o texto dos cartões. A primeira é a
// do clube; as outras são carregadas do Google Fonts só quando escolhidas.
export type FonteCartao = 'garamond' | 'cormorant' | 'baskerville' | 'playfair' | 'lora' | 'sans'
export const FONTES_CARTAO: { id: FonteCartao; nome: string; css: string; google?: string }[] = [
  { id: 'garamond', nome: 'Garamond', css: '"EB Garamond", Garamond, "Times New Roman", serif' },
  { id: 'cormorant', nome: 'Cormorant', css: '"Cormorant Garamond", Garamond, serif', google: 'Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600' },
  { id: 'baskerville', nome: 'Baskerville', css: '"Libre Baskerville", Baskerville, serif', google: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400' },
  { id: 'playfair', nome: 'Playfair', css: '"Playfair Display", serif', google: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500' },
  { id: 'lora', nome: 'Lora', css: 'Lora, serif', google: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500' },
  { id: 'sans', nome: 'Moderna', css: '"Source Sans 3", system-ui, sans-serif' }
]
let SERIFA = FONTES_CARTAO[0].css

/** Só injeta os estilos das fontes extras (para as miniaturas aparecerem certas). */
export function precarregarFontes() {
  for (const f of FONTES_CARTAO) {
    if (!f.google || document.querySelector(`link[data-fonte="${f.id}"]`)) continue
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
    l.dataset.fonte = f.id
    document.head.appendChild(l)
  }
}

const fontesCarregadas = new Map<FonteCartao, Promise<unknown>>()
/** Carrega (uma vez) a fonte escolhida e passa a usá-la nos desenhos seguintes. */
export function usarFonte(id: FonteCartao = 'garamond'): Promise<unknown> {
  const f = FONTES_CARTAO.find((x) => x.id === id) ?? FONTES_CARTAO[0]
  SERIFA = f.css
  if (!fontesCarregadas.has(f.id)) {
    if (f.google && !document.querySelector(`link[data-fonte="${f.id}"]`)) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`
      l.dataset.fonte = f.id
      document.head.appendChild(l)
    }
    const espera = f.google ? new Promise((r) => setTimeout(r, 60)) : Promise.resolve()
    fontesCarregadas.set(f.id, espera.then(() => Promise.all(
      ['400', '500', '600', '700', 'italic 400', 'italic 500'].map((p) => document.fonts.load(`${p} 40px ${f.css}`))
    )).catch(() => {}))
  }
  return fontesCarregadas.get(f.id)!
}
const SANS = '"Source Sans 3", system-ui, sans-serif'

const ROTULO_TIPO: Record<TipoTexto, string> = {
  trecho: 'Trecho',
  reflexao: 'Reflexão',
  pergunta: 'Pergunta para o encontro',
  aplicacao: 'Para aplicar'
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
        `400 40px ${FONTES_CARTAO[0].css}`, `italic 400 40px ${FONTES_CARTAO[0].css}`, `500 40px ${FONTES_CARTAO[0].css}`,
        `600 40px ${FONTES_CARTAO[0].css}`, `700 40px ${FONTES_CARTAO[0].css}`, `italic 500 40px ${FONTES_CARTAO[0].css}`,
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

/** Escurecimento sobre a foto. fator 1 = padrão (escurecer 60). */
function sombraEscura(ctx: CanvasRenderingContext2D, W: number, H: number, forte = 0.82, fator = 1, foco: 'base' | 'centro' | 'topo' = 'base') {
  const a = (v: number) => Math.max(0, Math.min(0.95, v * fator)).toFixed(3)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  if (foco === 'centro') {
    g.addColorStop(0, `rgba(10,14,26,${a(0.5)})`)
    g.addColorStop(0.5, `rgba(10,14,26,${a(0.62)})`)
    g.addColorStop(1, `rgba(10,14,26,${a(0.5)})`)
  } else if (foco === 'topo') {
    g.addColorStop(0, `rgba(10,14,26,${a(forte)})`)
    g.addColorStop(0.45, `rgba(10,14,26,${a(0.5)})`)
    g.addColorStop(0.75, `rgba(10,14,26,${a(0.2)})`)
    g.addColorStop(1, `rgba(10,14,26,${a(0.45)})`)
  } else {
    g.addColorStop(0, `rgba(10,14,26,${a(0.55)})`)
    g.addColorStop(0.35, `rgba(10,14,26,${a(0.25)})`)
    g.addColorStop(0.6, `rgba(10,14,26,${a(0.55)})`)
    g.addColorStop(1, `rgba(10,14,26,${a(forte)})`)
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// ---------- paletas das versões ----------
interface Pal {
  fundo: string; titulo: string; corpo: string; suave: string; fraco: string
  rotulo: string; destaque: string; logo: 'preto' | 'branco'; trilho: string; escuro: boolean
}
const ESCURA = { titulo: '#F6F1E3', corpo: '#F6F1E3', suave: 'rgba(246,241,227,0.72)', fraco: 'rgba(246,241,227,0.52)', rotulo: '#B8912F', destaque: '#B8912F', logo: 'branco' as const, trilho: 'rgba(246,241,227,0.15)', escuro: true }
const CLARA = { titulo: '#1B2A4A', corpo: '#222222', suave: 'rgba(34,34,34,0.62)', fraco: 'rgba(34,34,34,0.5)', rotulo: '#8A6D2B', destaque: '#B8912F', logo: 'preto' as const, trilho: 'rgba(27,42,74,0.1)', escuro: false }
const PAL: Record<'marinho' | 'preto' | 'bege' | 'folha' | 'branco', Pal> = {
  marinho: { fundo: '#1B2A4A', ...ESCURA },
  preto: { fundo: '#141414', ...ESCURA },
  bege: { fundo: '#F6F1E3', ...CLARA },
  folha: { fundo: '#FFFCF4', ...CLARA },
  branco: { fundo: '#FFFFFF', ...CLARA }
}
function escolher<T>(lista: T[], v = 0): T { return lista[Math.max(0, Math.min(lista.length - 1, v))] }

/** Pinta o fundo da paleta; nas escuras, com um brilho suave no centro. */
function pintarFundo(ctx: CanvasRenderingContext2D, P: Pal, W: number, H: number, cy = 0.42, brilho = 'rgba(255,255,255,0.07)') {
  ctx.fillStyle = P.fundo
  ctx.fillRect(0, 0, W, H)
  if (!P.escuro) return
  const g = ctx.createRadialGradient(W / 2, H * cy, 40, W / 2, H * cy, H * 0.75)
  g.addColorStop(0, brilho)
  g.addColorStop(1, 'rgba(0,0,0,0.18)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

// ---------- foto: preparo, filtros e enquadramento ----------
const cacheFiltro = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>()
const LADO_MAX = 2200 // a foto é reduzida para não pesar no celular

/** Foto reduzida e com o filtro aplicado (feito uma vez e guardado). */
function fotoPreparada(img: HTMLImageElement, filtro: FiltroFoto): HTMLCanvasElement {
  let porFiltro = cacheFiltro.get(img)
  if (!porFiltro) { porFiltro = new Map(); cacheFiltro.set(img, porFiltro) }
  const pronto = porFiltro.get(filtro)
  if (pronto) return pronto
  const esc = Math.min(1, LADO_MAX / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * esc))
  c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * esc))
  const x = c.getContext('2d')!
  x.drawImage(img, 0, 0, c.width, c.height)
  if (filtro !== 'original') {
    const dados = x.getImageData(0, 0, c.width, c.height)
    const p = dados.data
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i], g = p[i + 1], b = p[i + 2]
      if (filtro === 'pb') {
        const l = 0.299 * r + 0.587 * g + 0.114 * b
        p[i] = p[i + 1] = p[i + 2] = l
      } else if (filtro === 'sepia') {
        p[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
        p[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
        p[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
      } else {
        p[i] = Math.min(255, r * 1.08 + 12)
        p[i + 1] = Math.min(255, g * 1.02 + 4)
        p[i + 2] = Math.max(0, b * 0.88 - 6)
      }
    }
    x.putImageData(dados, 0, 0)
  }
  porFiltro.set(filtro, c)
  return c
}

/** Versão bem pequena da foto; ampliada, vira um fundo desfocado (funciona em qualquer navegador). */
function fotoDesfocada(fonte: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  const esc = 28 / Math.max(fonte.width, fonte.height)
  c.width = Math.max(2, Math.round(fonte.width * esc))
  c.height = Math.max(2, Math.round(fonte.height * esc))
  c.getContext('2d')!.drawImage(fonte, 0, 0, c.width, c.height)
  return c
}
const cacheDesfoque = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>()

function cobrirFonte(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height)
  const dw = img.width * r, dh = img.height * r
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

/** Fundo desfocado da própria foto, cobrindo a área. */
function fundoDesfocado(ctx: CanvasRenderingContext2D, img: HTMLImageElement, filtro: FiltroFoto, x: number, y: number, w: number, h: number) {
  const base = fotoPreparada(img, filtro)
  let pequena = cacheDesfoque.get(base)
  if (!pequena) { pequena = fotoDesfocada(base); cacheDesfoque.set(base, pequena) }
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  if (typeof ctx.filter === 'string') {
    // navegadores com filtro de canvas: desfoque de verdade, sem degraus
    ctx.filter = `blur(${Math.round(Math.max(w, h) / 40)}px)`
    cobrirFonte(ctx, base, x - w * 0.08, y - h * 0.08, w * 1.16, h * 1.16)
    ctx.filter = 'none'
  } else {
    cobrirFonte(ctx, pequena, x - w * 0.05, y - h * 0.05, w * 1.1, h * 1.1)
  }
  ctx.restore()
}

/**
 * Desenha a foto dentro da área (x, y, w, h) seguindo o ajuste da pessoa:
 * preencher (corta para cobrir) ou caber (mostra inteira sobre um fundo),
 * zoom, deslocamento, giro, espelho e filtro.
 */
function desenharFoto(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, aj: AjusteFoto = AJUSTE_PADRAO) {
  const fonte = fotoPreparada(img, aj.filtro)
  ctx.save()
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip()
  if (aj.modo === 'caber') {
    if (aj.fundo === 'desfocado') {
      fundoDesfocado(ctx, img, aj.filtro, x, y, w, h)
      ctx.fillStyle = 'rgba(10,14,26,0.25)'
      ctx.fillRect(x, y, w, h)
    } else {
      ctx.fillStyle = aj.fundo === 'marinho' ? '#1B2A4A' : aj.fundo === 'bege' ? '#F6F1E3' : '#141414'
      ctx.fillRect(x, y, w, h)
    }
  }
  const deitada = aj.rot === 90 || aj.rot === 270
  const iw = deitada ? fonte.height : fonte.width
  const ih = deitada ? fonte.width : fonte.height
  const base = aj.modo === 'caber' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih)
  const esc = base * Math.max(0.3, aj.zoom)
  const W = ctx.canvas.width, H = ctx.canvas.height
  ctx.translate(x + w / 2 + aj.dx * W, y + h / 2 + aj.dy * H)
  ctx.rotate((aj.rot * Math.PI) / 180)
  if (aj.espelhar) ctx.scale(-1, 1)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(fonte, (-fonte.width * esc) / 2, (-fonte.height * esc) / 2, fonte.width * esc, fonte.height * esc)
  ctx.restore()
}

/** Lugar da foto quando ela ainda não foi escolhida. */
function semFoto(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, escuro = true) {
  ctx.fillStyle = escuro ? '#2b3550' : '#E6DFCC'
  ctx.fillRect(x, y, w, h)
  texto1(ctx, 'Escolha uma foto', x + w / 2, y + h / 2, `600 40px ${SANS}`, escuro ? 'rgba(246,241,227,0.65)' : 'rgba(27,42,74,0.55)')
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
  await usarFonte(d.fonteCartao)
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
  const fator: Partial<Record<ModeloTexto, number>> = {
    polaroid: 0.55, debate: 0.8, noturno: 0.85,
    'foto-faixa': 0.62, 'foto-dividida': 0.5, 'foto-moldura': 0.5, 'foto-destaque': 0.5
  }
  return Math.round(base * (fator[modelo] ?? 1))
}

async function desenharTextoModelo(canvas: HTMLCanvasElement, modelo: ModeloTexto, formato: Formato, d: DadosTexto) {
  await garantirFontes()
  const { w: W, h: H } = FORMATOS[formato]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const z = zonas(formato, H)
  const v = d.versao ?? 0
  const aj = d.ajuste ?? AJUSTE_PADRAO
  const fatorSombra = aj.escurecer / 60
  const corpo = aspas(d.tipo, d.texto || 'Escreva aqui a frase ou reflexão.')
  const italico = d.tipo === 'trecho'
  const fonteCorpo = (tam: number) => `${italico ? 'italic ' : ''}500 ${tam}px ${SERIFA}`
  const assinatura = d.nome ? (d.tipo === 'trecho' ? `Destacado por ${d.nome}` : d.nome) : ''

  if (modelo === 'pergaminho') {
    const P = escolher([PAL.bege, PAL.bege, PAL.marinho], v)
    pintarFundo(ctx, P, W, H)
    if (v !== 1) moldura(ctx, W, H)
    const simb = await logo('simbolo', P.logo)
    const hSimb = formato === 'quadrado' ? 120 : 150
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 10, hSimb)
    let y = z.topo - 10 + hSimb + 56
    texto1(ctx, ROTULO_TIPO[d.tipo], W / 2, y, `600 30px ${SANS}`, P.rotulo)
    y += 50
    const yFimTexto = z.base - 230
    const a = ajustar(ctx, corpo, W - 220, yFimTexto - y, fonteCorpo, formato === 'story' ? 76 : 64, 30, 1.32)
    ctx.fillStyle = P.titulo
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, W / 2, y + (yFimTexto - y - a.alturaTotal) / 2, a.alturaLinha, a.tam)
    ornamento(ctx, W / 2, yFimTexto + 40, 200)
    texto1(ctx, d.fonte, W / 2, yFimTexto + 108, `600 30px ${SANS}`, P.corpo, 'center', W - 220)
    if (assinatura) texto1(ctx, assinatura, W / 2, yFimTexto + 152, `400 26px ${SANS}`, P.suave, 'center', W - 220)
    const txt = await logo('texto', P.logo)
    const lTxt = formato === 'quadrado' ? 250 : 300
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 20, H - 84 - lTxt * (txt.height / txt.width)), lTxt)
    return
  }

  if (modelo === 'marinho') {
    const P = escolher([PAL.marinho, PAL.bege, PAL.preto], v)
    pintarFundo(ctx, P, W, H)
    const M = 110
    texto1(ctx, ROTULO_TIPO[d.tipo], M, z.topo + 40, `600 32px ${SANS}`, P.rotulo, 'left')
    ctx.fillStyle = P.destaque
    ctx.fillRect(M, z.topo + 70, 80, 4)
    const areaTopo = z.topo + 150
    const yFim = z.base - 200
    const extraAspas = d.tipo === 'trecho' ? 190 : 0
    const a = ajustar(ctx, d.tipo === 'trecho' ? corpo.slice(1) : corpo, W - 2 * M, yFim - areaTopo - extraAspas - 150, fonteCorpo, formato === 'story' ? 82 : 68, 30, 1.3)
    const bloco = extraAspas + a.alturaTotal + 150
    const yIni = areaTopo + Math.max(0, (yFim - areaTopo - bloco) / 2) + extraAspas
    if (d.tipo === 'trecho') texto1(ctx, '“', M - 14, yIni, `700 300px ${SERIFA}`, 'rgba(184,145,47,0.9)', 'left')
    ctx.fillStyle = P.titulo
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, M, yIni, a.alturaLinha, a.tam, 'left')
    const yAssin = yIni + a.alturaTotal + 70
    ctx.fillStyle = P.destaque
    ctx.fillRect(M, yAssin - 10, 50, 3)
    texto1(ctx, d.fonte, M, yAssin + 40, `600 30px ${SANS}`, P.rotulo, 'left', W - 2 * M)
    if (assinatura) texto1(ctx, assinatura, M, yAssin + 82, `400 26px ${SANS}`, P.suave, 'left', W - 2 * M)
    const hor = await logo('horizontal', P.logo)
    desenharLogoAltura(ctx, hor, M, z.base - 110, 110, 'esq')
    return
  }

  if (modelo === 'caderno') {
    ctx.fillStyle = C.folha
    ctx.fillRect(0, 0, W, H)
    const corFaixa = v === 1 ? C.marinho : C.preto
    // no story as faixas crescem para a logo e o lema ficarem fora da interface do Instagram
    const faixa = formato === 'story' ? 340 : formato === 'quadrado' ? 150 : 190
    ctx.fillStyle = corFaixa
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
    texto1(ctx, ROTULO_TIPO[d.tipo], M, yIni, `700 30px ${SANS}`, corFaixa, 'left')
    const caixaY = yIni + 40
    ctx.fillStyle = '#F6F1E3'
    ctx.fillRect(M, caixaY, W - 2 * M, altCaixa)
    if (v === 2) {
      // pautado: linhas de caderno sob o texto
      ctx.strokeStyle = 'rgba(27,42,74,0.16)'
      ctx.lineWidth = 2
      for (let i = 0; i < a.linhas.length; i++) {
        const yl = caixaY + 35 + i * a.alturaLinha + a.tam * 1.12
        ctx.beginPath(); ctx.moveTo(M + 30, yl); ctx.lineTo(W - M - 30, yl); ctx.stroke()
      }
    }
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
    const P = escolher([PAL.preto, PAL.marinho, PAL.preto], v)
    ctx.fillStyle = P.fundo
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H * 0.45, H * 0.6)
    g.addColorStop(0, 'rgba(184,145,47,0.12)')
    g.addColorStop(1, 'rgba(184,145,47,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    if (v !== 2) moldura(ctx, W, H)
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
    const P = escolher([PAL.marinho, PAL.preto, PAL.bege], v)
    ctx.fillStyle = P.fundo
    ctx.fillRect(0, 0, W, H)
    const tamQ = formato === 'quadrado' ? 300 : 420
    texto1(ctx, d.tipo === 'pergunta' ? '?' : '“', W / 2, z.topo + tamQ * 0.82, `600 ${tamQ}px ${SERIFA}`, P.destaque)
    let y = z.topo + tamQ * 0.82 + 70
    texto1(ctx, d.tipo === 'pergunta' ? 'Pergunta para o encontro' : d.tipo === 'aplicacao' ? 'Para aplicar' : `Para pensar: ${ROTULO_TIPO[d.tipo].toLowerCase()}`, W / 2, y, `600 32px ${SANS}`, P.rotulo)
    y += 50
    const yFim = z.base - 260
    const a = ajustar(ctx, corpo, W - 200, yFim - y, fonteCorpo, formato === 'story' ? 78 : 64, 30, 1.3)
    const yTexto = y + Math.max(0, (yFim - y - a.alturaTotal) / 2)
    ctx.fillStyle = P.titulo
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, W / 2, yTexto, a.alturaLinha, a.tam)
    texto1(ctx, d.fonte, W / 2, yFim + 50, `600 28px ${SANS}`, P.suave, 'center', W - 200)
    texto1(ctx, d.tipo === 'aplicacao' ? 'E você, o que vai aplicar?' : 'O que você acha?', W / 2, yFim + 110, `italic 500 40px ${SERIFA}`, P.rotulo)
    const txt = await logo('texto', P.logo)
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 40, H - 120), 240)
    return
  }

  if (modelo === 'polaroid') {
    const escuro = v === 1
    ctx.fillStyle = escuro ? C.marinho : '#EDE6D3'
    ctx.fillRect(0, 0, W, H)
    // moldura branca levemente inclinada, como foto revelada (reta na versão 3)
    const larg = formato === 'quadrado' ? 520 : formato === 'post' ? 600 : 720
    const altFoto = larg * (formato === 'story' ? 0.95 : 0.8)
    const margem = 30
    const altMoldura = altFoto + margem + 110
    const yMoldura = z.topo
    ctx.save()
    ctx.translate(W / 2, yMoldura + altMoldura / 2)
    if (v !== 2) ctx.rotate(-0.035)
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = 40
    ctx.shadowOffsetY = 16
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(-larg / 2 - margem, -altMoldura / 2, larg + 2 * margem, altMoldura)
    ctx.shadowColor = 'transparent'
    const xF = -larg / 2
    const yF = -altMoldura / 2 + margem
    if (d.foto) {
      // o ajuste da pessoa (zoom, posição, giro) vale dentro da moldura
      desenharFoto(ctx, d.foto, xF, yF, larg, altFoto, aj)
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
    ctx.fillStyle = escuro ? C.bege : C.marinho
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, W / 2, yIni + Math.max(0, (yFim - yIni - a.alturaTotal) / 2), a.alturaLinha, a.tam)
    texto1(ctx, d.fonte, W / 2, yFim + 40, `600 28px ${SANS}`, escuro ? C.dourado : C.douradoEscuro, 'center', W - 220)
    const txt = await logo('texto', escuro ? 'branco' : 'preto')
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 20, H - 100), 220)
    return
  }

  if (modelo === 'foto') {
    if (d.foto) desenharFoto(ctx, d.foto, 0, 0, W, H, aj)
    else semFoto(ctx, 0, 0, W, H)
    const foco = v === 1 ? 'centro' : v === 2 ? 'topo' : 'base'
    sombraEscura(ctx, W, H, 0.82, fatorSombra, foco)
    const hor = await logo('horizontal', 'branco')
    const M = 100
    const centro = v === 1
    const alinhar: CanvasTextAlign = centro ? 'center' : 'left'
    const xT = centro ? W / 2 : M
    // logo no lado oposto ao texto
    if (v === 2) desenharLogoAltura(ctx, hor, W / 2, z.base - 100, 100)
    else desenharLogoAltura(ctx, hor, W / 2, z.topo - 20, 100)
    const altMax = H * (formato === 'story' ? 0.4 : 0.46)
    const a = ajustar(ctx, corpo, W - 2 * M, altMax, fonteCorpo, formato === 'story' ? 80 : 66, 30, 1.3)
    const extra = 140 + (assinatura ? 42 : 0)
    let yIni: number
    if (v === 1) yIni = (H - a.alturaTotal - extra) / 2
    else if (v === 2) yIni = z.topo + 40
    else yIni = z.base - 150 - a.alturaTotal
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.45)'
    ctx.shadowBlur = 18
    ctx.fillStyle = '#FFFFFF'
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, xT, yIni, a.alturaLinha, a.tam, alinhar)
    ctx.restore()
    const yFim = yIni + a.alturaTotal
    ctx.fillStyle = C.dourado
    ctx.fillRect(centro ? W / 2 - 30 : M, yFim + 30, 60, 4)
    texto1(ctx, d.fonte, xT, yFim + 86, `600 30px ${SANS}`, C.dourado, alinhar, W - 2 * M)
    if (assinatura) texto1(ctx, assinatura, xT, yFim + 128, `400 26px ${SANS}`, 'rgba(255,255,255,0.8)', alinhar, W - 2 * M)
    return
  }

  if (modelo === 'foto-faixa') {
    // foto em cima, faixa de cor embaixo com o texto
    const P = escolher([PAL.marinho, PAL.bege, PAL.preto], v)
    const altFaixa = Math.round(H * (formato === 'story' ? 0.44 : formato === 'post' ? 0.46 : 0.5))
    const yFaixa = H - altFaixa
    if (d.foto) desenharFoto(ctx, d.foto, 0, 0, W, yFaixa, aj)
    else semFoto(ctx, 0, 0, W, yFaixa)
    // leve escurecimento no topo para a logo
    const gt = ctx.createLinearGradient(0, 0, 0, yFaixa * 0.4)
    gt.addColorStop(0, `rgba(10,14,26,${(0.45 * fatorSombra).toFixed(3)})`)
    gt.addColorStop(1, 'rgba(10,14,26,0)')
    ctx.fillStyle = gt
    ctx.fillRect(0, 0, W, yFaixa * 0.4)
    const simb = await logo('simbolo', 'branco')
    desenharLogoAltura(ctx, simb, W / 2, Math.max(40, z.topo - 40), formato === 'quadrado' ? 80 : 100)
    ctx.fillStyle = P.fundo
    ctx.fillRect(0, yFaixa, W, altFaixa)
    ctx.fillStyle = C.dourado
    ctx.fillRect(0, yFaixa, W, 6)
    const M = 100
    const base = Math.min(z.base, H - 40)
    const hor = await logo('horizontal', P.logo)
    const hLogo = formato === 'quadrado' ? 64 : 78
    const yLogo = base - hLogo
    const topoF = yFaixa + 56
    const fimF = yLogo - 36
    const extraF = 54 + (d.fonte ? 46 : 0) + (assinatura ? 38 : 0)
    const a = ajustar(ctx, corpo, W - 2 * M, fimF - topoF - extraF, fonteCorpo, formato === 'story' ? 66 : 56, 26, 1.28)
    let y = topoF + Math.max(0, (fimF - topoF - extraF - a.alturaTotal) / 2) + 28
    texto1(ctx, ROTULO_TIPO[d.tipo], M, y, `600 28px ${SANS}`, P.rotulo, 'left')
    y += 26
    ctx.fillStyle = P.titulo
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, M, y, a.alturaLinha, a.tam, 'left')
    y += a.alturaTotal + 46
    if (d.fonte) { texto1(ctx, d.fonte, M, y, `600 28px ${SANS}`, P.rotulo, 'left', W - 2 * M); y += 38 }
    if (assinatura) texto1(ctx, assinatura, M, y, `400 25px ${SANS}`, P.suave, 'left', W - 2 * M)
    desenharLogoAltura(ctx, hor, W - M, yLogo, hLogo, 'dir')
    return
  }

  if (modelo === 'foto-dividida') {
    // story: foto em cima e texto embaixo; post e quadrado: foto à esquerda
    const P = escolher([PAL.bege, PAL.marinho, PAL.branco], v)
    ctx.fillStyle = P.fundo
    ctx.fillRect(0, 0, W, H)
    const vertical = formato === 'story'
    const fx = 0, fy = 0
    const fw = vertical ? W : Math.round(W * 0.5)
    const fh = vertical ? Math.round(H * 0.5) : H
    if (d.foto) desenharFoto(ctx, d.foto, fx, fy, fw, fh, aj)
    else semFoto(ctx, fx, fy, fw, fh)
    const tx = vertical ? 100 : fw + 60
    const tw = vertical ? W - 200 : W - fw - 110
    const topo = vertical ? fh + 90 : Math.max(70, z.topo - 20)
    const fim = vertical ? z.base : H - 70
    const simb = await logo('simbolo', P.logo)
    const hS = vertical ? 90 : 70
    const reserva = hS + 76 + (d.fonte ? 44 : 0) + (assinatura ? 36 : 0) + 30
    const a = ajustar(ctx, corpo, tw, fim - topo - reserva, fonteCorpo, vertical ? 66 : 50, 24, 1.28)
    const y0 = topo + Math.max(0, (fim - topo - reserva - a.alturaTotal) / 2)
    desenharLogoAltura(ctx, simb, tx, y0, hS, 'esq')
    let y = y0 + hS + 50
    texto1(ctx, ROTULO_TIPO[d.tipo], tx, y, `600 ${vertical ? 28 : 24}px ${SANS}`, P.rotulo, 'left')
    y += 26
    ctx.fillStyle = P.titulo
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, tx, y, a.alturaLinha, a.tam, 'left')
    y += a.alturaTotal + 44
    if (d.fonte) { texto1(ctx, d.fonte, tx, y, `600 ${vertical ? 26 : 22}px ${SANS}`, P.rotulo, 'left', tw); y += 36 }
    if (assinatura) texto1(ctx, assinatura, tx, y, `400 ${vertical ? 24 : 21}px ${SANS}`, P.suave, 'left', tw)
    return
  }

  if (modelo === 'foto-moldura') {
    // foto com margem (passe-partout) e o texto embaixo, como página de livro
    const P = escolher([PAL.bege, PAL.branco, PAL.marinho], v)
    ctx.fillStyle = P.fundo
    ctx.fillRect(0, 0, W, H)
    const margem = formato === 'quadrado' ? 120 : 110
    const yFoto = Math.max(margem, z.topo - 30)
    const altFoto = Math.round(H * (formato === 'story' ? 0.44 : formato === 'post' ? 0.42 : 0.4))
    const wFoto = W - 2 * margem
    if (d.foto) desenharFoto(ctx, d.foto, margem, yFoto, wFoto, altFoto, aj)
    else semFoto(ctx, margem, yFoto, wFoto, altFoto, P.escuro)
    ctx.strokeStyle = C.dourado
    ctx.lineWidth = 2
    ctx.strokeRect(margem - 16, yFoto - 16, wFoto + 32, altFoto + 32)
    const txt = await logo('texto', P.logo)
    const lTxt = formato === 'quadrado' ? 200 : 240
    const hTxt = lTxt * (txt.height / txt.width)
    const yLogo = Math.min(z.base, H - 50) - hTxt
    let y = yFoto + altFoto + 80
    const reserva = 70 + (d.fonte ? 44 : 0) + (assinatura ? 36 : 0)
    const a = ajustar(ctx, corpo, W - 2 * margem, yLogo - 40 - reserva - y, fonteCorpo, formato === 'story' ? 62 : 50, 24, 1.3)
    ctx.fillStyle = P.titulo
    ctx.font = fonteCorpo(a.tam)
    const yTexto = y + Math.max(0, (yLogo - 40 - reserva - y - a.alturaTotal) / 2)
    escrever(ctx, a.linhas, W / 2, yTexto, a.alturaLinha, a.tam)
    y = yTexto + a.alturaTotal + 40
    ornamento(ctx, W / 2, y, 140)
    y += 56
    if (d.fonte) { texto1(ctx, d.fonte, W / 2, y, `600 26px ${SANS}`, P.rotulo, 'center', W - 2 * margem); y += 38 }
    if (assinatura) texto1(ctx, assinatura, W / 2, y, `400 24px ${SANS}`, P.suave, 'center', W - 2 * margem)
    desenharLogo(ctx, txt, W / 2, yLogo, lTxt)
    return
  }

  if (modelo === 'foto-destaque') {
    // fundo desfocado da própria foto e a foto nítida num cartão
    const claro = v === 1
    if (d.foto) {
      fundoDesfocado(ctx, d.foto, aj.filtro, 0, 0, W, H)
    } else {
      ctx.fillStyle = '#2b3550'
      ctx.fillRect(0, 0, W, H)
    }
    ctx.fillStyle = claro ? 'rgba(246,241,227,0.72)' : `rgba(10,14,26,${Math.min(0.85, 0.5 * fatorSombra).toFixed(3)})`
    ctx.fillRect(0, 0, W, H)
    const larg = formato === 'quadrado' ? 520 : formato === 'post' ? 640 : 760
    const alt = Math.round(larg * (formato === 'story' ? 1.0 : 0.7))
    const xC = (W - larg) / 2
    const yC = Math.max(60, z.topo - 20)
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 50
    ctx.shadowOffsetY = 20
    retArredondado(ctx, xC, yC, larg, alt, 28)
    ctx.fillStyle = '#000'
    ctx.fill()
    ctx.restore()
    ctx.save()
    retArredondado(ctx, xC, yC, larg, alt, 28)
    ctx.clip()
    if (d.foto) desenharFoto(ctx, d.foto, xC, yC, larg, alt, aj)
    else semFoto(ctx, xC, yC, larg, alt)
    ctx.restore()
    const corT = claro ? C.marinho : '#FFFFFF'
    const corR = claro ? C.douradoEscuro : C.dourado
    const hor = await logo('horizontal', claro ? 'preto' : 'branco')
    const hLogo = formato === 'quadrado' ? 60 : 76
    const yLogo = Math.min(z.base, H - 40) - hLogo
    const M = 110
    const reserva = (d.fonte ? 46 : 0) + (assinatura ? 36 : 0) + 30
    const y0 = yC + alt + 70
    const a = ajustar(ctx, corpo, W - 2 * M, yLogo - 40 - reserva - y0, fonteCorpo, formato === 'story' ? 62 : 50, 24, 1.28)
    const yTexto = y0 + Math.max(0, (yLogo - 40 - reserva - y0 - a.alturaTotal) / 2)
    ctx.fillStyle = corT
    ctx.font = fonteCorpo(a.tam)
    escrever(ctx, a.linhas, W / 2, yTexto, a.alturaLinha, a.tam)
    let y = yTexto + a.alturaTotal + 50
    if (d.fonte) { texto1(ctx, d.fonte, W / 2, y, `600 26px ${SANS}`, corR, 'center', W - 2 * M); y += 38 }
    if (assinatura) texto1(ctx, assinatura, W / 2, y, `400 24px ${SANS}`, claro ? 'rgba(34,34,34,0.6)' : 'rgba(255,255,255,0.75)', 'center', W - 2 * M)
    desenharLogoAltura(ctx, hor, W / 2, yLogo, hLogo)
    return
  }

  // minimal
  const P = escolher([PAL.folha, PAL.bege, PAL.preto], v)
  ctx.fillStyle = P.fundo
  ctx.fillRect(0, 0, W, H)
  const M = 110
  const simb = await logo('simbolo', P.logo)
  desenharLogoAltura(ctx, simb, M, z.topo - 20, 110, 'esq')
  const yIni = z.topo + 170
  const yFim = z.base - 240
  const a = ajustar(ctx, corpo, W - 2 * M, yFim - yIni, (t) => `${italico ? 'italic ' : ''}400 ${t}px ${SERIFA}`, formato === 'story' ? 92 : 76, 30, 1.25)
  ctx.fillStyle = P.titulo
  ctx.font = `${italico ? 'italic ' : ''}400 ${a.tam}px ${SERIFA}`
  escrever(ctx, a.linhas, M, yIni + (yFim - yIni - a.alturaTotal) / 2, a.alturaLinha, a.tam, 'left')
  texto1(ctx, d.fonte, M, z.base - 150, `600 30px ${SANS}`, P.rotulo, 'left', W - 2 * M)
  if (assinatura) texto1(ctx, assinatura, M, z.base - 108, `400 26px ${SANS}`, P.suave, 'left', W - 2 * M)
  ctx.fillStyle = P.escuro ? 'rgba(246,241,227,0.18)' : 'rgba(27,42,74,0.15)'
  ctx.fillRect(M, z.base - 60, W - 2 * M, 2)
  const txt = await logo('texto', P.logo)
  desenharLogoAltura(ctx, txt, W - M, z.base - 20, 56, 'dir')
}

// ======================================================================
// Modelos de leitura
// ======================================================================

export async function desenharLeitura(canvas: HTMLCanvasElement, modeloPedido: ModeloLeitura, formato: Formato, d: DadosLeitura) {
  const modelo: ModeloLeitura = modeloPedido === 'capa' ? 'lendo' : modeloPedido
  await garantirFontes()
  await usarFonte(d.fonteCartao)
  const { w: W, h: H } = FORMATOS[formato]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const z = zonas(formato, H)
  const v = d.versao ?? 0
  const aj = d.ajuste ?? AJUSTE_PADRAO
  const pct = Math.max(0, Math.min(100, Math.round(d.pct)))
  const fonteTitulo = (t: number) => `600 ${t}px ${SERIFA}`

  if (modelo === 'lendo') {
    const P = escolher([PAL.marinho, PAL.preto, PAL.bege], v)
    pintarFundo(ctx, P, W, H, 0.4, 'rgba(255,255,255,0.08)')
    // sem capa, o emblema do clube ocupa o lugar dela (arquivo oficial, sem alteração)
    const simb = d.capa ? null : await logo('simbolo', P.logo)
    const visual = d.capa ?? simb!
    const a = ajustar(ctx, d.titulo, W - 200, formato === 'quadrado' ? 150 : 220, fonteTitulo, formato === 'quadrado' ? 64 : 76, 38, 1.15)
    const areaTopo = z.topo
    const areaFim = z.base - (formato === 'quadrado' ? 170 : 150)
    const resto = 50 + 70 + a.alturaTotal + 20 + (d.autor ? 70 : 0) + 120
    // a capa (ou o emblema) encolhe se o título for longo, para nada encostar no logo
    const hVisual = Math.max(180, Math.min(formato === 'quadrado' ? 340 : formato === 'post' ? 460 : 620, areaFim - areaTopo - resto))
    const wVisual = hVisual * (visual.width / visual.height)
    const bloco = resto + hVisual
    let y = areaTopo + Math.max(0, (areaFim - areaTopo - bloco) / 2)
    texto1(ctx, 'Estou lendo', W / 2, y + 30, `600 34px ${SANS}`, P.rotulo)
    y += 50
    ctx.save()
    if (d.capa) {
      ctx.shadowColor = P.escuro ? 'rgba(0,0,0,0.5)' : 'rgba(27,42,74,0.3)'
      ctx.shadowBlur = 50
      ctx.shadowOffsetY = 20
    }
    ctx.drawImage(visual, W / 2 - wVisual / 2, y, wVisual, hVisual)
    ctx.restore()
    y += hVisual + 70
    ctx.fillStyle = P.titulo
    ctx.font = fonteTitulo(a.tam)
    escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
    y += a.alturaTotal + 20
    if (d.autor) {
      texto1(ctx, d.autor, W / 2, y + 44, `400 36px ${SANS}`, P.suave)
      y += 70
    }
    barra(ctx, 240, y + 40, W - 480, 12, pct, P.trilho, C.dourado)
    texto1(ctx, `${pct}% lido`, W / 2, y + 100, `600 30px ${SANS}`, P.rotulo)
    const hor = await logo('texto', P.logo)
    desenharLogo(ctx, hor, W / 2, z.base - 90, 280)
    return
  }

  if (modelo === 'progresso') {
    const P = escolher([PAL.bege, PAL.marinho, PAL.branco], v)
    pintarFundo(ctx, P, W, H)
    moldura(ctx, W, H)
    const simb = await logo('simbolo', P.logo)
    const hS = formato === 'quadrado' ? 110 : 140
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 20, hS)
    let y = z.topo - 20 + hS + 60
    const a = ajustar(ctx, d.titulo, W - 240, formato === 'quadrado' ? 120 : 190, fonteTitulo, 62, 34, 1.15)
    ctx.fillStyle = P.titulo
    ctx.font = fonteTitulo(a.tam)
    escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
    y += a.alturaTotal + 10
    if (d.autor) {
      texto1(ctx, d.autor, W / 2, y + 40, `400 32px ${SANS}`, P.corpo)
      y += 60
    }
    const tamPct = formato === 'story' ? 300 : formato === 'post' ? 240 : 190
    const yPct = y + tamPct * 0.95 + (formato === 'story' ? 100 : 30)
    ctx.fillStyle = P.escuro ? C.dourado : C.douradoEscuro
    ctx.font = `600 ${tamPct}px ${SERIFA}`
    ctx.textAlign = 'center'
    ctx.fillText(String(pct), W / 2 - tamPct * 0.12, yPct)
    const larguraNum = ctx.measureText(String(pct)).width
    texto1(ctx, '%', W / 2 - tamPct * 0.12 + larguraNum / 2 + 8, yPct - tamPct * 0.45, `500 ${tamPct * 0.4}px ${SERIFA}`, C.dourado, 'left')
    const yBarra = yPct + 60
    barra(ctx, 160, yBarra, W - 320, 16, pct, P.trilho, C.dourado)
    texto1(ctx, `${Math.round(d.paginas)} de ${d.total} páginas`, W / 2, yBarra + 70, `600 32px ${SANS}`, P.titulo)
    if (d.nome) texto1(ctx, d.nome, W / 2, yBarra + 116, `400 28px ${SANS}`, P.fraco)
    const txt = await logo('texto', P.logo)
    const lTxt = formato === 'quadrado' ? 250 : 300
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 30, H - 84 - lTxt * (txt.height / txt.width)), lTxt)
    return
  }

  if (modelo === 'anel') {
    const P = escolher([PAL.marinho, PAL.preto], v)
    ctx.fillStyle = P.fundo
    ctx.fillRect(0, 0, W, H)
    // logo fixo embaixo; anel, título e autor centralizados no espaço que sobra
    const hor = await logo('horizontal', 'branco')
    const hLogo = formato === 'quadrado' ? 76 : 90
    const yLogo = z.base - hLogo - (formato === 'story' ? 30 : 10)
    const areaTopo = z.topo
    const areaFim = yLogo - (formato === 'quadrado' ? 54 : 66)
    const a = ajustar(ctx, d.titulo, W - 200, formato === 'quadrado' ? 120 : 170, fonteTitulo, formato === 'quadrado' ? 56 : 64, 34, 1.15)
    const hTitulo = d.titulo ? a.alturaTotal : 0
    const hAutor = d.titulo && d.autor ? 58 : 0
    const gap = d.titulo ? (formato === 'quadrado' ? 44 : 70) : 0
    const espacoAnel = areaFim - areaTopo - gap - hTitulo - hAutor
    const raio = Math.max(150, Math.min(320, (espacoAnel - 40) / 2))
    const altura = raio * 2 + 40 + gap + hTitulo + hAutor
    const y0 = areaTopo + Math.max(0, (areaFim - areaTopo - altura) / 2)
    const cx = W / 2
    const cy = y0 + 20 + raio
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.round(raio * 0.105)
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
    const tam = Math.round(raio * 0.75)
    ctx.fillStyle = C.bege
    ctx.font = `600 ${tam}px ${SERIFA}`
    ctx.textAlign = 'center'
    ctx.fillText(String(pct), cx - tam * 0.1, cy + tam * 0.3)
    const lw = ctx.measureText(String(pct)).width
    texto1(ctx, '%', cx - tam * 0.1 + lw / 2 + 6, cy - tam * 0.12, `500 ${tam * 0.38}px ${SERIFA}`, C.dourado, 'left')
    texto1(ctx, `página ${Math.round(d.paginas)} de ${d.total}`, cx, cy + tam * 0.3 + Math.max(44, raio * 0.2), `600 ${Math.max(24, Math.round(raio * 0.094))}px ${SANS}`, 'rgba(246,241,227,0.7)')
    let y = cy + raio + 20 + gap
    if (d.titulo) {
      ctx.fillStyle = C.bege
      ctx.font = fonteTitulo(a.tam)
      escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
      y += a.alturaTotal
      if (d.autor) texto1(ctx, d.autor, W / 2, y + 44, `400 32px ${SANS}`, 'rgba(246,241,227,0.7)')
    }
    if (d.nome) texto1(ctx, d.nome, W / 2, yLogo - 18, `400 26px ${SANS}`, 'rgba(246,241,227,0.5)')
    desenharLogoAltura(ctx, hor, W / 2, yLogo, hLogo)
    return
  }

  if (modelo === 'semana') {
    const P = escolher([PAL.folha, PAL.marinho, PAL.bege], v)
    pintarFundo(ctx, P, W, H)
    moldura(ctx, W, H)
    const simb = await logo('simbolo', P.logo)
    const hS = formato === 'quadrado' ? 100 : 130
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 20, hS)
    let y = z.topo - 20 + hS + 70
    texto1(ctx, 'Minha semana de leitura', W / 2, y, `600 34px ${SANS}`, P.rotulo)
    const semana = d.semana ?? []
    const total = semana.reduce((s, x) => s + x.paginas, 0)
    const dias = semana.filter((x) => x.paginas > 0).length
    const tamTot = formato === 'quadrado' ? 150 : 200
    y += tamTot * 0.9 + 20
    texto1(ctx, String(total), W / 2, y, `600 ${tamTot}px ${SERIFA}`, P.titulo)
    texto1(ctx, total === 1 ? 'página' : 'páginas', W / 2, y + 56, `600 34px ${SANS}`, P.corpo)
    y += 120
    const altBarras = formato === 'quadrado' ? 200 : formato === 'post' ? 280 : 420
    const largArea = W - 280
    const passo = largArea / 7
    const max = Math.max(1, ...semana.map((x) => x.paginas))
    semana.forEach((x, i) => {
      const bx = 140 + i * passo + passo * 0.2
      const bw = passo * 0.6
      const bh = x.paginas > 0 ? Math.max(14, (x.paginas / max) * altBarras) : 6
      ctx.fillStyle = x.paginas > 0 ? C.dourado : P.trilho
      retArredondado(ctx, bx, y + altBarras - bh, bw, bh, 10)
      ctx.fill()
      if (x.paginas > 0) texto1(ctx, String(x.paginas), bx + bw / 2, y + altBarras - bh - 14, `600 24px ${SANS}`, P.corpo)
      texto1(ctx, x.rotulo, bx + bw / 2, y + altBarras + 44, `600 28px ${SANS}`, P.fraco)
    })
    y += altBarras + 110
    texto1(ctx, `${dias} ${dias === 1 ? 'dia' : 'dias'} com leitura${d.titulo ? `, lendo ${d.titulo}` : ''}`, W / 2, y, `italic 400 36px ${SERIFA}`, P.titulo, 'center', W - 200)
    if (d.nome) texto1(ctx, d.nome, W / 2, y + 48, `400 28px ${SANS}`, P.fraco)
    const txt = await logo('texto', P.logo)
    const lTxt = formato === 'quadrado' ? 230 : 280
    desenharLogo(ctx, txt, W / 2, Math.min(z.base - 20, H - 84 - lTxt * (txt.height / txt.width)), lTxt)
    return
  }

  if (modelo === 'constancia') {
    const P = escolher([PAL.preto, PAL.marinho], v)
    ctx.fillStyle = P.fundo
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
    const P = escolher([PAL.folha, PAL.marinho, PAL.bege], v)
    pintarFundo(ctx, P, W, H)
    moldura(ctx, W, H)
    const vert = await logo('vertical', P.logo)
    const lV = formato === 'quadrado' ? 260 : 340
    const hV = desenharLogo(ctx, vert, W / 2, z.topo - 10, lV)
    let y = z.topo - 10 + hV + (formato === 'quadrado' ? 50 : 90)
    ornamento(ctx, W / 2, y, 240)
    y += 80
    texto1(ctx, d.titulo ? 'Terminei de ler' : 'Terminei mais um livro', W / 2, y, `600 40px ${SANS}`, P.rotulo)
    y += 40
    const a = ajustar(ctx, d.titulo, W - 220, formato === 'quadrado' ? 200 : 360, fonteTitulo, formato === 'story' ? 104 : 84, 40, 1.12)
    ctx.fillStyle = P.titulo
    ctx.font = fonteTitulo(a.tam)
    escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
    y += a.alturaTotal + 20
    if (d.autor) {
      texto1(ctx, d.autor, W / 2, y + 50, `italic 400 44px ${SERIFA}`, P.corpo)
      y += 80
    }
    texto1(ctx, `${d.total} páginas`, W / 2, y + (d.titulo ? 50 : 70), `600 30px ${SANS}`, P.suave)
    if (d.nome) texto1(ctx, `Leitura de ${d.nome}`, W / 2, y + 96, `400 28px ${SANS}`, P.fraco)
    ornamento(ctx, W / 2, z.base + 10, 160)
    return
  }

  if (modelo === 'retrospectiva') {
    const r = d.retro
    const P = escolher([PAL.marinho, PAL.preto], v)
    ctx.fillStyle = P.fundo
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
      r.semContagem
        ? [String(r.sessoes ?? 0), (r.sessoes ?? 0) === 1 ? 'sessão de foco' : 'sessões de foco']
        : [String(r.maiorSequencia), r.maiorSequencia === 1 ? 'dia seguido, no máximo' : 'dias seguidos, no máximo'],
      [r.minutos >= 60 ? `${Math.round(r.minutos / 6) / 10}`.replace('.', ',') : String(r.minutos), r.minutos >= 60 ? 'horas de leitura' : 'min de leitura'],
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
    itens.forEach(([val, rot], i) => {
      const cx = M + (i % cols) * larg + larg / 2
      const cy = y + Math.floor(i / cols) * altCel
      texto1(ctx, val, cx, cy + altCel * 0.52, `600 ${tamN}px ${SERIFA}`, C.bege)
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
    const P = escolher([PAL.bege, PAL.marinho, PAL.branco], v)
    pintarFundo(ctx, P, W, H)
    moldura(ctx, W, H)
    const compacto = formato === 'quadrado'
    const simb = await logo('simbolo', P.logo)
    const hS = compacto ? 80 : 120
    desenharLogoAltura(ctx, simb, W / 2, z.topo - 30, hS)
    let y = z.topo - 30 + hS + (compacto ? 55 : 80)
    texto1(ctx, 'O clube neste livro', W / 2, y, `600 32px ${SANS}`, P.rotulo)
    y += 20
    if (d.titulo) {
      const a = ajustar(ctx, d.titulo, W - 220, compacto ? 110 : 170, fonteTitulo, compacto ? 54 : 66, 34, 1.12)
      ctx.fillStyle = P.titulo
      ctx.font = fonteTitulo(a.tam)
      escrever(ctx, a.linhas, W / 2, y, a.alturaLinha, a.tam)
      y += a.alturaTotal
    }
    y += compacto ? 30 : 60
    const tamTot = compacto ? 150 : 210
    texto1(ctx, String(gr?.paginas ?? 0), W / 2, y + tamTot * 0.8, `600 ${tamTot}px ${SERIFA}`, P.titulo)
    y += tamTot * 0.8 + 56
    texto1(ctx, 'páginas lidas juntos', W / 2, y, `600 34px ${SANS}`, P.corpo)
    y += compacto ? 50 : 80
    const txt = await logo('texto', P.logo)
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
        ctx.fillStyle = x.paginas > 0 ? C.dourado : P.trilho
        retArredondado(ctx, bx, y0 + alt - bh, bw, bh, 8)
        ctx.fill()
        texto1(ctx, x.rotulo, bx + bw / 2, y0 + alt + 30, `600 22px ${SANS}`, P.fraco)
      })
      texto1(ctx, 'últimos 14 dias', W / 2, y0 + alt + 72, `italic 400 28px ${SERIFA}`, P.suave)
    }
    const itens: [string, string][] = gr ? [
      [String(gr.leitores), gr.leitores === 1 ? 'leitor' : 'leitores'],
      [String(gr.terminaram), gr.terminaram === 1 ? 'terminou' : 'terminaram'],
      [String(gr.mural), gr.mural === 1 ? 'nota no mural' : 'notas no mural']
    ] : []
    const larg = (W - 240) / 3
    itens.forEach(([val, rot], i) => {
      const cx = 120 + larg * i + larg / 2
      texto1(ctx, val, cx, yStats + 70, `600 ${compacto ? 64 : 80}px ${SERIFA}`, P.escuro ? C.dourado : C.douradoEscuro)
      texto1(ctx, rot, cx, yStats + 115, `500 26px ${SANS}`, P.corpo)
    })
    desenharLogo(ctx, txt, W / 2, yLogo, lTxt)
    return
  }

  // foto-leitura
  const M = 100
  if (v === 0) {
    if (d.foto) desenharFoto(ctx, d.foto, 0, 0, W, H, aj)
    else semFoto(ctx, 0, 0, W, H)
    sombraEscura(ctx, W, H, 0.88, aj.escurecer / 60)
    const hor = await logo('horizontal', 'branco')
    desenharLogoAltura(ctx, hor, W / 2, z.topo - 20, 100)
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
    return
  }
  // versões com faixa: foto em cima, dados da leitura na faixa
  const P = v === 1 ? PAL.marinho : PAL.bege
  const altFaixa = Math.round(H * (formato === 'story' ? 0.38 : formato === 'post' ? 0.42 : 0.46))
  const yFaixa = H - altFaixa
  if (d.foto) desenharFoto(ctx, d.foto, 0, 0, W, yFaixa, aj)
  else semFoto(ctx, 0, 0, W, yFaixa)
  const gt = ctx.createLinearGradient(0, 0, 0, yFaixa * 0.4)
  gt.addColorStop(0, `rgba(10,14,26,${(0.45 * aj.escurecer / 60).toFixed(3)})`)
  gt.addColorStop(1, 'rgba(10,14,26,0)')
  ctx.fillStyle = gt
  ctx.fillRect(0, 0, W, yFaixa * 0.4)
  const simb = await logo('simbolo', 'branco')
  desenharLogoAltura(ctx, simb, W / 2, Math.max(40, z.topo - 40), formato === 'quadrado' ? 80 : 100)
  ctx.fillStyle = P.fundo
  ctx.fillRect(0, yFaixa, W, altFaixa)
  ctx.fillStyle = C.dourado
  ctx.fillRect(0, yFaixa, W, 6)
  const base = Math.min(z.base, H - 40)
  const hor = await logo('horizontal', P.logo)
  const hLogo = formato === 'quadrado' ? 56 : 70
  const yBarra = base - hLogo - 50
  const topoT = yFaixa + 50
  const fimT = yBarra - 100 // o percentual ocupa os ~80 px acima da barra
  const extraT = 54 + (d.autor ? 50 : 0)
  const a = ajustar(ctx, d.titulo || 'Leitura do clube', W - 2 * M, Math.max(40, fimT - topoT - extraT), fonteTitulo, formato === 'story' ? 68 : 56, 30, 1.12)
  let y = topoT + Math.max(0, (fimT - topoT - extraT - a.alturaTotal) / 2) + 30
  texto1(ctx, 'Lendo agora', M, y, `600 28px ${SANS}`, P.rotulo, 'left')
  y += 24
  ctx.fillStyle = P.titulo
  ctx.font = fonteTitulo(a.tam)
  escrever(ctx, a.linhas, M, y, a.alturaLinha, a.tam, 'left')
  y += a.alturaTotal
  if (d.autor) texto1(ctx, d.autor, M, y + 42, `400 30px ${SANS}`, P.suave, 'left', W - 2 * M)
  barra(ctx, M, yBarra, W - 2 * M, 12, pct, P.trilho, C.dourado)
  texto1(ctx, `${pct}%`, M, yBarra - 26, `600 52px ${SERIFA}`, P.escuro ? C.dourado : C.douradoEscuro, 'left')
  texto1(ctx, `${Math.round(d.paginas)} de ${d.total} páginas`, W - M, yBarra - 30, `600 26px ${SANS}`, P.suave, 'right')
  desenharLogoAltura(ctx, hor, W - M, base - hLogo, hLogo, 'dir')
  if (d.nome) texto1(ctx, d.nome, M, base - hLogo / 2 + 9, `400 26px ${SANS}`, P.fraco, 'left')
}

// ======================================================================
// Adesivo: a mesma informação da leitura, sem fundo (PNG transparente),
// para colar por cima de uma foto ou story. O recorte acompanha o conteúdo.
// ======================================================================

export type CorAdesivo = 'claro' | 'escuro'

export async function desenharAdesivo(canvas: HTMLCanvasElement, modelo: ModeloLeitura, d: DadosLeitura, cor: CorAdesivo) {
  await garantirFontes()
  await usarFonte(d.fonteCartao)
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

  if (modelo === 'capa') {
    // a capa do livro (ou o emblema do clube, se não houver capa)
    const visual: HTMLImageElement = d.capa ?? await logo('simbolo', cor === 'claro' ? 'branco' : 'preto')
    const desenharCapa = (x: number, yy: number, w: number, h: number) => {
      ctx.save()
      if (d.capa) {
        ctx.shadowColor = 'rgba(0,0,0,0.45)'
        ctx.shadowBlur = 40
        ctx.shadowOffsetY = 18
        retArredondado(ctx, x, yy, w, h, 10)
        ctx.fillStyle = '#000'
        ctx.fill()
        ctx.shadowColor = 'transparent'
        retArredondado(ctx, x, yy, w, h, 10)
        ctx.clip()
        cobrirFonte(ctx, visual, x, yy, w, h)
      } else {
        ctx.drawImage(visual, x, yy, w, h)
      }
      ctx.restore()
    }
    if ((d.versao ?? 0) === 1) {
      // capa ao lado, texto à direita
      const hC = 560
      const wC = d.capa ? Math.round(hC * Math.min(0.75, Math.max(0.55, visual.width / visual.height))) : hC * (visual.width / visual.height)
      const xC = 70
      desenharCapa(xC, y + 10, wC, hC)
      const xT = xC + wC + 56
      const wT = W - xT - 60
      let yt = y + 60
      t('Estou lendo', xT, yt, `600 40px ${SANS}`, destaque, 'left')
      yt += 30
      if (d.titulo) {
        const a = ajustar(ctx, d.titulo, wT, 250, (n) => `600 ${n}px ${SERIFA}`, 76, 40, 1.12)
        comSombra(() => { ctx.fillStyle = principal; ctx.font = `600 ${a.tam}px ${SERIFA}`; escrever(ctx, a.linhas, xT, yt, a.alturaLinha, a.tam, 'left') })
        yt += a.alturaTotal + 8
        if (d.autor) { comSombra(() => texto1(ctx, d.autor!, xT, yt + 40, `400 36px ${SANS}`, secundaria, 'left', wT)); yt += 60 }
      }
      yt = Math.max(yt + 50, y + hC - 120)
      comSombra(() => texto1(ctx, `${pct}%`, xT, yt + 60, `600 96px ${SERIFA}`, principal, 'left'))
      yt += 90
      comSombra(() => barra(ctx, xT, yt, wT, 18, pct, trilho, C.dourado))
      comSombra(() => texto1(ctx, `página ${Math.round(d.paginas)} de ${d.total}`, xT, yt + 58, `600 32px ${SANS}`, secundaria, 'left', wT))
      y = Math.max(y + hC + 60, yt + 100)
    } else {
      // capa em cima, centralizada
      const hC = d.capa ? 640 : 300
      const wC = hC * (visual.width / visual.height)
      desenharCapa(W / 2 - wC / 2, y + 10, wC, hC)
      y += hC + 90
      t('Estou lendo', W / 2, y, `600 44px ${SANS}`, destaque)
      y += 30
      if (d.titulo) {
        const a = ajustar(ctx, d.titulo, W - 140, 220, (n) => `600 ${n}px ${SERIFA}`, 84, 44, 1.12)
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
  } else if (modelo === 'constancia') {
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

// ======================================================================
// Minha estante: as capas e os nomes dos livros, para compartilhar
// ======================================================================

export interface LivroEstante { titulo: string; autor: string | null; capa: HTMLImageElement | null }
export const VERSOES_ESTANTE = ['Marinho', 'Bege', 'Preto']

export async function desenharEstante(
  canvas: HTMLCanvasElement,
  formato: Formato,
  d: { livros: LivroEstante[]; titulo: string; subtitulo: string; nome: string | null; versao?: number; fonteCartao?: FonteCartao }
) {
  await garantirFontes()
  await usarFonte(d.fonteCartao)
  const { w: W, h: H } = FORMATOS[formato]
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const z = zonas(formato, H)
  const P = escolher([PAL.marinho, PAL.bege, PAL.preto], d.versao ?? 0)
  pintarFundo(ctx, P, W, H, 0.35)
  moldura(ctx, W, H, P.escuro ? 'rgba(184,145,47,0.85)' : C.dourado)

  // cabeçalho
  const simb = await logo('simbolo', P.logo)
  const hS = formato === 'quadrado' ? 70 : 96
  desenharLogoAltura(ctx, simb, W / 2, z.topo - 30, hS)
  let y = z.topo - 30 + hS + 56
  texto1(ctx, d.titulo, W / 2, y + 20, `600 ${formato === 'quadrado' ? 52 : 64}px ${SERIFA}`, P.titulo)
  y += formato === 'quadrado' ? 66 : 80
  texto1(ctx, d.subtitulo, W / 2, y, `600 28px ${SANS}`, P.rotulo, 'center', W - 200)
  y += formato === 'quadrado' ? 40 : 60

  // rodapé
  const txt = await logo('texto', P.logo)
  const lTxt = formato === 'quadrado' ? 190 : 230
  const hTxt = lTxt * (txt.height / txt.width)
  const yLogo = Math.min(z.base, H - 90) - hTxt
  const yFim = yLogo - (d.nome ? 70 : 40)

  // grade de capas: o maior tamanho que cabe
  const M = 110
  const max = formato === 'quadrado' ? 9 : 12
  const livros = d.livros.slice(0, max)
  const sobra = d.livros.length - livros.length
  const n = Math.max(1, livros.length)
  const gap = formato === 'quadrado' ? 26 : 34
  let melhor = { cols: 1, w: 0, h: 0 }
  for (let cols = 1; cols <= Math.min(4, n); cols++) {
    const linhas = Math.ceil(n / cols)
    const wPorLargura = (W - 2 * M - (cols - 1) * gap) / cols
    const espacoTitulo = 78
    const wPorAltura = ((yFim - y - (linhas - 1) * gap) / linhas - espacoTitulo) / 1.5
    const w = Math.min(wPorLargura, wPorAltura, formato === 'quadrado' ? 300 : formato === 'post' ? 400 : 520)
    if (w > melhor.w) melhor = { cols, w, h: w * 1.5 }
  }
  const { cols, w: wC, h: hC } = melhor
  const linhas = Math.ceil(n / cols)
  const altCelula = hC + 78
  const altGrade = linhas * altCelula + (linhas - 1) * gap
  const y0 = y + Math.max(0, (yFim - y - altGrade) / 2)
  const tamTit = Math.max(20, Math.min(30, Math.round(wC / 8)))
  for (let i = 0; i < livros.length; i++) {
    const l = livros[i]
    const linha = Math.floor(i / cols)
    const naLinha = Math.min(cols, livros.length - linha * cols)
    const larguraLinha = naLinha * wC + (naLinha - 1) * gap
    const x = (W - larguraLinha) / 2 + (i - linha * cols) * (wC + gap)
    const yy = y0 + linha * (altCelula + gap)
    ctx.save()
    ctx.shadowColor = P.escuro ? 'rgba(0,0,0,0.5)' : 'rgba(27,42,74,0.28)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 10
    retArredondado(ctx, x, yy, wC, hC, 6)
    ctx.fillStyle = P.escuro ? '#0f1830' : '#E9E1CC'
    ctx.fill()
    ctx.restore()
    ctx.save()
    retArredondado(ctx, x, yy, wC, hC, 6)
    ctx.clip()
    if (l.capa) {
      cobrirFonte(ctx, l.capa, x, yy, wC, hC)
    } else {
      // sem capa: emblema do clube e o título no lugar
      ctx.fillStyle = P.escuro ? '#25365c' : '#E3D9BF'
      ctx.fillRect(x, yy, wC, hC)
      const s2 = await logo('simbolo', P.escuro ? 'branco' : 'preto')
      desenharLogoAltura(ctx, s2, x + wC / 2, yy + hC * 0.14, hC * 0.3)
      const a = ajustar(ctx, l.titulo, wC - 24, hC * 0.42, (t) => `600 ${t}px ${SERIFA}`, Math.round(wC / 7), 14, 1.15)
      ctx.fillStyle = P.escuro ? C.bege : C.marinho
      ctx.font = `600 ${a.tam}px ${SERIFA}`
      escrever(ctx, a.linhas, x + wC / 2, yy + hC * 0.52, a.alturaLinha, a.tam)
    }
    ctx.restore()
    // título embaixo da capa (até 2 linhas)
    ctx.font = `600 ${tamTit}px ${SERIFA}`
    let ls = quebrar(ctx, l.titulo, wC + gap - 8)
    if (ls.length > 2) { ls = ls.slice(0, 2); ls[1] = ls[1].replace(/\s*\S*$/, '') + '…' }
    ctx.fillStyle = P.titulo
    escrever(ctx, ls, x + wC / 2, yy + hC + 12, tamTit * 1.18, tamTit)
  }
  if (sobra > 0) texto1(ctx, `e mais ${sobra} ${sobra === 1 ? 'livro' : 'livros'}`, W / 2, yFim + 10, `italic 400 30px ${SERIFA}`, P.suave)
  if (!d.livros.length) texto1(ctx, 'Os livros terminados aparecem aqui.', W / 2, (y + yFim) / 2, `italic 400 38px ${SERIFA}`, P.suave)

  if (d.nome) texto1(ctx, d.nome, W / 2, yLogo - 28, `400 28px ${SANS}`, P.fraco)
  desenharLogo(ctx, txt, W / 2, yLogo, lTxt)
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
