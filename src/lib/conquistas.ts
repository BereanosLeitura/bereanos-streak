import type { NomeIcone } from '../components/Icone'

// Organização das conquistas no app. Quem concede é o banco (gatilhos das
// migrações 0004 e 0009); aqui só definimos ícone, grupo e ordem de exibição.

export const ICONE_CONQUISTA: Record<string, NomeIcone> = {
  'book-check': 'livro', medal: 'estante', book: 'livro', timer: 'relogio', clock: 'relogio',
  flame: 'chama', flag: 'alvo', share: 'compartilhar', target: 'alvo', calendar: 'calendario',
  sun: 'sol', moon: 'lua', pen: 'pena', question: 'interrogacao', quote: 'aspas', bulb: 'lampada', group: 'grupo'
}

export const GRUPOS_CONQUISTA: { titulo: string; chaves: string[] }[] = [
  { titulo: 'Constância', chaves: ['streak', 'constancia_7', 'constancia_30', 'dias_30', 'dias_100', 'fim_de_semana', 'leitura_manha', 'leitura_noite'] },
  { titulo: 'Livros e páginas', chaves: ['primeira_leitura', 'no_prazo', 'na_dianteira', 'maratonista_3', 'maratonista_5', 'maratonista_10', 'paginas_500', 'paginas_1000'] },
  { titulo: 'Foco', chaves: ['foco_de_verdade', 'imersao', 'ciclo_completo', 'hora_de_leitura_10', 'hora_de_leitura_50', 'hora_de_leitura_100'] },
  { titulo: 'Examinar e anotar', chaves: ['primeira_anotacao', 'reflexivo', 'examinador', 'guardador_trechos'] },
  { titulo: 'Metas e comunhão', chaves: ['meta_batida', 'meta_mensal', 'voz_no_mural', 'compartilhou_jornada'] }
]
