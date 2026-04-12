/**
 * CollectionDetailHeader — Header section for collection detail page.
 * Contains back button, collection info, and action buttons.
 */
import { motion } from "framer-motion";
import {
  ArrowLeft, Monitor, Package, FileText, Clock,
  Download, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CollectionInfo {
  name: string;
  description?: string;
  color: string;
  icon: string;
}

interface CollectionDetailHeaderProps {
  collection: CollectionInfo;
  productCount: number;
  isLoading?: boolean;
  updatedAgo: string | null;
  onBack: () => void;
  onCreateQuote: () => void;
  onExportPDF: () => void;
  onPresent: () => void;
}

export function CollectionDetailHeader({
  collection,
  productCount,
  isLoading,
  updatedAgo,
  onBack,
  onCreateQuote,
  onExportPDF,
  onPresent,
}: CollectionDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" className="w-fit -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para coleções
      </Button>

      <div className="flex items-start gap-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 border-[1.5px] border-primary/20"
          style={{ backgroundColor: `${collection.color}20` }}
        >
          {collection.icon}
        </motion.div>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-muted-foreground mt-1">{collection.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Package className="h-3 w-3 mr-1" />
              {isLoading ? "Carregando..." : `${productCount} produtos`}
            </Badge>
            {updatedAgo && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Atualizado {updatedAgo}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {productCount > 0 && (
            <>
              <Button
                className="gap-2 font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                onClick={onCreateQuote}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Criar Orçamento</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="gap-2" onClick={onExportPDF}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button variant="outline" className="gap-2" onClick={onPresent}>
                <Monitor className="h-4 w-4" />
                <span className="hidden sm:inline">Apresentar</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
