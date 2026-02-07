import { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductSearchCombobox } from "@/components/mockup/ProductSearchCombobox";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Upload, Wand2, Download, CheckCircle2, XCircle, Eye, Grid3x3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { MultiAreaManager, PersonalizationArea } from "@/components/mockup/MultiAreaManager";

interface Product {
  id: string;
  name: string;
  sku: string;
  images: any;
}

interface Technique {
  id: string;
  name: string;
  code: string;
  prompt_suffix: string;
  requires_color_count: boolean;
}

interface ProductColor {
  hex: string;
  name: string;
  code: string;
  stock?: number;
  selected: boolean;
}

interface ProductImage {
  url: string;
  supplierCode: string | null;
  isPrimary: boolean;
  isOgImage: boolean;
}

interface GeneratedMockup {
  id: string;
  mockup_url: string;
  product_color_hex: string;
  product_color_name?: string;
  area_name: string;
  created_at: string;
}

const createDefaultArea = (): PersonalizationArea => ({
  id: crypto.randomUUID(),
  name: "Frente",
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 3,
  logoPreview: null,
});

export default function MagicUp() {
  const { user } = useAuth();
  
  // State básico
  const [products, setProducts] = useState<Product[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  
  // Upload
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  
  // Cores, imagens e áreas
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [previewColorCode, setPreviewColorCode] = useState<string | null>(null);
  const [loadingColors, setLoadingColors] = useState(false);
  const [areas, setAreas] = useState<PersonalizationArea[]>([createDefaultArea()]);
  const [artColorsCount, setArtColorsCount] = useState(1);
  
  // Modelo e geração
  const [aiModel, setAiModel] = useState<"standard" | "pro">("pro");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  
  // Resultados
  const [generatedMockups, setGeneratedMockups] = useState<GeneratedMockup[]>([]);

  // Carregar dados iniciais
  useEffect(() => {
    loadProducts();
    loadTechniques();
  }, []);

  // Buscar cores reais e imagens do produto quando selecionado
  useEffect(() => {
    if (!selectedProduct) {
      setColors([]);
      setProductImages([]);
      setPreviewColorCode(null);
      return;
    }
    
    const fetchProductData = async () => {
      setLoadingColors(true);
      try {
        const { invokeExternalDb } = await import("@/lib/external-db");
        
        // Buscar variantes e imagens em paralelo
        const [variantsResult, imagesResult] = await Promise.all([
          invokeExternalDb<{
            id: string;
            color_name: string;
            color_hex: string;
            color_code: string;
            stock_quantity: number;
          }>({
            table: "product_variants",
            operation: "select",
            filters: { product_id: selectedProduct.id },
            orderBy: { column: "color_name", ascending: true },
            limit: 100,
          }),
          invokeExternalDb<{
            id: string;
            url: string;
            supplier_code: string | null;
            is_primary: boolean;
            is_og_image: boolean;
            display_order: number;
            image_type: string;
          }>({
            table: "product_images",
            operation: "select",
            filters: { product_id: selectedProduct.id },
            orderBy: { column: "display_order", ascending: true },
            limit: 100,
          }),
        ]);

        // Mapear imagens
        const images: ProductImage[] = (imagesResult.records || [])
          .filter((img) => img.image_type !== 'box') // excluir embalagem
          .map((img) => ({
            url: img.url,
            supplierCode: img.supplier_code || null,
            isPrimary: img.is_primary,
            isOgImage: img.is_og_image || false,
          }));
        setProductImages(images);

        // Mapear cores
        const uniqueColors = new Map<string, ProductColor>();
        (variantsResult.records || []).forEach((v) => {
          if (!v.color_name || uniqueColors.has(v.color_name)) return;
          uniqueColors.set(v.color_name, {
            hex: v.color_hex || "#CCCCCC",
            name: v.color_name,
            code: v.color_code || "",
            stock: v.stock_quantity ?? 0,
            selected: true,
          });
        });

        setColors(Array.from(uniqueColors.values()));
        setPreviewColorCode(null);
      } catch (error) {
        console.error("Erro ao buscar dados do produto:", error);
        setColors([]);
        setProductImages([]);
      } finally {
        setLoadingColors(false);
      }
    };

    fetchProductData();
  }, [selectedProduct?.id]);

  const loadProducts = async () => {
    try {
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const productsData = await fetchPromobrindProducts({ limit: 500 });
      
      // Mapear para formato esperado
      const mappedProducts = productsData.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        images: p.images || (p.primary_image_url ? [p.primary_image_url] : []),
      }));

      setProducts(mappedProducts);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const loadTechniques = async () => {
    try {
      const { invokeExternalDb } = await import("@/lib/external-db");
      const result = await invokeExternalDb<Technique>({
        table: "personalization_techniques",
        operation: "select",
        filters: { is_active: true },
        orderBy: { column: "name", ascending: true },
        limit: 100,
      });
      setTechniques(result.records || []);
    } catch (error) {
      console.error("Error loading techniques:", error);
      toast.error("Erro ao carregar técnicas");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 5MB");
      return;
    }

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast.error("Formato inválido. Use PNG ou JPG");
      return;
    }

    setLogoFile(file);
    setUploading(true);

    try {
      // Upload para Supabase Storage
      const fileName = `${user?.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("mockups")
        .upload(fileName, file);

      if (error) throw error;

      // Pegar URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("mockups")
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast.success("Logo enviado com sucesso!");

    } catch (error: any) {
      toast.error("Erro ao enviar logo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleColorToggle = (index: number) => {
    const newColors = [...colors];
    newColors[index].selected = !newColors[index].selected;
    setColors(newColors);
  };

  const handleGenerate = async () => {
    // Validações
    if (!selectedProduct) {
      toast.error("Selecione um produto");
      return;
    }

    if (!logoUrl) {
      toast.error("Faça upload do logo");
      return;
    }

    if (!selectedTechnique) {
      toast.error("Selecione uma técnica");
      return;
    }

    const selectedColors = colors.filter(c => c.selected);
    if (selectedColors.length === 0) {
      toast.error("Selecione pelo menos uma cor");
      return;
    }

    if (areas.length === 0) {
      toast.error("Adicione pelo menos uma área");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setGeneratedMockups([]);

    try {
      // Criar job
      const { data: job, error: jobError } = await supabase
        .from("mockup_generation_jobs")
        .insert({
          user_id: user!.id,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_sku: selectedProduct.sku,
          technique_id: selectedTechnique.id,
          technique_name: selectedTechnique.name,
          logo_url: logoUrl,
          product_colors: selectedColors.map(c => c.hex),
          areas_config: areas,
          art_colors_count: artColorsCount,
          ai_model: aiModel,
          status: "pending",
        })
        .select()
        .single();

      if (jobError) throw jobError;

      setCurrentJob(job.id);
      toast.success("Job criado! Iniciando geração mágica... ✨");

      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 1000);

      // Chamar Edge Function
      const { data: authData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/generate-mockup-nanobanana`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authData.session?.access_token}`,
          },
          body: JSON.stringify({ jobId: job.id }),
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao gerar mockups");
      }

      const result = await response.json();
      
      // Adicionar nome da cor aos mockups
      const mockupsWithColorNames = result.mockups.map((m: GeneratedMockup) => ({
        ...m,
        product_color_name: colors.find(c => c.hex === m.product_color_hex)?.name || m.product_color_hex
      }));

      setGeneratedMockups(mockupsWithColorNames);
      setProgress(100);
      
      toast.success(`🎉 ${result.generated} mockups gerados com sucesso!`);
      
      if (result.failed > 0) {
        toast.warning(`⚠️ ${result.failed} mockups falharam`);
      }

    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao gerar mockups: " + error.message);
      setProgress(0);
    } finally {
      setGenerating(false);
    }
  };

  const selectedColorsCount = colors.filter(c => c.selected).length;
  const estimatedMockups = selectedColorsCount * areas.length;

  // Imagem do produto baseada na cor selecionada para preview
  const currentPreviewImage = useMemo(() => {
    if (productImages.length === 0) return null;
    
    // Se tem uma cor de preview selecionada, buscar imagem específica
    if (previewColorCode) {
      const colorImage = productImages.find(
        (img) => img.supplierCode === previewColorCode
      );
      if (colorImage) return colorImage.url;
    }
    
    // Fallback: imagem OG (MAIN) ou primária (SET)
    const ogImage = productImages.find((img) => img.isOgImage);
    if (ogImage) return ogImage.url;
    
    const primaryImage = productImages.find((img) => img.isPrimary);
    if (primaryImage) return primaryImage.url;
    
    return productImages[0]?.url || null;
  }, [productImages, previewColorCode]);

  // Nome da cor em preview
  const previewColorName = useMemo(() => {
    if (!previewColorCode) return null;
    return colors.find(c => c.code === previewColorCode)?.name || null;
  }, [previewColorCode, colors]);

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Magic Up
              </h1>
              <p className="text-muted-foreground text-lg">
                Geração automática de mockups com IA ✨
              </p>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card className="border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Cores selecionadas</p>
                    <p className="text-2xl font-bold text-purple-600">{selectedColorsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-pink-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-pink-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Áreas configuradas</p>
                    <p className="text-2xl font-bold text-pink-600">{areas.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Mockups a gerar</p>
                    <p className="text-2xl font-bold text-blue-600">{estimatedMockups}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuração */}
          <div className="lg:col-span-2 space-y-6">
            {/* Produto e Técnica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">1</span>
                  Produto e Técnica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Produto *</Label>
                    <ProductSearchCombobox
                      products={products}
                      selectedProduct={selectedProduct}
                      onSelect={setSelectedProduct}
                      placeholder="Buscar produto por nome ou SKU..."
                    />
                  </div>

                  <div>
                    <Label>Técnica de Personalização *</Label>
                    <Select
                      value={selectedTechnique?.id}
                      onValueChange={(value) => {
                        const tech = techniques.find(t => t.id === value);
                        setSelectedTechnique(tech || null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a técnica..." />
                      </SelectTrigger>
                      <SelectContent>
                        {techniques.map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Cores do produto - badges + preview de imagem */}
                {selectedProduct && (
                  <div className="space-y-3">
                    {/* Imagem do produto por cor */}
                    {currentPreviewImage && (
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-border/30 shrink-0">
                          <img
                            src={currentPreviewImage}
                            alt={previewColorName || selectedProduct.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        {previewColorName && (
                          <p className="text-sm text-muted-foreground">
                            Cor: <span className="text-foreground font-medium">{previewColorName}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {loadingColors ? "Carregando cores..." : `${colors.length} cores disponíveis · ${colors.filter(c => c.selected).length} selecionadas`}
                      </p>
                      {colors.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => {
                            const allSelected = colors.every(c => c.selected);
                            setColors(colors.map(c => ({ ...c, selected: !allSelected })));
                          }}
                        >
                          {colors.every(c => c.selected) ? "Desmarcar todas" : "Selecionar todas"}
                        </button>
                      )}
                    </div>
                    {!loadingColors && colors.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {colors.map((color, index) => {
                          const stockFormatted = (color.stock ?? 0) >= 1000 
                            ? `${((color.stock ?? 0) / 1000).toFixed(1)}k` 
                            : String(color.stock ?? 0);
                          const isPreview = previewColorCode === color.code && !!color.code;
                          return (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => {
                                handleColorToggle(index);
                                if (color.code) setPreviewColorCode(color.code);
                              }}
                              className={`
                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium
                                border transition-all cursor-pointer
                                ${isPreview
                                  ? 'border-primary bg-primary/20 text-foreground ring-1 ring-primary/30'
                                  : color.selected
                                    ? 'border-primary/50 bg-primary/10 text-foreground'
                                    : 'border-border/50 bg-muted/30 text-muted-foreground opacity-50 hover:opacity-75'
                                }
                              `}
                              title={`${color.name} · Estoque: ${color.stock ?? 0} · Clique para ver foto`}
                            >
                              <span
                                className="w-3 h-3 rounded-full shrink-0 border border-border/30"
                                style={{ backgroundColor: color.hex }}
                              />
                              {stockFormatted}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {selectedTechnique?.requires_color_count && (
                  <div>
                    <Label>Quantidade de cores na arte</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={artColorsCount}
                      onChange={(e) => setArtColorsCount(parseInt(e.target.value) || 1)}
                      placeholder="Ex: 2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Para {selectedTechnique.name}, especifique quantas cores tem a arte
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">2</span>
                  Logo do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label
                      htmlFor="logo-upload"
                      className="cursor-pointer flex flex-col items-center gap-3"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
                          <p className="text-lg font-medium">Enviando logo...</p>
                        </>
                      ) : logoUrl ? (
                        <>
                          <CheckCircle2 className="h-12 w-12 text-green-600" />
                          <p className="text-lg font-medium text-green-600">Logo enviado com sucesso!</p>
                          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-green-200">
                            <img src={logoUrl} alt="Logo" className="max-h-40" />
                          </div>
                          <Button variant="outline" size="sm" className="mt-2">
                            Trocar logo
                          </Button>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-gray-400" />
                          <div>
                            <p className="text-lg font-medium">Clique para fazer upload</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              PNG ou JPG, máximo 5MB
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Áreas de Personalização */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">3</span>
                  Áreas de Personalização
                </CardTitle>
                <CardDescription>
                  Configure onde o logo será aplicado (gera 1 mockup por área)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultiAreaManager
                  areas={areas}
                  onAreasChange={setAreas}
                />
              </CardContent>
            </Card>

            {/* Modelo IA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">4</span>
                  Qualidade da IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setAiModel("standard")}
                    className={`
                      cursor-pointer p-4 rounded-lg border-2 transition-all
                      ${aiModel === "standard"
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Standard</span>
                      <Badge variant="secondary">Rápido</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Boa qualidade, geração rápida (~10s)
                    </p>
                  </div>

                  <div
                    onClick={() => setAiModel("pro")}
                    className={`
                      cursor-pointer p-4 rounded-lg border-2 transition-all
                      ${aiModel === "pro"
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Pro</span>
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">Premium</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Altíssima qualidade, 4K (~30s)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Ação e Resultados */}
          <div className="space-y-6">
            {/* Gerar */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Gerar Mockups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total a gerar:</span>
                    <span className="font-bold">{estimatedMockups} mockups</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Modelo:</span>
                    <Badge variant={aiModel === "pro" ? "default" : "secondary"}>
                      {aiModel === "pro" ? "Pro" : "Standard"}
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generating || !selectedProduct || !logoUrl || !selectedTechnique || selectedColorsCount === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Gerando... {progress}%
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Gerar com IA
                    </>
                  )}
                </Button>

                {generating && (
                  <Progress value={progress} className="w-full" />
                )}
              </CardContent>
            </Card>

            {/* Mockups Gerados */}
            {generatedMockups.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Mockups Gerados
                  </CardTitle>
                  <CardDescription>
                    {generatedMockups.length} mockups prontos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {generatedMockups.map((mockup) => (
                      <div
                        key={mockup.id}
                        className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                      >
                        <div className="relative group">
                          <img
                            src={mockup.mockup_url}
                            alt={`${mockup.area_name} - ${mockup.product_color_name}`}
                            className="w-full h-32 object-cover rounded"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => window.open(mockup.mockup_url, '_blank')}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              Ver
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="font-medium text-sm">{mockup.area_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: mockup.product_color_hex }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {mockup.product_color_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
