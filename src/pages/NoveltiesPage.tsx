import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { NoveltiesSection } from "@/components/novelties/NoveltiesSection";
import { PageHeader } from "@/components/layout/PageHeader";
import { Zap } from "lucide-react";

export default function NoveltiesPage() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <PageHeader
          title="Novidades"
          description="Produtos recém-adicionados ao catálogo. Acompanhe os lançamentos e destaque os mais relevantes para seus clientes."
          icon={<Zap className="h-6 w-6 text-orange" />}
        />

        <NoveltiesSection />
      </div>
    </MainLayout>
  );
}
