import { OpenCode } from "@opencode/client";
import { invoke } from "@tauri-apps/api/core";

export type OpenCodeClient = ReturnType<typeof OpenCode.make>;

export interface ServiceAuth {
  type: "basic";
  username: string;
  password: string;
}

export interface ServiceEndpoint {
  url: string;
  auth: ServiceAuth | undefined;
}

export interface EnsuredClient {
  endpoint: ServiceEndpoint;
  client: OpenCodeClient;
}

/** Raw registration as returned by the sidecar `opencode_service_endpoint`. */
export interface ServiceRegistration {
  url: string;
  password?: string;
}

/**
 * The service registers `http://0.0.0.0:<port>` (all interfaces); a WebView
 * cannot dial `0.0.0.0`, so map it to loopback. Anchored on `://` so only
 * the host position is rewritten.
 */
export function normalizeServiceUrl(url: string): string {
  return url.replace("://0.0.0.0", "://127.0.0.1");
}

function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Basic auth headers for an endpoint (browser-safe; no node Buffer). */
export function authHeaders(endpoint: ServiceEndpoint): Record<string, string> | undefined {
  if (endpoint.auth === undefined) return undefined;
  return {
    authorization: `Basic ${toBase64(`${endpoint.auth.username}:${endpoint.auth.password}`)}`,
  };
}

/** Map a sidecar registration to a normalized endpoint (pure, tested). */
export function endpointFromRegistration(reg: ServiceRegistration): ServiceEndpoint {
  return {
    url: normalizeServiceUrl(reg.url),
    auth:
      reg.password === undefined || reg.password === ""
        ? undefined
        : { type: "basic", username: "opencode", password: reg.password },
  };
}

/**
 * Browser-safe ensure: the sidecar reads the `opencode serve --service`
 * registration file (the `@opencode/client/service` module imports
 * `node:child_process`/`node:fs`, which Vite cannot bundle for the WebView),
 * then reachability is probed over HTTP. Throws when no service is
 * registered or reachable - callers fall back to fixtures. Demand-driven:
 * one read, one probe, no timers, no loops. The `read` seam is injectable
 * for tests; the default reads via the Tauri sidecar.
 */
export async function ensureClient(
  read: () => Promise<ServiceRegistration> = () =>
    invoke<ServiceRegistration>("opencode_service_endpoint"),
): Promise<EnsuredClient> {
  const endpoint = endpointFromRegistration(await read());
  const headers = authHeaders(endpoint);
  const client = OpenCode.make({
    baseUrl: endpoint.url,
    ...(headers ? { headers } : {}),
  });
  await client.server.info();
  return { endpoint, client };
}

/** Build a client for an explicit base URL (tests, non-default endpoints). */
export function makeClient(baseUrl: string, headers?: Record<string, string>): OpenCodeClient {
  return OpenCode.make({ baseUrl, ...(headers ? { headers } : {}) });
}

/** Probe: fetch server info. Throws on transport/auth failure. */
export async function probeServerInfo(client: OpenCodeClient): Promise<unknown> {
  return client.server.info();
}

export interface SmokeResult {
  /** Events observed before the abort fired (usually 0 on an idle server). */
  eventsSeen: number;
  /** True when the subscription ended via our AbortController, not a transport error. */
  abortedCleanly: boolean;
}

/**
 * 5s SSE smoke: subscribe to the live event stream, then abort.
 * No polling loops, no retries, no persisted handles - one controller, one break.
 */
export async function smokeSubscribe(
  client: OpenCodeClient,
  ms = 5000,
  onEvent?: (event: unknown) => void,
): Promise<SmokeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  let eventsSeen = 0;
  try {
    // Event subscriptions take subscriber-local cancellation only.
    const stream = client.event.subscribe({ signal: controller.signal });
    for await (const event of stream) {
      eventsSeen += 1;
      onEvent?.(event);
      if (controller.signal.aborted) break;
    }
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    clearTimeout(timer);
  }
  return { eventsSeen, abortedCleanly: controller.signal.aborted };
}
