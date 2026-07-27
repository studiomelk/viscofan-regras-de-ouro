# VISCOFAN — QUIZ REGRAS DE OURO
## Guia de publicação — versão final (banco de dados real)

> ⚠️ **DESATUALIZADO (2026-07-27):** o backend migrou de Supabase para um
> Postgres próprio hospedado numa VPS, acessado por uma API Node.js.
> As seções abaixo sobre criar projeto no Supabase, RLS e chaves anon **não
> se aplicam mais**. Siga em vez disso `backend/README.md` para configurar
> o banco/API, e troque `SUPABASE_URL`/`SUPABASE_ANON` por `API_URL` no
> `index.html`. O restante do guia (Netlify, teste do fluxo, LGPD) continua
> válido.

**O que é:** quiz de segurança (identificado, com nota e sorteio) + GRO
(anônimo) + painel administrativo completo (metas, envio de relatório por
e-mail/WhatsApp).
**Stack:** Supabase (banco gratuito) + HTML estático (Netlify gratuito).
**Custo:** R$ 0 para o volume de uma campanha (até alguns milhares de
respostas). Só paga se quiser deixar rodando o ano inteiro sem pausa
(R$ ~130/mês no plano Pro do Supabase — não é necessário no início).

---

## Arquivos deste pacote

| Arquivo | Pra que serve |
|---|---|
| `index.html` | O sistema inteiro — site do participante + painel admin |
| `logo-viscofan.png` | Logo da Viscofan usada no site e no PDF |
| `supabase_setup.sql` | Script único que cria todo o banco de dados |

**Os dois primeiros (`index.html` e `logo-viscofan.png`) precisam subir
juntos, na mesma pasta, no Netlify.** Se subir só o HTML, o site funciona
mas a logo não aparece — não é um bug, é porque o arquivo dela não foi
junto.

---

## PASSO 1 — Criar o projeto no Supabase

1. Acesse **supabase.com** e crie uma conta (GitHub ou e-mail).
2. Clique em **New Project**.
3. Nome sugerido: `viscofan-quiz`. Defina uma senha forte pro banco
   (raramente vai precisar dela no dia a dia — guarde mesmo assim).
4. Região: a mais próxima do Brasil.
5. Espere ~2 minutos até o projeto ficar pronto.

---

## PASSO 2 — Rodar o SQL (cria tudo de uma vez)

1. No menu lateral, **SQL Editor** → **New query**.
2. Abra o arquivo `supabase_setup.sql`, copie o conteúdo inteiro, cole no
   editor e clique em **Run**.
3. Deve aparecer **"Success. No rows returned"**.

Isso cria de uma vez:
- Tabela `participantes` (quiz técnico, identificado)
- Tabela `pesquisa_gro` (GRO, anônimo — sem nome/CPF, sem vínculo com a
  tabela de participantes)
- Tabela `metas_setor` (meta de participação por setor)
- Tabela `config_envio` (e-mails e WhatsApp cadastrados pro envio do
  relatório)
- Bucket de Storage `relatorios` (hospeda o PDF gerado, pra virar link
  no e-mail/WhatsApp)
- Todas as permissões (RLS) de cada uma dessas peças

---

## PASSO 3 — Criar o usuário administrador

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. E-mail e senha forte — esse é o login do painel.
3. Marque **Auto Confirm User**.
4. **Create user**.

---

## PASSO 4 — Pegar as chaves do projeto

1. **Settings** (engrenagem) → **API**.
2. Copie o **Project URL** (ex: `https://abcdef.supabase.co`).
3. Copie a **anon public key** — a chave que começa com `eyJ...`.
   **Não é a `service_role`** — essa nunca deve ir pro navegador.

---

## PASSO 5 — Configurar o `index.html`

1. Abra `index.html` num editor de texto.
2. Encontre estas duas linhas, perto do início do `<script>`:

```javascript
const SUPABASE_URL  = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON = "SUA_CHAVE_ANON_PUBLICA";
```

3. Substitua pelos valores do passo 4. Salve.

Enquanto essas linhas tiverem os valores de exemplo, o site roda sozinho
em **modo teste** (dados fictícios, sem gravar nada) — útil pra
demonstrar o layout sem precisar do banco.

---

## PASSO 6 — Publicar (Netlify, gratuito)

1. Acesse **app.netlify.com/drop**.
2. Arraste **os dois arquivos juntos** — `index.html` **e**
   `logo-viscofan.png` — pra dentro da área indicada. (Se estiver usando
   o navegador, selecione os dois arquivos ao mesmo tempo antes de
   arrastar; não dá pra soltar um de cada vez nessa tela.)
3. Em segundos você recebe um link público
   (ex: `https://nome-aleatorio.netlify.app`).
4. Pra trocar o nome do link: **Site settings** → **Change site name**.

---

## PASSO 7 — Testar tudo antes de divulgar

1. Abra o link publicado. A tarja amarela de "MODO TESTE" **não** deve
   aparecer — se aparecer, as chaves do passo 5 não foram salvas.
2. Cadastre um CPF de teste, complete o quiz (13 perguntas) e o GRO
   (22 perguntas).
3. Confirme: perguntas 1 e 4 sempre contam acerto (todas as alternativas
   corretas); clicar numa resposta certa fica verde, errada fica
   vermelha.
4. Entre em **Área administrativa** com o e-mail/senha do passo 3.
5. Confira: o consolidado de participação aparece no topo, o setor de
   teste aparece com seu nome, a nota de GRO mostra classificação
   (Ruim/Regular/Bom/Excelente).
6. Defina uma meta pra um setor e clique **Salvar** — confirme que
   persiste ao recarregar a página.
7. Abra **⚙️ Contatos para envio**, cadastre seu e-mail e seu WhatsApp,
   salve.
8. Clique **Exportar relatório (PDF)** — confira que a logo aparece na
   capa, sem símbolos quebrados.
9. Clique **📧 Enviar por e-mail** — deve abrir seu programa de e-mail já
   preenchido com um link do relatório.
10. Clique **💬 Enviar por WhatsApp** — deve abrir uma conversa com a
    mensagem pronta.
11. Teste o sorteio: **Sortear vencedor** — confira a animação, o CPF
    aparecendo mascarado (`***.***.***-XX`), e o confete.

---

## PASSO 8 — Limpar os dados de teste

No painel, clique **Apagar todos os dados** e digite `APAGAR` pra
confirmar. Isso limpa participantes e respostas do GRO — **as metas e
os contatos cadastrados continuam salvos**, porque ficam em tabelas
separadas.

Depois de limpar, confirme que o painel mostra "Nenhum participante
ainda" antes de divulgar o link pra fábrica.

---

## Observações importantes

**Pausa por inatividade.** O plano gratuito do Supabase pausa projetos
sem nenhum acesso por 7 dias seguidos. Durante uma campanha ativa isso
não acontece. Se for ficar parado por mais de uma semana entre uma
campanha e outra, acesse o painel do Supabase uma vez pra reativar.

**Backup.** O plano gratuito não faz backup automático. Antes de encerrar
uma campanha, exporte o relatório em PDF **e** baixe as tabelas em CSV
pelo Table Editor do Supabase.

**LGPD.** O GRO é anônimo por design (sem nome/CPF, sem vínculo com a
tabela de participantes). Mesmo assim, como envolve dados sobre saúde
emocional e relação com liderança, vale passar o fluxo pelo jurídico da
Viscofan antes de divulgar amplamente.

**Retenção de dados.** Combine com a Viscofan por quanto tempo os dados
ficam armazenados depois da campanha, e quem é responsável por apagá-los
depois.

**Envio de relatório — o que é e o que não é.** Os botões de e-mail e
WhatsApp abrem seu próprio aplicativo já preenchido com um link pro PDF
(hospedado no Storage do Supabase). Não é anexo automático de verdade —
quem recebe precisa clicar no link pra abrir o arquivo. Isso é
intencional: permite enviar sem precisar de servidor próprio ou conta
paga em serviço de e-mail.

---

## Estrutura do sistema

```
PARTICIPANTE                          ADMINISTRADOR
     │                                      │
     ▼                                      ▼
 Registro                            Login (e-mail/senha)
 (nome/CPF/setor)                          │
     │                                      ▼
     ▼                              ┌───────────────┐
 Quiz técnico                       │    PAINEL      │
 (13 perguntas,                     ├───────────────┤
  identificado)                     │ Consolidado    │
     │                              │ de participação│
     ▼                              │ (meta editável)│
 Transição                          ├───────────────┤
     │                              │ Card por setor:│
     ▼                              │ - Quiz stats   │
 GRO                                │ - GRO stats    │
 (22 perguntas,                     │ - Análise/     │
  ANÔNIMO)                          │   sugestões    │
     │                              │ - Sequência por│
     ▼                              │   funcionário  │
 Resultado                          ├───────────────┤
                                     │ Lista p/       │
                                     │ sorteio externo│
                                     ├───────────────┤
                                     │ Sortear        │
                                     │ vencedor       │
                                     ├───────────────┤
                                     │ Exportar PDF   │
                                     │ Enviar e-mail  │
                                     │ Enviar WhatsApp│
                                     └───────────────┘
```

Banco (Supabase):
- `participantes` — quiz, identificado (nome/CPF)
- `pesquisa_gro` — GRO, anônimo (SEM nome/CPF, SEM vínculo com a outra
  tabela)
- `metas_setor` — meta de participação, um registro por setor
- `config_envio` — até 3 e-mails + 3 WhatsApp, registro único
- Storage bucket `relatorios` — hospeda o PDF gerado para os links de
  e-mail/WhatsApp

---

## Prompt para futuras alterações

Se precisar pedir ajustes a este sistema em outra conversa, cole isto
como contexto:

> Tenho um sistema de quiz da Viscofan: index.html + logo-viscofan.png
> (site estático, publicado no Netlify) + backend/ (API Node.js/Express
> própria, em container Docker numa VPS) + Postgres puro (container Docker
> na mesma VPS, hostname interno "postgres"). Não uso mais Supabase.
>
> ARQUITETURA:
> - Frontend: HTML único com Tailwind CDN, jsPDF + AutoTable (via CDN
>   unpkg.com), fetch() contra a API própria via a função `api()` definida
>   no início do <script> (const API_URL aponta pra API na VPS)
> - Logo carregada de arquivo externo (logo-viscofan.png), NUNCA como
>   base64 embutido no HTML — string gigante numa linha só corre risco
>   de ser corrompida por proxy de rede corporativa
> - Backend: Express em backend/src/server.js, rotas em
>   backend/src/routes/*.js, conexão Postgres via `pg` em backend/src/db.js
>   lendo credenciais do .env (nunca hardcoded, nunca no navegador)
> - Auth do admin: tabela admin_users (bcrypt) + JWT (backend/src/auth.js),
>   token guardado no localStorage do navegador como "viscofan_admin_token"
> - 5 tabelas no Postgres: participantes (quiz identificado),
>   pesquisa_gro (GRO anônimo, sem FK com participantes, grava DATE não
>   timestamp), metas_setor, config_envio, admin_users
> - Autorização: rotas POST de inserção (participantes, pesquisa-gro,
>   marcar-pesquisa) são públicas; todo o resto exige JWT de admin
>   (middleware requireAdmin)
> - PDFs do relatório: upload vai para backend/uploads/ (volume Docker),
>   servido estaticamente em /uploads/<arquivo>, pra virar link no
>   mailto:/wa.me (sem anexo real — não há serviço de e-mail transacional)
> - Quiz: 13 perguntas, perguntas 1 e 4 têm todas as alternativas
>   corretas e sempre contam acerto (pontua:true, todasCertas:true).
>   Total pontuável = 13. Feedback visual verde/vermelho ao responder.
> - GRO: 22 perguntas anônimas, classificadas por tema. Cada pergunta
>   mostra classificação Ruim (nota 0-4) / Regular (5-6) / Bom (7-8) /
>   Excelente (9-10), calculada a partir do % de respostas favoráveis
>   dividido por 10 e arredondado
> - Setor com menos de 3 respostas GRO tem os dados ocultados
>   (MIN_RESPONDENTES = 3)
> - Painel: consolidado de participação no topo (sempre visível, não
>   precisa expandir), meta editável por setor com barra de cobertura,
>   duas caixas de análise separadas por cor (laranja=técnica,
>   índigo=GRO), sequência de acertos por funcionário formato "1✓ 2✗...",
>   lista final Nome+Setor pra sorteio externo com botão de copiar
> - Sorteio: modal ancora no topo da tela, ~6.5s de animação, CPF do
>   vencedor mascarado (***.***.***-XX)
> - PDF: NUNCA usar caracteres emoji dentro de doc.text() do jsPDF — a
>   fonte padrão não renderiza, vira caractere quebrado. Indicadores
>   visuais no PDF usam barra lateral colorida + texto, não emoji
>
> [DESCREVA A ALTERAÇÃO QUE VOCÊ QUER AQUI]
