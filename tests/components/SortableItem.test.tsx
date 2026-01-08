import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SortableItem } from '@/components/admin/SortableItem';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

describe('SortableItem', () => {
  it('renders', () => {
    const { container } = render(
      <DndContext>
        <SortableContext items={['1']} strategy={verticalListSortingStrategy}>
          <SortableItem id="1">Test</SortableItem>
        </SortableContext>
      </DndContext>
    );
    expect(container).toBeTruthy();
  });
});
