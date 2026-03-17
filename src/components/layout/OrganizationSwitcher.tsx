import { Building2, ChevronDown, Plus, Check } from "lucide-react";
import { useState } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function OrganizationSwitcher() {
  const { organizations, currentOrg, currentRole, switchOrganization, createOrganization } =
    useOrganization();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setCreating(true);
    const org = await createOrganization(newName.trim(), newSlug.trim().toLowerCase().replace(/\s+/g, "-"));
    setCreating(false);
    if (org) {
      toast({ title: "Organização criada!", description: `"${org.name}" está pronta.` });
      setShowCreate(false);
      setNewName("");
      setNewSlug("");
    } else {
      toast({ title: "Erro", description: "Não foi possível criar a organização.", variant: "destructive" });
    }
  };

  if (organizations.length === 0 && !currentOrg) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Criar Organização</span>
        </Button>
        <CreateOrgDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          newName={newName}
          setNewName={setNewName}
          newSlug={newSlug}
          setNewSlug={setNewSlug}
          creating={creating}
          onSubmit={handleCreate}
        />
      </>
    );
  }

  const roleLabels: Record<string, string> = {
    owner: "Dono",
    admin: "Admin",
    member: "Membro",
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8 max-w-[180px] hover:bg-accent"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate font-medium">{currentOrg?.name || "Selecionar"}</span>
            {currentRole && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 hidden sm:inline-flex">
                {roleLabels[currentRole] || currentRole}
              </Badge>
            )}
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Organizações
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => switchOrganization(org.id)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                currentOrg?.id === org.id && "bg-accent"
              )}
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{org.name}</span>
              {currentOrg?.id === org.id && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCreate(true)} className="gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            Nova Organização
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateOrgDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        newName={newName}
        setNewName={setNewName}
        newSlug={newSlug}
        setNewSlug={setNewSlug}
        creating={creating}
        onSubmit={handleCreate}
      />
    </>
  );
}

function CreateOrgDialog({
  open,
  onOpenChange,
  newName,
  setNewName,
  newSlug,
  setNewSlug,
  creating,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  newName: string;
  setNewName: (v: string) => void;
  newSlug: string;
  setNewSlug: (v: string) => void;
  creating: boolean;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Organização</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Nome</Label>
            <Input
              id="org-name"
              placeholder="Minha Empresa"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                );
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug (URL)</Label>
            <Input
              id="org-slug"
              placeholder="minha-empresa"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={creating || !newName.trim() || !newSlug.trim()}>
            {creating ? "Criando..." : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
