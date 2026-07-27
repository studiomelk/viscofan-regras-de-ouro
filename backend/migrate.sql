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
