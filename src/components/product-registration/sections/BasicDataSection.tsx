/**
 * BasicDataSection — Dados básicos + Fornecedor/Categoria do formulário de registro
 */
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { FormSection } from "@/components/ui/FormSection";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormSchema, ReferenceDataState } from "../productFormTypes";

interface BasicDataSectionProps {
  form: UseFormReturn<ProductFormSchema>;
  referenceData: ReferenceDataState;
}

export function BasicDataSection({ form, referenceData }: BasicDataSectionProps) {
  return (
    <>
      <FormSection title="Dados Básicos" required>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Nome do Produto *</FormLabel><FormControl><Input placeholder="Ex: Caneta Personalizada" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="sku" render={({ field }) => (
            <FormItem><FormLabel>SKU *</FormLabel><FormControl><Input placeholder="Ex: CAN-001" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem><FormLabel>Preço (R$) *</FormLabel><FormControl>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
            </FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="cost_price" render={({ field }) => (
            <FormItem><FormLabel>Preço de Custo (R$)</FormLabel><FormControl>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
            </FormControl><FormMessage /></FormItem>
          )} />
        </div>
      </FormSection>

      <FormSection title="Fornecedor e Categoria" required>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="supplier_id" render={({ field }) => (
            <FormItem><FormLabel>Fornecedor *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione um fornecedor" /></SelectTrigger></FormControl>
                <SelectContent>{referenceData.suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}{s.code && ` (${s.code})`}</SelectItem>
                ))}</SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="category_id" render={({ field }) => (
            <FormItem><FormLabel>Categoria *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger></FormControl>
                <SelectContent>{referenceData.categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}</SelectContent>
              </Select><FormMessage /></FormItem>
          )} />
        </div>
      </FormSection>
    </>
  );
}
