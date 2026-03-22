import { useState, useRef, type ChangeEvent } from "react";
import { User, Save, Upload, Camera, Shield, PenTool, Loader2, Trash2, Mail, Phone } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormData } from "@/lib/validations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function ProfilePage() {
  const { user, profile, role, refreshProfile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Update profile with new avatar URL (add timestamp to bust cache)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Avatar atualizado com sucesso");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao fazer upload do avatar");
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          phone: data.phone || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Perfil atualizado com sucesso");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 max-w-2xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
            <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
          </div>
        </div>

        {/* Avatar Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Foto de Perfil</CardTitle>
            <CardDescription>
              Clique na imagem para alterar seu avatar
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="h-32 w-32 cursor-pointer ring-4 ring-background shadow-xl">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Avatar"} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-foreground/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-background animate-spin" />
                ) : (
                  <Camera className="h-8 w-8 text-background" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="text-center">
              <p className="font-medium text-lg">{profile?.full_name || "Sem nome"}</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Badge variant={role === "admin" ? "default" : "secondary"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {role === "admin" ? "Administrador" : "Vendedor"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Assinatura Eletrônica
            </CardTitle>
            <CardDescription>
              Faça upload da sua assinatura escaneada (PNG sem fundo) para uso nas propostas comerciais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {profile?.signature_url ? (
                <div className="relative group">
                  <div className="border border-border rounded-lg p-4 bg-muted/30 min-h-[80px] flex items-center justify-center">
                    <img
                      src={profile.signature_url}
                      alt="Sua assinatura"
                      className="max-h-[60px] max-w-[280px] object-contain"
                    />
                  </div>
                  <div className="flex gap-2 mt-3 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => signatureInputRef.current?.click()}
                      disabled={isUploadingSignature}
                    >
                      {isUploadingSignature ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-1" />
                      )}
                      Substituir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await supabase.from("profiles").update({ signature_url: null }).eq("user_id", user.id);
                          await refreshProfile();
                          toast.success("Assinatura removida");
                        } catch {
                          toast.error("Erro ao remover assinatura");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={isUploadingSignature}
                  className="w-full border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  {isUploadingSignature ? (
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <PenTool className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-medium">
                        Clique para fazer upload da assinatura
                      </span>
                      <span className="text-xs text-muted-foreground">
                        PNG sem fundo • Máximo 2MB
                      </span>
                    </>
                  )}
                </button>
              )}
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png"
                onChange={async (e: ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0];
                  if (!file || !user) return;

                  if (!file.type.includes("png")) {
                    toast.error("Apenas arquivos PNG são aceitos para assinatura");
                    return;
                  }
                  if (file.size > 2 * 1024 * 1024) {
                    toast.error("A assinatura deve ter no máximo 2MB");
                    return;
                  }

                  setIsUploadingSignature(true);
                  try {
                    const fileName = `${user.id}/signature.png`;
                    const { error: uploadError } = await supabase.storage
                      .from("signatures")
                      .upload(fileName, file, { upsert: true });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                      .from("signatures")
                      .getPublicUrl(fileName);

                    const signatureUrl = `${publicUrl}?t=${Date.now()}`;
                    const { error: updateError } = await supabase
                      .from("profiles")
                      .update({ signature_url: signatureUrl })
                      .eq("user_id", user.id);

                    if (updateError) throw updateError;

                    await refreshProfile();
                    toast.success("Assinatura atualizada com sucesso");
                  } catch (error) {
                    console.error("Error uploading signature:", error);
                    toast.error("Erro ao fazer upload da assinatura");
                  } finally {
                    setIsUploadingSignature(false);
                    if (signatureInputRef.current) signatureInputRef.current.value = "";
                  }
                }}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground text-center">
                Caso não envie uma assinatura, o sistema usará seu nome em fonte cursiva nas propostas.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize seus dados de contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Seu nome completo"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="(00) 00000-0000"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={user?.email || ""}
                      disabled
                      className="pl-10 bg-muted/50"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
