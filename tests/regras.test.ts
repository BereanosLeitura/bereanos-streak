// Testes das regras puras do app. Rodar com: npm test
// (Node 22.18+ executa TypeScript direto, sem instalar nada.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { formatarTempo, formatarTempoEstimado, marcoAtravessado, aFrente, dataDoRegistro, juntarNomes, terminouLivro, dataLocal, limitesDoPeriodo } from '../src/lib/regras.ts'
import { contar, chaveDia, paginasEquivalentes, paginasPorDia, sequenciaAtual, maiorSequencia, diasAte } from '../src/lib/estatisticas.ts'
import { ROTEIRO_PADRAO } from '../src/lib/roteiro.ts'

const dia = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return chaveDia(d) }

test('contar concorda singular e plural', () => {
  assert.equal(contar(1, 'página', 'páginas'), '1 página')
  assert.equal(contar(0, 'página', 'páginas'), '0 páginas')
  assert.equal(contar(2.4, 'dia', 'dias'), '2 dias')
  assert.equal(contar(1.2, 'minuto', 'minutos'), '1 minuto')
  assert.equal(contar(1200, 'página', 'páginas'), '1.200 páginas')
})

test('formatarTempo e estimativa', () => {
  assert.equal(formatarTempo(45), '45 min')
  assert.equal(formatarTempo(60), '1h')
  assert.equal(formatarTempo(90), '1h30')
  assert.equal(formatarTempo(65), '1h05')
  assert.equal(formatarTempoEstimado(501), '8h20')
  assert.equal(formatarTempoEstimado(0.4), '1 min')
})

test('marcos de 25, 50 e 75% (100% fica para a tela de terminei)', () => {
  assert.equal(marcoAtravessado(20, 26), 25)
  assert.equal(marcoAtravessado(20, 80), 75)
  assert.equal(marcoAtravessado(50, 60), null) // já estava em 50
  assert.equal(marcoAtravessado(49.9, 50), 50)
  assert.equal(marcoAtravessado(80, 100), null)
  assert.equal(marcoAtravessado(10, 20), null)
})

test('mural sem spoiler', () => {
  assert.equal(aFrente({ pagina: 120, membro_id: 'outro' }, 'eu', 41), true)
  assert.equal(aFrente({ pagina: 41, membro_id: 'outro' }, 'eu', 41), false)
  assert.equal(aFrente({ pagina: 120, membro_id: 'eu' }, 'eu', 41), false) // as minhas nunca escondem
  assert.equal(aFrente({ pagina: null, membro_id: 'outro' }, 'eu', 41), false) // sem página
  assert.equal(aFrente({ pagina: 120, membro_id: 'outro' }, 'eu', null), false) // terminou o livro
})

test('data do registro: hoje, ontem, outro dia, horário e nunca no futuro', () => {
  const agora = new Date(2026, 10, 9, 17, 30) // 9/11/2026 17:30 local
  assert.equal(dataDoRegistro(0, '', '', agora).getTime(), agora.getTime())
  const ontem = dataDoRegistro(1, '', '', agora)
  assert.deepEqual([ontem.getDate(), ontem.getHours(), ontem.getMinutes()], [8, 20, 0])
  const comHora = dataDoRegistro(2, '', '07:15', agora)
  assert.deepEqual([comHora.getDate(), comHora.getHours(), comHora.getMinutes()], [7, 7, 15])
  const outro = dataDoRegistro('outro', '2026-11-03', '22:05', agora)
  assert.deepEqual([outro.getMonth(), outro.getDate(), outro.getHours()], [10, 3, 22])
  // 'outro' com o próprio dia de hoje e hora futura não passa de agora
  assert.ok(dataDoRegistro('outro', '2026-11-09', '23:00', agora).getTime() <= agora.getTime())
})

test('páginas equivalentes: minutos viram páginas pelo ritmo', () => {
  const r = { paginas_lidas: 10, minutos_lidos: 30, registrado_em: new Date().toISOString() }
  assert.equal(paginasEquivalentes(r, 3), 20)
  assert.equal(paginasEquivalentes({ ...r, minutos_lidos: null }, 3), 10)
  assert.equal(paginasEquivalentes({ paginas_lidas: null, minutos_lidos: 10, registrado_em: r.registrado_em }, 0), 5) // ritmo 0 cai para 2
  const mapa = paginasPorDia([r, { ...r, minutos_lidos: null }], 3)
  assert.equal(mapa.get(chaveDia(r.registrado_em)), 30)
})

test('sequência de dias: hoje ainda não lido não quebra a de ontem', () => {
  assert.deepEqual(sequenciaAtual(new Set([dia(0), dia(-1), dia(-2)])), { dias: 3, leuHoje: true })
  assert.deepEqual(sequenciaAtual(new Set([dia(-1), dia(-2)])), { dias: 2, leuHoje: false })
  assert.equal(sequenciaAtual(new Set([dia(-3)])).dias, 0)
  assert.equal(maiorSequencia(new Set([dia(-10), dia(-9), dia(-8), dia(-2)])), 3)
})

test('dias restantes contam o dia de hoje', () => {
  const d = new Date(); d.setDate(d.getDate() + 5)
  assert.equal(diasAte(chaveDia(d)), 6) // hoje + 5 dias
  assert.equal(diasAte(chaveDia(new Date())), 1) // termina hoje: ainda há hoje
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
  assert.equal(diasAte(chaveDia(ontem)), 0) // ciclo já acabou
  assert.equal(diasAte(null), null)
})

test('roteiro do encontro soma 2h30', () => {
  assert.equal(ROTEIRO_PADRAO.reduce((a, b) => a + b.minutos, 0), 150)
})

test('rede de segurança das animações existe (número e barra não ficam em 0)', () => {
  const src = readFileSync(new URL('../src/components/BarraBrilho.tsx', import.meta.url), 'utf8')
  // sem isso, se requestAnimationFrame não rodar (aba de fundo, economia de
  // energia), o número grande e a barra ficam presos em 0 mostrando valor errado
  const redes = src.match(/setTimeout/g) ?? []
  assert.ok(redes.length >= 2, 'useNumeroAnimado e BarraBrilho precisam cada um de uma rede de segurança por tempo')
  assert.match(src, /clearTimeout/, 'a rede de segurança precisa ser cancelada na limpeza do efeito')
})

// ---------- aviso semanal do admin ----------
import { mensagemDaSemana } from '../src/lib/avisoSemana.ts'

const LIVRO = { titulo: 'Cartas de um Diabo a Seu Aprendiz', autor: 'C. S. Lewis', paginas_totais: 208 }
const NUMEROS = {
  paginasGrupo: 142, mediaPct: 34, jaLeram: 2, comAcesso: 2,
  leramNaSemana: 2, metaDaSemana: 104, anotacoesMural: 7, diasRestantes: 17
}

test('mensagem da semana traz os números e nunca cobra', () => {
  const t = mensagemDaSemana(LIVRO, NUMEROS)
  assert.match(t, /Cartas de um Diabo a Seu Aprendiz, de C\. S\. Lewis/)
  assert.match(t, /142 páginas/)
  assert.match(t, /34% da leitura/)
  assert.match(t, /página 104/)
  assert.match(t, /não uma cobrança/)
  assert.match(t, /7 anotações/)
  assert.match(t, /aproveitar bem a leitura/)
  // nada de ranking ou nome de membro
  assert.doesNotMatch(t, /1º|ranking|primeiro lugar|ganhou/i)
})

test('mensagem da semana aguenta ciclo sem plano e grupo sem leitura', () => {
  const t = mensagemDaSemana(
    { titulo: 'O Peregrino', autor: null, paginas_totais: 280 },
    { paginasGrupo: 0, mediaPct: 0, jaLeram: 0, comAcesso: 5, leramNaSemana: 0, metaDaSemana: null, anotacoesMural: 0, diasRestantes: 3 }
  )
  assert.match(t, /Estamos em O Peregrino\./)
  assert.match(t, /0 páginas deste livro\./)
  assert.match(t, /Faltam 3 dias de ciclo\./)
  assert.doesNotMatch(t, /média/)
  assert.doesNotMatch(t, /mural/)
})

test('mensagem da semana inclui o encontro quando há data', () => {
  const t = mensagemDaSemana(
    { ...LIVRO, encontro_em: '2026-11-28T17:00:00.000Z', encontro_local: 'Igreja, Sala dos Jovens' },
    NUMEROS
  )
  assert.match(t, /Próximo encontro: .*28 de novembro, às \d{2}:\d{2}, Igreja, Sala dos Jovens\./)
})

test('juntarNomes usa vírgula e "e" no último', () => {
  assert.equal(juntarNomes([]), '')
  assert.equal(juntarNomes(['Ana']), 'Ana')
  assert.equal(juntarNomes(['Ana', 'Bia']), 'Ana e Bia')
  assert.equal(juntarNomes(['Ana', 'Bia', 'Caio']), 'Ana, Bia e Caio')
})

test('terminouLivro aceita a última página ou a marcação "Terminei"', () => {
  assert.equal(terminouLivro(208, 208), true)
  assert.equal(terminouLivro(150, 208), false)
  assert.equal(terminouLivro(150, 208, 'terminou'), true)
  assert.equal(terminouLivro(150, 208, 'deixou'), false)
})

test('dataLocal não vira o dia às 22h (fuso de Fortaleza)', () => {
  const d = new Date(2026, 10, 21, 22, 30) // 21/11, 22h30 no horário local
  assert.equal(dataLocal(d), '2026-11-21')
})

test('limitesDoPeriodo cobre o dia local inteiro', () => {
  const { de, ate } = limitesDoPeriodo('2026-11-15', '2026-11-21')
  assert.equal(new Date(de).getDate(), 15)
  assert.equal(new Date(de).getHours(), 0)
  assert.equal(new Date(ate).getDate(), 21)
  assert.equal(new Date(ate).getHours(), 23)
})
