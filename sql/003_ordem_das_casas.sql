-- ============================================================================
--  MAPAS CONG — Ordem das casas dentro da rua
--  Rode este arquivo UMA VEZ no SQL Editor do Supabase, depois do 002.
--  (Projeto montado do zero com o 000 já tem esta coluna.)
-- ============================================================================

-- Na tela da quadra, o administrador arrasta as casas para mudar a ordem.
-- A tela já gravava essa ordem num campo "ordem" que não existia, então a
-- gravação falhava calada e a ordem voltava ao recarregar.
--
-- 0 = sem ordem definida (a casa entra pela ordem do número).
alter table public.enderecos
  add column if not exists ordem integer not null default 0;
