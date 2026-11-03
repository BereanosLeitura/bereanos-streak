import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, type Perfil } from './supabase'
import { chaveDia, paginasEquivalentes, paginasPorDia, sequenciaAtual } from './estatisticas'

// Tudo o que as telas precisam saber sobre a leitura do membro, num lugar só:
// progresso no livro do ciclo, páginas por dia, sequência, semana e previsão.

export interface RegistroMeu {
  id: string
  livro_id: string
  origem: 'manual' | 'pomodoro'
  paginas_lidas: number | null
  minutos_lidos: number | null
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
  const [sessoes, setSessoes] = useState<{ fim: string; duracao_minutos: number }[]>([])

  const recarregar = useCallback(async () => {
    const desde = new Date()
    desde.setDate(desde.getDate() - 400)
    const semanaAtras = new Date()
    semanaAtras.setDate(semanaAtras.getDate() - 7)
    const [{ data }, { data: ss }] = await Promise.all([
      supabase
        .from('registros_leitura')
        .select('id, livro_id, origem, paginas_lidas, minutos_lidos, registrado_em')
        .eq('membro_id', perfil.id)
        .gte('registrado_em', desde.toISOString())
        .order('registrado_em', { ascending: false }),
      supabase
        .from('sessoes_pomodoro')
        .select('fim, duracao_minutos')
        .eq('membro_id', perfil.id)
        .eq('status', 'concluida')
        .gte('fim', semanaAtras.toISOString())
    ])
    setRegistros((data ?? []) as RegistroMeu[])
    setSessoes(((ss ?? []) as { fim: string | null; duracao_minutos: number | null }[])
      .filter((x) => x.fim)
      .map((x) => ({ fim: x.fim!, duracao_minutos: x.duracao_minutos ?? 0 })))
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
    // minutos de foco vêm das sessões (o registro pode ter só as páginas)
    const minutosSemana = sessoes
      .filter((x) => chaveDia(x.fim) >= semana[0].chave)
      .reduce((s, x) => s + x.duracao_minutos, 0)

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
