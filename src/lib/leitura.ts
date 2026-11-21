import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, type Perfil } from './supabase'
import { db } from './db-local'
import { chaveDia, paginasEquivalentes, paginasPorDia, sequenciaAtual } from './estatisticas'

// Tudo o que as telas precisam saber sobre a leitura do membro, num lugar só:
// progresso no livro do ciclo, páginas por dia, sequência, semana e previsão.

export interface RegistroMeu {
  id: string
  livro_id: string
  origem: 'manual' | 'pomodoro'
  paginas_lidas: number | null
  minutos_lidos: number | null
  tempo_minutos?: number | null
  registrado_em: string
}

export interface LivroBasico {
  id: string
  paginas_totais: number
}

export interface DiaSemana {
  chave: string
  rotulo: string // D S T Q Q S S
  paginas: number
  hoje: boolean
}

export function useMinhaLeitura(perfil: Perfil, livro: LivroBasico) {
  const [registros, setRegistros] = useState<RegistroMeu[] | null>(null)
  const [sessoes, setSessoes] = useState<{ fim: string; duracao_minutos: number; livro_id?: string }[]>([])

  const recarregar = useCallback(async () => {
    const desde = new Date()
    desde.setDate(desde.getDate() - 400)
    const semanaAtras = new Date()
    semanaAtras.setDate(semanaAtras.getDate() - 7)
    const consulta = (campos: string) => supabase
      .from('registros_leitura')
      .select(campos)
      .eq('membro_id', perfil.id)
      .gte('registrado_em', desde.toISOString())
      .order('registrado_em', { ascending: false })
    const [primeira, { data: ss }] = await Promise.all([
      consulta('id, livro_id, origem, paginas_lidas, minutos_lidos, tempo_minutos, registrado_em'),
      supabase
        .from('sessoes_pomodoro')
        .select('fim, duracao_minutos, livro_id')
        .eq('membro_id', perfil.id)
        .eq('status', 'concluida')
        .gte('fim', semanaAtras.toISOString())
    ])
    // sem a coluna tempo_minutos (banco ainda não atualizado), busca sem ela
    let data: unknown[] | null = primeira.error ? null : (primeira.data as unknown[])
    if (primeira.error) {
      const segunda = await consulta('id, livro_id, origem, paginas_lidas, minutos_lidos, registrado_em')
      data = segunda.error ? null : (segunda.data as unknown[])
    }
    // Sem internet: usa a última cópia que veio do servidor. Antes, a lista
    // ficava vazia e o app achava que a pessoa estava na página 0, e um
    // "parei na página 120" offline virava 120 páginas lidas de uma vez.
    const chaveCache = `bereanos-streak-cache-registros-${perfil.id}`
    let base: RegistroMeu[]
    if (data) {
      base = data as RegistroMeu[]
      try { localStorage.setItem(chaveCache, JSON.stringify(base)) } catch { /* sem espaço: segue */ }
    } else {
      try { base = JSON.parse(localStorage.getItem(chaveCache) ?? '[]') as RegistroMeu[] } catch { base = [] }
    }
    // Junta o que foi lançado neste aparelho e ainda não chegou ao servidor.
    const ids = new Set(base.map((r) => r.id))
    const locais = await db.registros.where('membro_id').equals(perfil.id)
      .filter((r) => r.sync_status !== 'sincronizado' && !ids.has(r.id)).toArray().catch(() => [])
    const juntos = [...base, ...locais.map(({ sync_status: _s, membro_id: _m, ...r }) => r as RegistroMeu)]
      .sort((a, b) => b.registrado_em.localeCompare(a.registrado_em))
    setRegistros(juntos)
    setSessoes(((ss ?? []) as { fim: string | null; duracao_minutos: number | null; livro_id?: string }[])
      .filter((x) => x.fim)
      .map((x) => ({ fim: x.fim!, duracao_minutos: x.duracao_minutos ?? 0, livro_id: x.livro_id })))
  }, [perfil.id])

  useEffect(() => {
    recarregar()
  }, [recarregar, livro.id])

  const ritmo = perfil.ritmo_leitura_min_por_pagina || 2

  return useMemo(() => {
    const lista = registros ?? []
    const doLivro = lista.filter((r) => r.livro_id === livro.id)
    const paginasLivro = Math.min(
      livro.paginas_totais,
      Math.round(doLivro.reduce((s, r) => s + paginasEquivalentes(r, ritmo), 0))
    )
    const pct = Math.min(100, Math.round((paginasLivro / livro.paginas_totais) * 100))
    const porDia = paginasPorDia(lista, ritmo)
    const seq = sequenciaAtual(new Set(porDia.keys()))
    const hojeChave = chaveDia(new Date())
    const paginasHoje = Math.round(porDia.get(hojeChave) ?? 0)

    // semana atual, de domingo a sábado
    const hoje = new Date()
    const domingo = new Date(hoje)
    domingo.setDate(hoje.getDate() - hoje.getDay())
    const semana: DiaSemana[] = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((rotulo, i) => {
      const d = new Date(domingo)
      d.setDate(domingo.getDate() + i)
      const chave = chaveDia(d)
      return { chave, rotulo, paginas: Math.round(porDia.get(chave) ?? 0), hoje: chave === hojeChave }
    })
    const paginasSemana = semana.reduce((s, d) => s + d.paginas, 0)
    // tempo de leitura: sessões de foco + tempo informado à mão nos registros
    const minutosSemana = sessoes
      .filter((x) => chaveDia(x.fim) >= semana[0].chave)
      .reduce((s, x) => s + x.duracao_minutos, 0) +
      lista.filter((r) => r.origem === 'manual' && r.tempo_minutos && chaveDia(r.registrado_em) >= semana[0].chave)
        .reduce((s, r) => s + (r.tempo_minutos ?? 0), 0)

    // previsão: média dos últimos 14 dias (só no livro do ciclo)
    const corte = new Date()
    corte.setDate(corte.getDate() - 13)
    const recente = doLivro.filter((r) => new Date(r.registrado_em) >= new Date(chaveDia(corte) + 'T00:00:00'))
    const primeiro = doLivro.length ? new Date(doLivro[doLivro.length - 1].registrado_em) : null
    const diasJanela = primeiro
      ? Math.min(14, Math.max(1, Math.ceil((Date.now() - new Date(chaveDia(primeiro) + 'T00:00:00').getTime()) / 86_400_000)))
      : 14
    const mediaDia = recente.reduce((s, r) => s + paginasEquivalentes(r, ritmo), 0) / diasJanela
    const faltam = livro.paginas_totais - paginasLivro
    let previsao: { dias: number; data: Date } | null = null
    if (faltam > 0 && mediaDia > 0.5) {
      const dias = Math.ceil(faltam / mediaDia)
      const data = new Date()
      data.setDate(data.getDate() + dias)
      previsao = { dias, data }
    }

    return {
      carregando: registros === null,
      registros: lista,
      doLivro,
      paginasLivro,
      pct,
      porDia,
      seq,
      paginasHoje,
      semana,
      paginasSemana,
      minutosSemana,
      mediaDia,
      previsao,
      sessoes,
      ritmo,
      recarregar
    }
  }, [registros, sessoes, livro.id, livro.paginas_totais, ritmo, recarregar])
}
