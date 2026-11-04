// Downloads simples gerados no próprio aparelho.

function celula(v: unknown): string {
  if (v === null || v === undefined) return ''
  const t = String(v)
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/** CSV com ponto e vírgula e BOM: abre certo no Excel em português. */
export function baixarCsv(nome: string, cabecalho: string[], linhas: unknown[][]) {
  const texto = '﻿' + [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n')
  baixarTexto(nome, texto, 'text/csv;charset=utf-8')
}

export function baixarTexto(nome: string, texto: string, tipo = 'text/plain;charset=utf-8') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }))
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
