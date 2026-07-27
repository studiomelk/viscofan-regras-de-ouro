-- =====================================================================
-- VISCOFAN — Regras de Ouro
-- Setup do banco no Supabase. Cole tudo no SQL Editor e rode uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABELA 1 — Quiz técnico de segurança. IDENTIFICADO.
-- ---------------------------------------------------------------------
create table public.participantes (
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
create table public.pesquisa_gro (
  id         uuid primary key default gen_random_uuid(),
  setor      text not null,
  respostas  jsonb not null,
  nota_clima int,
  criado_em  date not null default current_date
);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.participantes enable row level security;
alter table public.pesquisa_gro  enable row level security;

-- Visitante (anon): só pode INSERIR. Nunca ler.
create policy "anon insere participante" on public.participantes
  for insert to anon with check (true);

create policy "anon insere pesquisa" on public.pesquisa_gro
  for insert to anon with check (true);

-- Admin logado (authenticated): pode ler tudo.
create policy "admin le participantes" on public.participantes
  for select to authenticated using (true);

create policy "admin le pesquisa" on public.pesquisa_gro
  for select to authenticated using (true);

-- Admin logado pode apagar (botão "zerar sistema").
create policy "admin apaga participantes" on public.participantes
  for delete to authenticated using (true);

create policy "admin apaga pesquisa" on public.pesquisa_gro
  for delete to authenticated using (true);

-- ---------------------------------------------------------------------
-- Grants explícitos para o PostgREST.
-- O Supabase passou a exigir isso em projetos novos. Sem estes grants,
-- as chamadas da API retornam erro mesmo com as policies corretas.
-- ---------------------------------------------------------------------
grant insert on public.participantes to anon;
grant insert on public.pesquisa_gro  to anon;
grant select, delete on public.participantes to authenticated;
grant select, delete on public.pesquisa_gro  to authenticated;

-- ---------------------------------------------------------------------
-- Função para marcar que a pessoa concluiu a pesquisa.
-- Grava só o booleano — nunca o conteúdo das respostas.
-- security definer para o anon não precisar de permissão de UPDATE
-- na tabela inteira.
-- ---------------------------------------------------------------------
create or replace function public.marcar_pesquisa(p_cpf text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.participantes
     set respondeu_pesquisa = true
   where cpf = p_cpf;
$$;

grant execute on function public.marcar_pesquisa(text) to anon;

-- ---------------------------------------------------------------------
-- TABELA 3 — Meta de participação por setor. Só o admin lê/escreve.
-- Usada para calcular % de cobertura ("8 de 40 pessoas já responderam").
-- ---------------------------------------------------------------------
create table public.metas_setor (
  setor         text primary key,
  meta          int not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.metas_setor enable row level security;

-- Só admin logado mexe nas metas. Visitante (anon) não tem policy aqui,
-- então fica bloqueado por padrão — não precisa reportar meta pra ninguém.
create policy "admin le metas" on public.metas_setor
  for select to authenticated using (true);
create policy "admin grava metas" on public.metas_setor
  for insert to authenticated with check (true);
create policy "admin atualiza metas" on public.metas_setor
  for update to authenticated using (true);
create policy "admin apaga metas" on public.metas_setor
  for delete to authenticated using (true);

grant select, insert, update, delete on public.metas_setor to authenticated;

-- ---------------------------------------------------------------------
-- TABELA 4 — Configuração de envio: até 3 e-mails e até 3 WhatsApp.
-- Registro único (id sempre = 1). Só o admin lê/escreve.
-- ---------------------------------------------------------------------
create table public.config_envio (
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

alter table public.config_envio enable row level security;

create policy "admin le config envio" on public.config_envio
  for select to authenticated using (true);
create policy "admin grava config envio" on public.config_envio
  for insert to authenticated with check (true);
create policy "admin atualiza config envio" on public.config_envio
  for update to authenticated using (true);

grant select, insert, update on public.config_envio to authenticated;

-- ---------------------------------------------------------------------
-- Bucket de Storage pra hospedar o PDF gerado (necessário pro link do
-- e-mail e do WhatsApp — nenhum dos dois consegue anexar arquivo direto
-- pelo navegador, então o relatório precisa de uma URL pública).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('relatorios', 'relatorios', true)
on conflict (id) do nothing;

-- Só o admin logado pode enviar (upload) arquivos pro bucket.
create policy "admin envia relatorios" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'relatorios');

-- Leitura pública: qualquer pessoa com o link consegue abrir o PDF.
-- Necessário para o e-mail/WhatsApp funcionarem sem exigir login de
-- quem recebe a mensagem.
create policy "leitura publica relatorios" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'relatorios');

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index idx_participantes_setor on public.participantes (setor);
create index idx_pesquisa_setor      on public.pesquisa_gro  (setor);
