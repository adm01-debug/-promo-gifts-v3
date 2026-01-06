import { useState, useCallback } from 'react';

/**
 * Hook simples para toggle de boolean
 */
export function useToggle(initialValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  const set = useCallback((newValue: boolean) => {
    setValue(newValue);
  }, []);

  return [value, toggle, set];
}

/**
 * Hook para múltiplos toggles com estado de seleção
 */
export function useMultiToggle<T extends string>(
  initialSelected: T[] = []
): {
  selected: T[];
  isSelected: (item: T) => boolean;
  toggle: (item: T) => void;
  selectAll: (items: T[]) => void;
  deselectAll: () => void;
  setSelected: (items: T[]) => void;
} {
  const [selected, setSelected] = useState<T[]>(initialSelected);

  const isSelected = useCallback(
    (item: T) => selected.includes(item),
    [selected]
  );

  const toggle = useCallback((item: T) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelected(items);
  }, []);

  const deselectAll = useCallback(() => {
    setSelected([]);
  }, []);

  return {
    selected,
    isSelected,
    toggle,
    selectAll,
    deselectAll,
    setSelected,
  };
}
