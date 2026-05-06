import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Input } from '../input';

describe('Input Component', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText(/enter text/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('rounded-lg');
  });

  it('handles change events', () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId('test-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(input.value).toBe('Hello');
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:opacity-40');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });

  it('renders different types', () => {
    render(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('handles number input with specific attributes', () => {
    render(<Input type="number" min="0" max="10" step="1" data-testid="number-input" />);
    const input = screen.getByTestId('number-input');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('max', '10');
    expect(input).toHaveAttribute('step', '1');
  });

  it('reflects value correctly even if empty', () => {
    render(<Input value="" onChange={() => {}} data-testid="empty-input" />);
    expect((screen.getByTestId('empty-input') as HTMLInputElement).value).toBe('');
  });
});
