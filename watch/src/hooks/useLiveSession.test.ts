import { describe, expect, it } from "vitest";
import {
  applyWatchEvent,
  compareChatChronological,
  sortChatChronological,
} from "./useLiveSession.js";
import type { ChatMessage } from "../components/SessionChat.js";

function msg(id: string, createdAt: string, text = id): ChatMessage {
  return { id, sessionId: "ses-1", role: "assistant", text, createdAt };
}

function wire(type: string, data: unknown, created?: number): Parameters<typeof applyWatchEvent>[1] {
  return { type, data, ...(created === undefined ? {} : { created }) };
}

// REQ-01: chronological chat, oldest top / newest bottom, across live event
// sequences. Deltas append/update in place by stable message id.
describe("watch event folding keeps chronological order (REQ-01)", () => {
  it("sorts a newest-first payload oldest-top/newest-bottom", () => {
    const newestFirst = [
      msg("m-3", "2026-10-07T00:03:00.000Z"),
      msg("m-1", "2026-10-07T00:01:00.000Z"),
      msg("m-2", "2026-10-07T00:02:00.000Z"),
    ];
    expect(sortChatChronological(newestFirst).map((m) => m.id)).toEqual(["m-1", "m-2", "m-3"]);
    // Input untouched (no in-place mutation of state).
    expect(newestFirst[0]?.id).toBe("m-3");
  });

  it("pins order across a started/delta/ended event sequence", () => {
    let state: ChatMessage[] = [msg("m-1", "2026-10-07T00:01:00.000Z", "first")];
    // Live assistant turn arrives in three events, out of order with a
    // second turn starting before the first ends.
    state = applyWatchEvent(
      state,
      wire(
        "session.text.started",
        { sessionID: "ses-1", messageID: "m-3" },
        Date.parse("2026-10-07T00:03:00.000Z"),
      ),
      "ses-1",
    );
    state = applyWatchEvent(
      state,
      wire(
        "session.text.started",
        { sessionID: "ses-1", messageID: "m-2" },
        Date.parse("2026-10-07T00:02:00.000Z"),
      ),
      "ses-1",
    );
    state = applyWatchEvent(
      state,
      wire("session.text.delta", { sessionID: "ses-1", messageID: "m-3", delta: "third" }),
      "ses-1",
    );
    state = applyWatchEvent(
      state,
      wire("session.text.delta", { sessionID: "ses-1", messageID: "m-2", delta: "second" }),
      "ses-1",
    );
    state = applyWatchEvent(
      state,
      wire("session.text.ended", { sessionID: "ses-1", messageID: "m-2", text: "ignored-when-filled" }),
      "ses-1",
    );
    const ordered = sortChatChronological(state);
    expect(ordered.map((m) => m.id)).toEqual(["m-1", "m-2", "m-3"]);
    expect(ordered.map((m) => m.text)).toEqual(["first", "second", "third"]);
  });

  it("updates live rows in place by stable id, keeping others identical", () => {
    const before: ChatMessage[] = [
      msg("m-1", "2026-10-07T00:01:00.000Z", "first"),
      msg("m-2", "2026-10-07T00:02:00.000Z", ""),
    ];
    const after = applyWatchEvent(
      before,
      wire("session.text.delta", { sessionID: "ses-1", messageID: "m-2", delta: "live" }),
      "ses-1",
    );
    expect(after).not.toBe(before);
    expect(after[0]).toBe(before[0]);
    expect(after[1]?.text).toBe("live");
  });

  it("ignores other sessions and unknown shapes", () => {
    const before: ChatMessage[] = [msg("m-1", "2026-10-07T00:01:00.000Z")];
    expect(
      applyWatchEvent(
        before,
        wire("session.text.delta", { sessionID: "ses-9", messageID: "m-x", delta: "nope" }),
        "ses-1",
      ),
    ).toBe(before);
    expect(applyWatchEvent(before, wire("session.text.delta", {}, undefined), "ses-1")).toBe(before);
  });

  it("compares by instant, keeps ties stable, sinks unparseable stamps", () => {
    const a = msg("a", "2026-10-07T00:01:00.000Z");
    const b = msg("b", "2026-10-07T00:02:00.000Z");
    expect(compareChatChronological(a, b)).toBeLessThan(0);
    expect(compareChatChronological(b, a)).toBeGreaterThan(0);
    expect(compareChatChronological(a, { ...a, id: "a2" })).toBe(0);
    const bad = msg("bad", "not-a-time");
    expect(sortChatChronological([bad, b, a]).map((m) => m.id)).toEqual(["a", "b", "bad"]);
  });
});
