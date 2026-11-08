import { useState, type ReactNode } from 'react'
import Icone from './Icone'

// Mural sem spoiler: anotação de outro membro de uma página que você ainda
// não leu fica embaçada até você tocar em "Revelar".

/** A anotação está à frente de onde a pessoa parou? (as próprias nunca contam) */
export function aFrente(n: { pagina: number | null; membro_id?: string }, eu: string, minhaPagina: number | null) {
  if (minhaPagina === null || !n.pagina || n.membro_id === eu) return false
  return n.pagina > minhaPagina
}

interface Props {
  ativo: boolean
  pagina: number | null
  minhaPagina: number | null
  compacto?: boolean
  /** quando a lista controla o que já foi revelado */
  onRevelar?: () => void
  children: ReactNode
}

export default function ProtecaoSpoiler({ ativo, pagina, minhaPagina, compacto, onRevelar, children }: Props) {
  const [aberto, setAberto] = useState(false)
  if (!ativo || aberto) return <>{children}</>
  return (
    <div className="relative">
      <div aria-hidden="true" className="blur-[7px] select-none pointer-events-none opacity-60 max-h-28 overflow-hidden">
        {children}
      </div>
      <button
        type="button" onClick={() => (onRevelar ? onRevelar() : setAberto(true))}
        aria-label={`Anotação da página ${pagina}, à frente de onde você está. Revelar`}
        className={`absolute inset-0 flex ${compacto ? 'flex-row gap-2' : 'flex-col gap-1'} items-center justify-center text-center rounded-lg
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dourado`}
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-marinho dark:text-bege">
          <Icone nome="cadeado" className="w-4 h-4 text-dourado" /> Página {pagina}
        </span>
        <span className="text-xs text-texto/60 dark:text-bege/60">
          {minhaPagina ? `Você está na página ${minhaPagina}. ` : ''}Toque para revelar
        </span>
      </button>
    </div>
  )
}
