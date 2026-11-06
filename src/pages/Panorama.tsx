import { useEffect, useState } from 'react'
import Icone from '../components/Icone'
import { BarrasDias, MapaDeHorarios, MapaDoLivro } from '../components/Graficos'
import { BLOCOS, calcularPanorama, planoCiclo, type Panorama as TPanorama } from '../lib/infograficos'
import { formatarData } from '../lib/estatisticas'
import type { LivroAtivo } from './Inicio'

interface Props {
  livro: LivroAtivo
  onVoltar: () => void
  onCompartilhar: () => void
  onMural: () => void
  onMetricas: () => void
}

// Visão do grupo inteiro no livro do ciclo. Sem ranking: só o que o clube leu junto.
export default function Panorama({ livro, onVoltar, onCompartilhar, onMural, onMetricas }: Props) {
  const [p, setP] = useState<TPanorama | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    calcularPanorama(livro).then(setP).catch(() => setErro(true))
  }, [livro.id])

  const totalMural = p ? p.mural.trecho + p.mural.reflexao + p.mural.pergunta + p.mural.aplicacao : 0
  const pags14 = p ? p.ultimos14.reduce((a, x) => a + x.paginas, 0) : 0

  return (
    <div className="min-h-screen px-5 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1">
          <Icone nome="seta-esquerda" className="w-4 h-4" /> Início
        </button>

        <header className="mt-4">
          <p className="text-sm font-semibold text-dourado-escuro dark:text-dourado">O clube neste livro</p>
          <h1 className="font-serif text-[28px] leading-tight text-marinho dark:text-bege mt-1">{livro.titulo}</h1>
        </header>

        {erro && <p className="legenda mt-6">Não foi possível carregar agora. Verifique a conexão e tente de novo.</p>}

        {!p && !erro && (
          <div className="space-y-4 mt-6">
            <div className="esqueleto h-36" />
            <div className="esqueleto h-40" />
          </div>
        )}

        {p && (
          <>
            <section className="cartao p-6 mt-6 text-center bg-marinho dark:bg-noite-cartao border-transparent">
              <p className="font-serif tabular text-[64px] leading-none text-bege">{p.paginasGrupo}</p>
              <p className="text-bege/75 mt-2">páginas lidas juntos</p>
              <dl className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-dourado/30">
                <Item v={p.leitores} r={p.leitores === 1 ? 'leitor' : 'leitores'} />
                <Item v={p.terminaram} r={p.terminaram === 1 ? 'terminou' : 'terminaram'} />
                <Item v={`${p.mediaPct}%`} r="média lida" />
              </dl>
            </section>

            <section className="cartao p-5 mt-4">
              <div className="flex items-baseline justify-between">
                <h2 className="titulo-secao">Últimos 14 dias</h2>
                <span className="legenda">{pags14} páginas</span>
              </div>
              <div className="mt-4"><BarrasDias valores={p.ultimos14} /></div>
              <p className="text-sm text-texto/65 dark:text-bege/65 mt-3">
                {p.leramHoje === 0 ? 'Ninguém registrou leitura hoje ainda.' : `${p.leramHoje} ${p.leramHoje === 1 ? 'pessoa leu' : 'pessoas leram'} hoje.`}
                {' '}{p.diasComLeitura === 0 ? 'O clube ainda não registrou leitura neste ciclo.' : `O clube leu em ${p.diasComLeitura} ${p.diasComLeitura === 1 ? 'dia' : 'dias'} deste ciclo.`}
              </p>
            </section>

            <section className="cartao p-5 mt-4">
              <div className="flex items-baseline justify-between">
                <h2 className="titulo-secao">Mural</h2>
                {totalMural > 0 && <button onClick={onMural} className="botao-texto">Abrir</button>}
              </div>
              {totalMural === 0 ? (
                <p className="legenda mt-2">Nenhuma anotação compartilhada ainda.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                  <Bloco icone="aspas" v={p.mural.trecho} r={p.mural.trecho === 1 ? 'trecho' : 'trechos'} />
                  <Bloco icone="lampada" v={p.mural.reflexao} r={p.mural.reflexao === 1 ? 'reflexão' : 'reflexões'} />
                  <Bloco icone="interrogacao" v={p.mural.pergunta} r={p.mural.pergunta === 1 ? 'pergunta' : 'perguntas'} />
                  <Bloco icone="alvo" v={p.mural.aplicacao} r={p.mural.aplicacao === 1 ? 'aplicação' : 'aplicações'} />
                </div>
              )}
            </section>

            <section className="cartao p-5 mt-4">
              <h2 className="titulo-secao mb-1">Mapa do livro</h2>
              <p className="legenda mb-3">Onde as anotações do mural se concentram.</p>
              <MapaDoLivro marcas={p.marcas} total={livro.paginas_totais} />
            </section>

            {(() => {
              const plano = planoCiclo(livro)
              if (!plano) return null
              return (
                <section className="cartao p-5 mt-4">
                  <h2 className="titulo-secao">Plano do ciclo</h2>
                  <p className="legenda mt-1 mb-3">Um ritmo possível para terminar junto. Quem não chegar, participa do encontro normalmente.</p>
                  <ol className="space-y-1.5">
                    {plano.map((s) => (
                      <li key={s.n} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${s.atual ? 'bg-dourado/10 font-semibold text-marinho dark:text-bege' : s.passou ? 'text-texto/45 dark:text-bege/45' : 'text-texto/75 dark:text-bege/75'}`}>
                        <span className="w-16 shrink-0">Semana {s.n}</span>
                        <span className="flex-1">{formatarData(s.inicio)} a {formatarData(s.fim)}</span>
                        <span className="tabular">até p. {s.ate}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )
            })()}

            {p.horarios.total >= 10 && (
              <section className="cartao p-5 mt-4">
                <h2 className="titulo-secao">Quando o clube lê</h2>
                {p.horarios.melhorBloco !== null && (
                  <p className="text-[15px] text-texto/80 dark:text-bege/80 mt-1 mb-4">O grupo lê mais {BLOCOS[p.horarios.melhorBloco].frase}.</p>
                )}
                <MapaDeHorarios mapa={p.horarios} />
              </section>
            )}

            <button onClick={onMetricas} className="cartao w-full mt-4 p-4 flex items-center gap-3 text-left hover:border-dourado/50 transition-colors">
              <span className="w-9 h-9 rounded-full bg-dourado/10 text-dourado-escuro dark:text-dourado flex items-center justify-center shrink-0"><Icone nome="grafico" className="w-[18px] h-[18px]" /></span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-marinho dark:text-bege">Métricas do grupo</span>
                <span className="block text-xs text-texto/50 dark:text-bege/50">semanas, dias de leitura, presença e livros do clube</span>
              </span>
              <Icone nome="seta-direita" className="w-4 h-4 text-texto/30 dark:text-bege/30" />
            </button>

            <button onClick={onCompartilhar} className="botao-primario w-full mt-6 flex items-center justify-center gap-2">
              <Icone nome="compartilhar" className="w-4 h-4" /> Compartilhar imagem do clube
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Item({ v, r }: { v: number | string; r: string }) {
  return (
    <div>
      <dd className="font-serif tabular text-2xl text-dourado">{v}</dd>
      <dt className="text-xs text-bege/65 mt-1">{r}</dt>
    </div>
  )
}

function Bloco({ icone, v, r }: { icone: 'aspas' | 'lampada' | 'interrogacao' | 'alvo'; v: number; r: string }) {
  return (
    <div className="rounded-xl bg-marinho/[0.04] dark:bg-bege/[0.05] py-3">
      <Icone nome={icone} className="w-4 h-4 text-dourado mx-auto" />
      <p className="font-serif tabular text-2xl text-marinho dark:text-bege mt-1">{v}</p>
      <p className="text-xs text-texto/55 dark:text-bege/55">{r}</p>
    </div>
  )
}
