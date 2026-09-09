# Planejamento — Commerce API

Plano de evolução do sistema para atender comércios e varejos com arquitetura multitenancy.

## 1. Visão do produto

Sistema de gestão comercial em nuvem, oferecido como **SaaS B2B multitenancy**, onde cada tenant representa uma empresa/comércio. Foco inicial no **varejo/comércio geral**, com possibilidade futura de atender supermercados e restaurantes.

A aplicação funcionará **exclusivamente online** no MVP. Não haverá banco local nos computadores dos clientes nem sincronização offline; a disponibilidade será tratada na infraestrutura central com monitoramento, backups, recuperação e, conforme o crescimento, redundância.

O MVP deve permitir que uma loja controle **produtos, estoque, clientes, fornecedores, vendas e caixa** sem precisar emitir nota fiscal integrada. O mesmo frontend atenderá todas as empresas e aplicará nome, logo e cores conforme a configuração do tenant, sem manter uma versão separada para cada cliente.

## 2. Arquitetura atual

- Backend: Node.js + Express + MongoDB
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind
- Autenticação: JWT em cookie `HttpOnly` com blacklist e revogação ao trocar senha
- Multitenancy: campo `tenantId` nos documentos
- Roles: `master`, `admin`, `user`
- Permissões granulares: roles + presets vinculáveis + permissões extras/revogações individuais
- PDV com transações MongoDB para garantir atomicidade de estoque, pagamento e pedido

## 3. Ajustes estruturais já concluídos

As mudanças abaixo foram aplicadas e devem ser mantidas em novos módulos:

- [x] **Padronizar tenant como empresa**: renomear mentalmente `tenant` para `company`/`business`, mas manter o campo `tenantId` como chave de isolamento.
- [x] **Adicionar audit trail**: registrar quem criou/alterou registros sensíveis (quem, quando, o que mudou).
- [x] **Isolamento obrigatório**: nenhuma consulta pode esquecer o `tenantId`, exceto para `master`.
- [x] **Soft delete consistente**: reutilizar a estratégia já existente nos novos módulos.
- [x] **Permissões granulares**: além de roles, definir permissões no formato `resource:action`, com presets vinculados e ajustes individuais.

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
| Relatórios | Vendas por período, produtos mais vendidos, posição de estoque, fluxo de caixa | Média |
| Exportação | Download de produtos, clientes, fornecedores, categorias e pedidos em CSV/JSON | Média |

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

## 6. Roadmap por prioridade

A ordem abaixo separa o que é necessário para construir o produto, liberar clientes-piloto, comercializar com segurança e escalar. Itens de uma fase devem estar estáveis antes de avançar para a seguinte.

### Fase 1 — Fundação, isolamento e identidade da empresa (em andamento — recuperação de senha pendente)

Objetivo: impedir retrabalho estrutural e garantir que uma empresa nunca acesse dados de outra.

- [x] Ajustar e testar o isolamento obrigatório por `tenantId` em todas as consultas.
- [x] Criar módulo de empresas/tenants robusto, com CNPJ, endereço, status e configurações.
- [x] Usar um único frontend multitenancy, sem cópias personalizadas por cliente.
- [x] Permitir nome de exibição, logo e cores por tenant, com validação de formato e tamanho da imagem.
- [x] Armazenar logos em object storage; não aceitar CSS ou JavaScript fornecido pelo cliente.
- [x] Refinar usuários, roles e permissões granulares com menor privilégio.
- [x] Adicionar audit trail para operações sensíveis.
- [x] Padronizar soft delete e garantir preservação de histórico.
- [x] Reforçar autenticação, expiração e revogação de sessões.
- [ ] Implementar recuperação de senha com envio de email e token temporário.
- [x] Manter segredos fora do código e separar desenvolvimento, homologação e produção.

### Fase 2 — Catálogo, estoque e pessoas (concluído; extensão 2.1 em andamento)

Objetivo: entregar a base operacional necessária para registrar produtos e relacionamentos comerciais.

- [x] Categorias.
- [x] Produtos com unidade, preço, SKU e estoque mínimo.
- [x] Movimentações e inventário de estoque.
- [x] Alertas de estoque baixo.
- [x] Clientes.
- [x] Fornecedores.
- [x] Paginação, filtros e índices para as consultas principais.
- [x] Sistema de presets de permissões (backend concluído; painel do frontend na fase de UI).

#### Fase 2.1 — Presets de permissões e painel de autorizações (em andamento — backend concluído, frontend pendente)

Objetivo: permitir que o admin de cada empresa gerencie as autorizações dos operadores por meio de presets reutilizáveis e ajustes individuais.

**Modelo de dados**

- Novo módulo `permissionPreset` seguindo a estrutura padrão (Model/Repo/Service/Controller/Routes/`__tests__`):
  - `name` (obrigatório, ex: "Estoquista", "Vendedor"), `description`, `permissions: [String]` (formato `recurso:acao`), `tenantId`, `isActive`, `deletedAt`.
  - `tenantId = null` → presets globais do sistema, criados e gerenciados apenas pelo `master`.
  - `tenantId` preenchido → presets customizados do tenant, gerenciados pelo `admin` da empresa.
  - Índice composto: nome único por tenant (`tenantId + name`), permitindo mesmo nome em tenants diferentes.
- Alterações no `userModel`:
  - `permissionPresetId`: referência ao preset vinculado (null = sem preset).
  - `permissions`: passa a representar concessões **extras manuais** (aditivas sobre a base).
  - `revokedPermissions: [String]`: revogações individuais, removendo permissões específicas da base.

**Cálculo das permissões efetivas**

```
efetivas = (preset?.permissions ?? defaultRolePermissions[role])
         ∪ permissions (extras manuais)
         − revokedPermissions
```

- Alterar `getPermissions`/`hasPermission` em `permissionHelpers.js` para aplicar a fórmula acima.
- O `authMiddleware` popula o preset do usuário ao montar `req.user` (1 join adicional por request autenticada).
- **Atenção — mudança de semântica:** hoje `permissions` preenchido substitui as permissões da role; no novo modelo ele se torna aditivo. Como o campo ainda não é usado em produção, a migração é segura, mas deve ser documentada.

**Endpoints (backend)**

- `GET /permission-presets` → lista presets globais + do tenant do usuário (paginado, com soft delete respeitado).
- `POST /permission-presets` → cria preset (admin cria no próprio tenant; master pode criar global ou de qualquer tenant).
- `GET /permission-presets/:id`, `PUT /:id`, `DELETE /:id` (soft delete), `PUT /:id/restore`.
- `GET /permission-presets/available-permissions` → retorna o catálogo de permissões válidas do sistema (para montar os checkboxes do painel).
- `PUT /users/:id` passa a aceitar `permissionPresetId`, `permissions` e `revokedPermissions` com validações:
  - Preset deve existir, estar ativo e pertencer ao tenant do usuário (ou ser global).
  - Permissões extras/revogadas devem existir no catálogo.
  - `revokedPermissions` não pode conter permissão que não existe na base do usuário.
- Operações de escrita registram `auditAction` (regra 10 do AGENTS.md).

**Painel (frontend)**

- Tela de gerenciamento de permissões por usuário, acessível ao admin (e master):
  - Dropdown de presets disponíveis (globais + do tenant).
  - Checkboxes de permissões agrupados por recurso, mostrando claramente a origem: herdada do preset, extra manual (badge "extra") ou revogada (badge "revogada").
  - Ajuste individual sem desvincular o preset.
- CRUD de presets do tenant: criar, editar nome/descrição/permissões, ativar/desativar.
- Edição de preset propaga automaticamente para todos os usuários vinculados (característica do vínculo; exibir aviso na UI de quantos usuários serão afetados).

**Testes obrigatórios (regra 9 do AGENTS.md)**

- Cálculo de permissões efetivas: preset + extras − revogadas, fallback para defaults da role, `*` e `recurso:*`.
- Isolamento: admin não acessa/edita preset de outro tenant; usuário não recebe preset de outro tenant.
- Propagação: editar preset altera permissões efetivas dos vinculados.
- Validações de criação/edição de preset e de atribuição ao usuário.

**Documentação**

- Atualizar `README.md` raiz e `packages/api/README.md` (endpoints e regra de permissões).
- Atualizar `packages/web/README.md` com a nova tela.

### Fase 3 — Vendas, caixa, financeiro e gestão (concluído)

Objetivo: completar o fluxo principal que gera valor para o comércio.

- [x] Pedidos e PDV (backend com transações, baixa/estorno de estoque).
- [x] Formas de pagamento (módulo `payment` integrado ao pedido; sem dados de cartão).
- [x] Reserva, baixa e estorno de estoque com operações consistentes (módulo `stock` com movimentações `out`/`in` vinculadas ao pedido).
- [x] Caixa com abertura, fechamento, sangria e reforço.
- [x] Dashboard de vendas (backend + frontend: vendas do dia/semana/mês, estoque baixo, total em caixa).
- [x] Contas a pagar e receber (módulo bill).
- [x] Fluxo de caixa.
- [x] Relatórios de vendas e estoque.
- [x] Exportação dos dados essenciais da empresa.

### Fase 4 — Segurança, qualidade e operação online

Objetivo: preparar o sistema para receber clientes-piloto sem depender de banco local ou operação offline.

Escopo mínimo aprovado para os primeiros pilotos, **sem Redis e sem ferramentas pagas**:

- [x] Testes unitários e de integração dos fluxos críticos (auth, tenant, autorização, venda/caixa/estoque/pagamento).
- [x] Testes automatizados de autorização e isolamento entre tenants.
- [ ] Validações equivalentes no frontend e no backend (frontend será feito na fase de UI).
- [x] Proteções contra NoSQL injection, XSS, CSRF, brute force e uploads maliciosos (revisão básica aplicada).
- [x] HTTPS, cookies seguros, CORS restrito e headers de segurança.
- [x] Rate limiting por IP, usuário e tenant (em memória; substituir por store compartilhada ao escalar).
- [x] Logs sem senhas, tokens, CPF/CNPJ completos, endereços ou telefones desnecessários.
- [ ] Monitoramento de erros, latência, disponibilidade, CPU, memória, disco e conexões do banco (sem ferramenta paga no momento).
- [ ] Alertas para falhas críticas e indisponibilidade (sem ferramenta paga no momento).
- [x] Backup e restauração documentados com `mongodump`/`mongorestore` para desenvolvimento/estágio inicial.
- [ ] Backup automático point-in-time em produção (depende de provedor gerenciado pago; adiar até primeiro cliente-piloto definido).
- [x] Teste documentado de restauração de backup (comandos descritos no README da API).
- [x] Dockerfile e CI com testes unitários/integração.
- [ ] Documento de deploy e rollback detalhado para produção.
- [ ] Testes de carga com cenários reais e correção de consultas lentas.
- [ ] Definir RPO e RTO iniciais de acordo com custo e necessidade dos clientes-piloto.

### Fase 5 — Preparação comercial e clientes-piloto

Objetivo: validar produto, preço, operação e responsabilidades antes da venda em escala.

- Selecionar poucos clientes-piloto do varejo/comércio geral.
- Definir planos por empresa, usuários, armazenamento, funcionalidades e suporte.
- Calcular custo por cliente considerando infraestrutura, terceiros, impostos, suporte e margem.
- Definir onboarding, treinamento, migração, cancelamento e exportação de dados.
- Definir o que está incluído no plano e quais serviços serão cobrados separadamente.
- Criar contrato de prestação/licenciamento do SaaS, termos de uso e política de privacidade.
- Criar regras de retenção, exclusão e tratamento de dados em conformidade com a LGPD.
- Definir responsabilidades do fornecedor e do cliente, suporte e SLA quando aplicável.
- Revisar licenças de bibliotecas, imagens, fontes, templates, APIs e serviços terceiros.
- Validar CNPJ, CNAE, tributação e emissão de nota fiscal com contador.
- Revisar documentos jurídicos com profissional especializado antes da comercialização.
- Considerar pesquisa e registro da marca e registro do programa no INPI.
- Usar gateway externo para cobranças; não processar nem armazenar cartões diretamente.
- Coletar métricas e feedback dos pilotos antes do lançamento amplo.

### Fase 6 — Escalabilidade e alta disponibilidade

Objetivo: crescer com base em métricas reais sem adicionar complexidade prematuramente.

- Medir requisições por segundo, picos simultâneos, latência e consumo por tenant.
- Tornar a API stateless para executar duas ou mais instâncias atrás de load balancer.
- Usar CDN para arquivos estáticos e object storage para uploads.
- Adicionar cache somente onde as métricas demonstrarem benefício.
- Processar e-mails, relatórios e tarefas pesadas em filas idempotentes.
- Aplicar cotas e limites de concorrência por tenant para evitar consumo desproporcional.
- Automatizar health checks, reinício de instâncias e deploy gradual.
- Adotar réplica/standby do banco com failover automático quando o SLA e o volume justificarem.
- Manter backups fora do ambiente principal e realizar testes periódicos de recuperação.
- Criar plano de resposta a incidentes, continuidade e comunicação de indisponibilidade.
- Avaliar infraestrutura ou banco dedicado apenas para clientes de grande porte.

### Fase 7 — Integrações e expansão do produto

Objetivo: ampliar o mercado somente após estabilizar o produto principal.

- Nota fiscal via parceiro.
- Meios de pagamento e maquininhas.
- APIs externas e API para parceiros.
- Múltiplas lojas/filiais.
- Funcionalidades específicas para supermercados ou restaurantes.
- E-commerce e catálogo online.

## 7. Responsabilidades no modelo SaaS

### Responsabilidade da plataforma

- Hospedagem, banco de dados, atualizações, correções e monitoramento.
- Segurança da aplicação e da infraestrutura sob seu controle.
- Backups, restauração e disponibilidade conforme o plano contratado.
- Isolamento dos tenants e controle de acesso.
- Suporte, integrações e limites descritos no plano.
- Tratamento adequado dos dados e gestão dos suboperadores contratados.

### Responsabilidade do cliente

- Internet, computadores, celulares, impressoras e rede interna.
- Gestão dos próprios usuários, permissões e senhas.
- Legalidade e qualidade dos dados, marcas e arquivos enviados.
- Contas e custos de serviços externos que o contrato atribuir ao cliente.
- Treinamento, migração ou personalização adicional quando não incluídos no plano.

## 8. Decisões técnicas e de produto

| Decisão | Escolha atual | Motivo |
|---|---|---|
| Modelo de entrega | SaaS B2B exclusivamente online | Centraliza atualizações, segurança, backup e suporte |
| Frontend por cliente | Um frontend multitenancy configurável | Evita duplicação e permite nome, logo e cores por empresa |
| Banco local | Não usar no MVP | Sincronização offline adicionaria conflitos, riscos e complexidade desnecessários |
| Banco principal | Manter MongoDB no MVP | Aproveita a arquitetura atual; reavaliar se necessidades fiscais/relacionais justificarem |
| Disponibilidade do banco | Banco gerenciado, backup e point-in-time recovery antes dos pilotos | Backup é obrigatório para recuperação; réplica e failover entram conforme SLA e crescimento |
| Histórico de estoque | Coleção separada | Facilita auditoria e desempenho |
| Itens do pedido | Embedded no pedido | Mantém leitura rápida e snapshot de preço |
| Caixa | Um documento por abertura/fechamento | Representa corretamente cada turno |
| Permissões | Roles + presets vinculados + ajustes individuais (extras/revogações) | Preset propaga mudanças para todos os vinculados; ajustes individuais preservam flexibilidade por operador |
| Pagamentos dos pedidos | Módulo `payment` vinculado a `order`; um pagamento por venda no MVP | Permite evoluir para split de pagamentos e integrações futuras (Pix, maquininha) sem refatorar o pedido |
| Transações no PDV | Sessões/transações do MongoDB para criação e cancelamento de vendas | Garante atomicidade entre baixa/estorno de estoque, pagamento e pedido; evita vendas fantasmas |
| Pagamentos da assinatura | Gateway externo | Reduz o tratamento direto de dados financeiros sensíveis |

## 9. Próximos passos imediatos

### Entregas concluídas

- [x] Isolamento por `tenantId` validado e testado nos módulos existentes.
- [x] Módulo de empresas/tenants com CNPJ, endereço, nome, logo, cores e status.
- [x] Audit trail em operações de criação, alteração e exclusão.
- [x] Usuários, sessões, roles, permissões granulares e presets de permissões (backend).
- [x] Categorias, produtos (SKU, unidade, estoque mínimo), movimentações de estoque, alertas de baixo estoque, clientes e fornecedores.
- [x] Caixa, pedidos/vendas (PDV) e pagamentos com baixa/estorno atômico de estoque via transações MongoDB.
- [x] Contas a pagar e receber, fluxo de caixa e dashboard de vendas.
- [x] Relatórios de vendas, produtos, estoque, movimentações e fluxo de caixa.
- [x] Exportação de dados essenciais (produtos, clientes, fornecedores, categorias e pedidos) em CSV/JSON.

### Próximos passos

1. Implementar recuperação de senha (envio de email/token).
2. Implementar painel frontend de presets de permissões e permissões por usuário.
3. [x] Adicionar testes de integração/autorização entre tenants e endpoints (Fase 4).
4. [x] Aplicar proteções de segurança restantes: rate limiting por IP/usuário/tenant, logs sem dados sensíveis, headers de segurança e revisão básica de upload.
5. Preparar documento de deploy e rollback detalhado para produção (Render + MongoDB Atlas).
6. Concluir definições comerciais e jurídicas da Fase 5 antes de vender amplamente.

## 10. Critérios mínimos para liberar clientes-piloto

- Fluxos principais do MVP concluídos e testados.
- Isolamento entre tenants coberto por testes automatizados.
- Autenticação, permissões e audit trail funcionando.
- Backup automático e restauração testada.
- Monitoramento e alertas ativos.
- Deploy e rollback documentados e testados.
- Exportação e exclusão de dados definidas.
- Termos, privacidade, contrato e responsabilidades revisados.
- Suporte, preço, limites do plano e processo de cancelamento definidos.

## 11. O que ficará de fora do MVP de propósito

- Funcionamento offline, banco local e sincronização entre dispositivos.
- Emissão de nota fiscal própria.
- Múltiplas filiais.
- E-commerce.
- App mobile.
- Integração bancária.
- Controle de lotes e validade.
- Comandas e mesas.
- Infraestrutura dedicada por cliente.
- Certificações como ISO 27001 ou SOC 2, salvo exigência comercial concreta.

Isso mantém o escopo enxuto, prioriza segurança e operação confiável e permite lançar mais rápido sem antecipar complexidade de escala.
