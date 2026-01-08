import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyncedZoomGallery } from '@/components/compare/SyncedZoomGallery';

describe('SyncedZoomGallery', () => {
  it('renders successfully', () => {
    const { container } = render(<SyncedZoomGallery products={[]} />);
    expect(container).toBeTruthy();
  });
});
