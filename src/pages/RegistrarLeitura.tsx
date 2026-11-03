import { useState, type FormEvent } from 'react'
import { apagarRegistroLeitura, criarRegistroLeitura } from '../lib/sync'
import { supabase, type Perfil } from '../lib/supabase'
import { useMinhaLeitura } from '../lib/leitura'
import { useAviso } from '../components/Toast'
import Icone from '../components/Icone'
import { chaveDia, diasAte, formatarData } from '../lib/estatisticas'
import type { LivroAtivo } from './Inicio'

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  onRegistrado: (terminouLivro: boolean) => void
  onAnotar: () => void
}

type Modo = 'pagina' | 'quantidade'
type Quando = 0 | 1 | 2 // hoje, ontem, anteontem
type TipoNota = 'trecho' | 'reflexao' | 'pergunta'

// Dois jeitos de lançar: "parei na página 64" (o app calcula a diferença) ou
// "li 12 páginas". Dá para lançar uma leitura de ontem ou anteontem e, no
// mesmo envio, guardar uma anotação.

export default function RegistrarLeitura({ perfil, livro, onRegistrado, onAnotar }: Props) {
  const leitura = useMinhaLeitura(perfil, livro)
  const [modo, setModo] = useState<Modo>('pagina')
  const [valor, setValor] = useState('')
  const [quando, setQuando] = useState<Quando>(0)
  const [comNota, setComNota] = useState(false)
  const [tipoNota, setTipoNota] = useState<TipoNota>('reflexao')
  const [textoNota, setTextoNota] = useState('')
  const [notaNoMural, setNotaNoMural] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [verTodos, setVerTodos] = useState(false)
  const avisar = useAviso()

  const jaLidas = leitura.paginasLivro
  const numero = parseInt(valor, 10)
  const paginasDoRegistro = !numero || numero <= 0 ? 0 : modo === 'quantidade' ? numero : numero - jaLidas
  const pctDepois = Math.min(100, Math.round(((jaLidas + Math.max(0, paginasDoRegistro)) / livro.paginas_totais) * 100))
  const restantes = diasAte(livro.ciclo_fim)
  const faltam = livro.paginas_totais - jaLidas
  const porDiaNecessario = restantes && restantes > 0 && faltam > 0 ? Math.ceil(faltam / restantes) : null

  function dataDoRegistro(): string {
    if (quando === 0) return new Date().toISOString()
    const d = new Date()
    d.setDate(d.getDate() - quando)
    d.setHours(20, 0, 0, 0)
    return d.toISOString()
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (modo === 'pagina' && numero > livro.paginas_totais) return setErro(`O livro tem ${livro.paginas_totais} páginas.`)
    if (paginasDoRegistro <= 0) {
      return setErro(modo === 'pagina' ? `Seu registro já está na página ${jaLidas}. Informe uma página depois dessa.` : 'Informe quantas páginas você leu.')
    }
    setSalvando(true)
    await criarRegistroLeitura({
      membro_id: perfil.id, livro_id: livro.id, origem: 'manual',
      paginas_lidas: paginasDoRegistro, minutos_lidos: null, registrado_em: dataDoRegistro()
    })
    if (comNota && textoNota.trim()) {
      const { error } = await supabase.from('anotacoes').insert({
        membro_id: perfil.id, livro_id: livro.id, tipo: tipoNota, texto: textoNota.trim(),
        pagina: Math.min(livro.paginas_totais, jaLidas + paginasDoRegistro), compartilhada: notaNoMural
      })
      if (error) avisar('Leitura salva, mas a anotação não', 'erro')
    }
    setSalvando(false)
    setValor('')
    setTextoNota('')
    const terminou = jaLidas < livro.paginas_totais && jaLidas + paginasDoRegistro >= livro.paginas_totais
    if (!terminou) {
      const meta = perfil.meta_diaria_paginas ?? 10
      const bateuMeta = quando === 0 && leitura.paginasHoje < meta && leitura.paginasHoje + paginasDoRegistro >= meta
      avisar(bateuMeta
        ? `Meta do dia cumprida: ${leitura.paginasHoje + paginasDoRegistro} páginas hoje`
        : `${paginasDoRegistro} ${paginasDoRegistro === 1 ? 'página registrada' : 'páginas registradas'}${comNota && textoNota.trim() ? ' com anotação' : ''}`)
    }
    onRegistrado(terminou)
  }

  async function apagar(id: string) {
    setConfirmando(null)
    const ok = await apagarRegistroLeitura(id)
    avisar(ok ? 'Registro apagado' : 'Não foi possível apagar', ok ? 'ok' : 'erro')
    leitura.recarregar()
  }

  const ultimos = verTodos ? leitura.doLivro : leitura.doLivro.slice(0, 5)

  return (
    <div className="min-h-screen px-5 pt-8 pb-28">
      <form onSubmit={salvar} className="max-w-md mx-auto">
        <h1 className="font-serif text-[30px] text-marinho dark:text-bege">Registrar leitura</h1>
        <p className="legenda mt-1 mb-5">
          {leitura.carregando
            ? 'Carregando seu progresso…'
            : `Você está na página ${jaLidas} de ${livro.paginas_totais}${leitura.paginasHoje > 0 ? `, com ${leitura.paginasHoje} lidas hoje` : ''}.`}
        </p>

        <div role="tablist" className="grid grid-cols-2 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mb-4">
          {([['pagina', 'Onde parei'], ['quantidade', 'Quantas li']] as [Modo, string][]).map(([m, rotulo]) => (
            <button key={m} type="button" role="tab" aria-selected={modo === m}
              onClick={() => { setModo(m); setValor(''); setErro(null) }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${modo === m ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
              {rotulo}
            </button>
          ))}
        </div>

        <div className="cartao p-6">
          <label htmlFor="valor" className="rotulo text-center">{modo === 'quantidade' ? 'Páginas lidas' : 'Parei na página'}</label>
          <input
            id="valor" type="number" inputMode="numeric" min={1} value={valor}
            onChange={(e) => { setValor(e.target.value); setErro(null) }}
            className="w-full bg-transparent text-center font-serif tabular text-[64px] leading-none text-marinho dark:text-bege placeholder:text-texto/15 dark:placeholder:text-bege/15 focus:outline-none py-2"
            placeholder={modo === 'quantidade' ? '0' : String(jaLidas + 1)}
          />

          {/* barra mostrando de onde para onde */}
          <div className="relative h-2 rounded-full bg-marinho/[0.07] dark:bg-bege/10 overflow-hidden mt-3">
            <div className="absolute inset-y-0 left-0 barra-progresso" style={{ width: `${(jaLidas / livro.paginas_totais) * 100}%` }} />
            {paginasDoRegistro > 0 && (
              <div className="absolute inset-y-0 bg-dourado/40 transition-all" style={{ left: `${(jaLidas / livro.paginas_totais) * 100}%`, width: `${(Math.min(paginasDoRegistro, faltam) / livro.paginas_totais) * 100}%` }} />
            )}
          </div>
          <div className="flex justify-between text-xs text-texto/45 dark:text-bege/45 mt-1.5">
            <span>p. {jaLidas}</span>
            <span>{paginasDoRegistro > 0 ? `${pctDepois}% depois deste registro` : `${leitura.pct}%`}</span>
            <span>p. {livro.paginas_totais}</span>
          </div>

          {modo === 'quantidade' && (
            <div className="flex justify-center gap-2 flex-wrap mt-4">
              {[5, 10, 20, 30].map((n) => (
                <button key={n} type="button" onClick={() => setValor(String((numero || 0) + n))} className="chip">+{n}</button>
              ))}
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm text-texto/60 dark:text-bege/60 mb-2">Quando foi?</p>
            <div className="grid grid-cols-3 gap-2">
              {(['Hoje', 'Ontem', 'Anteontem'] as const).map((r, i) => (
                <button key={r} type="button" onClick={() => setQuando(i as Quando)} className={`chip ${quando === i ? 'chip-ativo' : ''}`}>{r}</button>
              ))}
            </div>
          </div>

          {/* anotação junto */}
          <div className="mt-5 border-t border-marinho/[0.07] dark:border-bege/[0.08] pt-4">
            <button type="button" onClick={() => setComNota((v) => !v)} className="flex items-center gap-2 text-sm font-semibold text-dourado-escuro dark:text-dourado">
              <Icone nome="pena" className="w-4 h-4" />
              {comNota ? 'Sem anotação' : 'Anotar algo desta leitura'}
            </button>
            {comNota && (
              <div className="mt-3 space-y-3 animate-subir-suave">
                <div className="flex gap-2">
                  {([['trecho', 'Trecho'], ['reflexao', 'Reflexão'], ['pergunta', 'Pergunta']] as [TipoNota, string][]).map(([t, r]) => (
                    <button key={t} type="button" onClick={() => setTipoNota(t)} className={`chip ${tipoNota === t ? 'chip-ativo' : ''}`}>{r}</button>
                  ))}
                </div>
                <textarea rows={3} value={textoNota} onChange={(e) => setTextoNota(e.target.value)} maxLength={2000}
                  className={`campo resize-none ${tipoNota === 'trecho' ? 'font-serif italic text-[18px]' : ''}`}
                  placeholder={tipoNota === 'trecho' ? 'A frase que marcou.' : tipoNota === 'reflexao' ? 'O que ficou dessa leitura?' : 'Uma dúvida para o encontro.'} />
                <label className="flex items-center gap-2 text-sm text-texto/70 dark:text-bege/70">
                  <input type="checkbox" checked={notaNoMural} onChange={(e) => setNotaNoMural(e.target.checked)} className="w-4 h-4 accent-[#B8912F]" />
                  Pôr no mural do grupo
                </label>
              </div>
            )}
          </div>

          {erro && <p className="text-sm text-center text-red-700 dark:text-red-400 mt-4">{erro}</p>}

          <button type="submit" disabled={salvando || paginasDoRegistro <= 0} className="botao-primario mt-5">
            {salvando ? 'Salvando…' : paginasDoRegistro > 0 ? `Registrar ${paginasDoRegistro} ${paginasDoRegistro === 1 ? 'página' : 'páginas'}` : 'Registrar'}
          </button>
        </div>

        {/* ritmo */}
        <section className="grid grid-cols-2 gap-3 mt-4">
          <div className="cartao p-4">
            <p className="text-xs text-texto/50 dark:text-bege/50">Seu ritmo (14 dias)</p>
            <p className="font-serif tabular text-2xl text-marinho dark:text-bege mt-1">{leitura.mediaDia >= 1 ? Math.round(leitura.mediaDia) : '—'}</p>
            <p className="text-xs text-texto/50 dark:text-bege/50">páginas por dia</p>
          </div>
          <div className="cartao p-4">
            <p className="text-xs text-texto/50 dark:text-bege/50">{leitura.pct >= 100 ? 'Livro' : 'Neste ritmo, termina'}</p>
            <p className="font-serif tabular text-2xl text-marinho dark:text-bege mt-1">
              {leitura.pct >= 100 ? 'concluído' : leitura.previsao ? formatarData(chaveDia(leitura.previsao.data)) : '—'}
            </p>
            <p className="text-xs text-texto/50 dark:text-bege/50">
              {porDiaNecessario ? `precisa de ${porDiaNecessario}/dia até ${formatarData(livro.ciclo_fim!)}` : leitura.previsao ? `em ${leitura.previsao.dias} dias` : 'registre para calcular'}
            </p>
          </div>
        </section>

        {/* últimos */}
        {ultimos.length > 0 && (
          <section className="cartao p-5 mt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="titulo-secao">Histórico neste livro</h2>
              <span className="legenda">{leitura.doLivro.length} {leitura.doLivro.length === 1 ? 'registro' : 'registros'}</span>
            </div>
            <p className="text-xs text-texto/45 dark:text-bege/45 mt-0.5">Lançou algo errado? Apague e registre de novo.</p>
            <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.07] mt-2">
              {ultimos.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-8 h-8 rounded-full bg-marinho/[0.06] dark:bg-bege/[0.07] text-marinho/70 dark:text-bege/70 flex items-center justify-center shrink-0">
                    <Icone nome={r.origem === 'pomodoro' ? 'relogio' : 'pena'} className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-marinho dark:text-bege">
                      {r.paginas_lidas ? `${r.paginas_lidas} páginas` : `${r.minutos_lidos} min de foco`}
                    </p>
                    <p className="text-xs text-texto/45 dark:text-bege/45">
                      {new Date(r.registrado_em).toLocaleString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {confirmando === r.id ? (
                    <button type="button" onClick={() => apagar(r.id)} className="text-xs font-semibold text-red-700 dark:text-red-400 px-2 py-1">Confirmar</button>
                  ) : (
                    <button type="button" onClick={() => setConfirmando(r.id)} aria-label="Apagar registro" className="p-2 text-texto/35 dark:text-bege/35 hover:text-red-700 dark:hover:text-red-400">
                      <Icone nome="lixeira" className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {leitura.doLivro.length > 5 && (
              <button type="button" onClick={() => setVerTodos((v) => !v)} className="botao-texto mt-2">
                {verTodos ? 'Mostrar só os últimos' : `Ver todos os ${leitura.doLivro.length}`}
              </button>
            )}
          </section>
        )}

        <button type="button" onClick={onAnotar} className="mt-5 w-full flex items-center justify-center gap-2 botao-texto">
          <Icone nome="nota" className="w-4 h-4" />
          Ver todas as anotações
        </button>
        <p className="text-xs text-center text-texto/40 dark:text-bege/40 mt-4">
          Funciona sem internet: o registro fica no aparelho e sincroniza quando a conexão voltar.
        </p>
      </form>
    </div>
  )
}
