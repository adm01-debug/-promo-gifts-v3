import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SuccessCelebration } from '@/components/effects/SuccessCelebration';

describe('SuccessCelebration', () => {
  it('renders successfully', () => {
    const { container } = render(<SuccessCelebration />);
    expect(container).toBeTruthy();
  });
});
