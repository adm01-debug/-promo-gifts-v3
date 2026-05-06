# ADR 002: Máquina de Estados para Ciclo de Vida de Orçamentos

## Contexto
O fluxo de orçamentos tornou-se complexo, envolvendo múltiplos estados (draft, pending, approved, converted, expired) e transições condicionais. O gerenciamento manual de booleanos (`isDraft`, `isApproved`) estava levando a estados impossíveis e bugs de UI.

## Decisão
Implementar o ciclo de vida do orçamento utilizando uma **Máquina de Estados Finita (FSM)** com a biblioteca **XState**.

## Detalhes Técnicos
- **Localização**: `src/lib/quote/stateMachine.ts`
- **Estados**: 
  - `draft`: Edição inicial pelo vendedor.
  - `pending_approval`: Aguardando ação do cliente.
  - `approved`: Aceito pelo cliente, pronto para conversão.
  - `rejected`: Recusado pelo cliente.
  - `expired`: Validade expirada.
  - `converted`: Transformado em pedido (estado final).
- **Vantagens**:
  - Eliminação de estados contraditórios.
  - Transições explícitas e documentadas.
  - Facilidade de teste das regras de negócio sem depender da UI.

## Consequências
- **Positivas**: Maior confiabilidade no fluxo de vendas e facilidade em adicionar novos estados (ex: `review_requested`).
- **Negativas**: Pequena curva de aprendizado para desenvolvedores não familiarizados com XState.
