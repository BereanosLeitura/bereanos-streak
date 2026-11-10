import { useEffect, useRef, useState } from 'react'

// Barra de progresso com brilho: cresce até o valor ao aparecer, um reflexo
// dourado corre por ela e pequenas faíscas sobem da ponta. Respeita
// "reduzir movimento" do sistema (aí fica uma barra estática).

export function reduzirMovimento() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Número que conta até o alvo (e de um valor para outro quando muda). */
export function useNumeroAnimado(alvo: number, ms = 1100) {
  const [valor, setValor] = useState(() => (reduzirMovimento() ? alvo : 0))
  const atual = useRef(valor)
  useEffect(() => {
    if (reduzirMovimento() || !Number.isFinite(alvo)) {
      atual.current = alvo
      setValor(alvo)
      return
    }
    const de = atual.current
    if (de === alvo) return
    let inicio: number | null = null
    let quadro = 0
    const passo = (t: number) => {
      if (inicio === null) inicio = t
      const k = Math.min(1, (t - inicio) / ms)
      const suave = 1 - Math.pow(1 - k, 3)
      const v = Math.round(de + (alvo - de) * suave)
      atual.current = v
      setValor(v)
      if (k < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    // Rede de segurança: em aba de fundo, modo de economia de energia ou
    // qualquer situação em que a animação não roda, mostra o número certo
    // assim mesmo. Sem isso o valor ficaria preso em 0.
    const rede = setTimeout(() => {
      if (atual.current !== alvo) { atual.current = alvo; setValor(alvo) }
    }, ms + 400)
    return () => { cancelAnimationFrame(quadro); clearTimeout(rede) }
  }, [alvo, ms])
  return valor
}

interface Props {
  pct: number
  /** classe de altura do trilho, ex.: 'h-1.5' */
  altura?: string
  /** classe de cor do trilho */
  trilho?: string
  /** texto para leitores de tela, ex.: "página 41 de 208" */
  rotulo?: string
  /** liga as faíscas na ponta (padrão: sim) */
  faiscas?: boolean
  className?: string
}

export function BarraBrilho({ pct, altura = 'h-2', trilho = 'bg-marinho/[0.08] dark:bg-bege/[0.1]', rotulo, faiscas = true, className = '' }: Props) {
  const alvo = Math.max(0, Math.min(100, Math.round(pct)))
  const [largura, setLargura] = useState(() => (reduzirMovimento() ? alvo : 0))
  useEffect(() => {
    // espera um quadro para a transição de largura acontecer; o tempo é a rede
    // de segurança para quando a animação não roda (aba de fundo, economia de
    // energia), senão a barra ficaria vazia mostrando progresso errado
    const q = requestAnimationFrame(() => setLargura(alvo))
    const rede = setTimeout(() => setLargura(alvo), 400)
    return () => { cancelAnimationFrame(q); clearTimeout(rede) }
  }, [alvo])

  const completo = alvo >= 100
  return (
    <div
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={alvo}
      aria-valuetext={rotulo ?? `${alvo}%`}
      className={`relative ${className}`}
    >
      <div className={`${altura} ${trilho} rounded-full overflow-hidden`}>
        <div className={`brilho-faixa h-full rounded-full barra-progresso ${completo ? 'brilho-completo' : ''}`} style={{ width: `${largura}%` }} />
      </div>
      {faiscas && alvo > 0 && !completo && (
        <span className="faiscas" style={{ left: `${largura}%` }} aria-hidden="true">
          <span style={{ ['--dx' as string]: '-6px', animationDelay: '0s' }} />
          <span style={{ ['--dx' as string]: '5px', animationDelay: '.8s' }} />
          <span style={{ ['--dx' as string]: '-2px', animationDelay: '1.6s' }} />
        </span>
      )}
    </div>
  )
}
