import { useEffect } from "react";
import type { ChatMessage } from "../components/SessionChat.js";
import type { OpenCodeClient } from "../lib/opencode.js";
import type { SessionManager } from "../lib/sessions.js";

export interface UseLiveSessionOptions {
  /** Live manager (owns the subscription abort via `subscriptionSignal`). */
  manager: SessionManager | null;
  /** Typed client for `event.subscribe()`. */
  client: OpenCodeClient | null;
  /** Session under watch; null/empty means no subscription (attended-only). */
  sessionId: string | null;
  /** Chat state setter (stable `setMessages` from `useState`). */
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

interface WireEvent {
  type: string;
  created?: number;
  data?: unknown;
}

interface EventData {
  sessionID?: unknown;
  assistantMessageID?: unknown;
  messageID?: unknown;
  ordinal?: unknown;
  id?: unknown;
  inboxID?: unknown;
  name?: unknown;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  text?: unknown;
  delta?: unknown;
  content?: unknown;
  item?: unknown;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function eventData(event: WireEvent): EventData {
  if (event.data !== null && typeof event.data === "object") {
    return event.data as EventData;
  }
  return {};
}

function createdISO(created: number | undefined): string {
  return typeof created === "number" && Number.isFinite(created)
    ? new Date(created).toISOString()
    : new Date().toISOString();
}

function stringifyInput(input: unknown): string {
  if (typeof input === "string") return input;
  if (input === undefined) return "";
  try {
    return JSON.stringify(input) ?? "";
  } catch {
    return String(input);
  }
}

function ensureAssistant(
  messages: ChatMessage[],
  sessionID: string,
  messageID: string,
  created: number | undefined,
): { list: ChatMessage[]; index: number } {
  const index = messages.findIndex((m) => m.id === messageID);
  if (index !== -1) return { list: messages, index };
  return {
    list: [
      ...messages,
      {
        id: messageID,
        sessionId: sessionID,
        role: "assistant",
        text: "",
        createdAt: createdISO(created),
      },
    ],
    index: messages.length,
  };
}

function setAssistant(
  messages: ChatMessage[],
  index: number,
  message: ChatMessage,
): ChatMessage[] {
  if (messages[index] === message) return messages;
  return messages.map((m, i) => (i === index ? message : m));
}

/**
 * Fold one watch event into chat state. Pure: unknown shapes are ignored and
 * untouched rows keep referential identity (memo-safe streaming). Only the
 * watched session folds; other sessions pass through untouched.
 */
export function applyWatchEvent(
  messages: ChatMessage[],
  event: WireEvent,
  watchedSessionId: string,
): ChatMessage[] {
  const data = eventData(event);
  const sessionID = asString(data.sessionID);
  if (!sessionID || sessionID !== watchedSessionId) return messages;
  const assistantID = asString(data.assistantMessageID) ?? asString(data.messageID);

  switch (event.type) {
    case "session.text.started": {
      if (!assistantID) return messages;
      return ensureAssistant(messages, sessionID, assistantID, event.created).list;
    }
    case "session.text.delta": {
      const delta = asString(data.delta);
      if (!assistantID || delta === null) return messages;
      const { list, index } = ensureAssistant(messages, sessionID, assistantID, event.created);
      const current = list[index];
      if (!current || !delta) return list;
      return setAssistant(list, index, { ...current, text: current.text + delta });
    }
    case "session.text.ended": {
      const text = asString(data.text);
      if (!assistantID || text === null) return messages;
      const { list, index } = ensureAssistant(messages, sessionID, assistantID, event.created);
      const current = list[index];
      if (!current || current.text) return list;
      return setAssistant(list, index, { ...current, text });
    }
    case "session.reasoning.delta": {
      const delta = asString(data.delta);
      if (!assistantID || delta === null) return messages;
      const ordinal = typeof data.ordinal === "number" ? data.ordinal : 0;
      const blockId = `${assistantID}:rsn:${ordinal}`;
      const { list, index } = ensureAssistant(messages, sessionID, assistantID, event.created);
      const current = list[index];
      if (!current) return list;
      const blocks = current.reasoning ?? [];
      const at = blocks.findIndex((b) => b.id === blockId);
      if (at === -1) {
        return setAssistant(list, index, {
          ...current,
          reasoning: [...blocks, { id: blockId, text: delta }],
        });
      }
      const block = blocks[at];
      if (!block || !delta) return list;
      const next = [...blocks];
      next[at] = { ...block, text: block.text + delta };
      return setAssistant(list, index, { ...current, reasoning: next });
    }
    case "session.tool.called": {
      const id = asString(data.id);
      if (!assistantID || !id) return messages;
      const { list, index } = ensureAssistant(messages, sessionID, assistantID, event.created);
      const current = list[index];
      if (!current) return list;
      const rows = current.toolCalls ?? [];
      if (rows.some((t) => t.id === id)) return list;
      const name = asString(data.name) ?? id;
      const input = data.input === undefined ? "" : stringifyInput(data.input);
      return setAssistant(list, index, {
        ...current,
        toolCalls: [...rows, { id, name, input, status: "running" }],
      });
    }
    case "session.tool.success":
    case "session.tool.failed": {
      const id = asString(data.id);
      if (!assistantID || !id) return messages;
      const { list, index } = ensureAssistant(messages, sessionID, assistantID, event.created);
      const current = list[index];
      if (!current) return list;
      const rows = current.toolCalls ?? [];
      const at = rows.findIndex((t) => t.id === id);
      if (at === -1) return list;
      const next = [...rows];
      const row = next[at];
      if (!row) return list;
      next[at] = { ...row, status: event.type === "session.tool.success" ? "done" : "error" };
      return setAssistant(list, index, { ...current, toolCalls: next });
    }
    case "session.message.content.updated": {
      const messageID = asString(data.messageID);
      const content = Array.isArray(data.content) ? data.content : null;
      if (!messageID || !content) return messages;
      const { list, index } = ensureAssistant(messages, sessionID, messageID, event.created);
      let current = list[index];
      if (!current) return list;
      const texts: string[] = [];
      for (const part of content) {
        if (part === null || typeof part !== "object") continue;
        const record = part as { type?: unknown; text?: unknown };
        if (record.type === "text" && typeof record.text === "string") {
          texts.push(record.text);
        }
      }
      const joined = texts.join("");
      if (joined && joined !== current.text) {
        current = { ...current, text: joined };
        return setAssistant(list, index, current);
      }
      return list;
    }
    case "session.inbox.enqueued": {
      const item =
        data.item !== null && typeof data.item === "object"
          ? (data.item as { type?: unknown; payload?: unknown })
          : null;
      if (item?.type !== "user") return messages;
      const payload =
        item.payload !== null && typeof item.payload === "object"
          ? (item.payload as { text?: unknown })
          : null;
      const text = asString(payload?.text);
      if (text === null) return messages;
      const inboxID = asString(data.inboxID) ?? `${sessionID}:inbox:${event.created ?? Date.now()}`;
      if (messages.some((m) => m.id === inboxID)) return messages;
      return [
        ...messages,
        { id: inboxID, sessionId: sessionID, role: "user", text, createdAt: createdISO(event.created) },
      ];
    }
    default:
      return messages;
  }
}

/**
 * useLiveSession (watch-only): the single SSE subscription in the repo.
 *
 * Opens one `client.event.subscribe()` stream for the watched session and
 * folds matching events into chat state via the pure `applyWatchEvent`.
 * Attended-only: a null/empty `sessionId` opens nothing, and cleanup
 * disposes the subscription key so nothing survives unmount or deselect.
 * No timers, no polling, no retries - breaking iteration ends the subscriber.
 */
export function useLiveSession({
  manager,
  client,
  sessionId,
  setMessages,
}: UseLiveSessionOptions): void {
  useEffect(() => {
    if (!manager || !client || !sessionId) return;
    const watched = sessionId;
    const signal = manager.subscriptionSignal("live-stream");
    let cancelled = false;
    (async () => {
      try {
        const stream = client.event.subscribe({ signal });
        for await (const event of stream) {
          if (cancelled || signal.aborted) break;
          const wire = event as unknown as WireEvent;
          if (!wire || typeof wire !== "object" || typeof wire.type !== "string") continue;
          setMessages((prev) => applyWatchEvent(prev, wire, watched));
        }
      } catch {
        // Abort (cleanup/dispose) ends the subscriber; transport errors stay
        // silent here - the list + transcript remain visible.
      }
    })();
    return () => {
      cancelled = true;
      manager.dispose("live-stream");
    };
  }, [manager, client, sessionId, setMessages]);
}

export default useLiveSession;
