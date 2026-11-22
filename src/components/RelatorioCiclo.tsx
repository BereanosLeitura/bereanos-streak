import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { paginasEquivalentes, formatarData, contar } from '../lib/estatisticas'
import { entreAspas } from '../lib/regras'
import Icone from './Icone'

// Relatório do ciclo: uma folha A4 com o que ficou daquele livro, para o
// arquivo do clube. Sai no padrão visual dos documentos: azul-marinho,
// dourado e serifa. As anotações privadas de cada membro não entram.

type Tipo = 'trecho' | 'reflexao' | 'pergunta' | 'aplicacao'

const SECOES: { tipo: Tipo; titulo: string }[] = [
  { tipo: 'pergunta', titulo: 'Perguntas levadas ao encontro' },
  { tipo: 'trecho', titulo: 'Trechos marcados' },
  { tipo: 'reflexao', titulo: 'Reflexões' },
  { tipo: 'aplicacao', titulo: 'Aplicações' }
]

interface Nota { tipo: Tipo; texto: string; pagina: number | null; referencia: string | null; autor: string }
interface Dados {
  paginasGrupo: number
  leitores: number
  terminaram: string[]
  naoTerminaram: string[]
  notas: Nota[]
  encontros: { data: string; local: string | null; presentes: string[] }[]
}

interface Props {
  livro: { id: string; titulo: string; autor: string | null; paginas_totais: number; ciclo_inicio: string | null; ciclo_fim: string | null }
  onFechar: () => void
}

export default function RelatorioCiclo({ livro, onFechar }: Props) {
  const [d, setD] = useState<Dados | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    document.body.classList.add('imprimindo-caderno')
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    carregar().then(setD).catch(() => setErro(true))
    return () => { document.body.classList.remove('imprimindo-caderno'); window.removeEventListener('keydown', esc) }
  }, [livro.id])

  async function carregar(): Promise<Dados> {
    const [perfisR, regsR, statusR, notasR, encR] = await Promise.all([
      supabase.from('perfis').select('id, nome_exibicao, ritmo_leitura_min_por_pagina').order('nome_exibicao'),
      supabase.from('registros_leitura').select('membro_id, paginas_lidas, minutos_lidos, registrado_em').eq('livro_id', livro.id),
      supabase.from('leituras_status').select('membro_id, status').eq('livro_id', livro.id),
      supabase.from('anotacoes').select('tipo, texto, pagina, referencia, perfis!anotacoes_membro_id_fkey(nome_exibicao)')
        .eq('livro_id', livro.id).eq('compartilhada', true).order('pagina', { ascending: true, nullsFirst: false }),
      supabase.from('encontros').select('id, data, local').eq('livro_id', livro.id).order('data')
    ])

    const perfis = (perfisR.data ?? []) as { id: string; nome_exibicao: string; ritmo_leitura_min_por_pagina: number | null }[]
    const nome = new Map(perfis.map((p) => [p.id, p.nome_exibicao]))

    let paginasGrupo = 0
    const leitores = new Set<string>()
    const lidasPor = new Map<string, number>()
    for (const r of (regsR.data ?? []) as { membro_id: string; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string }[]) {
      const ritmo = perfis.find((p) => p.id === r.membro_id)?.ritmo_leitura_min_por_pagina ?? 2
      const eq = paginasEquivalentes(r, ritmo)
      paginasGrupo += eq
      lidasPor.set(r.membro_id, (lidasPor.get(r.membro_id) ?? 0) + eq)
      leitores.add(r.membro_id)
    }

    const marcados = new Map(((statusR.data ?? []) as { membro_id: string; status: string }[]).map((s) => [s.membro_id, s.status]))
    const terminaram: string[] = []
    const naoTerminaram: string[] = []
    for (const p of perfis) {
      const fim = marcados.get(p.id) === 'terminou' || (lidasPor.get(p.id) ?? 0) >= livro.paginas_totais
      if (fim) terminaram.push(p.nome_exibicao)
      else if (lidasPor.has(p.id)) naoTerminaram.push(p.nome_exibicao)
    }

    const encontros: Dados['encontros'] = []
    for (const e of (encR.data ?? []) as { id: string; data: string; local: string | null }[]) {
      if (new Date(e.data).getTime() > Date.now()) continue
      const { data } = await supabase.from('presencas').select('membro_id').eq('encontro_id', e.id)
      encontros.push({ data: e.data, local: e.local, presentes: (data ?? []).map((x) => nome.get(x.membro_id) ?? '—').sort((a, b) => a.localeCompare(b, 'pt-BR')) })
    }

    return {
      paginasGrupo: Math.round(paginasGrupo),
      leitores: leitores.size,
      terminaram,
      naoTerminaram,
      notas: ((notasR.data ?? []) as unknown as { tipo: Tipo; texto: string; pagina: number | null; referencia: string | null; perfis: { nome_exibicao: string } | null }[])
        .map((n) => ({ tipo: n.tipo, texto: n.texto, pagina: n.pagina, referencia: n.referencia, autor: n.perfis?.nome_exibicao ?? '—' })),
      encontros
    }
  }

  const periodo = livro.ciclo_inicio
    ? `${formatarData(livro.ciclo_inicio, { day: 'numeric', month: 'long' })} a ${livro.ciclo_fim ? formatarData(livro.ciclo_fim, { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`
    : null

  return createPortal(
    <div className="caderno-impressao fixed inset-0 z-[80] overflow-y-auto bg-[#F4F1EA] dark:bg-noite" role="dialog" aria-modal="true" aria-label={`Relatório do ciclo de ${livro.titulo}`}>
      <div className="nao-imprimir sticky top-0 z-10 bg-marinho text-bege px-4 py-3 flex items-center gap-2 shadow-md">
        <button onClick={onFechar} className="p-1.5 -ml-1.5" aria-label="Fechar"><Icone nome="x" /></button>
        <p className="font-semibold text-sm flex-1">Relatório do ciclo</p>
        <button onClick={() => window.print()} disabled={!d}
          className="flex items-center gap-1.5 rounded-full bg-dourado text-marinho px-3.5 py-1.5 text-sm font-semibold disabled:opacity-50">
          <Icone nome="baixar" className="w-4 h-4" /> Salvar PDF ou imprimir
        </button>
      </div>

      {erro && <p className="nao-imprimir max-w-[720px] mx-auto px-6 py-8 text-sm text-texto dark:text-bege">Não foi possível montar o relatório agora.</p>}
      {!d && !erro && <p className="nao-imprimir max-w-[720px] mx-auto px-6 py-8 text-sm text-texto/70 dark:text-bege/60">Reunindo os números do ciclo…</p>}

      {d && (
        <article className="folha-caderno max-w-[720px] mx-auto my-4 bg-white text-[#222] shadow-lg px-8 sm:px-14 py-12 font-serif">
          <header className="text-center">
            <p className="text-[11px] tracking-[.3em] text-[#8A6D2B] font-semibold">CLUBE DO LIVRO BEREANOS</p>
            <p className="text-[12px] tracking-[.18em] text-[#1B2A4A] mt-2">RELATÓRIO DO CICLO</p>
            <h1 className="text-[30px] leading-tight text-[#1B2A4A] mt-3">{livro.titulo}</h1>
            {livro.autor && <p className="italic text-[#8A6D2B] text-lg">{livro.autor}</p>}
            <p className="text-[#B8912F] text-sm my-3" aria-hidden="true">────────  ◆  ────────</p>
            <p className="text-[14px]">{livro.paginas_totais} páginas{periodo ? ` · ciclo de ${periodo}` : ''}</p>
          </header>

          <section className="mt-9 secao-caderno">
            <h2 className="text-[13px] tracking-[.2em] font-semibold text-[#1B2A4A] border-b border-[#B8912F] pb-1">O CICLO EM NÚMEROS</h2>
            <ul className="mt-3 space-y-1.5 text-[15px]">
              <li>{contar(d.paginasGrupo, 'página lida', 'páginas lidas')} pelo grupo</li>
              <li>{contar(d.leitores, 'pessoa registrou', 'pessoas registraram')} leitura neste livro</li>
              <li>{d.terminaram.length} {d.terminaram.length === 1 ? 'terminou' : 'terminaram'} a leitura</li>
              <li>{contar(d.notas.length, 'anotação', 'anotações')} no mural do grupo</li>
            </ul>
          </section>

          <section className="mt-8 secao-caderno">
            <h2 className="text-[13px] tracking-[.2em] font-semibold text-[#1B2A4A] border-b border-[#B8912F] pb-1">QUEM PARTICIPOU</h2>
            {d.terminaram.length > 0 && (
              <p className="mt-3 text-[15px]"><strong>Concluíram:</strong> {d.terminaram.join(', ')}.</p>
            )}
            {d.naoTerminaram.length > 0 && (
              <p className="mt-2 text-[15px]"><strong>Seguem na leitura:</strong> {d.naoTerminaram.join(', ')}.</p>
            )}
            <p className="text-[12px] italic text-[#6b6b6b] mt-2">
              Quem não terminou continua com o livro como leitura pendente, no próprio ritmo, e participa do encontro normalmente.
            </p>
          </section>

          {d.encontros.length > 0 && (
            <section className="mt-8 secao-caderno">
              <h2 className="text-[13px] tracking-[.2em] font-semibold text-[#1B2A4A] border-b border-[#B8912F] pb-1">ENCONTRO</h2>
              {d.encontros.map((e) => (
                <div key={e.data} className="mt-3 text-[15px]">
                  <p>
                    <strong>{formatarData(e.data, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    {e.local && ` · ${e.local}`}
                  </p>
                  {e.presentes.length > 0 && <p className="mt-1">Presentes: {e.presentes.join(', ')}.</p>}
                </div>
              ))}
            </section>
          )}

          {SECOES.map((s) => {
            const lista = d.notas.filter((n) => n.tipo === s.tipo)
            if (!lista.length) return null
            return (
              <section key={s.tipo} className="mt-8 secao-caderno">
                <h2 className="text-[13px] tracking-[.2em] font-semibold text-[#1B2A4A] border-b border-[#B8912F] pb-1">{s.titulo.toUpperCase()}</h2>
                <ul className="mt-3 space-y-3.5">
                  {lista.map((n, i) => (
                    <li key={i} className="grid grid-cols-[52px_1fr] gap-2 item-caderno">
                      <span className="text-[12px] text-[#8A6D2B] pt-1 tabular">{n.pagina ? `p. ${n.pagina}` : ''}</span>
                      <div>
                        <p className={`whitespace-pre-line leading-relaxed ${s.tipo === 'trecho' ? 'italic text-[16px]' : 'text-[15px]'}`}>
                          {s.tipo === 'trecho' ? entreAspas(n.texto) : n.texto}
                        </p>
                        {n.referencia && <p className="text-[12px] text-[#1B2A4A] mt-0.5 font-sans font-semibold">{n.referencia}</p>}
                        <p className="text-[12px] text-[#6b6b6b] mt-0.5">{n.autor}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}

          <footer className="mt-12 text-center text-[12px] text-[#8A6D2B] tracking-[.15em]">
            LER. EXAMINAR. DIALOGAR. APLICAR.
          </footer>
        </article>
      )}
    </div>,
    document.body
  )
}
