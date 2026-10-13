import { useCallback, useEffect, useRef, useState } from "react";
import SessionChat from "./components/SessionChat.js";
import type { ChatMessage } from "./components/SessionChat.js";
import ChatScroll from "./components/ChatScroll.js";
import { useLiveSession, sortChatChronological } from "./hooks/useLiveSession.js";
import { ensureClient } from "./lib/opencode.js";
import type { OpenCodeClient } from "./lib/opencode.js";
import { SessionManager } from "./lib/sessions.js";

type Theme = "light" | "dark";

interface WatchedSession {
  id: string;
  title: string;
}

function sessionIdOf(entry: unknown): string | null {
  if (entry === null || typeof entry !== "object") return null;
  const record = entry as { id?: unknown; sessionId?: unknown; sessionID?: unknown };
  if (typeof record.id === "string" && record.id) return record.id;
  if (typeof record.sessionId === "string" && record.sessionId) return record.sessionId;
  if (typeof record.sessionID === "string" && record.sessionID) return record.sessionID;
  return null;
}

function sessionTitleOf(entry: unknown, fallback: string): string {
  if (entry === null || typeof entry !== "object") return fallback;
  const record = entry as { title?: unknown };
  if (typeof record.title === "string" && record.title.trim()) return record.title.trim();
  return fallback;
}

function listEntriesOf(listResult: unknown): unknown[] {
  if (Array.isArray(listResult)) return listResult as unknown[];
  if (listResult !== null && typeof listResult === "object") {
    const data = (listResult as { data?: unknown }).data;
    if (Array.isArray(data)) return data as unknown[];
  }
  return [];
}

function messageTimeOf(record: Record<string, unknown>): string {
  const direct = record["createdAt"];
  if (typeof direct === "string" && direct) return direct;
  const created = record["created"];
  if (typeof created === "number" && Number.isFinite(created)) {
    return new Date(created).toISOString();
  }
  if (typeof created === "string" && created) return created;
  const time = record["time"];
  if (time !== null && typeof time === "object") {
    const nested = (time as { created?: unknown }).created;
    if (typeof nested === "number" && Number.isFinite(nested)) {
      return new Date(nested).toISOString();
    }
    if (typeof nested === "string" && nested) return nested;
  }
  return new Date().toISOString();
}

function messagesFromList(sessionID: string, listResult: unknown): ChatMessage[] {
  const raw = Array.isArray((listResult as { data?: unknown })?.data)
    ? ((listResult as { data?: unknown }).data as unknown[])
    : Array.isArray(listResult)
      ? (listResult as unknown[])
      : [];
  const out: ChatMessage[] = [];
  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== "object") return;
    const record = entry as Record<string, unknown>;
    const id =
      typeof record["id"] === "string" && record["id"]
        ? (record["id"] as string)
        : typeof record["messageID"] === "string" && record["messageID"]
          ? (record["messageID"] as string)
          : `${sessionID}:msg:${index}`;
    const kind = record["type"] ?? record["role"];
    const role: ChatMessage["role"] = kind === "user" ? "user" : "assistant";
    const content = Array.isArray(record["content"]) ? (record["content"] as unknown[]) : [];
    const texts: string[] = [];
    for (const part of content) {
      if (part === null || typeof part !== "object") continue;
      const p = part as { type?: unknown; text?: unknown };
      if (p.type === "text" && typeof p.text === "string" && p.text) texts.push(p.text);
    }
    const text = texts.join("");
    if (!text && role === "assistant") {
      // Keep empty assistant rows out: deltas will create them live.
      if (content.length > 0) return;
    }
    if (!text) {
      if (role !== "user") return;
    }
    out.push({
      id,
      sessionId: sessionID,
      role,
      text,
      createdAt: messageTimeOf(record),
    });
  });
  // Chronological (oldest top / newest bottom) regardless of payload order.
  return sortChatChronological(out);
}

/**
 * Letter-avatar badge text: first alphanumeric of the title, uppercased.
 * Pure display helper (no timers, no storage); "?" when nothing qualifies.
 */
export function sessionBadgeLetter(title: string): string {
  const hit = title.match(/[A-Za-z0-9]/);
  return hit && hit[0] ? hit[0].toUpperCase() : "?";
}

/**
 * Working signal (render-time only, no timers, no polling): a session
 * counts as working ONLY while its folded live messages hold at least one
 * tool call with status "running" (useLiveSession folds tool.called to
 * running and tool.success/tool.failed to done/error). session.list rows
 * carry no live status field (id/title/time only), so selection alone
 * never counts as working; unwatched sessions hold no messages and read
 * as idle. Pure.
 */
export function isSessionWorking(messages: ChatMessage[], sessionId: string | null): boolean {
  if (!sessionId) return false;
  return messages.some(
    (message) =>
      message.sessionId === sessionId &&
      (message.toolCalls ?? []).some((call) => call.status === "running"),
  );
}

export default function App(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>("light");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<WatchedSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionManager, setSessionManager] = useState<SessionManager | null>(null);
  const [liveClient, setLiveClient] = useState<OpenCodeClient | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const managerRef = useRef<SessionManager | null>(null);

  const loadSessions = useCallback(async (): Promise<void> => {
    const manager = managerRef.current;
    if (!manager) {
      setNote("Offline: no live session manager.");
      return;
    }
    setLoading(true);
    setNote(null);
    try {
      const listResult = await manager.list().catch(() => [] as unknown[]);
      const entries = listEntriesOf(listResult);
      const rows: WatchedSession[] = [];
      for (const entry of entries) {
        const id = sessionIdOf(entry);
        if (!id) continue;
        rows.push({ id, title: sessionTitleOf(entry, id) });
      }
      setSessions(rows);
      setNote(rows.length === 0 ? "No live sessions." : null);
    } catch (error) {
      setNote(`Session list failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { client } = await ensureClient();
        if (cancelled) return;
        const manager = new SessionManager(client);
        managerRef.current = manager;
        setLiveClient(client);
        setSessionManager(manager);
        setLive(true);
      } catch {
        if (!cancelled) setLive(false);
      }
    })();
    return () => {
      cancelled = true;
      managerRef.current?.disposeAll();
      managerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!live || !managerRef.current) return;
    void loadSessions();
  }, [live, loadSessions]);

  // Attended-only transcript: selecting nothing clears the pane and the
  // hook below stops the stream. Selecting a session clears first; the
  // fetch below then loads its messages once (demand-driven, no polling).
  // Real transcript load keyed off the live client (single fetch per select).
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    if (!liveClient) {
      setMessages([]);
      return;
    }
    const id = selectedId;
    let cancelled = false;
    setMessages([]);
    (async () => {
      try {
        const response = await liveClient.message.list({ sessionID: id });
        if (cancelled) return;
        setMessages(messagesFromList(id, response));
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, liveClient]);

  // Live wiring: one SSE subscription for the watched session only.
  // Null selection opens nothing; unmount/dispose stops the stream.
  useLiveSession({
    manager: sessionManager,
    client: liveClient,
    sessionId: selectedId,
    setMessages,
  });

  // Chronological display: oldest top / newest bottom even when live
  // deltas arrive out of order (sort is stable, so ties keep arrival order).
  const selectedMessages = selectedId
    ? sortChatChronological(messages.filter((m) => m.sessionId === selectedId))
    : [];
  const chatContentKey = selectedMessages.reduce((n, m) => n + m.text.length, 0);

  return (
    <main className="dsp-app dsp-shell" data-theme={theme} data-live={String(live)}>
      <header className="dsp-topbar" data-testid="topbar">
        <div className="dsp-brand">
          <span className="dsp-mark" aria-hidden="true" data-testid="topbar-mark" />
          <div className="dsp-brand-text">
            <h1>Watch</h1>
          </div>
        </div>
        <div className="dsp-topbar-controls">
          <span className="dsp-status" data-testid="service-status" data-live={String(live)}>
            {live ? "live" : "offline"}
          </span>
          <button
            type="button"
            className="dsp-btn-ghost"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            aria-label="toggle theme"
          >
            Theme: {theme}
          </button>{" "}
          <button
            type="button"
            className="dsp-btn-ghost"
            onClick={() => void loadSessions()}
            disabled={!live || loading}
            aria-label="reload sessions"
          >
            {loading ? "Loading..." : "Reload"}
          </button>
        </div>
      </header>
      <div className="dsp-body">
        <section aria-label="live sessions" data-testid="session-list-pane">
          <h2>Live sessions</h2>
          {sessions.length === 0 ? (
            <p data-testid="sessions-empty">No live sessions.</p>
          ) : (
            <ul className="dsp-sessions" data-testid="session-list">
              {sessions.map((session) => {
                const working = isSessionWorking(messages, session.id);
                return (
                  <li
                    key={session.id}
                    className="dsp-session-item"
                    data-testid={`session-${session.id}`}
                  >
                    <button
                      type="button"
                      className="dsp-session-select"
                      title={session.title}
                      aria-label={working ? `watch ${session.id} working` : `watch ${session.id}`}
                      aria-pressed={selectedId === session.id}
                      data-selected={String(selectedId === session.id)}
                      data-working={String(working)}
                      onClick={() =>
                        setSelectedId((current) => (current === session.id ? null : session.id))
                      }
                    >
                      <span
                        className="dsp-session-badge"
                        data-working={String(working)}
                        aria-hidden="true"
                      >
                        {working ? (
                          <span className="dsp-spinner" aria-hidden="true" />
                        ) : (
                          sessionBadgeLetter(session.title)
                        )}
                      </span>
                      <span className="dsp-session-title">{session.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {selectedId ? (
            <button
              type="button"
              className="dsp-btn-ghost"
              aria-label="clear selection"
              onClick={() => setSelectedId(null)}
            >
              Stop watching
            </button>
          ) : null}
          {note ? <p data-testid="watch-note">{note}</p> : null}
        </section>
        <section aria-label="watched chat" data-testid="watch-pane">
          <h2>Chat</h2>
          {selectedId ? (
            <ChatScroll
              followKey={selectedId}
              messageCount={selectedMessages.length}
              contentKey={chatContentKey}
            >
              <SessionChat messages={selectedMessages} theme={theme} />
            </ChatScroll>
          ) : (
            <p data-testid="watch-empty">Select a session to watch.</p>
          )}
        </section>
      </div>
    </main>
  );
}
