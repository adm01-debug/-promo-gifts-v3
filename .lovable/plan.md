

## Plano: Linkar botão Compartilhar ao fluxo "Enviar - WhatsApp"

### Contexto
O botão de compartilhar (ícone de corrente/share) no catálogo atualmente apenas copia o link ou usa a Web Share API. O objetivo é que ele abra o **SharePreviewDialog** — o mesmo fluxo completo de "Enviar - WhatsApp" com seleção de fotos, template de mensagem e contato.

### Alterações

**1. `src/hooks/useCatalogState.ts`**
- Remover a lógica simples de `handleShareProduct` (clipboard/navigator.share)
- Substituir por um estado que armazena o produto selecionado para compartilhamento: `shareProduct` / `setShareProduct`
- `handleShareProduct` passa a apenas setar esse estado (abrir o dialog)
- Expor `shareProduct` e `setShareProduct` no retorno do hook

**2. `src/pages/Index.tsx`**
- Importar `SharePreviewDialog`
- Renderizar o dialog controlado por `catalog.shareProduct`
- Passar `onOpenChange` que limpa o estado ao fechar

**3. `src/pages/FiltersPage.tsx`** (se também usa share)
- Mesma integração: estado local + `SharePreviewDialog`

### Resultado
Ao clicar no botão de compartilhar em qualquer ProductCard do catálogo, abre o dialog completo de WhatsApp com seleção de fotos, templates de mensagem e seleção de contato — idêntico ao fluxo da página de detalhes do produto.

