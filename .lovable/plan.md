

## Corrigir vídeo bloqueado no player de produto

### Problema
Ao clicar no botão "Vídeo" na galeria do produto, o dialog mostra "Este conteúdo está bloqueado". Isso ocorre porque o `url_stream` (Cloudflare Stream) usa um iframe que bloqueia a incorporação no domínio do preview/produção.

### Solução
Implementar uma estratégia de fallback resiliente no player de vídeo:

1. **Priorizar `<video>` nativo sobre `<iframe>`** — Usar `url_hls` ou `url_original` com o elemento `<video>` HTML5, que não sofre restrições de embedding.

2. **Cadeia de fallback**:
   - 1º: `url_original` (arquivo direto) → `<video>` nativo
   - 2º: `url_hls` (stream HLS) → `<video>` nativo  
   - 3º: `source_youtube_id` → `<iframe>` YouTube embed
   - 4º: `url_stream` (Cloudflare) → `<iframe>` (último recurso)

3. **Detecção de erro no iframe** — Adicionar `onError` no iframe do Cloudflare Stream para automaticamente trocar para a URL alternativa caso o embed falhe.

### Arquivo alterado
**`src/components/products/ProductGallery.tsx`** (linhas 670-693)
- Reorganizar a lógica condicional do player de vídeo para priorizar `<video>` nativo com `url_original` ou `url_hls`
- Mover o iframe de `url_stream` para o final da cadeia de fallback
- Manter o iframe do YouTube como está (funciona normalmente)

### Resultado esperado
O vídeo será reproduzido diretamente via player HTML5 nativo, sem depender do iframe do Cloudflare que bloqueia o embedding.

