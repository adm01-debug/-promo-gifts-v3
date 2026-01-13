// src/pages/PersonalizationSimulator.tsx
// Simulador de Personalização - Refatorado com componentes focados

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Calculator, 
  History,
  User,
  Building2,
  CalendarDays,
  Eye,
  Trash2,
  X,
  Save,
  Loader2,
  Package,
  DollarSign,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Componentes refatorados
import { SimulatorStepIndicator } from "@/components/simulator/SimulatorStepIndicator";
import { ProductQuantityCard } from "@/components/simulator/ProductQuantityCard";
import { TechniqueSelectionCard } from "@/components/simulator/TechniqueSelectionCard";
import { SimulationResultsCard } from "@/components/simulator/SimulationResultsCard";
import { ScenarioComparison } from "@/components/simulator/ScenarioComparison";
import { UpsellSuggestion } from "@/components/simulator/UpsellSuggestion";
import { useSimulation, formatCurrency } from "@/hooks/useSimulation";

export default function PersonalizationSimulator() {
  const sim = useSimulation();

  // Filter saved simulations
  const filteredSimulations = sim.savedSimulations?.filter(s => {
    const matchesProduct = !sim.filterProductSearch || 
      s.product_name.toLowerCase().includes(sim.filterProductSearch.toLowerCase()) ||
      (s.product_sku && s.product_sku.toLowerCase().includes(sim.filterProductSearch.toLowerCase()));
    const matchesClient = !sim.filterClientId || s.client_id === sim.filterClientId;
    return matchesProduct && matchesClient;
  }) || [];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Calculator className="h-7 w-7 text-primary" />
              </div>
              Simulador de Personalização
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare custos de diferentes técnicas em tempo real
            </p>
          </div>
        </div>

        <Tabs defaultValue="simulator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="simulator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Simulador
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <History className="h-4 w-4" />
              Salvos
              {sim.savedSimulations && sim.savedSimulations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {sim.savedSimulations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator" className="space-y-6">
            {/* Step Indicator - Mais proeminente */}
            <SimulatorStepIndicator
              currentStep={sim.currentStep}
              onStepClick={sim.setCurrentStep}
              hasProduct={!!sim.selectedProduct}
              hasTechniques={sim.selectedTechniques.length > 0}
              hasResults={sim.simulationOptions.length > 0}
            />

            {/* Layout Responsivo Adaptativo */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Left Panel - Product & Quantity (full width on mobile) */}
              <div className="lg:col-span-1 space-y-4 lg:space-y-6 order-1">
                <ProductQuantityCard
                  products={sim.products}
                  productsLoading={sim.productsLoading}
                  selectedProductId={sim.selectedProductId}
                  onProductChange={sim.setSelectedProductId}
                  quantity={sim.quantity}
                  onQuantityChange={sim.setQuantity}
                  customProductPrice={sim.customProductPrice}
                  onCustomPriceChange={sim.setCustomProductPrice}
                  selectedProduct={sim.selectedProduct}
                  effectiveProductPrice={sim.effectiveProductPrice}
                />
              </div>

              {/* Right Panel - Techniques & Results (stack on mobile) */}
              <div className="lg:col-span-2 space-y-4 lg:space-y-6 order-2">
                {/* Techniques - Collapsible summary on mobile when has results */}
                <TechniqueSelectionCard
                  techniques={sim.techniques}
                  techniquesLoading={sim.techniquesLoading}
                  selectedTechniques={sim.selectedTechniques}
                  techniqueSettings={sim.techniqueSettings}
                  onToggle={sim.handleTechniqueToggle}
                  onUpdateSetting={sim.updateTechniqueSetting}
                  needsColorInput={sim.needsColorInput}
                  needsSizeInput={sim.needsSizeInput}
                  quantity={sim.quantity}
                  getPricingInfo={sim.getPricingInfo}
                />

                {/* Results - Full width and prominent */}
                <SimulationResultsCard
                  simulationOptions={sim.simulationOptions}
                  selectedProduct={sim.selectedProduct}
                  quantity={sim.quantity}
                  effectiveProductPrice={sim.effectiveProductPrice}
                  bestOption={sim.bestOption}
                  fastestOption={sim.fastestOption}
                  copiedId={sim.copiedId}
                  onCopy={sim.copyToClipboard}
                  onCopyAll={sim.copyAllOptions}
                  onSave={() => sim.setSaveDialogOpen(true)}
                />

                {/* Upsell Suggestion - Contextual */}
                {sim.simulationOptions.length > 0 && (
                  <UpsellSuggestion
                    currentQuantity={sim.quantity}
                    productPrice={sim.effectiveProductPrice}
                    bestOption={sim.bestOption}
                    techniques={sim.techniques}
                    selectedTechniques={sim.selectedTechniques}
                    onQuantityChange={sim.setQuantity}
                  />
                )}

                {/* Scenario Comparison - Advanced feature */}
                <ScenarioComparison
                  scenarioA={sim.scenarioA}
                  scenarioB={sim.scenarioB}
                  currentSimulation={{
                    options: sim.simulationOptions,
                    product: sim.selectedProduct,
                    quantity: sim.quantity,
                    bestOption: sim.bestOption,
                  }}
                  onSaveAsScenario={sim.saveAsScenario}
                  onClearScenario={sim.clearScenario}
                />

                {/* Empty State - More engaging */}
                {sim.selectedTechniques.length === 0 && (
                  <Card className="border-dashed border-2 border-muted-foreground/20">
                    <CardContent className="flex flex-col items-center justify-center py-12 md:py-16 text-center px-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4">
                        <Calculator className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-display text-lg font-semibold mb-2">
                        Selecione técnicas para simular
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-sm">
                        Escolha um produto acima e as técnicas de personalização que deseja comparar.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Simulações Salvas
                </CardTitle>
                <CardDescription>
                  Consulte suas simulações anteriores ou vincule a um cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar por produto..."
                      value={sim.filterProductSearch}
                      onChange={(e) => sim.setFilterProductSearch(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Select 
                    value={sim.filterClientId || "_all"} 
                    onValueChange={(val) => sim.setFilterClientId(val === "_all" ? null : val)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] h-9">
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="_all">Todos os clientes</SelectItem>
                      {sim.clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(sim.filterProductSearch || sim.filterClientId) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-3"
                      onClick={() => {
                        sim.setFilterProductSearch("");
                        sim.setFilterClientId(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {sim.savedSimulationsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : filteredSimulations.length > 0 ? (
                  <div className="space-y-3">
                    {filteredSimulations.map(s => (
                      <div
                        key={s.id}
                        className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{s.product_name}</p>
                              {s.product_sku && (
                                <Badge variant="outline" className="text-xs">{s.product_sku}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {s.quantity} un
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatCurrency(s.product_unit_price)}/un
                              </span>
                              <span className="flex items-center gap-1">
                                <Palette className="h-3.5 w-3.5" />
                                {s.simulation_data.length} técnica(s)
                              </span>
                            </div>
                            {s.bitrix_clients && (
                              <Badge variant="secondary" className="gap-1 mt-2">
                                <Building2 className="h-3 w-3" />
                                {s.bitrix_clients.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {format(new Date(s.created_at), "dd/MM/yy", { locale: ptBR })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => sim.setViewSimulation(s)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => sim.deleteSimulationMutation.mutate(s.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">
                      Nenhuma simulação salva
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Crie uma simulação e clique em "Salvar" para consultá-la depois.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Dialog */}
      <Dialog open={sim.saveDialogOpen} onOpenChange={sim.setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Simulação</DialogTitle>
            <DialogDescription>
              Salve esta simulação para consultar depois ou vincule a um cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Vincular a cliente (opcional)
              </Label>
              <Select 
                value={sim.selectedClientId || "_none"} 
                onValueChange={(val) => sim.setSelectedClientId(val === "_none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="_none">Nenhum cliente</SelectItem>
                  {sim.clients?.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={sim.simulationNotes}
                onChange={(e) => sim.setSimulationNotes(e.target.value)}
                placeholder="Ex: Cliente precisa de entrega rápida..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => sim.setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => sim.saveSimulationMutation.mutate()}
              disabled={sim.saveSimulationMutation.isPending}
              className="gap-2"
            >
              {sim.saveSimulationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Simulation Dialog */}
      <Dialog open={!!sim.viewSimulation} onOpenChange={() => sim.setViewSimulation(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes da Simulação
            </DialogTitle>
          </DialogHeader>
          {sim.viewSimulation && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <p className="font-semibold text-lg">{sim.viewSimulation.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  {sim.viewSimulation.quantity} un • {formatCurrency(sim.viewSimulation.product_unit_price)}/un
                </p>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Técnica</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Final/Un</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sim.viewSimulation.simulation_data
                      .sort((a, b) => a.grandTotal - b.grandTotal)
                      .map((opt, idx) => (
                        <TableRow key={idx} className={cn(idx === 0 && "bg-success/5")}>
                          <TableCell>
                            <p className="font-medium">{opt.techniqueName}</p>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(opt.grandTotal)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(opt.grandTotalPerUnit)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => sim.setViewSimulation(null)}>
              Fechar
            </Button>
            <Button 
              onClick={() => sim.viewSimulation && sim.loadSavedSimulation(sim.viewSimulation)} 
              className="gap-2"
            >
              <Calculator className="h-4 w-4" />
              Carregar no Simulador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
