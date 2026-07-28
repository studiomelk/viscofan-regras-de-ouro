# Backend Viscofan — app único (API + site)

Substitui o Supabase: guarda as credenciais do Postgres em variáveis de
ambiente (nunca no navegador) e expõe uma API HTTP. O próprio processo
Node também serve o site (`public/index.html` + `public/logo-viscofan.png`)
— um único app, mesma origem, sem CORS entre frontend e API.

Hospedado hoje via **Easypanel** (Docker), repositório
`studiomelk/viscofan-regras-de-ouro`, branch `main`, **Caminho de Build =
`/backend`**.

## Estrutura

```
backend/
  public/index.html       <- o site (API_URL = "/api", caminho relativo)
  public/logo-viscofan.png
  src/server.js           <- serve a API em /api/* e o site em /
  src/routes/*.js
  Dockerfile
```

Não existe mais `index.html` na raiz do repositório — `backend/public/` é a
única cópia. Editar o site é editar esse arquivo.

## 1. Variáveis de ambiente (Easypanel → app → Environment)

```
PGHOST=...
PGPORT=5432
PGDATABASE=...
PGUSER=...
PGPASSWORD=...
PGSSLMODE=require   # ou "disable" se o Postgres não tiver TLS
PORT=3001
JWT_SECRET=...       # string aleatória longa, ex: openssl rand -hex 32
CORS_ORIGIN=*        # opcional agora que é a mesma origem; pode remover
```

## 2. Criar as tabelas (uma vez só)

Pelo terminal do app no Easypanel (ícone `>_`), ou via SSH na VPS:

```bash
npm run migrate
```

## 3. Criar o usuário administrador (uma vez só)

```bash
npm run create-admin -- seu-email@exemplo.com "SUA_SENHA_FORTE"
```

Guarde esse e-mail/senha — é o login do painel administrativo do site.

## 4. Domínio no Easypanel

Na aba **Domínios** do app, configure a **Porta de destino = 3001** (é a
porta que `src/server.js` escuta). HTTPS já vem pronto no domínio
`*.easypanel.host`; se usar domínio próprio, ative o toggle HTTPS na mesma
tela.

## 5. Testar

```bash
curl https://SEU-DOMINIO/api/health
# {"ok":true}
```

Abra `https://SEU-DOMINIO/` no navegador — deve carregar o site direto.

## 6. Uploads de PDF

A pasta `uploads/` guarda os PDFs de relatório enviados por e-mail/WhatsApp.
Sem um volume persistente configurado no Easypanel, ela é apagada a cada
rebuild — os links antigos de relatório param de funcionar, mas isso não
afeta os dados do banco. Se quiser preservar os PDFs entre deploys,
configure um Volume no Easypanel apontando para `/app/uploads`.

## 7. Multi-empresa (2026-07-27)

O mesmo formulário atende várias empresas. `empresas` e `setores` são
tabelas próprias (cada empresa tem sua lista de setores, gerenciável pelo
botão "🗄️ Banco de Dados" no painel). `participantes`, `pesquisa_gro`,
`metas_setor` e `config_envio` têm `empresa_id` e só existem dentro de uma
empresa. Login do admin é único e enxerga todas as empresas através do
seletor no topo do painel — dashboard, CRUD e "Apagar todos os dados"
sempre operam só na empresa selecionada ali.

Pra cadastrar uma empresa nova: painel → 🗄️ Banco de Dados → aba
**Empresas** → + Adicionar. Depois troque pra ela no seletor do topo e
cadastre os setores dela na aba **Setores**, antes de divulgar o link —
sem setor cadastrado, ninguém consegue se registrar.
