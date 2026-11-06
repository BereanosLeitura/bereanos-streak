import { supabase, type Perfil } from './supabase'
import { paginasEquivalentes } from './estatisticas'
import type { LivroAtivo } from '../pages/Inicio'

// Leitura pendente: um livro de ciclo já encerrado que a pessoa começou e
// ainda não terminou (nem marcou "Terminei" ou "Deixar de lado").
// Pendência não é atraso: cada um continua no seu ritmo.

export type StatusLeitura = 'terminou' | 'deixou'

export interface LivroPendente extends LivroAtivo {
  paginasLidas: number
  pct: number
}

/** Conclusões marcadas (pela pessoa ou pelo admin): "livroId:membroId" -> status. */
export async function buscarConclusoes(filtro: { membroId?: string; livroId?: string } = {}): Promise<Map<string, StatusLeitura>> {
  let q = supabase.from('leituras_status').select('livro_id, membro_id, status')
  if (filtro.membroId) q = q.eq('membro_id', filtro.membroId)
  if (filtro.livroId) q = q.eq('livro_id', filtro.livroId)
  const { data, error } = await q
  if (error) return new Map() // banco ainda sem a tabela: segue sem conclusões marcadas
  return new Map((data ?? []).map((x: { livro_id: string; membro_id: string; status: StatusLeitura }) => [`${x.livro_id}:${x.membro_id}`, x.status]))
}

export async function buscarPendentes(perfil: Perfil): Promise<LivroPendente[]> {
  const ritmo = perfil.ritmo_leitura_min_por_pagina || 2
  const [livrosR, regsR, conclusoes] = await Promise.all([
    supabase.from('livros').select('id, titulo, autor, capa_url, paginas_totais, ciclo_inicio, ciclo_fim, status, created_at')
      .eq('status', 'concluido').order('created_at', { ascending: false }),
    supabase.from('registros_leitura').select('livro_id, paginas_lidas, minutos_lidos, registrado_em').eq('membro_id', perfil.id),
    buscarConclusoes({ membroId: perfil.id })
  ])
  const porLivro = new Map<string, number>()
  for (const r of (regsR.data ?? []) as { livro_id: string; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string }[]) {
    porLivro.set(r.livro_id, (porLivro.get(r.livro_id) ?? 0) + paginasEquivalentes(r, ritmo))
  }
  return ((livrosR.data ?? []) as LivroAtivo[])
    .filter((l) => {
      const lidas = porLivro.get(l.id) ?? 0
      return lidas > 0 && lidas < l.paginas_totais && !conclusoes.has(`${l.id}:${perfil.id}`)
    })
    .map((l) => {
      const lidas = Math.round(porLivro.get(l.id) ?? 0)
      return { ...l, paginasLidas: lidas, pct: Math.round((lidas / l.paginas_totais) * 100) }
    })
}

/** Marca (ou desfaz, com null) o status de leitura de um membro num livro. */
export async function marcarLeitura(livroId: string, membroId: string, status: StatusLeitura | null, marcadoPor: string) {
  if (status === null) {
    return supabase.from('leituras_status').delete().eq('livro_id', livroId).eq('membro_id', membroId)
  }
  return supabase.from('leituras_status').upsert(
    { livro_id: livroId, membro_id: membroId, status, marcado_por: marcadoPor, atualizado_em: new Date().toISOString() },
    { onConflict: 'livro_id,membro_id' }
  )
}
