import React, { Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Palette, FolderOpen, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ProductsManager = React.lazy(() =>
  import("@/components/admin/ProductsManager").then(m => ({ default: m.ProductsManager }))
);
const SuppliersManager = React.lazy(() =>
  import("@/components/admin/SuppliersManager").then(m => ({ default: m.SuppliersManager }))
);
const EngravingRegistrationContent = React.lazy(() =>
  import("@/pages/EngravingRegistrationPage").then(m => ({ default: m.EngravingRegistrationContent }))
);

function TabFallback() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function AdminCadastrosPage() {
  return (
    <MainLayout>
      <PageSEO title="Cadastros" description="Gerencie produtos, fornecedores e técnicas de personalização." path="/admin/cadastros" noIndex />
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
            <p className="text-muted-foreground">Gerencie produtos, fornecedores e técnicas de personalização</p>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Truck className="h-4 w-4" />
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="personalizacao" className="gap-2">
              <Palette className="h-4 w-4" />
              Personalização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <Suspense fallback={<TabFallback />}>
              <ProductsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="suppliers">
            <Suspense fallback={<TabFallback />}>
              <SuppliersManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="personalizacao">
            <Suspense fallback={<TabFallback />}>
              <EngravingRegistrationContent />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
