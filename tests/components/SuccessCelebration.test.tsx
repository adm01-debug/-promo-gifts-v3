import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SuccessCelebration } from '@/components/effects/SuccessCelebration';

describe('SuccessCelebration', () => {
  it('renders when show is false', () => {
    const { container } = render(<SuccessCelebration show={false} />);
    expect(container).toBeTruthy();
  });

  it('renders when show is true', () => {
    const { container } = render(
      <SuccessCelebration 
        show={true} 
        title="Test Success"
        type="success"
      />
    );
    expect(container).toBeTruthy();
  });
});
