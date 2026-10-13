import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  CHAT_NEAR_BOTTOM_PX,
  bottomScrollTop,
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
  /**
   * Rendered content size (chars). Live deltas grow message text in place
   * without changing `messageCount`; this key re-arms follow so a long
   * streaming message still reaches the true bottom. Defaults to
   * `messageCount` when omitted.
   */
  contentKey?: number;
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
 * P-DSP-16 effect-free pin on the renderer holds. Layout-timed so long
 * messages measure the true bottom after DOM commit, never short of it.
 */
export default function ChatScroll({
  followKey,
  messageCount,
  contentKey,
  children,
}: ChatScrollProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [follow, setFollow] = useState(true);
  const [newWhilePaused, setNewWhilePaused] = useState(false);
  const countRef = useRef(messageCount);
  const contentRef = useRef(contentKey ?? messageCount);

  const snapToBottom = (smooth: boolean): void => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = bottomScrollTop({
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
    });
    if (smooth && !prefersReducedMotion() && typeof el.scrollTo === "function") {
      el.scrollTo({ top: bottom, behavior: "smooth" });
    } else {
      el.scrollTop = bottom;
    }
  };

  // New streamed content: stick when following, else flag for the jump button.
  // Watches content size too: deltas append text in place (same count), and
  // a long message must still pull the pane to the true bottom.
  useLayoutEffect(() => {
    const size = contentKey ?? messageCount;
    if (messageCount > countRef.current || size > contentRef.current) {
      if (follow) {
        snapToBottom(true);
      } else {
        setNewWhilePaused(true);
      }
    }
    countRef.current = messageCount;
    contentRef.current = size;
  }, [messageCount, contentKey, follow]);

  // Session switch (same selectedId model from the parent): resume follow.
  useLayoutEffect(() => {
    setFollow(true);
    setNewWhilePaused(false);
    countRef.current = messageCount;
    contentRef.current = contentKey ?? messageCount;
    snapToBottom(false);
    // `messageCount`/`contentKey` read here reset the arrival baseline on
    // switch only.
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
