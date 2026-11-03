import type { ReactNode } from 'react'
import { useState } from 'react'
import AlternarTema from './AlternarTema'
import { aplicarTema, temaSalvoLocal, type TemaPreferido } from '../lib/tema'

// Casca visual comum às telas sem navegação inferior (login, primeiro acesso).
// Fundo levemente texturizado com o tom bege/marinho da identidade do Bereanos.
// Antes de ter perfil (login), o tema só pode vir do que ficou salvo localmente.

export default function PaginaCentralizada({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<TemaPreferido>(() => temaSalvoLocal())

  function mudarTema(novo: TemaPreferido) {
    aplicarTema(novo)
    setTema(novo)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '22px 22px',
          color: '#1B2A4A'
        }}
      />
      <AlternarTema tema={tema} onMudar={mudarTema} />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  )
}
