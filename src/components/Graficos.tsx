import { BLOCOS, type MapaHorarios, type PontoRitmo } from '../lib/infograficos'
import { chaveDia, formatarData } from '../lib/estatisticas'

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
        {BLOCOS.map((b) => <span key={b.curto} className="text-[9px] text-center text-texto/45 dark:text-bege/45">{b.curto}</span>)}
        {mapa.grade.map((linha, d) => (
          <div key={d} className="contents">
            <span className="text-[10px] text-texto/45 dark:text-bege/45 flex items-center">{LETRAS[d]}</span>
            {linha.map((v, b) => (
              <span
                key={b}
                title={v > 0 ? `${Math.round(v)} páginas` : ''}
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
          <div key={v.chave} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${formatarData(v.chave)}: ${v.paginas} páginas`}>
            <div className={`w-full rounded-[4px] ${v.paginas ? 'bg-dourado/80' : 'bg-marinho/[0.06] dark:bg-bege/[0.07]'}`}
              style={{ height: v.paginas ? `${Math.max(6, (v.paginas / max) * 100)}%` : '4px' }} />
            <span className={`text-[9px] ${destaqueHoje && v.chave === hoje ? 'font-bold text-marinho dark:text-bege' : 'text-texto/40 dark:text-bege/40'}`}>{LETRAS[d.getDay()]}</span>
          </div>
        )
      })}
    </div>
  )
}
