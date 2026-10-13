import { memo, useState } from "react";
import "./chat.css";

export type ChatRole = "user" | "assistant" | "system";
export type ToolStatus = "running" | "done" | "error";

export interface ReasoningBlock {
  id: string;
  text: string;
}

export interface ToolCallRow {
  id: string;
  name: string;
  input: string;
  status: ToolStatus;
}

export interface DiffPreview {
  id: string;
  path: string;
  diff: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  text: string;
  reasoning?: ReasoningBlock[];
  toolCalls?: ToolCallRow[];
  diffs?: DiffPreview[];
  createdAt: string;
}

export interface SessionChatProps {
  messages: ChatMessage[];
  /** Controlled theme; defaults to system via CSS media query. */
  theme?: "light" | "dark";
  /** Reasoning blocks start collapsed (default true). */
  defaultCollapsed?: boolean;
}

/**
 * Relative chat timestamp (display only): raw ISO stamps never
 * render as visible text - the `<time>` element shows the relative age and
 * carries the full ISO in its `title` hover attr. Pure (caller owns the
 * clock; no timers, no effects). Unparseable input renders a hyphen with
 * the raw value on hover, never the raw string as text.
 */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "-";
  const diffMs = nowMs - at;
  if (diffMs < 0) return "just now";
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "just now";
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute);
    return `${n}m ago`;
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour);
    return `${n}h ago`;
  }
  const n = Math.floor(diffMs / day);
  return `${n}d ago`;
}

function ReasoningBlockView({
  block,
  defaultCollapsed,
}: {
  block: ReasoningBlock;
  defaultCollapsed: boolean;
}): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div className="dsp-reasoning" data-testid={`reasoning-${block.id}`}>
      <button
        type="button"
        className="dsp-reasoning-toggle"
        aria-expanded={!collapsed}
        aria-controls={`reasoning-body-${block.id}`}
        onClick={() => setCollapsed((c) => !c)}
      >
        {collapsed ? "> thoughts" : "v thoughts"}
      </button>
      {!collapsed && (
        <div className="dsp-reasoning-body" id={`reasoning-body-${block.id}`}>
          {block.text}
        </div>
      )}
    </div>
  );
}

function ToolCallView({ call }: { call: ToolCallRow }): React.JSX.Element {
  return (
    <li
      className="dsp-tool"
      data-testid={`tool-${call.id}`}
      data-status={call.status}
    >
      <span
        className="dsp-dot dsp-dot-tool"
        data-status={call.status}
        aria-label={`tool ${call.status}`}
      />
      <code className="dsp-tool-name">{call.name}</code>
      <code className="dsp-tool-input">{call.input}</code>
    </li>
  );
}

export function DiffView({ diff }: { diff: DiffPreview }): React.JSX.Element {
  // Diff rows are expandable: expanded by default so existing
  // readers see the same content, collapsible via the toggle. Pure local
  // display state - no timers, no selection, no fetching.
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="dsp-diff" data-testid={`diff-${diff.id}`} data-expanded={String(expanded)}>
      <button
        type="button"
        className="dsp-diff-toggle"
        data-testid={`diff-toggle-${diff.id}`}
        aria-expanded={expanded}
        aria-controls={`diff-body-${diff.id}`}
        aria-label={`toggle diff ${diff.path}`}
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? "v" : ">"} <span className="dsp-diff-path">{diff.path}</span>
      </button>
      {expanded ? (
        <pre className="dsp-diff-body" id={`diff-body-${diff.id}`}>
          {diff.diff.split("\n").map((line) => {
            const cls =
              line.startsWith("+") && !line.startsWith("+++")
                ? "dsp-add"
                : line.startsWith("-") && !line.startsWith("---")
                  ? "dsp-del"
                  : "dsp-ctx";
            // Key is line content + position within this diff only; diff ids are
            // stable so rows never use array index across live messages.
            return (
              <span key={`${diff.id}:${cls}:${line}`} className={cls}>
                {line}
                {"\n"}
              </span>
            );
          })}
        </pre>
      ) : null}
    </div>
  );
}

const MessageRow = memo(function MessageRow({
  message,
  defaultCollapsed,
}: {
  message: ChatMessage;
  defaultCollapsed: boolean;
}): React.JSX.Element {
  return (
    <article
      className={`dsp-msg dsp-msg-${message.role}`}
      data-testid={`message-${message.id}`}
    >
      <header className="dsp-msg-head">
        <span className="dsp-role">{message.role}</span>
        <time className="dsp-time" title={message.createdAt} dateTime={message.createdAt}>
          {formatRelativeTime(message.createdAt)}
        </time>
      </header>
      <div className="dsp-msg-text">{message.text}</div>
      {message.reasoning?.map((block) => (
        <ReasoningBlockView
          key={block.id}
          block={block}
          defaultCollapsed={defaultCollapsed}
        />
      ))}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <ul className="dsp-tools">
          {message.toolCalls.map((call) => (
            <ToolCallView key={call.id} call={call} />
          ))}
        </ul>
      )}
      {message.diffs?.map((diff) => <DiffView key={diff.id} diff={diff} />)}
    </article>
  );
});

export default function SessionChat({
  messages,
  theme,
  defaultCollapsed = true,
}: SessionChatProps): React.JSX.Element {
  return (
    <section
      className="dsp-chat"
      data-testid="session-chat"
      {...(theme ? { "data-theme": theme } : {})}
    >
      {messages.length === 0 ? (
        <p data-testid="chat-empty" className="dsp-chat-empty">
          No messages yet - select a session to watch.
        </p>
      ) : null}
      {messages.map((message) => (
        // Stable live keys: message ids only, never array index.
        <MessageRow
          key={message.id}
          message={message}
          defaultCollapsed={defaultCollapsed}
        />
      ))}
    </section>
  );
}
