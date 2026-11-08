import { supabase } from './supabase'

// Tempo de leitura informado à mão no registro (quem leu sem usar o Foco).
// Fica separado de minutos_lidos para não virar páginas duas vezes.

/** Soma o tempo informado à mão. Devolve 0 se o banco ainda não tiver a coluna. */
export async function tempoManual(membroId: string, filtro: { livroId?: string; desde?: string } = {}): Promise<number> {
  let q = supabase.from('registros_leitura').select('tempo_minutos').eq('membro_id', membroId).not('tempo_minutos', 'is', null)
  if (filtro.livroId) q = q.eq('livro_id', filtro.livroId)
  if (filtro.desde) q = q.gte('registrado_em', filtro.desde)
  const { data, error } = await q
  if (error) return 0
  return ((data ?? []) as { tempo_minutos: number | null }[]).reduce((a, x) => a + (x.tempo_minutos ?? 0), 0)
}

/** 45 → "45 min"; 90 → "1h30"; 120 → "2h" */
/** Estimativa de tempo: acima de 1h, arredonda para 10 minutos ("cerca de 8h20"). */
export function formatarTempoEstimado(min: number): string {
  return formatarTempo(min >= 60 ? Math.round(min / 10) * 10 : Math.max(1, Math.round(min)))
}

export function formatarTempo(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`
}
