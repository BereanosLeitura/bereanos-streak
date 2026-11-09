# Bereanos | Leitura

Protótipo pessoal de Felipe para acompanhar a leitura coletiva do Clube do Livro Bereanos. Ainda não é material oficial do clube.

## O que o app faz

- Início com o livro do ciclo, meta do dia, registro rápido, semana, ritmo do ciclo, metas, grupo e mural
- Foco (Pomodoro com pausas curtas e longas, som ambiente e anotação rápida)
- Registro de leitura por página, por quantidade ou só pelo tempo, com campo opcional de tempo lido (para quem leu sem o Foco), inclusive para ontem e anteontem
- Anotações (trechos, reflexões e perguntas), mural do grupo e perguntas para o encontro
- Compartilhar: modelos de imagem para frases e para a leitura, em Story, Post e Quadrado, com opção sem fundo
- Perfil com conquistas, horários de leitura, Estante (histórico de cada ciclo) e retrospectiva por livro
- Seu ano de leitura com a imagem "Minha estante" (capas e nomes dos livros)
- Opção "Mostrar a capa do livro" em todos os modelos de leitura, com e sem fundo
- Panorama do grupo no livro do ciclo
- Métricas: as suas (só você vê) e as do grupo (totais e distribuições, sem nomes e sem ranking)
- Painel do admin: livro do ciclo (capa, dados, datas), próximo encontro, concluir ciclo marcando quem terminou, membros
- Leituras pendentes: quem não terminou um ciclo encerrado continua no próprio ritmo; cada membro pode marcar "Terminei" ou "Deixar de lado"
- Funciona offline e sincroniza quando a internet volta; pode ser instalado no celular (PWA)
- Temas claro, escuro e azul
- Anotação do tipo Aplicação (o "Aplicar" do lema) e referência bíblica nas anotações
- Respostas no mural, destaques do clube escolhidos pelo admin e busca em todos os livros
- Modo Encontro: roteiro de cerca de 2h30 com cronômetro, perguntas do mural e presença
- Plano do ciclo (marcos semanais calculados pelas datas), aniversariantes da semana
- Indicações de livros e sorteio registrado no servidor
- Relatório do ciclo para salvar em PDF, backup em planilhas (admin), baixar as próprias anotações
- Lembrete diário pelo calendário do celular, tamanho de letra ajustável
- Opção "sequência e conquistas": padrão do clube definido pelo admin e escolha pessoal no Perfil
- Admin cria acessos, gera senha nova e suspende membros pelo próprio app

## Banco de dados (Supabase)

As migrações ficam em `supabase/migrations`, de `0001` a `0016`, e devem ser rodadas em ordem no SQL Editor.

A função `supabase/functions/admin-membros` roda no servidor do Supabase (Edge Functions). Para publicar ou atualizar: painel do Supabase, Edge Functions, abrir `admin-membros` (ou criar com esse nome), colar o conteúdo de `index.ts` e clicar em Deploy. Ela usa a `service_role key` do próprio servidor, que nunca vai para o app.

## Rodar no computador

1. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. `npm install`
3. `npm run dev` e abra `http://localhost:5173`.

## Verificar antes de publicar

- `npm run typecheck`: checagem de tipos do TypeScript
- `npm test`: testes das regras do app em `tests/` (datas do registro, marcos, mural sem spoiler, concordância, sequência, roteiro). Usa o próprio Node 22.18+, sem instalar nada
- `npm run build`: o mesmo build que a Vercel roda

## Publicar (GitHub + Vercel)

1. O app oficial está na Vercel (bereanos-streak.vercel.app), ligado ao GitHub. Cada `git push` na `main` publica em produção.
2. Melhorias grandes vão primeiro numa branch (ex.: `melhorias/auditoria`). O push da branch gera um link de pré-visualização na Vercel, que usa as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (cadastradas para Production e Preview).
3. Depois de testar a pré-visualização, junte a branch na `main` para publicar.
4. O `netlify.toml` ficou da primeira hospedagem (bereanosleitura.netlify.app) e não é usado pela Vercel.

## Segurança

- Cadastro público desligado no Supabase (Authentication, Sign In / Providers, "Allow new users to sign up" desmarcado). Contas novas só pelo Painel do admin
- RLS ativo em todas as tabelas
- A `service_role key` nunca aparece no código do app
- A `anon key` é pública por natureza; quem protege os dados é o RLS
- O bucket de capas é público pelo link, mas não permite listar os arquivos (0016)
- O anotador do encontro só edita roteiro, perguntas discutidas, ata e presença (0016)
