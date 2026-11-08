import type { ReactNode } from 'react'
import Logo from './Logo'

// Estado vazio com o emblema do clube (arquivo original, sem alteração).
export default function Vazio({ titulo, texto, acao, compacto }: { titulo?: string; texto: string; acao?: ReactNode; compacto?: boolean }) {
  return (
    <div className={`text-center ${compacto ? 'py-4' : 'py-10'}`}>
      <div className={`mx-auto opacity-70 ${compacto ? 'w-fit' : 'w-fit animate-subir-suave'}`}>
        <Logo versao="simbolo" className={compacto ? 'h-10' : 'h-16'} />
      </div>
      {titulo && <p className="font-serif text-xl text-marinho dark:text-bege mt-3">{titulo}</p>}
      <p className={`legenda max-w-[270px] mx-auto ${titulo ? 'mt-1' : 'mt-3'}`}>{texto}</p>
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  )
}
