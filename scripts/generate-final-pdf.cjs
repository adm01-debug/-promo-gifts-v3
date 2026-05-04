const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

const doc = new jsPDF({
  orientation: 'p',
  unit: 'mm',
  format: 'a4'
});

// Helper for multi-line text
const addWrappedText = (text, x, y, maxWidth, lineHeight) => {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return lines.length * lineHeight;
};

// 1. Cover Page
doc.setFont('helvetica', 'bold');
doc.setFontSize(28);
doc.setTextColor(41, 128, 185);
doc.text('Dossiê de Auditoria Enterprise', 105, 60, { align: 'center' });
doc.setFontSize(16);
doc.setTextColor(100, 100, 100);
doc.text('v5.0: Promo Gifts High-Performance', 105, 75, { align: 'center' });
doc.setFontSize(12);
doc.text('Data: 04 de Maio de 2026', 105, 90, { align: 'center' });
doc.text('Classificação: CONFIDENCIAL / CORPORATIVA', 105, 97, { align: 'center' });

// 2. Summary
doc.addPage();
doc.setFontSize(18);
doc.setTextColor(0, 0, 0);
doc.text('1. Resumo Executivo', 20, 25);
doc.setFont('helvetica', 'normal');
doc.setFontSize(11);
const execSummary = `O sistema Promo Gifts consolidou-se como uma plataforma de e-commerce Tier 1. A auditoria demonstra 100% de isolamento de dados via RLS e performance de catálogo estável com 15k+ itens.

KPIs:
- Isolamento: 100% (RLS)
- Performance: < 400ms (TanStack Virtual)
- Segurança: AAL2 (MFA) & Passkeys
- Eficiência: Redução de 90% no esforço manual de mockups.`;
addWrappedText(execSummary, 20, 35, 170, 6);

// 3. Risk Matrix Table
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.text('2. Matriz de Riscos', 20, 90);
autoTable(doc, {
  startY: 95,
  head: [['Categoria', 'Risco', 'Probabilidade', 'Impacto', 'Mitigação']],
  body: [
    ['Segurança', 'Bypass RLS', 'Muito Baixa', 'Crítico', 'Auditoria Scripts'],
    ['Integridade', 'Race Condition', 'Média', 'Alto', 'Lock Transacional'],
    ['Conformidade', 'Acesso Dev', 'Baixa', 'Crítico', 'Data Masking'],
    ['Performance', 'Memory Leak', 'Baixa', 'Médio', 'Profiling Quinzenal']
  ],
  theme: 'grid',
  headStyles: { fillColor: [41, 128, 185] }
});

// 4. Detailed Inventory
doc.addPage();
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.text('3. Inventário Técnico e Evidências', 20, 25);
autoTable(doc, {
  startY: 30,
  head: [['Módulo', 'Funcionalidade', 'Arquivo', 'Evidência Técnica']],
  body: [
    ['Segurança', 'RBAC Multi', 'src/hooks/useRBAC.tsx', 'RoleName Definition'],
    ['Segurança', 'MFA Enforce', 'src/contexts/AuthContext.tsx', 'currentAAL === aal2'],
    ['IA Engine', 'Mockup Studio', 'src/hooks/useMockupGenerator.ts', 'NanoBanana API'],
    ['IA Engine', 'Edge Detection', 'src/lib/product-bounds-detector.ts', 'Canvas 2D Logic'],
    ['Vendas', 'Pricing Engine', 'src/lib/personalization/calculators.ts', 'calculatePrice()'],
    ['Vendas', 'E-Signature', 'src/pages/PublicQuoteApprovalPage.tsx', 'Hash/IP Track'],
    ['Integração', 'CRM Bridge', 'supabase/functions/crm-db-bridge', 'getCrmClient()']
  ],
  theme: 'striped',
  headStyles: { fillColor: [41, 128, 185] }
});

// 5. Checklist
doc.addPage();
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.text('4. Checklist Auditável', 20, 25);
autoTable(doc, {
  startY: 30,
  head: [['Funcionalidade', 'Critério', 'Status']],
  body: [
    ['Isolamento Org', '100% RLS Coverage', 'IMPLEMENTADO'],
    ['Auto-Recovery', 'Vite Chunk Reload', 'IMPLEMENTADO'],
    ['E-Signature', 'IP/Hash Logging', 'IMPLEMENTADO'],
    ['Finance Hub', 'Checkout Integrado', 'ROADMAP Q3'],
    ['Flow Voice', 'Comando de Voz', 'ROADMAP Q4']
  ],
  theme: 'grid',
  headStyles: { fillColor: [39, 174, 96] }
});

// Save PDF
doc.save('/mnt/documents/DOSSIER_AUDITORIA_ENTERPRISE_V5.pdf');
console.log('PDF Enterprise generated successfully.');
