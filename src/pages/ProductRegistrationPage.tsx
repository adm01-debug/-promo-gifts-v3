import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, FileUp, Package, ChevronRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductRegistrationForm, BulkImportPanel } from '@/components/product-registration';
import { useRBAC } from '@/hooks/useRBAC';

type TabValue = 'single' | 'bulk';

export default function ProductRegistrationPage() {
  const { hasPermission, isLoading, role } = useRBAC();
  const [activeTab, setActiveTab] = useState<TabValue>('single');
  const [recentProducts, setRecentProducts] = useState<Array<{ id: string; name: string; sku: string }>>([]);

  // Verificar permissão
  const canRegisterProducts = hasPermission('create', 'products');

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </MainLayout>
    );
  }

  if (!canRegisterProducts) {
    return <Navigate to="/" replace />;
  }

  const handleProductCreated = (product: unknown) => {
    const p = product as { id: string; name: string; sku: string };
    setRecentProducts(prev => [{ id: p.id, name: p.name, sku: p.sku }, ...prev.slice(0, 4)]);
  };

  return (
    <MainLayout>
      <div className="container max-w-6xl mx-auto py-6 space-y-6">
        <PageHeader
          title="Gestão de Produtos"
          description="Cadastre novos produtos no catálogo ou importe em massa via planilha"
        />

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">Individual</p>
                <p className="text-sm text-muted-foreground">Cadastro detalhado</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-green-500/10">
                <FileUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">Em Massa</p>
                <p className="text-sm text-muted-foreground">Via CSV/Excel</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 rounded-full bg-orange-500/10">
                <Badge className="text-orange-500 bg-transparent border-0 p-0">
                  {role.name === 'admin' ? 'Admin' : 'Manager'}
                </Badge>
              </div>
              <div>
                <p className="text-lg font-bold">Seu Acesso</p>
                <p className="text-sm text-muted-foreground">Permissão de cadastro</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs de Cadastro */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="single" className="gap-2">
              <Plus className="h-4 w-4" />
              Cadastro Individual
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <FileUp className="h-4 w-4" />
              Importação em Massa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulário */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Novo Produto</CardTitle>
                    <CardDescription>
                      Preencha os dados do produto. Campos com * são obrigatórios.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProductRegistrationForm onSuccess={handleProductCreated} />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar com produtos recentes */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cadastrados Recentemente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum produto cadastrado ainda nesta sessão.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {recentProducts.map(product => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div>
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Importação em Massa</CardTitle>
                <CardDescription>
                  Importe múltiplos produtos de uma vez usando um arquivo CSV ou Excel.
                  Você pode usar nosso template ou fazer o mapeamento manual das colunas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BulkImportPanel />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
