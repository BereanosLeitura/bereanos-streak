# Bereanos | Streak

Protótipo pessoal de Felipe para acompanhar a leitura coletiva do Clube do Livro Bereanos. Ainda não é material oficial do clube.

## O que o app faz

- Início com o livro do ciclo, meta do dia, registro rápido, semana, ritmo do ciclo, metas, grupo e mural
- Foco (Pomodoro com pausas curtas e longas, som ambiente e anotação rápida)
- Registro de leitura por páginas ou minutos, inclusive para ontem e anteontem
- Anotações (trechos, reflexões e perguntas), mural do grupo e perguntas para o encontro
- Compartilhar: modelos de imagem para frases e para a leitura, em Story, Post e Quadrado, com opção sem fundo
- Perfil com conquistas, horários de leitura, Estante (histórico de cada ciclo) e retrospectiva por livro
- Panorama do grupo no livro do ciclo
- Painel do admin: livro do ciclo (capa, dados, datas), próximo encontro, concluir ciclo, membros
- Funciona offline e sincroniza quando a internet volta; pode ser instalado no celular (PWA)
- Temas claro, escuro e azul

## Banco de dados (Supabase)

As migrações ficam em `supabase/migrations`, de `0001` a `0009`, e devem ser rodadas em ordem no SQL Editor. Todas já foram aplicadas no projeto atual.

## Rodar no computador

1. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. `npm install`
3. `npm run dev` e abra `http://localhost:5173`.

## Publicar (GitHub + Netlify)

1. Suba a pasta para um repositório no GitHub. O `.gitignore` já deixa de fora `.env`, `node_modules` e `dist`.
2. No Netlify: Add new site, Import an existing project, GitHub, escolha o repositório.
3. Build command `npm run build` e publish directory `dist` (já vêm do `netlify.toml`).
4. Em Environment variables, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
5. Deploy. Cada `git push` na branch principal publica uma versão nova sozinha.

## Segurança

- RLS ativo em todas as tabelas
- A `service_role key` nunca aparece no código do app
- A `anon key` é pública por natureza; quem protege os dados é o RLS
