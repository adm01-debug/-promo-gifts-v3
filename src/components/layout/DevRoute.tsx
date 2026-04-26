import { type ReactNode, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Loader2,
  ShieldAlert,
  ArrowLeft,
  Send,
  Copy,
  Check,
  Mail,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MfaEnrollmentDialog } from "@/components/security/MfaEnrollmentDialog";
import { MfaChallengeDialog } from "@/components/security/MfaChallengeDialog";
import {
  requestDevAccess,
  getThrottleStatus,
  DEV_ACCESS_CONTACT_EMAIL,
} from "@/lib/access/request-dev-access";
import { logAccessDenied } from "@/lib/access/log-access-denied";

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
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const safeFallback = isSupervisorOrAbove ? "/admin/usuarios" : "/";
  const blockedPath = location.pathname;

  // Abre enrollment automaticamente para dev sem MFA cadastrado.
  useEffect(() => {
    if (!isLoading && user && isDev && !hasMFA) {
      setEnrollOpen(true);
    }
  }, [isLoading, user, isDev, hasMFA]);

  // Notifica uma vez ao bloquear (telemetria de UX + clareza)
  useEffect(() => {
    if (!isLoading && user && !isDev) {
      toast.error("Acesso restrito", {
        description:
          "Esta área exige o papel Desenvolvedor. Solicite acesso ao time técnico.",
        id: "dev-route-blocked",
      });
    }
  }, [isLoading, user, isDev]);

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
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-md flex flex-col items-center gap-5 text-center">
          <ShieldAlert
            className="h-12 w-12 text-destructive"
            aria-hidden="true"
          />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">
              Área restrita ao papel Desenvolvedor
            </h1>
            <p className="text-sm text-muted-foreground">
              Esta página contém ferramentas técnicas (telemetria, conexões,
              secrets, MCP, auditoria de baixo nível) e exige o papel{" "}
              <code className="font-mono px-1 py-0.5 rounded bg-muted">
                dev
              </code>
              .
            </p>
            <p className="text-xs text-muted-foreground">
              Rota bloqueada:{" "}
              <code className="font-mono px-1 py-0.5 rounded bg-muted">
                {blockedPath}
              </code>
            </p>
          </div>

          <div className="w-full text-left space-y-2">
            <label
              htmlFor="dev-access-reason"
              className="text-xs font-medium text-foreground"
            >
              Motivo (opcional)
            </label>
            <Textarea
              id="dev-access-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="Ex.: preciso investigar lentidão no catálogo após a release de hoje."
              rows={3}
              className="resize-none"
              disabled={submitting}
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {reason.length}/500
            </div>
          </div>

          <div className="flex flex-col w-full gap-2">
            <Button
              onClick={handleRequestAccess}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Solicitar acesso a Dev
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="w-full"
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copiar link
              </Button>
              <Button
                variant="outline"
                asChild
                className="w-full"
                title={`Enviar e-mail para ${DEV_ACCESS_CONTACT_EMAIL}`}
              >
                <a
                  href={`mailto:${DEV_ACCESS_CONTACT_EMAIL}?subject=${encodeURIComponent(
                    `[Promo Gifts] Acesso técnico — ${blockedPath}`,
                  )}`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  E-mail
                </a>
              </Button>
            </div>
          </div>

          <div className="flex w-full gap-2 pt-2 border-t border-border/40">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(safeFallback, { replace: true })}
              className="flex-1"
            >
              Ir para {isSupervisorOrAbove ? "Usuários" : "Início"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
