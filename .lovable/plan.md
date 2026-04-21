

# Plano — QA manual no preview: Magic Up cenários A–D

Vou abrir o preview com o navegador automatizado e percorrer, na ordem, os 4 cenários da Onda 5, registrando inconsistências de UI, estado e histórico.

## Pré-checagem
- `navigate_to_sandbox` em `/magic-up`
- `screenshot` inicial + `read_console_logs` para detectar erros antes de interagir
- Confirmar que header, stepper e painel de configuração renderizaram (sem skeleton preso, sem layout shift)

## Cenário A — primeira geração comercial
1. Selecionar cliente, produto, logo e cenário (usando `observe` + `act` em cada etapa do stepper)
2. Disparar **Gerar imagem**
3. Aguardar resposta da `generate-ad-image` + `magic-up-score` (poll com `screenshot` curtos)
4. Validar:
   - loading visível durante geração
   - `AdImageResult` mostra a imagem final
   - `MagicUpQualityScore` aparece com nota + origem (`IA` esperada)
   - `MagicUpQualityChecklist` lista critérios
   - `MagicUpCurationStatus` inicia em **Rascunho**
   - botão **Reanalisar Magic Score** presente
   - histórico recebeu novo item com score + status

## Cenário B — fallback heurístico
1. Disparar nova geração (sem mexer em config)
2. Após imagem aparecer, observar diagnóstico:
   - Se `magic-up-score` falhar/retornar quota, badge deve mostrar **Heurístico**
   - UI não trava, score numérico ainda aparece, histórico salva o item
3. Se a IA responder normalmente, registro como **não reproduzido em ambiente real** (não é bug; comportamento simulado já coberto em testes unitários)

## Cenário C — curadoria operacional
1. Sobre a variação atual, alterar status na sequência: Boa → Aprovada internamente → Enviada ao cliente
2. Após cada clique:
   - confirmar destaque visual no botão ativo
   - `screenshot` para conferir badge sincronizada no `AdImageResult`
3. Recarregar histórico (clicar em outro item e voltar) e verificar persistência do último status

## Cenário D — comparação de variações
1. Voltar para config e gerar com **N=2 ou 3 variações** (controle criativo)
2. Validar:
   - dots de paginação aparecem
   - thumbnails inferiores sincronizam com a imagem ativa
   - `MagicUpVariationComparator` renderiza com badge **Melhor score**
   - clique em outra variação troca imagem principal + score + checklist
   - botão **Marcar vencedora** atualiza variação ativa e dispara toast

## Checagens transversais durante o percurso
- `read_console_logs` ao final → listar erros JS
- `list_network_requests` → conferir 200/4xx em `generate-ad-image`, `magic-up-score`, `magic-up-generations`
- `supabase--edge_function_logs` em `magic-up-score` para correlacionar respostas

## Restrições
- **Sem ações destrutivas no histórico** (não excluir gerações de outros usuários)
- Se o preview pedir login, parar e avisar o usuário
- Se a geração de IA for bloqueada por quota/protection, registrar como ressalva, não como bug

## Entregável
Relatório consolidado por cenário (A/B/C/D) com:
- ✅ aprovado / ⚠️ ressalva / 🐛 bug
- screenshots-chave referenciadas
- lista de inconsistências encontradas (UI, estado, histórico, network)
- recomendações de correção quando houver bug

Sem alterações de código nesta rodada — apenas diagnóstico.

