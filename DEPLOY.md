# Deploy e Rollback — Commerce API

Guia de publicação em produção usando **Render** (API e frontend) e **MongoDB Atlas** (banco com replica set e backups gerenciados), além de object storage compatível com S3 para os uploads.

## 1. Componentes

| Componente | Onde roda | Observação |
|---|---|---|
| API (Express) | Render Web Service | `packages/api`, porta definida por `PORT` injetada pelo Render |
| Web (Next.js) | Render Web Service ou Vercel | `packages/web`, consome a URL pública da API |
| MongoDB | MongoDB Atlas | Cluster com replica set (obrigatório para as transações do PDV) |
| Uploads (logos) | S3 / Cloudflare R2 / MinIO | Sem configuração de S3, os uploads caem no disco local e **não persistem** no Render |
| Monitoramento | Sentry + UptimeRobot | Health check em `GET /api/v1/health` |

## 2. Preparação do MongoDB Atlas

1. Criar um cluster (o tier gratuito M0 já possui replica set).
2. **Database Access:** criar usuário de banco com senha forte e permissão `readWrite` no banco da aplicação.
3. **Network Access:** liberar acesso pelos IPs de saída do Render (`0.0.0.0/0` é a opção simples; restringir quando possível).
4. Copiar a connection string no formato:
   `mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/commerce_api?retryWrites=true&w=majority`
5. Ativar **backup contínuo / point-in-time recovery** no Atlas antes de receber clientes-piloto (disponível a partir do tier M10). Enquanto estiver em tier gratuito, manter snapshots agendados e documentar restauração manual via `mongodump` (ver `packages/api/README.md`).

## 3. Deploy da API (Render)

### Criar o serviço

- **Tipo:** Web Service
- **Root directory:** `packages/api`
- **Build command:** `npm install`
- **Start command:** `npm run start`
- **Health check path:** `/api/v1/health`

### Variáveis de ambiente

| Variável | Valor | Obrigatória |
|---|---|---|
| `NODE_ENV` | `production` | Sim |
| `MONGO_URI` | Connection string do Atlas | Sim |
| `JWT_SECRET` | Segredo forte e aleatório | Sim |
| `JWT_EXPIRES_IN` | `7d` | Sim |
| `CORS_URL` | URL pública do frontend (ex: `https://app.seudominio.com`) | Sim |
| `WEB_URL` | URL pública do frontend (link de recuperação de senha) | Sim |
| `SENTRY_DSN` | DSN do projeto no Sentry | Recomendado |
| `RESEND_API_KEY` | Chave do Resend | Quando ativar emails |
| `EMAIL_FROM` | Remetente verificado no Resend | Quando ativar emails |
| `S3_BUCKET` | Nome do bucket | Sim em produção |
| `S3_REGION` | Região (`auto` para R2) | Com S3 |
| `S3_ENDPOINT` | Endpoint S3-compatible (R2/MinIO); vazio para AWS | Com S3 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credenciais do bucket | Com S3 |
| `S3_PUBLIC_URL` | URL pública base do bucket | Com S3 |

> **Importante:** o disco do Render é efêmero. Sem `S3_*` configurado, logos enviadas somem a cada deploy/restart. Configure o bucket antes de liberar para pilotos.

### Deploy

- Deploy manual: **Manual Deploy → Deploy latest commit** no painel do Render.
- Deploy automático: conectar o repositório e escolher a branch de produção (ex: `main`).
- Após o deploy, validar:
  1. `GET https://<api>.onrender.com/api/v1/health` retorna 200.
  2. Login com um usuário de teste.
  3. Verificar erros no Sentry e nos logs do Render.

## 4. Deploy do frontend

- **Build command:** `npm install && npm run build -w web` (na raiz do monorepo) ou `npm install && npm run build` com root `packages/web`.
- **Start command:** `npm run start` (Render) — ou deploy na Vercel com root `packages/web`.
- **Variável:** `NEXT_PUBLIC_API_URL=https://<api>.onrender.com/api/v1`.
- Ajustar `CORS_URL` e `WEB_URL` da API para a URL final do frontend.

## 5. Monitoramento e alertas

- **Sentry:** configurar `SENTRY_DSN` e criar alertas (email/Discord) para novos issues e picos de erro.
- **UptimeRobot:** monitor `HTTP(s)` em `https://<api>.onrender.com/api/v1/health` a cada 5 min, com alerta por email/webhook.

## 6. Rollback

### Rollback de aplicação (API/Web)

1. No painel do Render, abrir o serviço → **Deploys**.
2. Localizar o último deploy saudável e clicar em **Redeploy** / **Rollback to this version**.
3. Confirmar o health check e um fluxo crítico (login + uma venda em ambiente de teste).

Se o deploy for via Git, a alternativa é reverter o commit na branch de produção (`git revert <sha>`) e deixar o auto-deploy publicar a reversão.

### Rollback de banco de dados

- **Atlas (PITR/snapshots):** usar **Restore** do cluster apontando para o momento anterior ao incidente, preferencialmente em um cluster novo, validar os dados e só então redirecionar a `MONGO_URI` da API.
- **Backup manual (`mongodump`):** restaurar com `mongorestore` seguindo o procedimento documentado em `packages/api/README.md`.

> Regra prática: rollback de código **não** desfaz dados. Se o deploy ruim corrompeu dados, combine rollback de aplicação com restauração de backup.

## 7. Checklist de go-live

- [ ] Variáveis de ambiente de produção configuradas (incluindo `S3_*`, `RESEND_*`, `SENTRY_DSN`)
- [ ] `JWT_SECRET` forte e único de produção
- [ ] `CORS_URL` restrito ao domínio real do frontend
- [ ] Atlas com IP allowlist, usuário dedicado e backup ativo
- [ ] Health check respondendo e monitor criado no UptimeRobot
- [ ] Alertas do Sentry configurados
- [ ] Usuário master de produção criado via seed ou manualmente (credenciais fora do código)
- [ ] Teste de restauração de backup executado ao menos uma vez
- [ ] Rollback ensaiado (redeploy de versão anterior) ao menos uma vez
