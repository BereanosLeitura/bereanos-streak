# Bereanos | Leitura

Protótipo pessoal de Felipe para acompanhar a leitura coletiva do Clube do Livro Bereanos. Ainda não é material oficial do clube.

## O que o app faz

- Início com o livro do ciclo, meta do dia, registro rápido, semana, ritmo do ciclo, metas, grupo e mural
- Foco (Pomodoro com pausas curtas e longas, som ambiente e anotação rápida)
- Registro de leitura por página, por quantidade ou só pelo tempo, com campo opcional de tempo lido (para quem leu sem o Foco), inclusive para ontem e anteontem
- Anotações (trechos, reflexões, perguntas e aplicações), mural do grupo e perguntas para o encontro
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

## Onde fica cada coisa

| Parte | Onde | Para que serve |
|---|---|---|
| Código | GitHub `BereanosLeitura/bereanos-streak`, branch `main` | A `main` é a versão oficial. Tudo o que entra nela vai para o ar. |
| Site | Vercel, projeto `bereanos-streak` | Publica sozinho a cada envio para a `main`. Endereço: bereanos-streak.vercel.app |
| Banco, login e capas | Supabase | Tabelas, regras de acesso (RLS), contas e a função `admin-membros`. |
| Pasta no computador | `Desktop\Bereano` | `Publicar.bat` na raiz, este projeto e a pasta `documentos` (discursos e apresentações). |

## Pastas do projeto

```
src/
  pages/        uma tela por arquivo (Início, Registrar, Foco, Anotações...)
  components/   peças reaproveitadas entre telas
  lib/          regras e acesso a dados (regras.ts é coberto pelos testes)
  styles/       CSS e tema
supabase/
  migrations/   mudanças do banco, em ordem (0001 a 0019); já aplicadas, não editar
  functions/    Edge Function admin-membros
  scripts/      SQL avulso, rodado uma vez (catálogo de conquistas, leituras antes do app)
tests/          testes das regras (npm test)
docs/           especificação original e relatórios de teste
public/         ícones e logos
```

## Publicar uma versão nova

Dê dois cliques em `Publicar.bat`, na pasta `Bereano`. Ele:

1. confere tipos, testes e o build (se algo falhar, para e nada sobe);
2. mostra os arquivos alterados e pede uma frase curta descrevendo a mudança;
3. pergunta S/N antes de enviar;
4. salva (commit), junta na `main` se você estiver em outra branch, e envia ao GitHub;
5. a Vercel publica em 1 ou 2 minutos.

Mudança grande e arriscada: crie uma branch antes (`git switch -c melhorias/nome`) e use `git push -u origin melhorias/nome` para ganhar um link de pré-visualização na Vercel. Depois de testar, rode o `Publicar.bat` dessa branch: ele junta na `main`.

## Banco de dados (Supabase)

- As migrações de `supabase/migrations` já foram aplicadas até a `0019`. Mudança nova no banco vira um arquivo novo (`0020_...sql`), rodado no SQL Editor **antes** de publicar o app que depende dele. Nunca edite uma migração antiga.
- `supabase/scripts` guarda SQL de uso único, já rodado; fica como registro.
- A função `supabase/functions/admin-membros` roda no Supabase (Edge Functions). Para atualizar: painel do Supabase, Edge Functions, `admin-membros`, colar o `index.ts` e clicar em Deploy. Ela usa a `service_role key` do servidor, que nunca vai para o app.

## Rodar no computador

1. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (as mesmas da Vercel).
2. `npm install`
3. `npm run dev` e abra `http://localhost:5173`.

Checagens (o `Publicar.bat` roda as três): `npm run typecheck`, `npm test`, `npm run build`.

## Segurança

- Cadastro público desligado no Supabase. Contas novas só pelo Painel do admin (senha temporária ou convite por link)
- RLS ativo em todas as tabelas; a `anon key` é pública por natureza, quem protege os dados é o RLS
- A `service_role key` nunca aparece no código do app
- O bucket de capas é público pelo link, mas não permite listar os arquivos (0016)
- O anotador do encontro só edita roteiro, perguntas discutidas, ata e presença (0016)
- O admin retira uma anotação do mural sem apagá-la do caderno de quem escreveu (0019)
- O `.env` nunca vai para o GitHub (está no `.gitignore`); o `Publicar.bat` também confere isso
