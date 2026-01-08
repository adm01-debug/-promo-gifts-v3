import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SupplierComparisonModal } from '@/components/compare/SupplierComparisonModal';

describe('SupplierComparisonModal', () => {
  it('renders successfully', () => {
    const { container } = render(<SupplierComparisonModal />);
    expect(container).toBeTruthy();
  });
});
