/**
 * Match card components extracted from ProductMatchPage.
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { type Product } from '@/hooks/useProducts';
import { type MatchResult } from '@/hooks/useProductMatch';
import { cn } from '@/lib/utils';
import { getCdnUrl } from '@/utils/image-utils';
import {
  ExternalLink, Users, Tag, Target, Layers, Equal, Link2, FileText,
} from 'lucide-react';

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export const MATCH_TYPE_CONFIG = {
  identical: { label: 'Idêntico', icon: Equal, color: 'bg-primary text-primary-foreground' },
  similar: { label: 'Semelhante', icon: Layers, color: 'bg-info text-info-foreground' },
  complementary: { label: 'Complementar', icon: Link2, color: 'bg-warning text-warning-foreground' },
} as const;

export function SelectedProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <img
            src={getCdnUrl(product.images?.[0] || product.image_url || '/placeholder.svg', 'small')}
            alt={product.name}
            className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0" loading="lazy" />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="font-display text-sm font-bold text-foreground leading-tight">{product.name}</h3>
            <p className="text-[11px] text-muted-foreground">SKU: {product.sku}</p>
            <p className="text-sm font-semibold text-foreground">{formatPrice(product.price)}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {product.category?.name && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{product.category.name}</Badge>
              )}
              {product.supplier?.name && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.supplier.name}</Badge>
              )}
            </div>
          </div>
        </div>

        {product.tags && (
          <div className="space-y-1.5">
            {product.tags.publicoAlvo?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Users className="h-3 w-3 text-primary shrink-0" />
                {product.tags.publicoAlvo.map(t => (
                  <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                ))}
              </div>
            )}
            {product.tags.nicho?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="h-3 w-3 text-accent-foreground shrink-0" />
                {product.tags.nicho.map(t => (
                  <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" className="w-full text-xs gap-1.5"
          onClick={() => navigate(`/produto/${product.id}`)}>
          <ExternalLink className="h-3.5 w-3.5" />
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

export function MatchCard({ match, onNavigate }: { match: MatchResult; onNavigate: (id: string) => void }) {
  const navigate = useNavigate();
  const config = MATCH_TYPE_CONFIG[match.matchType];
  const Icon = config.icon;

  const handleAddToQuote = () => {
    const p = match.product;
    const params = new URLSearchParams({
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku || '',
      product_price: String(p.price),
      min_quantity: String(p.minQuantity || 1),
      ...(p.image_url ? { product_image: p.image_url } : {}),
    });
    navigate(`/orcamentos/novo?${params.toString()}`);
  };

  return (
    <Card className="border-border/40 hover:border-border/80 hover:shadow-md transition-all group">
      <CardContent className="p-3 flex items-start gap-3">
        <img
          src={getCdnUrl(match.product.images?.[0] || match.product.image_url || '/placeholder.svg', 'small')}
          alt={match.product.name}
          className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0" loading="lazy" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground truncate">{match.product.name}</h4>
              <p className="text-[10px] text-muted-foreground">{match.product.sku} • {formatPrice(match.product.price)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className={cn('text-[9px] px-1.5 py-0 gap-0.5', config.color)}>
                <Icon className="h-2.5 w-2.5" />
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                {match.score}pts
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {match.reasons.map((reason, i) => (
              <span key={i} className="inline-flex items-center text-[9px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                {reason}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {match.product.category?.name && <span>{match.product.category.name}</span>}
            {match.product.supplier?.name && (
              <><span className="text-border">•</span><span>{match.product.supplier.name}</span></>
            )}
            {match.product.colors?.length > 0 && (
              <><span className="text-border">•</span><span>{match.product.colors.length} cores</span></>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={handleAddToQuote}>
              <FileText className="h-3 w-3" />
              Orçamento
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2"
              onClick={() => onNavigate(match.product.id)}>
              <ExternalLink className="h-3 w-3" />
              Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
