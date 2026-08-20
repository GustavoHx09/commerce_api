# Regras e Padrões do Projeto

Regras e padrões que devem ser seguidos antes e durante qualquer alteração no código.

## 1. Análise completa antes de codar

- Sempre leia o código/arquivos relacionados antes de começar a implementar.
- Entenda o fluxo de dados, estados, props e chamadas de API envolvidas.
- Verifique regras de negócio já existentes no backend e no frontend.
- Só comece a codar depois de ter contexto suficiente.

## 2. Validações devem estar em ambos os lados

- Toda validação de negócio ou de entrada do usuário deve existir no **frontend** (UX rápida).
- A mesma validação **deve ser reforçada no backend** (fonte confiável da regra).
- Não confie apenas em validação do lado do cliente.

## 3. Pergunte antes de codar

- Qualquer dúvida sobre regra de negócio, comportamento esperado, escolha de componente/lib ou estratégia deve ser tirada com o usuário **antes** de escrever código.
- Não saia "chutando" implementações.

## 4. DRY (Don't Repeat Yourself)

- Mantenha cada regra/funcionalidade com **uma única fonte de verdade**.
- Só extraia componentes ou funções reutilizáveis se houver **uso real** em mais de um lugar.
- Não crie abstrações "caso um dia precise".
- Se houver dúvida sobre o que vale a pena reaproveitar, pergunte ao usuário.

## 5. Organização e consistência

- Monte um plano a ser seguido e executado por partes.
- Siga a estrutura e convenções já existentes no projeto.
- Prefira editar arquivos existentes a criar novos, exceto quando solicitado.
- Evite comentários explicativos desnecessários; o código deve ser legível por si só.

## 6. Antes de finalizar

- Rode os testes/verificações disponíveis (tsc, lint, build, etc.).
- Valide que a mudança não quebrou fluxos adjacentes.
- Resuma o que foi alterado ao usuário.

## 7. Commits e mensagens

- Antes de fazer qualquer commit ou push, pergunte ao usuário se deseja prosseguir.
- Não saia commitando e subindo código sem permissão explícita.
- Só faça o commit após o usuário confirmar que está tudo certo.

### Padrão de mensagens de commit

Todas as mensagens de commit devem seguir o formato:

```
<tipo_da_alteracao>(<oque_foi_alterado>): <breve_descricao_das_alteracoes>
```

- `tipo_da_alteracao`: Feat, Fix, Refactor, Style, Docs, Test, Chore, etc.
- `oque_foi_alterado`: escopo alterado (rota, componente, página, módulo, etc.).
- `breve_descricao_das_alteracoes`: descrição curta e direta do que mudou.

Exemplo:

```
Feat(device/:id/status): Rota implementada para verificar se o dispositivo está online ou offline
```
