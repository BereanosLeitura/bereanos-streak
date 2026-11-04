import Dexie, { type Table } from 'dexie'

// Camada local (IndexedDB) para funcionamento offline.
// Leitura e escrita do app passam por aqui primeiro; a sincronização
// com o Supabase roda por trás, em segundo plano, quando há conexão.

export interface RegistroLeituraLocal {
  id: string // uuid gerado no cliente
  membro_id: string
  livro_id: string
  origem: 'pomodoro' | 'manual'
  paginas_lidas: number | null
  minutos_lidos: number | null
  tempo_minutos?: number | null // tempo informado à mão (não vira páginas)
  registrado_em: string
  sync_status: 'pendente' | 'sincronizado' | 'erro'
}

export interface SessaoPomodoroLocal {
  id: string
  membro_id: string
  livro_id: string
  inicio: string
  fim: string | null
  duracao_minutos: number | null
  status: 'em_andamento' | 'concluida' | 'cancelada'
  sync_status: 'pendente' | 'sincronizado' | 'erro'
}

class AppDB extends Dexie {
  registros!: Table<RegistroLeituraLocal, string>
  sessoesPomodoro!: Table<SessaoPomodoroLocal, string>

  constructor() {
    super('bereanos-streak-db')
    this.version(1).stores({
      registros: 'id, membro_id, livro_id, sync_status, registrado_em',
      sessoesPomodoro: 'id, membro_id, livro_id, sync_status, status'
    })
  }
}

export const db = new AppDB()
