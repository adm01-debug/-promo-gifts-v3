

# Modal de confirmação antes de rotacionar credencial

## Diagnóstico

Hoje em `SecretField.tsx`, ao clicar **"Rotacionar"** com um valor novo digitado, a função `rotateSecret` é chamada imediatamente — sem confirmação. Como rotação é uma operação destrutiva (sobrescreve o segredo atual e gera entrada permanente em `secret_rotation_log`), faz sentido pedir confirmação explícita.

Já existe `src/components/ui/ConfirmDialog.tsx` com variante `warning`, ícone `AlertTriangle`, suporte a `loading` e bloco `impactPreview` — perfeito para reutilizar.

## Solução

### 1. Novo modal `RotateSecretConfirmDialog`

Componente fino (~50 linhas) que envolve o `ConfirmDialog` existente com conteúdo específico para rotação:

```text
┌─ ⚠ Rotacionar credencial? ──────────────────────────┐
│                                                      │
│ Você está prestes a rotacionar:                     │
│   SUPABASE_SERVICE_ROLE_KEY                         │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ Valor atual:  ••••YZ89  (203 chars)          │   │
│ │ Novo valor:   ••••KM47  (198 chars)          │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ Isto irá:                                            │
│  • Sobrescrever a credencial em uso agora            │
│  • Registrar a rotação no histórico de auditoria    │
│  • Disparar verificação automática da nova chave    │
│                                                      │
│ Esta ação não pode ser desfeita.                    │
│                                                      │
│        [ Cancelar ]   [ Sim, rotacionar ]           │
└──────────────────────────────────────────────────────┘
```

Props:
- `secretName: string` — nome da credencial (ex: `SUPABASE_SERVICE_ROLE_KEY`)
- `currentSuffix: string | null` — sufixo mascarado atual (do `status.masked_suffix`)
- `currentLength: number | null` — tamanho atual
- `newSuffix: string` — últimos 4 chars do novo valor digitado (calculado client-side)
- `newLength: number` — tamanho do novo valor
- `notes?: string` — opcional (campo livre para anotação de auditoria, ver item 3)
- `onConfirm: (notes?: string) => Promise<void>`
- `loading: boolean`
- `open` / `onOpenChange`

Internamente usa `<ConfirmDialog variant="warning" impactPreview={...} />` com:
- `title: "Rotacionar {secretName}?"`
- `confirmLabel: "Sim, rotacionar"`
- `cancelLabel: "Cancelar"`
- O bloco "Valor atual / Novo valor" renderizado como `children` extras antes do `impactPreview`

### 2. Integração no `SecretField.tsx`

Substituir o handler atual de "Rotacionar" por:

```ts
// antes: chama rotateSecret direto
onClick={() => handleRotate()}

// depois:
onClick={() => setRotateConfirmOpen(true)}
```

E ao confirmar no modal, executa o `rotateSecret` real (mantendo o flash verde, toast e bump de `historyRefreshKey` que já funcionam).

Calcular `newSuffix` no frontend a partir do valor digitado:
```ts
const newSuffix = newValue.slice(-4);
const newLength = newValue.length;
```

### 3. Campo opcional "Motivo da rotação" (auditoria)

Dentro do modal, adicionar um `<Textarea>` opcional rotulado **"Motivo (opcional)"** com placeholder _"Ex: rotação periódica trimestral, comprometimento suspeito, troca de fornecedor..."_. O valor é passado como `notes` ao `rotateSecret`, que já aceita esse parâmetro e grava em `secret_rotation_log.notes` (visível depois no `RotationHistoryDialog`).

Limite de 200 chars, contador discreto no canto. Não é obrigatório — o usuário pode confirmar com o campo vazio.

### 4. Estados e comportamento

- **Botão "Rotacionar" no SecretField**: continua exigindo que o usuário tenha digitado um valor novo antes de habilitar (já é o comportamento atual). Só abre o modal se houver valor.
- **Loading no modal**: durante o `await rotateSecret(...)`, botão "Sim, rotacionar" mostra spinner e fica desabilitado, "Cancelar" também desabilitado, fechamento por ESC/click-outside bloqueado.
- **Após sucesso**: modal fecha automaticamente, flash verde aparece no campo, toast confirma, painel de histórico inline atualiza.
- **Após erro**: modal permanece aberto com mensagem de erro inline (ex: "Falha ao rotacionar: rede indisponível"), botão volta a estar clicável para retry.

### 5. Detalhes visuais

- Ícone do header: `AlertTriangle` amarelo (variante `warning` do `ConfirmDialog`)
- Bloco "Valor atual / Novo valor" em fundo `bg-muted/50` com fonte `font-mono` para os sufixos, similar ao já usado em `RotationHistoryRow`
- Texto "Esta ação não pode ser desfeita" em `text-destructive text-sm font-medium`
- Botão de confirmação usa cor padrão warning (não destructive) — rotação é uma operação esperada/positiva, não uma exclusão

## Arquivos tocados

**Frontend (novos)**
- `src/components/admin/connections/RotateSecretConfirmDialog.tsx` (~90 linhas): wrapper especializado do `ConfirmDialog` com bloco "Valor atual → Novo valor", textarea opcional de motivo, e props tipadas.

**Frontend (editados)**
- `src/components/admin/connections/SecretField.tsx`:
  - Adicionar state `rotateConfirmOpen` e `rotateConfirmLoading`
  - Trocar `onClick` direto do botão "Rotacionar" por `setRotateConfirmOpen(true)`
  - Renderizar `<RotateSecretConfirmDialog />` no rodapé do componente
  - Mover a lógica real de `rotateSecret` para `handleConfirmedRotate(notes)` chamado pelo modal
  - Calcular `newSuffix` e `newLength` a partir do valor digitado

## Fora de escopo

- Não muda o backend `secrets-manager` (o action `rotate` já aceita `notes`)
- Não adiciona modal de confirmação para "Configurar" inicial (set sem valor anterior — não é destrutivo)
- Não adiciona modal para "Atualizar" (overwrite simples sem entrada em `secret_rotation_log` — fluxo separado, pode vir em onda futura se necessário)
- Não adiciona política de exigir motivo obrigatório (continua opcional; pode virar feature flag depois)
- Não muda o `RotationHistoryDialog` ou `RotationHistoryRow` (já mostram `notes` quando presente)

