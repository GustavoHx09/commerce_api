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

Para autenticar as requisições, envie o token JWT no header `Authorization`:

```ts
api.get('/users', {
  headers: { Authorization: `Bearer ${token}` },
});
```

## Regras de validação

Toda validação de formulário deve existir tanto no frontend (UX rápida) quanto no backend (fonte confiável). Não confie apenas na validação do cliente.
