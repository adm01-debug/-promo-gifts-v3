/**
 * Wrapper resiliente para fetch a APIs externas com circuit breaker integrado.
 *
 * Uso:
 *   import { fetchWithBreaker } from "../_shared/external-fetch.ts";
 *   const res = await fetchWithBreaker("bitrix", "https://api.bitrix.com/...", { method: "POST" });
 *
 * Se o circuito estiver aberto, lança Error("circuit_open:<service>") imediatamente.
 * Falhas HTTP 5xx/network contam como falha; 2xx/3xx/4xx contam como sucesso.
 */
import { getBreaker } from "./circuit-breaker.ts";

export class CircuitOpenError extends Error {
  constructor(public service: string) {
    super(`circuit_open:${service}`);
    this.name = "CircuitOpenError";
  }
}

export async function fetchWithBreaker(
  service: string,
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const breaker = getBreaker(service);
  if (!breaker.canRequest()) {
    throw new CircuitOpenError(service);
  }

  try {
    const res = await fetch(url, init);
    if (res.status >= 500) {
      breaker.recordFailure();
    } else {
      breaker.recordSuccess();
    }
    return res;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
}
