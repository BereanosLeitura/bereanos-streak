import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Perfil } from '../lib/supabase'
import type { LivroAtivo } from './Inicio'
import { formatarData } from '../lib/estatisticas'
import Icone from '../components/Icone'

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  onVoltar?: () => void
}

type TipoMeta = 'semanal' | 'mensal' | 'livro_total' | 'sessoes_semanais' | 'dias_semanais'

interface MetaRow {
  id: string
  tipo: TipoMeta
  valor_paginas: number | null
  valor_sessoes: number | null
  valor_dias: number | null
  periodo_inicio: string | null
  periodo_fim: string | null
}

const RADIO: Record<TipoMeta, string> = {
  semanal: 'Páginas na semana',
  mensal: 'Páginas no mês',
  livro_total: 'Terminar o livro até uma data',
  sessoes_semanais: 'Sessões de Pomodoro por semana',
  dias_semanais: 'Dias de leitura por semana'
}

export default function Metas({ perfil, livro, onVoltar }: Props) {
  const [metas, setMetas] = useState<MetaRow[]>([])
  const [progresso, setProgresso] = useState<Record<string, number>>({})
  const [carregando, setCarregando] = useState(true)
  const [formAberto, setFormAberto] = useState(false)
  const [tipo, setTipo] = useState<TipoMeta>('semanal')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    carregar()
  }, [livro.id])

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('metas')
      .select('id, tipo, valor_paginas, valor_sessoes, valor_dias, periodo_inicio, periodo_fim')
      .eq('membro_id', perfil.id)
      .eq('livro_id', livro.id)
      .order('periodo_inicio', { ascending: false })

    const lista = (data ?? []) as MetaRow[]
    setMetas(lista)
    await calcularProgresso(lista)
    setCarregando(false)
  }

  async function calcularProgresso(lista: MetaRow[]) {
    const ritmo = perfil.ritmo_leitura_min_por_pagina || 2
    const novoProgresso: Record<string, number> = {}

    for (const m of lista) {
      if (!m.periodo_inicio || !m.periodo_fim) continue

      if (m.tipo === 'semanal' || m.tipo === 'mensal' || m.tipo === 'livro_total') {
        const { data } = await supabase
          .from('registros_leitura')
          .select('paginas_lidas, minutos_lidos, registrado_em')
          .eq('membro_id', perfil.id)
          .eq('livro_id', livro.id)
          .gte('registrado_em', m.periodo_inicio)
          .lte('registrado_em', m.periodo_fim + 'T23:59:59')

        const soma = (data ?? []).reduce(
          (acc, r) => acc + (r.paginas_lidas ?? 0) + (r.minutos_lidos ? r.minutos_lidos / ritmo : 0),
          0
        )
        novoProgresso[m.id] = soma
      }

      if (m.tipo === 'sessoes_semanais') {
        const { count } = await supabase
          .from('sessoes_pomodoro')
          .select('id', { count: 'exact', head: true })
          .eq('membro_id', perfil.id)
          .eq('livro_id', livro.id)
          .eq('status', 'concluida')
          .gte('fim', m.periodo_inicio)
          .lte('fim', m.periodo_fim + 'T23:59:59')
        novoProgresso[m.id] = count ?? 0
      }

      if (m.tipo === 'dias_semanais') {
        const { data } = await supabase
          .from('registros_leitura')
          .select('registrado_em')
          .eq('membro_id', perfil.id)
          .eq('livro_id', livro.id)
          .gte('registrado_em', m.periodo_inicio)
          .lte('registrado_em', m.periodo_fim + 'T23:59:59')
        const dias = new Set((data ?? []).map((r) => r.registrado_em.slice(0, 10)))
        novoProgresso[m.id] = dias.size
      }
    }

    setProgresso(novoProgresso)
  }

  function periodoPadrao(t: TipoMeta): { inicio: string; fim: string } {
    const hoje = new Date()
    if (t === 'mensal') {
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
      return { inicio: formatarISO(inicio), fim: formatarISO(fim) }
    }
    if (t === 'livro_total') {
      return {
        inicio: livro.ciclo_inicio ?? formatarISO(hoje),
        fim: livro.ciclo_fim ?? formatarISO(hoje)
      }
    }
    // semanal, sessoes_semanais, dias_semanais: semana atual (domingo a sábado)
    const diaSemana = hoje.getDay()
    const inicio = new Date(hoje)
    inicio.setDate(hoje.getDate() - diaSemana)
    const fim = new Date(inicio)
    fim.setDate(inicio.getDate() + 6)
    return { inicio: formatarISO(inicio), fim: formatarISO(fim) }
  }

  function formatarISO(d: Date) {
    return d.toISOString().slice(0, 10)
  }

  async function salvarMeta() {
    setErro(null)
    const valorBruto = tipo === 'livro_total' ? String(livro.paginas_totais) : valor
    const valorNum = parseInt(valorBruto, 10)
    if (!valorNum || valorNum <= 0) {
      setErro('Informe um número válido.')
      return
    }

    const { inicio, fim } = periodoPadrao(tipo)
    const payload: Record<string, unknown> = {
      membro_id: perfil.id,
      livro_id: livro.id,
      tipo,
      periodo_inicio: inicio,
      periodo_fim: fim
    }
    if (tipo === 'semanal' || tipo === 'mensal' || tipo === 'livro_total') payload.valor_paginas = valorNum
    if (tipo === 'sessoes_semanais') payload.valor_sessoes = valorNum
    if (tipo === 'dias_semanais') payload.valor_dias = valorNum

    setSalvando(true)
    const { error } = await supabase.from('metas').insert(payload)
    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar: ' + error.message)
      return
    }
    setValor('')
    setFormAberto(false)
    carregar()
  }

  async function excluirMeta(id: string) {
    await supabase.from('metas').delete().eq('id', id)
    carregar()
  }

  function alvoDaMeta(m: MetaRow): number {
    if (m.tipo === 'semanal' || m.tipo === 'mensal') return m.valor_paginas ?? 0
    if (m.tipo === 'livro_total') return livro.paginas_totais
    if (m.tipo === 'sessoes_semanais') return m.valor_sessoes ?? 0
    return m.valor_dias ?? 0
  }

  return (
    <div className="min-h-screen px-5 pt-8 pb-28">
      <div className="max-w-md mx-auto">
        {onVoltar && (
          <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1 mb-2">
            <Icone nome="seta-esquerda" className="w-4 h-4" /> Início
          </button>
        )}
        <div className="mb-6">
          <h1 className="font-serif text-[30px] text-marinho dark:text-bege">Metas</h1>
          <p className="legenda mt-0.5">Metas pessoais para {livro.titulo}. Só você e o admin veem.</p>
        </div>

        {carregando && <p className="text-sm text-texto/50 dark:text-bege/50 text-center">Carregando…</p>}

        {!carregando && metas.length === 0 && !formAberto && (
          <p className="text-sm text-texto/55 dark:text-bege/55 text-center mb-5">
            Você ainda não tem meta pra este livro. Uma meta pequena e realista ajuda mais do que uma ambiciosa que ninguém cumpre.
          </p>
        )}

        <ul className="space-y-3 mb-5">
          {metas.map((m) => {
            const alvo = alvoDaMeta(m)
            const atual = progresso[m.id] ?? 0
            const pct = alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0
            const bateu = pct >= 100
            return (
              <li key={m.id} className={`cartao p-4 ${bateu ? 'border-dourado/50' : ''}`}>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="text-[15px] font-semibold text-marinho dark:text-bege">{RADIO[m.tipo]}</p>
                    <p className="text-xs text-texto/50 dark:text-bege/50">
                      {m.periodo_inicio && m.periodo_fim ? `${formatarData(m.periodo_inicio)} a ${formatarData(m.periodo_fim)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => excluirMeta(m.id)}
                    className="text-xs text-texto/40 dark:text-bege/40 hover:text-red-700 dark:hover:text-red-400 shrink-0"
                  >
                    Remover
                  </button>
                </div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-texto/60 dark:text-bege/60">
                    {Math.round(atual)} / {alvo}
                  </span>
                  <span className={`text-xs font-medium ${bateu ? 'text-dourado-escuro dark:text-dourado' : 'text-texto/50 dark:text-bege/50'}`}>
                    {bateu ? 'Meta batida' : `${pct}%`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-marinho/[0.07] dark:bg-bege/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bateu ? 'barra-progresso' : 'bg-marinho/25 dark:bg-bege/25'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>

        {!formAberto && (
          <button onClick={() => setFormAberto(true)} className="botao-secundario">
            Nova meta
          </button>
        )}

        {formAberto && (
          <div className="cartao p-5 space-y-4">
            <div>
              <label className="rotulo">Tipo de meta</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoMeta)}
                className="campo"
              >
                {Object.entries(RADIO).map(([valorOpt, rotulo]) => (
                  <option key={valorOpt} value={valorOpt}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="rotulo">
                {tipo === 'sessoes_semanais' ? 'Quantas sessões' : tipo === 'dias_semanais' ? 'Quantos dias' : 'Quantas páginas'}
              </label>
              <input
                type="number"
                min={1}
                value={tipo === 'livro_total' ? String(livro.paginas_totais) : valor}
                disabled={tipo === 'livro_total'}
                onChange={(e) => setValor(e.target.value)}
                className="campo"
              />
              {tipo === 'livro_total' && (
                <p className="text-xs text-texto/50 dark:text-bege/50 mt-1.5">
                  Usa o total de páginas do livro ({livro.paginas_totais}), do início ao fim do ciclo.
                </p>
              )}
            </div>

            {erro && <p className="text-sm text-red-700 dark:text-red-400">{erro}</p>}

            <div className="flex gap-2">
              <button
                onClick={salvarMeta}
                disabled={salvando}
                className="botao-primario"
              >
                {salvando ? 'Salvando…' : 'Salvar meta'}
              </button>
              <button onClick={() => { setFormAberto(false); setErro(null) }} className="botao-secundario">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
