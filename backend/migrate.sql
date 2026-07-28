-- =====================================================================
-- VISCOFAN — Schema para Postgres puro (sem Supabase).
-- Rode uma vez: node src/migrate.js
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- TABELA 1 — Quiz técnico de segurança. IDENTIFICADO.
-- ---------------------------------------------------------------------
create table if not exists participantes (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null,
  cpf                text not null unique,
  setor              text not null,
  acertos            int  not null,
  total              int  not null,
  respostas          jsonb not null,
  respondeu_pesquisa boolean not null default false,
  criado_em          timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TABELA 2 — Pesquisa de clima / GRO. ANÔNIMA.
--
-- Sem nome, sem CPF, sem chave estrangeira para 'participantes'.
-- IMPORTANTE: a data é gravada como DATE, não timestamp. Timestamp com
-- hora/minuto/segundo permitiria cruzar "quem respondeu o quiz às
-- 14:32:07" com "pesquisa anônima gravada às 14:33:41" e desanonimizar
-- todo mundo. Não mude para timestamptz.
-- ---------------------------------------------------------------------
create table if not exists pesquisa_gro (
  id         uuid primary key default gen_random_uuid(),
  setor      text not null,
  respostas  jsonb not null,
  nota_clima int,
  criado_em  date not null default current_date
);

-- ---------------------------------------------------------------------
-- TABELA 3 — Meta de participação por setor.
-- ---------------------------------------------------------------------
create table if not exists metas_setor (
  setor         text primary key,
  meta          int not null default 0,
  atualizado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- TABELA 4 — Configuração de envio: até 3 e-mails e até 3 WhatsApp.
-- Registro único (id sempre = 1).
-- ---------------------------------------------------------------------
create table if not exists config_envio (
  id            int primary key default 1,
  email1        text,
  email2        text,
  email3        text,
  whatsapp1     text,
  whatsapp2     text,
  whatsapp3     text,
  atualizado_em timestamptz not null default now(),
  constraint config_envio_unico check (id = 1)
);

-- ---------------------------------------------------------------------
-- TABELA 5 — Usuários administrativos (substitui o Supabase Auth).
-- ---------------------------------------------------------------------
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  senha_hash    text not null,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index if not exists idx_participantes_setor on participantes (setor);
create index if not exists idx_pesquisa_setor      on pesquisa_gro  (setor);

-- =====================================================================
-- MULTI-EMPRESA (2026-07-27) — mesmo formulário atende várias empresas.
-- Script idempotente: seguro rodar de novo em cima do schema antigo
-- (sem empresa_id) ou do novo (já migrado).
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABELA 6 — Empresas.
-- ---------------------------------------------------------------------
create table if not exists empresas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  criado_em timestamptz not null default now()
);

-- Dado histórico: tudo que já existia no banco era da Viscofan.
insert into empresas (nome) values ('Viscofan') on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- TABELA 7 — Setores, agora por empresa (cada empresa tem os seus).
-- ---------------------------------------------------------------------
create table if not exists setores (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome       text not null,
  unique (empresa_id, nome)
);

-- Backfill: setores fixos que o site usava antes de existir essa tabela.
insert into setores (empresa_id, nome)
select (select id from empresas where nome = 'Viscofan'), s.nome
from unnest(array[
  'MANUTENÇÃO MANDRINOS','BOBINADEIRAS MAQUINAS 4 E 5','ADMINISTRATIVO',
  'BOBINADEIRAS MAQUINAS 2 E 3','SUPERVISORES E ESPECIALIZADOS',
  'EXTRUSÃO MÁQUINAS 4 E 5','EXTRUSÃO MAQUINAS 2 E 3','UTILIDADES','VISCOSE',
  'MANUTENÇÃO ELÉTRICA E INSTRUMENTAÇÃO','MANUTENÇÃO MECÂNICA','LABORATÓRIO',
  'PRODUÇÃO ADMINISTRATIVO','TEMPORARIOS Viscofan','PRESTADORES DE SERVIÇOS (FIXOS)'
]) as s(nome)
on conflict (empresa_id, nome) do nothing;

-- ---------------------------------------------------------------------
-- participantes: empresa_id + unicidade de CPF por empresa (não mais
-- global — duas empresas podem ter, por coincidência, o mesmo CPF).
-- ---------------------------------------------------------------------
alter table participantes add column if not exists empresa_id uuid references empresas(id);
update participantes set empresa_id = (select id from empresas where nome = 'Viscofan') where empresa_id is null;
alter table participantes alter column empresa_id set not null;
alter table participantes drop constraint if exists participantes_cpf_key;
alter table participantes drop constraint if exists participantes_empresa_id_cpf_key;
alter table participantes add constraint participantes_empresa_id_cpf_key unique (empresa_id, cpf);
create index if not exists idx_participantes_empresa on participantes (empresa_id);

-- ---------------------------------------------------------------------
-- pesquisa_gro: empresa_id (continua sem nome/CPF — só sabe a empresa
-- e o setor, mantendo o anonimato).
-- ---------------------------------------------------------------------
alter table pesquisa_gro add column if not exists empresa_id uuid references empresas(id);
update pesquisa_gro set empresa_id = (select id from empresas where nome = 'Viscofan') where empresa_id is null;
alter table pesquisa_gro alter column empresa_id set not null;
create index if not exists idx_pesquisa_empresa on pesquisa_gro (empresa_id);

-- ---------------------------------------------------------------------
-- metas_setor: chave passa a ser (empresa_id, setor) — o mesmo nome de
-- setor pode existir em empresas diferentes com metas diferentes.
-- ---------------------------------------------------------------------
alter table metas_setor add column if not exists empresa_id uuid references empresas(id);
update metas_setor set empresa_id = (select id from empresas where nome = 'Viscofan') where empresa_id is null;
alter table metas_setor alter column empresa_id set not null;
alter table metas_setor drop constraint if exists metas_setor_pkey;
alter table metas_setor add constraint metas_setor_pkey primary key (empresa_id, setor);

-- ---------------------------------------------------------------------
-- config_envio: deixa de ser registro único (id sempre 1) e passa a ser
-- um registro por empresa (chave = empresa_id).
-- ---------------------------------------------------------------------
alter table config_envio drop constraint if exists config_envio_unico;
alter table config_envio drop constraint if exists config_envio_pkey;
alter table config_envio add column if not exists empresa_id uuid references empresas(id);
update config_envio set empresa_id = (select id from empresas where nome = 'Viscofan') where empresa_id is null;
alter table config_envio alter column empresa_id set not null;
alter table config_envio drop column if exists id;
alter table config_envio add constraint config_envio_pkey primary key (empresa_id);
