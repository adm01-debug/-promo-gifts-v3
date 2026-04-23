import {
  Clock,
  WifiOff,
  Globe,
  KeyRound,
  ServerCrash,
  Settings2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { ErrorKind } from "@/hooks/useConnectionTester";

export type ErrorTone = "timeout" | "network" | "dns" | "auth" | "http" | "config" | "unknown";

export interface ErrorCopy {
  /** Título humano e curto. */
  title: string;
  /** Dica acionável para o usuário resolver. */
  hint: string;
  /** Ícone semântico associado. */
  icon: LucideIcon;
  /** Tom semântico (para estilos). */
  tone: ErrorTone;
}

/**
 * Mapeia `error_kind` (+ `status` HTTP opcional) numa cópia coerente
 * com título, dica acionável e ícone. SSOT para mensagens de erro
 * de conexões em toasts, linhas de status e modais.
 */
export function getErrorCopy(
  kind?: ErrorKind | null,
  status?: number | null,
  fallbackMessage?: string | null,
): ErrorCopy {
  switch (kind) {
    case "timeout":
      return {
        title: "Tempo esgotado",
        hint: "O endpoint não respondeu em tempo. Verifique se o serviço está ativo e acessível.",
        icon: Clock,
        tone: "timeout",
      };
    case "network":
      return {
        title: "Sem conexão com o serviço",
        hint: "Falha de rede ao alcançar o destino. Verifique firewall, VPN ou se o host está no ar.",
        icon: WifiOff,
        tone: "network",
      };
    case "dns":
      return {
        title: "URL não encontrada",
        hint: "O DNS não resolveu o domínio. Confira a URL configurada na conexão.",
        icon: Globe,
        tone: "dns",
      };
    case "auth":
      return {
        title: "Credenciais rejeitadas",
        hint: "Token, chave ou senha inválido/expirado. Reabra o secret e cole o valor atualizado.",
        icon: KeyRound,
        tone: "auth",
      };
    case "http": {
      const s = status ?? 0;
      let hint = "O serviço destino retornou um erro. Inspecione a resposta nos detalhes.";
      if (s >= 400 && s < 500) {
        hint = "Requisição rejeitada pelo serviço. Verifique payload, permissões e escopos.";
      } else if (s >= 500) {
        hint = "Instabilidade no serviço destino. Tente novamente em alguns minutos.";
      }
      return {
        title: status ? `Erro HTTP ${status}` : "Erro HTTP",
        hint,
        icon: ServerCrash,
        tone: "http",
      };
    }
    case "config":
      return {
        title: "Configuração incompleta",
        hint: "Faltam campos obrigatórios. Edite a conexão e preencha todas as credenciais.",
        icon: Settings2,
        tone: "config",
      };
    case "unknown":
    case null:
    case undefined:
    default:
      return {
        title: "Falha na conexão",
        hint: fallbackMessage?.trim() || "Não foi possível identificar a causa. Veja os detalhes do teste.",
        icon: AlertTriangle,
        tone: "unknown",
      };
  }
}
