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
- MongoDB local ou MongoDB Atlas
- npm

## Configuração

Crie os arquivos `.env` a partir dos exemplos em cada package.

### Backend (`packages/api`)

```bash
cp packages/api/.env.example packages/api/.env
```

Edite `packages/api/.env` com suas credenciais. Veja o README de `packages/api` para a descrição completa das variáveis.

### Frontend (`packages/web`)

```bash
cp packages/web/.env.example packages/web/.env
```

Edite `packages/web/.env` com a URL da API.

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
| `npm run dev` | Sobe API e web em paralelo |
| `npm run build` | Builda o frontend |
| `npm run start` | Inicia a API em produção |
| `npm run seed -w api` | Roda o seed da API |
| `npm run test -w api` | Roda os testes unitários da API |
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
- Comentários explicativos padronizados no código, documentando funções e configurações

## Licença

Este projeto é usado para fins de estudo, aprendizado e possível comercialização em pequenos comércios.
