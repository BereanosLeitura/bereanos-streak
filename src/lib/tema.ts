export type TemaPreferido = 'claro' | 'escuro' | 'azul' | 'sistema'

const CHAVE_LOCAL = 'bereanos-streak-tema'

// Três aparências:
// - claro: papel bege, a base da identidade do clube
// - escuro: preto quente, o mesmo das faixas do Caderno de Leitura
// - azul: azul-marinho do clube
// Escuro e azul usam a classe "dark" do Tailwind; o que muda entre eles são
// as variáveis de cor de fundo (ver styles/index.css).
const COR_BARRA: Record<'claro' | 'escuro' | 'azul', string> = {
  claro: '#F6F1E3',
  escuro: '#141414',
  azul: '#16223D'
}

export function temaEfetivo(tema: TemaPreferido): 'claro' | 'escuro' | 'azul' {
  if (tema !== 'sistema') return tema
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function aplicarTema(tema: TemaPreferido) {
  const efetivo = temaEfetivo(tema)
  const raiz = document.documentElement
  raiz.classList.toggle('dark', efetivo !== 'claro')
  raiz.classList.toggle('tema-azul', efetivo === 'azul')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[efetivo])
  try {
    localStorage.setItem(CHAVE_LOCAL, tema)
  } catch {
    // modo privado etc.: não é crítico
  }
}

export function temaSalvoLocal(): TemaPreferido {
  try {
    const valor = localStorage.getItem(CHAVE_LOCAL)
    if (valor === 'claro' || valor === 'escuro' || valor === 'azul' || valor === 'sistema') return valor
  } catch {
    // ignora
  }
  return 'sistema'
}
