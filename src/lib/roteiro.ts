// Roteiro padrão do encontro mensal (cerca de 2h30). Ajustável no Modo Encontro.
export interface Bloco { titulo: string; minutos: number }

export const ROTEIRO_PADRAO: Bloco[] = [
  { titulo: 'Acolhimento e oração', minutos: 10 },
  { titulo: 'Leitura do discurso de abertura', minutos: 5 },
  { titulo: 'Reflexão sobre o livro', minutos: 35 },
  { titulo: 'Dialogando sobre a leitura', minutos: 70 },
  { titulo: 'Considerações finais', minutos: 20 },
  { titulo: 'Comunhão e encerramento', minutos: 10 }
]
