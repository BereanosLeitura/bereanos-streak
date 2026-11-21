> Documento histórico (02/11/2026): a especificação que deu origem ao app. O app mudou de nome para Bereanos | Leitura, saiu do Netlify para a Vercel e ganhou muitas telas depois disto. O estado atual está no README.

# Bereanos | Streak — Especificação do App (v1)

Protótipo pessoal de Felipe, fora dos materiais oficiais do Clube do Livro Bereanos. Nome interno "Streak" autorizado apenas dentro deste app — não usar esse termo em material oficial do clube.

Status: v1 do piloto construída (ver pasta `bereanos-streak-app/`). Nada publicado no ar ainda — falta você criar o projeto no Supabase e, se quiser testar no celular, o site no Netlify (passo a passo no README do app).

---

## 1. Visão geral

App de produtividade de leitura para até 10 membros do Bereanos, minimalista, com:
- Progresso de leitura individual e coletivo (todos veem o progresso de todos)
- Metas de leitura (semanal e mensal)
- Modo Pomodoro para sessões de foco
- Conquistas visuais discretas (sóbrias, sem aparência de app de jogo)
- Geração de card de progresso para compartilhar manualmente no grupo do WhatsApp
- Login próprio, modo claro/escuro, uso online e offline, desktop e celular (PWA)

## 2. Papéis de acesso

**Admin (Felipe):**
- Cadastra o livro do ciclo (manual ou buscado na internet)
- Cria o acesso de cada membro (ver fluxo abaixo)
- Pode editar/remover conquistas e ajustar metas padrão
- Vê o mesmo progresso coletivo que os membros

**Membro:**
- Completa o próprio perfil no primeiro acesso
- Registra leitura (manual ou via Pomodoro)
- Define suas próprias metas (dentro de limites que o admin pode sugerir)
- Vê o progresso de todos, suas conquistas e as dos outros
- Gera e baixa/compartilha seu card de progresso

## 3. Fluxo de acesso (proposta)

Processo em duas etapas, como você descreveu:

1. **Admin cria o acesso** (decidido: senha temporária, não convite por e-mail): você cria o usuário no Supabase com uma senha temporária única por pessoa e passa individualmente por WhatsApp. O campo `senha_temporaria` no perfil força a troca no primeiro login — isso já está implementado na tela "Completar perfil" do piloto. Cuidado operacional: nunca reutilize a mesma senha temporária para mais de um membro.
2. **Membro completa o perfil no primeiro login**: nome completo, nome de exibição (o que aparece para o grupo), data de nascimento, e troca de senha. Já funciona no piloto.
   - Data de nascimento (decidido: usar): destaque discreto de aniversário na tela inicial no dia — ainda não implementado neste piloto, entra na próxima etapa.

## 4. Modo claro/escuro

Alterna automaticamente pelo tema do sistema operacional por padrão, com opção de forçar claro ou escuro manualmente nas configurações do app (preferência salva por membro). Paleta sóbria, coerente com a identidade visual do Bereanos (azul-marinho, dourado, bege), não um tema genérico de app.

## 5. Livros

Cadastro feito pelo admin, com duas formas (as duas disponíveis, você escolhe caso a caso ao cadastrar):

- **Busca automática**: digita o título, o app consulta a API pública do Google Books e sugere capa, autor e número de páginas. Você confirma ou ajusta antes de salvar.
- **Manual**: quando o livro não aparece corretamente na busca (comum com edições específicas, como a ilustrada de O Peregrino), você sobe a capa e digita os dados manualmente.

Cada livro tem um ciclo (data de início e fim), igual ao que já existe no cronograma do clube — o app não substitui a decisão do ciclo, só reflete a que você cadastrar.

## 6. Progresso de leitura

Registrado de duas formas, convertidas uma na outra:

- **Páginas lidas** (entrada manual: "estou na página X")
- **Minutos lidos** (gerado automaticamente pelo Pomodoro, ou lançado manualmente)

Conversão: cada membro tem um ritmo de leitura (minutos por página), que começa com um valor padrão (ex: 2 min/página) e se ajusta automaticamente conforme o app recebe registros dos dois tipos da mesma pessoa. Isso permite mostrar "você leu aproximadamente X páginas" mesmo quando a pessoa só usou o Pomodoro, sem precisar contar página por página toda vez.

## 7. Modo Pomodoro

Timer de foco (padrão 25 min foco / 5 min pausa, ajustável) vinculado à leitura do livro atual.

**Funciona com o app fechado**: o horário de início e a duração ficam salvos; ao reabrir o app, ele calcula o tempo decorrido pelo relógio, não por um timer "vivo" rodando em segundo plano — isso garante que o progresso nunca se perde, em qualquer celular.

**Limitação real a saber**: o aviso sonoro/notificação de "pomodoro terminou" com o app fechado funciona bem no Android, mas no iPhone só funciona se o app estiver instalado na tela de início (não numa aba do Safari), e mesmo assim é menos confiável — limitação da Apple, não do app. Vale avisar os membros com iPhone disso, para não estranharem se não ouvirem o aviso com o app em segundo plano.

## 8. Metas

Cinco tipos, já no schema do piloto (`metas.tipo`):

- **Semanal**: páginas por semana.
- **Mensal**: páginas por mês.
- **Livro inteiro**: meta de terminar o livro até o fim do ciclo, independente de semana/mês.
- **Sessões por semana**: quantidade de pomodoros na semana (meta de hábito, não de página).
- **Dias por semana**: quantos dias da semana a pessoa lê pelo menos uma vez (meta de constância, alimenta a conquista "Streak").
- A meta diária não existe como campo separado — é a meta semanal dividida por 7, mostrada só como referência visual.

Tela de edição de metas ainda não está no piloto (entra na próxima etapa).

## 9. Conquistas (aprovadas)

| Conquista | Gatilho |
|---|---|
| Primeira leitura concluída | Terminou o 1º livro no app |
| Maratonista | Concluiu 3 / 5 / 10 livros |
| Foco de verdade | 1ª sessão de Pomodoro concluída |
| Hora de leitura | 10 / 50 / 100 sessões de Pomodoro concluídas |
| Streak | X dias seguidos com pelo menos um registro de leitura (nome autorizado só neste app) |
| Na dianteira | Primeiro do grupo a terminar o livro do ciclo atual |
| Compartilhou a jornada | Usou o recurso de compartilhar progresso pela 1ª vez |
| Meta batida | Cumpriu a meta semanal pessoal |

Visual: selo simples (círculo ou escudo discreto) em dourado/azul-marinho, com o nome da conquista — sem troféus, confetes ou excesso de brilho, mantendo a linha "clássica e minimalista" da identidade do Bereanos mesmo sendo um app à parte.

## 10. Compartilhamento (substitui o chat)

Sem chat dentro do app — o grupo do WhatsApp já cumpre esse papel. Em vez disso, um gerador de card:

- O membro toca em "Compartilhar progresso"
- O app monta uma imagem com: capa do livro, nome do livro, % concluído, nome de exibição do membro
- No celular, abre direto o menu de compartilhar do sistema (inclui WhatsApp num toque). No computador, baixa a imagem para compartilhar manualmente.

## 11. Modelo de dados (rascunho para validação técnica)

Tabelas principais no Supabase (Postgres), todas com RLS ativo desde a criação:

```
perfis
  id (uuid, = auth.users.id)
  nome_completo
  nome_exibicao
  data_nascimento
  avatar_url
  role ('admin' | 'membro')
  tema_preferido ('claro' | 'escuro' | 'sistema')
  ritmo_leitura_min_por_pagina (numeric, default 2)
  created_at, updated_at

livros
  id (uuid)
  titulo, autor
  capa_url
  paginas_totais
  fonte_capa ('manual' | 'api')
  ciclo_inicio, ciclo_fim
  status ('ativo' | 'concluido')
  created_by (admin), created_at

registros_leitura
  id (uuid)
  membro_id, livro_id
  origem ('pomodoro' | 'manual')
  paginas_lidas (nullable)
  minutos_lidos (nullable)
  registrado_em

sessoes_pomodoro
  id (uuid)
  membro_id, livro_id
  inicio, fim
  duracao_minutos
  status ('em_andamento' | 'concluida' | 'cancelada')

metas
  id (uuid)
  membro_id, livro_id
  tipo ('semanal' | 'mensal')
  valor_paginas
  periodo_inicio, periodo_fim

conquistas (catálogo fixo, definido pelo admin)
  id, chave, nome, descricao, icone

membro_conquistas
  id
  membro_id, conquista_id
  livro_id (nullable, quando a conquista é por livro)
  conquistado_em
```

## 12. Telas principais (rascunho)

1. Login / "Esqueci minha senha"
2. Completar perfil (primeiro acesso)
3. Início: progresso coletivo do livro atual (todos os membros, lado a lado) + meta da semana
4. Pomodoro (timer + histórico de sessões)
5. Registrar leitura manual (páginas)
6. Minhas conquistas / Conquistas do grupo
7. Compartilhar progresso (gerador de card)
8. Configurações (tema, meta pessoal, dados do perfil)
9. (Admin) Cadastrar/editar livro do ciclo
10. (Admin) Cadastrar membro / gerar convite

## 13. Stack técnico

Mesmo padrão da skill já entregue: React + Vite + TypeScript + Tailwind no frontend, Supabase (Postgres + Auth + Storage) no backend, Dexie.js (IndexedDB) para funcionamento offline, Netlify para deploy e Functions, tudo dentro do plano gratuito dos dois serviços — confortável para até 10 membros.

## 14. Estado atual e próximos passos

Tudo da seção 14 original (v1) foi decidido. O piloto técnico (`bereanos-streak-app/`) já tem:
- Schema completo + RLS + catálogo de conquistas
- Login, troca de senha temporária, completar perfil
- Tela inicial com progresso coletivo (versão simples)
- Base de PWA e modo claro/escuro configurados

Falta, nesta ordem, para fechar a v1 utilizável:
1. Você criar o projeto Supabase e rodar o schema (passo a passo no README do app)
2. Testar login localmente com seu próprio usuário
3. Eu construir: tela de Pomodoro, registro manual de página, cadastro de livro pelo admin, cálculo de % real, concessão automática de conquistas, gerador de card de compartilhamento, destaque de aniversário
4. Deploy no Netlify para testar no celular
5. Você me passar nome + e-mail dos membros, para eu desenhar a tela de criação de acesso

Só depois disso considerar convidar o restante do grupo.
