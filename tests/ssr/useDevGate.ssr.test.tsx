import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { useDevGate } from '@/hooks/useDevGate';
import { useAuth } from '@/contexts/AuthContext';

// Mock do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Componente de teste que usa o hook
function TestComponent() {
  const { isAllowed } = useDevGate();
  return React.createElement('div', null, isAllowed ? 'allowed' : 'denied');
}

describe('useDevGate SSR', () => {
  it('should use fallback value during SSR when isDev is false', () => {
    (useAuth as any).mockReturnValue({ isDev: false });
    
    // Simular ambiente SSR deletando window
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.localStorage;

    try {
      const html = renderToString(React.createElement(TestComponent));
      expect(html).toContain('denied');
    } finally {
      // Restaurar ambiente
      global.window = originalWindow;
    }
  });

  it('should use fallback value during SSR when isDev is true', () => {
    (useAuth as any).mockReturnValue({ isDev: true });
    
    // Simular ambiente SSR
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.localStorage;

    try {
      const html = renderToString(React.createElement(TestComponent));
      expect(html).toContain('allowed');
    } finally {
      global.window = originalWindow;
    }
  });

  it('should not throw when devInfraGate is accessed in SSR', () => {
    (useAuth as any).mockReturnValue({ isDev: true });
    
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.localStorage;

    try {
      // O hook chama subscribe, getSnapshot e getServerSnapshot do useSyncExternalStore
      // O DevInfraGate tem uma proteção "if (typeof window !== 'undefined')" no constructor
      expect(() => renderToString(React.createElement(TestComponent))).not.toThrow();
    } finally {
      global.window = originalWindow;
    }
  });
});
