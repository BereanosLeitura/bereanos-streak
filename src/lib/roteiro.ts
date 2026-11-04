// Roteiro padrão do encontro mensal (cerca de 1h30). Ajustável no Modo Encontro.
export interface Bloco { titulo: string; minutos: number }

export const ROTEIRO_PADRAO: Bloco[] = [
  { titulo: 'Acolhimento e oração', minutos: 10 },
  { titulo: 'Apresentação do livro', minutos: 10 },
  { titulo: 'Reflexão e discussão', minutos: 35 },
  { titulo: 'Perguntas do grupo', minutos: 15 },
  { titulo: 'Aplicação', minutos: 10 },
  { titulo: 'Comunhão e encerramento', minutos: 10 }
]
