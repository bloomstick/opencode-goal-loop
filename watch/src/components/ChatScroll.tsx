import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CHAT_NEAR_BOTTOM_PX,
  isNearBottom,
  prefersReducedMotion,
} from "../lib/chatScroll.js";
import "./chat.css";

export interface ChatScrollProps {
  /**
   * Follow key: the selected session id. Follow resumes at the bottom
   * whenever the selected session changes (same selection model - display
   * state only, never a second selection).
   */
  followKey: string;
  /** Message count: growth while following sticks; while paused it flags. */
  messageCount: number;
  /** The chat renderer (existing SessionChat, unchanged). */
  children: ReactNode;
}

/**
 * Auto-scroll with respect (P-DSP-31): follows new streamed content to the
 * bottom while the user sits near the bottom (~48px decides); PAUSES the
 * moment they scroll up, and surfaces a jump-to-latest affordance only when
 * new content arrived while paused (click snaps back and resumes follow).
 * Smooth scroll, instant under `prefers-reduced-motion`. Scroll events only
 * - no timers, no polling, no fetching. Lives outside SessionChat so the
 * P-DSP-16 effect-free pin on the renderer holds.
 */
export default function ChatScroll({
  followKey,
  messageCount,
  children,
}: ChatScrollProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [follow, setFollow] = useState(true);
  const [newWhilePaused, setNewWhilePaused] = useState(false);
  const countRef = useRef(messageCount);

  const snapToBottom = (smooth: boolean): void => {
    const el = scrollRef.current;
    if (!el) return;
    if (smooth && !prefersReducedMotion() && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  // New streamed content: stick when following, else flag for the jump button.
  useEffect(() => {
    if (messageCount > countRef.current) {
      if (follow) {
        snapToBottom(true);
      } else {
        setNewWhilePaused(true);
      }
    }
    countRef.current = messageCount;
  }, [messageCount, follow]);

  // Session switch (same selectedId model from the parent): resume follow.
  useEffect(() => {
    setFollow(true);
    setNewWhilePaused(false);
    countRef.current = messageCount;
    snapToBottom(false);
    // `messageCount` read here resets the arrival baseline on switch only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followKey]);

  const handleScroll = (): void => {
    const el = scrollRef.current;
    if (!el) return;
    const near = isNearBottom(
      { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop, clientHeight: el.clientHeight },
      CHAT_NEAR_BOTTOM_PX,
    );
    setFollow(near);
    if (near) setNewWhilePaused(false);
  };

  const jumpToLatest = (): void => {
    setFollow(true);
    setNewWhilePaused(false);
    snapToBottom(false);
  };

  return (
    <div className="dsp-chat-follow" data-testid="chat-follow" data-follow={String(follow)}>
      <div
        className="dsp-chat-scroll"
        data-testid="chat-scroll"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {children}
      </div>
      {!follow && newWhilePaused ? (
        <button
          type="button"
          className="dsp-btn dsp-btn-primary dsp-jump"
          data-testid="chat-jump-latest"
          aria-label="jump to latest"
          onClick={jumpToLatest}
        >
          Jump to latest
        </button>
      ) : null}
    </div>
  );
}
