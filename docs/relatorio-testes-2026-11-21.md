# Bereanos | Leitura: testes e correções (21/11/2026)

## Como foi testado
- Typecheck (tsc) e testes de regras (`npm test`): passaram antes e depois (13 testes antes, 17 agora).
- App no ar (bereanos-streak.vercel.app) aberto no navegador, só leitura: Início, Registrar, Perfil, Métricas (Você e Grupo). Nada foi registrado nem apagado no banco real.
- Revisão do código de todas as telas, das migrações e da Edge Function.
- O `npm run build` não roda nesta máquina virtual (o Rollup instalado é só o de Windows). Rode no seu computador antes de publicar.

## Erros corrigidos
| # | Onde | Problema | Correção |
|---|------|----------|----------|
| 1 | Registrar, Início, Foco (sem internet) | Offline o app achava que você estava na página 0. "Parei na página 120" virava 120 páginas lidas de uma vez. O progresso também sumia da tela. | Guarda a última cópia dos registros e junta os lançados no aparelho que ainda não subiram. |
| 2 | Desfazer/apagar offline | Registro ainda não enviado dava "Não foi possível desfazer", embora tivesse sido apagado. | Registro só local é apagado na hora e conta como sucesso. |
| 3 | Metas | Meta criada depois das 21h ia para o dia seguinte (data em UTC). Leituras após 21h no último dia ficavam fora; dias de leitura contados em UTC. | Datas locais em toda a tela. |
| 4 | Metas | "Terminar o livro" só contava páginas dentro do ciclo; o Início conta tudo. Números diferentes. | Mesma conta do Início. |
| 5 | Metas | Aceitava "8 dias por semana". Metas vencidas apareciam como ativas. | Limite de 7; metas vencidas aparecem por último, marcadas "encerrada". |
| 6 | Mural (admin) | "Retirar do mural" apagava a anotação do caderno do membro. | Nova migração 0019: só tira do mural, o texto fica com o autor. |
| 7 | "Quem terminou" | Cada tela contava de um jeito (só páginas, só "Terminei" ou os dois). Memória, Panorama, Livro e Perfil davam números diferentes das Métricas. | Regra única `terminouLivro` (última página ou "Terminei") em todas. |
| 8 | Memória do clube e backup | Consultas sem limite param em 1.000 linhas no Supabase. Com o histórico crescendo, os totais e o backup sairiam cortados sem aviso. | Busca paginada (`buscarTodas`). |
| 9 | Memória do clube | Somava páginas sem teto por pessoa; Métricas limita ao total do livro. | Mesma conta das Métricas. |
| 10 | Registro rápido | +20 com 3 páginas faltando registrava 20; com o livro terminado, continuava aceitando. | Limita ao que falta e desativa quando terminou. |
| 11 | Entre um ciclo e outro | Sem livro ativo, o membro só via "Sair da conta". | Acesso a Indicações e à Memória do clube. |
| 12 | Backup | Datas em UTC, nome do arquivo podia sair com o dia seguinte, faltava o tempo informado à mão. | Data local, coluna de tempo, erro avisado. |
| 13 | Perfil | Ritmo aceitava 0,1 (a mensagem dizia mínimo 0,5). Livros terminados ignoravam o "Terminei". | Validação e regra corrigidas. |
| 14 | Primeiro acesso | Nome só com espaços era aceito. | Validação e espaços removidos. |

## Concordância e textos
- "1 páginas nesta sessão", "1 terminaram", "em 1 dias", "com 1 anotações", "1 sessões", "1 dias com leitura": todos com singular e plural.
- "1 horas de leitura" e "1,7 horas": agora "1h40", no mesmo formato do resto do app (Perfil, Livro, Ano).
- "30 min de leitura registrados" passou a "Leitura de 30 min registrada".
- Aniversários: "A e B e C" passou a "A, B e C".
- "Bem-vindo" no convite passou a "Boas-vindas" (vale para homens e mulheres).
- "Quando a moderação definir" passou a "Quando o admin definir" (o app chama de admin em todo lugar).
- "páginas por dia lido" passou a "páginas por dia de leitura"; "meta pra" passou a "meta para".

## Para publicar
1. Rodar `supabase/migrations/0019_retirar_do_mural.sql` no SQL Editor do Supabase (antes do deploy).
2. No seu computador: `npm run typecheck`, `npm test` e `npm run build`.
3. Testar numa branch (pré-visualização da Vercel), principalmente: registrar com o celular em modo avião e depois religar; criar meta à noite; retirar uma anotação do mural.
4. Juntar na `main`.

## Pontos para você decidir (não alterei)
- Roteiro do encontro: o app usa 2h30 (com teste garantindo isso); as instruções do projeto falam em cerca de 1h30.
- Quem entra por convite não passa pela tela de completar perfil: fica sem nome completo e aniversário até editar no Perfil.
- Conquistas em níveis repetem o nome ("Maratonista" ganha e "Próxima: Maratonista"). Dá para mostrar o nível no nome.
- O admin ainda pode APAGAR anotação do mural pela política da 0010. O app não usa mais esse caminho; se quiser fechar de vez, dá para remover a política depois da 0019.

## Teste na pré-visualização (21/11, 17h40)
- Perfil mostra "1h40 de leitura"; Memória do clube bate com as Métricas (480, 288, 560, 320 e 172 páginas; 2 terminaram por ciclo).
- Migração 0019 confirmada no banco.
- Metas: "8 dias por semana" bloqueado; meta de 2 dias criada na semana certa (15 a 21/11), contou 2 de 2, e foi removida.
- Sem internet: a tela mostra a página 89 (antes mostrava 0). Problema novo achado: levava cerca de 15 s carregando, com "p. 0" e o botão liberado. Corrigido depois do teste: sem rede o app vai direto para a cópia do aparelho, com internet ruim desiste em 8 s, e Registrar/Foco não salvam enquanto o progresso carrega. Esta correção ainda precisa de commit e push.
