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
│   ├── context/          # Contextos globais (AuthContext)
│   ├── login/            # Página de login
│   ├── forgot-password/  # Solicitação de recuperação de senha
│   ├── reset-password/   # Redefinição de senha via token do email
│   ├── permissions/      # Painel de autorizações (presets e permissões por usuário)
│   └── dashboard/        # Página protegida do painel
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

O frontend precisa que a API esteja rodando. Veja o README de `packages/api` para subir o MongoDB via Docker e a API localmente.

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

O `withCredentials: true` permite que o cookie JWT `HttpOnly` seja enviado automaticamente para a API.

### Autenticação

O `AuthContext` gerencia o estado da sessão no frontend:

- Fornece funções `login`, `logout` e o objeto `user`
- Não armazena nem acessa o JWT, pois ele fica protegido no cookie `HttpOnly`
- Restaura os dados da sessão automaticamente via `/auth/session` ao carregar

## Área administrativa

O layout autenticado usa menu lateral escuro, recolhível no desktop e sobreposto no celular, com grupos expansíveis e barra de rolagem no tema. Login e dashboard compartilham a identidade Stock-ly; indicadores são carregados da API, sem métricas fictícias.

As páginas `/management/[screen]` incluem:

| Rota | Funcionalidade |
| --- | --- |
| `/management/categories` | Cadastro e edição de categorias |
| `/management/customers`, `/management/suppliers`, `/management/users` | Clientes, fornecedores e funcionários (usuários do sistema) |
| `/management/products` | Catálogo com suprimento/retirada de estoque na linha (exige `stock:supply`) e filtro de busca (ativos, inativos, estoque baixo ou todos) |
| `/management/movements` | Entradas, saídas e contagem por ajuste de saldo final |
| `/management/pos`, `/management/orders` | PDV, detalhes, pagamentos e cancelamento de vendas |
| `/management/cashiers` | Abertura, histórico, sangria, reforço e fechamento |
| `/management/payables`, `/management/receivables` | Contas a pagar/receber e liquidação/cancelamento |
| `/management/cash-flow`, `/management/reports` | Fluxo realizado e relatórios, com períodos em UTC |
| `/management/company` | Dados editáveis da empresa, cores e upload de logo |
| `/management/audit`, `/management/exports` | Auditoria e download paginado de CSV/JSON |
| `/management/account` | Dados da sessão e acesso à recuperação de senha |

O painel existente `/permissions` é reutilizado para presets e autorizações individuais. Para a modelagem inicial, o menu exibe todos os módulos; a API continua aplicando suas permissões e retorna erros de autorização normalmente. O refinamento de visibilidade por permissão e o painel exclusivo MASTER ficam para a próxima etapa.

Usuários MASTER selecionam uma empresa no cabeçalho para operar nas novas telas. Não se trata de uma troca de identidade: as regras de autoria e permissões continuam sendo as do usuário autenticado. O dashboard também respeita a empresa selecionada.

Limites atuais: funcionários não incluem RH; alteração de role de usuário existente continua restrita ao MASTER; a API não oferece edição de perfil por autoatendimento. Exportações contêm até 1.000 registros por arquivo/página e produtos mais vendidos exibem até 100 itens. Não há integração fiscal, histórico de compras de fornecedores ou módulo de compras nesta entrega.

## Regras de validação

Toda validação de formulário deve existir tanto no frontend (UX rápida) quanto no backend (fonte confiável). Não confie apenas na validação do cliente.
