import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Plus,
  Trash2,
  Loader2,
  FolderOpen,
  Package,
  Users,
} from "lucide-react";
import { InlineEditField } from "./InlineEditField";

interface ProductGroup {
  id: string;
  group_code: string;
  group_name: string;
  description: string | null;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface ProductGroupMember {
  id: string;
  product_group_id: string;
  product_id: string;
  product?: Product;
}

export function ProductGroupsManager() {
  const queryClient = useQueryClient();
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState({ code: "", name: "", description: "" });
  const [selectedProductId, setSelectedProductId] = useState("");

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["product-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select("*")
        .order("group_name");
      if (error) throw error;
      return data as ProductGroup[];
    },
  });

  // Fetch all products from Promobrind - sem limite para buscar todos
  const { data: allProducts } = useQuery({
    queryKey: ["all-products-promobrind-full"],
    queryFn: async () => {
      const { fetchPromobrindProducts } = await import('@/lib/external-db');
      const productsData = await fetchPromobrindProducts(); // Sem limit = paginação automática
      return productsData.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
      })) as Product[];
    },
    staleTime: 10 * 60 * 1000, // 10 min cache
  });

  // Fetch group members
  const { data: groupMembers } = useQuery({
    queryKey: ["product-group-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_group_members")
        .select("*");
      if (error) throw error;
      return data as ProductGroupMember[];
    },
  });

  // Add group mutation
  const addGroupMutation = useMutation({
    mutationFn: async (data: { group_code: string; group_name: string; description?: string }) => {
      const { error } = await supabase.from("product_groups").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-groups"] });
      setIsAddGroupOpen(false);
      setNewGroup({ code: "", name: "", description: "" });
      toast.success("Grupo criado!");
    },
    onError: () => toast.error("Erro ao criar grupo"),
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; group_code?: string; group_name?: string; description?: string; is_active?: boolean }) => {
      const { error } = await supabase.from("product_groups").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-groups"] });
      toast.success("Grupo atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar grupo"),
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-groups"] });
      toast.success("Grupo removido!");
    },
    onError: () => toast.error("Erro ao remover grupo"),
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { product_group_id: string; product_id: string }) => {
      const { error } = await supabase.from("product_group_members").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-group-members"] });
      setIsAddMemberOpen(false);
      setSelectedProductId("");
      toast.success("Produto adicionado ao grupo!");
    },
    onError: () => toast.error("Erro ao adicionar produto"),
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_group_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-group-members"] });
      toast.success("Produto removido do grupo!");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  const getMembersForGroup = (groupId: string) => {
    return groupMembers?.filter(m => m.product_group_id === groupId) || [];
  };

  const getAvailableProducts = (groupId: string) => {
    const memberIds = getMembersForGroup(groupId).map(m => m.product_id);
    return allProducts?.filter(p => !memberIds.includes(p.id)) || [];
  };

  const getProductInfo = (productId: string) => {
    return allProducts?.find(p => p.id === productId);
  };

  const handleAddGroup = () => {
    if (!newGroup.code || !newGroup.name) return;
    addGroupMutation.mutate({
      group_code: newGroup.code.toUpperCase(),
      group_name: newGroup.name,
      description: newGroup.description || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Grupos de Produtos
            </CardTitle>
            <CardDescription>
              Crie grupos para aplicar regras de personalização em lote
            </CardDescription>
          </div>
          <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Grupo de Produtos</DialogTitle>
                <DialogDescription>
                  Crie um grupo para agrupar produtos com regras de personalização similares
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-code">Código</Label>
                  <Input
                    id="group-code"
                    placeholder="Ex: SQUEEZE-PLASTICO"
                    value={newGroup.code}
                    onChange={(e) => setNewGroup({ ...newGroup, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="group-name">Nome</Label>
                  <Input
                    id="group-name"
                    placeholder="Ex: Squeezes Plásticos"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="group-desc">Descrição</Label>
                  <Textarea
                    id="group-desc"
                    placeholder="Descrição opcional do grupo..."
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddGroupOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddGroup} disabled={addGroupMutation.isPending}>
                  {addGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Grupo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {groupsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !groups?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum grupo cadastrado</p>
            <p className="text-sm">Crie grupos para organizar produtos por tipo</p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {groups.map((group) => (
              <AccordionItem
                key={group.id}
                value={group.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <Badge variant="outline" className="font-mono">
                      {group.group_code}
                    </Badge>
                    <span className="font-medium">{group.group_name}</span>
                    <Badge variant="secondary" className="text-xs ml-auto mr-4">
                      <Users className="h-3 w-3 mr-1" />
                      {getMembersForGroup(group.id).length} produtos
                    </Badge>
                    {!group.is_active && (
                      <Badge variant="destructive" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2">
                  {/* Editable group fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg mb-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Código</Label>
                      <InlineEditField
                        value={group.group_code}
                        onSave={(value) => updateGroupMutation.mutate({ id: group.id, group_code: value.toUpperCase() })}
                        className="font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <InlineEditField
                        value={group.group_name}
                        onSave={(value) => updateGroupMutation.mutate({ id: group.id, group_name: value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`group-active-${group.id}`}
                        checked={group.is_active}
                        onCheckedChange={(checked) => updateGroupMutation.mutate({ id: group.id, is_active: checked })}
                      />
                      <Label htmlFor={`group-active-${group.id}`} className="text-sm">
                        Ativo
                      </Label>
                    </div>
                  </div>

                  {group.description && (
                    <p className="text-sm text-muted-foreground mb-4 px-4">{group.description}</p>
                  )}

                  {/* Group members */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Produtos do Grupo
                      </h4>
                      <Dialog
                        open={isAddMemberOpen && selectedGroupId === group.id}
                        onOpenChange={(open) => {
                          setIsAddMemberOpen(open);
                          if (open) setSelectedGroupId(group.id);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="h-3 w-3 mr-1" />
                            Adicionar Produto
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Adicionar Produto ao Grupo</DialogTitle>
                            <DialogDescription>
                              Selecione produtos para adicionar ao grupo {group.group_name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="max-h-96 overflow-y-auto space-y-2">
                            {getAvailableProducts(group.id).length === 0 ? (
                              <p className="text-center text-muted-foreground py-4">
                                Todos os produtos já estão neste grupo
                              </p>
                            ) : (
                              getAvailableProducts(group.id).map((product) => (
                                <div
                                  key={product.id}
                                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                  onClick={() => {
                                    addMemberMutation.mutate({
                                      product_group_id: group.id,
                                      product_id: product.id,
                                    });
                                  }}
                                >
                                  <div>
                                    <span className="font-medium">{product.name}</span>
                                    <Badge variant="outline" className="ml-2 font-mono text-xs">
                                      {product.sku}
                                    </Badge>
                                  </div>
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))
                            )}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                              Fechar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="flex flex-wrap gap-2 pl-4">
                      {getMembersForGroup(group.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Nenhum produto neste grupo
                        </p>
                      ) : (
                        getMembersForGroup(group.id).map((member) => {
                          const product = getProductInfo(member.product_id);
                          return (
                            <Badge
                              key={member.id}
                              variant="secondary"
                              className="gap-1 group cursor-pointer"
                            >
                              {product?.name || "Produto"}
                              <span className="text-xs opacity-70">({product?.sku})</span>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                                onClick={() = aria-label="Excluir"> removeMemberMutation.mutate(member.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </Badge>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Group actions */}
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteGroupMutation.mutate(group.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remover Grupo
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
