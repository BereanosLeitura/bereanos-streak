-- Catálogo inicial de conquistas (lista aprovada em 02/11/2026)
-- Rodar depois da migration: supabase db execute -f supabase/seed.sql
-- (ou colar no SQL Editor do painel Supabase)

insert into public.conquistas (chave, nome, descricao, icone) values
  ('primeira_leitura', 'Primeira leitura concluída', 'Terminou o 1º livro no app', 'book-check'),
  ('maratonista_3', 'Maratonista', 'Concluiu 3 livros', 'medal'),
  ('maratonista_5', 'Maratonista', 'Concluiu 5 livros', 'medal'),
  ('maratonista_10', 'Maratonista', 'Concluiu 10 livros', 'medal'),
  ('foco_de_verdade', 'Foco de verdade', '1ª sessão de Pomodoro concluída', 'timer'),
  ('hora_de_leitura_10', 'Hora de leitura', '10 sessões de Pomodoro concluídas', 'clock'),
  ('hora_de_leitura_50', 'Hora de leitura', '50 sessões de Pomodoro concluídas', 'clock'),
  ('hora_de_leitura_100', 'Hora de leitura', '100 sessões de Pomodoro concluídas', 'clock'),
  ('streak', 'Streak', 'Dias seguidos com pelo menos um registro de leitura', 'flame'),
  ('na_dianteira', 'Na dianteira', 'Primeiro do grupo a terminar o livro do ciclo atual', 'flag'),
  ('compartilhou_jornada', 'Compartilhou a jornada', 'Usou o recurso de compartilhar progresso pela 1ª vez', 'share'),
  ('meta_batida', 'Meta batida', 'Cumpriu a meta semanal pessoal', 'target')
on conflict (chave) do nothing;
