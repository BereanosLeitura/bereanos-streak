import { createPortal } from 'react-dom'
import Icone from './Icone'

// Cada pessoa escolhe quais cartões aparecem no Início e em que ordem.
// Guardado neste aparelho.

export type IdBlocoInicio = 'encontro' | 'hoje' | 'semana' | 'metas' | 'grupo' | 'mural' | 'atalhos'
export interface LayoutInicio { ordem: IdBlocoInicio[]; ocultos: IdBlocoInicio[] }

export const NOMES_BLOCOS: Record<IdBlocoInicio, string> = {
  encontro: 'Próximo encontro',
  hoje: 'Hoje e registro rápido',
  semana: 'Semana, ciclo e meses',
  metas: 'Metas',
  grupo: 'O grupo neste livro',
  mural: 'Do mural',
  atalhos: 'Próximas leituras e Encontro'
}
const PADRAO: LayoutInicio = { ordem: ['encontro', 'hoje', 'semana', 'metas', 'grupo', 'mural', 'atalhos'], ocultos: [] }
const CHAVE = 'bereanos-streak-inicio'

export function layoutSalvo(): LayoutInicio {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as LayoutInicio | null
    if (!v) return PADRAO
    // garante que blocos novos apareçam e removidos sumam
    const ordem = [...v.ordem.filter((id) => id in NOMES_BLOCOS), ...PADRAO.ordem.filter((id) => !v.ordem.includes(id))]
    return { ordem, ocultos: v.ocultos.filter((id) => id in NOMES_BLOCOS) }
  } catch { return PADRAO }
}
export function gravarLayout(l: LayoutInicio) {
  try { localStorage.setItem(CHAVE, JSON.stringify(l)) } catch { /* ok */ }
}

export default function PersonalizarInicio({ layout, onMudar, onFechar }: { layout: LayoutInicio; onMudar: (l: LayoutInicio) => void; onFechar: () => void }) {
  function mover(i: number, d: -1 | 1) {
    const o = [...layout.ordem]
    const j = i + d
    if (j < 0 || j >= o.length) return
    ;[o[i], o[j]] = [o[j], o[i]]
    onMudar({ ...layout, ordem: o })
  }
  function alternar(id: IdBlocoInicio) {
    const oc = layout.ocultos.includes(id) ? layout.ocultos.filter((x) => x !== id) : [...layout.ocultos, id]
    onMudar({ ...layout, ocultos: oc })
  }
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={onFechar}>
      <div className="cartao w-full max-w-md p-5 animate-subir-suave" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titulo-personalizar">
        <div className="flex items-center justify-between">
          <h2 id="titulo-personalizar" className="font-serif text-xl text-marinho dark:text-bege">Personalizar o Início</h2>
          <button onClick={onFechar} aria-label="Fechar" className="p-2 -mr-2 text-texto/55 dark:text-bege/55"><Icone nome="x" /></button>
        </div>
        <p className="legenda mt-1 mb-4">Escolha o que aparece e a ordem. O livro do ciclo fica sempre no topo.</p>
        <ul className="divide-y divide-marinho/[0.07] dark:divide-bege/[0.08]">
          {layout.ordem.map((id, i) => {
            const visivel = !layout.ocultos.includes(id)
            return (
              <li key={id} className="flex items-center gap-2 py-2.5">
                <label className="flex-1 flex items-center gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={visivel} onChange={() => alternar(id)} className="w-5 h-5 accent-[#B8912F]" />
                  <span className={`text-[15px] ${visivel ? 'text-marinho dark:text-bege' : 'text-texto/45 dark:text-bege/45 line-through'}`}>{NOMES_BLOCOS[id]}</span>
                </label>
                <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${NOMES_BLOCOS[id]}`} className="p-2.5 text-texto/55 dark:text-bege/55 disabled:opacity-25">
                  <Icone nome="seta-direita" className="w-4 h-4 -rotate-90" />
                </button>
                <button onClick={() => mover(i, 1)} disabled={i === layout.ordem.length - 1} aria-label={`Descer ${NOMES_BLOCOS[id]}`} className="p-2.5 text-texto/55 dark:text-bege/55 disabled:opacity-25">
                  <Icone nome="seta-direita" className="w-4 h-4 rotate-90" />
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex gap-2 mt-4">
          <button onClick={onFechar} className="botao-primario">Pronto</button>
          <button onClick={() => onMudar(PADRAO)} className="botao-secundario">Restaurar padrão</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
