import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../select';

describe('Select Component', () => {
  it('renders trigger correctly', () => {
    render(
      <Select>
        <SelectTrigger data-testid="select-trigger">
          <SelectValue placeholder="Choose option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    );

    const trigger = screen.getByTestId('select-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveClass('rounded-lg');
    expect(screen.getByText(/choose option/i)).toBeInTheDocument();
  });

  it('is disabled when the disabled prop is true', () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
