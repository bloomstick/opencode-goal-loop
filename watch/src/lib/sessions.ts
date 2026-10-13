import type { OpenCodeClient } from "./opencode.js";

/** Narrow aliases over the generated client shapes (client types stay canonical). */
type SessionApi = OpenCodeClient["session"];
export type SessionCreateInput = Parameters<SessionApi["create"]>[0];
export type SessionListInput = Parameters<SessionApi["list"]>[0];
export type SessionPromptExtra = Omit<Parameters<SessionApi["prompt"]>[0], "sessionID" | "text">;
export type SessionRecord = Awaited<ReturnType<SessionApi["create"]>>;
export type SessionListResult = Awaited<ReturnType<SessionApi["list"]>>;
export type SessionInterruptResult = Awaited<ReturnType<SessionApi["interrupt"]>>;

export interface CallOptions {
  /** Per-call signal; defaults to the session's abort controller signal. */
  signal?: AbortSignal;
}

/**
 * Session lifecycle manager (P-DSP-2).
 *
 * Owns exactly one seam: opencode `session.*` calls plus one AbortController
 * per session id. Demand-driven only - no timers, retries, or background work.
 * Call `disposeAll()` at ship so no handles survive the task.
 */
export class SessionManager {
  private readonly controllers = new Map<string, AbortController>();

  constructor(private readonly client: OpenCodeClient) {}

  private controllerFor(sessionID: string): AbortController {
    let controller = this.controllers.get(sessionID);
    if (!controller) {
      controller = new AbortController();
      this.controllers.set(sessionID, controller);
    }
    return controller;
  }

  private signalFor(sessionID: string, explicit?: AbortSignal): AbortSignal {
    return explicit ?? this.controllerFor(sessionID).signal;
  }

  /** Create a session and register its abort controller. */
  async create(input?: SessionCreateInput, options?: CallOptions): Promise<SessionRecord> {
    const session = await this.client.session.create(
      input,
      options?.signal ? { signal: options.signal } : undefined,
    );
    this.controllerFor(session.id);
    return session;
  }

  /** Fetch one session by id. */
  async get(sessionID: string, options?: CallOptions): Promise<SessionRecord> {
    return this.client.session.get(
      { sessionID },
      { signal: this.signalFor(sessionID, options?.signal) },
    );
  }

  /** List sessions (no session affinity; passthrough). */
  async list(input?: SessionListInput, options?: CallOptions): Promise<SessionListResult> {
    return this.client.session.list(
      input,
      options?.signal ? { signal: options.signal } : undefined,
    );
  }

  /** Delete a session server-side, then drop its local controller. */
  async remove(sessionID: string, options?: CallOptions): Promise<void> {
    try {
      await this.client.session.remove(
        { sessionID },
        { signal: this.signalFor(sessionID, options?.signal) },
      );
    } finally {
      this.dispose(sessionID);
    }
  }

  /** Alias for `remove` (scope wording: "delete session"). */
  async deleteSession(sessionID: string, options?: CallOptions): Promise<void> {
    return this.remove(sessionID, options);
  }

  /** Send a prompt; cancellable via this session's controller. */
  async prompt(
    sessionID: string,
    text: string,
    extra?: SessionPromptExtra,
    options?: CallOptions,
  ): Promise<Awaited<ReturnType<SessionApi["prompt"]>>> {
    return this.client.session.prompt(
      { sessionID, text, ...extra },
      { signal: this.signalFor(sessionID, options?.signal) },
    );
  }

  /**
   * Post a system-style note (P-DSP-29): `session.synthetic` - the landing
   * channel the planner hears about outcomes on. This is NOT a user prompt:
   * the note accumulates silently until the next press (no auto-ask follows).
   * Cancellable via this session's controller, like `prompt`.
   */
  async synthetic(
    sessionID: string,
    text: string,
    extra?: Omit<SessionPromptExtra, "files" | "agents" | "skills">,
    options?: CallOptions,
  ): Promise<Awaited<ReturnType<SessionApi["synthetic"]>>> {
    return this.client.session.synthetic(
      { sessionID, text, ...extra },
      { signal: this.signalFor(sessionID, options?.signal) },
    );
  }

  /**
   * Interrupt a session: abort in-flight local work first, swap in a fresh
   * controller, then tell the server to interrupt.
   */
  async interrupt(sessionID: string): Promise<SessionInterruptResult> {
    this.abortLocal(sessionID);
    this.controllers.set(sessionID, new AbortController());
    return this.client.session.interrupt({ sessionID });
  }

  /**
   * Server-side idle wait (P-DSP-11): one `session.wait` call, no polling.
   * The server holds the call until the session settles; the caller's abort
   * signal still cancels it, so `disposeAll()` keeps its quiet-ship meaning.
   */
  async waitForIdle(sessionID: string, options?: CallOptions): Promise<void> {
    await this.client.session.wait(
      { sessionID },
      { signal: this.signalFor(sessionID, options?.signal) },
    );
  }

  /**
   * Assistant-text transcript (P-DSP-11): `message.list` folded to assistant
   * `text` parts in order (UTF-8 passthrough, newest last). Unknown
   * message/part shapes are skipped so schema drift never breaks collection.
   * Demand-driven: one fetch, no timers, no polling.
   */
  async transcript(sessionID: string, options?: CallOptions): Promise<string> {
    const response = await this.client.message.list(
      { sessionID },
      { signal: this.signalFor(sessionID, options?.signal) },
    );
    const data = (response as { data?: unknown }).data;
    if (!Array.isArray(data)) return "";
    const chunks: string[] = [];
    for (const message of data) {
      if (message === null || typeof message !== "object") continue;
      const record = message as { type?: unknown; content?: unknown };
      if (record.type !== "assistant" || !Array.isArray(record.content)) continue;
      for (const part of record.content) {
        if (part === null || typeof part !== "object") continue;
        const text = part as { type?: unknown; text?: unknown };
        if (text.type === "text" && typeof text.text === "string" && text.text) {
          chunks.push(text.text);
        }
      }
    }
    return chunks.join("");
  }

  /** Abort in-flight calls for a session without contacting the server. */
  abortLocal(sessionID: string): boolean {
    const controller = this.controllers.get(sessionID);
    if (!controller || controller.signal.aborted) return false;
    controller.abort();
    return true;
  }

  /** Session ids with a live (un-aborted, undisposed) controller. */
  tracked(): string[] {
    return [...this.controllers.entries()]
      .filter(([, controller]) => !controller.signal.aborted)
      .map(([id]) => id);
  }

  /** Abort and forget one session's controller. */
  dispose(sessionID: string): void {
    const controller = this.controllers.get(sessionID);
    if (controller && !controller.signal.aborted) controller.abort();
    this.controllers.delete(sessionID);
  }

  /** Abort and forget every controller. Nothing survives the task. */
  disposeAll(): void {
    for (const id of [...this.controllers.keys()]) this.dispose(id);
  }

  /**
   * Signal for non-call work scoped to a key (e.g. the SSE subscription in
   * `src/hooks/useLiveSession.ts`). Creates the controller on demand; freed
   * by `dispose(key)` / `disposeAll()` like every other handle.
   */
  subscriptionSignal(key: string): AbortSignal {
    return this.controllerFor(key).signal;
  }
}
