import { describe, expect, it } from "vitest";
import {
  CHAT_NEAR_BOTTOM_PX,
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
