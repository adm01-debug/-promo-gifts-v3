/**
 * Smoke test template — helpers para gerar testes mínimos que apenas
 * garantem que o hook não crasha ao montar com providers padrão.
 *
 * Uso:
 *   import { smokeHook } from "../_helpers/smoke-template";
 *   import { useAlgumaCoisa } from "@/hooks/useAlgumaCoisa";
 *
 *   smokeHook("useAlgumaCoisa", () => useAlgumaCoisa());
 */
import { describe, it, expect } from "vitest";
import { renderHookWithProviders } from "./render-hook-providers";

export function smokeHook<TResult>(name: string, factory: () => TResult) {
  describe(`${name} (smoke)`, () => {
    it("monta sem crashar e retorna valor estável", () => {
      const { result, unmount } = renderHookWithProviders(factory);
      // Não deve ser undefined: hooks sempre retornam algo
      expect(result.current).not.toBeUndefined();
      // Tipo do retorno deve ser estável (object, array ou primitive)
      const t = typeof result.current;
      expect(["object", "function", "boolean", "string", "number"].includes(t)).toBe(true);
      unmount();
    });
  });
}
