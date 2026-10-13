/**
 * Chat auto-scroll-with-respect helpers (P-DSP-31, pure, browser-safe).
 *
 * The chat pane follows new streamed content to the bottom UNLESS the user
 * has scrolled up: "near bottom" (within `CHAT_NEAR_BOTTOM_PX`) counts as at
 * the bottom. No timers, no DOM access here - the component owns the refs.
 */

/** Distance from the bottom (px) that still counts as "at the bottom". */
export const CHAT_NEAR_BOTTOM_PX = 48;

export interface ChatScrollMetrics {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
}

/** Pixels between the viewport bottom and the content bottom (>= 0). */
export function distanceFromBottom(metrics: ChatScrollMetrics): number {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight;
}

/** True when the viewport sits within `threshold` px of the content bottom. */
export function isNearBottom(
  metrics: ChatScrollMetrics,
  threshold: number = CHAT_NEAR_BOTTOM_PX,
): boolean {
  return distanceFromBottom(metrics) <= threshold;
}

/** True when the pane should stick to the bottom on new content. */
export function shouldStickToBottom(
  metrics: ChatScrollMetrics,
  threshold: number = CHAT_NEAR_BOTTOM_PX,
): boolean {
  return isNearBottom(metrics, threshold);
}

/**
 * True-bottom scroll offset: the maximum `scrollTop` (content bottom flush
 * with the viewport bottom). Snapping to raw `scrollHeight` overshoots by
 * exactly one viewport, which some engines resolve short of the bottom on
 * long messages - always snap here instead.
 */
export function bottomScrollTop(metrics: ChatScrollMetrics): number {
  return Math.max(0, metrics.scrollHeight - metrics.clientHeight);
}

/** Reduced-motion guard for the smooth-scroll follow (SSR/jsdom safe). */
export function prefersReducedMotion(): boolean {
  try {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
