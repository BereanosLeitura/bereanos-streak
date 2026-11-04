import { useEffect, useMemo, useState } from 'react'
import { tempoManual } from '../lib/tempo'
import { supabase, type Perfil } from '../lib/supabase'
import { apagarComDesfazer, useAviso } from '../components/Toast'
import Icone, { type NomeIcone } from '../components/Icone'
import Avatar from '../components/Avatar'
import { chaveDia, formatarData, paginasEquivalentes, tempoRelativo } from '../lib/estatisticas'
import { apagarRegistroLeitura } from '../lib/sync'
import { useContagem } from '../lib/preferencias'
import { abrirRelatorioCiclo } from '../lib/relatorio'
import { MapaDoLivro } from '../components/Graficos'
import { baixarTexto } from '../lib/exportar'
import { calcularRetrospectiva, type Retrospectiva } from '../lib/infograficos'

// Memória de um livro da Estante: o que você leu, quando, suas anotações,
// o mural do grupo naquele ciclo e o histórico de registros. Somente leitura.
// Nada é apagado quando o admin conclui o ciclo: tudo fica aqui.

type Tipo = 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'
type Aba = 'minhas' | 'mural' | 'historico'

interface Livro {
  id: string; titulo: string; autor: string | null; capa_url: string | null; paginas_totais: number
  ciclo_inicio: string | null; ciclo_fim: string | null; status: 'ativo' | 'concluido'
}
interface Registro { id: string; membro_id: string; origem: 'manual' | 'pomodoro'; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string; perfis: { nome_exibicao: string; ritmo_leitura_min_por_pagina: number } | null }
interface Nota { id: string; membro_id: string; tipo: Tipo; texto: string; pagina: number | null; compartilhada: boolean; favorita: boolean; created_at: string; referencia: string | null; perfis: { nome_exibicao: string } | null }

const TIPO: Record<Tipo, { rotulo: string; plural: string; icone: NomeIcone }> = {
  trecho: { rotulo: 'Trecho', plural: 'Trechos', icone: 'aspas' },
  reflexao: { rotulo: 'Reflexão', plural: 'Reflexões', icone: 'lampada' },
  pergunta: { rotulo: 'Pergunta', plural: 'Perguntas', icone: 'interrogacao' },
  aplicacao: { rotulo: 'Aplicação', plural: 'Aplicações', icone: 'alvo' }
}

export interface LivroDaEstante extends Livro {}

interface Props {
  perfil: Perfil
  livroId: string
  onVoltar: () => void
  onCompartilhar: (livro: LivroDaEstante, n: { tipo: Tipo; texto: string; pagina: number | null; autor: string }) => void
  onCompartilharRetrospectiva: (livro: LivroDaEstante) => void
  onAbrirEncontro: (livro: LivroDaEstante) => void
}

export default function LivroDetalhe({ perfil, livroId, onVoltar, onCompartilhar, onCompartilharRetrospectiva, onAbrirEncontro }: Props) {
  const [livro, setLivro] = useState<Livro | null>(null)
  const [registros, setRegistros] = useState<Registro[] | null>(null)
  const [notas, setNotas] = useState<Nota[]>([])
  const [sessoes, setSessoes] = useState<{ duracao_minutos: number | null }[]>([])
  const [conquistas, setConquistas] = useState<{ nome: string }[]>([])
  const [aba, setAba] = useState<Aba>('minhas')
  const contagem = useContagem()
  const [retro, setRetro] = useState<Retrospectiva | null>(null)
  const [destaques, setDestaques] = useState<Set<string>>(new Set())
  const [mapaDe, setMapaDe] = useState<'eu' | 'grupo'>('eu')
  const avisar = useAviso()

  useEffect(() => {
    ;(async () => {
      const [l, r, n, s, c] = await Promise.all([
        supabase.from('livros').select('id, titulo, autor, capa_url, paginas_totais, ciclo_inicio, ciclo_fim, status').eq('id', livroId).single(),
        supabase.from('registros_leitura').select('id, membro_id, origem, paginas_lidas, minutos_lidos, registrado_em, perfis(nome_exibicao, ritmo_leitura_min_por_pagina)')
          .eq('livro_id', livroId).order('registrado_em', { ascending: false }),
        supabase.from('anotacoes').select('id, membro_id, tipo, texto, pagina, referencia, compartilhada, favorita, created_at, perfis(nome_exibicao)')
          .eq('livro_id', livroId).order('pagina', { ascending: true, nullsFirst: false }),
        supabase.from('sessoes_pomodoro').select('duracao_minutos').eq('livro_id', livroId).eq('membro_id', perfil.id).eq('status', 'concluida'),
        supabase.from('membro_conquistas').select('conquistas(nome)').eq('membro_id', perfil.id).eq('livro_id', livroId)
      ])
      setLivro(l.data as Livro)
      if (l.data) atualizarRetro(l.data as Livro)
      supabase.from('destaques').select('anotacao_id').then(({ data }) => setDestaques(new Set((data ?? []).map((d) => d.anotacao_id))))
      setRegistros((r.data ?? []) as unknown as Registro[])
      setNotas((n.data ?? []) as unknown as Nota[])
      const manual = await tempoManual(perfil.id, { livroId })
      setSessoes([...(s.data ?? []), ...(manual ? [{ duracao_minutos: manual }] : [])])
      setConquistas(((c.data ?? []) as any[]).map((x) => x.conquistas).filter(Boolean))
    })()
  }, [livroId])

  const ritmo = perfil.ritmo_leitura_min_por_pagina || 2
  const dados = useMemo(() => {
    const lista = registros ?? []
    const meus = lista.filter((r) => r.membro_id === perfil.id)
    const paginas = Math.round(meus.reduce((a, r) => a + paginasEquivalentes(r, ritmo), 0))
    const dias = new Set(meus.map((r) => chaveDia(r.registrado_em)))
    const ordenados = [...meus].sort((a, b) => a.registrado_em.localeCompare(b.registrado_em))
    // grupo: quanto cada um leu deste livro
    const porMembro = new Map<string, number>()
    for (const r of lista) porMembro.set(r.membro_id, (porMembro.get(r.membro_id) ?? 0) + paginasEquivalentes(r, r.perfis?.ritmo_leitura_min_por_pagina ?? 2))
    return {
      meus,
      paginas,
      dias: dias.size,
      primeiro: ordenados[0]?.registrado_em ?? null,
      ultimo: ordenados[ordenados.length - 1]?.registrado_em ?? null,
      leitores: porMembro.size,
      terminaram: livro ? [...porMembro.values()].filter((p) => p >= livro.paginas_totais).length : 0
    }
  }, [registros, livro, perfil.id, ritmo])

  const minhas = notas.filter((n) => n.membro_id === perfil.id)
  const mural = notas.filter((n) => n.compartilhada)
  const minutos = sessoes.reduce((a, s) => a + (s.duracao_minutos ?? 0), 0)

  const [confirmandoReg, setConfirmandoReg] = useState<string | null>(null)

  function atualizarRetro(l: Livro | null = livro) {
    if (l) calcularRetrospectiva(perfil.id, perfil.ritmo_leitura_min_por_pagina || 2, l).then(setRetro).catch(() => setRetro(null))
  }

  function apagarNota(n: Nota) {
    const antes = notas
    apagarComDesfazer({
      avisar, texto: n.membro_id === perfil.id ? 'Anotação apagada' : 'Anotação retirada do mural',
      esconder: () => setNotas((l) => l.filter((x) => x.id !== n.id)),
      restaurar: () => setNotas(antes),
      apagar: async () => { const ok = !(await supabase.from('anotacoes').delete().eq('id', n.id)).error; if (ok) atualizarRetro(); return ok }
    })
  }

  function apagarRegistro(id: string) {
    setConfirmandoReg(null)
    const antes = registros
    apagarComDesfazer({
      avisar, texto: 'Registro apagado',
      esconder: () => setRegistros((l) => (l ?? []).filter((x) => x.id !== id)),
      restaurar: () => setRegistros(antes),
      apagar: async () => { const ok = await apagarRegistroLeitura(id); if (ok) atualizarRetro(); return ok }
    })
  }

  function textoMinhas() {
    if (!livro) return ''
    const linhas = [`${livro.titulo}${livro.autor ? `, ${livro.autor}` : ''}`, `Anotações de ${perfil.nome_exibicao}`]
    for (const t of ['pergunta', 'trecho', 'reflexao', 'aplicacao'] as Tipo[]) {
      const l = minhas.filter((n) => n.tipo === t)
      if (l.length) linhas.push('', `${TIPO[t].plural}:`, ...l.map((n) => `- ${n.pagina ? `(p. ${n.pagina}) ` : ''}${n.tipo === 'trecho' ? `“${n.texto}”` : n.texto}${n.referencia ? ` [${n.referencia}]` : ''}`))
    }
    return linhas.join('\n')
  }

  async function copiarMinhas() {
    if (!livro || minhas.length === 0) return
    try {
      await navigator.clipboard.writeText(textoMinhas())
      avisar('Anotações copiadas')
    } catch {
      avisar('Não foi possível copiar', 'erro')
    }
  }

  if (!livro || registros === null) {
    return (
      <div className="min-h-screen px-5 pt-6 pb-28 max-w-md mx-auto space-y-4">
        <div className="esqueleto h-8 w-24" />
        <div className="esqueleto h-40" />
        <div className="esqueleto h-24" />
      </div>
    )
  }

  const pct = Math.min(100, Math.round((dados.paginas / livro.paginas_totais) * 100))

  return (
    <div className="min-h-screen px-5 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1">
          <Icone nome="seta-esquerda" className="w-4 h-4" /> Perfil
        </button>

        <header className="flex gap-4 mt-4">
          {livro.capa_url
            ? <img src={livro.capa_url} alt="" className="w-20 h-[120px] object-cover rounded shadow-lg shrink-0" />
            : <div className="w-20 h-[120px] rounded border border-dourado/40 flex items-center justify-center shrink-0"><Icone nome="livro" className="w-7 h-7 text-dourado" /></div>}
          <div className="min-w-0">
            <span className={`selo ${livro.status === 'ativo' ? '' : 'opacity-80'}`}>{livro.status === 'ativo' ? 'Leitura atual' : 'Ciclo concluído'}</span>
            <h1 className="font-serif text-[26px] leading-tight text-marinho dark:text-bege mt-2">{livro.titulo}</h1>
            {livro.autor && <p className="legenda">{livro.autor}</p>}
            {(livro.ciclo_inicio || livro.ciclo_fim) && (
              <p className="text-xs text-texto/50 dark:text-bege/50 mt-1">
                Ciclo {livro.ciclo_inicio ? `de ${formatarData(livro.ciclo_inicio)} ` : ''}{livro.ciclo_fim ? `até ${formatarData(livro.ciclo_fim)}` : ''}
              </p>
            )}
          </div>
        </header>

        {/* seus números neste livro */}
        <section className="cartao p-5 mt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="titulo-secao">Sua leitura</h2>
            <span className="font-serif tabular text-2xl text-dourado-escuro dark:text-dourado">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-marinho/[0.07] dark:bg-bege/10 overflow-hidden mt-2">
            <div className="h-full barra-progresso rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <dl className="grid grid-cols-4 gap-2 text-center mt-4">
            <Num v={Math.min(dados.paginas, livro.paginas_totais)} r="páginas" />
            <Num v={dados.dias} r="dias" />
            <Num v={minutos} r="min de leitura" />
            <Num v={minhas.length} r="anotações" />
          </dl>
          {dados.primeiro && (
            <p className="text-xs text-texto/50 dark:text-bege/50 mt-4 text-center">
              {chaveDia(dados.primeiro) === chaveDia(dados.ultimo!)
                ? `Você leu em ${formatarData(dados.primeiro)}.`
                : `Você leu de ${formatarData(dados.primeiro)} a ${formatarData(dados.ultimo!)}.`}
              {' '}O grupo teve {dados.leitores} {dados.leitores === 1 ? 'leitor' : 'leitores'}{dados.terminaram ? `, ${dados.terminaram} terminaram` : ''}.
            </p>
          )}
          {contagem && conquistas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {conquistas.map((c, i) => <span key={i} className="selo">{c.nome}</span>)}
            </div>
          )}
        </section>

        {/* retrospectiva */}
        {retro && retro.dias > 0 && (
          <section className="cartao p-5 mt-4 bg-marinho dark:bg-noite-cartao text-bege border-transparent">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl">Retrospectiva</h2>
              <span className="text-xs text-bege/60">{retro.inicio && retro.fim && chaveDia(retro.inicio) !== chaveDia(retro.fim) ? `${formatarData(retro.inicio)} a ${formatarData(retro.fim)}` : retro.inicio ? formatarData(retro.inicio) : ''}</span>
            </div>
            <ul className="mt-4 space-y-3 text-[15px]">
              {contagem && <Destaque icone="chama" texto={`${retro.maiorSequencia} ${retro.maiorSequencia === 1 ? 'dia seguido' : 'dias seguidos'} foi sua maior sequência neste livro.`} />}
              {retro.melhorDia && <Destaque icone="alvo" texto={`Seu melhor dia foi ${formatarData(retro.melhorDia.data, { day: 'numeric', month: 'long' })}, com ${retro.melhorDia.paginas} ${retro.melhorDia.paginas === 1 ? 'página' : 'páginas'}.`} />}
              {retro.horarioPreferido && <Destaque icone="relogio" texto={`Você leu mais ${retro.horarioPreferido}.`} />}
              {retro.minutos > 0 && <Destaque icone="relogio" texto={`${retro.minutos >= 60 ? `${String(Math.round(retro.minutos / 6) / 10).replace('.', ',')} horas` : `${retro.minutos} minutos`} de leitura${retro.sessoes ? `, com ${retro.sessoes} ${retro.sessoes === 1 ? 'sessão' : 'sessões'} de foco` : ''}.`} />}
              {retro.anotacoes.trecho + retro.anotacoes.reflexao + retro.anotacoes.pergunta + retro.anotacoes.aplicacao > 0 && (
                <Destaque icone="nota" texto={'Você anotou ' + [
                  retro.anotacoes.trecho && `${retro.anotacoes.trecho} ${retro.anotacoes.trecho === 1 ? 'trecho' : 'trechos'}`,
                  retro.anotacoes.reflexao && `${retro.anotacoes.reflexao} ${retro.anotacoes.reflexao === 1 ? 'reflexão' : 'reflexões'}`,
                  retro.anotacoes.pergunta && `${retro.anotacoes.pergunta} ${retro.anotacoes.pergunta === 1 ? 'pergunta' : 'perguntas'}`,
                  retro.anotacoes.aplicacao && `${retro.anotacoes.aplicacao} ${retro.anotacoes.aplicacao === 1 ? 'aplicação' : 'aplicações'}`
                ].filter(Boolean).join(', ').replace(/, ([^,]*)$/, ' e $1') + '.'} />
              )}
            </ul>
            {retro.aplicacoes.length > 0 && (
              <div className="mt-5 pt-4 border-t border-dourado/30">
                <p className="text-xs font-semibold text-dourado mb-2">O que você decidiu aplicar</p>
                <ul className="space-y-1.5">
                  {retro.aplicacoes.map((t, i) => <li key={i} className="text-[15px] text-bege/90 flex gap-2"><Icone nome="alvo" className="w-4 h-4 text-dourado shrink-0 mt-1" />{t}</li>)}
                </ul>
              </div>
            )}
            {retro.trechoFavorito && (
              <blockquote className="font-serif italic text-[17px] leading-relaxed text-bege/90 mt-5 pt-4 border-t border-dourado/30 line-clamp-5">
                “{retro.trechoFavorito.texto.replace(/^["“”]+|["“”]+$/g, '')}”
                {retro.trechoFavorito.pagina && <span className="not-italic font-sans text-xs text-bege/55"> p. {retro.trechoFavorito.pagina}</span>}
              </blockquote>
            )}
            <button onClick={() => onCompartilharRetrospectiva(livro)} className="mt-5 w-full rounded-xl bg-dourado text-marinho font-semibold py-3 flex items-center justify-center gap-2">
              <Icone nome="compartilhar" className="w-4 h-4" /> Compartilhar retrospectiva
            </button>
          </section>
        )}

        {/* mapa do livro */}
        {notas.some((n) => n.pagina) && (
          <section className="cartao p-5 mt-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="titulo-secao">Mapa do livro</h2>
              <div className="flex rounded-full bg-marinho/[0.06] dark:bg-bege/[0.08] p-0.5 text-xs" role="tablist">
                {([['eu', 'Você'], ['grupo', 'Mural']] as const).map(([v, r]) => (
                  <button key={v} role="tab" aria-selected={mapaDe === v} onClick={() => setMapaDe(v)}
                    className={`px-2.5 py-1 rounded-full ${mapaDe === v ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege font-semibold shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>{r}</button>
                ))}
              </div>
            </div>
            <MapaDoLivro marcas={(mapaDe === 'eu' ? minhas : mural).map((n) => ({ pagina: n.pagina, tipo: n.tipo }))} total={livro.paginas_totais} />
          </section>
        )}

        {/* ações deste ciclo */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button onClick={() => onAbrirEncontro(livro)} className="cartao p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-marinho dark:text-bege">
            <Icone nome="calendario" className="w-5 h-5 text-dourado" /> Encontro
          </button>
          <button onClick={async () => { if (!(await abrirRelatorioCiclo(livro))) avisar('Permita abrir uma nova janela para ver o relatório', 'erro') }} className="cartao p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-marinho dark:text-bege">
            <Icone nome="imagem" className="w-5 h-5 text-dourado" /> Relatório (PDF)
          </button>
          <button disabled={minhas.length === 0} onClick={() => baixarTexto(`anotacoes-${livro.titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.txt`, textoMinhas())}
            className="cartao p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-marinho dark:text-bege disabled:opacity-40">
            <Icone nome="baixar" className="w-5 h-5 text-dourado" /> Baixar anotações
          </button>
        </div>

        {/* abas */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mt-5" role="tablist">
          {([['minhas', `Minhas (${minhas.length})`], ['mural', `Mural (${mural.length})`], ['historico', 'Histórico']] as [Aba, string][]).map(([a, r]) => (
            <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)}
              className={`rounded-lg py-2 text-sm font-semibold ${aba === a ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
              {r}
            </button>
          ))}
        </div>

        {aba === 'minhas' && (
          <>
            {minhas.length > 0 && (
              <button onClick={copiarMinhas} className="botao-texto mt-4 flex items-center gap-1.5"><Icone nome="copiar" className="w-4 h-4" /> Copiar todas</button>
            )}
            <ListaNotas notas={minhas} vazio="Você não fez anotações neste livro." podeApagar={() => true} onApagar={apagarNota}
              onImagem={(n) => onCompartilhar(livro, { tipo: n.tipo, texto: n.texto, pagina: n.pagina, autor: perfil.nome_exibicao })} />
          </>
        )}
        {aba === 'mural' && mural.some((n) => destaques.has(n.id)) && (
          <section className="cartao p-4 mt-4 border-dourado/45">
            <p className="text-xs font-semibold text-dourado-escuro dark:text-dourado mb-2">Destaques do clube</p>
            <ul className="space-y-2">
              {mural.filter((n) => destaques.has(n.id)).map((n) => (
                <li key={n.id} className="text-[15px] text-marinho dark:text-bege">
                  {n.tipo === 'trecho' ? <em className="font-serif">“{n.texto}”</em> : n.texto}
                  <span className="text-xs text-texto/45 dark:text-bege/45"> {n.perfis?.nome_exibicao ?? 'Membro'}{n.pagina ? `, p. ${n.pagina}` : ''}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {aba === 'mural' && (
          <ListaNotas notas={mural} comAutor vazio="Ninguém pôs anotações deste livro no mural."
            podeApagar={(n) => n.membro_id === perfil.id || perfil.role === 'admin'} onApagar={apagarNota}
            onImagem={(n) => onCompartilhar(livro, { tipo: n.tipo, texto: n.texto, pagina: n.pagina, autor: n.perfis?.nome_exibicao ?? 'Membro' })} />
        )}
        {aba === 'historico' && (
          <section className="cartao p-5 mt-4">
            {dados.meus.length > 0 && <p className="legenda mb-2">Lançou algo errado? Apague o registro aqui e registre de novo. O progresso se ajusta sozinho.</p>}
            {dados.meus.length === 0 ? <p className="legenda">Nenhum registro seu neste livro.</p> : (
              <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.07]">
                {dados.meus.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-8 h-8 rounded-full bg-marinho/[0.06] dark:bg-bege/[0.07] text-marinho/70 dark:text-bege/70 flex items-center justify-center shrink-0">
                      <Icone nome={r.origem === 'pomodoro' ? 'relogio' : 'pena'} className="w-4 h-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-[15px] text-marinho dark:text-bege">{r.paginas_lidas ? `${r.paginas_lidas} páginas` : `${r.minutos_lidos} min de ${r.origem === 'pomodoro' ? 'foco' : 'leitura'}`}</p>
                      <p className="text-xs text-texto/45 dark:text-bege/45">
                        {new Date(r.registrado_em).toLocaleString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button onClick={() => apagarRegistro(r.id)} aria-label="Apagar registro" className="p-3 -mr-2 text-texto/40 dark:text-bege/45 hover:text-red-700 dark:hover:text-red-400">
                      <Icone nome="lixeira" className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Destaque({ icone, texto }: { icone: NomeIcone; texto: string }) {
  return (
    <li className="flex gap-3 items-start">
      <Icone nome={icone} className="w-4 h-4 text-dourado shrink-0 mt-1" />
      <span className="text-bege/90">{texto}</span>
    </li>
  )
}

function Num({ v, r }: { v: number; r: string }) {
  return (
    <div>
      <dd className="font-serif tabular text-2xl text-marinho dark:text-bege leading-none">{v}</dd>
      <dt className="text-[11px] text-texto/50 dark:text-bege/50 mt-1">{r}</dt>
    </div>
  )
}

function ListaNotas({ notas, comAutor = false, vazio, onImagem, podeApagar, onApagar }: {
  notas: Nota[]; comAutor?: boolean; vazio: string; onImagem: (n: Nota) => void
  podeApagar?: (n: Nota) => boolean; onApagar?: (n: Nota) => void
}) {
  const [confirmando, setConfirmando] = useState<string | null>(null)
  if (notas.length === 0) return <p className="legenda text-center py-10">{vazio}</p>
  return (
    <ul className="space-y-3 mt-4">
      {notas.map((n) => (
        <li key={n.id} className="cartao p-4">
          <div className="flex items-center gap-2 text-sm text-dourado-escuro dark:text-dourado mb-2">
            <Icone nome={TIPO[n.tipo].icone} className="w-4 h-4" />
            <span className="font-medium">{TIPO[n.tipo].rotulo}</span>
            {n.pagina && <span className="text-texto/45 dark:text-bege/45">p. {n.pagina}</span>}
            {n.favorita && !comAutor && <span className="ml-auto text-dourado text-xs">favorita</span>}
          </div>
          <p className={`texto-nota text-marinho dark:text-bege whitespace-pre-line ${n.tipo === 'trecho' ? 'font-serif italic text-[18px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}>
            {n.tipo === 'trecho' ? `“${n.texto}”` : n.texto}
          </p>
          {n.referencia && <p className="text-xs font-semibold text-marinho/70 dark:text-bege/70 mt-2 flex items-center gap-1.5"><Icone nome="livro" className="w-3.5 h-3.5 text-dourado" />{n.referencia}</p>}
          <div className="flex items-center gap-2 mt-3">
            {comAutor && <Avatar nome={n.perfis?.nome_exibicao ?? 'Membro'} tamanho={22} />}
            <span className="text-xs text-texto/45 dark:text-bege/45">{comAutor ? `${n.perfis?.nome_exibicao ?? 'Membro'}, ` : ''}{tempoRelativo(n.created_at)}</span>
            {confirmando === n.id ? (
              <span className="ml-auto flex items-center gap-1">
                <button onClick={() => { setConfirmando(null); onApagar?.(n) }} className="text-xs font-semibold text-red-700 dark:text-red-400 px-2 py-1">Apagar</button>
                <button onClick={() => setConfirmando(null)} className="text-xs text-texto/55 dark:text-bege/55 px-2 py-1">Cancelar</button>
              </span>
            ) : (
              <>
                <button onClick={() => onImagem(n)} aria-label="Criar imagem para compartilhar" title="Criar imagem para compartilhar"
                  className="ml-auto flex items-center gap-1 text-xs font-semibold text-dourado-escuro dark:text-dourado px-2 py-2">
                  <Icone nome="imagem" className="w-4 h-4" /> Imagem
                </button>
                {podeApagar?.(n) && onApagar && (
                  <button onClick={() => onApagar(n)} aria-label="Apagar anotação" className="p-2.5 -mr-1 text-texto/40 dark:text-bege/45 hover:text-red-700 dark:hover:text-red-400">
                    <Icone nome="lixeira" className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
