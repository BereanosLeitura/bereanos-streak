// Regras puras (sem React e sem Supabase), usadas pelas telas e cobertas
// pelos testes em tests/. Mudou uma regra aqui? Rode `npm test`.

/** "45 min", "1h", "1h30". */
export function formatarTempo(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}

/** Estimativa: acima de 1h, arredonda para 10 minutos ("cerca de 8h20"). */
export function formatarTempoEstimado(min: number): string {
  return formatarTempo(min >= 60 ? Math.round(min / 10) * 10 : Math.max(1, Math.round(min)))
}

/** Qual marco (25, 50 ou 75%) foi atravessado neste registro, se algum. 100% é a tela de "terminei". */
export function marcoAtravessado(antes: number, depois: number): number | null {
  const m = [75, 50, 25].find((x) => antes < x && depois >= x && depois < 100)
  return m ?? null
}

/** Anotação do mural de uma página que a pessoa ainda não leu? (as próprias nunca contam) */
export function aFrente(n: { pagina: number | null; membro_id?: string }, eu: string, minhaPagina: number | null) {
  if (minhaPagina === null || !n.pagina || n.membro_id === eu) return false
  return n.pagina > minhaPagina
}

export type Quando = 0 | 1 | 2 | 'outro' // hoje, ontem, anteontem ou outro dia

/**
 * Data e hora do registro de leitura.
 * Hoje = agora. Dias anteriores = às 20h, ou no horário informado.
 * Nunca no futuro (ex.: ontem às 23h é ok; hoje mais tarde não).
 */
export function dataDoRegistro(quando: Quando, outroDia: string, hora: string, agora: Date = new Date()): Date {
  if (quando === 0) return agora
  let d: Date
  if (quando === 'outro') {
    const [a, m, dia] = outroDia.split('-').map(Number)
    d = new Date(a, m - 1, dia)
  } else {
    d = new Date(agora)
    d.setDate(d.getDate() - quando)
  }
  const [h, min] = hora ? hora.split(':').map(Number) : [20, 0]
  d.setHours(h, min, 0, 0)
  return d > agora ? agora : d
}
