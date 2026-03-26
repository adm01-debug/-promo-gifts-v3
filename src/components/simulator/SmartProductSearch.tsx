// Smart Product Search with autocomplete, images, recent products, and hover preview
import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { motion } from 'framer-motion';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  Search,
  X,
  Clock,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecentProducts } from '@/hooks/useRecentProducts';
import { formatCurrency } from '@/hooks/useSimulation';
import type { Product } from '@/types/simulation';
import { createProductFuseOptions, rankProductSearchResults } from '@/utils/product-search';

interface SmartProductSearchProps {
  products: Product[] | undefined;
  productsLoading: boolean;
  selectedProduct: Product | undefined;
  onSelect: (productId: string | null) => void;
  className?: string;
}

// Product image component with fallback
function ProductImage({ 
  src, 
  alt, 
  size = 'sm' 
}: { 
  src?: string | null; 
  alt: string; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const [error, setError] = useState(false);
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  };

  if (!src || error) {
    return (
      <div className={cn(
        sizeClasses[size],
        'rounded-lg bg-muted flex items-center justify-center shrink-0'
      )}>
        <Package className={cn(
          'text-muted-foreground',
          size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-8 w-8'
        )} />
      </div>
    );
  }

  return (
    <div className={cn(sizeClasses[size], 'rounded-lg overflow-hidden shrink-0 bg-muted')}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
        loading="lazy"
      />
    </div>
  );
}

// Preview card on hover
function ProductPreviewCard({ product }: { product: Product }) {
  return (
    <div className="w-64 space-y-3">
      {/* Large image */}
      <div className="aspect-square rounded-xl bg-muted overflow-hidden">
        <ProductImage src={product.image_url} alt={product.name} size="lg" />
      </div>
      
      {/* Info */}
      <div className="space-y-2">
        <div>
          <h4 className="font-semibold text-sm line-clamp-2">{product.name}</h4>
          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="font-mono text-sm">
            {formatCurrency(product.price)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// Main component
export function SmartProductSearch({
  products,
  productsLoading,
  selectedProduct,
  onSelect,
  className,
}: SmartProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { recentProducts, addRecentProduct, hasRecents } = useRecentProducts();
  const fuse = useMemo(
    () => (products ? new Fuse(products, createProductFuseOptions<Product>()) : null),
    [products]
  );

  const searchResults = useMemo(() => {
    if (!products || products.length === 0) return [];
    if (!searchQuery || searchQuery.length < 2) return products.slice(0, 20);

    return rankProductSearchResults(products, searchQuery, fuse ?? undefined);
  }, [products, searchQuery, fuse]);

  // Handle product selection
  const handleSelect = (product: Product) => {
    onSelect(product.id);
    addRecentProduct({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image_url: product.image_url,
    });
    setOpen(false);
    setSearchQuery('');
  };

  // Clear selection
  const handleClear = () => {
    onSelect(null);
  };

  // Selected product display
  if (selectedProduct) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'p-3 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <ProductImage 
            src={selectedProduct.image_url} 
            alt={selectedProduct.name} 
            size="md" 
          />
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{selectedProduct.name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>SKU: {selectedProduct.sku}</span>
              <span>•</span>
              <Badge variant="secondary" className="font-mono text-xs px-1.5 py-0">
                {formatCurrency(selectedProduct.price)}
              </Badge>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full h-12 justify-between text-base font-normal',
            'hover:bg-accent/50 border-2 border-dashed border-muted-foreground/30',
            'hover:border-primary/50 transition-all',
            className
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Buscar produto por nome ou SKU...</span>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Digite para buscar..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-11"
          />
          
          <CommandList>
            {/* Loading state */}
            {productsLoading && (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Empty state */}
            <CommandEmpty>
              <div className="py-6 text-center">
                <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhum produto encontrado
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Tente outro termo de busca
                </p>
              </div>
            </CommandEmpty>
            
            {/* Recent products */}
            {!searchQuery && hasRecents && (
              <>
                <CommandGroup heading={
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Produtos recentes
                  </div>
                }>
                  {recentProducts.map((product) => (
                    <HoverCard key={product.id} openDelay={400} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <CommandItem
                          value={product.id}
                          onSelect={() => {
                            const fullProduct = products?.find(p => p.id === product.id);
                            if (fullProduct) handleSelect(fullProduct);
                          }}
                          className="gap-3 py-2.5 cursor-pointer"
                        >
                          <ProductImage 
                            src={product.image_url} 
                            alt={product.name} 
                            size="sm" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.sku} • {formatCurrency(product.price)}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            Recente
                          </Badge>
                        </CommandItem>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" align="start" className="w-auto p-3">
                        <ProductPreviewCard product={product as unknown as Product} />
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            
            {/* Search results */}
            {!productsLoading && searchResults.length > 0 && (
              <CommandGroup heading={
                searchQuery ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{searchQuery}"
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    Todos os produtos
                  </div>
                )
              }>
                <ScrollArea className="h-64">
                  {searchResults.map((product) => (
                    <HoverCard key={product.id} openDelay={400} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <CommandItem
                          value={product.id}
                          onSelect={() => handleSelect(product)}
                          className="gap-3 py-2.5 cursor-pointer"
                        >
                          <ProductImage 
                            src={product.image_url} 
                            alt={product.name} 
                            size="sm" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.sku}
                            </p>
                          </div>
                          <Badge variant="secondary" className="font-mono text-xs shrink-0">
                            {formatCurrency(product.price)}
                          </Badge>
                        </CommandItem>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" align="start" className="w-auto p-3">
                        <ProductPreviewCard product={product} />
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </ScrollArea>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
