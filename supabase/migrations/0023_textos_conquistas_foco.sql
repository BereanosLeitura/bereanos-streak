-- 0023: textos das conquistas de foco
-- O Foco tem Pomodoro e Leitura livre, e as duas contam como sessão de foco.
update public.conquistas set descricao = '1ª sessão de foco concluída' where chave = 'foco_de_verdade';
update public.conquistas set descricao = '10 sessões de foco concluídas' where chave = 'hora_de_leitura_10';
update public.conquistas set descricao = '50 sessões de foco concluídas' where chave = 'hora_de_leitura_50';
update public.conquistas set descricao = '100 sessões de foco concluídas' where chave = 'hora_de_leitura_100';
select chave, descricao from public.conquistas where chave in ('foco_de_verdade','hora_de_leitura_10','hora_de_leitura_50','hora_de_leitura_100');
