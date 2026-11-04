import { useEffect, useMemo, useRef, useState } from 'react'
import { tempoManual } from '../lib/tempo'
import { supabase, type Perfil } from '../lib/supabase'
import { useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import { chaveDia, maiorSequencia, paginasEquivalentes } from '../lib/estatisticas'
import { useContagem } from '../lib/preferencias'
import { canvasParaArquivo, desenharLeitura, type Formato } from '../lib/cartoes'

// Seu ano de leitura: retrospectiva anual de cada membro, com imagem pronta.

interface Reg { livro_id: string; paginas_lidas: number | null; minutos_lidos: number | null; registrado_em: string; livros: { titulo: string; autor: string | null; capa_url: string | null; paginas_totais: number } | null }
interface Nota { tipo: string; texto: string; favorita: boolean; created_at: string }

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export default function Ano({ perfil, onVoltar }: { perfil: Perfil; onVoltar: () => void }) {
  const ano = new Date().getFullYear()
  const [regs, setRegs] = useState<Reg[] | null>(null)
  const [notas, setNotas] = useState<Nota[]>([])
  const [minutos, setMinutos] = useState(0)
  const [sessoes, setSessoes] = useState(0)
  const [formato, setFormato] = useState<Formato>('story')
  const [imagem, setImagem] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const contagem = useContagem()
  const avisar = useAviso()
  const ritmo = perfil.ritmo_leitura_min_por_pagina || 2

  useEffect(() => {
    ;(async () => {
      const ini = new Date(ano, 0, 1).toISOString()
      const [r, n, s] = await Promise.all([
        supabase.from('registros_leitura').select('livro_id, paginas_lidas, minutos_lidos, registrado_em, livros(titulo, autor, capa_url, paginas_totais)').eq('membro_id', perfil.id).order('registrado_em'),
        supabase.from('anotacoes').select('tipo, texto, favorita, created_at').eq('membro_id', perfil.id).gte('created_at', ini),
        supabase.from('sessoes_pomodoro').select('duracao_minutos').eq('membro_id', perfil.id).eq('status', 'concluida').gte('inicio', ini)
      ])
      const manual = await tempoManual(perfil.id, { desde: ini })
      setRegs((r.data ?? []) as unknown as Reg[])
      setNotas((n.data ?? []) as Nota[])
      setMinutos((s.data ?? []).reduce((a, x) => a + (x.duracao_minutos ?? 0), 0) + manual)
      setSessoes((s.data ?? []).length)
    })()
  }, [perfil.id])

  const d = useMemo(() => {
    if (!regs) return null
    const doAno = regs.filter((r) => new Date(r.registrado_em).getFullYear() === ano)
    const porDia = new Map<string, number>()
    const porMes = Array(12).fill(0) as number[]
    for (const r of doAno) {
      const p = paginasEquivalentes(r, ritmo)
      const k = chaveDia(r.registrado_em)
      porDia.set(k, (porDia.get(k) ?? 0) + p)
      porMes[new Date(r.registrado_em).getMonth()] += p
    }
    // livros: lidos no ano e terminados (somando todo o histórico do livro)
    const porLivro = new Map<string, { titulo: string; autor: string | null; capa: string | null; total: number; noAno: number; tudo: number }>()
    for (const r of regs) {
      if (!r.livros) continue
      const l = porLivro.get(r.livro_id) ?? { titulo: r.livros.titulo, autor: r.livros.autor, capa: r.livros.capa_url, total: r.livros.paginas_totais, noAno: 0, tudo: 0 }
      const p = paginasEquivalentes(r, ritmo)
      l.tudo += p
      if (new Date(r.registrado_em).getFullYear() === ano) l.noAno += p
      porLivro.set(r.livro_id, l)
    }
    const livros = [...porLivro.values()].filter((l) => l.noAno > 0)
    const terminados = livros.filter((l) => l.tudo >= l.total).length
    const melhorMes = porMes.indexOf(Math.max(...porMes))
    const trechos = notas.filter((n) => n.tipo === 'trecho')
    const fav = trechos.find((n) => n.favorita) ?? trechos[0] ?? null
    const datas = [...porDia.keys()].sort()
    return {
      paginas: Math.round([...porDia.values()].reduce((a, b) => a + b, 0)),
      dias: porDia.size,
      sequencia: maiorSequencia(new Set(porDia.keys())),
      porMes: porMes.map(Math.round),
      melhorMes: porMes[melhorMes] > 0 ? melhorMes : null,
      livros,
      terminados,
      anotacoes: notas.length,
      aplicacoes: notas.filter((n) => n.tipo === 'aplicacao').map((n) => n.texto),
      trecho: fav?.texto ?? null,
      inicio: datas[0] ?? null,
      fim: datas[datas.length - 1] ?? null
    }
  }, [regs, notas, ritmo])

  // imagem para compartilhar (modelo Retrospectiva com o ano no lugar do livro)
  useEffect(() => {
    if (!d || !canvas.current || d.paginas === 0) return
    const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
    desenharLeitura(canvas.current, 'retrospectiva', formato, {
      titulo: String(ano), autor: null, capa: null, pct: 0, paginas: d.paginas, total: d.paginas, sequencia: 0, nome: perfil.nome_exibicao, foto: null,
      retro: {
        paginas: d.paginas, dias: d.dias, maiorSequencia: d.sequencia, minutos, anotacoes: d.anotacoes, sessoes, semContagem: !contagem,
        melhorDia: d.melhorMes !== null ? { rotulo: MESES_LONGOS[d.melhorMes], paginas: d.porMes[d.melhorMes] } : null,
        periodo: d.livros.length ? `${d.livros.length} ${d.livros.length === 1 ? 'livro' : 'livros'}${d.terminados ? `, ${d.terminados} ${d.terminados === 1 ? 'terminado' : 'terminados'}` : ''}` : null,
        trecho: d.trecho && d.trecho.length > 180 ? d.trecho.slice(0, 177).replace(/\s+\S*$/, '') + '…' : d.trecho
      }
    }).then(() => setImagem(canvas.current!.toDataURL('image/jpeg', 0.85))).catch(() => setImagem(null))
  }, [d, formato, minutos, sessoes, contagem])

  async function compartilhar(baixar = false) {
    if (!canvas.current) return
    const arq = await canvasParaArquivo(canvas.current, `meu-ano-de-leitura-${ano}.png`)
    const legenda = `Meu ano de leitura em ${ano}: ${d?.paginas} páginas${d?.livros.length ? ` em ${d.livros.length} ${d.livros.length === 1 ? 'livro' : 'livros'}` : ''}. Ler, examinar, dialogar e aplicar. Clube do Livro Bereanos.`
    if (!baixar && navigator.canShare?.({ files: [arq] })) {
      try { await navigator.share({ files: [arq], text: legenda }); return } catch { return }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(arq); a.download = arq.name; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    avisar('Imagem baixada')
  }

  const maxMes = Math.max(1, ...(d?.porMes ?? [0]))
  const mesAtual = new Date().getMonth()

  return (
    <div className="min-h-screen px-5 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1">
          <Icone nome="seta-esquerda" className="w-4 h-4" /> Perfil
        </button>
        <p className="text-sm font-semibold text-dourado-escuro dark:text-dourado mt-4">Retrospectiva</p>
        <h1 className="font-serif text-[34px] leading-tight text-marinho dark:text-bege">Seu ano de leitura, {ano}</h1>

        {!d && <div className="space-y-4 mt-6"><div className="esqueleto h-40" /><div className="esqueleto h-32" /></div>}
        {d && d.paginas === 0 && <p className="cartao p-5 mt-6 legenda">Ainda não há leitura registrada em {ano}. A retrospectiva aparece com os primeiros registros.</p>}

        {d && d.paginas > 0 && (
          <>
            <section className="rounded-3xl bg-marinho text-bege dark:bg-noite-cartao dark:ring-1 dark:ring-dourado/20 p-6 mt-6">
              <p className="font-serif tabular text-[64px] leading-none">{d.paginas}</p>
              <p className="text-bege/75 mt-1">páginas lidas em {ano}</p>
              <dl className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-dourado/30 text-center">
                <Num v={d.livros.length} r={d.livros.length === 1 ? 'livro' : 'livros'} />
                <Num v={d.dias} r={d.dias === 1 ? 'dia de leitura' : 'dias de leitura'} />
                <Num v={minutos >= 60 ? `${Math.floor(minutos / 60)}h${minutos % 60 ? String(minutos % 60).padStart(2, '0') : ''}` : `${minutos}min`} r="de leitura" />
                <Num v={d.anotacoes} r={d.anotacoes === 1 ? 'anotação' : 'anotações'} />
                <Num v={d.terminados} r={d.terminados === 1 ? 'terminado' : 'terminados'} />
                {contagem ? <Num v={d.sequencia} r="dias seguidos, no máximo" /> : <Num v={sessoes} r={sessoes === 1 ? 'sessão de foco' : 'sessões de foco'} />}
              </dl>
            </section>

            <section className="cartao p-5 mt-4">
              <h2 className="titulo-secao">Mês a mês</h2>
              {d.melhorMes !== null && <p className="legenda mt-1">Seu mês mais forte foi {MESES_LONGOS[d.melhorMes]}, com {d.porMes[d.melhorMes]} páginas.</p>}
              <div className="flex items-end gap-1.5 h-28 mt-4" role="img" aria-label="Páginas por mês">
                {d.porMes.map((p, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {p > 0 && <span className="text-[9px] tabular text-texto/55 dark:text-bege/55">{p}</span>}
                    <div className={`w-full rounded-[4px] ${p ? (i === d.melhorMes ? 'bg-dourado' : 'bg-dourado/55') : 'bg-marinho/[0.06] dark:bg-bege/[0.07]'}`}
                      style={{ height: p ? `${Math.max(6, (p / maxMes) * 100)}%` : '4px', opacity: i > mesAtual ? 0.4 : 1 }} />
                    <span className={`text-[10px] ${i === mesAtual ? 'font-bold text-marinho dark:text-bege' : 'text-texto/50 dark:text-bege/50'}`}>{MESES[i]}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="cartao p-5 mt-4">
              <h2 className="titulo-secao mb-3">Livros do ano</h2>
              <ul className="space-y-3">
                {d.livros.map((l) => (
                  <li key={l.titulo} className="flex items-center gap-3">
                    {l.capa ? <img src={l.capa} alt="" className="w-9 h-12 object-cover rounded shadow-sm" /> : <span className="w-9 h-12 rounded border border-dourado/40 flex items-center justify-center text-dourado"><Icone nome="livro" className="w-4 h-4" /></span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-[16px] leading-snug text-marinho dark:text-bege truncate">{l.titulo}</p>
                      <p className="text-xs text-texto/55 dark:text-bege/55">{Math.round(Math.min(l.noAno, l.total))} páginas no ano{l.tudo >= l.total ? ', terminado' : ''}</p>
                    </div>
                    {l.tudo >= l.total && <Icone nome="check" className="w-5 h-5 text-dourado" />}
                  </li>
                ))}
              </ul>
            </section>

            {(d.trecho || d.aplicacoes.length > 0) && (
              <section className="cartao p-5 mt-4">
                {d.trecho && (
                  <>
                    <h2 className="titulo-secao mb-2">Um trecho que ficou</h2>
                    <blockquote className="texto-nota font-serif italic text-[18px] leading-relaxed text-marinho dark:text-bege">“{d.trecho.replace(/^["“”]+|["“”]+$/g, '')}”</blockquote>
                  </>
                )}
                {d.aplicacoes.length > 0 && (
                  <>
                    <h2 className={`titulo-secao mb-2 ${d.trecho ? 'mt-5' : ''}`}>O que você decidiu aplicar</h2>
                    <ul className="space-y-1.5">{d.aplicacoes.slice(0, 5).map((t, i) => (
                      <li key={i} className="texto-nota text-[15px] text-texto/85 dark:text-bege/85 flex gap-2"><Icone nome="alvo" className="w-4 h-4 text-dourado shrink-0 mt-1" />{t}</li>
                    ))}</ul>
                  </>
                )}
              </section>
            )}

            <section className="cartao p-5 mt-4">
              <h2 className="titulo-secao">Imagem para compartilhar</h2>
              <div className="flex gap-2 mt-3">
                {(['story', 'post', 'quadrado'] as Formato[]).map((f) => (
                  <button key={f} onClick={() => setFormato(f)} className={`chip ${formato === f ? 'chip-ativo' : ''}`}>{f === 'story' ? 'Story' : f === 'post' ? 'Post' : 'Quadrado'}</button>
                ))}
              </div>
              <canvas ref={canvas} className="hidden" />
              {imagem ? <img src={imagem} alt={`Retrospectiva de ${ano}`} className="w-48 mx-auto mt-4 rounded-xl shadow-lg" /> : <div className="esqueleto w-48 h-80 mx-auto mt-4" />}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => compartilhar()} className="botao-primario">Compartilhar</button>
                <button onClick={() => compartilhar(true)} className="botao-secundario">Baixar</button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Num({ v, r }: { v: number | string; r: string }) {
  return (
    <div>
      <dd className="font-serif tabular text-2xl text-dourado">{v}</dd>
      <dt className="text-[11px] text-bege/70 leading-tight mt-0.5">{r}</dt>
    </div>
  )
}
