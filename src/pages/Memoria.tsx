import { useEffect, useState } from 'react'
import Icone from '../components/Icone'
import Logo from '../components/Logo'
import { contar, formatarData } from '../lib/estatisticas'
import { carregarMemoria, FUNDACAO, FUNDADORES, type Memoria as TMemoria, type CicloDaMemoria } from '../lib/memoria'

// Memória do clube: a caminhada em ordem, da fundação ao livro de agora.
// Serve para quem chega depois entender de onde o clube veio.

interface Props {
  onVoltar: () => void
  rotuloVoltar?: string
  onAbrirLivro?: (livroId: string) => void
}

function periodo(c: CicloDaMemoria): string {
  if (!c.inicio) return ''
  const mesmoAno = c.fim && c.inicio.slice(0, 4) === c.fim.slice(0, 4)
  const de = formatarData(c.inicio, mesmoAno ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
  if (!c.fim) return `desde ${de}`
  return `${de} a ${formatarData(c.fim, { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export default function Memoria({ onVoltar, rotuloVoltar = 'Voltar', onAbrirLivro }: Props) {
  const [m, setM] = useState<TMemoria | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    carregarMemoria().then(setM).catch(() => setErro(true))
  }, [])

  return (
    <div className="min-h-screen pb-28">
      <div className="px-5 pt-5 max-w-md mx-auto">
        <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-texto/70 dark:text-bege/70 -ml-1.5 p-1.5" aria-label={`Voltar para ${rotuloVoltar}`}>
          <Icone nome="seta-esquerda" className="w-4 h-4" /> {rotuloVoltar}
        </button>
        <p className="text-[11px] tracking-[.22em] uppercase text-dourado-escuro dark:text-dourado font-semibold mt-4">A caminhada</p>
        <h1 className="font-serif text-[30px] leading-tight text-marinho dark:text-bege mt-1">Memória do clube</h1>
        <p className="legenda mt-2">
          O clube guarda sua origem: os fundadores, as primeiras leituras e cada encontro. A expansão não apaga o começo.
        </p>
      </div>

      {erro && <p className="max-w-md mx-auto px-5 mt-8 text-sm text-texto/70 dark:text-bege/60">Não foi possível carregar a memória agora. Tente de novo mais tarde.</p>}

      {!m && !erro && (
        <div className="max-w-md mx-auto px-5 mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="esqueleto h-28" />)}</div>
      )}

      {m && (
        <div className="max-w-md mx-auto px-5 mt-6">
          <dl className="cartao grid grid-cols-3 divide-x divide-marinho/[0.07] dark:divide-bege/[0.07] py-4 text-center">
            {([
              [m.totalPaginas.toLocaleString('pt-BR'), 'páginas lidas pelo clube'],
              [String(m.totalLivros), m.totalLivros === 1 ? 'livro' : 'livros'],
              [String(m.totalEncontros), m.totalEncontros === 1 ? 'encontro' : 'encontros']
            ] as [string, string][]).map(([v, r]) => (
              <div key={r} className="px-2">
                <dt className="sr-only">{r}</dt>
                <dd className="font-serif text-2xl text-marinho dark:text-bege tabular leading-none">{v}</dd>
                <p className="text-[11px] text-texto/65 dark:text-bege/55 mt-1.5 leading-tight">{r}</p>
              </div>
            ))}
          </dl>

          <ol className="relative mt-7 pl-7">
            <span aria-hidden="true" className="absolute left-[7px] top-2 bottom-6 w-px bg-dourado/30" />

            <li className="relative">
              <span aria-hidden="true" className="absolute -left-7 top-1.5 w-3.5 h-3.5 rotate-45 bg-dourado" />
              <p className="text-xs text-dourado-escuro dark:text-dourado tabular">{formatarData(FUNDACAO, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <h2 className="font-serif text-xl text-marinho dark:text-bege mt-0.5">Fundação</h2>
              <p className="text-sm text-texto/75 dark:text-bege/70 mt-1 leading-relaxed">
                O Clube do Livro Bereanos nasce em Fortaleza, com o nome tirado dos bereanos de Atos 17:11, que recebiam a mensagem e examinavam as Escrituras para ver se as coisas eram assim.
              </p>
              <details className="mt-2">
                <summary className="text-sm text-dourado-escuro dark:text-dourado cursor-pointer">Os seis fundadores</summary>
                <ul className="mt-2 space-y-1">
                  {FUNDADORES.map((f) => (
                    <li key={f} className="text-sm text-texto/75 dark:text-bege/70">{f}</li>
                  ))}
                </ul>
              </details>
            </li>

            {m.ciclos.map((c) => (
              <li key={c.id} className="relative mt-8">
                <span aria-hidden="true" className={`absolute -left-7 top-1.5 w-3.5 h-3.5 rotate-45 ${c.ativo ? 'bg-marinho dark:bg-bege' : 'bg-dourado'}`} />
                <p className="text-xs text-dourado-escuro dark:text-dourado tabular">
                  {periodo(c)}{c.ativo && ' · leitura atual'}
                </p>

                <div className="flex gap-3 mt-1.5">
                  {c.capaUrl ? (
                    <img src={c.capaUrl} alt="" loading="lazy" className="w-14 rounded shadow-md shadow-black/20 ring-1 ring-marinho/10 dark:ring-bege/10 self-start" />
                  ) : (
                    <div className="w-14 h-20 rounded ring-1 ring-marinho/10 dark:ring-bege/10 flex items-center justify-center shrink-0">
                      <Logo versao="simbolo" className="h-8 opacity-60" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg leading-tight text-marinho dark:text-bege">{c.titulo}</h2>
                    {c.autor && <p className="text-sm text-texto/65 dark:text-bege/55">{c.autor}</p>}
                    <p className="text-xs text-texto/65 dark:text-bege/55 mt-1.5 leading-relaxed">
                      {contar(c.paginasDoGrupo, 'página lida', 'páginas lidas')} pelo grupo
                      {c.leitores > 0 && ` · ${contar(c.leitores, 'leitor', 'leitores')}`}
                      {c.terminaram > 0 && ` · ${c.terminaram} ${c.terminaram === 1 ? 'terminou' : 'terminaram'}`}
                      {c.anotacoesNoMural > 0 && ` · ${contar(c.anotacoesNoMural, 'anotação', 'anotações')} no mural`}
                    </p>
                  </div>
                </div>

                {c.encontros.map((e) => (
                  <p key={e.data} className="flex items-start gap-1.5 text-xs text-texto/70 dark:text-bege/60 mt-2 ml-[68px]">
                    <Icone nome="grupo" className="w-3.5 h-3.5 shrink-0 mt-0.5 text-dourado" />
                    <span>
                      Encontro em {formatarData(e.data, { day: 'numeric', month: 'long' })}
                      {e.local && `, ${e.local}`}
                      {e.presentes > 0 && ` · ${contar(e.presentes, 'presente', 'presentes')}`}
                    </span>
                  </p>
                ))}

                {onAbrirLivro && (
                  <button onClick={() => onAbrirLivro(c.id)} className="botao-texto mt-2 ml-[68px]">
                    Ver este ciclo
                  </button>
                )}
              </li>
            ))}
          </ol>

          <p className="text-center text-[11px] tracking-[.2em] uppercase text-dourado-escuro dark:text-dourado mt-10">
            Ler. Examinar. Dialogar. Aplicar.
          </p>
        </div>
      )}
    </div>
  )
}
