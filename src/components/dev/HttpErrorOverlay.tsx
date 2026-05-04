/**
 * HttpErrorOverlay — Painel flutuante (DEV/preview) que intercepta fetch
 * e XMLHttpRequest, registrando respostas com status >= 400 (em destaque
 * para 412 — Precondition Failed, comum em problemas de cache/SW e ETag).
 *
 * Exibe método, URL, status, request_id (se houver) e os headers de
 * request/response relevantes diretamente na UI do preview, eliminando a
 * necessidade de abrir o DevTools para diagnosticar o problema.
 *
 * - Ativo em `import.meta.env.DEV` ou quando `localStorage.http_debug==='1'`.
 * - Capacidade do buffer: 50 entradas (FIFO).
 * - Sem dependências externas; agnóstico de rota.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AlertCircle, X, ChevronDown, ChevronUp, Trash2, Copy } from 'lucide-react';

interface HttpErrorEntry {
  id: string;
  ts: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  durationMs: number;
  requestId?: string;
  reqHeaders: Record<string, string>;
  resHeaders: Record<string, string>;
  bodyPreview?: string;
}

const RELEVANT_REQ_HEADERS = [
  'authorization', 'apikey', 'content-type', 'accept',
  'x-request-id', 'x-client-info', 'if-match', 'if-none-match',
  'cache-control', 'pragma',
];
const RELEVANT_RES_HEADERS = [
  'content-type', 'cache-control', 'etag', 'last-modified',
  'x-request-id', 'x-cache', 'cf-cache-status', 'cf-ray',
  'access-control-allow-origin', 'sb-gateway-version',
];

let listeners: Array<(e: HttpErrorEntry) => void> = [];
let installed = false;
const MAX = 50;

function shouldEnable(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.DEV) return true;
  try { return window.localStorage.getItem('http_debug') === '1'; } catch { return false; }
}

function pickHeaders(headers: Headers | Record<string, string> | undefined, allow: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  const get = (k: string): string | null => {
    if (headers instanceof Headers) return headers.get(k);
    const lower = k.toLowerCase();
    for (const [hk, hv] of Object.entries(headers)) {
      if (hk.toLowerCase() === lower) return String(hv);
    }
    return null;
  };
  for (const k of allow) {
    const v = get(k);
    if (v != null) out[k] = k === 'authorization' || k === 'apikey' ? maskSecret(v) : v;
  }
  return out;
}

function maskSecret(v: string): string {
  if (v.length <= 12) return '***';
  return `${v.slice(0, 8)}…${v.slice(-4)}`;
}

function emit(entry: HttpErrorEntry) {
  for (const fn of listeners) {
    try { fn(entry); } catch { /* noop */ }
  }
}

function install() {
  if (installed || !shouldEnable()) return;
  installed = true;

  // ---- fetch ----
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const start = performance.now();
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const reqHeaders = pickHeaders(
      init?.headers as Headers | Record<string, string> | undefined ??
        (input instanceof Request ? input.headers : undefined),
      RELEVANT_REQ_HEADERS,
    );

    try {
      const res = await origFetch(input as RequestInfo, init);
      if (res.status >= 400) {
        const dur = Math.round(performance.now() - start);
        let bodyPreview: string | undefined;
        try {
          const clone = res.clone();
          const text = await clone.text();
          bodyPreview = text.slice(0, 500);
        } catch { /* noop */ }
        emit({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: new Date().toISOString(),
          method,
          url,
          status: res.status,
          statusText: res.statusText,
          durationMs: dur,
          requestId: res.headers.get('x-request-id') ?? undefined,
          reqHeaders,
          resHeaders: pickHeaders(res.headers, RELEVANT_RES_HEADERS),
          bodyPreview,
        });
      }
      return res;
    } catch (err) {
      const dur = Math.round(performance.now() - start);
      emit({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: new Date().toISOString(),
        method,
        url,
        status: 0,
        statusText: err instanceof Error ? err.message : 'Network Error',
        durationMs: dur,
        reqHeaders,
        resHeaders: {},
      });
      throw err;
    }
  };

  // ---- XHR ----
  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR(this: XMLHttpRequest) {
    const xhr = new OrigXHR();
    let _method = 'GET';
    let _url = '';
    let _start = 0;
    const _reqHeaders: Record<string, string> = {};

    const origOpen = xhr.open.bind(xhr);
    xhr.open = function (method: string, url: string | URL, ...rest: unknown[]) {
      _method = method.toUpperCase();
      _url = String(url);
      _start = performance.now();
      // @ts-expect-error — passthrough
      return origOpen(method, url, ...rest);
    };

    const origSetHeader = xhr.setRequestHeader.bind(xhr);
    xhr.setRequestHeader = function (name: string, value: string) {
      if (RELEVANT_REQ_HEADERS.includes(name.toLowerCase())) {
        _reqHeaders[name] = name.toLowerCase() === 'authorization' || name.toLowerCase() === 'apikey'
          ? maskSecret(value) : value;
      }
      return origSetHeader(name, value);
    };

    xhr.addEventListener('loadend', () => {
      if (xhr.status >= 400 || xhr.status === 0) {
        const resHeadersRaw = xhr.getAllResponseHeaders();
        const resHeaders: Record<string, string> = {};
        for (const line of resHeadersRaw.split(/\r?\n/)) {
          const idx = line.indexOf(':');
          if (idx < 0) continue;
          const k = line.slice(0, idx).trim().toLowerCase();
          const v = line.slice(idx + 1).trim();
          if (RELEVANT_RES_HEADERS.includes(k)) resHeaders[k] = v;
        }
        let bodyPreview: string | undefined;
        try {
          if (typeof xhr.responseText === 'string') bodyPreview = xhr.responseText.slice(0, 500);
        } catch { /* noop */ }
        emit({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: new Date().toISOString(),
          method: _method,
          url: _url,
          status: xhr.status,
          statusText: xhr.statusText || 'Network Error',
          durationMs: Math.round(performance.now() - _start),
          requestId: resHeaders['x-request-id'],
          reqHeaders: _reqHeaders,
          resHeaders,
          bodyPreview,
        });
      }
    });

    return xhr;
  }
  PatchedXHR.prototype = OrigXHR.prototype;
  // @ts-expect-error — replace global
  window.XMLHttpRequest = PatchedXHR;
}

export function HttpErrorOverlay() {
  const [enabled] = useState(shouldEnable);
  const [entries, setEntries] = useState<HttpErrorEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const onNew = useCallback((entry: HttpErrorEntry) => {
    if (seenRef.current.has(entry.id)) return;
    seenRef.current.add(entry.id);
    setEntries(prev => {
      const next = [entry, ...prev].slice(0, MAX);
      return next;
    });
    // Auto-open ao detectar 412 (foco do diagnóstico)
    if (entry.status === 412) setOpen(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    install();
    listeners.push(onNew);
    return () => { listeners = listeners.filter(l => l !== onNew); };
  }, [enabled, onNew]);

  if (!enabled) return null;

  const has412 = entries.some(e => e.status === 412);
  const errorCount = entries.length;

  const copyEntry = (e: HttpErrorEntry) => {
    void navigator.clipboard?.writeText(JSON.stringify(e, null, 2));
  };

  return (
    <div
      style={{
        position: 'fixed', bottom: 12, right: 12, zIndex: 2147483000,
        fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12,
      }}
    >
      {!open && errorCount > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: has412 ? '#dc2626' : '#ea580c', color: 'white',
            border: 'none', borderRadius: 999, padding: '8px 12px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)', cursor: 'pointer',
          }}
          title="Erros HTTP capturados"
        >
          <AlertCircle size={14} />
          <span>{errorCount} HTTP {has412 ? '· 412' : ''}</span>
        </button>
      )}

      {open && (
        <div
          style={{
            width: 460, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
            background: '#0b0b0f', color: '#e5e7eb', border: '1px solid #27272a',
            borderRadius: 10, boxShadow: '0 16px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', background: '#111114', borderBottom: '1px solid #27272a',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} color={has412 ? '#f87171' : '#fb923c'} />
              <strong style={{ fontSize: 12 }}>HTTP Errors ({errorCount})</strong>
              {has412 && <span style={{
                background: '#7f1d1d', color: '#fecaca',
                padding: '1px 6px', borderRadius: 4, fontSize: 10,
              }}>412 Precondition Failed</span>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => { setEntries([]); seenRef.current.clear(); }}
                title="Limpar" style={btn}><Trash2 size={12} /></button>
              <button type="button" onClick={() => setOpen(false)}
                title="Fechar" style={btn}><X size={12} /></button>
            </div>
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            {entries.length === 0 && (
              <div style={{ padding: 16, opacity: 0.6, textAlign: 'center' }}>
                Nenhum erro HTTP capturado.
              </div>
            )}
            {entries.map(e => {
              const isExpanded = expandedId === e.id;
              const color = e.status === 412 ? '#f87171'
                : e.status >= 500 ? '#fb7185'
                : e.status >= 400 ? '#fb923c'
                : '#94a3b8';
              return (
                <div key={e.id} style={{ borderBottom: '1px solid #1f1f23' }}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : e.id)}
                    style={{
                      display: 'flex', width: '100%', alignItems: 'center',
                      gap: 8, padding: '8px 10px', background: 'transparent',
                      color: 'inherit', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{
                      color, fontWeight: 700, minWidth: 32,
                    }}>{e.status || 'ERR'}</span>
                    <span style={{ minWidth: 42, opacity: 0.8 }}>{e.method}</span>
                    <span style={{
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{shortUrl(e.url)}</span>
                    <span style={{ opacity: 0.5 }}>{e.durationMs}ms</span>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '6px 12px 12px', background: '#0a0a0d', fontSize: 11 }}>
                      <Row label="URL" value={e.url} />
                      <Row label="Status" value={`${e.status} ${e.statusText}`} />
                      <Row label="When" value={e.ts} />
                      {e.requestId && <Row label="Request-Id" value={e.requestId} />}
                      <HeaderBlock title="Request headers" headers={e.reqHeaders} />
                      <HeaderBlock title="Response headers" headers={e.resHeaders} />
                      {e.bodyPreview && (
                        <>
                          <div style={hdr}>Body preview</div>
                          <pre style={pre}>{e.bodyPreview}</pre>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => copyEntry(e)}
                        style={{ ...btn, marginTop: 6, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Copy size={11} /> Copiar JSON
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '2px 0', wordBreak: 'break-all' }}>
      <span style={{ opacity: 0.5, minWidth: 80 }}>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function HeaderBlock({ title, headers }: { title: string; headers: Record<string, string> }) {
  const keys = Object.keys(headers);
  if (keys.length === 0) return null;
  return (
    <>
      <div style={hdr}>{title}</div>
      <pre style={pre}>{keys.map(k => `${k}: ${headers[k]}`).join('\n')}</pre>
    </>
  );
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return `${u.pathname}${u.search}`;
  } catch { return url; }
}

const btn: React.CSSProperties = {
  background: '#1f1f23', color: '#e5e7eb', border: '1px solid #2a2a30',
  borderRadius: 6, padding: 4, cursor: 'pointer',
};
const hdr: React.CSSProperties = {
  marginTop: 8, marginBottom: 2, opacity: 0.6, fontSize: 10,
  textTransform: 'uppercase', letterSpacing: 0.5,
};
const pre: React.CSSProperties = {
  margin: 0, padding: 6, background: '#111114', border: '1px solid #1f1f23',
  borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11,
};
