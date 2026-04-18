
User wants to group "Inteligência de Mercado" and "Business Analytic" under a new sidebar topic/section.

Let me check the current sidebar structure.
<lov-tool-use id="toolu_vrtx_01EWdbbPWKbFdBq9ATcMFRva" name="code--search_files" integration-id="code" data="{\"query\": \"Inteligência de Mercado|Business Analytic|inteligencia-comercial|/bi\", \"include_patterns\": \"src/components/layout/SidebarReorganized.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01SsBA1Yh6cmQa23EWhRNZxL" name="code--search_files" integration-id="code" data="{\"query\": \"Inteligência de Mercado|Business Analytic|inteligencia-comercial|\\\"/bi\\\"\", \"include_patterns\": \"src/components/layout/SidebarReorganized.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016yjjTRoyBkHXM8TDKjs7Sw" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/layout/SidebarReorganized.tsx\", \"lines\": \"1-120\"}">
</lov-tool-use>
<lov-plan>
Move "Inteligência de Mercado" and "Business Analytic" out of the "Ferramentas" group into a new dedicated sidebar group called **"Inteligência"** (icon: `Brain`).

Edit: `src/components/layout/SidebarReorganized.tsx`
- Remove lines 84-85 from the `tools` group.
- Insert a new `NavGroup` (e.g. between `tools` and `carts`, or after `analytics`):
  ```
  {
    id: "intelligence",
    label: "Inteligência",
    icon: Brain,
    defaultOpen: false,
    items: [
      { icon: Brain, label: "Inteligência de Mercado", href: "/inteligencia-comercial" },
      { icon: Sparkles, label: "Business Analytic", href: "/ferramentas/bi" },
    ],
  }
  ```

Result: the two items become a standalone collapsible topic in the sidebar, separate from Ferramentas.
