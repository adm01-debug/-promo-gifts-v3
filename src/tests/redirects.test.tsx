import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppProviders } from '../components/providers/AppProviders';
import { AppContent } from '../App';

// Mocking AppBootstrapContainer because it runs useAppBootstrap which might have side effects
vi.mock('../App', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    // We'll use the real AppContent but we might need to export it first
  };
});

// Mock dependencies that we don't want to run in tests
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: '123' } } }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
  },
}));

// Mock useAppBootstrap
vi.mock('@/hooks/useAppBootstrap', () => ({
  useAppBootstrap: vi.fn(),
}));

// Component to track location in tests
const LocationTracker = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

describe('Legacy Redirects', () => {
  it('redirects from /mockup-generator to /ferramentas/mockup-generator', async () => {
    // Note: To test this properly without loading the whole App (which might be slow/complex),
    // we could either export AppContent from App.tsx or duplicate the specific redirect routes here.
    // However, the user wants to ensure FUTURE changes don't break it, 
    // so testing the actual App configuration is better.
  });
});
