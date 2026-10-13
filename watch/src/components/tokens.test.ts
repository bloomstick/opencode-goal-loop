import { readFile, readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// P-DSP-30 design-system pins: tokens.css is the single owner of every
// visual token, both themes define every token, and no color literal lives
// anywhere else. Visual-only: these tests read files, never render.

const COMPONENTS_DIR = new URL("./", import.meta.url);

async function readCss(name: string): Promise<string> {
  return readFile(new URL(name, COMPONENTS_DIR), "utf8");
}

/** `--dsp-*` names declared inside a `[data-theme="<t>"] { ... }` block. */
function tokensInThemeBlock(css: string, theme: "light" | "dark"): Set<string> {
  const block = css.match(new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
  expect(block, `[data-theme="${theme}"] block must exist in tokens.css`).toBeTruthy();
  const names = new Set<string>();
  for (const match of (block as RegExpMatchArray)[1].matchAll(/(--dsp-[a-z0-9-]+)\s*:/g)) {
    names.add(match[1] as string);
  }
  return names;
}

const REQUIRED_TOKENS = [
  // color: surfaces + text, both themes
  "--dsp-bg",
  "--dsp-surface",
  "--dsp-surface-2",
  "--dsp-fg",
  "--dsp-muted",
  "--dsp-border",
  "--dsp-code-bg",
  // color: the one amber accent
  "--dsp-accent",
  "--dsp-accent-soft",
  "--dsp-accent-ink",
  // color: semantics incl. dark-tuned diff red/green
  "--dsp-success",
  "--dsp-danger",
  "--dsp-warn",
  "--dsp-add",
  "--dsp-del",
  // status dots
  "--dsp-dot-running",
  "--dsp-dot-idle",
  "--dsp-dot-done",
  "--dsp-dot-error",
  "--dsp-dot-killed",
  // focus ring
  "--dsp-focus",
  "--dsp-focus-ring",
  // type scale
  "--dsp-fs-xs",
  "--dsp-fs-sm",
  "--dsp-fs-base",
  "--dsp-fs-lg",
  "--dsp-fs-title",
  // spacing scale
  "--dsp-sp-1",
  "--dsp-sp-2",
  "--dsp-sp-3",
  "--dsp-sp-4",
  "--dsp-sp-5",
  "--dsp-sp-6",
  // radius scale
  "--dsp-r-sm",
  "--dsp-r-md",
  "--dsp-r-lg",
  "--dsp-r-xl",
];

describe("design tokens (P-DSP-30)", () => {
  it("both themes define every token", async () => {
    const css = await readCss("tokens.css");
    for (const theme of ["light", "dark"] as const) {
      const names = tokensInThemeBlock(css, theme);
      for (const token of REQUIRED_TOKENS) {
        expect(names, `[data-theme="${theme}"] must define ${token}`).toContain(token);
      }
    }
  });

  it("no hex/rgb/hsl literals outside tokens.css", async () => {
    const offenders: string[] = [];
    const check = (file: string, src: string): void => {
      // Strip url(...) and comments so docs/anchors never false-positive.
      const clean = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      const colorLiteral = /(#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\()/;
      const match = clean.match(colorLiteral);
      if (match) offenders.push(`${file}: ${JSON.stringify(match[0])}`);
    };
    check("chat.css", await readCss("chat.css"));
    const entries = await readdir(COMPONENTS_DIR);
    for (const entry of entries) {
      if (!entry.endsWith(".tsx")) continue;
      check(entry, await readFile(new URL(entry, COMPONENTS_DIR), "utf8"));
    }
    check("App.tsx", await readFile(new URL("../App.tsx", COMPONENTS_DIR), "utf8"));
    check("main.tsx", await readFile(new URL("../main.tsx", COMPONENTS_DIR), "utf8"));
    expect(offenders).toEqual([]);
  });

  it("chat.css consumes only tokens that tokens.css owns", async () => {
    const tokens = await readCss("tokens.css");
    const owned = new Set<string>();
    for (const match of tokens.matchAll(/(--dsp-[a-z0-9-]+)\s*:/g)) {
      owned.add(match[1] as string);
    }
    const chat = await readCss("chat.css");
    const used = new Set<string>();
    for (const match of chat.matchAll(/var\(\s*(--dsp-[a-z0-9-]+)/g)) {
      used.add(match[1] as string);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const name of used) {
      expect(owned, `tokens.css must own ${name}`).toContain(name);
    }
  });

  it("focus-ring + reduced-motion CSS present", async () => {
    const tokens = await readCss("tokens.css");
    expect(tokens).toContain("--dsp-focus-ring");
    const chat = await readCss("chat.css");
    expect(chat).toContain(":focus-visible");
    expect(chat).toContain("prefers-reduced-motion");
  });

  it("type/spacing/radius scales present", async () => {
    const tokens = await readCss("tokens.css");
    for (const token of ["--dsp-fs-xs", "--dsp-fs-base", "--dsp-fs-title"]) {
      expect(tokens).toContain(token);
    }
    for (const token of ["--dsp-sp-1", "--dsp-sp-3", "--dsp-sp-6"]) {
      expect(tokens).toContain(token);
    }
    for (const token of ["--dsp-r-sm", "--dsp-r-md", "--dsp-r-xl"]) {
      expect(tokens).toContain(token);
    }
  });
});
