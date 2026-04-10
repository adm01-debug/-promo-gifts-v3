/**
 * Global keyboard shortcuts for power users.
 * 
 * Registry (complementa os atalhos Alt+* da sidebar):
 * Ctrl/Cmd + K → Focus search (busca inteligente)
 * Ctrl/Cmd + J → Open Flow (assistente IA)
 * Ctrl/Cmd + Shift + N → New quote
 * Ctrl/Cmd + Shift + C → Open cart
 * 
 * Existing Alt shortcuts (sidebar): Alt+O cart, Alt+F favorites, Alt+C compare, Alt+T theme
 */
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useOracleVoiceBridge } from "@/stores/oracleVoiceBridge";

interface ShortcutHandlers {
  onSearchFocus?: () => void;
  onToggleCart?: () => void;
}

export function useGlobalShortcuts(handlers?: ShortcutHandlers) {
  const navigate = useNavigate();
  const openOracle = useOracleVoiceBridge((s) => s.openOracle);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isMod) return;

      // Ctrl/Cmd + K → Focus search (works even inside inputs)
      if (e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[aria-label="Campo de busca"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        handlers?.onSearchFocus?.();
        return;
      }

      // Ctrl/Cmd + J → Open Flow (no conflict with browser shortcuts)
      if (e.key === "j" && !isInput) {
        e.preventDefault();
        openOracle();
        return;
      }

      // Ctrl/Cmd + Shift + N → New quote (Shift avoids browser new-window)
      if (e.key === "N" && e.shiftKey && !isInput) {
        e.preventDefault();
        navigate("/orcamentos/novo");
        return;
      }

      // Ctrl/Cmd + Shift + C → Open cart
      if ((e.key === "C" || e.key === "c") && e.shiftKey && !isInput) {
        e.preventDefault();
        handlers?.onToggleCart?.();
        return;
      }
    },
    [navigate, openOracle, handlers]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
