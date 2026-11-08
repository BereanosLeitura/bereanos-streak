import { useEffect, useRef, useState, type ReactNode } from 'react'
import { criarRegistroLeitura, salvarSessaoPomodoro } from '../lib/sync'
import { supabase, type Perfil } from '../lib/supabase'
import { useMinhaLeitura } from '../lib/leitura'
import { useAviso } from '../components/Toast'
import Icone, { type NomeIcone } from '../components/Icone'
import { chaveDia, contar } from '../lib/estatisticas'
import { planoCiclo } from '../lib/infograficos'
import type { LivroAtivo } from './Inicio'

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  onFocoAtivo: (ativo: boolean) => void
}

const CHAVE_SESSAO = 'bereanos-streak-pomodoro-ativo'
const CHAVE_INTERVALO = 'bereanos-streak-intervalo'
const CHAVE_CONFIG = 'bereanos-streak-pomodoro-config'
const PRESETS = [15, 25, 45, 60]

// Ciclo Pomodoro: foco, pausa curta e, a cada N sessões, uma pausa longa.
interface Config {
  modo: 'pomodoro' | 'livre' // livre: cronômetro sem limite, encerra quando quiser
  foco: number
  curta: number
  longa: number
  ciclo: number // sessões até a pausa longa
  autoPausa: boolean // a pausa começa sozinha ao salvar a sessão
}
const CONFIG_PADRAO: Config = { modo: 'pomodoro', foco: 25, curta: 5, longa: 15, ciclo: 4, autoPausa: true }

interface Intervalo {
  fim: number
  total: number // segundos
  tipo: 'curta' | 'longa'
}

interface SessaoAtiva {
  id: string
  livro_id: string
  inicio: string // ISO
  duracao_minutos: number
  pausadoEm?: string | null // ISO de quando pausou
  pausaMs?: number // total já pausado
  livre?: boolean
  metaPagina?: number | null // onde a pessoa quer chegar nesta sessão
  notas?: number // anotações feitas durante a sessão
}

const LIMITE_LIVRE = 240 // minutos: teto do modo livre

type Som = 'nenhum' | 'suave' | 'chuva'

// O timer NUNCA conta a partir de um intervalo em memória: sempre recalcula a
// partir do horário de início salvo (e do tempo pausado). Assim o tempo
// continua certo mesmo com o app fechado.

function ler<T>(chave: string): T | null {
  try {
    const v = localStorage.getItem(chave)
    return v ? (JSON.parse(v) as T) : null
  } catch {
    return null
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    // modo privado: segue sem persistir
  }
}

function pausadoAgoraMs(s: SessaoAtiva) {
  return s.pausadoEm ? Date.now() - new Date(s.pausadoEm).getTime() : 0
}
function restanteSeg(s: SessaoAtiva) {
  const fim = new Date(s.inicio).getTime() + s.duracao_minutos * 60_000 + (s.pausaMs ?? 0) + pausadoAgoraMs(s)
  return Math.max(0, Math.round((fim - Date.now()) / 1000))
}
function decorridoSeg(s: SessaoAtiva) {
  return Math.max(0, Math.round((Date.now() - new Date(s.inicio).getTime() - (s.pausaMs ?? 0) - pausadoAgoraMs(s)) / 1000))
}
function focadoMin(s: SessaoAtiva) {
  const ms = Date.now() - new Date(s.inicio).getTime() - (s.pausaMs ?? 0) - pausadoAgoraMs(s)
  return Math.min(s.duracao_minutos, Math.floor(ms / 60_000))
}

// ---------- som ambiente (gerado no próprio navegador, sem arquivos) ----------
function criarSom(tipo: Exclude<Som, 'nenhum'>) {
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  const ctx: AudioContext = new Ctx()
  const segundos = 4
  const buffer = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate)
  const dados = buffer.getChannelData(0)
  let ultimo = 0
  let b0 = 0, b1 = 0, b2 = 0
  for (let i = 0; i < dados.length; i++) {
    const branco = Math.random() * 2 - 1
    if (tipo === 'suave') {
      // ruído marrom: grave e contínuo
      ultimo = (ultimo + 0.02 * branco) / 1.02
      dados[i] = ultimo * 3.2
    } else {
      // ruído rosa: mais aberto, lembra chuva fina
      b0 = 0.99765 * b0 + branco * 0.099046
      b1 = 0.963 * b1 + branco * 0.2965164
      b2 = 0.57 * b2 + branco * 1.0526913
      dados[i] = (b0 + b1 + b2 + branco * 0.1848) * 0.11
    }
  }
  const fonte = ctx.createBufferSource()
  fonte.buffer = buffer
  fonte.loop = true
  const filtro = ctx.createBiquadFilter()
  filtro.type = 'lowpass'
  filtro.frequency.value = tipo === 'suave' ? 900 : 5000
  const ganho = ctx.createGain()
  ganho.gain.value = 0
  ganho.gain.linearRampToValueAtTime(tipo === 'suave' ? 0.5 : 0.35, ctx.currentTime + 1.5)
  fonte.connect(filtro).connect(ganho).connect(ctx.destination)
  fonte.start()
  return () => {
    try {
      ganho.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
      setTimeout(() => ctx.close().catch(() => {}), 500)
    } catch {
      // já fechado
    }
  }
}

function tocarSino() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.35, 0.7].forEach((atraso, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = [880, 660, 990][i]
      g.gain.setValueAtTime(0.0001, ctx.currentTime + atraso)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + atraso + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + atraso + 1.2)
      osc.connect(g).connect(ctx.destination)
      osc.start(ctx.currentTime + atraso)
      osc.stop(ctx.currentTime + atraso + 1.3)
    })
  } catch {
    // sem áudio
  }
}

export default function Pomodoro({ perfil, livro, onFocoAtivo }: Props) {
  const leitura = useMinhaLeitura(perfil, livro)
  const [sessao, setSessao] = useState<SessaoAtiva | null>(() => ler<SessaoAtiva>(CHAVE_SESSAO))
  const [config, setConfigEstado] = useState<Config>(() => ({ ...CONFIG_PADRAO, ...(ler<Partial<Config>>(CHAVE_CONFIG) ?? {}) }))
  const [intervalo, setIntervalo] = useState<Intervalo | null>(() => {
    const v = ler<Intervalo | number>(CHAVE_INTERVALO)
    return v && typeof v === 'object' && v.fim > Date.now() ? v : null
  })
  const [pausaAcabou, setPausaAcabou] = useState(false)
  const [ajustes, setAjustes] = useState(false)
  const duracao = config.foco
  function setConfig(c: Partial<Config>) {
    setConfigEstado((atual) => {
      const novo = { ...atual, ...c }
      gravar(CHAVE_CONFIG, novo)
      return novo
    })
  }
  function setDuracao(f: number | ((d: number) => number)) {
    setConfig({ foco: typeof f === 'function' ? f(config.foco) : f })
  }
  const [restante, setRestante] = useState(0)
  const [terminada, setTerminada] = useState<{ minutos: number } | null>(null)
  const [modoFim, setModoFim] = useState<'pagina' | 'quantidade'>('pagina')
  const [valorFim, setValorFim] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [som, setSom] = useState<Som>('nenhum')
  const [anotando, setAnotando] = useState(false)
  const [sessoesSemana, setSessoesSemana] = useState<{ fim: string; duracao_minutos: number }[]>([])
  const [metaPagina, setMetaPagina] = useState('')
  const [, forcar] = useState(0)
  const pararSom = useRef<(() => void) | null>(null)
  const wakeLock = useRef<any>(null)
  const avisar = useAviso()

  useEffect(() => { carregarSemana() }, [])
  async function carregarSemana() {
    const desde = new Date()
    desde.setDate(desde.getDate() - 6)
    desde.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('sessoes_pomodoro')
      .select('fim, duracao_minutos')
      .eq('membro_id', perfil.id)
      .eq('status', 'concluida')
      .gte('fim', desde.toISOString())
    setSessoesSemana((data ?? []).filter((s) => s.fim) as { fim: string; duracao_minutos: number }[])
  }

  // tela cheia durante a sessão
  useEffect(() => {
    onFocoAtivo(!!sessao && !terminada)
    return () => onFocoAtivo(false)
  }, [sessao, terminada])

  // relógio
  useEffect(() => {
    if (!sessao || terminada) return
    const tick = () => {
      const r = restanteSeg(sessao)
      setRestante(r)
      document.title = r > 0 ? `${sessao.pausadoEm ? 'Pausado' : formatar(sessao.livre ? decorridoSeg(sessao) : r)} · Foco` : 'Sessão concluída'
      if (r === 0 && !sessao.pausadoEm) {
        // só toca o sino se acabou agora (não ao reabrir o app horas depois)
        const fimReal = new Date(sessao.inicio).getTime() + sessao.duracao_minutos * 60_000 + (sessao.pausaMs ?? 0)
        terminar(sessao.duracao_minutos, Date.now() - fimReal < 60_000)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    pedirWakeLock()
    return () => {
      clearInterval(id)
      document.title = 'Bereanos | Leitura'
      liberarWakeLock()
    }
  }, [sessao, terminada])

  // relógio da pausa
  useEffect(() => {
    if (!intervalo) return
    const id = setInterval(() => {
      forcar((x) => x + 1)
      if (Date.now() >= intervalo.fim) {
        tocarSino()
        try {
          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            new Notification('Pausa terminada', { body: 'Hora de voltar ao livro.' })
          }
        } catch { /* ok */ }
        encerrarPausa(true)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [intervalo])

  function comecarPausa(tipo: 'curta' | 'longa') {
    const total = (tipo === 'longa' ? config.longa : config.curta) * 60
    const novo: Intervalo = { fim: Date.now() + total * 1000, total, tipo }
    gravar(CHAVE_INTERVALO, novo)
    setPausaAcabou(false)
    setIntervalo(novo)
  }
  function encerrarPausa(acabou: boolean) {
    gravar(CHAVE_INTERVALO, null)
    setIntervalo(null)
    setPausaAcabou(acabou)
  }
  function maisUmMinuto() {
    if (!intervalo) return
    const novo = { ...intervalo, fim: intervalo.fim + 60_000, total: intervalo.total + 60 }
    gravar(CHAVE_INTERVALO, novo)
    setIntervalo(novo)
  }

  // som ambiente acompanha o estado da sessão
  useEffect(() => {
    pararSom.current?.()
    pararSom.current = null
    if (som !== 'nenhum' && sessao && !sessao.pausadoEm && !terminada) {
      try { pararSom.current = criarSom(som) } catch { /* sem áudio */ }
    }
    return () => { pararSom.current?.(); pararSom.current = null }
  }, [som, sessao?.pausadoEm, !!sessao, terminada])

  async function pedirWakeLock() {
    try { wakeLock.current = await (navigator as any).wakeLock?.request('screen') } catch { /* sem suporte */ }
  }
  function liberarWakeLock() {
    wakeLock.current?.release?.().catch(() => {})
    wakeLock.current = null
  }

  function terminar(minutos: number, chegouAoFim: boolean) {
    setTerminada({ minutos })
    setValorFim('')
    if (chegouAoFim) {
      tocarSino()
      try { navigator.vibrate?.([200, 120, 200]) } catch { /* sem vibração */ }
      try {
        if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification('Sessão de leitura concluída', { body: `${contar(minutos, 'minuto', 'minutos')} em ${livro.titulo}.` })
        }
      } catch { /* só via service worker em alguns celulares */ }
    }
  }

  function iniciar() {
    const livre = config.modo === 'livre'
    const meta = parseInt(metaPagina, 10)
    const nova: SessaoAtiva = {
      id: crypto.randomUUID(), livro_id: livro.id, inicio: new Date().toISOString(),
      duracao_minutos: livre ? LIMITE_LIVRE : duracao, pausadoEm: null, pausaMs: 0, livre,
      metaPagina: meta > leitura.paginasLivro ? Math.min(meta, livro.paginas_totais) : null, notas: 0
    }
    gravar(CHAVE_SESSAO, nova)
    gravar(CHAVE_INTERVALO, null)
    setIntervalo(null)
    setPausaAcabou(false)
    setTerminada(null)
    setSessao(nova)
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission() } catch { /* ok */ }
  }

  function alternarPausa() {
    if (!sessao) return
    const nova: SessaoAtiva = sessao.pausadoEm
      ? { ...sessao, pausaMs: (sessao.pausaMs ?? 0) + pausadoAgoraMs(sessao), pausadoEm: null }
      : { ...sessao, pausadoEm: new Date().toISOString() }
    gravar(CHAVE_SESSAO, nova)
    setSessao(nova)
  }

  function encerrarAgora() {
    if (!sessao) return
    const min = focadoMin(sessao)
    if (min < 1) return cancelar()
    terminar(min, false)
  }

  function cancelar() {
    gravar(CHAVE_SESSAO, null)
    setSessao(null)
    setTerminada(null)
  }

  const paginasDoFim = (() => {
    const n = parseInt(valorFim, 10)
    if (!n || n <= 0) return 0
    return modoFim === 'quantidade' ? n : n - leitura.paginasLivro
  })()

  async function concluir(comPaginas: boolean) {
    if (!sessao || !terminada) return
    if (comPaginas && paginasDoFim <= 0) {
      avisar(modoFim === 'pagina' ? `Informe uma página depois da ${leitura.paginasLivro}` : 'Informe quantas páginas leu', 'erro')
      return
    }
    setSalvando(true)
    await salvarSessaoPomodoro({
      id: sessao.id, membro_id: perfil.id, livro_id: sessao.livro_id, inicio: sessao.inicio,
      fim: new Date().toISOString(), duracao_minutos: terminada.minutos, status: 'concluida', sync_status: 'pendente'
    })
    // com páginas, o registro usa só as páginas (dado real); sem elas, os minutos
    await criarRegistroLeitura({
      membro_id: perfil.id, livro_id: sessao.livro_id, origem: 'pomodoro',
      minutos_lidos: comPaginas ? null : terminada.minutos, paginas_lidas: comPaginas ? paginasDoFim : null
    })
    setSalvando(false)
    gravar(CHAVE_SESSAO, null)
    setSessao(null)
    setTerminada(null)
    avisar(`Sessão de ${terminada.minutos} min registrada`)
    leitura.recarregar()
    carregarSemana()
    // ciclo Pomodoro: pausa longa a cada N sessões concluídas no dia
    setMetaPagina('')
    if (config.autoPausa && !sessao.livre) {
      const feitasHoje = sessoesSemana.filter((x) => chaveDia(x.fim) === chaveDia(new Date())).length + 1
      comecarPausa(feitasHoje % config.ciclo === 0 ? 'longa' : 'curta')
    }
  }

  // ---------- telas ----------
  const hojeChaveP = chaveDia(new Date())
  const feitasHojeP = sessoesSemana.filter((x) => chaveDia(x.fim) === hojeChaveP).length
  const posicaoCiclo = feitasHojeP % config.ciclo // quantas do ciclo atual já foram

  if (sessao && terminada) {
    return (
      <Tela>
        <div className="cartao p-6 w-full max-w-sm text-center animate-subir-suave">
          <span className="w-14 h-14 rounded-full bg-dourado/15 text-dourado-escuro dark:text-dourado mx-auto flex items-center justify-center">
            <Icone nome="check" className="w-7 h-7" traco={2} />
          </span>
          <h1 className="font-serif text-[26px] text-marinho dark:text-bege mt-4">{contar(terminada.minutos, 'minuto', 'minutos')} de leitura</h1>
          <p className="legenda mt-1">
            Você começou na página {leitura.paginasLivro}{sessao.metaPagina ? ` e queria chegar à ${sessao.metaPagina}` : ''}.
            {sessao.notas ? ` ${sessao.notas} ${sessao.notas === 1 ? 'anotação feita' : 'anotações feitas'} nesta sessão.` : ''}
          </p>
          {sessao.metaPagina && modoFim === 'pagina' && !valorFim && (
            <button onClick={() => setValorFim(String(sessao.metaPagina))} className="botao-texto text-sm mt-2">Cheguei à página {sessao.metaPagina}</button>
          )}

          <div className="grid grid-cols-2 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mt-5">
            {([['pagina', 'Parei na página'], ['quantidade', 'Quantas li']] as const).map(([m, r]) => (
              <button key={m} onClick={() => { setModoFim(m); setValorFim('') }}
                className={`rounded-lg py-2 text-sm font-semibold ${modoFim === m ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
                {r}
              </button>
            ))}
          </div>
          <input
            type="number" inputMode="numeric" min={1} autoFocus value={valorFim}
            onChange={(e) => setValorFim(e.target.value)}
            placeholder={modoFim === 'pagina' ? String(leitura.paginasLivro + 1) : 'páginas'}
            className="w-full bg-transparent text-center font-serif tabular text-[56px] leading-none text-marinho dark:text-bege placeholder:text-texto/15 dark:placeholder:text-bege/15 focus:outline-none py-3"
          />
          <p className="text-sm text-texto/55 dark:text-bege/55 min-h-[20px]">
            {paginasDoFim > 0 ? `${paginasDoFim} páginas nesta sessão` : modoFim === 'pagina' ? 'Digite a página em que você parou.' : ''}
          </p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => concluir(true)} disabled={salvando || paginasDoFim <= 0} className="botao-primario">Salvar</button>
            <button onClick={() => concluir(false)} disabled={salvando} className="botao-secundario">Só o tempo</button>
          </div>
          <p className="text-xs text-texto/45 dark:text-bege/45 mt-3">
            "Só o tempo" converte os minutos em páginas pelo seu ritmo ({String(perfil.ritmo_leitura_min_por_pagina).replace('.', ',')} min por página).
          </p>
          <button onClick={cancelar} className="text-sm text-texto/45 dark:text-bege/45 mt-4 hover:underline underline-offset-4">Descartar sessão</button>
        </div>
      </Tela>
    )
  }

  if (sessao) {
    const total = sessao.duracao_minutos * 60
    const decorrido = decorridoSeg(sessao)
    const progresso = sessao.livre ? (decorrido % 3600) / 3600 : 1 - restante / total
    const estimadas = Math.floor(decorrido / 60 / (perfil.ritmo_leitura_min_por_pagina || 2))
    const r = 46
    const c = 2 * Math.PI * r
    const pausado = !!sessao.pausadoEm
    const termino = new Date(Date.now() + restante * 1000)
    return (
      <div className="min-h-screen flex flex-col items-center justify-between px-5 pt-10 pb-10">
        <div className="text-center">
          <p className="text-sm text-dourado-escuro dark:text-dourado">{pausado ? 'Pausado' : 'Em foco'}</p>
          <p className="font-serif text-xl text-marinho dark:text-bege mt-0.5 max-w-xs truncate">{livro.titulo}</p>
          <p className="text-xs text-texto/45 dark:text-bege/45">
            a partir da página {leitura.paginasLivro}{sessao.metaPagina ? `, meta: página ${sessao.metaPagina}` : ''}
          </p>
          {!sessao.livre && <div className="flex justify-center"><Ciclo feitas={posicaoCiclo} total={config.ciclo} /></div>}
        </div>

        <div className={`relative w-72 h-72 ${pausado ? 'opacity-60' : ''} transition-opacity`}>
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="1.5" className="stroke-marinho/10 dark:stroke-bege/10" />
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="3" strokeLinecap="round" stroke="#B8912F"
              strokeDasharray={c} strokeDashoffset={c * (1 - progresso)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif tabular text-[72px] leading-none text-marinho dark:text-bege">{formatar(sessao.livre ? decorrido : restante)}</p>
            <p className="text-sm text-texto/50 dark:text-bege/50 mt-2">
              {pausado ? 'toque em continuar' : sessao.livre ? 'leitura livre, encerre quando quiser' : `termina às ${termino.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
            {estimadas > 0 && <p className="text-xs text-dourado-escuro dark:text-dourado mt-1">cerca de {estimadas} {estimadas === 1 ? 'página' : 'páginas'} no seu ritmo</p>}
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div className="flex justify-center gap-2">
            {([['nenhum', 'Silêncio', 'x'], ['suave', 'Ruído suave', 'som'], ['chuva', 'Chuva fina', 'gota']] as [Som, string, NomeIcone][]).map(([s, rot, ic]) => (
              <button key={s} onClick={() => setSom(s)} className={`chip flex items-center gap-1.5 ${som === s ? 'chip-ativo' : ''}`}>
                <Icone nome={ic} className="w-4 h-4" /> {rot}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <BotaoRedondo icone={pausado ? 'seta-direita' : 'pausa'} rotulo={pausado ? 'Continuar' : 'Pausar'} destaque onClick={alternarPausa} />
            <BotaoRedondo icone="pena" rotulo="Anotar" onClick={() => setAnotando(true)} />
            <BotaoRedondo icone="check" rotulo="Encerrar" onClick={encerrarAgora} />
          </div>
          <button onClick={cancelar} className="w-full text-sm text-texto/45 dark:text-bege/45 hover:underline underline-offset-4">Cancelar sem registrar</button>
        </div>

        {anotando && <AnotacaoRapida perfil={perfil} livro={livro} paginaSugerida={leitura.paginasLivro} onFechar={() => setAnotando(false)}
          onSalva={() => { const n = { ...sessao, notas: (sessao.notas ?? 0) + 1 }; gravar(CHAVE_SESSAO, n); setSessao(n) }} />}
      </div>
    )
  }

  // ---------- pausa do ciclo Pomodoro ----------

  if (intervalo) {
    const seg = Math.max(0, Math.round((intervalo.fim - Date.now()) / 1000))
    const prog = 1 - seg / intervalo.total
    const r = 46
    const c = 2 * Math.PI * r
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 pt-8 pb-28 text-center">
        <p className="text-sm font-semibold text-dourado-escuro dark:text-dourado">{intervalo.tipo === 'longa' ? 'Pausa longa' : 'Pausa curta'}</p>
        <h1 className="font-serif text-[28px] text-marinho dark:text-bege mt-1">Hora de descansar</h1>
        <Ciclo feitas={posicaoCiclo === 0 && feitasHojeP > 0 ? config.ciclo : posicaoCiclo} total={config.ciclo} />
        <div className="relative w-60 h-60 my-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="1.5" className="stroke-marinho/10 dark:stroke-bege/10" />
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-marinho/60 dark:stroke-bege/70"
              strokeDasharray={c} strokeDashoffset={c * (1 - prog)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-serif tabular text-[60px] leading-none text-marinho dark:text-bege">{formatar(seg)}</p>
          </div>
        </div>
        <p className="legenda max-w-[280px]">
          {intervalo.tipo === 'longa'
            ? 'Você completou um ciclo. Levante, beba água, descanse a vista.'
            : 'Levante um pouco, olhe para longe e respire. A próxima sessão vem já.'}
        </p>
        <div className="flex gap-2 mt-6 w-full max-w-xs">
          <button onClick={maisUmMinuto} className="botao-secundario">+1 minuto</button>
          <button onClick={() => encerrarPausa(false)} className="botao-secundario">Pular pausa</button>
        </div>
        <button onClick={iniciar} className="botao-texto mt-5">Começar a próxima sessão agora ({config.foco} min)</button>
      </div>
    )
  }

  // escolha da duração (e, se for o caso, intervalo em andamento)
  const hojeChave = chaveDia(new Date())
  const deHoje = sessoesSemana.filter((s) => chaveDia(s.fim) === hojeChave)
  const minutosHoje = deHoje.reduce((a, s) => a + (s.duracao_minutos ?? 0), 0)
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const k = chaveDia(d)
    return { k, letra: d.toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase(), min: sessoesSemana.filter((s) => chaveDia(s.fim) === k).reduce((a, s) => a + s.duracao_minutos, 0) }
  })
  const maxMin = Math.max(30, ...dias.map((d) => d.min))

  return (
    <div className="min-h-screen px-5 pt-8 pb-28">
      <div className="max-w-sm mx-auto text-center">
        <h1 className="font-serif text-[30px] text-marinho dark:text-bege">Sessão de foco</h1>
        <p className="legenda mt-1">Celular de lado, livro na mão. Você está na página {leitura.paginasLivro}.</p>

        {pausaAcabou && (
          <div className="cartao p-4 mt-5 flex items-center gap-3 text-left border-dourado/40 animate-subir-suave">
            <Icone nome="check" className="w-6 h-6 text-dourado shrink-0" traco={2} />
            <p className="flex-1 text-[15px] text-marinho dark:text-bege">Pausa terminada. Pronto para a próxima sessão?</p>
            <button onClick={() => setPausaAcabou(false)} aria-label="Fechar aviso" className="p-1 text-texto/40 dark:text-bege/40"><Icone nome="x" className="w-4 h-4" /></button>
          </div>
        )}

        <div className="grid grid-cols-2 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mt-5" role="tablist">
          {([['pomodoro', 'Pomodoro'], ['livre', 'Leitura livre']] as const).map(([m, r]) => (
            <button key={m} role="tab" aria-selected={config.modo === m} onClick={() => setConfig({ modo: m })}
              className={`rounded-lg py-2 text-sm font-semibold ${config.modo === m ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
              {r}
            </button>
          ))}
        </div>

        {config.modo === 'pomodoro' ? (<>
        <div className="mt-5 flex flex-col items-center">
          <Ciclo feitas={posicaoCiclo} total={config.ciclo} />
          <p className="text-xs text-texto/50 dark:text-bege/50 mt-1.5">
            {config.ciclo - posicaoCiclo === 1
              ? `Depois desta sessão vem a pausa longa (${config.longa} min)`
              : `Sessão ${posicaoCiclo + 1} de ${config.ciclo}. Pausa curta de ${config.curta} min depois`}
          </p>
        </div>

        <div className="my-8 flex items-center justify-center gap-5">
          <button onClick={() => setDuracao((d) => Math.max(5, d - 5))} aria-label="Diminuir 5 minutos"
            className="w-11 h-11 rounded-full border border-marinho/15 dark:border-bege/15 text-xl text-marinho dark:text-bege hover:border-dourado">−</button>
          <div className="w-40">
            <p className="font-serif tabular text-[88px] leading-none text-marinho dark:text-bege">{duracao}</p>
            <p className="text-sm text-texto/50 dark:text-bege/50 mt-1">minutos</p>
          </div>
          <button onClick={() => setDuracao((d) => Math.min(120, d + 5))} aria-label="Aumentar 5 minutos"
            className="w-11 h-11 rounded-full border border-marinho/15 dark:border-bege/15 text-xl text-marinho dark:text-bege hover:border-dourado">+</button>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {PRESETS.map((m) => (
            <button key={m} onClick={() => setDuracao(m)} className={`chip ${duracao === m ? 'chip-ativo' : ''}`}>{m} min</button>
          ))}
        </div>
        </>) : (
          <div className="my-8">
            <p className="font-serif tabular text-[64px] leading-none text-marinho dark:text-bege">00:00</p>
            <p className="text-sm text-texto/55 dark:text-bege/55 mt-2 max-w-[260px] mx-auto">O cronômetro conta para cima, sem limite de tempo. Encerre quando terminar de ler.</p>
          </div>
        )}

        {(() => {
          const sugestao = planoCiclo(livro)?.find((x) => x.atual)?.ate
          return (
            <div className="cartao p-4 mb-6 text-left flex items-center gap-3">
              <Icone nome="alvo" className="w-5 h-5 text-dourado shrink-0" />
              <label className="flex-1 text-sm text-texto/75 dark:text-bege/75" htmlFor="meta-sessao">
                Até onde quer ler? <span className="text-texto/45 dark:text-bege/45">(opcional)</span>
                {sugestao && sugestao > leitura.paginasLivro && (
                  <button type="button" onClick={() => setMetaPagina(String(sugestao))} className="block text-xs botao-texto mt-0.5">Marco da semana: página {sugestao}</button>
                )}
              </label>
              <input id="meta-sessao" type="number" inputMode="numeric" min={leitura.paginasLivro + 1} max={livro.paginas_totais} value={metaPagina}
                onChange={(e) => setMetaPagina(e.target.value)} placeholder="página" className="campo w-24 py-2 text-center" />
            </div>
          )
        })()}

        <button onClick={iniciar} className="botao-primario text-lg">{config.modo === 'livre' ? 'Começar leitura livre' : `Começar ${duracao} min`}</button>
        <div className="flex justify-center gap-4 mt-3">
          <button onClick={() => comecarPausa('curta')} className="botao-texto">Fazer uma pausa</button>
          {config.modo === 'pomodoro' && <button onClick={() => setAjustes((v) => !v)} className="botao-texto">{ajustes ? 'Fechar ajustes' : 'Ajustes do Pomodoro'}</button>}
        </div>

        {ajustes && config.modo === 'pomodoro' && (
          <section className="cartao p-5 mt-4 text-left space-y-4 animate-subir-suave">
            <Opcoes rotulo="Pausa curta" valor={config.curta} opcoes={[3, 5, 10]} sufixo="min" onMudar={(v) => setConfig({ curta: v })} />
            <Opcoes rotulo="Pausa longa" valor={config.longa} opcoes={[15, 20, 30]} sufixo="min" onMudar={(v) => setConfig({ longa: v })} />
            <Opcoes rotulo="Sessões até a pausa longa" valor={config.ciclo} opcoes={[2, 3, 4]} onMudar={(v) => setConfig({ ciclo: v })} />
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span>
                <span className="block text-[15px] font-medium text-marinho dark:text-bege">Começar a pausa sozinha</span>
                <span className="block text-xs text-texto/50 dark:text-bege/50">Ao salvar a sessão, o descanso já começa a contar.</span>
              </span>
              <input type="checkbox" checked={config.autoPausa} onChange={(e) => setConfig({ autoPausa: e.target.checked })} className="w-5 h-5 accent-[#B8912F]" />
            </label>
            <button onClick={() => setConfigEstado(() => { gravar(CHAVE_CONFIG, CONFIG_PADRAO); return CONFIG_PADRAO })} className="botao-texto text-xs">Voltar ao padrão (25/5/15, ciclo de 4)</button>
          </section>
        )}
        <p className="text-xs text-texto/45 dark:text-bege/45 mt-3">Durante a sessão dá para pausar, anotar e ligar um som de fundo.</p>

        <section className="cartao p-5 mt-8 text-left">
          <div className="flex items-baseline justify-between">
            <h2 className="titulo-secao">Seu foco</h2>
            <span className="legenda">{deHoje.length} {deHoje.length === 1 ? 'sessão' : 'sessões'}, {minutosHoje} min hoje</span>
          </div>
          <div className="flex items-end gap-2 h-24 mt-4">
            {dias.map((d) => (
              <div key={d.k} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                {d.min > 0 && <span className="text-[10px] tabular text-texto/50 dark:text-bege/50">{d.min}</span>}
                <div className="w-full max-w-[26px] rounded-md bg-dourado/70" style={{ height: `${(d.min / maxMin) * 100}%`, minHeight: d.min ? 6 : 0 }} />
                <span className={`text-xs ${d.k === hojeChave ? 'font-bold text-marinho dark:text-bege' : 'text-texto/45 dark:text-bege/45'}`}>{d.letra}</span>
              </div>
            ))}
          </div>
          {(() => {
            const totalSemana = dias.reduce((a, d) => a + d.min, 0)
            const diasComFoco = dias.filter((d) => d.min > 0).length
            return (
              <dl className="grid grid-cols-3 gap-2 text-center mt-4 pt-4 border-t border-marinho/[0.07] dark:border-bege/[0.08]">
                <div><dd className="font-serif tabular text-xl text-marinho dark:text-bege">{totalSemana >= 60 ? `${Math.floor(totalSemana / 60)}h${String(totalSemana % 60).padStart(2, '0')}` : `${totalSemana} min`}</dd><dt className="text-[11px] text-texto/50 dark:text-bege/50">na semana</dt></div>
                <div><dd className="font-serif tabular text-xl text-marinho dark:text-bege">{sessoesSemana.length}</dd><dt className="text-[11px] text-texto/50 dark:text-bege/50">{sessoesSemana.length === 1 ? 'sessão' : 'sessões'}</dt></div>
                <div><dd className="font-serif tabular text-xl text-marinho dark:text-bege">{diasComFoco}</dd><dt className="text-[11px] text-texto/50 dark:text-bege/50">{diasComFoco === 1 ? 'dia com foco' : 'dias com foco'}</dt></div>
              </dl>
            )
          })()}
          <p className="text-xs text-texto/45 dark:text-bege/45 mt-3">Minutos de foco nos últimos 7 dias.</p>
        </section>
      </div>
    </div>
  )
}

function AnotacaoRapida({ perfil, livro, paginaSugerida, onFechar, onSalva }: { perfil: Perfil; livro: LivroAtivo; paginaSugerida: number; onFechar: () => void; onSalva?: () => void }) {
  const [tipo, setTipo] = useState<'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'>('reflexao')
  const [texto, setTexto] = useState('')
  const [pagina, setPagina] = useState('')
  const [salvando, setSalvando] = useState(false)
  const avisar = useAviso()

  async function salvar() {
    if (!texto.trim()) return
    setSalvando(true)
    const { error } = await supabase.from('anotacoes').insert({
      membro_id: perfil.id, livro_id: livro.id, tipo, texto: texto.trim(),
      pagina: pagina ? parseInt(pagina, 10) : null, compartilhada: false
    })
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar', 'erro')
    avisar('Anotação salva. O tempo continua.')
    onSalva?.()
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={onFechar}>
      <div className="cartao w-full max-w-md p-5 animate-subir-suave" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="titulo-secao">Anotar sem parar</h2>
          <button onClick={onFechar} aria-label="Fechar" className="p-1 text-texto/50 dark:text-bege/50"><Icone nome="x" /></button>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {([['trecho', 'Trecho'], ['reflexao', 'Reflexão'], ['pergunta', 'Pergunta'], ['aplicacao', 'Aplicação']] as const).map(([t, r]) => (
            <button key={t} onClick={() => setTipo(t)} className={`chip ${tipo === t ? 'chip-ativo' : ''}`}>{r}</button>
          ))}
        </div>
        <textarea autoFocus rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000}
          className={`campo resize-none ${tipo === 'trecho' ? 'font-serif italic text-[18px]' : ''}`}
          placeholder={tipo === 'trecho' ? 'Copie a frase do livro.' : tipo === 'reflexao' ? 'O que você está pensando?' : tipo === 'aplicacao' ? 'O que você quer praticar?' : 'Uma dúvida para o encontro.'} />
        <div className="flex items-center gap-3 mt-3">
          <label className="text-sm text-texto/70 dark:text-bege/70 flex items-center gap-2">
            Página
            <input type="number" inputMode="numeric" value={pagina} onChange={(e) => setPagina(e.target.value)} placeholder={String(paginaSugerida || '')}
              className="campo w-20 py-1.5 text-center" />
          </label>
          <button onClick={salvar} disabled={salvando || !texto.trim()} className="ml-auto rounded-xl bg-marinho dark:bg-dourado text-bege dark:text-noite px-5 py-2.5 font-semibold disabled:opacity-50">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function Ciclo({ feitas, total }: { feitas: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mt-2" aria-label={`${feitas} de ${total} sessões do ciclo`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < feitas ? 'bg-dourado' : 'border border-marinho/25 dark:border-bege/30'}`} />
      ))}
    </div>
  )
}

function Opcoes({ rotulo, valor, opcoes, sufixo, onMudar }: { rotulo: string; valor: number; opcoes: number[]; sufixo?: string; onMudar: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[15px] font-medium text-marinho dark:text-bege">{rotulo}</span>
      <div className="flex gap-1.5">
        {opcoes.map((o) => (
          <button key={o} onClick={() => onMudar(o)} className={`chip px-3 py-1 ${valor === o ? 'chip-ativo' : ''}`}>{o}{sufixo ? ` ${sufixo}` : ''}</button>
        ))}
      </div>
    </div>
  )
}

function BotaoRedondo({ icone, rotulo, onClick, destaque }: { icone: NomeIcone; rotulo: string; onClick: () => void; destaque?: boolean }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <span className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform group-active:scale-95 ${
        destaque ? 'bg-marinho text-bege dark:bg-dourado dark:text-noite shadow-lg' : 'border border-marinho/15 dark:border-bege/20 text-marinho dark:text-bege'
      }`}>
        <Icone nome={icone} className="w-6 h-6" traco={2} />
      </span>
      <span className="text-xs font-medium text-texto/65 dark:text-bege/65">{rotulo}</span>
    </button>
  )
}

function Tela({ children }: { children: ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center px-5 pt-8 pb-28">{children}</div>
}

function formatar(seg: number) {
  return `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`
}
