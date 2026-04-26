/**
 * DevRoute — gating por papel para rotas técnicas
 *
 * Valida que:
 *  - dev: acessa telemetria, conexões e secrets (chaves) — children renderizam.
 *  - supervisor: é bloqueado e o CTA de fallback aponta para /admin/usuarios.
 *  - agente (vendedor): é bloqueado e o CTA de fallback aponta para /.
 *  - anon: é redirecionado para /login.
 *
 * O componente AdminRoute é mockado nesta suíte para isolar o
 * comportamento do DevRoute (a hierarquia AdminRoute → DevRoute já é
 * coberta por tests/components/AdminRoute.test.tsx).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DevRoute } from '@/components/layout/DevRoute';

// --- mocks ---
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// --- páginas técnicas reais protegidas pelo DevRoute ---
const TECH_ROUTES = [
  { path: '/admin/telemetria',         label: 'Telemetria Page',  area: 'telemetria' },
  { path: '/admin/conexoes',           label: 'Conexões Page',    area: 'conexões'    },
  { path: '/admin/conexoes/status',    label: 'Conexões Status',  area: 'conexões'    },
  { path: '/admin/seguranca/chaves',   label: 'Chaves Page',      area: 'secrets'     },
  { path: '/admin/seguranca-acesso',   label: 'Segurança Acesso', area: 'secrets'     },
  { path: '/admin/login-attempts',     label: 'Login Attempts',   area: 'secrets'     },
] as const;

function renderProtected(initialPath: string) {
  return render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/admin/usuarios" element={<div>Usuários Admin</div>} />
        <Route element={<DevRoute />}>
          {TECH_ROUTES.map((r) => (
            <Route key={r.path} path={r.path} element={<div>{r.label}</div>} />
          ))}
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

const baseAuthShape = {
  user: null as { id: string } | null,
  isLoading: false,
  isDev: false,
  isSupervisorOrAbove: false,
};

beforeEach(() => {
  mockUseAuth.mockReset();
});

// ---------- LOADING ----------
describe('DevRoute — estados de carregamento e anônimo', () => {
  it('mostra spinner enquanto isLoading=true', () => {
    mockUseAuth.mockReturnValue({ ...baseAuthShape, isLoading: true });
    renderProtected('/admin/telemetria');
    expect(screen.queryByText('Telemetria Page')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redireciona anon para /login', () => {
    mockUseAuth.mockReturnValue({ ...baseAuthShape, user: null });
    renderProtected('/admin/conexoes');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Conexões Page')).not.toBeInTheDocument();
  });
});

// ---------- DEV ----------
describe('DevRoute — DEV acessa telemetria, conexões e secrets', () => {
  TECH_ROUTES.forEach(({ path, label, area }) => {
    it(`dev acessa ${path} (${area}) e renderiza "${label}"`, () => {
      mockUseAuth.mockReturnValue({
        ...baseAuthShape,
        user: { id: 'dev-1' },
        isDev: true,
        isSupervisorOrAbove: true, // dev implica supervisor+
      });
      renderProtected(path);
      expect(screen.getByText(label)).toBeInTheDocument();
      // sem tela de bloqueio
      expect(screen.queryByText(/Área restrita/i)).not.toBeInTheDocument();
    });
  });
});

// ---------- SUPERVISOR ----------
describe('DevRoute — SUPERVISOR é bloqueado nas rotas técnicas', () => {
  TECH_ROUTES.forEach(({ path, label }) => {
    it(`supervisor em ${path} vê tela de bloqueio com CTA para /admin/usuarios`, () => {
      mockUseAuth.mockReturnValue({
        ...baseAuthShape,
        user: { id: 'sup-1' },
        isDev: false,
        isSupervisorOrAbove: true,
      });
      renderProtected(path);

      // bloqueio visível
      expect(
        screen.getByText(/Área restrita ao papel Desenvolvedor/i)
      ).toBeInTheDocument();
      // página técnica NÃO renderiza
      expect(screen.queryByText(label)).not.toBeInTheDocument();
      // CTA aponta para Usuários (rota admin segura)
      expect(screen.getByRole('button', { name: /Ir para Usuários/i })).toBeInTheDocument();
    });
  });

  it('clicar no CTA leva supervisor para /admin/usuarios', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthShape,
      user: { id: 'sup-1' },
      isDev: false,
      isSupervisorOrAbove: true,
    });
    renderProtected('/admin/telemetria');
    fireEvent.click(screen.getByRole('button', { name: /Ir para Usuários/i }));
    expect(screen.getByText('Usuários Admin')).toBeInTheDocument();
  });
});

// ---------- AGENTE (vendedor) ----------
describe('DevRoute — AGENTE (vendedor) é bloqueado e mandado para /', () => {
  TECH_ROUTES.forEach(({ path, label }) => {
    it(`agente em ${path} vê bloqueio com CTA para Início`, () => {
      mockUseAuth.mockReturnValue({
        ...baseAuthShape,
        user: { id: 'agente-1' },
        isDev: false,
        isSupervisorOrAbove: false,
      });
      renderProtected(path);

      expect(
        screen.getByText(/Área restrita ao papel Desenvolvedor/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(label)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Ir para Início/i })).toBeInTheDocument();
    });
  });

  it('clicar no CTA leva agente para /', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthShape,
      user: { id: 'agente-1' },
      isDev: false,
      isSupervisorOrAbove: false,
    });
    renderProtected('/admin/conexoes');
    fireEvent.click(screen.getByRole('button', { name: /Ir para Início/i }));
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });
});

// ---------- Matriz role × área (resumo determinístico) ----------
describe('Matriz role × área técnica', () => {
  type Persona = 'dev' | 'supervisor' | 'agente' | 'anon';
  const personas: Record<Persona, { user: { id: string } | null; isDev: boolean; isSupervisorOrAbove: boolean }> = {
    dev:        { user: { id: 'dev' },        isDev: true,  isSupervisorOrAbove: true  },
    supervisor: { user: { id: 'sup' },        isDev: false, isSupervisorOrAbove: true  },
    agente:     { user: { id: 'ag'  },        isDev: false, isSupervisorOrAbove: false },
    anon:       { user: null,                  isDev: false, isSupervisorOrAbove: false },
  };

  // Por área, esperamos que apenas dev passe.
  const areas = Array.from(new Set(TECH_ROUTES.map((r) => r.area)));

  (['dev', 'supervisor', 'agente', 'anon'] as Persona[]).forEach((persona) => {
    areas.forEach((area) => {
      const expectAccess = persona === 'dev';
      it(`${persona} → ${area}: ${expectAccess ? 'acessa' : 'bloqueado'}`, () => {
        const route = TECH_ROUTES.find((r) => r.area === area)!;
        mockUseAuth.mockReturnValue({ ...baseAuthShape, ...personas[persona] });
        renderProtected(route.path);

        if (expectAccess) {
          expect(screen.getByText(route.label)).toBeInTheDocument();
        } else if (persona === 'anon') {
          expect(screen.getByText('Login Page')).toBeInTheDocument();
        } else {
          expect(screen.queryByText(route.label)).not.toBeInTheDocument();
          expect(
            screen.getByText(/Área restrita ao papel Desenvolvedor/i)
          ).toBeInTheDocument();
        }
      });
    });
  });
});
