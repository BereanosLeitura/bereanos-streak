import { BLOCOS, type MapaHorarios, type PontoRitmo } from '../lib/infograficos'
import { chaveDia, contar, formatarData } from '../lib/estatisticas'

// Gráficos em SVG puro, nas cores do clube, legíveis nos três temas.

export function GraficoRitmo({ pontos, total }: { pontos: PontoRitmo[]; total: number }) {
  const W = 320
  const H = 150
  const m = { l: 30, r: 8, t: 10, b: 22 }
  const n = Math.max(1, pontos.length - 1)
  const x = (i: number) => m.l + (i / n) * (W - m.l - m.r)
  const y = (v: number) => m.t + (1 - v / total) * (H - m.t - m.b)
  const real = pontos.map((p, i) => (p.acumulado === null ? null : [x(i), y(p.acumulado)] as const)).filter(Boolean) as (readonly [number, number])[]
  const ideal = pontos.map((p, i) => (p.ideal === null ? null : [x(i), y(p.ideal)] as const)).filter(Boolean) as (readonly [number, number])[]
  const linha = (pts: (readonly [number, number])[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const area = real.length ? `${linha(real)} L${real[real.length - 1][0].toFixed(1)},${y(0)} L${real[0][0].toFixed(1)},${y(0)} Z` : ''
  const iHoje = pontos.findIndex((p) => p.chave === chaveDia(new Date()))
  const ultimo = real[real.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Páginas acumuladas comparadas ao ritmo ideal do ciclo">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={m.l} x2={W - m.r} y1={y(total * f)} y2={y(total * f)} className="stroke-marinho/10 dark:stroke-bege/10" strokeWidth="1" />
          <text x={m.l - 5} y={y(total * f) + 3} textAnchor="end" className="fill-texto/45 dark:fill-bege/45" fontSize="9">{Math.round(total * f)}</text>
        </g>
      ))}
      {area && <path d={area} fill="#B8912F" opacity="0.15" />}
      {ideal.length > 1 && <path d={linha(ideal)} fill="none" className="stroke-marinho/45 dark:stroke-bege/45" strokeWidth="1.5" strokeDasharray="4 4" />}
      {real.length > 0 && <path d={linha(real)} fill="none" stroke="#B8912F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {ultimo && <circle cx={ultimo[0]} cy={ultimo[1]} r="4" fill="#B8912F" className="stroke-folha dark:stroke-noite-cartao" strokeWidth="2" />}
      {iHoje >= 0 && iHoje < pontos.length - 1 && (
        <line x1={x(iHoje)} x2={x(iHoje)} y1={m.t} y2={y(0)} className="stroke-marinho/20 dark:stroke-bege/25" strokeWidth="1" />
      )}
      <text x={m.l} y={H - 6} className="fill-texto/45 dark:fill-bege/45" fontSize="9">{pontos[0] ? formatarData(pontos[0].chave) : ''}</text>
      <text x={W - m.r} y={H - 6} textAnchor="end" className="fill-texto/45 dark:fill-bege/45" fontSize="9">{pontos.length ? formatarData(pontos[pontos.length - 1].chave) : ''}</text>
    </svg>
  )
}

const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function MapaDeHorarios({ mapa }: { mapa: MapaHorarios }) {
  const max = Math.max(1, ...mapa.grade.flat())
  return (
    <div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `16px repeat(${BLOCOS.length}, minmax(0, 1fr))` }}>
        <span />
        {BLOCOS.map((b) => <span key={b.curto} className="text-[9px] text-center text-texto/65 dark:text-bege/55">{b.curto}</span>)}
        {mapa.grade.map((linha, d) => (
          <div key={d} className="contents">
            <span className="text-[10px] text-texto/65 dark:text-bege/55 flex items-center">{LETRAS[d]}</span>
            {linha.map((v, b) => (
              <span
                key={b}
                title={v > 0 ? contar(v, 'página', 'páginas') : ''}
                className={`h-6 rounded-[5px] ${v > 0 ? '' : 'bg-marinho/[0.05] dark:bg-bege/[0.06]'}`}
                style={v > 0 ? { backgroundColor: `rgba(184,145,47,${0.2 + 0.8 * (v / max)})` } : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BarrasDias({ valores, destaqueHoje = true }: { valores: { chave: string; paginas: number }[]; destaqueHoje?: boolean }) {
  const max = Math.max(1, ...valores.map((v) => v.paginas))
  const hoje = chaveDia(new Date())
  return (
    <div className="flex items-end gap-1 h-24" role="img" aria-label="Páginas por dia">
      {valores.map((v) => {
        const d = new Date(v.chave + 'T12:00:00')
        return (
          <div key={v.chave} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${formatarData(v.chave)}: ${contar(v.paginas, 'página', 'páginas')}`}>
            <div className={`w-full rounded-[4px] ${v.paginas ? 'bg-dourado/80' : 'bg-marinho/[0.06] dark:bg-bege/[0.07]'}`}
              style={{ height: v.paginas ? `${Math.max(6, (v.paginas / max) * 100)}%` : '4px' }} />
            <span className={`text-[9px] ${destaqueHoje && v.chave === hoje ? 'font-bold text-marinho dark:text-bege' : 'text-texto/65 dark:text-bege/55'}`}>{LETRAS[d.getDay()]}</span>
          </div>
        )
      })}
    </div>
  )
}

const COR_TIPO: Record<string, string> = { trecho: '#B8912F', reflexao: '#8A6D2B', pergunta: '#5B79A8', aplicacao: '#6F8F6A' }
const ROTULO_TIPO: Record<string, string> = { trecho: 'trechos', reflexao: 'reflexões', pergunta: 'perguntas', aplicacao: 'aplicações' }

/**
 * Mapa do livro: em que partes do livro as anotações se concentram.
 * Cada coluna é um trecho de páginas; a altura é quantas marcações caíram ali.
 */
export function MapaDoLivro({ marcas, total }: { marcas: { pagina: number | null; tipo: string }[]; total: number }) {
  const comPagina = marcas.filter((m) => m.pagina && m.pagina > 0 && m.pagina <= total) as { pagina: number; tipo: string }[]
  if (comPagina.length === 0) return <p className="legenda">As anotações com página aparecem aqui, mostrando onde o livro mais marcou.</p>
  const n = Math.min(20, Math.max(6, Math.ceil(total / 10)))
  const tam = total / n
  const faixas = Array.from({ length: n }, (_, i) => ({ de: Math.floor(i * tam) + 1, ate: Math.round((i + 1) * tam), porTipo: {} as Record<string, number>, qtd: 0 }))
  for (const m of comPagina) {
    const f = faixas[Math.min(n - 1, Math.floor((m.pagina - 1) / tam))]
    f.porTipo[m.tipo] = (f.porTipo[m.tipo] ?? 0) + 1
    f.qtd++
  }
  const max = Math.max(1, ...faixas.map((f) => f.qtd))
  const topo = [...faixas].sort((a, b) => b.qtd - a.qtd)[0]
  const tipos = Object.keys(COR_TIPO).filter((t) => comPagina.some((m) => m.tipo === t))
  return (
    <div>
      <p className="text-[15px] text-texto/80 dark:text-bege/80 mb-3">
        O trecho mais marcado vai da página <strong className="text-marinho dark:text-bege">{topo.de}</strong> à <strong className="text-marinho dark:text-bege">{topo.ate}</strong>, com {topo.qtd} {topo.qtd === 1 ? 'marcação' : 'marcações'}.
      </p>
      <div className="flex items-end gap-[3px] h-24" role="img" aria-label="Quantidade de anotações ao longo das páginas do livro">
        {faixas.map((f) => (
          <div key={f.de} className="flex-1 h-full flex flex-col justify-end rounded-[3px] overflow-hidden bg-marinho/[0.04] dark:bg-bege/[0.05]" title={`p. ${f.de} a ${f.ate}: ${f.qtd}`}>
            {tipos.map((t) => f.porTipo[t] ? <div key={t} style={{ height: `${(f.porTipo[t] / max) * 100}%`, background: COR_TIPO[t] }} className="dark:opacity-90" /> : null)}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-texto/65 dark:text-bege/55 mt-1"><span>p. 1</span><span>p. {Math.round(total / 2)}</span><span>p. {total}</span></div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {tipos.map((t) => (
          <span key={t} className="flex items-center gap-1.5 text-xs text-texto/70 dark:text-bege/60">
            <span className="w-2.5 h-2.5 rounded-sm dark:ring-1 dark:ring-bege/30" style={{ background: COR_TIPO[t] }} />{ROTULO_TIPO[t]}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Barras verticais simples com rótulo embaixo e valor em cima (sem nomes de pessoas). */
export function BarrasRotuladas({ itens, destaqueUltima = false, rotuloAcessivel }: { itens: { rotulo: string; valor: number; detalhe?: string }[]; destaqueUltima?: boolean; rotuloAcessivel: string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <div className="flex items-end gap-1.5 h-32" role="img" aria-label={rotuloAcessivel}>
      {itens.map((it, i) => {
        const ultima = destaqueUltima && i === itens.length - 1
        return (
          <div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-1" title={`${it.rotulo}: ${it.valor}${it.detalhe ? `, ${it.detalhe}` : ''}`}>
            <span className="text-[10px] tabular text-texto/65 dark:text-bege/55">{it.valor || ''}</span>
            <div className={`w-full rounded-[4px] ${it.valor ? (ultima ? 'bg-dourado' : 'bg-dourado/60') : 'bg-marinho/[0.06] dark:bg-bege/[0.07]'}`}
              style={{ height: it.valor ? `${Math.max(6, (it.valor / max) * 80)}%` : '4px' }} />
            <span className={`text-[10px] whitespace-nowrap ${ultima ? 'font-bold text-marinho dark:text-bege' : 'text-texto/65 dark:text-bege/55'}`}>{it.rotulo}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Barras horizontais para distribuições (quantas pessoas em cada faixa). */
export function BarrasHorizontais({ itens, unidade }: { itens: { rotulo: string; valor: number }[]; unidade: [string, string] }) {
  const max = Math.max(1, ...itens.map((i) => i.valor))
  return (
    <ul className="space-y-2">
      {itens.map((it) => (
        <li key={it.rotulo} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 text-sm">
          <span className="text-texto/70 dark:text-bege/70 truncate">{it.rotulo}</span>
          <span className="h-2.5 rounded-full bg-marinho/[0.06] dark:bg-bege/[0.07] overflow-hidden">
            <span className="block h-full rounded-full bg-dourado" style={{ width: `${(it.valor / max) * 100}%` }} />
          </span>
          <span className="tabular text-xs text-texto/70 dark:text-bege/60 w-16 text-right">{it.valor} {it.valor === 1 ? unidade[0] : unidade[1]}</span>
        </li>
      ))}
    </ul>
  )
}
