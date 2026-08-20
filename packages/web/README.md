# Web

Frontend da plataforma de e-commerce, construído com Next.js, React, TypeScript e Tailwind CSS.

## Responsabilidade

- Fornecer a interface web da aplicação
- Consumir a API REST do package `api`
- Gerenciar autenticação, estado global e navegação do usuário

## Tecnologias

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios
- ESLint + Prettier

## Estrutura

```
packages/web/
├── app/           # App Router do Next.js
│   ├── context/   # Contextos globais (AuthContext)
│   ├── login/     # Página de login
│   └── dashboard/ # Página protegida do painel
├── lib/           # Clientes e utilitários (axios)
├── types/         # Declarações de tipos globais
├── .env           # Variáveis de ambiente
├── .env.example   # Exemplo de variáveis
└── next.config.mjs
```

## Variáveis de ambiente

Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

| Variável | Descrição | Obrigatório |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | URL base da API (ex: `http://localhost:3001/api/v1`) | Sim |

Variáveis prefixadas com `NEXT_PUBLIC_` ficam disponíveis no cliente Next.js.

## Como rodar

Na raiz do monorepo:

```bash
npm run dev -w web
```

Ou diretamente neste package:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção |
| `npm run start` | Inicia o servidor de produção |
| `npm run lint` | Roda o ESLint |
| `npm run format` | Formata o código com Prettier |
| `npm run type-check` | Roda a verificação de tipos do TypeScript |

## Integração com a API

O cliente Axios está configurado em `lib/api.ts`:

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

export default api;
```

O `withCredentials: true` permite que cookies (como o refresh token `HttpOnly`) sejam enviados automaticamente para a API.

### Autenticação

O `AuthContext` gerencia o estado da sessão no frontend:

- Guarda o **access token apenas em memória** (nunca no `localStorage`)
- Fornece funções `login`, `logout` e o objeto `user`
- Tenta restaurar a sessão automaticamente via `/auth/refresh` ao carregar

### Axios interceptors

- **Request interceptor**: adiciona o access token no header `Authorization: Bearer <token>`
- **Response interceptor**: em caso de `401`, tenta renovar o access token com `/auth/refresh` e repete a requisição original

## Regras de validação

Toda validação de formulário deve existir tanto no frontend (UX rápida) quanto no backend (fonte confiável). Não confie apenas na validação do cliente.
