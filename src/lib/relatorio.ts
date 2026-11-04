import { supabase } from './supabase'
import { calcularPanorama } from './infograficos'

// Relatório do ciclo: página A4 pronta para "Salvar como PDF" no navegador.
// Reúne números do grupo, encontro (presença), perguntas, aplicações e
// destaques do mural. Anotações privadas nunca entram.

interface LivroBase { id: string; titulo: string; autor: string | null; paginas_totais: number; ciclo_inicio: string | null; ciclo_fim: string | null }

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const dataLonga = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

export async function abrirRelatorioCiclo(livro: LivroBase): Promise<boolean> {
  // abre a janela já no clique, para o navegador não bloquear
  const janela = window.open('', '_blank')
  if (!janela) return false
  janela.document.write('<p style="font-family:serif;padding:40px">Montando o relatório…</p>')

  const [pan, enc, mural, dest] = await Promise.all([
    calcularPanorama(livro),
    supabase.from('encontros').select('id, data, local, mediador, ata, perguntas_discutidas').eq('livro_id', livro.id).order('data', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('anotacoes').select('id, tipo, texto, pagina, referencia, perfis(nome_exibicao)').eq('livro_id', livro.id).eq('compartilhada', true).order('pagina', { ascending: true, nullsFirst: false }),
    supabase.from('destaques').select('anotacao_id')
  ])
  const notas = (mural.data ?? []) as unknown as { id: string; tipo: string; texto: string; pagina: number | null; referencia: string | null; perfis: { nome_exibicao: string } | null }[]
  const destaques = new Set((dest.data ?? []).map((d) => d.anotacao_id))
  const encontro = enc.data as { id: string; data: string; local: string | null; mediador: string | null; ata: string | null; perguntas_discutidas: string[] } | null
  let presentes: string[] = []
  if (encontro) {
    const { data } = await supabase.from('presencas').select('perfis(nome_exibicao)').eq('encontro_id', encontro.id)
    presentes = ((data ?? []) as unknown as { perfis: { nome_exibicao: string } | null }[]).map((p) => p.perfis?.nome_exibicao ?? '').filter(Boolean).sort()
  }

  const item = (n: (typeof notas)[number], marcar = false) =>
    `<li>${n.tipo === 'trecho' ? `<em>“${esc(n.texto)}”</em>` : esc(n.texto)}<span class="meta"> ${esc(n.perfis?.nome_exibicao ?? 'Membro')}${n.pagina ? `, p. ${n.pagina}` : ''}${n.referencia ? `, ${esc(n.referencia)}` : ''}${marcar ? ', discutida no encontro' : ''}</span></li>`
  const perguntas = notas.filter((n) => n.tipo === 'pergunta')
  const aplicacoes = notas.filter((n) => n.tipo === 'aplicacao')
  const destacadas = notas.filter((n) => destaques.has(n.id))
  const ciclo = livro.ciclo_inicio || livro.ciclo_fim
    ? `Ciclo ${livro.ciclo_inicio ? `de ${dataLonga(livro.ciclo_inicio)} ` : ''}${livro.ciclo_fim ? `a ${dataLonga(livro.ciclo_fim)}` : ''}`
    : ''
  const origem = window.location.origin

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório do ciclo: ${esc(livro.titulo)}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: 'Times New Roman', Times, serif; color: #222222; font-size: 12pt; line-height: 1.5; max-width: 17cm; margin: 0 auto; padding: 24px 0; }
header { text-align: center; }
header img { height: 64px; }
h1 { color: #1B2A4A; font-size: 22pt; margin: 14px 0 2px; font-weight: normal; }
.sub { color: #8A6D2B; margin: 0; }
.orn { display: flex; align-items: center; justify-content: center; gap: 10px; margin: 18px 0; }
.orn span { height: 1px; width: 90px; background: #B8912F; }
.orn i { width: 8px; height: 8px; background: #B8912F; transform: rotate(45deg); display: block; }
h2 { color: #1B2A4A; font-size: 14pt; border-bottom: 1px solid #B8912F; padding-bottom: 3px; margin-top: 26px; font-weight: normal; }
.nums { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; background: #F6F1E3; padding: 12px; border-left: 3px solid #B8912F; }
.nums b { display: block; font-size: 18pt; color: #1B2A4A; font-weight: normal; }
.nums small { color: #555; font-size: 9.5pt; }
ul { padding-left: 18px; } li { margin-bottom: 6px; }
.meta { color: #8A6D2B; font-size: 10pt; }
.ata { white-space: pre-line; background: #F6F1E3; padding: 12px 14px; border-left: 3px solid #B8912F; }
footer { text-align: center; color: #8A6D2B; font-size: 10pt; margin-top: 32px; }
.dica { text-align: center; font-family: Arial, sans-serif; font-size: 11px; color: #777; }
@media print { .dica { display: none; } }
</style></head><body>
<p class="dica">Para salvar em PDF: imprimir e escolher "Salvar como PDF".</p>
<header>
<img src="${origem}/logo/horizontal-preto.png" alt="Clube do Livro Bereanos">
<h1>${esc(livro.titulo)}</h1>
<p class="sub">${livro.autor ? esc(livro.autor) + ', ' : ''}${livro.paginas_totais} páginas</p>
${ciclo ? `<p class="sub">${ciclo}</p>` : ''}
</header>
<div class="orn"><span></span><i></i><span></span></div>

<h2>O clube neste livro</h2>
<div class="nums">
<div><b>${pan.paginasGrupo}</b><small>páginas lidas juntos</small></div>
<div><b>${pan.leitores}</b><small>${pan.leitores === 1 ? 'leitor' : 'leitores'}</small></div>
<div><b>${pan.terminaram}</b><small>${pan.terminaram === 1 ? 'terminou' : 'terminaram'}</small></div>
<div><b>${pan.mediaPct}%</b><small>média lida</small></div>
</div>

${encontro ? `<h2>Encontro</h2>
<p>${new Date(encontro.data).toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}${encontro.local ? `, ${esc(encontro.local)}` : ''}.${encontro.mediador ? ` Mediação: ${esc(encontro.mediador)}.` : ''}</p>
${presentes.length ? `<p>Presentes (${presentes.length}): ${presentes.map(esc).join(', ')}.</p>` : ''}
` : ''}

${perguntas.length ? `<h2>Perguntas do grupo</h2><ul>${perguntas.map((n) => item(n, !!encontro?.perguntas_discutidas?.includes(n.id))).join('')}</ul>` : ''}
${aplicacoes.length ? `<h2>O que o grupo decidiu aplicar</h2><ul>${aplicacoes.map((n) => item(n)).join('')}</ul>` : ''}
${destacadas.length ? `<h2>Destaques do clube</h2><ul>${destacadas.map((n) => item(n)).join('')}</ul>` : ''}

<div class="orn"><span></span><i></i><span></span></div>
<footer>Ler. Examinar. Dialogar. Aplicar.<br>Gerado em ${dataLonga(new Date().toISOString())}</footer>
<script>window.onload = function () { setTimeout(function () { window.print() }, 400) }</script>
</body></html>`

  janela.document.open()
  janela.document.write(html)
  janela.document.close()
  return true
}
