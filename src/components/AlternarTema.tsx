import type { TemaPreferido } from '../lib/tema'
import Icone, { type NomeIcone } from './Icone'

interface Props {
  tema: TemaPreferido
  onMudar: (novo: TemaPreferido) => void
  className?: string
}

const PROXIMO: Record<TemaPreferido, TemaPreferido> = {
  sistema: 'claro',
  claro: 'escuro',
  escuro: 'azul',
  azul: 'sistema'
}

const ROTULO: Record<TemaPreferido, string> = {
  sistema: 'Tema do sistema',
  claro: 'Tema claro',
  escuro: 'Tema escuro',
  azul: 'Tema azul'
}

const ICONE: Record<TemaPreferido, NomeIcone> = {
  sistema: 'meia-lua',
  claro: 'sol',
  escuro: 'lua',
  azul: 'gota'
}

// Alterna claro, escuro, azul e automático. Um clique só, sem menu.
export default function AlternarTema({ tema, onMudar, className = '' }: Props) {
  return (
    <button
      type="button"
      onClick={() => onMudar(PROXIMO[tema])}
      title={ROTULO[tema]}
      aria-label={ROTULO[tema]}
      className={`fixed top-4 right-4 z-30 w-9 h-9 rounded-full border border-dourado/40
                  bg-bege/80 dark:bg-noite/80 backdrop-blur-sm text-dourado-escuro dark:text-dourado
                  flex items-center justify-center text-base hover:bg-dourado/10 transition-colors ${className}`}
    >
      <Icone nome={ICONE[tema]} className="w-[18px] h-[18px]" />
    </button>
  )
}
