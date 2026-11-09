import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icone from './Icone'
import Logo from './Logo'

// Momentos da leitura: um aviso breve ao passar de 25%, 50% e 75% do livro,
// e uma tela inteira ao terminar. Celebra o caminho, sem pontos nem comparação.

const FRASES: Record<number, { titulo: string; texto: string }> = {
  25: { titulo: 'Um quarto do caminho', texto: 'A constância está fazendo o trabalho dela.' },
  50: { titulo: 'Metade do livro', texto: 'Daqui para frente, cada página aproxima o fim.' },
  75: { titulo: 'Reta final', texto: 'Falta pouco. Continue no seu ritmo.' }
}

export { marcoAtravessado } from '../lib/regras'

function Faiscas({ quantidade = 18 }: { quantidade?: number }) {
  return (
    <span className="chuva-faiscas" aria-hidden="true">
      {Array.from({ length: quantidade }, (_, i) => (
        <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.35}s`, animationDuration: `${2.6 + (i % 4) * 0.5}s` }} />
      ))}
    </span>
  )
}

export function MarcoLeitura({ marco, titulo, onFechar }: { marco: number; titulo: string; onFechar: () => void }) {
  useEffect(() => {
    try { navigator.vibrate?.([20, 60, 20]) } catch { /* sem vibração */ }
    const t = setTimeout(onFechar, 4200)
    return () => clearTimeout(t)
  }, [])
  const f = FRASES[marco]
  return createPortal(
    <div className="fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-[max(16px,env(safe-area-inset-top))] pointer-events-none">
      <button onClick={onFechar} role="status"
        className="pointer-events-auto relative overflow-hidden w-full max-w-sm rounded-2xl bg-marinho text-bege shadow-2xl shadow-black/30 ring-1 ring-dourado/40 px-4 py-3.5 flex items-center gap-3.5 text-left animate-marco">
        <Faiscas quantidade={10} />
        <span className="relative w-14 h-14 rounded-full ring-2 ring-dourado flex items-center justify-center shrink-0 bg-dourado/10">
          <span className="font-serif text-xl tabular text-bege">{marco}<span className="text-xs text-dourado">%</span></span>
        </span>
        <span className="relative min-w-0">
          <span className="block font-serif text-lg leading-tight text-dourado">{f.titulo}</span>
          <span className="block text-xs text-bege/75 truncate">{titulo}</span>
          <span className="block text-xs text-bege/60 mt-0.5">{f.texto}</span>
        </span>
      </button>
    </div>,
    document.body
  )
}

interface PropsTerminei {
  livro: { titulo: string; autor: string | null; capa_url: string | null }
  doCiclo: boolean // livro atual (dá para anotar e baixar o caderno)
  onImagem: () => void
  onAplicacao: () => void
  onCaderno: () => void
  onFechar: () => void
}

export function TelaTerminei({ livro, doCiclo, onImagem, onAplicacao, onCaderno, onFechar }: PropsTerminei) {
  useEffect(() => {
    try { navigator.vibrate?.([30, 80, 30, 80, 60]) } catch { /* sem vibração */ }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])
  return createPortal(
    <div className="fixed inset-0 z-[75] bg-marinho text-bege overflow-y-auto" role="dialog" aria-modal="true" aria-label={`Você terminou ${livro.titulo}`}>
      <Faiscas />
      <div className="relative min-h-full max-w-md mx-auto px-6 py-10 flex flex-col items-center text-center">
        <button onClick={onFechar} className="self-end p-2 -mr-2 text-bege/70" aria-label="Fechar"><Icone nome="x" /></button>
        <div className="mt-2 animate-revelar">
          {livro.capa_url ? (
            <img src={livro.capa_url} alt="" className="w-40 rounded-lg shadow-2xl shadow-black/50 ring-1 ring-dourado/30 brilho-capa" />
          ) : (
            <div className="w-40 h-60 rounded-lg ring-1 ring-dourado/40 flex items-center justify-center"><Logo versao="simbolo" sempre="branco" className="h-24" /></div>
          )}
        </div>
        <p className="mt-8 text-sm tracking-[.25em] text-dourado animate-revelar [animation-delay:.25s]">VOCÊ TERMINOU</p>
        <h1 className="font-serif text-[32px] leading-tight mt-2 animate-revelar [animation-delay:.35s]">{livro.titulo}</h1>
        {livro.autor && <p className="text-bege/65 mt-1 animate-revelar [animation-delay:.45s]">{livro.autor}</p>}
        <p className="text-dourado/80 text-sm my-5" aria-hidden="true">────  ◆  ────</p>
        <p className="text-bege/80 leading-relaxed max-w-[300px] animate-revelar [animation-delay:.55s]">
          Cada página foi um passo. Agora é hora de examinar o que ficou e aplicar.
        </p>
        <div className="w-full mt-8 space-y-2.5 animate-revelar [animation-delay:.7s]">
          {doCiclo && (
            <button onClick={onAplicacao} className="w-full rounded-xl bg-dourado text-marinho font-semibold py-3.5 active:scale-[0.985] transition-transform">
              Escrever o que vou aplicar
            </button>
          )}
          <button onClick={onImagem} className={`w-full rounded-xl font-semibold py-3.5 active:scale-[0.985] transition-transform ${doCiclo ? 'border border-bege/25 text-bege' : 'bg-dourado text-marinho'}`}>
            Criar a imagem "Terminei"
          </button>
          {doCiclo && (
            <button onClick={onCaderno} className="w-full rounded-xl border border-bege/25 text-bege font-semibold py-3.5 active:scale-[0.985] transition-transform">
              Baixar meu caderno de anotações
            </button>
          )}
          <button onClick={onFechar} className="w-full py-3 text-sm text-bege/65 underline underline-offset-4">Voltar ao início</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
