// Vídeo curto do cartão de leitura (números subindo até o valor real), gravado
// no próprio navegador a partir do desenho do cartão. Sem servidor e sem
// biblioteca: canvas.captureStream + MediaRecorder.
//
// Instagram e WhatsApp aceitam MP4. Chrome recente e Safari gravam MP4; onde
// só existir WebM, o vídeo sai em WebM e o app avisa.

export interface FormatoVideo { mime: string; ext: 'mp4' | 'webm' }

export function formatoDeVideo(): FormatoVideo | null {
  if (typeof window === 'undefined' || !('MediaRecorder' in window)) return null
  const opcoes: FormatoVideo[] = [
    { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mime: 'video/mp4;codecs=avc1', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' }
  ]
  return opcoes.find((o) => MediaRecorder.isTypeSupported(o.mime)) ?? null
}

/**
 * Curva do vídeo (t de 0 a 1 → quanto do número real aparece):
 * parado no zero no começo, sobe com freio no fim e segura o valor final
 * por um bom tempo, para dar tempo de ler.
 */
export function curvaDoVideo(t: number): number {
  if (t <= 0.12) return 0
  if (t >= 0.6) return 1
  const x = (t - 0.12) / 0.48
  return 1 - Math.pow(1 - x, 3)
}

/** Grava o vídeo chamando `desenhar(canvas, t)` quadro a quadro. */
export async function gravarAnimacao(
  desenhar: (canvas: HTMLCanvasElement, t: number) => Promise<void>,
  largura: number,
  altura: number,
  duracaoMs = 6000
): Promise<{ blob: Blob; formato: FormatoVideo }> {
  const formato = formatoDeVideo()
  if (!formato) throw new Error('Este navegador não grava vídeo.')
  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const ctx = tela.getContext('2d')!
  const quadro = document.createElement('canvas')
  // primeiro quadro desenhado antes de começar, para o vídeo não abrir preto
  await desenhar(quadro, 0)
  ctx.drawImage(quadro, 0, 0, largura, altura)

  const fluxo = (tela as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30)
  const gravador = new MediaRecorder(fluxo, { mimeType: formato.mime, videoBitsPerSecond: 8_000_000 })
  const pedacos: Blob[] = []
  gravador.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data) }
  const terminou = new Promise<void>((ok) => { gravador.onstop = () => ok() })
  gravador.start(250)

  const inicio = performance.now()
  for (;;) {
    const passado = performance.now() - inicio
    if (passado >= duracaoMs) break
    await desenhar(quadro, passado / duracaoMs)
    ctx.drawImage(quadro, 0, 0, largura, altura)
    await new Promise((ok) => requestAnimationFrame(() => ok(null)))
  }
  await desenhar(quadro, 1)
  ctx.drawImage(quadro, 0, 0, largura, altura)
  await new Promise((ok) => setTimeout(ok, 120))
  gravador.stop()
  await terminou
  fluxo.getTracks().forEach((t) => t.stop())
  return { blob: new Blob(pedacos, { type: formato.mime.split(';')[0] }), formato }
}
