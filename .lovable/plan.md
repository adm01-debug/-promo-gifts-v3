
Remover "Duplicar kit" do dropdown "Ações rápidas" do Kit Maker.

## Mudanças

**1. `src/components/kit-builder/KitBuilderHeader.tsx`**
- Remover o `DropdownMenuItem` "Duplicar kit" (linhas ~131-134) e o separador associado.
- Remover o ícone `Copy` do import se não for mais usado.
- Remover a prop `onDuplicate` da interface.

**2. `src/pages/KitBuilderPage.tsx`**
- Remover a função `handleDuplicateKit` (linhas 173-…).
- Remover a prop `onDuplicate={handleDuplicateKit}` passada ao header.

**3. Backend**: nenhuma alteração necessária — não existe endpoint/edge function/tabela específica para "duplicar kit". A duplicação atual é puramente lógica no frontend (clona estado e zera ID). A duplicação em `MeusKitsPage.tsx` (linha 134) é uma feature **separada** da listagem "Meus Kits" e **não foi solicitada** para remoção (o usuário apontou só o dropdown do builder).

**4. Validação**
- Build TypeScript check.
- Confirmar que o dropdown agora exibe apenas "Novo kit".
