import { describe, expect, it } from "vitest";
import {
  CHAT_NEAR_BOTTOM_PX,
  bottomScrollTop,
  distanceFromBottom,
  isNearBottom,
  prefersReducedMotion,
  shouldStickToBottom,
} from "./chatScroll.js";

describe("chat auto-scroll-with-respect (P-DSP-31)", () => {
  it("near-bottom threshold is ~48px", () => {
    expect(CHAT_NEAR_BOTTOM_PX).toBe(48);
  });

  it("measures distance from the content bottom", () => {
    expect(distanceFromBottom({ scrollHeight: 1000, scrollTop: 800, clientHeight: 200 })).toBe(0);
    expect(distanceFromBottom({ scrollHeight: 1000, scrollTop: 700, clientHeight: 200 })).toBe(100);
  });

  it("sticks at the bottom and within the threshold, pauses when scrolled up", () => {
    const viewport = { scrollHeight: 1000, clientHeight: 200 };
    // Exactly at the bottom.
    expect(isNearBottom({ ...viewport, scrollTop: 800 })).toBe(true);
    // 48px up still counts as the bottom (threshold is inclusive).
    expect(isNearBottom({ ...viewport, scrollTop: 752 })).toBe(true);
    // 49px up is scrolled up - follow pauses.
    expect(isNearBottom({ ...viewport, scrollTop: 751 })).toBe(false);
    expect(shouldStickToBottom({ ...viewport, scrollTop: 751 })).toBe(false);
    expect(shouldStickToBottom({ ...viewport, scrollTop: 800 })).toBe(true);
  });

  it("honors a custom threshold", () => {
    const metrics = { scrollHeight: 1000, scrollTop: 700, clientHeight: 200 };
    expect(isNearBottom(metrics, 100)).toBe(true);
    expect(isNearBottom(metrics, 99)).toBe(false);
  });

  it("reduced-motion guard is safe off-DOM", () => {
    expect(typeof prefersReducedMotion()).toBe("boolean");
  });
});

describe("true-bottom snap for long messages (REQ-02)", () => {
  it("targets scrollHeight minus viewport, never raw scrollHeight", () => {
    expect(bottomScrollTop({ scrollHeight: 1000, scrollTop: 800, clientHeight: 200 })).toBe(800);
    expect(bottomScrollTop({ scrollHeight: 1000, scrollTop: 0, clientHeight: 200 })).toBe(800);
    expect(bottomScrollTop({ scrollHeight: 150, scrollTop: 0, clientHeight: 200 })).toBe(0);
  });

  it("reaches the true bottom for a long message", () => {
    // Long streamed message: content towers over the viewport.
    const long = { scrollHeight: 5000, scrollTop: 0, clientHeight: 200 };
    const target = bottomScrollTop(long);
    expect(target).toBe(4800);
    expect(distanceFromBottom({ ...long, scrollTop: target })).toBe(0);
    expect(isNearBottom({ ...long, scrollTop: target })).toBe(true);
  });

  it("reproduces the short-scroll: stale offset after in-place growth", () => {
    // Before growth the pane sat at the bottom; the delta grew the message
    // in place (same count) without re-sticking - the offset is now short.
    const stale = { scrollHeight: 5000, scrollTop: 800, clientHeight: 200 };
    expect(distanceFromBottom(stale)).toBe(4000);
    expect(isNearBottom(stale)).toBe(false);
    expect(bottomScrollTop(stale)).toBe(4800);
  });
});
