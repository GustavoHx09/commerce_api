# API

Backend da plataforma de e-commerce, construído com Node.js, Express e MongoDB.

## Responsabilidade

- Expor endpoints REST para autenticação, usuários, produtos, tenants, categorias, clientes, fornecedores, caixa, pedidos, pagamentos, estoque e dashboard
- Gerenciar autenticação e autorização com JWT, roles, permissões granulares e presets de permissão em cookie `HttpOnly`
- Isolar dados por tenant (multitenancy)
- Aplicar regras de negócio, validações e soft delete

## Tecnologias

- Node.js
- Express
- MongoDB (Mongoose)
- JWT
- Bcrypt
- Helmet
- Express Rate Limit
- Morgan
- Vitest

## Estrutura

```
src/
├── modules/            # Domínios com controllers, services, repositories, models e rotas
├── shared/             # Configurações, banco, middlewares e utilitários compartilhados
├── routes.js           # Agregador das rotas dos módulos
└── app.js              # Ponto de entrada
```

## Variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

| Variável | Descrição | Obrigatório |
| --- | --- | --- |
| `MONGO_URI` | URI de conexão com o MongoDB. Transações exigem um replica set (Atlas já atende; local use `?replicaSet=rs0`). | Sim |
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

A API usa um JWT de sessão armazenado em cookie `HttpOnly`. O navegador envia esse cookie automaticamente e o JavaScript do frontend não consegue acessar seu conteúdo.

Para iniciar a sessão:

```bash
POST /api/v1/auth/login
{ "email": "master@admin.com", "password": "master123" }
```

Para restaurar os dados da sessão após recarregar a página:

```bash
GET /api/v1/auth/session
```

Para encerrar a sessão:

```bash
POST /api/v1/auth/logout
```

O logout remove o cookie do navegador e adiciona o hash do token atual à blacklist, invalidando-o imediatamente. Após sete dias, o JWT expira e um novo login é necessário.

Sessões também são revogadas automaticamente quando a senha do usuário é alterada: tokens emitidos antes da troca passam a ser rejeitados pelo middleware de autenticação.

## Roles

- `master` → acesso total, gerencia tenants
- `admin` → gerencia usuários, produtos, categorias, clientes, fornecedores, estoque, caixa, vendas e presets de permissões do próprio tenant
- `user` → acesso limitado ao próprio tenant, geralmente PDV e consultas

## Endpoints principais

Abaixo os prefixos das rotas disponíveis em `/api/v1`. Todos exigem autenticação via cookie, exceto `/auth/login` e `/auth/logout`.

| Prefixo | O que faz |
| --- | --- |
| `/auth` | Login, logout e consulta de sessão |
| `/users` | CRUD de usuários, roles e permissões |
| `/permission-presets` | Presets reutilizáveis de permissões (globais ou por tenant) |
| `/tenants` | Cadastro e gerenciamento de empresas |
| `/categories` | Categorias de produtos |
| `/products` | Produtos, estoque mínimo e alerta de baixo estoque (`/products/low-stock`) |
| `/stock` | Movimentações de estoque (entrada/saída/ajuste) e alertas |
| `/customers` | Cadastro de clientes (CPF/CNPJ único por tenant) |
| `/suppliers` | Cadastro de fornecedores (CPF/CNPJ único por tenant) |
| `/cashiers` | Caixa: abertura, fechamento, sangria e suprimento |
| `/orders` | Pedidos/vendas (PDV) com baixa/estorno de estoque |
| `/payments` | Pagamentos vinculados a pedidos |
| `/bills` | Contas a pagar e receber |
| `/dashboard` | Vendas do dia/semana/mês, estoque baixo, total em caixa e dados do tenant |
| `/reports` | Relatórios de vendas, produtos mais vendidos, estoque, movimentações e fluxo de caixa |
| `/audit` | Logs de auditoria |

## Segurança

- Helmet adiciona headers de segurança
- Rate limit protege contra brute force
- Sanitização contra NoSQL injection
- Logs de requisições em `logs/app.log`
- Senhas nunca retornadas nas respostas (`select: false`)
- Refresh token armazenado em cookie `HttpOnly` e `SameSite=Strict`
- Blacklist de tokens revogados (hash SHA-256) com remoção automática via índice TTL
- Troca de senha revoga todas as sessões anteriores do usuário (`passwordChangedAt`)
- Permissões granulares por usuário: presets compartilháveis, permissões extras e revogações individuais
- Catálogo de permissões centralizado (`resource:action`) com suporte a curingas
- Categorias e produtos com SKU único por tenant, unidade de medida e estoque mínimo
- Clientes e fornecedores com documento (CPF/CNPJ) validado e único por tenant
- Movimentações de estoque registram histórico e impedem quantidade negativa
- Caixa, vendas e pagamentos com baixa/estorno atômico de estoque via transações do MongoDB
- Hard delete bloqueado para produtos, clientes e caixas com histórico de vendas ou movimentações
- Soft delete e índices de unicidade parciais por tenant
- Comentários explicativos padronizados no código
