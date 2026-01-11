import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Settings, DollarSign } from "lucide-react";
import { TechniquesPanel } from "@/components/engraving/TechniquesPanel";
import { PricingPanel } from "@/components/engraving/PricingPanel";

export default function EngravingRegistrationPage() {
  const [activeTab, setActiveTab] = useState("techniques");

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Cadastrar Gravação"
          description="Gerencie técnicas de gravação e configure preços"
          icon={<Palette className="h-8 w-8" />}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="techniques" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Técnicas</span>
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Preços</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="techniques">
            <TechniquesPanel />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingPanel />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
