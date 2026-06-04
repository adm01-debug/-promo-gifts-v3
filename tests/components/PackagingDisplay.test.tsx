import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils';
import { PackagingBadge } from '@/components/products/PackagingBadge';
import { KitComposition } from '@/components/products/KitComposition';

describe('PackagingDisplay Logic', () => {
  describe('PackagingBadge', () => {
    it('should NOT render when hasCommercialPackaging is false', () => {
      const { container } = render(
        <PackagingBadge 
          hasCommercialPackaging={false} 
          packingType="Caixa Luxo" 
          repackingType={null} 
          packagingContext="always" 
          onClick={() => {}} 
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('should render packingType when hasCommercialPackaging is true', () => {
      render(
        <PackagingBadge 
          hasCommercialPackaging={true} 
          packingType="Caixa Luxo" 
          repackingType={null} 
          packagingContext="always" 
          onClick={() => {}} 
        />
      );
      expect(screen.getByText('Caixa Luxo')).toBeInTheDocument();
      expect(screen.getByText('Sempre disponível')).toBeInTheDocument();
    });

    it('should render repackingType when packagingContext is "with_customization"', () => {
      render(
        <PackagingBadge 
          hasCommercialPackaging={true} 
          packingType="Caixa Padrão" 
          repackingType="Caixa Personalizada Especial" 
          packagingContext="with_customization" 
          onClick={() => {}} 
        />
      );
      expect(screen.getByText('Caixa Personalizada Especial')).toBeInTheDocument();
      expect(screen.getByText('Com personalização')).toBeInTheDocument();
    });
  });

  describe('KitComposition', () => {
    const mockItems = [
      {
        id: '1',
        productId: 'p1',
        productName: 'Caneta',
        quantity: 1,
        sku: 'CAN-001',
        isPackaging: false,
        allowsPersonalization: true
      },
      {
        id: '2',
        productId: 'p2',
        productName: 'Caixa de Presente',
        quantity: 1,
        sku: 'BOX-001',
        isPackaging: true,
        allowsPersonalization: false
      }
    ];

    it('should render kit composition summary correctly', () => {
      render(<KitComposition items={mockItems} />);
      expect(screen.getByText('Composição do Kit')).toBeInTheDocument();
      expect(screen.getByText(/2 componentes • 2 peças/i)).toBeInTheDocument();
    });

    it('should correctly classify packaging items in stats', () => {
      // We click to open the dialog to see full stats
      render(<KitComposition items={mockItems} />);
      const trigger = screen.getByRole('button');
      trigger.click();

      // Check for stats inside dialog
      expect(screen.getByText('1 item')).toBeInTheDocument();
      expect(screen.getByText('1 embalagem')).toBeInTheDocument();
      expect(screen.getByText('1 personalizáveis')).toBeInTheDocument();
    });
  });
});
