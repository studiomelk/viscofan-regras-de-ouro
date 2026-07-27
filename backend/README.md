# Backend Viscofan — deploy na VPS

Substitui o Supabase: guarda as credenciais do Postgres em `.env` (nunca no
navegador) e expõe uma API HTTP que o `index.html` consome.

## 1. Levar os arquivos para a VPS

Copie a pasta `backend/` e o arquivo `.env` (da raiz do projeto) para a VPS,
na mesma pasta onde já está o `docker-compose.yml` que sobe o serviço
`postgres`.

## 2. Adicionar o serviço ao docker-compose.yml

Use `backend/docker-compose.snippet.yml` como referência e adicione um
serviço `viscofan-backend` ao seu compose existente, na mesma rede do
serviço `postgres`. Ele precisa de:
- `build: ./backend`
- `env_file: ./.env`
- porta `3001` publicada (ou apenas interna, se for usar proxy reverso)
- um volume para `/app/uploads` (senão os PDFs enviados somem a cada
  rebuild do container)

## 3. Subir o container

```bash
docker compose up -d --build viscofan-backend
```

## 4. Criar as tabelas (uma vez só)

```bash
docker compose exec viscofan-backend npm run migrate
```

## 5. Criar o usuário administrador (uma vez só)

```bash
docker compose exec viscofan-backend npm run create-admin -- admin@viscofan.com "SUA_SENHA_FORTE"
```

Guarde esse e-mail/senha — é o login do painel administrativo do site.

## 6. Testar a API

```bash
curl http://SEU_IP_OU_DOMINIO:3001/api/health
# deve responder {"ok":true}
```

## 7. Apontar o site para a API

Em `index.html`, na linha perto do topo do `<script>`:

```javascript
const API_URL = "https://SEU-DOMINIO-OU-IP:3001/api";
```

Troque pela URL real do passo anterior. Enquanto tiver "SEU-DOMINIO" o site
roda em MODO TESTE (não grava nada).

## 8. IMPORTANTE — HTTPS antes de divulgar

O login do admin envia a senha para essa API. **Não exponha a porta 3001
direto em HTTP para a internet** — qualquer um na mesma rede consegue ler a
senha em texto puro. Antes de divulgar o link para a fábrica:

- Coloque um proxy reverso na frente (Caddy ou Nginx) com certificado TLS
  (Let's Encrypt), servindo a API em `https://api.seudominio.com/api` em vez
  da porta 3001 crua; ou
- Se a VPS já tem Nginx/Caddy configurado para outros serviços, adicione um
  `location`/site apontando para `http://viscofan-backend:3001` internamente.

Depois de configurar o HTTPS, atualize `API_URL` no `index.html` para a URL
`https://...` correspondente.

## 9. CORS

No `.env`, ajuste `CORS_ORIGIN` para a URL exata do site publicado no
Netlify (ex: `https://viscofan-quiz.netlify.app`). Sem isso o navegador
bloqueia as chamadas do site para a API.

## 10. Publicar o site

Igual antes: `index.html` + `logo-viscofan.png` juntos no Netlify
(app.netlify.com/drop).
