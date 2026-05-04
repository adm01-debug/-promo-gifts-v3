const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const doc = new jsPDF();

// Styles
const titleFont = 'helvetica';
const bodyFont = 'helvetica';

// Cover Page
doc.setFont(titleFont, 'bold');
doc.setFontSize(24);
doc.text('Relatório de Auditoria Enterprise', 105, 50, { align: 'center' });
doc.setFontSize(16);
doc.setFont(titleFont, 'normal');
doc.text('Projeto: Promo Gifts High-Performance Platform', 105, 70, { align: 'center' });
doc.setFontSize(12);
doc.text('Versão: 3.0.0 | Data: 04/05/2026', 105, 80, { align: 'center' });

// Summary
doc.addPage();
doc.setFontSize(18);
doc.setFont(titleFont, 'bold');
doc.text('1. Resumo Executivo', 20, 20);
doc.setFontSize(10);
doc.setFont(bodyFont, 'normal');
const summary = `Este documento detalha o estado atual da plataforma Promo Gifts. O sistema atingiu a maturidade comercial com 95% das funcionalidades criticas operacionais.

Riscos Identificados:
- Filtros Realtime: Algumas tabelas capturam eventos sem filtros de org (necessita ajuste em discount_approval_requests).
- Escalabilidade de Assets: O crescimento de mockups IA exige gestão proativa de storage.

Lacunas:
- Integração de pagamento nativa (Roadmap Q3).
- Realidade aumentada para visualização 3D.

Recomendações:
- Rotacionar chaves de API trimestralmente.
- Implementar monitoramento de latência em tempo real para as Edge Functions de IA.`;

doc.text(doc.splitTextToSize(summary, 170), 20, 30);

// Detailed Inventory Table
doc.addPage();
doc.setFontSize(18);
doc.setFont(titleFont, 'bold');
doc.text('2. Inventário de Funcionalidades e Evidências', 20, 20);

const tableData = [
  ['Segurança', 'RBAC Multi-nível', 'src/hooks/useRBAC.tsx', 'Lógica de níveis dev/supervisor/agente'],
  ['Segurança', 'MFA / 2FA', 'src/contexts/AuthContext.tsx', 'Integração currentAAL'],
  ['IA Engine', 'AI Mockup Studio', 'src/hooks/useMockupGenerator.ts', 'Integração NanoBanana API'],
  ['Performance', 'Grid Virtualizado', 'src/components/products/ProductGrid.tsx', 'TanStack Virtual 15k SKUs'],
  ['Vendas', 'E-Signature', 'src/pages/PublicQuoteApprovalPage.tsx', 'Validação de Token e IP'],
  ['Integração', 'Bitrix24 Bridge', 'supabase/functions/crm-db-bridge', 'Sincronização bidirecional']
];

doc.autoTable({
  startY: 30,
  head: [['Módulo', 'Funcionalidade', 'Arquivo', 'Evidência Técnica']],
  body: tableData,
  theme: 'striped',
  headStyles: { fillColor: [41, 128, 185] }
});

doc.save('/mnt/documents/Relatorio_Auditoria_Enterprise.pdf');
console.log('PDF Generated successfully.');
