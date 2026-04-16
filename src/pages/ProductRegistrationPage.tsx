/**
 * ProductRegistrationPage — wrapper de página para o formulário de cadastro de produtos.
 */
import { ProductRegistrationForm } from "@/components/product-registration/ProductRegistrationForm";
import { BulkImportPanel } from "@/components/product-registration/BulkImportPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageSEO } from "@/components/seo/PageSEO";
import { Package, Upload } from "lucide-react";

export default function ProductRegistrationPage() {
  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <PageSEO title="Cadastro de Produtos" description="Cadastre produtos individualmente ou via importação em massa." />
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">Cadastro de Produtos</h1>
        <p className="text-sm text-muted-foreground">
          Adicione produtos manualmente ou importe planilhas em massa.
        </p>
      </header>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">
            <Package className="h-4 w-4 mr-1" /> Individual
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Upload className="h-4 w-4 mr-1" /> Importação em massa
          </TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="mt-4">
          <ProductRegistrationForm />
        </TabsContent>
        <TabsContent value="bulk" className="mt-4">
          <BulkImportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
