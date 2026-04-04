import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Settings, LogOut, ChevronUp, Palette } from "lucide-react";
import { RestartTourButton } from "@/components/onboarding/RestartTourButton";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarUserFooterProps {
  isCollapsed: boolean;
}

export const SidebarUserFooter = forwardRef<HTMLDivElement, SidebarUserFooterProps>(function SidebarUserFooter({ isCollapsed }, ref) {
  const { profile, role, signOut, user } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Vendedor";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleName = role === "admin" ? "Admin" : role === "manager" ? "Gerente" : "Vendedor";

  const avatarElement = (
    <div className="h-9 w-9 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0 text-xs font-bold text-sidebar-foreground/80 border border-sidebar-border/50">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={displayName}
          className="h-full w-full rounded-lg object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );

  if (isCollapsed) {
    return (
      <div className="px-2 py-2 border-t border-sidebar-border/50 shrink-0">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate("/perfil")}
              className="w-full flex items-center justify-center hover:opacity-80 transition-opacity"
            >
              {avatarElement}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-card border-border z-[100]">
            <p className="font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{roleName}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-3 py-2 border-t border-sidebar-border/50 shrink-0">
      <div className="opacity-60 mb-2">
        <RestartTourButton />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors group outline-none">
          {avatarElement}
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="text-sm font-medium text-sidebar-foreground truncate max-w-[140px]">
              {firstName}
            </span>
            <span className="text-[11px] text-sidebar-foreground/40">{roleName}</span>
          </div>
          <ChevronUp className="h-4 w-4 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-56 mb-1"
        >
          <div className="px-3 py-2 border-b">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuItem onClick={() => navigate("/perfil")}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/temas")}>
            <Palette className="mr-2 h-4 w-4" />
            Skins
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
