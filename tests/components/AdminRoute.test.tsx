import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '@/components/layout/AdminRoute';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderWithRouter(ui: React.ReactElement, initialRoute = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/admin" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminRoute', () => {
  it('shows loader while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, canManage: false, isLoading: true });
    renderWithRouter(
      <AdminRoute><div>Admin Panel</div></AdminRoute>
    );
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects to /login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, canManage: false, isLoading: false });
    renderWithRouter(
      <AdminRoute><div>Admin Panel</div></AdminRoute>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to / when user cannot manage (vendedor)', () => {
    mockUseAuth.mockReturnValue({ user: { id: '123' }, canManage: false, isLoading: false });
    renderWithRouter(
      <AdminRoute><div>Admin Panel</div></AdminRoute>
    );
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders children when user is admin', () => {
    mockUseAuth.mockReturnValue({ user: { id: '123' }, canManage: true, isLoading: false });
    renderWithRouter(
      <AdminRoute><div>Admin Panel</div></AdminRoute>
    );
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('renders children when user is manager', () => {
    mockUseAuth.mockReturnValue({ user: { id: '456' }, canManage: true, isLoading: false });
    renderWithRouter(
      <AdminRoute><div>Manager Content</div></AdminRoute>
    );
    expect(screen.getByText('Manager Content')).toBeInTheDocument();
  });
});
