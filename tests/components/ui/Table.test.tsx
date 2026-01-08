import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

describe('Table', () => {
  it('renders table with data', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow><TableHead>Name</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          <TableRow><TableCell>John</TableCell></TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});
