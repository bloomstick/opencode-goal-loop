import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SessionChat from "./SessionChat.js";
import type { ChatMessage } from "./SessionChat.js";

const sample: ChatMessage[] = [
  {
    id: "msg-1",
    sessionId: "ses-1",
    role: "user",
    text: "Refactor sessions to own one AbortController per session.",
    createdAt: "2026-10-07T00:01:00.000Z",
  },
  {
    id: "msg-2",
    sessionId: "ses-1",
    role: "assistant",
    text: "Done - the manager owns the seam.",
    reasoning: [{ id: "rsn-1", text: "Check client session signatures first." }],
    toolCalls: [{ id: "tool-1", name: "read src/lib/sessions.ts", input: "{}", status: "done" }],
    diffs: [
      {
        id: "diff-1",
        path: "src/lib/sessions.ts",
        diff: "--- a/src/lib/sessions.ts\n+++ b/src/lib/sessions.ts\n@@\n-abort\n+abortLocal",
      },
    ],
    createdAt: "2026-10-07T00:02:00.000Z",
  },
];

describe("SessionChat watch renderer", () => {
  it("collapses reasoning by default and shows it expanded", () => {
    const collapsed = renderToStaticMarkup(<SessionChat messages={sample} defaultCollapsed />);
    expect(collapsed).toContain("thoughts");
    expect(collapsed).not.toContain("Check client session signatures");
    expect(collapsed).toContain('data-testid="session-chat"');

    const expanded = renderToStaticMarkup(<SessionChat messages={sample} defaultCollapsed={false} />);
    expect(expanded).toContain("Check client session signatures");
  });

  it("renders tool-call rows and diff preview rows", () => {
    const html = renderToStaticMarkup(<SessionChat messages={sample} defaultCollapsed={false} />);
    expect(html).toContain("read src/lib/sessions.ts");
    expect(html).toContain("src/lib/sessions.ts");
    expect(html).toContain("abortLocal");
    expect(html).toContain('data-testid="diff-diff-1"');
  });

  it("shows the watch empty copy with no messages", () => {
    const html = renderToStaticMarkup(<SessionChat messages={[]} />);
    expect(html).toContain('data-testid="chat-empty"');
    expect(html).toContain("select a session");
  });

  it("source uses stable keys, never index keys for live rows", async () => {
    const { readFile } = await import("node:fs/promises");
    const chatSrc = await readFile(new URL("./SessionChat.tsx", import.meta.url), "utf8");
    expect(chatSrc).toMatch(/key=\{message\.id\}/);
    expect(chatSrc).toMatch(/key=\{block\.id\}/);
    expect(chatSrc).not.toMatch(/key=\{i\}/);
    expect(chatSrc).not.toMatch(/key=\{index\}/);
  });
});
