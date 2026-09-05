# Planejamento — Commerce API

Plano de evolução do sistema para atender comércios e varejos com arquitetura multitenancy.

## 1. Visão do produto

Sistema de gestão comercial em nuvem, onde cada tenant representa uma empresa/comércio. Foco inicial no **varejo/comércio geral**, com possibilidade futura de atender supermercados e restaurantes.

O MVP deve permitir que uma loja controle **produtos, estoque, clientes, fornecedores, vendas e caixa** sem precisar emitir nota fiscal integrada.

## 2. Arquitetura atual

- Backend: Node.js + Express + MongoDB
- Frontend: Next.js + React + TypeScript + Tailwind
- Autenticação: JWT em cookie `HttpOnly`
- Multitenancy: campo `tenantId` nos documentos
- Roles: `master`, `admin`, `user`

## 3. O que ajustar agora antes de crescer

Algumas mudanças estruturais são necessárias para suportar os novos módulos de forma limpa:

1. **Padronizar tenant como empresa**: renomear mentalmente `tenant` para `company`/`business`, mas manter o campo `tenantId` como chave de isolamento.
2. **Adicionar audit trail**: registrar quem criou/alterou registros sensíveis (quem, quando, o que mudou).
3. **Isolamento obrigatório**: nenhuma consulta pode esquecer o `tenantId`, exceto para `master`.
4. **Soft delete consistente**: reutilizar a estratégia já existente nos novos módulos.
5. **Permissões granulares**: além de roles, definir permissões como `read:products`, `write:orders`, `delete:orders`.

## 4. MVP — Produto Mínimo Viável

### 4.1 Módulos do MVP

| Módulo | O que faz | Prioridade |
|---|---|---|
| Empresa (Tenant) | Cadastro da empresa, configurações, logo, CNPJ, endereço | Alta |
| Usuários | Cadastro, roles, permissões, ativação/desativação | Alta |
| Produtos | SKU, nome, descrição, custo, preço, unidade, categoria, controle de estoque | Alta |
| Categorias | Agrupamento de produtos | Média |
| Clientes | Nome, CPF/CNPJ, telefone, endereço, histórico de compras | Alta |
| Fornecedores | Dados cadastrais, histórico de compras | Média |
| Estoque | Entrada, saída, ajuste, inventário, alertas de baixo estoque | Alta |
| Vendas/Pedidos | PDV/carrinho, itens, descontos, formas de pagamento, status | Alta |
| Caixa | Abertura, fechamento, movimentações, sangria, reforço | Alta |
| Financeiro básico | Contas a pagar/receber, fluxo de caixa simplificado | Média |
| Dashboard | Vendas do dia, estoque crítico, faturamento | Alta |
| Relatórios | Vendas por período, produtos mais vendidos, posição de estoque | Média |

### 4.2 Regras de negócio do MVP

#### Empresa (Tenant)
- Cada empresa é um tenant isolado.
- O `master` pode criar e gerenciar empresas.
- CNPJ deve ser único e validado.
- Empresa pode ser desativada sem apagar dados.

#### Usuários
- Email único por todo o sistema.
- Usuário `master` não pertence a nenhuma empresa e acessa todos os tenants.
- Usuário `admin` pertence a uma empresa e gerencia produtos, vendas e usuários da própria empresa.
- Usuário `user` pertence a uma empresa e acessa apenas operações do dia a dia (PDV, consultas).
- Usuário inativo não consegue fazer login.
- Senha mínima de 6 caracteres.

#### Produtos
- SKU ou código interno obrigatório e único por empresa.
- Preço de venda deve ser maior ou igual a zero.
- Preço de custo opcional, mas quando informado não pode ser negativo.
- Quantidade em estoque não pode ficar negativa por padrão.
- Produto pode ser desativado sem perder histórico.
- Produto excluído soft delete; não pode ser apagado se existir em vendas.

#### Clientes
- CPF/CNPJ único por empresa.
- Cliente pode ter endereço e telefone opcionais.
- Cliente com histórico de vendas não pode ser removido fisicamente.

#### Fornecedores
- CNPJ ou identificação única por empresa.
- Fornecedor pode ser marcado como ativo/inativo.

#### Estoque
- Todo produto tem uma quantidade em estoque por empresa.
- Movimentações: entrada, saída, ajuste.
- Entrada aumenta estoque; saída diminui.
- Venda confirmada gera saída de estoque automaticamente.
- Cancelamento de venda devolve estoque.
- Estoque negativo é bloqueado por padrão.
- Alerta de baixo estoque quando quantidade atinge o mínimo definido.

#### Vendas/Pedidos
- Pedido pertence a uma empresa e a um cliente (opcional).
- Status: `rascunho`, `confirmado`, `pago`, `cancelado`, `entregue`.
- Pedido confirmado reserva/desconta estoque.
- Pedido pago fecha a venda e gera movimentação financeira.
- Pedido cancelado estorna estoque e cancela movimentação financeira.
- Preço unitário dos itens é congelado no momento da venda.
- Desconto não pode deixar item ou total negativo.
- Total do pedido é a soma dos itens menos descontos.

#### Caixa
- Caixa deve ser aberto com um valor inicial.
- Apenas um caixa pode estar aberto por usuário/empresa por vez.
- Vendas vinculadas ao caixa aberto.
- Retiradas (sangria) e suprimentos (reforço) registrados.
- Fechamento calcula saldo final: inicial + vendas + reforços - retiradas.

#### Financeiro básico
- Cada venda gera uma entrada no caixa/financeiro.
- É possível registrar contas a pagar manualmente (água, aluguel, fornecedor).
- Status: pendente, pago, cancelado.

#### Dashboard e relatórios
- Dashboard: vendas do dia, semana e mês; produtos com estoque baixo; total em caixa.
- Relatórios filtrados por período e empresa.

## 5. Pós-MVP — funcionalidades futuras

- Emissão de nota fiscal via integração (Tiny, Bling, Focus NFe)
- Múltiplas lojas/filiais por empresa
- Mesas e comandas (restaurantes)
- E-commerce B2C
- Catálogo online com pedidos
- Integração com maquininhas de cartão
- Leitor de código de barras
- Impressão de recibos
- Programa de fidelidade
- Orçamentos
- Ordem de compra
- Contas bancárias e conciliação
- API aberta para parceiros

## 6. Roadmap sugerido

### Fase 1 — Fundação (agora)
- Ajustar isolamento de tenant
- Adicionar audit trail
- Refinar modelo de usuários e permissões
- Criar módulo de empresas/tenants robusto

### Fase 2 — Catálogo e estoque
- Categorias
- Produtos com unidade e estoque
- Movimentações de estoque
- Alertas de estoque baixo

### Fase 3 — Pessoas
- Clientes
- Fornecedores

### Fase 4 — Vendas e caixa
- Pedidos/PDV
- Formas de pagamento
- Caixa (abertura/fechamento)
- Dashboard de vendas

### Fase 5 — Financeiro e relatórios
- Contas a pagar/receber
- Relatórios de vendas e estoque
- Fluxo de caixa

### Fase 6 — Hardening
- Testes de integração
- Validações robustas
- Preparação para fiscal

### Fase 7 — Integrações
- Nota fiscal via parceiro
- Meios de pagamento
- APIs externas

## 7. Decisões técnicas pendentes

| Decisão | Opções | Recomendação |
|---|---|---|
| Banco de dados | MongoDB x PostgreSQL | Manter MongoDB no MVP por velocidade; avaliar PostgreSQL se dados fiscais exigirem relacional |
| Histórico de estoque | Embedded array x coleção separada | Coleção separada para audit trail e performance |
| Itens do pedido | Embedded x referência | Embedded no pedido para leitura rápida, com snapshot de preço |
| Caixa | Um documento por turno x múltiplos | Um documento por abertura/fechamento |
| Permissões | Hardcoded roles x matriz de permissões | Começar com roles + flags simples, evoluir para matriz |

## 8. Próximos passos imediatos

1. Implementar módulo de empresas/tenants com validações de CNPJ e endereço.
2. Adicionar audit trail nas operações de criação/alteração/exclusão.
3. Criar módulo de categorias.
4. Refatorar o módulo de produtos para suportar unidade, estoque mínimo e categorias.
5. Criar módulo de movimentação de estoque.
6. Criar módulo de clientes.
7. Criar módulo de vendas (pedidos + itens).
8. Implementar controle de caixa básico.

## 9. O que ficará de fora do MVP de propósito

- Emissão de nota fiscal própria
- Múltiplas filiais
- E-commerce
- App mobile
- Integração bancária
- Controle de lotes e validade
- Comandas e mesas

Isso mantém o escopo enxuto e permite lançar mais rápido.
