// ============================================
// FUNCIONALIDADE: EXPORT CSV/EXCEL/PDF
// STATUS: ❌ Ausente → ✅ Implementado
// PRIORIDADE: 🟠 ALTA
// ============================================

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportConfig<T> {
  data: T[];
  filename: string;
  columns?: {
    key: keyof T;
    label: string;
  }[];
}

export function useExport<T extends Record<string, any>>() {
  // Export CSV
  const exportCSV = useMutation({
    mutationFn: async ({ data, filename, columns }: ExportConfig<T>) => {
      // Preparar dados
      const exportData = columns
        ? data.map((row) =>
            columns.reduce((acc, col) => {
              acc[col.label] = row[col.key];
              return acc;
            }, {} as Record<string, any>)
          )
        : data;

      // Gerar CSV
      const csv = Papa.unparse(exportData);
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${timestamp}.csv`;
      link.click();
      
      return { success: true, count: data.length };
    },
    onSuccess: ({ count }) => {
      toast.success(`${count} registros exportados para CSV!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao exportar CSV: ${error.message}`);
    },
  });

  // Export Excel
  const exportExcel = useMutation({
    mutationFn: async ({ data, filename, columns }: ExportConfig<T>) => {
      // Preparar dados
      const exportData = columns
        ? data.map((row) =>
            columns.reduce((acc, col) => {
              acc[col.label] = row[col.key];
              return acc;
            }, {} as Record<string, any>)
          )
        : data;

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');

      // Estilizar cabeçalhos
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_col(C) + '1';
        if (!ws[address]) continue;
        ws[address].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: '4F46E5' } },
          alignment: { horizontal: 'center' },
        };
      }

      // Auto-width
      const maxWidths = columns
        ? columns.map((col) => {
            const maxLength = Math.max(
              col.label.length,
              ...data.map((row) => String(row[col.key] || '').length)
            );
            return { wch: Math.min(maxLength + 2, 50) };
          })
        : [];

      if (maxWidths.length > 0) {
        ws['!cols'] = maxWidths;
      }

      // Download
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
      
      return { success: true, count: data.length };
    },
    onSuccess: ({ count }) => {
      toast.success(`${count} registros exportados para Excel!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao exportar Excel: ${error.message}`);
    },
  });

  // Export PDF
  const exportPDF = useMutation({
    mutationFn: async ({ data, filename, columns }: ExportConfig<T>) => {
      const doc = new jsPDF();

      // Título
      doc.setFontSize(16);
      doc.text(filename, 14, 20);
      
      // Subtítulo com data
      doc.setFontSize(10);
      doc.text(
        `Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        14,
        28
      );

      // Preparar dados para tabela
      const headers = columns
        ? columns.map((col) => col.label)
        : Object.keys(data[0] || {});

      const rows = data.map((row) =>
        columns
          ? columns.map((col) => String(row[col.key] || ''))
          : Object.values(row).map(String)
      );

      // Gerar tabela
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 35,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.getWidth() - 30,
          doc.internal.pageSize.getHeight() - 10
        );
      }

      // Download
      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`${filename}_${timestamp}.pdf`);
      
      return { success: true, count: data.length };
    },
    onSuccess: ({ count }) => {
      toast.success(`${count} registros exportados para PDF!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    },
  });

  return {
    exportCSV,
    exportExcel,
    exportPDF,
    isExporting: exportCSV.isPending || exportExcel.isPending || exportPDF.isPending,
  };
}
