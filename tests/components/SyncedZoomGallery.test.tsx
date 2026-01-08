import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyncedZoomGallery } from '@/components/products/SyncedZoomGallery';

describe('SyncedZoomGallery', () => {
  it('renders successfully', () => {
    const { container } = render(<SyncedZoomGallery />);
    expect(container).toBeTruthy();
  });
});
