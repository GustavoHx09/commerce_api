# Commerce API

Monorepo para uma plataforma de e-commerce multitenancy. Backend em Node.js + Express + MongoDB e frontend em Next.js + React + TypeScript + Tailwind CSS.

O projeto foi estruturado para atender pequenos comércios, com controle de acesso por roles (`master`, `admin`, `user`), isolamento de dados por tenant, soft delete e autenticação com JWT refresh token em cookie `HttpOnly`.

## Tecnologias

- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Bcrypt
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Axios
- **Ferramentas**: ESLint, Prettier, Vitest

## Estrutura do monorepo

```
commerce_api/
├── packages/
│   ├── api/          # Backend Express
│   └── web/          # Frontend Next.js
├── package.json      # Workspaces + scripts centralizados
├── README.md
└── .gitignore
```

Os packages funcionam de forma independente, mas compartilham scripts gerenciados pela raiz do monorepo.

## Requisitos

- Node.js (versão LTS recomendada)
- npm
- Docker e Docker Compose (para MongoDB local)

> Para produção, use MongoDB Atlas ou outro MongoDB gerenciado. Localmente o Docker Compose sobe tudo pronto.

## Configuração

### 1. Variáveis de ambiente

Crie os arquivos `.env` a partir dos exemplos em cada package.

#### Backend (`packages/api`)

```bash
cp packages/api/.env.example packages/api/.env
```

O exemplo já vem configurado para o MongoDB local via Docker:

```env
MONGO_URI=mongodb://localhost:27017/commerce_api_dev?replicaSet=rs0
```

Para produção, substitua pela URI do MongoDB Atlas.

#### Frontend (`packages/web`)

```bash
cp packages/web/.env.example packages/web/.env
```

Edite `packages/web/.env` com a URL da API.

### 2. Banco de dados local (Docker)

Suba o MongoDB com replica set:

```bash
docker compose up -d
```

Isso expõe o MongoDB em `localhost:27017` já configurado como replica set (`rs0`), necessário para as transações do MongoDB.

Para parar:

```bash
docker compose down
```

## Instalação

Na raiz do projeto, instale todas as dependências dos workspaces:

```bash
npm install
```

## Como rodar

Para iniciar o backend e o frontend simultaneamente:

```bash
npm run dev
```

- API: `http://localhost:3001`
- Web: `http://localhost:3000`

### Rodar separadamente

```bash
npm run dev -w api
npm run dev -w web
```

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `docker compose up -d` | Sobe o MongoDB local com replica set |
| `npm run dev` | Sobe API e web em paralelo |
| `npm run dev -w api` | Sobe só a API |
| `npm run dev -w web` | Sobe só o frontend |
| `npm run build` | Builda o frontend |
| `npm run start` | Inicia a API em produção |
| `npm run seed -w api` | Roda o seed da API |
| `npm run test -w api` | Roda os testes unitários da API |
| `npm run test:integration -w api` | Roda os testes de integração da API (precisa do Docker) |
| `npm run lint -w api` | ESLint no backend |
| `npm run lint -w web` | ESLint no frontend |
| `npm run type-check -w web` | Type check no frontend |
| `npm run format -w web` | Formata o frontend com Prettier |

## Arquitetura

### Backend

```
packages/api/src/
├── modules/       # Domínios com controllers, services, repositories, models e rotas
├── shared/        # Configurações, banco, middlewares e utilitários compartilhados
├── routes.js      # Agregador das rotas dos módulos
└── app.js         # Ponto de entrada centralizado
```

### Frontend

```
packages/web/
├── app/           # App Router do Next.js
├── lib/           # Clientes e utilitários (axios)
├── types/         # Declarações de tipos globais
├── .env           # Variáveis de ambiente
├── .env.example   # Exemplo de variáveis
└── next.config.mjs
```

## Integração entre API e Web

- O frontend se comunica com a API via Axios, usando a URL definida em `packages/web/.env`.
- A autenticação é feita com um JWT armazenado em cookie `HttpOnly`.
- A API identifica o tenant do usuário pelo payload do JWT e filtra todos os dados por `tenantId`.
- O CORS e a validação de origem aceitam o frontend definido em `CORS_URL`.

## Segurança

- Senhas criptografadas com bcrypt
- Autenticação via JWT em cookie `HttpOnly`, `Secure` e `SameSite=None` em produção
- CORS e validação de origem configurados para envio seguro de cookies
- Headers de segurança com Helmet
- Rate limiting para prevenir brute force
- Sanitização de entradas contra NoSQL injection
- Logs de requisições em arquivo (`packages/api/logs/app.log`)
- Password oculto das respostas da API (`select: false` no Mongoose)
- Revogação de sessões: blacklist de tokens no logout e invalidação automática ao trocar a senha
- Permissões granulares com presets reutilizáveis, concessões extras e revogações individuais
- Soft delete, isolamento por tenant e validações de CPF/CNPJ em clientes e fornecedores
- PDV, caixa e pagamentos com baixa/estorno atômico de estoque via transações do MongoDB
- Hard delete bloqueado para produtos, clientes e caixas com histórico de vendas ou movimentações
- Comentários explicativos padronizados no código, documentando funções e configurações

## Licença

Este projeto é usado para fins de estudo, aprendizado e possível comercialização em pequenos comércios.
