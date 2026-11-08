import { useEffect, useState, type ReactNode } from 'react'
import Icone from '../components/Icone'
import { BarraBrilho, useNumeroAnimado } from '../components/BarraBrilho'
import { BarrasHorizontais, BarrasRotuladas } from '../components/Graficos'
import { calcularMetricas, type MetricasGrupo, type MetricasVoce, type TipoNota } from '../lib/metricas'
import { contar, formatarData } from '../lib/estatisticas'
import { formatarTempo } from '../lib/tempo'
import type { Perfil } from '../lib/supabase'
import type { LivroAtivo } from './Inicio'

interface Props {
  perfil: Perfil
  livro: LivroAtivo
  inicial?: 'voce' | 'grupo'
  onVoltar: () => void
  rotuloVoltar?: string
}

const TIPOS: [TipoNota, string, string][] = [
  ['trecho', 'trecho', 'trechos'], ['reflexao', 'reflexão', 'reflexões'],
  ['pergunta', 'pergunta', 'perguntas'], ['aplicacao', 'aplicação', 'aplicações']
]

export default function Metricas({ perfil, livro, inicial = 'voce', onVoltar, rotuloVoltar = 'Voltar' }: Props) {
  const [aba, setAba] = useState<'voce' | 'grupo'>(inicial)
  const [dados, setDados] = useState<{ voce: MetricasVoce; grupo: MetricasGrupo } | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    calcularMetricas(perfil, livro).then(setDados).catch((e) => { console.error(e); setErro(true) })
  }, [perfil.id, livro.id])

  return (
    <div className="min-h-screen px-5 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/60 dark:text-bege/60 -ml-1 p-1">
          <Icone nome="seta-esquerda" className="w-4 h-4" /> {rotuloVoltar}
        </button>
        <header className="mt-4">
          <h1 className="font-serif text-[30px] leading-tight text-marinho dark:text-bege">Métricas</h1>
          <p className="legenda mt-0.5">{aba === 'voce' ? 'Só você vê os seus números.' : 'O clube junto, sem nomes e sem comparação.'}</p>
        </header>

        <div className="grid grid-cols-2 p-1 rounded-xl bg-marinho/[0.06] dark:bg-bege/[0.06] mt-5" role="tablist">
          {([['voce', 'Você'], ['grupo', 'Grupo']] as const).map(([v, r]) => (
            <button key={v} role="tab" aria-selected={aba === v} onClick={() => setAba(v)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${aba === v ? 'bg-folha dark:bg-noite-cartao text-marinho dark:text-bege shadow-sm' : 'text-texto/55 dark:text-bege/55'}`}>
              {r}
            </button>
          ))}
        </div>

        {erro && <p className="legenda mt-6">Não foi possível carregar agora. Verifique a conexão e tente de novo.</p>}
        {!dados && !erro && (
          <div className="space-y-4 mt-6">
            <div className="esqueleto h-32" />
            <div className="esqueleto h-44" />
            <div className="esqueleto h-40" />
          </div>
        )}
        {dados && aba === 'voce' && <Voce m={dados.voce} livro={livro} />}
        {dados && aba === 'grupo' && <Grupo m={dados.grupo} livro={livro} />}
      </div>
    </div>
  )
}

function Voce({ m, livro }: { m: MetricasVoce; livro: LivroAtivo }) {
  const totalNotas = TIPOS.reduce((s, [t]) => s + m.notas[t], 0)
  const maxDia = Math.max(1, ...m.calendario.map((d) => d.paginas))
  const diasMes = m.calendario.filter((d) => !d.futuro && d.paginas > 0).length
  const diasPassados = m.calendario.filter((d) => !d.futuro).length
  const diasFoco = m.calendario.filter((d) => !d.futuro && d.foco > 0).length
  return (
    <>
      <section className="cartao p-5 mt-6">
        <p className="text-sm font-semibold text-dourado-escuro dark:text-dourado">Neste livro</p>
        <h2 className="font-serif text-xl text-marinho dark:text-bege leading-snug">{livro.titulo}</h2>
        <dl className="grid grid-cols-3 gap-y-4 mt-4 text-center">
          <Num v={`${m.ciclo.pct}%`} r="lido" />
          <Num v={m.ciclo.paginas} r={m.ciclo.paginas === 1 ? 'página' : 'páginas'} />
          <Num v={m.ciclo.dias} r={m.ciclo.dias === 1 ? 'dia de leitura' : 'dias de leitura'} />
          <Num v={m.ciclo.mediaPorDia} r="páginas por dia lido" />
          <Num v={m.ciclo.minutos ? formatarTempo(m.ciclo.minutos) : '—'} r="tempo de leitura" />
          <Num v={m.ciclo.registros} r={m.ciclo.registros === 1 ? 'registro' : 'registros'} />
        </dl>
        {m.plano && (
          <p className="text-sm text-texto/70 dark:text-bege/70 mt-5 pt-4 border-t border-marinho/10 dark:border-bege/10">
            O plano do ciclo sugere chegar à página <strong className="text-marinho dark:text-bege">{m.plano.ate}</strong> até {formatarData(m.plano.fimSemana)}.
            {' '}Você está na página <strong className="text-marinho dark:text-bege">{m.plano.atual}</strong>.
            {' '}<span className="text-texto/50 dark:text-bege/50">É uma referência, não uma cobrança.</span>
          </p>
        )}
      </section>

      <Cartao titulo="Páginas por semana" legenda="Últimas 8 semanas, todos os livros">
        <BarrasRotuladas itens={m.semanas} destaqueUltima rotuloAcessivel="Páginas lidas por semana nas últimas 8 semanas" />
      </Cartao>

      <Cartao titulo="Últimas 4 semanas" legenda={`Você leu em ${diasMes} de ${diasPassados} dias.`}>
        <div className="grid grid-cols-7 gap-1.5" role="img" aria-label={`Calendário: leitura em ${diasMes} de ${diasPassados} dias, sessões de foco em ${diasFoco} dias`}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => <span key={i} className="text-[10px] text-center text-texto/45 dark:text-bege/45">{l}</span>)}
          {m.calendario.map((d) => (
            <span key={d.chave} title={`${formatarData(d.chave)}: ${contar(d.paginas, 'página', 'páginas')}`}
              className={`relative aspect-square rounded-md flex items-center justify-center text-[10px] tabular ${d.futuro ? 'opacity-30' : ''} ${d.paginas ? 'text-marinho' : 'bg-marinho/[0.05] dark:bg-bege/[0.06] text-texto/35 dark:text-bege/35'}`}
              style={d.paginas ? { backgroundColor: `rgba(184,145,47,${0.25 + 0.75 * (d.paginas / maxDia)})` } : undefined}>
              {Number(d.chave.slice(8))}
              {d.foco > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-marinho dark:bg-bege ring-1 ring-bege dark:ring-noite-cartao" aria-hidden="true" />}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-texto/55 dark:text-bege/55">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(184,145,47,.7)' }} />Leitura (mais forte, mais páginas)</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-marinho dark:bg-bege" />Sessão de foco</span>
        </div>
      </Cartao>

      <Cartao titulo="Seu ritmo">
        {m.ritmoReal ? (
          <p className="text-[15px] text-texto/80 dark:text-bege/80">
            Pelos registros com tempo, você lê em média <strong className="text-marinho dark:text-bege">{String(m.ritmoReal).replace('.', ',')} min por página</strong>.
            {' '}No perfil está {String(m.ritmoInformado).replace('.', ',')} min.
            {Math.abs(m.ritmoReal - m.ritmoInformado) >= 0.5 && <span className="text-texto/55 dark:text-bege/55"> Se quiser, ajuste em Perfil, Seus dados, para as estimativas ficarem mais certas.</span>}
          </p>
        ) : (
          <p className="text-[15px] text-texto/70 dark:text-bege/70">Informe o tempo em pelo menos 3 registros e o app calcula quantos minutos você leva por página.</p>
        )}
      </Cartao>

      <Cartao titulo="Suas anotações neste livro">
        {totalNotas === 0 ? (
          <p className="legenda">Nenhuma anotação ainda neste livro.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center">
            {TIPOS.map(([t, um, varios]) => <Num key={t} v={m.notas[t]} r={m.notas[t] === 1 ? um : varios} />)}
          </div>
        )}
      </Cartao>

      <Cartao titulo="No total">
        <dl className="grid grid-cols-3 text-center">
          <Num v={m.geral.paginas} r="páginas no app" />
          <Num v={m.geral.dias} r="dias de leitura" />
          <Num v={m.geral.terminados} r={m.geral.terminados === 1 ? 'livro terminado' : 'livros terminados'} />
        </dl>
        {m.livros.length > 1 && (
          <ul className="mt-4 space-y-2.5">
            {m.livros.map((l) => (
              <li key={l.titulo}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-marinho dark:text-bege truncate">{l.titulo}</span>
                  <span className="tabular text-texto/55 dark:text-bege/55 shrink-0">{l.pct}%</span>
                </div>
                <BarraBrilho pct={l.pct} altura="h-1.5" className="mt-1" faiscas={false} />
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </>
  )
}

function Grupo({ m, livro }: { m: MetricasGrupo; livro: LivroAtivo }) {
  const totalMural = TIPOS.reduce((s, [t]) => s + m.mural[t], 0)
  return (
    <>
      <section className="cartao p-6 mt-6 text-center bg-marinho dark:bg-noite-cartao border-transparent">
        <p className="font-serif tabular text-[56px] leading-none text-bege"><NumeroAnimado v={m.paginasCiclo} /></p>
        <p className="text-bege/75 mt-2">páginas lidas juntos em {livro.titulo}</p>
        <dl className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-dourado/30">
          <NumEscuro v={`${m.ativosCiclo} de ${m.membros}`} r="já leram" />
          <NumEscuro v={`${m.mediaPct}%`} r="média lida" />
          <NumEscuro v={m.terminaram} r={m.terminaram === 1 ? 'terminou' : 'terminaram'} />
        </dl>
      </section>

      <Cartao titulo="Onde o grupo está" legenda="Quantas pessoas em cada parte do livro">
        <BarrasHorizontais itens={m.faixas} unidade={['pessoa', 'pessoas']} />
      </Cartao>

      <Cartao titulo="Páginas do grupo por semana" legenda={`Últimas 8 semanas. ${m.ativos7} ${m.ativos7 === 1 ? 'pessoa leu' : 'pessoas leram'} nos últimos 7 dias.`}>
        <BarrasRotuladas itens={m.semanas} destaqueUltima rotuloAcessivel="Páginas lidas pelo grupo por semana" />
      </Cartao>

      <Cartao titulo="Dias em que o grupo lê" legenda={m.melhorDia ? `Nas últimas 8 semanas, o grupo leu mais às ${m.melhorDia === 'sábado' || m.melhorDia === 'domingo' ? m.melhorDia + 's' : m.melhorDia + 's-feiras'}.` : 'Ainda sem leituras nas últimas semanas.'}>
        <BarrasRotuladas itens={m.diasSemana} rotuloAcessivel="Páginas do grupo por dia da semana" />
      </Cartao>

      <Cartao titulo="Mural neste livro">
        {totalMural === 0 ? (
          <p className="legenda">Ninguém pôs anotações no mural deste livro ainda.</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 text-center">
            {TIPOS.map(([t, um, varios]) => <Num key={t} v={m.mural[t]} r={m.mural[t] === 1 ? um : varios} />)}
          </div>
        )}
      </Cartao>

      {m.encontros.length > 0 && (
        <Cartao titulo="Presença nos encontros">
          <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.08]">
            {m.encontros.map((e) => (
              <li key={e.data} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block text-marinho dark:text-bege">{formatarData(e.data, { day: 'numeric', month: 'long' })}</span>
                  <span className="block text-xs text-texto/50 dark:text-bege/50 truncate">{e.titulo}</span>
                </span>
                <span className="tabular text-texto/70 dark:text-bege/70 shrink-0">{e.presentes} {e.presentes === 1 ? 'presente' : 'presentes'}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      <Cartao titulo="Livros do clube no app">
        <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.08]">
          {m.livros.map((l) => (
            <li key={l.titulo} className="py-2.5">
              <p className="text-[15px] text-marinho dark:text-bege leading-snug">{l.titulo}{l.atual && <span className="text-xs text-dourado-escuro dark:text-dourado font-semibold"> · atual</span>}</p>
              <p className="text-xs text-texto/55 dark:text-bege/55 mt-0.5">
                {l.paginas} páginas lidas juntos, {l.leitores} {l.leitores === 1 ? 'leitor' : 'leitores'}, {l.terminaram} {l.terminaram === 1 ? 'terminou' : 'terminaram'}
              </p>
            </li>
          ))}
        </ul>
      </Cartao>
    </>
  )
}

function Cartao({ titulo, legenda, children }: { titulo: string; legenda?: string; children: ReactNode }) {
  return (
    <section className="cartao p-5 mt-4">
      <h2 className="titulo-secao">{titulo}</h2>
      {legenda && <p className="legenda mt-0.5">{legenda}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Num({ v, r }: { v: number | string; r: string }) {
  return (
    <div>
      <dd className="font-serif tabular text-2xl text-marinho dark:text-bege leading-none">{v}</dd>
      <dt className="text-[11px] text-texto/55 dark:text-bege/55 mt-1.5 leading-tight">{r}</dt>
    </div>
  )
}

function NumEscuro({ v, r }: { v: number | string; r: string }) {
  return (
    <div>
      <dd className="font-serif tabular text-xl text-dourado whitespace-nowrap">{v}</dd>
      <dt className="text-xs text-bege/65 mt-1">{r}</dt>
    </div>
  )
}

function NumeroAnimado({ v }: { v: number }) {
  return <>{useNumeroAnimado(v)}</>
}
