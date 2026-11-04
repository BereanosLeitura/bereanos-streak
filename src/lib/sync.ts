import { supabase } from './supabase'
import { db, type RegistroLeituraLocal, type SessaoPomodoroLocal } from './db-local'

// Sincroniza tudo que está pendente no IndexedDB com o Supabase.
// Chamado: ao abrir o app, ao voltar a ficar online, e logo após criar um registro.
// Nunca lança erro para quem chamou — falha de rede aqui é esperada e silenciosa,
// o item simplesmente continua "pendente" até a próxima tentativa.

// Uma sincronização por vez: chamadas que chegam durante uma em andamento
// esperam a mesma, em vez de enviar os mesmos itens em paralelo.
let emAndamento: Promise<void> | null = null

export async function sincronizarTudo() {
  if (!navigator.onLine) return
  if (emAndamento) return emAndamento
  emAndamento = (async () => {
    try {
      await sincronizarRegistros()
      await sincronizarPomodoros()
    } finally {
      emAndamento = null
    }
  })()
  return emAndamento
}

async function sincronizarRegistros() {
  const pendentes = await db.registros.where('sync_status').anyOf('pendente', 'erro').toArray()
  for (const r of pendentes) {
    try {
      const { error } = await supabase.from('registros_leitura').upsert({
        id: r.id,
        membro_id: r.membro_id,
        livro_id: r.livro_id,
        origem: r.origem,
        paginas_lidas: r.paginas_lidas,
        minutos_lidos: r.minutos_lidos,
        ...(r.tempo_minutos ? { tempo_minutos: r.tempo_minutos } : {}),
        registrado_em: r.registrado_em
      })
      if (error) throw error
      await db.registros.update(r.id, { sync_status: 'sincronizado' })
    } catch {
      await db.registros.update(r.id, { sync_status: 'erro' })
    }
  }
}

async function sincronizarPomodoros() {
  const pendentes = await db.sessoesPomodoro.where('sync_status').anyOf('pendente', 'erro').toArray()
  for (const s of pendentes) {
    try {
      const { error } = await supabase.from('sessoes_pomodoro').upsert({
        id: s.id,
        membro_id: s.membro_id,
        livro_id: s.livro_id,
        inicio: s.inicio,
        fim: s.fim,
        duracao_minutos: s.duracao_minutos,
        status: s.status
      })
      if (error) throw error
      await db.sessoesPomodoro.update(s.id, { sync_status: 'sincronizado' })
    } catch {
      await db.sessoesPomodoro.update(s.id, { sync_status: 'erro' })
    }
  }
}

export async function contarPendentes(): Promise<number> {
  const a = await db.registros.where('sync_status').notEqual('sincronizado').count()
  const b = await db.sessoesPomodoro.where('sync_status').notEqual('sincronizado').count()
  return a + b
}

export async function criarRegistroLeitura(dados: {
  membro_id: string
  livro_id: string
  origem: 'pomodoro' | 'manual'
  paginas_lidas: number | null
  minutos_lidos: number | null
  registrado_em?: string // para lançar uma leitura de outro dia (ex.: ontem)
  tempo_minutos?: number | null
}): Promise<RegistroLeituraLocal> {
  try { navigator.vibrate?.(15) } catch { /* sem vibração */ }
  const registro: RegistroLeituraLocal = {
    id: crypto.randomUUID(),
    ...dados,
    registrado_em: dados.registrado_em ?? new Date().toISOString(),
    sync_status: 'pendente'
  }
  await db.registros.add(registro)
  // Aguarda a tentativa de sincronização terminar antes de devolver o controle.
  // Isso evita que a tela seguinte (ex: Início, que busca o progresso coletivo
  // direto do Supabase) carregue ANTES do registro ter chegado ao servidor —
  // um bug real encontrado em teste: offline, isso não bloqueia nada, porque
  // sincronizarTudo() retorna na hora quando não há conexão.
  await sincronizarTudo()
  return registro
}

/** Apaga um registro (no servidor e na cópia local). Usado pelo "desfazer". */
export async function apagarRegistroLeitura(id: string) {
  await db.registros.delete(id).catch(() => {})
  const { error } = await supabase.from('registros_leitura').delete().eq('id', id)
  return !error
}

export async function salvarSessaoPomodoro(sessao: SessaoPomodoroLocal) {
  await db.sessoesPomodoro.put(sessao)
  await sincronizarTudo()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => sincronizarTudo())
}
