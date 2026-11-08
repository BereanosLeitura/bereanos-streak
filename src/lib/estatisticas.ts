// Cálculos feitos no cliente a partir dos registros de leitura.
// Datas sempre no fuso local do aparelho (um registro às 23h em Fortaleza
// conta para aquele dia, não para o dia seguinte em UTC).

export interface RegistroBasico {
  paginas_lidas: number | null
  minutos_lidos: number | null
  registrado_em: string
}

export function chaveDia(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d
  const a = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const dia = String(x.getDate()).padStart(2, '0')
  return `${a}-${m}-${dia}`
}

export function paginasEquivalentes(r: RegistroBasico, ritmo: number): number {
  return (r.paginas_lidas ?? 0) + (r.minutos_lidos ? r.minutos_lidos / (ritmo || 2) : 0)
}

/** Páginas (equivalentes) por dia, chave AAAA-MM-DD local. */
export function paginasPorDia(registros: RegistroBasico[], ritmo: number): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const r of registros) {
    const k = chaveDia(r.registrado_em)
    mapa.set(k, (mapa.get(k) ?? 0) + paginasEquivalentes(r, ritmo))
  }
  return mapa
}

/**
 * Sequência atual de dias com leitura. Se hoje ainda não tem registro, a
 * sequência de ontem continua valendo (o dia ainda não acabou).
 */
export function sequenciaAtual(dias: Set<string>): { dias: number; leuHoje: boolean } {
  const hoje = new Date()
  const leuHoje = dias.has(chaveDia(hoje))
  const cursor = new Date(hoje)
  if (!leuHoje) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (dias.has(chaveDia(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 1)
  }
  return { dias: n, leuHoje }
}

export function maiorSequencia(dias: Set<string>): number {
  const ordenados = [...dias].sort()
  let melhor = 0
  let atual = 0
  let anterior: Date | null = null
  for (const k of ordenados) {
    const d = new Date(k + 'T12:00:00')
    if (anterior && Math.round((d.getTime() - anterior.getTime()) / 86_400_000) === 1) atual++
    else atual = 1
    melhor = Math.max(melhor, atual)
    anterior = d
  }
  return melhor
}

/** Últimas N semanas, alinhadas para começar no domingo. */
export function gradeSemanas(semanas: number): Date[][] {
  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  const inicio = new Date(hoje)
  inicio.setDate(hoje.getDate() - hoje.getDay() - (semanas - 1) * 7)
  const grade: Date[][] = []
  for (let s = 0; s < semanas; s++) {
    const semana: Date[] = []
    for (let d = 0; d < 7; d++) {
      const x = new Date(inicio)
      x.setDate(inicio.getDate() + s * 7 + d)
      semana.push(x)
    }
    grade.push(semana)
  }
  return grade
}

/** Dias corridos até a data (inclusive hoje). Null se não houver data. */
export function diasAte(dataISO: string | null): number | null {
  if (!dataISO) return null
  const fim = new Date(dataISO + 'T23:59:59')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((fim.getTime() - hoje.getTime()) / 86_400_000))
}

export function formatarData(dataISO: string, opcoes: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const d = dataISO.length === 10 ? new Date(dataISO + 'T12:00:00') : new Date(dataISO)
  return d.toLocaleDateString('pt-BR', opcoes).replace('.', '')
}

export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return 'ontem'
  if (d < 7) return `há ${d} dias`
  return formatarData(iso)
}

/** "1 página", "3 páginas": número com a palavra concordando. */
export function contar(n: number, singular: string, plural: string): string {
  const v = Math.round(n)
  return `${v.toLocaleString('pt-BR')} ${v === 1 ? singular : plural}`
}
