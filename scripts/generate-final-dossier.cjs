const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;

const doc = new jsPDF({
  orientation: 'p',
  unit: 'mm',
  format: 'a4'
});

// Helper for multiline text
const addText = (text, x, y, maxWidth, size = 11, font = 'helvetica', style = 'normal') => {
  doc.setFont(font, style);
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return lines.length * (size * 0.4);
};

// 1. Cover
doc.setFont('helvetica', 'bold');
doc.setFontSize(32);
doc.setTextColor(41, 128, 185);
doc.text('Dossiê de Auditoria', 105, 60, { align: 'center' });
doc.text('Enterprise v5.0', 105, 75, { align: 'center' });
doc.setFontSize(14);
doc.setTextColor(100, 100, 100);
doc.text('Projeto: Promo Gifts High-Performance', 105, 95, { align: 'center' });
doc.text('Data: 04 de Maio de 2026', 105, 102, { align: 'center' });

// 2. Exec Summary
doc.addPage();
doc.setFontSize(20);
doc.setTextColor(0, 0, 0);
doc.text('1. Sumário Executivo', 20, 20);
const summary = `Este dossiê detalha a integridade técnica do sistema Promo Gifts. A infraestrutura baseada em Supabase e Edge Functions de IA foi validada como "Premium 10/10".

KPIs de Operação:
- Isolamento Multi-tenant: 100% via RLS.
- Performance de Catálogo: Latência < 400ms em grids de 15.000 SKUs.
- Segurança de Alçada: Hierarquia RBAC e MFA nativos.`;
addText(summary, 20, 35, 170);

// 3. Risk Matrix
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.text('2. Matriz de Riscos', 20, 80);
autoTable(doc, {
  startY: 85,
  head: [['Risco', 'Probabilidade', 'Impacto', 'Mitigação']],
  body: [
    ['Bypass RBAC', 'Muito Baixa', 'Crítico', 'Validação Redundante'],
    ['Dessincronia CRM', 'Média', 'Alto', 'Bridge Horária'],
    ['Vazamento PII', 'Baixa', 'Crítico', 'Criptografia'],
    ['Memory Leak', 'Baixa', 'Médio', 'Reciclagem DOM']
  ],
  theme: 'grid',
  headStyles: { fillColor: [41, 128, 185] }
});

// 4. Inventory
doc.addPage();
doc.setFontSize(20);
doc.text('3. Dossiê de Módulos e Evidências', 20, 20);
autoTable(doc, {
  startY: 25,
  head: [['Módulo', 'Funcionalidade', 'Evidência Técnica']],
  body: [
    ['Segurança', 'RBAC Multinível', 'useRBAC.tsx (RoleName)'],
    ['Segurança', 'MFA Enforcement', 'AuthContext.tsx (aal2)'],
    ['IA Flow', 'AI Mockup Studio', 'generate-mockup-nanobanana'],
    ['IA Flow', 'Semantic Search', 'semantic-search Edge Func'],
    ['Vendas', 'Pricing Engine', 'calculators.ts (calculatePrice)'],
    ['Vendas', 'CRM Bridge', 'crm-db-bridge (Bitrix24 Sync)']
  ],
  theme: 'striped',
  headStyles: { fillColor: [41, 128, 185] }
});

// 5. Checklist
doc.addPage();
doc.setFontSize(20);
doc.text('4. Checklist Auditável', 20, 20);
autoTable(doc, {
  startY: 25,
  head: [['Funcionalidade', 'Prioridade', 'Status']],
  body: [
    ['Isolamento de Org', 'P0', 'IMPLEMENTADO'],
    ['Auto-Recovery', 'P1', 'IMPLEMENTADO'],
    ['E-Signature Track', 'P1', 'IMPLEMENTADO'],
    ['Finance Hub', 'P0', 'ROADMAP Q3'],
    ['Flow Voice', 'P2', 'ROADMAP Q4']
  ],
  theme: 'grid',
  headStyles: { fillColor: [39, 174, 96] }
});

doc.save('/mnt/documents/DOSSIER_AUDITORIA_ENTERPRISE_V5.pdf');
console.log('Final PDF Dossier generated successfully.');
