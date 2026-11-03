// Iniciais do membro num círculo. A cor de fundo é derivada do nome, numa
// faixa estreita de tons da paleta (marinho/dourado), pra não virar arco-íris.

const TONS = ['#1B2A4A', '#2C3E66', '#8A6D2B', '#4A5878', '#6B5A2E', '#33476E']

function tomDoNome(nome: string) {
  let h = 0
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONS[h % TONS.length]
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export default function Avatar({ nome, tamanho = 36, destaque = false }: { nome: string; tamanho?: number; destaque?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-bege font-semibold shrink-0 select-none
                  ${destaque ? 'ring-2 ring-dourado ring-offset-2 ring-offset-folha dark:ring-offset-noite-cartao' : ''}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38, backgroundColor: tomDoNome(nome) }}
      aria-hidden="true"
    >
      {iniciais(nome)}
    </span>
  )
}
