import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { generateKitOgImage } from '@/lib/kit-og-image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Package,
  Loader2,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Box,
  Layers,
  Palette,
} from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';

interface KitPublicData {
  kit: {
    name: string;
    kit_type: string;
    kit_quantity: number;
    volume_usage_percent: number;
    box: { name: string; imageUrl?: string; dimensions?: any } | null;
    items: Array<{
      name: string;
      quantity: number;
      category?: string;
      imageUrl?: string;
      selectedColor?: { name: string; hex: string } | null;
      isOptional?: boolean;
    }>;
  };
  seller: { full_name: string; email: string; phone: string; avatar_url: string } | null;
  organization: { name: string; logo_url: string; description: string } | null;
  token: { id: string; client_name: string | null };
}

export default function PublicKitViewPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<KitPublicData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchKit = async () => {
      setIsLoading(true);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          'kit-public-view',
          { body: { action: 'get_kit', token } },
        );
        if (fnError) throw fnError;
        if (result?.error) {
          setError(result.error);
          return;
        }
        setData(result as KitPublicData);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar kit');
      } finally {
        setIsLoading(false);
      }
    };
    fetchKit();
  }, [token]);

  // Generate dynamic OG image once kit data loads (must run before any early return)
  const ogImage = useMemo(() => {
    if (!data) return undefined;
    return (
      generateKitOgImage({
        kitName: data.kit.name,
        organization: data.organization?.name,
        itemsCount: data.kit.items.length,
      }) || undefined
    );
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <PageSEO
          title="Visualizar Kit"
          description="Confira os detalhes do kit de brindes promocionais."
          noIndex
        />
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando apresentação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-8 text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-destructive" />
            <h2 className="font-display text-xl font-semibold">Link Indisponível</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { kit, seller, organization, token: tokenInfo } = data;
  const kitTypeLabels: Record<string, string> = {
    montado: 'Kit Montado',
    original: 'Kit Original',
    simples: 'Kit Simples',
  };

  const seoTitle = organization?.name
    ? `Kit ${kit.name} – ${organization.name}`
    : `Kit ${kit.name}`;
  const seoDescription = `Apresentação do kit "${kit.name}" com ${kit.items.length} ${kit.items.length === 1 ? 'item' : 'itens'}${organization?.name ? ` por ${organization.name}` : ''}.`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <PageSEO title={seoTitle} description={seoDescription} ogImage={ogImage} noIndex />
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="h-10 w-auto object-contain"
                loading="lazy"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="font-display font-semibold text-foreground">
                {organization?.name || 'Proposta de Kit'}
              </h1>
              {tokenInfo.client_name && (
                <p className="text-xs text-muted-foreground">Para: {tokenInfo.client_name}</p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Layers className="h-3 w-3" />
            {kitTypeLabels[kit.kit_type] || kit.kit_type}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Kit Name & Quantity */}
        <div className="space-y-2 text-center">
          <h2 className="font-display text-3xl font-bold text-foreground">{kit.name}</h2>
          <p className="text-lg text-muted-foreground">
            Quantidade:{' '}
            <span className="font-semibold text-foreground">
              {kit.kit_quantity} {kit.kit_quantity === 1 ? 'kit' : 'kits'}
            </span>
          </p>
        </div>

        {/* Box */}
        {kit.box && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Box className="h-4 w-4 text-primary" />
                Embalagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {kit.box.imageUrl && (
                  <img
                    src={kit.box.imageUrl}
                    alt={kit.box.name}
                    className="h-20 w-20 rounded-lg border bg-muted/50 object-contain"
                    loading="lazy"
                  />
                )}
                <div>
                  <p className="font-medium">{kit.box.name}</p>
                  {kit.volume_usage_percent > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {Math.round(kit.volume_usage_percent)}% de ocupação
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              Itens do Kit ({kit.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {kit.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-14 w-14 flex-shrink-0 rounded-lg border bg-muted/50 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border bg-muted/50">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {item.quantity}x
                      </Badge>
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                      {item.isOptional && (
                        <Badge variant="outline" className="text-xs">
                          Opcional
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.selectedColor && (
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: item.selectedColor.hex }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.selectedColor.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seller Contact */}
        {seller && (
          <>
            <Separator />
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={seller.avatar_url} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="font-semibold">{seller.full_name}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {seller.email && (
                        <a
                          href={`mailto:${seller.email}`}
                          className="flex items-center gap-1 transition-colors hover:text-primary"
                        >
                          <Mail className="h-3.5 w-3.5" /> {seller.email}
                        </a>
                      )}
                      {seller.phone && (
                        <a
                          href={`https://wa.me/${seller.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 transition-colors hover:text-primary"
                        >
                          <Phone className="h-3.5 w-3.5" /> {seller.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <p className="pt-4 text-center text-xs text-muted-foreground">
          {organization?.name || 'Proposta'} • Apresentação gerada automaticamente
        </p>
      </main>
    </div>
  );
}
