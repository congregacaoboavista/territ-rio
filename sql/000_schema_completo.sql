-- ============================================================================
--  MAPAS CONG — Estrutura COMPLETA do banco (tabelas, índices, regras, view)
--  Extraída do banco original em 30/09/2026 para montar um projeto do zero.
--  Rode num projeto Supabase VAZIO. Os arquivos 001, 002 e 003 já estão
--  incluídos aqui; não precisa rodá-los depois.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Função herdada do banco original (hoje nenhum gatilho usa)
-- ----------------------------------------------------------------------------
create or replace function public.update_updated_at_column()
 returns trigger
 language plpgsql
as $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;


-- ----------------------------------------------------------------------------
-- Tabelas base
-- ----------------------------------------------------------------------------
create table public.usuarios (
  id          uuid not null default gen_random_uuid(),
  nome        text not null,
  login       text not null,
  senha       text not null,
  tipo        text not null default 'admin'::text,
  created_at  timestamptz not null default timezone('utc'::text, now()),
  constraint usuarios_pkey primary key (id),
  constraint usuarios_login_key unique (login)
);

create table public.territorios (
  id      uuid not null default gen_random_uuid(),
  nome    text not null,
  bairro  text,
  constraint territorios_pkey primary key (id)
);

create table public.quadras (
  id             uuid not null default gen_random_uuid(),
  territorio_id  uuid,
  nome           text not null,
  constraint quadras_pkey primary key (id),
  constraint quadras_territorio_id_fkey foreign key (territorio_id) references public.territorios(id) on delete cascade
);

create table public.enderecos (
  id            uuid not null default gen_random_uuid(),
  quadra_id     uuid,
  rua           text not null,
  numero        text not null,
  status        text,
  data_visita   date,
  is_bloqueado  boolean default false,
  ordem_rua     bigint default 0,
  ordem         integer not null default 0,
  constraint enderecos_pkey primary key (id),
  constraint enderecos_quadra_id_fkey foreign key (quadra_id) references public.quadras(id) on delete cascade
);


-- ----------------------------------------------------------------------------
-- Designações, mapa e ciclos
-- ----------------------------------------------------------------------------
create table public.responsaveis (
  id          uuid not null default gen_random_uuid(),
  nome        text not null,
  tipo        text not null default 'grupo'::text,
  cor         text not null default '#0A4D3C'::text,
  ordem       integer not null default 0,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  dia_semana  smallint,
  constraint responsaveis_pkey primary key (id),
  constraint responsaveis_tipo_check check (tipo = any (array['grupo'::text, 'dia'::text])),
  constraint responsaveis_dia_semana_check check (dia_semana is null or (dia_semana >= 0 and dia_semana <= 6))
);

create table public.designacoes (
  id                uuid not null default gen_random_uuid(),
  territorio_id     uuid not null,
  responsavel_id    uuid,
  territorio_nome   text not null,
  responsavel_nome  text not null,
  responsavel_cor   text,
  data_designacao   date not null default current_date,
  data_devolucao    date,
  observacao        text,
  created_at        timestamptz not null default now(),
  constraint designacoes_pkey primary key (id),
  constraint designacoes_territorio_id_fkey foreign key (territorio_id) references public.territorios(id) on delete cascade,
  constraint designacoes_responsavel_id_fkey foreign key (responsavel_id) references public.responsaveis(id) on delete set null
);

create index designacoes_territorio_idx on public.designacoes using btree (territorio_id);
create index designacoes_abertas_idx on public.designacoes using btree (data_devolucao) where (data_devolucao is null);
create unique index designacoes_uma_aberta_por_territorio on public.designacoes using btree (territorio_id) where (data_devolucao is null);

create table public.territorio_mapa (
  territorio_id  uuid not null,
  x              numeric not null,
  y              numeric not null,
  w              numeric not null,
  h              numeric not null,
  atualizado_em  timestamptz not null default now(),
  constraint territorio_mapa_pkey primary key (territorio_id),
  constraint territorio_mapa_territorio_id_fkey foreign key (territorio_id) references public.territorios(id) on delete cascade
);

create table public.ciclos (
  id                 uuid not null default gen_random_uuid(),
  nome               text,
  data_inicio        date,
  data_reset         timestamptz not null default now(),
  total_casas        integer not null default 0,
  total_falados      integer not null default 0,
  total_cartas       integer not null default 0,
  total_nao_falados  integer not null default 0,
  total_bloqueados   integer not null default 0,
  observacao         text,
  constraint ciclos_pkey primary key (id)
);

create table public.historico_casas (
  id               uuid not null default gen_random_uuid(),
  ciclo_id         uuid not null,
  endereco_id      uuid,
  territorio_nome  text,
  quadra_nome      text,
  rua              text,
  numero           text,
  status           text,
  falado           boolean not null default false,
  data_visita      date,
  constraint historico_casas_pkey primary key (id),
  constraint historico_casas_ciclo_id_fkey foreign key (ciclo_id) references public.ciclos(id) on delete cascade
);

create index historico_casas_ciclo_idx on public.historico_casas using btree (ciclo_id);
create index historico_casas_endereco_idx on public.historico_casas using btree (endereco_id);

create table public.trabalhos (
  id                uuid not null default gen_random_uuid(),
  territorio_id     uuid not null,
  quadra_id         uuid not null,
  responsavel_id    uuid,
  designacao_id     uuid,
  territorio_nome   text not null,
  quadra_nome       text not null,
  responsavel_nome  text not null,
  responsavel_cor   text,
  data              date not null default current_date,
  observacao        text,
  created_at        timestamptz not null default now(),
  constraint trabalhos_pkey primary key (id),
  constraint trabalhos_territorio_id_fkey foreign key (territorio_id) references public.territorios(id) on delete cascade,
  constraint trabalhos_quadra_id_fkey foreign key (quadra_id) references public.quadras(id) on delete cascade,
  constraint trabalhos_responsavel_id_fkey foreign key (responsavel_id) references public.responsaveis(id) on delete set null,
  constraint trabalhos_designacao_id_fkey foreign key (designacao_id) references public.designacoes(id) on delete cascade
);

create index trabalhos_quadra_idx on public.trabalhos using btree (quadra_id, data);
create index trabalhos_territorio_idx on public.trabalhos using btree (territorio_id, data);
create index trabalhos_data_idx on public.trabalhos using btree (data);
create unique index trabalhos_sem_repetir on public.trabalhos using btree (quadra_id, responsavel_id, data);


-- ----------------------------------------------------------------------------
-- View
-- ----------------------------------------------------------------------------
create view public.casas_nunca_faladas as
 select endereco_id,
    max(territorio_nome) as territorio_nome,
    max(quadra_nome) as quadra_nome,
    max(rua) as rua,
    max(numero) as numero,
    count(*) as ciclos_registrados,
    count(*) filter (where falado) as ciclos_falados,
    count(*) filter (where (not falado)) as ciclos_sem_falar,
    round(((100.0 * (count(*) filter (where (not falado)))::numeric) / (nullif(count(*), 0))::numeric), 0) as pct_sem_falar,
    max(data_visita) as ultima_vez_falado
   from public.historico_casas h
  where (endereco_id is not null)
  group by endereco_id;


-- ----------------------------------------------------------------------------
-- Permissões — idênticas ao original.
-- As 4 tabelas base ficam SEM RLS (como no original); as demais com RLS e a
-- política "acesso_total_anon". Veja a nota de segurança no arquivo 001.
-- ----------------------------------------------------------------------------
alter table public.responsaveis     enable row level security;
alter table public.designacoes      enable row level security;
alter table public.territorio_mapa  enable row level security;
alter table public.ciclos           enable row level security;
alter table public.historico_casas  enable row level security;
alter table public.trabalhos        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['responsaveis','designacoes','territorio_mapa','ciclos','historico_casas','trabalhos']
  loop
    execute format(
      'create policy "acesso_total_anon" on public.%I as permissive for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

grant all on table
  public.usuarios, public.territorios, public.quadras, public.enderecos,
  public.responsaveis, public.designacoes, public.territorio_mapa,
  public.ciclos, public.historico_casas, public.trabalhos,
  public.casas_nunca_faladas
to anon, authenticated, service_role;


-- ----------------------------------------------------------------------------
-- Tempo real — a tela da quadra escuta mudanças em "enderecos"
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.enderecos;
