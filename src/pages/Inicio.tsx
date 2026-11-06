import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase, type Perfil } from '../lib/supabase'
import { apagarRegistroLeitura, criarRegistroLeitura } from '../lib/sync'
import { useMinhaLeitura } from '../lib/leitura'
import { useContagem } from '../lib/preferencias'
import PersonalizarInicio, { gravarLayout, layoutSalvo, type IdBlocoInicio, type LayoutInicio } from '../components/PersonalizarInicio'
import { buscarPendentes, type LivroPendente } from '../lib/pendentes'
import { useAviso } from '../components/Toast'
import Logo from '../components/Logo'
import InstalarApp from '../components/InstalarApp'
import { ICONE_CONQUISTA } from '../lib/conquistas'
import Avatar from '../components/Avatar'
import Icone, { type NomeIcone } from '../components/Icone'
import type { PreCarga } from './Compartilhar'
import { GraficoRitmo } from '../components/Graficos'
import { planoCiclo, serieRitmo } from '../lib/infograficos'
import {
  chaveDia, diasAte, formatarData, gradeSemanas, paginasEquivalentes, tempoRelativo
} from '../lib/estatisticas'

export interface LivroAtivo {
  id: string
  titulo: string
  autor: string | null
  capa_url: string | null
  paginas_totais: number
  ciclo_inicio: string | null
  ciclo_fim: string | null
  encontro_em?: string | null
  encontro_local?: string | null
  status?: 'ativo' | 'concluido'
}

interface ProgressoMembro {
  membro_id: string
  nome_exibicao: string
  paginas: number
  ultima: string
}

interface NotaMural {
  id: string
  texto: string
  tipo: 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'
  pagina: number | null
  created_at: string
  nome: string
}

export type Destino = 'registrar' | 'notas' | 'perfil' | 'metas' | 'compartilhar' | 'foco' | 'perguntas-encontro' | 'panorama' | 'aplicar' | 'encontro' | 'indicacoes'

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  onIr: (destino: Destino, carga?: PreCarga | null) => void
  onPerfilAtualizado: (p: Perfil) => void
  onContinuarPendente?: (livroId: string) => void
}

export default function Inicio({ perfil, livro, onIr, onPerfilAtualizado, onContinuarPendente }: Props) {
  const leitura = useMinhaLeitura(perfil, livro)
  const [pendentes, setPendentes] = useState<LivroPendente[]>([])
  useEffect(() => { buscarPendentes(perfil).then((l) => setPendentes(l.filter((p) => p.id !== livro.id))).catch(() => setPendentes([])) }, [perfil.id, livro.id])
  const contagem = useContagem()
  const [progresso, setProgresso] = useState<ProgressoMembro[] | null>(null)
  const [aniversariantes, setAniversariantes] = useState<{ nome: string; dias: number; data: string }[]>([])
  const [mural, setMural] = useState<NotaMural[]>([])
  const [metas, setMetas] = useState<MetaResumo[] | null>(null)
  const [qtdPerguntas, setQtdPerguntas] = useState(0)
  const [temAplicacao, setTemAplicacao] = useState(true)
  const [novaConquista, setNovaConquista] = useState<{ id: string; nome: string; descricao: string | null; icone: string | null } | null>(null)
  const [verInstalar, setVerInstalar] = useState(() => { try { return !localStorage.getItem('bereanos-streak-instalar-dispensado') } catch { return true } })
  const [registrando, setRegistrando] = useState(false)
  const [ultimoRapido, setUltimoRapido] = useState<{ id: string; paginas: number } | null>(null)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [vista, setVista] = useState<'semana' | 'ciclo' | 'meses'>('semana')
  const [layout, setLayout] = useState<LayoutInicio>(() => layoutSalvo())
  const [personalizando, setPersonalizando] = useState(false)
  function salvarLayout(l: LayoutInicio) { setLayout(l); gravarLayout(l) }
  const timerDesfazer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avisar = useAviso()

  useEffect(() => {
    carregarProgresso()
    carregarAniversariantes()
    carregarMural()
    supabase.from('metas').select('id, tipo, valor_paginas, valor_sessoes, valor_dias, periodo_inicio, periodo_fim')
      .eq('membro_id', perfil.id).eq('livro_id', livro.id)
      .then(({ data }) => setMetas((data ?? []) as MetaResumo[]))
    verificarConquistas()
    supabase.from('anotacoes').select('id', { count: 'exact', head: true }).eq('livro_id', livro.id).eq('compartilhada', true).eq('tipo', 'pergunta')
      .then(({ count }) => setQtdPerguntas(count ?? 0))
    supabase.from('anotacoes').select('id', { count: 'exact', head: true }).eq('livro_id', livro.id).eq('membro_id', perfil.id).eq('tipo', 'aplicacao')
      .then(({ count, error }) => setTemAplicacao(error ? true : (count ?? 0) > 0))
    return () => { if (timerDesfazer.current) clearTimeout(timerDesfazer.current) }
  }, [livro.id])

  // Avisa de conquistas novas (concedidas pelo banco) que a pessoa ainda não viu.
  const chaveVistas = `bereanos-streak-conquistas-vistas-${perfil.id}`
  async function verificarConquistas() {
    const { data } = await supabase.from('membro_conquistas').select('id, conquistas(nome, descricao, icone)')
      .eq('membro_id', perfil.id).order('conquistado_em', { ascending: false })
    const lista = (data ?? []) as any[]
    let vistas: string[] | null = null
    try { vistas = JSON.parse(localStorage.getItem(chaveVistas) ?? 'null') } catch { vistas = null }
    if (vistas === null) {
      // primeira vez neste aparelho: considera as atuais como vistas, sem aviso em massa
      try { localStorage.setItem(chaveVistas, JSON.stringify(lista.map((x) => x.id))) } catch { /* ok */ }
      return
    }
    const nova = lista.find((x) => !vistas!.includes(x.id) && x.conquistas)
    if (nova) setNovaConquista({ id: nova.id, ...nova.conquistas })
  }
  function marcarConquistaVista() {
    if (!novaConquista) return
    try {
      const vistas: string[] = JSON.parse(localStorage.getItem(chaveVistas) ?? '[]')
      localStorage.setItem(chaveVistas, JSON.stringify([...vistas, novaConquista.id]))
    } catch { /* ok */ }
    setNovaConquista(null)
    verificarConquistas()
  }

  async function carregarProgresso() {
    const { data } = await supabase
      .from('registros_leitura')
      .select('membro_id, paginas_lidas, minutos_lidos, registrado_em, perfis(nome_exibicao, ritmo_leitura_min_por_pagina)')
      .eq('livro_id', livro.id)
    const mapa = new Map<string, ProgressoMembro>()
    for (const r of data ?? []) {
      const p = (r as any).perfis
      const atual = mapa.get(r.membro_id) ?? { membro_id: r.membro_id, nome_exibicao: p?.nome_exibicao ?? 'Membro', paginas: 0, ultima: r.registrado_em }
      atual.paginas += paginasEquivalentes(r, p?.ritmo_leitura_min_por_pagina ?? 2)
      if (r.registrado_em > atual.ultima) atual.ultima = r.registrado_em
      mapa.set(r.membro_id, atual)
    }
    setProgresso([...mapa.values()].sort((a, b) => b.paginas - a.paginas))
  }

  async function carregarAniversariantes() {
    const { data } = await supabase.from('perfis').select('nome_exibicao, data_nascimento')
    const hoje = new Date(); hoje.setHours(12, 0, 0, 0)
    const lista: { nome: string; dias: number; data: string }[] = []
    for (const p of data ?? []) {
      if (!p.data_nascimento) continue
      const n = new Date(p.data_nascimento + 'T12:00:00')
      const prox = new Date(hoje.getFullYear(), n.getMonth(), n.getDate(), 12)
      if (prox < hoje) prox.setFullYear(hoje.getFullYear() + 1)
      const dias = Math.round((prox.getTime() - hoje.getTime()) / 86_400_000)
      if (dias <= 7) lista.push({ nome: p.nome_exibicao, dias, data: prox.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) })
    }
    setAniversariantes(lista.sort((a, b) => a.dias - b.dias))
  }

  async function carregarMural() {
    const { data } = await supabase
      .from('anotacoes')
      .select('id, texto, tipo, pagina, created_at, perfis(nome_exibicao)')
      .eq('livro_id', livro.id)
      .eq('compartilhada', true)
      .order('created_at', { ascending: false })
      .limit(3)
    setMural((data ?? []).map((n: any) => ({ ...n, nome: n.perfis?.nome_exibicao ?? 'Membro' })))
  }

  async function registrarRapido(paginas: number) {
    if (registrando) return
    setRegistrando(true)
    const r = await criarRegistroLeitura({ membro_id: perfil.id, livro_id: livro.id, origem: 'manual', paginas_lidas: paginas, minutos_lidos: null })
    setRegistrando(false)
    setUltimoRapido({ id: r.id, paginas })
    if (timerDesfazer.current) clearTimeout(timerDesfazer.current)
    timerDesfazer.current = setTimeout(() => setUltimoRapido(null), 8000)
    const terminou = leitura.paginasLivro < livro.paginas_totais && leitura.paginasLivro + paginas >= livro.paginas_totais
    const bateuMeta = leitura.paginasHoje < meta && leitura.paginasHoje + paginas >= meta
    avisar(terminou ? 'Livro concluído. Parabéns!' : bateuMeta ? `Meta do dia cumprida: ${leitura.paginasHoje + paginas} páginas hoje` : `${paginas} páginas registradas`)
    leitura.recarregar()
    carregarProgresso()
    setTimeout(verificarConquistas, 1200)
  }

  async function desfazer() {
    if (!ultimoRapido) return
    const ok = await apagarRegistroLeitura(ultimoRapido.id)
    setUltimoRapido(null)
    avisar(ok ? 'Registro desfeito' : 'Não foi possível desfazer', ok ? 'ok' : 'erro')
    leitura.recarregar()
    carregarProgresso()
  }

  async function salvarMetaDiaria(valor: number) {
    const v = Math.max(1, Math.min(500, valor))
    onPerfilAtualizado({ ...perfil, meta_diaria_paginas: v })
    const { error } = await supabase.from('perfis').update({ meta_diaria_paginas: v }).eq('id', perfil.id)
    if (error) avisar('Não foi possível salvar a meta', 'erro')
  }

  const meta = perfil.meta_diaria_paginas ?? 10
  const pct = leitura.pct
  const restantes = diasAte(livro.ciclo_fim)
  const faltam = livro.paginas_totais - leitura.paginasLivro
  const ritmoNecessario = restantes && restantes > 0 && faltam > 0 ? Math.ceil(faltam / restantes) : null
  const pctHoje = Math.min(1, leitura.paginasHoje / meta)
  const leramHoje = useMemo(() => new Set((progresso ?? []).filter((p) => chaveDia(p.ultima) === chaveDia(new Date())).map((p) => p.membro_id)), [progresso])
  const maxSemana = Math.max(meta, ...leitura.semana.map((d) => d.paginas))

  const blocos: Record<IdBlocoInicio, ReactNode> = {
    encontro: (
      <>
        {/* Próximo encontro */}
        {livro.encontro_em && <CartaoEncontro em={livro.encontro_em} local={livro.encontro_local ?? null} perguntas={qtdPerguntas} onPerguntas={() => onIr('perguntas-encontro')} onAbrir={() => onIr('encontro')} />}
      </>
    ),
    hoje: (
      <>
        {/* Hoje */}
        <section className="cartao p-5">
          <div className="flex items-center gap-5">
            <AnelMeta pct={pctHoje} paginas={leitura.paginasHoje} />
            <div className="flex-1 min-w-0">
              <h2 className="titulo-secao">Hoje</h2>
              {editandoMeta ? (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => salvarMetaDiaria(meta - 1)} className="w-8 h-8 rounded-full border border-marinho/15 dark:border-bege/20 text-marinho dark:text-bege" aria-label="Diminuir meta">−</button>
                  <span className="font-serif tabular text-xl text-marinho dark:text-bege w-10 text-center">{meta}</span>
                  <button onClick={() => salvarMetaDiaria(meta + 1)} className="w-8 h-8 rounded-full border border-marinho/15 dark:border-bege/20 text-marinho dark:text-bege" aria-label="Aumentar meta">+</button>
                  <button onClick={() => setEditandoMeta(false)} className="botao-texto ml-1">Pronto</button>
                </div>
              ) : (
                <p className="legenda mt-0.5">
                  {leitura.paginasHoje >= meta
                    ? `Meta cumprida: ${leitura.paginasHoje} páginas hoje (meta de ${meta}).`
                    : `${leitura.paginasHoje} de ${meta} páginas da meta do dia.`}{' '}
                  <button onClick={() => setEditandoMeta(true)} className="botao-texto">Ajustar meta</button>
                </p>
              )}
              {contagem && <p className={`flex items-center gap-1 text-sm mt-2 ${leitura.seq.dias > 0 ? 'text-dourado-escuro dark:text-dourado' : 'text-texto/45 dark:text-bege/45'}`}>
                <Icone nome="chama" className="w-4 h-4" />
                {leitura.seq.dias === 0
                  ? 'Comece uma sequência hoje'
                  : leitura.seq.leuHoje
                    ? `${leitura.seq.dias} ${leitura.seq.dias === 1 ? 'dia seguido' : 'dias seguidos'} de leitura`
                    : `${leitura.seq.dias} ${leitura.seq.dias === 1 ? 'dia seguido' : 'dias seguidos'}. Leia hoje para manter`}
              </p>}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm text-texto/60 dark:text-bege/60 mb-2">Registro rápido</p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 20].map((n) => (
                <button
                  key={n}
                  disabled={registrando}
                  onClick={() => registrarRapido(n)}
                  className="rounded-xl border border-marinho/15 dark:border-bege/15 py-2.5 font-semibold text-marinho dark:text-bege hover:border-dourado hover:bg-dourado/5 disabled:opacity-50 transition-colors"
                >
                  +{n}
                </button>
              ))}
              <button onClick={() => onIr('registrar')} className="rounded-xl border border-marinho/15 dark:border-bege/15 py-2.5 text-sm font-semibold text-dourado-escuro dark:text-dourado hover:border-dourado">
                Outro
              </button>
            </div>
            {ultimoRapido && (
              <p className="text-sm text-texto/60 dark:text-bege/60 mt-3 animate-subir-suave">
                {ultimoRapido.paginas} páginas lançadas agora.{' '}
                <button onClick={desfazer} className="botao-texto">Desfazer</button>
              </p>
            )}
            {!ultimoRapido && leitura.doLivro.length > 0 && (
              <button onClick={() => onIr('registrar')} className="text-xs text-texto/50 dark:text-bege/50 underline underline-offset-2 mt-3">
                Lançou algo errado? Corrigir registros
              </button>
            )}
          </div>
        </section>
      </>
    ),
    semana: (
      <>
        {/* Semana */}
        <section className="cartao p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="titulo-secao">{vista === 'semana' ? 'Esta semana' : vista === 'ciclo' ? 'Ritmo do ciclo' : 'Últimos meses'}</h2>
            <div className="flex rounded-full bg-marinho/[0.06] dark:bg-bege/[0.08] p-0.5 text-xs" role="tablist">
              {(['semana', 'ciclo', 'meses'] as const).map((v) => (
                <button key={v} role="tab" aria-selected={vista === v} onClick={() => setVista(v)}
                  className={`px-2.5 py-1 rounded-full transition-colors ${vista === v ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege font-semibold shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
                  {v === 'semana' ? 'Semana' : v === 'ciclo' ? 'Ciclo' : 'Meses'}
                </button>
              ))}
            </div>
          </div>
          {vista === 'ciclo' ? (
            <RitmoCiclo leitura={leitura} livro={livro} />
          ) : vista === 'semana' ? (
            <>
              {leitura.paginasSemana === 0 && <p className="legenda mt-3">Nenhuma página nesta semana ainda. Cada página conta.</p>}
              <div className="flex items-end justify-between gap-2 h-28 mt-4" role="img" aria-label="Páginas lidas em cada dia da semana">
                {leitura.semana.map((d) => {
                  const futuro = d.chave > chaveDia(new Date())
                  const altura = d.paginas > 0 ? Math.max(8, (d.paginas / maxSemana) * 100) : 0
                  return (
                    <div key={d.chave} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      {d.paginas > 0 && <span className="text-[11px] tabular text-texto/55 dark:text-bege/55">{d.paginas}</span>}
                      <div className="w-full max-w-[30px] rounded-md bg-marinho/[0.06] dark:bg-bege/[0.07] relative flex-1 flex items-end overflow-hidden">
                        <div className={`w-full rounded-md transition-all duration-700 ${d.paginas >= meta ? 'barra-progresso' : 'bg-dourado/45'}`} style={{ height: `${altura}%` }} />
                        {!futuro && meta <= maxSemana && (
                          <span className="absolute inset-x-0 border-t border-dashed border-marinho/25 dark:border-bege/25" style={{ bottom: `${(meta / maxSemana) * 100}%` }} />
                        )}
                      </div>
                      <span className={`text-xs ${d.hoje ? 'font-bold text-marinho dark:text-bege' : 'text-texto/45 dark:text-bege/45'}`}>{d.rotulo}</span>
                    </div>
                  )
                })}
              </div>
              <dl className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-marinho/[0.07] dark:border-bege/[0.08] text-center">
                <Numero valor={leitura.paginasSemana} rotulo="páginas" />
                <Numero valor={leitura.semana.filter((d) => d.paginas > 0).length} rotulo="dias com leitura" />
                <Numero valor={leitura.minutosSemana} rotulo="min de leitura" />
              </dl>
            </>
          ) : (
            <div className="mt-4"><MapaAtividade porDia={leitura.porDia} /></div>
          )}
        </section>
      </>
    ),
    metas: (
      <>
        {/* Metas, com o progresso de verdade */}
        <CartaoMetas metas={metas} leitura={leitura} livro={livro} onAbrir={() => onIr('metas')} />
      </>
    ),
    grupo: (
      <>
        {/* Grupo */}
        <section className="cartao p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="titulo-secao">O grupo neste livro</h2>
            <button onClick={() => onIr('panorama')} className="botao-texto">Ver panorama</button>
          </div>
          {progresso === null && <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="esqueleto h-10" />)}</div>}
          {progresso && progresso.length > 0 && <p className="legenda -mt-2 mb-4">{leramHoje.size} {leramHoje.size === 1 ? 'pessoa leu' : 'pessoas leram'} hoje</p>}
          {progresso?.length === 0 && <p className="legenda">Ninguém registrou leitura ainda. As primeiras páginas podem ser as suas.</p>}
          <ul className="space-y-4">
            {progresso?.map((p) => {
              const pctMembro = Math.min(100, Math.round((p.paginas / livro.paginas_totais) * 100))
              const souEu = p.membro_id === perfil.id
              return (
                <li key={p.membro_id} className="flex items-center gap-3">
                  <span className="relative">
                    <Avatar nome={p.nome_exibicao} tamanho={36} destaque={pctMembro >= 100} />
                    {leramHoje.has(p.membro_id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-dourado border-2 border-folha dark:border-noite-cartao" title="Leu hoje" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className={`text-[15px] truncate ${souEu ? 'font-semibold text-marinho dark:text-bege' : 'text-texto/85 dark:text-bege/85'}`}>
                        {p.nome_exibicao}{souEu && <span className="font-normal text-texto/45 dark:text-bege/45"> (você)</span>}
                      </span>
                      <span className="ml-auto text-sm tabular text-texto/55 dark:text-bege/55 shrink-0">{pctMembro >= 100 ? 'terminou' : `${pctMembro}%`}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-marinho/[0.07] dark:bg-bege/10 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${souEu || pctMembro >= 100 ? 'barra-progresso' : 'bg-marinho/30 dark:bg-bege/30'}`} style={{ width: `${pctMembro}%` }} />
                    </div>
                    <p className="text-xs text-texto/40 dark:text-bege/40 mt-1">leu {tempoRelativo(p.ultima)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </>
    ),
    mural: (
      <>
        {/* Mural */}
        <section className="cartao p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="titulo-secao">Do mural</h2>
            <button onClick={() => onIr('notas')} className="botao-texto">Ver anotações</button>
          </div>
          {mural.length === 0 ? (
            <p className="legenda">Quando alguém puser um trecho, reflexão, pergunta ou aplicação no mural, aparece aqui.</p>
          ) : (
            <ul className="space-y-4">
              {mural.map((n) => (
                <li key={n.id} className="border-l-2 border-dourado/50 pl-3.5">
                  <p className={`texto-nota text-[15px] text-marinho dark:text-bege line-clamp-3 ${n.tipo === 'trecho' ? 'font-serif italic text-[17px]' : ''}`}>
                    {n.tipo === 'pergunta' && <span className="text-dourado-escuro dark:text-dourado font-semibold not-italic">Pergunta: </span>}
                    {n.tipo === 'aplicacao' && <span className="text-dourado-escuro dark:text-dourado font-semibold not-italic">Para aplicar: </span>}
                    {n.texto}
                  </p>
                  <p className="text-xs text-texto/45 dark:text-bege/45 mt-1">
                    {n.nome}{n.pagina ? `, p. ${n.pagina}` : ''}, {tempoRelativo(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    ),
    atalhos: (
      <>
        {/* Próximas leituras e encontro */}
        <section className="grid grid-cols-2 gap-3">
          <button onClick={() => onIr('indicacoes')} className="cartao p-4 text-left flex flex-col items-start justify-start hover:border-dourado/50 transition-colors">
            <Icone nome="estante" className="w-5 h-5 text-dourado" />
            <p className="font-semibold text-marinho dark:text-bege mt-2">Próximas leituras</p>
            <p className="text-xs text-texto/55 dark:text-bege/55 mt-0.5">Indique um livro para o clube</p>
          </button>
          <button onClick={() => onIr('encontro')} className="cartao p-4 text-left flex flex-col items-start justify-start hover:border-dourado/50 transition-colors">
            <Icone nome="calendario" className="w-5 h-5 text-dourado" />
            <p className="font-semibold text-marinho dark:text-bege mt-2">Encontro</p>
            <p className="text-xs text-texto/55 dark:text-bege/55 mt-0.5">Roteiro e perguntas</p>
          </button>
        </section>
      </>
    )
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="px-5 pt-5 max-w-md mx-auto flex items-center justify-between">
        <Logo versao="horizontal" className="h-9" />
        <button
          onClick={() => onIr('perfil')}
          aria-label="Abrir seu perfil"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dourado"
        >
          <Avatar nome={perfil.nome_exibicao} tamanho={40} />
        </button>
      </div>
      <header className="px-5 pt-5 pb-5 max-w-md mx-auto">
        <p className="text-sm text-texto/55 dark:text-bege/55 first-letter:uppercase">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="font-serif text-[30px] leading-tight text-marinho dark:text-bege">
          {saudacao()}, {perfil.nome_exibicao}
        </h1>
      </header>

      <main className="px-5 space-y-5 max-w-md mx-auto">
        {aniversariantes.length > 0 && (
          <section className="cartao px-4 py-3.5 flex items-start gap-3 border-dourado/40">
            <span className="w-9 h-9 rounded-full bg-dourado/15 text-dourado-escuro dark:text-dourado flex items-center justify-center shrink-0">
              <Icone nome="bolo" />
            </span>
            <div className="text-[15px] text-marinho dark:text-bege space-y-1">
              {aniversariantes.filter((a) => a.dias === 0).length > 0 && (
                <p>Hoje é aniversário de <span className="font-semibold">{aniversariantes.filter((a) => a.dias === 0).map((a) => a.nome).join(' e ')}</span>. Manda um abraço no grupo.</p>
              )}
              {aniversariantes.filter((a) => a.dias > 0).map((a) => (
                <p key={a.nome} className="text-sm text-texto/70 dark:text-bege/70">
                  <span className="font-semibold text-marinho dark:text-bege">{a.nome}</span> faz aniversário {a.dias === 1 ? 'amanhã' : `${/sábado|domingo/.test(a.data) ? 'no' : 'na'} ${a.data.split(',')[0]}`}, {a.data.split(', ')[1]}.
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Livro do ciclo, com a fita marcadora mostrando o progresso */}
        <section className="relative overflow-hidden rounded-3xl bg-marinho text-bege dark:bg-noite-cartao dark:ring-1 dark:ring-dourado/20">
          <div className="absolute top-0 right-7 w-6 fita animate-fita-desce shadow-md" style={{ height: `${Math.max(10, pct)}%` }} aria-hidden="true" />
          <div className="p-5 pr-16">
            <div className="flex gap-4">
              {livro.capa_url ? (
                <img src={livro.capa_url} alt="" className="w-[68px] h-[102px] object-cover rounded shadow-lg shadow-black/30 shrink-0" />
              ) : (
                <div className="w-[68px] h-[102px] rounded border border-dourado/40 flex items-center justify-center shrink-0">
                  <Logo versao="simbolo" sempre="branco" className="h-[70px]" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-dourado">Leitura do ciclo</p>
                <h2 className="font-serif text-[22px] leading-snug">{livro.titulo}</h2>
                {livro.autor && <p className="text-sm text-bege/65 mt-0.5">{livro.autor}</p>}
              </div>
            </div>
            <div className="mt-6 flex items-end gap-3">
              {leitura.carregando ? (
                <div className="h-16 w-28 rounded-lg bg-bege/10 animate-pulse" />
              ) : (
                <>
                  <p className="font-serif tabular text-[64px] leading-[0.85] text-bege">
                    {pct}<span className="text-3xl text-dourado align-top ml-0.5">%</span>
                  </p>
                  <p className="text-sm text-bege/65 pb-1.5 leading-snug">
                    página {leitura.paginasLivro}<br />de {livro.paginas_totais}
                  </p>
                </>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-3 border-t border-bege/10">
            <Dado valor={restantes === null ? '—' : String(restantes)} rotulo={restantes === null ? 'sem data de fim' : restantes === 1 ? 'dia restante' : 'dias restantes'} />
            <Dado
              valor={pct >= 100 ? '✓' : ritmoNecessario === null ? '—' : String(ritmoNecessario)}
              rotulo={pct >= 100 ? 'livro concluído' : 'páginas por dia'}
              meio
            />
            <Dado
              valor={pct >= 100 ? '—' : leitura.previsao ? formatarData(chaveDia(leitura.previsao.data)) : '—'}
              rotulo={leitura.previsao ? 'no seu ritmo' : 'previsão'}
            />
          </dl>
          <div className="flex gap-2 p-4 pt-0">
            <button
              onClick={() => onIr('registrar')}
              className="flex-1 rounded-xl bg-dourado text-marinho font-semibold py-3 hover:bg-dourado/90 active:scale-[0.985] transition-all
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bege"
            >
              Registrar leitura
            </button>
            <button
              onClick={() => onIr('compartilhar', { modo: 'leitura' })}
              aria-label="Compartilhar minha leitura"
              title="Criar imagem da sua leitura para as redes"
              className="w-12 rounded-xl border border-bege/25 text-bege flex items-center justify-center hover:bg-bege/10 transition-colors
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bege"
            >
              <Icone nome="compartilhar" />
            </button>
          </div>
        </section>

        {contagem && novaConquista && (
          <section className="cartao p-4 flex items-center gap-3 border-dourado/60 bg-dourado/[0.08] animate-subir-suave">
            <span className="w-11 h-11 rounded-full bg-dourado text-marinho flex items-center justify-center shrink-0">
              <Icone nome={ICONE_CONQUISTA[novaConquista.icone ?? ''] ?? 'check'} className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-dourado-escuro dark:text-dourado">Nova conquista</p>
              <p className="font-semibold text-marinho dark:text-bege">{novaConquista.nome}</p>
              {novaConquista.descricao && <p className="text-xs text-texto/60 dark:text-bege/60">{novaConquista.descricao}</p>}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => { marcarConquistaVista(); onIr('perfil') }} className="rounded-lg bg-marinho dark:bg-dourado text-bege dark:text-noite px-3 py-1.5 text-sm font-semibold">Ver</button>
              <button onClick={marcarConquistaVista} className="text-xs text-texto/50 dark:text-bege/50">Fechar</button>
            </div>
          </section>
        )}

        {/* Marcos: sugere uma imagem quando algo especial acontece */}
        {!leitura.carregando && pct >= 100 && (
          <Marco icone="livro" titulo="Você terminou o livro" texto="Registre esse momento com uma imagem para o grupo." acao="Criar imagem"
            onClick={() => onIr('compartilhar', { modo: 'leitura', modeloLeitura: 'terminei' })} />
        )}
        {contagem && !leitura.carregando && pct < 100 && leitura.seq.leuHoje && MARCOS.includes(leitura.seq.dias) && (
          <Marco icone="chama" titulo={`${leitura.seq.dias} dias seguidos de leitura`} texto="Constância vale mais que velocidade. Quer compartilhar?" acao="Criar imagem"
            onClick={() => onIr('compartilhar', { modo: 'leitura', modeloLeitura: 'constancia' })} />
        )}

        {!leitura.carregando && pct >= 50 && !temAplicacao && (
          <Marco icone="alvo" titulo="Ler, examinar, dialogar, aplicar" texto="O que desta leitura você quer levar para a vida? Anote uma aplicação concreta." acao="Anotar aplicação"
            onClick={() => onIr('aplicar')} />
        )}

        {pendentes.length > 0 && onContinuarPendente && (
          <section className="cartao p-4" aria-label="Leituras pendentes">
            <p className="text-sm font-semibold text-dourado-escuro dark:text-dourado">{pendentes.length === 1 ? 'Leitura pendente' : 'Leituras pendentes'}</p>
            <p className="text-xs text-texto/55 dark:text-bege/55">De ciclos já encerrados. Continue no seu ritmo, sem pressa.</p>
            <ul className="mt-3 space-y-3">
              {pendentes.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  {p.capa_url
                    ? <img src={p.capa_url} alt="" className="w-9 h-[52px] object-cover rounded shadow-sm shrink-0" />
                    : <span className="w-9 h-[52px] rounded border border-dourado/40 flex items-center justify-center text-dourado shrink-0"><Icone nome="livro" className="w-4 h-4" /></span>}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[16px] leading-snug text-marinho dark:text-bege truncate">{p.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex-1 h-1.5 rounded-full bg-marinho/[0.08] dark:bg-bege/[0.1] overflow-hidden"><span className="block h-full bg-dourado rounded-full" style={{ width: `${p.pct}%` }} /></span>
                      <span className="text-xs tabular text-texto/55 dark:text-bege/55">{p.pct}%</span>
                    </div>
                  </div>
                  <button onClick={() => onContinuarPendente(p.id)} className="chip shrink-0">Continuar</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {verInstalar && (
          <InstalarApp compacto onFechar={() => { setVerInstalar(false); try { localStorage.setItem('bereanos-streak-instalar-dispensado', '1') } catch { /* ok */ } }} />
        )}

        {layout.ordem.filter((id) => !layout.ocultos.includes(id)).map((id) => <Fragment key={id}>{blocos[id]}</Fragment>)}

        <button onClick={() => setPersonalizando(true)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-texto/55 dark:text-bege/55 hover:text-dourado-escuro dark:hover:text-dourado">
          <Icone nome="engrenagem" className="w-4 h-4" /> Personalizar o Início
        </button>
        {personalizando && <PersonalizarInicio layout={layout} onMudar={salvarLayout} onFechar={() => setPersonalizando(false)} />}

        <p className="text-center font-serif italic text-[15px] text-texto/45 dark:text-bege/40 pt-2 pb-2">
          Ler. Examinar. Dialogar. Aplicar.
        </p>
      </main>
    </div>
  )
}

interface MetaResumo {
  id: string
  tipo: 'semanal' | 'mensal' | 'livro_total' | 'sessoes_semanais' | 'dias_semanais'
  valor_paginas: number | null
  valor_sessoes: number | null
  valor_dias: number | null
  periodo_inicio: string | null
  periodo_fim: string | null
}

const NOME_META: Record<MetaResumo['tipo'], string> = {
  semanal: 'Páginas na semana',
  mensal: 'Páginas no mês',
  livro_total: 'Terminar o livro',
  sessoes_semanais: 'Sessões de foco na semana',
  dias_semanais: 'Dias de leitura na semana'
}

function CartaoMetas({ metas, leitura, livro, onAbrir }: {
  metas: MetaResumo[] | null
  leitura: ReturnType<typeof useMinhaLeitura>
  livro: LivroAtivo
  onAbrir: () => void
}) {
  const hoje = chaveDia(new Date())
  // só metas do período atual
  const ativas = (metas ?? []).filter((m) => !m.periodo_fim || m.periodo_fim >= hoje)
  function progresso(m: MetaResumo): [number, number] {
    const ini = m.periodo_inicio ?? '0000'
    const fim = m.periodo_fim ?? '9999'
    const dentro = (iso: string) => { const k = chaveDia(iso); return k >= ini && k <= fim }
    const ritmo = leitura.ritmo
    if (m.tipo === 'sessoes_semanais') return [leitura.sessoes.filter((x) => dentro(x.fim)).length, m.valor_sessoes ?? 0]
    if (m.tipo === 'dias_semanais') return [new Set(leitura.doLivro.filter((r) => dentro(r.registrado_em)).map((r) => chaveDia(r.registrado_em))).size, m.valor_dias ?? 0]
    if (m.tipo === 'livro_total') return [leitura.paginasLivro, livro.paginas_totais]
    const soma = leitura.doLivro.filter((r) => dentro(r.registrado_em)).reduce((a, r) => a + paginasEquivalentes(r, ritmo), 0)
    return [Math.round(soma), m.valor_paginas ?? 0]
  }
  return (
    <section className="cartao p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="titulo-secao">Metas</h2>
        <button onClick={onAbrir} className="botao-texto">{ativas.length ? 'Ver todas' : 'Criar meta'}</button>
      </div>
      {metas === null ? (
        <div className="esqueleto h-10" />
      ) : ativas.length === 0 ? (
        <p className="legenda">Uma meta pequena e realista ajuda mais do que uma ambiciosa. Que tal uma meta de páginas na semana?</p>
      ) : (
        <ul className="space-y-3.5">
          {ativas.slice(0, 3).map((m) => {
            const [atual, alvo] = progresso(m)
            const p = alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : 0
            return (
              <li key={m.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-marinho dark:text-bege">{NOME_META[m.tipo]}</span>
                  <span className={`tabular ${p >= 100 ? 'font-semibold text-dourado-escuro dark:text-dourado' : 'text-texto/55 dark:text-bege/55'}`}>
                    {p >= 100 ? 'batida' : `${atual} de ${alvo}`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-marinho/[0.07] dark:bg-bege/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${p >= 100 ? 'barra-progresso' : 'bg-dourado/60'}`} style={{ width: `${p}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const MARCOS = [3, 7, 14, 21, 30, 40, 50, 75, 100]

function Marco({ icone, titulo, texto, acao, onClick }: { icone: NomeIcone; titulo: string; texto: string; acao: string; onClick: () => void }) {
  return (
    <section className="cartao p-4 flex items-center gap-3 border-dourado/50 bg-dourado/[0.06] animate-subir-suave">
      <span className="w-10 h-10 rounded-full bg-dourado text-marinho flex items-center justify-center shrink-0">
        <Icone nome={icone} className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-marinho dark:text-bege">{titulo}</p>
        <p className="text-xs text-texto/60 dark:text-bege/60">{texto}</p>
      </div>
      <button onClick={onClick} className="rounded-lg bg-marinho dark:bg-dourado text-bege dark:text-noite px-3 py-2 text-sm font-semibold shrink-0">{acao}</button>
    </section>
  )
}

function Dado({ valor, rotulo, meio = false }: { valor: string; rotulo: string; meio?: boolean }) {
  return (
    <div className={`px-3 py-3.5 text-center ${meio ? 'border-x border-bege/10' : ''}`}>
      <dd className={`font-serif tabular text-bege leading-none whitespace-nowrap ${valor.length > 5 ? 'text-[19px] pt-[3px] pb-[2px]' : 'text-2xl'}`}>{valor}</dd>
      <dt className="text-xs text-bege/55 mt-1.5">{rotulo}</dt>
    </div>
  )
}

function Numero({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div>
      <dd className="font-serif tabular text-2xl text-marinho dark:text-bege leading-none">{valor}</dd>
      <dt className="text-xs text-texto/50 dark:text-bege/50 mt-1">{rotulo}</dt>
    </div>
  )
}

function AnelMeta({ pct, paginas }: { pct: number; paginas: number }) {
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-marinho/[0.07] dark:stroke-bege/10" />
        <circle
          cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round" stroke="#B8912F"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {pct >= 1 ? (
          <Icone nome="check" className="w-8 h-8 text-dourado" traco={2.4} />
        ) : (
          <>
            <span className="font-serif tabular text-[28px] leading-none text-marinho dark:text-bege">{paginas}</span>
            <span className="text-[10px] text-texto/50 dark:text-bege/50">páginas</span>
          </>
        )}
      </div>
    </div>
  )
}

function CartaoEncontro({ em, local, perguntas, onPerguntas, onAbrir }: { em: string; local: string | null; perguntas: number; onPerguntas: () => void; onAbrir: () => void }) {
  const data = new Date(em)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dia = new Date(data)
  dia.setHours(0, 0, 0, 0)
  const dias = Math.round((dia.getTime() - hoje.getTime()) / 86_400_000)
  if (dias < 0) return null
  const quando = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`
  return (
    <section className="cartao p-4 flex items-center gap-4 border-dourado/40">
      <div className="w-14 h-16 rounded-xl bg-marinho text-bege dark:bg-dourado dark:text-noite flex flex-col items-center justify-center shrink-0">
        <span className="text-[11px] uppercase tracking-wide opacity-80">{data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
        <span className="font-serif text-2xl leading-none">{data.getDate()}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-dourado-escuro dark:text-dourado">{quando}: próximo encontro</p>
        <p className="text-[15px] text-marinho dark:text-bege first-letter:uppercase">
          {data.toLocaleDateString('pt-BR', { weekday: 'long' })}, às {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {local && <p className="text-sm text-texto/55 dark:text-bege/55 truncate">{local}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          <button onClick={onPerguntas} className="botao-texto text-sm">
            {perguntas > 0 ? `${perguntas} ${perguntas === 1 ? 'pergunta' : 'perguntas'} do grupo` : 'Deixar uma pergunta'}
          </button>
          <button onClick={onAbrir} className="botao-texto text-sm">Roteiro e agenda</button>
        </div>
      </div>
    </section>
  )
}

const LETRAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function MapaAtividade({ porDia }: { porDia: Map<string, number> }) {
  const grade = gradeSemanas(15)
  const hoje = chaveDia(new Date())
  function nivel(p: number) {
    if (p <= 0) return 'bg-marinho/[0.06] dark:bg-bege/[0.07]'
    if (p < 6) return 'bg-dourado/30'
    if (p < 16) return 'bg-dourado/55'
    if (p < 31) return 'bg-dourado/80'
    return 'bg-dourado-escuro dark:bg-dourado'
  }
  return (
    <div>
      <div className="grid grid-rows-7 grid-flow-col gap-1" style={{ gridTemplateColumns: 'auto repeat(15, minmax(0, 1fr))' }}>
        {LETRAS.map((l, i) => (
          <span key={'l' + i} className="pr-1 text-[10px] text-texto/40 dark:text-bege/40 flex items-center">{i % 2 === 1 ? l : ''}</span>
        ))}
        {grade.flat().map((dia) => {
          const k = chaveDia(dia)
          const futuro = k > hoje
          const p = porDia.get(k) ?? 0
          return (
            <span
              key={k}
              title={futuro ? '' : `${formatarData(k)}: ${Math.round(p)} páginas`}
              className={`aspect-square rounded-[4px] ${futuro ? 'opacity-0' : nivel(p)} ${k === hoje ? 'ring-1 ring-marinho/50 dark:ring-bege/60' : ''}`}
            />
          )
        })}
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-3 text-[11px] text-texto/40 dark:text-bege/40">
        <span>menos</span>
        {[0, 3, 10, 20, 40].map((v) => <span key={v} className={`w-3 h-3 rounded-[3px] ${nivel(v)}`} />)}
        <span>mais</span>
      </div>
    </div>
  )
}

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora < 5) return 'Boa noite'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

function RitmoCiclo({ leitura, livro }: { leitura: ReturnType<typeof useMinhaLeitura>; livro: LivroAtivo }) {
  const { pontos, diferenca } = useMemo(() => serieRitmo(leitura.doLivro, leitura.ritmo, livro), [leitura.doLivro, leitura.ritmo, livro])
  if (leitura.doLivro.length === 0) {
    const semana = planoCiclo(livro)?.find((s) => s.atual)
    return (
      <div className="mt-4 space-y-2">
        <p className="legenda">Registre a primeira leitura deste livro e a curva do ciclo começa a aparecer aqui.</p>
        {semana && <p className="text-sm text-texto/65 dark:text-bege/65">Plano do ciclo, semana {semana.n}: chegar à página <span className="font-semibold text-marinho dark:text-bege">{semana.ate}</span> até {formatarData(semana.fim)}. É um norte, não uma cobrança.</p>}
      </div>
    )
  }
  const frase = leitura.paginasLivro >= livro.paginas_totais ? 'Livro concluído. A linha mostra o caminho até aqui.'
    : diferenca === null ? 'O ciclo ainda não tem data de término. Quando a moderação definir, aparece a linha do ritmo ideal para comparar.'
    : Math.abs(diferenca) <= 2 ? 'Você está no ritmo do ciclo.'
    : diferenca > 0 ? `${diferenca} ${diferenca === 1 ? 'página' : 'páginas'} adiante do ritmo do ciclo.`
    : `${-diferenca} ${diferenca === -1 ? 'página' : 'páginas'} atrás do ritmo. Sem pressa: cada página conta.`
  return (
    <div className="mt-4">
      <GraficoRitmo pontos={pontos} total={livro.paginas_totais} />
      <div className="flex items-center gap-4 mt-2 text-xs text-texto/55 dark:text-bege/55">
        <span className="flex items-center gap-1.5"><span className="w-4 h-[3px] rounded bg-dourado" />Sua leitura</span>
        {livro.ciclo_fim && <span className="flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed border-marinho/45 dark:border-bege/45" />Ritmo do ciclo</span>}
      </div>
      {frase && <p className="text-[15px] text-marinho dark:text-bege mt-3 pt-3 border-t border-marinho/[0.07] dark:border-bege/[0.08]">{frase}</p>}
      {(() => {
        const semana = planoCiclo(livro)?.find((s) => s.atual)
        if (!semana || leitura.paginasLivro >= livro.paginas_totais) return null
        return (
          <p className="text-sm text-texto/65 dark:text-bege/65 mt-2">
            Plano do ciclo, semana {semana.n}: chegar à página <span className="font-semibold text-marinho dark:text-bege">{semana.ate}</span> até {formatarData(semana.fim)}. É um norte, não uma cobrança.
          </p>
        )
      })()}
    </div>
  )
}
