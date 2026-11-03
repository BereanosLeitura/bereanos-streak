import { useEffect, useState } from 'react'
import Icone from './Icone'

// Botão "Instalar no celular". No Android/Chrome usa o convite nativo do
// navegador (capturado em main.tsx); no iPhone explica o caminho pelo Safari,
// que não tem convite automático.

export function appInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

function ehIphone() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function InstalarApp({ compacto = false, onFechar }: { compacto?: boolean; onFechar?: () => void }) {
  const [convite, setConvite] = useState<any>((window as any).__conviteInstalar ?? null)
  const [instalado, setInstalado] = useState(appInstalado())

  useEffect(() => {
    const pegar = () => setConvite((window as any).__conviteInstalar ?? null)
    const fim = () => setInstalado(true)
    window.addEventListener('convite-instalar', pegar)
    window.addEventListener('appinstalled', fim)
    return () => {
      window.removeEventListener('convite-instalar', pegar)
      window.removeEventListener('appinstalled', fim)
    }
  }, [])

  if (instalado) return null
  if (!convite && !ehIphone() && compacto) return null // sem como instalar aqui: não ocupa espaço no Início

  async function instalar() {
    if (!convite) return
    convite.prompt()
    const escolha = await convite.userChoice.catch(() => null)
    if (escolha?.outcome === 'accepted') setInstalado(true)
    ;(window as any).__conviteInstalar = null
    setConvite(null)
  }

  return (
    <section className={`cartao p-4 ${compacto ? '' : 'mt-4'} flex items-start gap-3`}>
      <img src="/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-marinho dark:text-bege">Instalar no celular</p>
        {convite ? (
          <p className="text-sm text-texto/60 dark:text-bege/60">Abre como aplicativo, em tela cheia, direto da tela inicial.</p>
        ) : ehIphone() ? (
          <p className="text-sm text-texto/60 dark:text-bege/60">
            No Safari, toque em <span className="inline-flex align-middle"><Icone nome="compartilhar" className="w-4 h-4" /></span> e depois em
            “Adicionar à Tela de Início”.
          </p>
        ) : (
          <p className="text-sm text-texto/60 dark:text-bege/60">No Chrome do celular, abra o menu ⋮ e toque em “Instalar app” ou “Adicionar à tela inicial”.</p>
        )}
        {convite && <button onClick={instalar} className="mt-2 rounded-lg bg-marinho dark:bg-dourado text-bege dark:text-noite px-4 py-2 text-sm font-semibold">Instalar</button>}
      </div>
      {onFechar && (
        <button onClick={onFechar} aria-label="Dispensar" className="p-1 text-texto/40 dark:text-bege/40"><Icone nome="x" className="w-4 h-4" /></button>
      )}
    </section>
  )
}
