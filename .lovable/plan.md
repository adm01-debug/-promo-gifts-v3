## Remover categoria duplicada no rodapé do ProductCard

A categoria já é exibida no topo do card via `<ProductCategoryBadges>` (linhas 240-242). O bloco do rodapé (linhas 292-300) repete a mesma informação com ícone `FolderTree` e fundo azul, criando ruído visual.

### Mudança

**Arquivo:** `src/components/products/ProductCard.tsx`

Remover o bloco "Category line — bright accent strip" (linhas 292-300):

```tsx
{/* Category line — bright accent strip */}
{product.category?.name && (
  <div className="flex flex-wrap gap-1.5 pt-1.5 mt-0.5 border-t border-primary/20">
    <span className="...">
      <FolderTree className="h-2.5 w-2.5" aria-hidden="true" />
      {product.category.name}
    </span>
  </div>
)}
```

Também remover o import `FolderTree` de `lucide-react` se não for usado em mais nenhum lugar do arquivo.

### Resultado

- Categoria continua visível no topo via `ProductCategoryBadges` (padrão do app).
- Card fica mais limpo, sem informação repetida.
- Materials chips (linha 302+) continuam intactos.