
User wants the Kit Maker wizard step bar (image 988) to be more compact/lower height, similar to the Mockup wizard bar (image 989) which is sleeker.

Looking at current `WizardSteps.tsx` (Kit Maker): big circles (likely w-14 h-14), large "01" ordinal labels above, bold step name + subtitle below = ~140px tall.

Mockup bar reference: smaller circles (~w-12 h-12), no ordinal numbers on top, single label + small subtitle, much more compact ~80px.

# Plano

Reduzir altura da `WizardSteps` do Kit Maker:

1. **Remover** os badges "01/02/03/04" flutuantes acima dos círculos (eles dobram a altura).
2. **Diminuir círculos**: de `w-14 h-14` para `w-12 h-12`, ícone `h-5 w-5`.
3. **Reduzir spacing**: gap vertical entre círculo e label de `mt-3` para `mt-2`, label `text-sm` em vez de `text-base`, subtitle `text-[11px]`.
4. **Padding container**: reduzir `py-` da seção do wizard para algo como `py-3`.
5. **Manter**: barra de progresso contínua no topo, glow do step ativo, mini-resumos verdes (apenas encolher fonte).

Resultado: barra compacta ~80–90px, alinhada com o padrão do Mockup, preservando identidade premium (glow, progress bar, motion).

Arquivo único afetado: `src/components/kit-builder/WizardSteps.tsx`.
