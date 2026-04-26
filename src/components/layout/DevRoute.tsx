import { type ReactNode, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MfaEnrollmentDialog } from "@/components/security/MfaEnrollmentDialog";
import { MfaChallengeDialog } from "@/components/security/MfaChallengeDialog";
import { logAccessDenied } from "@/lib/access/log-access-denied";
import { DevAccessDeniedPage } from "@/components/access/DevAccessDeniedPage";

interface DevRouteProps {
  children?: ReactNode;
}

/**
 * Guarda para rotas técnicas restritas ao papel `dev`.
 *
 * Cobre telemetria, conexões externas, secrets, audit técnico, MCP,
 * rate-limit, login-attempts, external-db, status do sistema.
 *
 * Hierarquia: dev > supervisor > agente. Apenas `dev` passa.
 *
 * Hardening (paridade com AdminRoute): exige sessão em **AAL2** para `dev`.
 *  - Dev sem MFA cadastrado → abre fluxo de enrollment obrigatório.
 *  - Dev com MFA mas sessão em `aal1` → abre challenge para elevar sessão.
 *  - Não-dev nunca chega na exigência de MFA aqui — vê a tela de bloqueio
 *    com ações contextuais (solicitar acesso, copiar link, e-mail).
 *
 * Comportamento ao bloquear:
 *  - Não autenticado → redireciona para /login preservando `from`.
 *  - Autenticado sem `dev` → exibe tela de aviso com:
 *      • CTA "Solicitar acesso a Dev" (notificação pessoal + mailto).
 *      • CTA "Copiar link da página" para encaminhar manualmente.
 *      • Retorno para destino seguro (supervisor → /admin/usuarios, agente → /).
 */
export function DevRoute({ children }: DevRouteProps) {
  const {
    user,
    isDev,
    isSupervisorOrAbove,
    isLoading,
    currentAAL,
    hasMFA,
    mfaRequired,
    role,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const safeFallback = isSupervisorOrAbove ? "/admin/usuarios" : "/";
  const blockedPath = location.pathname;
  // Snapshot da rota bloqueada (path + search + hash + state) capturado na
  // primeira renderização, para que "Tentar novamente" preserve o location
  // state original mesmo após re-renders ou depois de abrir/fechar diálogos.
  const [blockedTarget] = useState(() => ({
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    state: location.state,
  }));
  const blockedFullPath = `${blockedTarget.pathname}${blockedTarget.search}${blockedTarget.hash}`;

  // Abre enrollment automaticamente para dev sem MFA cadastrado.
  useEffect(() => {
    if (!isLoading && user && isDev && !hasMFA) {
      setEnrollOpen(true);
    }
  }, [isLoading, user, isDev, hasMFA]);

  // Notifica uma vez ao bloquear (telemetria de UX + clareza) e
  // registra a tentativa para auditoria (RLS-safe, throttled).
  useEffect(() => {
    if (!isLoading && user && !isDev) {
      toast.error("Acesso negado (403)", {
        description:
          "Esta área exige o papel Desenvolvedor. Solicite acesso ao time técnico.",
        id: "dev-route-blocked",
      });
      void logAccessDenied({
        userId: user.id,
        blockedPath,
        requiredRole: "dev",
        userRole: role,
      });
    }
  }, [isLoading, user, isDev, blockedPath, role]);

  const handleRequestAccess = async () => {
    if (!user) return;
    const throttle = getThrottleStatus(user.id);
    if (throttle.throttled) {
      toast.warning("Aguarde antes de tentar novamente", {
        description: `Você poderá enviar uma nova solicitação em ${throttle.retryInSeconds}s.`,
      });
      return;
    }
    setSubmitting(true);
    const result = await requestDevAccess({
      userId: user.id,
      userEmail: user.email,
      blockedPath,
      reason,
    });
    setSubmitting(false);

    if (result.throttled) {
      toast.warning("Aguarde antes de tentar novamente", {
        description: `Você poderá enviar uma nova solicitação em ${result.retryInSeconds ?? 60}s.`,
      });
      return;
    }

    if (!result.ok) {
      toast.error("Não foi possível registrar a solicitação", {
        description: result.error ?? "Tente novamente em instantes.",
      });
      return;
    }

    toast.success("Solicitação enviada", {
      description: `Avisamos o time técnico (${DEV_ACCESS_CONTACT_EMAIL}). Você receberá uma notificação quando o acesso for revisado.`,
    });
    if (result.mailtoUrl) {
      // Abre o cliente de email para registro adicional fora do sistema.
      window.location.href = result.mailtoUrl;
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${blockedPath}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado", {
        description: "Envie ao time técnico para liberar o acesso.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Hardening MFA/AAL2 — só aplicável a usuários `dev` (que efetivamente passariam).
  // Não-dev segue para a tela de bloqueio com ações contextuais (sem pedir MFA).
  if (isDev && !hasMFA) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MfaEnrollmentDialog
          open={enrollOpen}
          onOpenChange={setEnrollOpen}
          enforce
        />
      </>
    );
  }

  if (isDev && mfaRequired && currentAAL === "aal1") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MfaChallengeDialog open />
      </>
    );
  }

  if (!isDev) {
    return (
      <DevAccessDeniedPage
        user={{ id: user.id, email: user.email }}
        role={role}
        blockedPath={blockedPath}
        blockedFullPath={blockedFullPath}
        blockedState={blockedTarget.state}
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
