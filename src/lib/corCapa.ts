import { useEffect, useState } from 'react'

// Tom da capa: tira a cor média (mais saturada) da capa do livro e devolve uma
// versão escura e contida, para tingir de leve o card do Início sem tirar o
// contraste do texto. Se a imagem não deixar ler os pixels, fica sem tom.

const cache = new Map<string, string | null>()

function rgbParaHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  return [h * 360, s, l]
}

async function extrair(url: string): Promise<string | null> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.decoding = 'async'
  img.src = url
  await img.decode()
  const c = document.createElement('canvas')
  c.width = 24; c.height = 36
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  // média ponderada pela saturação: puxa a cor marcante, não o cinza
  let R = 0, G = 0, B = 0, P = 0
  for (let i = 0; i < d.length; i += 4) {
    const [, s, l] = rgbParaHsl(d[i], d[i + 1], d[i + 2])
    const peso = 0.15 + s * (1 - Math.abs(l - 0.5) * 1.6)
    if (peso <= 0) continue
    R += d[i] * peso; G += d[i + 1] * peso; B += d[i + 2] * peso; P += peso
  }
  if (!P) return null
  const [h, s] = rgbParaHsl(R / P, G / P, B / P)
  // escuro e contido: o texto bege continua legível
  return `hsl(${Math.round(h)} ${Math.round(Math.min(0.55, s) * 100)}% 26%)`
}

export function useCorDaCapa(url: string | null | undefined) {
  const [cor, setCor] = useState<string | null>(() => (url ? cache.get(url) ?? null : null))
  useEffect(() => {
    if (!url) { setCor(null); return }
    if (cache.has(url)) { setCor(cache.get(url) ?? null); return }
    let vivo = true
    extrair(url).catch(() => null).then((c) => { cache.set(url, c); if (vivo) setCor(c) })
    return () => { vivo = false }
  }, [url])
  return cor
}
