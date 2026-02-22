import { MainLayout } from "@/components/layout/MainLayout";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { EngravingRegistrationContent } from "@/pages/EngravingRegistrationPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Palette, FolderOpen } from "lucide-react";

export default function AdminCadastrosPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <FolderOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cadastros</h1>
            <p className="text-muted-foreground">Gerencie produtos e técnicas de personalização</p>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="personalizacao" className="gap-2">
              <Palette className="h-4 w-4" />
              Personalização
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="personalizacao">
            <EngravingRegistrationContent />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
