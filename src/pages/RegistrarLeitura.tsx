import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { marcoAtravessado } from '../components/Celebracao'
import { buscarPendentes, marcarLeitura, type LivroPendente } from '../lib/pendentes'
import { apagarRegistroLeitura, criarRegistroLeitura } from '../lib/sync'
import { supabase, type Perfil } from '../lib/supabase'
import { useMinhaLeitura } from '../lib/leitura'
import { apagarComDesfazer, useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import { chaveDia, diasAte, formatarData } from '../lib/estatisticas'
import { formatarTempo } from '../lib/tempo'
import type { LivroAtivo } from './Inicio'

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  pendenteInicial?: string | null // id de uma leitura pendente para abrir já selecionada
  onRegistrado: (terminouLivro: boolean, livro: LivroAtivo, marco?: number | null) => void
  onAnotar: () => void
}

interface PropsForm {
  perfil: Perfil
  livro: LivroAtivo
  seletor?: ReactNode
  pendente?: boolean
  onRegistrado: (terminouLivro: boolean, marco?: number | null) => void
  onAnotar: () => void
  onMarcar?: (status: 'terminou' | 'deixou') => void
}

/**
 * Registrar leitura do livro atual ou de uma leitura pendente
 * (livro de ciclo encerrado que a pessoa ainda está lendo, no próprio ritmo).
 */
export default function RegistrarLeitura({ perfil, livro, pendenteInicial, onRegistrado, onAnotar }: Props) {
  const [pendentes, setPendentes] = useState<LivroPendente[]>([])
  const [escolhido, setEscolhido] = useState<string>(pendenteInicial ?? livro.id)
  const avisar = useAviso()
  useEffect(() => { buscarPendentes(perfil).then(setPendentes).catch(() => setPendentes([])) }, [perfil.id])

  const opcoes: LivroAtivo[] = [livro, ...pendentes.filter((p) => p.id !== livro.id)]
  const atual = opcoes.find((l) => l.id === escolhido) ?? livro
  const ehPendente = atual.id !== livro.id

  async function marcar(status: 'terminou' | 'deixou') {
    const alvo = atual
    const { error } = await marcarLeitura(alvo.id, perfil.id, status, perfil.id)
    if (error) return avisar('Não foi possível salvar agora. Tente de novo.', 'erro')
    setPendentes((l) => l.filter((p) => p.id !== alvo.id))
    setEscolhido(livro.id)
    if (status === 'terminou') {
      onRegistrado(true, alvo)
    } else {
      avisar(`${alvo.titulo} saiu das leituras pendentes`, 'ok', {
        rotulo: 'Desfazer',
        aoClicar: async () => { await marcarLeitura(alvo.id, perfil.id, null, perfil.id); buscarPendentes(perfil).then(setPendentes) }
      })
    }
  }

  const seletor = opcoes.length > 1 ? (
    <div className="mt-3" role="radiogroup" aria-label="Qual livro">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sem-barra">
        {opcoes.map((l, i) => {
          const ativo = l.id === atual.id
          const p = pendentes.find((x) => x.id === l.id)
          return (
            <button key={l.id} type="button" role="radio" aria-checked={ativo} onClick={() => setEscolhido(l.id)}
              className={`shrink-0 max-w-[15rem] rounded-xl border px-3 py-2 text-left transition-colors ${ativo ? 'border-dourado bg-dourado/10' : 'border-marinho/15 dark:border-bege/15'}`}>
              <span className={`block text-[11px] font-semibold ${ativo ? 'text-dourado-escuro dark:text-dourado' : 'text-texto/50 dark:text-bege/50'}`}>
                {i === 0 ? 'Leitura atual' : `Pendente, ${p?.pct ?? 0}%`}
              </span>
              <span className="block text-sm text-marinho dark:text-bege truncate">{l.titulo}</span>
            </button>
          )
        })}
      </div>
    </div>
  ) : null

  return (
    <FormRegistro
      key={atual.id}
      perfil={perfil}
      livro={atual}
      seletor={seletor}
      pendente={ehPendente}
      onRegistrado={(t, m) => onRegistrado(t, atual, m)}
      onAnotar={onAnotar}
      onMarcar={marcar}
    />
  )
}

type Modo = 'pagina' | 'quantidade' | 'tempo'
type Quando = 0 | 1 | 2 | 'outro' // hoje, ontem, anteontem ou outro dia
type TipoNota = 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'

// Uma tela só: "parei na página 64" (o app calcula a diferença) e, se quiser,
// quanto tempo durou. Quem não sabe a página abre "Não sei a página" e informa
// quantas leu ou só o tempo. Dá para lançar
// uma leitura de ontem ou anteontem e, no mesmo envio, guardar uma anotação.

function FormRegistro({ perfil, livro, seletor, pendente, onRegistrado, onAnotar, onMarcar }: PropsForm) {
  const leitura = useMinhaLeitura(perfil, livro)
  const [modo, setModo] = useState<Modo>('pagina')
  const [valor, setValor] = useState('')
  const [tempo, setTempo] = useState('') // minutos, opcional nos modos de página
  const [quando, setQuando] = useState<Quando>(0)
  const [outroDia, setOutroDia] = useState('') // aaaa-mm-dd, quando "Outro dia"
  const [hora, setHora] = useState('') // hh:mm, opcional para dias anteriores
  const [comNota, setComNota] = useState(false)
  const [tipoNota, setTipoNota] = useState<TipoNota>('reflexao')
  const [textoNota, setTextoNota] = useState('')
  const [notaNoMural, setNotaNoMural] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [verTodos, setVerTodos] = useState(false)
  const avisar = useAviso()

  const jaLidas = leitura.paginasLivro
  const numero = parseInt(valor, 10)
  const ritmo = perfil.ritmo_leitura_min_por_pagina || 2
  const soTempo = modo === 'tempo'
  const minutosInformados = soTempo ? (numero > 0 ? numero : 0) : (parseInt(tempo, 10) > 0 ? parseInt(tempo, 10) : 0)
  const paginasDoRegistro = soTempo || !numero || numero <= 0 ? 0 : modo === 'quantidade' ? numero : numero - jaLidas
  // no modo "Só o tempo" o avanço no livro é estimado pelo seu ritmo
  const paginasEstimadas = soTempo ? Math.round(minutosInformados / ritmo) : paginasDoRegistro
  const minPorPagina = !soTempo && minutosInformados > 0 && paginasDoRegistro > 0 ? minutosInformados / paginasDoRegistro : null
  const podeSalvarBase = soTempo ? minutosInformados > 0 : paginasDoRegistro > 0
  const pctDepois = Math.min(100, Math.round(((jaLidas + Math.max(0, paginasEstimadas)) / livro.paginas_totais) * 100))
  const restantes = diasAte(livro.ciclo_fim)
  const faltam = livro.paginas_totais - jaLidas
  const ontemChave = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return chaveLocal(d) })()
  const minimoOutroDia = (() => { const d = new Date(); d.setDate(d.getDate() - 90); const lim = chaveLocal(d); return livro.ciclo_inicio && livro.ciclo_inicio > lim ? livro.ciclo_inicio : lim })()
  const outroDiaValido = quando !== 'outro' || (!!outroDia && outroDia <= ontemChave && outroDia >= minimoOutroDia)
  const podeSalvar = podeSalvarBase && outroDiaValido
  const porDiaNecessario = restantes && restantes > 0 && faltam > 0 ? Math.ceil(faltam / restantes) : null

  function dataDoRegistro(): string {
    if (quando === 0) return new Date().toISOString()
    let d: Date
    if (quando === 'outro') {
      const [a, m, dia] = outroDia.split('-').map(Number)
      d = new Date(a, m - 1, dia)
    } else {
      d = new Date()
      d.setDate(d.getDate() - quando)
    }
    const [h, min] = hora ? hora.split(':').map(Number) : [20, 0]
    d.setHours(h, min, 0, 0)
    // nunca no futuro (ex.: hoje mais tarde do que agora)
    return (d > new Date() ? new Date() : d).toISOString()
  }

  function trocarModo(m: Modo) {
    setModo(m)
    setValor('')
    setErro(null)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (minutosInformados > 1440) return setErro('O tempo vai até 1.440 minutos (24 horas).')
    if (!outroDiaValido) return setErro('Escolha o dia da leitura (de ontem para trás).')
    if (soTempo) {
      if (minutosInformados <= 0) return setErro('Informe quantos minutos você leu.')
    } else {
      if (modo === 'pagina' && numero > livro.paginas_totais) return setErro(`O livro tem ${livro.paginas_totais} páginas.`)
      if (paginasDoRegistro <= 0) {
        return setErro(modo === 'pagina' ? `Seu registro já está na página ${jaLidas}. Informe uma página depois dessa.` : 'Informe quantas páginas você leu.')
      }
    }
    setSalvando(true)
    await criarRegistroLeitura({
      membro_id: perfil.id, livro_id: livro.id, origem: 'manual',
      // só o tempo: entra como minutos (o app converte em páginas pelo seu ritmo)
      paginas_lidas: soTempo ? null : paginasDoRegistro,
      minutos_lidos: soTempo ? minutosInformados : null,
      tempo_minutos: minutosInformados || null,
      registrado_em: dataDoRegistro()
    })
    if (comNota && textoNota.trim()) {
      const { error } = await supabase.from('anotacoes').insert({
        membro_id: perfil.id, livro_id: livro.id, tipo: tipoNota, texto: textoNota.trim(),
        pagina: Math.max(1, Math.min(livro.paginas_totais, jaLidas + paginasEstimadas)), compartilhada: notaNoMural
      })
      if (error) avisar('Leitura salva, mas a anotação não', 'erro')
    }
    setSalvando(false)
    setValor('')
    setTempo('')
    setHora('')
    setTextoNota('')
    const terminou = jaLidas < livro.paginas_totais && jaLidas + paginasEstimadas >= livro.paginas_totais
    if (!terminou) {
      const meta = perfil.meta_diaria_paginas ?? 10
      const bateuMeta = quando === 0 && leitura.paginasHoje < meta && leitura.paginasHoje + paginasEstimadas >= meta
      const comAnotacao = comNota && textoNota.trim() ? ' com anotação' : ''
      avisar(bateuMeta
        ? `Meta do dia cumprida: ${Math.round(leitura.paginasHoje + paginasEstimadas)} páginas hoje`
        : soTempo
          ? `${formatarTempo(minutosInformados)} de leitura registrados${comAnotacao}`
          : `${paginasDoRegistro} ${paginasDoRegistro === 1 ? 'página registrada' : 'páginas registradas'}${minutosInformados ? ` em ${formatarTempo(minutosInformados)}` : ''}${comAnotacao}`)
    }
    const pctAntes = (jaLidas / livro.paginas_totais) * 100
    const pctApos = ((jaLidas + Math.max(0, paginasEstimadas)) / livro.paginas_totais) * 100
    onRegistrado(terminou, terminou ? null : marcoAtravessado(pctAntes, pctApos))
  }

  const [ocultos, setOcultos] = useState<Set<string>>(new Set())
  function apagar(id: string) {
    setConfirmando(null)
    apagarComDesfazer({
      avisar, texto: 'Registro apagado',
      esconder: () => setOcultos((s) => new Set(s).add(id)),
      restaurar: () => setOcultos((s) => { const n = new Set(s); n.delete(id); return n }),
      apagar: async () => { const ok = await apagarRegistroLeitura(id); leitura.recarregar(); return ok }
    })
  }

  const doLivroVisivel = leitura.doLivro.filter((r) => !ocultos.has(r.id))
  const ultimos = verTodos ? doLivroVisivel : doLivroVisivel.slice(0, 5)

  return (
    <div className="min-h-screen px-5 pt-8 pb-28">
      <form onSubmit={salvar} className="max-w-md mx-auto">
        <h1 className="font-serif text-[30px] text-marinho dark:text-bege">Registrar leitura</h1>
        {seletor}
        <p className="legenda mt-2 mb-5">
          {leitura.carregando
            ? 'Carregando seu progresso…'
            : `Você está na página ${jaLidas} de ${livro.paginas_totais}${leitura.paginasHoje > 0 ? `, com ${leitura.paginasHoje} lidas hoje` : ''}.`}
        </p>

        <div className="cartao p-6">
          <label htmlFor="valor" className="rotulo text-center">{soTempo ? 'Minutos de leitura' : modo === 'quantidade' ? 'Páginas lidas' : 'Parei na página'}</label>
          <input
            id="valor" type="number" inputMode="numeric" min={1} max={soTempo ? 1440 : undefined} value={valor}
            onChange={(e) => { setValor(e.target.value); setErro(null) }}
            className="w-full bg-transparent text-center font-serif tabular text-[64px] leading-none text-marinho dark:text-bege placeholder:text-texto/15 dark:placeholder:text-bege/15 focus:outline-none py-2"
            placeholder={modo === 'pagina' ? String(jaLidas + 1) : '0'}
          />
          {soTempo && minutosInformados >= 60 && (
            <p className="text-center text-sm text-texto/55 dark:text-bege/55 -mt-1">{formatarTempo(minutosInformados)}</p>
          )}

          {/* barra mostrando de onde para onde */}
          <div className="relative h-2 rounded-full bg-marinho/[0.07] dark:bg-bege/10 overflow-hidden mt-3">
            <div className="absolute inset-y-0 left-0 barra-progresso" style={{ width: `${(jaLidas / livro.paginas_totais) * 100}%` }} />
            {paginasEstimadas > 0 && (
              <div className="absolute inset-y-0 bg-dourado/40 transition-all" style={{ left: `${(jaLidas / livro.paginas_totais) * 100}%`, width: `${(Math.min(paginasEstimadas, faltam) / livro.paginas_totais) * 100}%` }} />
            )}
          </div>
          <div className="flex justify-between text-xs text-texto/45 dark:text-bege/45 mt-1.5">
            <span>p. {jaLidas}</span>
            <span>{paginasEstimadas > 0 ? `${soTempo ? 'cerca de ' : ''}${pctDepois}% depois deste registro` : `${leitura.pct}%`}</span>
            <span>p. {livro.paginas_totais}</span>
          </div>

          {modo === 'pagina' && jaLidas < livro.paginas_totais && (
            <input
              type="range" className="deslizante mt-2" aria-label="Arraste até a página em que parou"
              min={0} max={livro.paginas_totais} step={1}
              value={Math.min(Math.max(numero || jaLidas, jaLidas), livro.paginas_totais)}
              onChange={(e) => { const v = Number(e.target.value); setValor(v <= jaLidas ? '' : String(v)); setErro(null) }}
            />
          )}

          {modo !== 'pagina' && (
            <div className="flex justify-center gap-2 flex-wrap mt-4">
              {(soTempo ? [15, 30, 60] : [5, 10, 20, 30]).map((n) => (
                <button key={n} type="button" onClick={() => setValor(String((numero || 0) + n))} className="chip">+{n}{soTempo ? ' min' : ''}</button>
              ))}
            </div>
          )}
          {soTempo && (
            <p className="text-xs text-center text-texto/50 dark:text-bege/50 mt-3">
              {minutosInformados > 0
                ? `Pelo seu ritmo (${String(ritmo).replace('.', ',')} min por página), isso conta como cerca de ${paginasEstimadas} ${paginasEstimadas === 1 ? 'página' : 'páginas'}. Se souber a página, prefira "Onde parei".`
                : 'Para quando você não lembra a página. O avanço no livro é estimado pelo seu ritmo.'}
            </p>
          )}

          {/* caminho principal é a página; as outras formas ficam escondidas */}
          <div className="mt-3 text-center">
            {modo === 'pagina' ? (
              <button type="button" onClick={() => trocarModo('quantidade')} className="text-sm text-texto/55 dark:text-bege/55 underline underline-offset-2">
                Não sei a página
              </button>
            ) : (
              <div className="space-y-2">
                <div className="inline-grid grid-cols-2 gap-2">
                  {([['quantidade', 'Sei quantas li'], ['tempo', 'Só sei o tempo']] as [Modo, string][]).map(([m, rotulo]) => (
                    <button key={m} type="button" onClick={() => trocarModo(m)} aria-pressed={modo === m}
                      className={`chip whitespace-nowrap ${modo === m ? 'chip-ativo' : ''}`}>{rotulo}</button>
                  ))}
                </div>
                <button type="button" onClick={() => trocarModo('pagina')} className="block mx-auto text-sm text-texto/55 dark:text-bege/55 underline underline-offset-2">
                  Voltar para a página
                </button>
              </div>
            )}
          </div>

          {/* tempo junto com as páginas, para quem leu sem o Foco */}
          {!soTempo && (
            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="tempo" className="text-sm text-texto/60 dark:text-bege/60">Quanto tempo você leu? <span className="text-texto/40 dark:text-bege/40">(opcional)</span></label>
                {minutosInformados > 0 && (
                  <button type="button" onClick={() => setTempo('')} className="text-xs text-texto/50 dark:text-bege/50 underline underline-offset-2">limpar</button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="grid grid-cols-4 gap-1.5 flex-1 min-w-0">
                  {[15, 30, 45, 60].map((n) => (
                    <button key={n} type="button" onClick={() => { setTempo(String(n)); setErro(null) }}
                      className={`chip !px-0 text-[13px] whitespace-nowrap ${minutosInformados === n ? 'chip-ativo' : ''}`}>{n === 60 ? '1h' : `${n} min`}</button>
                  ))}
                </div>
                <div className="relative w-[4.75rem] shrink-0">
                  <input id="tempo" type="number" inputMode="numeric" min={1} max={1440} value={tempo}
                    onChange={(e) => { setTempo(e.target.value); setErro(null) }}
                    className={`campo !px-2 text-center tabular ${tempo ? '!pr-8' : ''}`} placeholder="outro" aria-label="Minutos de leitura" />
                  {tempo && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-texto/45 dark:text-bege/45 pointer-events-none">min</span>}
                </div>
              </div>
              {minPorPagina && (
                <p className="text-xs text-texto/50 dark:text-bege/50 mt-2">
                  {formatarTempo(minutosInformados)} para {paginasDoRegistro} {paginasDoRegistro === 1 ? 'página' : 'páginas'}: cerca de {String(Math.round(minPorPagina * 10) / 10).replace('.', ',')} min por página.
                </p>
              )}
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm text-texto/60 dark:text-bege/60 mb-2">Quando foi?</p>
            <div className="grid grid-cols-4 gap-1.5">
              {([['Hoje', 0], ['Ontem', 1], ['Anteontem', 2], ['Outro dia', 'outro']] as const).map(([r, q]) => (
                <button key={r} type="button" onClick={() => setQuando(q)} aria-pressed={quando === q}
                  className={`chip !px-1 text-[13px] ${quando === q ? 'chip-ativo' : ''}`}>{r}</button>
              ))}
            </div>
            {quando !== 0 && (
              <div className="mt-3 flex gap-2 items-end animate-subir-suave">
                {quando === 'outro' && (
                  <label className="flex-1 min-w-0">
                    <span className="block text-xs text-texto/55 dark:text-bege/55 mb-1">Dia</span>
                    <input type="date" value={outroDia} min={minimoOutroDia} max={ontemChave}
                      onChange={(e) => setOutroDia(e.target.value)} className="campo w-full !py-2" />
                  </label>
                )}
                <label className={quando === 'outro' ? 'w-[118px] shrink-0' : 'flex-1'}>
                  <span className="block text-xs text-texto/55 dark:text-bege/55 mb-1">Horário <span className="text-texto/40 dark:text-bege/40">(opcional)</span></span>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="campo w-full !py-2" />
                </label>
              </div>
            )}
            {quando !== 0 && (
              <p className="text-xs text-texto/50 dark:text-bege/50 mt-1.5">
                {quando === 'outro' && !outroDia
                  ? 'Escolha o dia da leitura.'
                  : `${descreverDia(quando === 'outro' ? outroDia : (() => { const d = new Date(); d.setDate(d.getDate() - quando); return chaveLocal(d) })())}${hora ? `, às ${hora}` : ''}.`}
              </p>
            )}
          </div>

          {/* anotação junto */}
          <div className="mt-5 border-t border-marinho/[0.07] dark:border-bege/[0.08] pt-4">
            <button type="button" onClick={() => setComNota((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-dourado-escuro dark:text-dourado">
              <Icone nome="pena" className="w-4 h-4" />
              {comNota ? 'Sem anotação' : 'Anotar algo desta leitura'}
            </button>
            {comNota && (
              <div className="mt-3 space-y-3 animate-subir-suave">
                <div className="flex flex-wrap gap-2">
                  {([['trecho', 'Trecho'], ['reflexao', 'Reflexão'], ['pergunta', 'Pergunta'], ['aplicacao', 'Aplicação']] as [TipoNota, string][]).map(([t, r]) => (
                    <button key={t} type="button" onClick={() => setTipoNota(t)} className={`chip ${tipoNota === t ? 'chip-ativo' : ''}`}>{r}</button>
                  ))}
                </div>
                <textarea rows={3} value={textoNota} onChange={(e) => setTextoNota(e.target.value)} maxLength={2000}
                  className={`campo resize-none ${tipoNota === 'trecho' ? 'font-serif italic text-[18px]' : ''}`}
                  placeholder={tipoNota === 'trecho' ? 'A frase que marcou.' : tipoNota === 'reflexao' ? 'O que ficou dessa leitura?' : tipoNota === 'aplicacao' ? 'O que você quer praticar?' : 'Uma dúvida para o encontro.'} />
                <label className="flex items-center gap-2 text-sm text-texto/70 dark:text-bege/70">
                  <input type="checkbox" checked={notaNoMural} onChange={(e) => setNotaNoMural(e.target.checked)} className="w-4 h-4 accent-[#B8912F]" />
                  Pôr no mural do grupo
                </label>
              </div>
            )}
          </div>

          {erro && <p className="text-sm text-center text-red-700 dark:text-red-400 mt-4">{erro}</p>}

          <button type="submit" disabled={salvando || !podeSalvar} className="botao-primario mt-5">
            {salvando ? 'Salvando…'
              : soTempo ? (minutosInformados > 0 ? `Registrar ${formatarTempo(minutosInformados)}` : 'Registrar')
              : paginasDoRegistro > 0 ? `Registrar ${paginasDoRegistro} ${paginasDoRegistro === 1 ? 'página' : 'páginas'}${minutosInformados ? ` em ${formatarTempo(minutosInformados)}` : ''}` : 'Registrar'}
          </button>
        </div>

        {/* ritmo */}
        <section className="grid grid-cols-2 gap-3 mt-4">
          <div className="cartao p-4">
            <p className="text-xs text-texto/50 dark:text-bege/50">Seu ritmo (14 dias)</p>
            <p className="font-serif tabular text-2xl text-marinho dark:text-bege mt-1">{leitura.mediaDia >= 1 ? Math.round(leitura.mediaDia) : '—'}</p>
            <p className="text-xs text-texto/50 dark:text-bege/50">páginas por dia</p>
          </div>
          <div className="cartao p-4">
            <p className="text-xs text-texto/50 dark:text-bege/50">{leitura.pct >= 100 ? 'Livro' : 'Neste ritmo, termina'}</p>
            <p className="font-serif tabular text-2xl text-marinho dark:text-bege mt-1">
              {leitura.pct >= 100 ? 'concluído' : leitura.previsao ? formatarData(chaveDia(leitura.previsao.data)) : '—'}
            </p>
            <p className="text-xs text-texto/50 dark:text-bege/50">
              {porDiaNecessario ? `precisa de ${porDiaNecessario}/dia até ${formatarData(livro.ciclo_fim!)}` : leitura.previsao ? `em ${leitura.previsao.dias} dias` : 'registre para calcular'}
            </p>
          </div>
        </section>

        {/* últimos */}
        {ultimos.length > 0 && (
          <section className="cartao p-5 mt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="titulo-secao">Histórico neste livro</h2>
              <span className="legenda">{leitura.doLivro.length} {leitura.doLivro.length === 1 ? 'registro' : 'registros'}</span>
            </div>
            <p className="text-xs text-texto/45 dark:text-bege/45 mt-0.5">Lançou algo errado? Apague e registre de novo.</p>
            <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.07] mt-2">
              {ultimos.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 h-8 rounded-full bg-marinho/[0.06] dark:bg-bege/[0.07] text-marinho/70 dark:text-bege/70 flex items-center justify-center shrink-0">
                    <Icone nome={r.origem === 'pomodoro' || !r.paginas_lidas ? 'relogio' : 'pena'} className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-marinho dark:text-bege">
                      {r.paginas_lidas
                        ? `${r.paginas_lidas} ${r.paginas_lidas === 1 ? 'página' : 'páginas'}${r.tempo_minutos ? ` em ${formatarTempo(r.tempo_minutos)}` : ''}`
                        : `${formatarTempo(r.minutos_lidos ?? 0)} de ${r.origem === 'pomodoro' ? 'foco' : 'leitura'}`}
                    </p>
                    <p className="text-xs text-texto/45 dark:text-bege/45">
                      {new Date(r.registrado_em).toLocaleString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button type="button" onClick={() => apagar(r.id)} aria-label="Apagar registro" className="p-3 -mr-2 text-texto/40 dark:text-bege/45 hover:text-red-700 dark:hover:text-red-400">
                    <Icone nome="lixeira" className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
            {leitura.doLivro.length > 5 && (
              <button type="button" onClick={() => setVerTodos((v) => !v)} className="botao-texto mt-2">
                {verTodos ? 'Mostrar só os últimos' : `Ver todos os ${leitura.doLivro.length}`}
              </button>
            )}
          </section>
        )}

        <button type="button" onClick={onAnotar} className="mt-5 w-full flex items-center justify-center gap-2 botao-texto">
          <Icone nome="nota" className="w-4 h-4" />
          Ver todas as anotações
        </button>
        <p className="text-xs text-center text-texto/40 dark:text-bege/40 mt-4">
          Funciona sem internet: o registro fica no aparelho e sincroniza quando a conexão voltar.
        </p>
        {pendente && onMarcar && (
          <section className="cartao p-4 mt-4">
            <p className="text-sm text-texto/70 dark:text-bege/70">
              Leitura pendente de um ciclo já encerrado. Continue no seu ritmo: quando chegar à última página, ela sai daqui sozinha.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button type="button" onClick={() => onMarcar('terminou')} className="botao-secundario !py-2.5 text-sm">Terminei este livro</button>
              <button type="button" onClick={() => onMarcar('deixou')} className="rounded-xl py-2.5 text-sm text-texto/60 dark:text-bege/60 hover:text-marinho dark:hover:text-bege">Deixar de lado</button>
            </div>
          </section>
        )}
      </form>
    </div>
  )
}

function chaveLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function descreverDia(chave: string) {
  const [a, m, d] = chave.split('-').map(Number)
  const txt = new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}
