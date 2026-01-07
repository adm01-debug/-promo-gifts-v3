import { useRef, ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  estimateSize?: number;
  className?: string;
  containerClassName?: string;
  overscan?: number;
  gap?: number;
}

export function VirtualizedList<T>({ 
  items, 
  renderItem, 
  estimateSize = 200,
  className,
  containerClassName,
  overscan = 5,
  gap = 0,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    gap,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef} 
      className={cn("h-full overflow-auto", className)}
    >
      <div 
        style={{ 
          height: `${virtualizer.getTotalSize()}px`, 
          position: 'relative' 
        }}
        className={containerClassName}
      >
        {virtualItems.map((vItem) => (
          <div 
            key={vItem.key} 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${vItem.size}px`,
              transform: `translateY(${vItem.start}px)`,
            }}
          >
            {renderItem(items[vItem.index], vItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Versão com grid para cards
interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  columns?: number;
  rowHeight?: number;
  className?: string;
  gap?: number;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  columns = 3,
  rowHeight = 300,
  className,
  gap = 16,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(items.length / columns);
  
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 2,
    gap,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div 
      ref={parentRef} 
      className={cn("h-full overflow-auto", className)}
    >
      <div 
        style={{ 
          height: `${virtualizer.getTotalSize()}px`, 
          position: 'relative' 
        }}
      >
        {virtualRows.map((vRow) => {
          const startIndex = vRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);
          
          return (
            <div 
              key={vRow.key} 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${vRow.size}px`,
                transform: `translateY(${vRow.start}px)`,
              }}
              className="grid"
            >
              <div 
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {rowItems.map((item, idx) => (
                  <div key={startIndex + idx}>
                    {renderItem(item, startIndex + idx)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
