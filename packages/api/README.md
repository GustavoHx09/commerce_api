# API

Backend da plataforma de e-commerce, construído com Node.js, Express e MongoDB.

## Responsabilidade

- Expor endpoints REST para autenticação, usuários, produtos, tenants e dashboard
- Gerenciar autenticação e autorização com JWT e roles
- Isolar dados por tenant (multitenancy)
- Aplicar regras de negócio, validações e soft delete
- Fornecer documentação interativa via Swagger

## Tecnologias

- Node.js
- Express
- MongoDB (Mongoose)
- JWT
- Bcrypt
- Helmet
- Express Rate Limit
- Morgan
- Swagger
- Vitest

## Estrutura

```
src/
├── config/             # Configurações (DB, env, swagger, logger)
├── controllers/        # Lógica das rotas HTTP
├── database/           # Seed e scripts
├── middlewares/        # Autenticação, segurança, validações, erros
├── models/             # Modelos do Mongoose
├── repositories/       # Acesso ao banco de dados
├── routes/             # Definição de endpoints
├── services/           # Regras de negócio
├── utils/              # Validações, helpers de resposta e paginação
└── app.js              # Ponto de entrada
```

## Variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

| Variável | Descrição | Obrigatório |
| --- | --- | --- |
| `MONGO_URI` | URI de conexão com o MongoDB | Sim |
| `JWT_SECRET` | Chave secreta para assinatura do JWT | Sim |
| `JWT_EXPIRES_IN` | Tempo de expiração do JWT (padrão: `7d`) | Não |
| `CORS_URL` | Origens permitidas pelo CORS (padrão: `http://localhost:3000`) | Não |
| `PORT` | Porta da API (padrão: `3001`) | Não |
| `MASTER_EMAIL` | Email do usuário master criado pelo seed | Não |
| `MASTER_PASSWORD` | Senha do usuário master criado pelo seed | Não |
| `ADMIN_EMAIL` | Email do admin criado pelo seed | Não |
| `ADMIN_PASSWORD` | Senha do admin criado pelo seed | Não |
| `USER_EMAIL` | Email do usuário criado pelo seed | Não |
| `USER_PASSWORD` | Senha do usuário criado pelo seed | Não |

## Como rodar

Na raiz do monorepo:

```bash
npm run dev -w api
```

Ou diretamente neste package:

```bash
npm run dev
```

A API estará disponível em `http://localhost:3001`.

A documentação Swagger pode ser acessada em `http://localhost:3001/api-docs`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia a API em modo watch |
| `npm run start` | Inicia a API em modo produção |
| `npm run seed` | Roda o seed de dados iniciais |
| `npm run lint` | Roda o ESLint |
| `npm run test` | Roda os testes unitários uma vez |
| `npm run test:watch` | Roda os testes em modo watch |

## Autenticação

A API usa autenticação Bearer JWT. Para obter um token:

```bash
POST /api/v1/auth/login
{ "email": "master@admin.com", "password": "master123" }
```

Envie o token nas demais requisições:

```bash
Authorization: Bearer <token>
```

## Roles

- `master` → acesso total, gerencia tenants
- `admin` → gerencia usuários e produtos do próprio tenant
- `user` → acesso limitado ao próprio tenant

## Segurança

- Helmet adiciona headers de segurança
- Rate limit protege contra brute force
- Sanitização contra NoSQL injection
- Logs de requisições em `logs/app.log`
- Senhas nunca retornadas nas respostas (`select: false`)
