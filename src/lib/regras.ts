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

/** "Ana", "Ana e Bia", "Ana, Bia e Caio". */
export function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

/**
 * Terminou o livro? Vale a última página registrada OU a marcação "Terminei"
 * (feita pela pessoa ou pelo admin ao concluir o ciclo). Usar esta regra em
 * todas as telas evita números diferentes para "quem terminou".
 */
export function terminouLivro(paginasLidas: number, paginasTotais: number, status?: string | null): boolean {
  return status === 'terminou' || (paginasTotais > 0 && paginasLidas >= paginasTotais)
}

/** Data local AAAA-MM-DD (nunca em UTC: às 22h em Fortaleza ainda é o mesmo dia). */
export function dataLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Início e fim de um período de datas locais, em ISO, para filtrar timestamps no banco. */
export function limitesDoPeriodo(inicio: string, fim: string): { de: string; ate: string } {
  const [a1, m1, d1] = inicio.split('-').map(Number)
  const [a2, m2, d2] = fim.split('-').map(Number)
  return {
    de: new Date(a1, m1 - 1, d1, 0, 0, 0, 0).toISOString(),
    ate: new Date(a2, m2 - 1, d2, 23, 59, 59, 999).toISOString()
  }
}

/**
 * Trecho entre aspas curvas, sem dobrar: quem já digitou "aspas" no texto
 * não vê “"assim"”. Tira aspas e espaços das pontas e põe um par só.
 */
export function entreAspas(texto: string): string {
  const limpo = texto.trim().replace(/^["“”'‘’«»]+/, '').replace(/["“”'‘’«»]+$/, '').trim()
  return `“${limpo}”`
}
