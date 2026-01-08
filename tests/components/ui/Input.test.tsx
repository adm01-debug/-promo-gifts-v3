import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/ui/input';

describe('Input', () => {
  it('renders and accepts input', () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="Test" />);
    const input = screen.getByPlaceholderText('Test');
    fireEvent.change(input, { target: { value: 'test value' } });
    expect(onChange).toHaveBeenCalled();
  });
});
