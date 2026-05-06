import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Textarea } from '../textarea';

describe('Textarea Component', () => {
  it('renders correctly', () => {
    render(<Textarea placeholder="Enter details" />);
    const textarea = screen.getByPlaceholderText(/enter details/i);
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('rounded-lg');
  });

  it('handles change events', () => {
    render(<Textarea data-testid="test-textarea" />);
    const textarea = screen.getByTestId('test-textarea') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Long text content' } });
    expect(textarea.value).toBe('Long text content');
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:opacity-50');
  });
});
