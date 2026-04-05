/**
 * HeaderActionsMenu - Grouped header actions to reduce cognitive overload
 * Combines: Theme, Notifications, Stock Alerts, etc. into a single menu for mobile
 */
import { 
  Sun, Moon, Package, Settings, MoreHorizontal, 
  HelpCircle, Palette, Shield
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderActionsMenuProps {
  stockAlertCount?: number;
}

export function HeaderActionsMenu({ 
  stockAlertCount = 0 
}: HeaderActionsMenuProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const totalCount = stockAlertCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 hover:bg-primary/10 hover:text-primary md:hidden"
         aria-label="Mais opções"><MoreHorizontal className="h-4 w-4" />
          {totalCount > 0 && (
            <Badge 
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] bg-destructive text-destructive-foreground"
            >
              {totalCount > 9 ? "9+" : totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-card border-border">
        <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />

        {/* Theme submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer">
            <Palette className="h-4 w-4 mr-2" />
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="bg-card border-border">
            <DropdownMenuItem 
              onClick={() => setTheme("light")}
              className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
            >
              <Sun className="h-4 w-4 mr-2" />
              Claro
              {theme === "light" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("dark")}
              className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
            >
              <Moon className="h-4 w-4 mr-2" />
              Escuro
              {theme === "dark" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("auto")}
              className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Sistema
              {theme === "auto" && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="bg-border" />

        {/* Stock Alerts */}
        <DropdownMenuItem 
          onClick={() => navigate("/inventario")}
          className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
        >
          <Package className="h-4 w-4 mr-2" />
          Alertas de Estoque
          {stockAlertCount > 0 && (
            <Badge className="ml-auto bg-warning text-warning-foreground text-xs">
              {stockAlertCount}
            </Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

        {/* Settings */}
        <DropdownMenuItem 
          onClick={() => navigate("/configuracoes")}
          className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </DropdownMenuItem>

        {/* Admin */}
        {isAdmin && (
          <DropdownMenuItem 
            onClick={() => navigate("/admin")}
            className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
          >
            <Shield className="h-4 w-4 mr-2" />
            Administração
          </DropdownMenuItem>
        )}

        {/* Help */}
        <DropdownMenuItem 
          className="hover:bg-primary/10 focus:bg-primary/10 cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Ajuda
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
