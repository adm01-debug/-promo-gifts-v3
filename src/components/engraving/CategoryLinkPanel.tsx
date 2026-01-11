import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link2, Search, Save, Loader2, Package, Check } from "lucide-react";
import { toast } from "sonner";

// Mock data - será substituído por chamadas à API externa
const mockCategories = [
  { id: "1", name: "Canetas", productCount: 45 },
  { id: "2", name: "Garrafas e Squeezes", productCount: 32 },
  { id: "3", name: "Bolsas e Mochilas", productCount: 28 },
  { id: "4", name: "Camisetas", productCount: 120 },
  { id: "5", name: "Bonés", productCount: 35 },
  { id: "6", name: "Cadernos", productCount: 22 },
  { id: "7", name: "Chaveiros", productCount: 55 },
  { id: "8", name: "Copos e Canecas", productCount: 40 },
  { id: "9", name: "Acessórios de Escritório", productCount: 67 },
  { id: "10", name: "Ecobags", productCount: 18 },
];

const mockTechniques = [
  { id: "1", code: "SERI", name: "Serigrafia" },
  { id: "2", code: "LASER", name: "Gravação a Laser" },
  { id: "3", code: "TAMP", name: "Tampografia" },
  { id: "4", code: "BORDO", name: "Bordado" },
  { id: "5", code: "SUBLI", name: "Sublimação" },
];

// Mock de vínculos existentes
const mockLinks: Record<string, string[]> = {
  "1": ["1", "2", "3"], // Canetas: Serigrafia, Laser, Tampografia
  "2": ["1", "2", "5"], // Garrafas: Serigrafia, Laser, Sublimação
  "3": ["1", "4", "5"], // Bolsas: Serigrafia, Bordado, Sublimação
  "4": ["1", "4", "5"], // Camisetas: Serigrafia, Bordado, Sublimação
  "5": ["1", "4"], // Bonés: Serigrafia, Bordado
  "6": ["1", "2"], // Cadernos: Serigrafia, Laser
  "7": ["2", "3"], // Chaveiros: Laser, Tampografia
  "8": ["1", "2", "5"], // Copos: Serigrafia, Laser, Sublimação
  "9": ["1", "2", "3"], // Acessórios: Serigrafia, Laser, Tampografia
  "10": ["1", "5"], // Ecobags: Serigrafia, Sublimação
};

interface Category {
  id: string;
  name: string;
  productCount: number;
}

interface Technique {
  id: string;
  code: string;
  name: string;
}

export function CategoryLinkPanel() {
  const [categories] = useState<Category[]>(mockCategories);
  const [techniques] = useState<Technique[]>(mockTechniques);
  const [links, setLinks] = useState<Record<string, string[]>>(mockLinks);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleLink = (categoryId: string, techniqueId: string) => {
    setLinks((prev) => {
      const currentLinks = prev[categoryId] || [];
      const newLinks = currentLinks.includes(techniqueId)
        ? currentLinks.filter((id) => id !== techniqueId)
        : [...currentLinks, techniqueId];
      
      return { ...prev, [categoryId]: newLinks };
    });
    setHasChanges(true);
  };

  const handleSelectAll = (categoryId: string) => {
    setLinks((prev) => ({
      ...prev,
      [categoryId]: techniques.map((t) => t.id),
    }));
    setHasChanges(true);
  };

  const handleDeselectAll = (categoryId: string) => {
    setLinks((prev) => ({
      ...prev,
      [categoryId]: [],
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simular chamada à API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Vínculos salvos com sucesso!");
    setIsSaving(false);
    setHasChanges(false);
  };

  const getLinkedTechniques = (categoryId: string) => {
    const linkedIds = links[categoryId] || [];
    return techniques.filter((t) => linkedIds.includes(t.id));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Vínculos com Categorias
            </CardTitle>
            <CardDescription>
              Defina quais técnicas de gravação estão disponíveis para cada categoria de produto
            </CardDescription>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isSaving}
            className="shrink-0"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Vínculos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[500px] pr-4">
          <Accordion type="multiple" className="space-y-2">
            {filteredCategories.map((category) => {
              const linkedTechniques = getLinkedTechniques(category.id);
              const allSelected = linkedTechniques.length === techniques.length;

              return (
                <AccordionItem
                  key={category.id}
                  value={category.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {category.productCount} produtos
                        </span>
                      </div>
                      <div className="flex-1" />
                      <div className="flex items-center gap-2 mr-4">
                        {linkedTechniques.length > 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            {linkedTechniques.length} técnica{linkedTechniques.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Nenhuma
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAll(category.id)}
                          disabled={allSelected}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Selecionar Todas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeselectAll(category.id)}
                          disabled={linkedTechniques.length === 0}
                        >
                          Limpar
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {techniques.map((technique) => {
                          const isLinked = (links[category.id] || []).includes(technique.id);
                          return (
                            <div
                              key={technique.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                isLinked
                                  ? "bg-primary/5 border-primary/30"
                                  : "bg-muted/30 hover:bg-muted/50"
                              }`}
                              onClick={() => handleToggleLink(category.id, technique.id)}
                            >
                              <Checkbox
                                checked={isLinked}
                                onCheckedChange={() =>
                                  handleToggleLink(category.id, technique.id)
                                }
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{technique.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {technique.code}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
