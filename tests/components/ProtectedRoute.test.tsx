import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRouter(ui: React.ReactElement, initialRoute = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows loader while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isAdmin: false, isLoading: true });
    renderWithRouter(
      <ProtectedRoute><div>Secret</div></ProtectedRoute>
    );
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    // Loader should be present (svg animate-spin)
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects to /login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isAdmin: false, isLoading: false });
    renderWithRouter(
      <ProtectedRoute><div>Secret</div></ProtectedRoute>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: '123' }, isAdmin: false, isLoading: false });
    renderWithRouter(
      <ProtectedRoute><div>Secret Content</div></ProtectedRoute>
    );
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('redirects to / when requireAdmin=true and user is not admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: '123' }, isAdmin: false, isLoading: false });
    renderWithRouter(
      <ProtectedRoute requireAdmin><div>Admin Only</div></ProtectedRoute>
    );
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument();
  });

  it('renders children when requireAdmin=true and user is admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: '123' }, isAdmin: true, isLoading: false });
    renderWithRouter(
      <ProtectedRoute requireAdmin><div>Admin Content</div></ProtectedRoute>
    );
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
