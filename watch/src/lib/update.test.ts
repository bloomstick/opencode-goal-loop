// WUPD unit tests: semver pick/compare, asset pick rule, fetch shaping,
// install flow seams, modal render/dismiss. No timers, no storage.
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";
import {
  checkForWatchUpdate,
  compareTriples,
  installWatchUpdate,
  isNewer,
  latestWatchRelease,
  parseLocalTriple,
  parseWatchTriple,
  pickWatchRelease,
  pickWindowsAsset,
} from "./update.js";
import type { WatchRelease } from "./update.js";
import { WatchUpdateModal } from "../App.js";

vi.mock("@tauri-apps/api/app", () => ({
  getVersion: vi.fn(async () => "0.1.3"),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

function asset(name: string, url = `https://example.com/${name}`): { name: string; browser_download_url: string } {
  return { name, browser_download_url: url };
}

function releaseOf(tag: string, body = "", assets: { name: string; browser_download_url: string }[] = []): WatchRelease {
  return { tag, name: tag, body, assets };
}

/** Walk a rendered element tree (no DOM needed). */
function elementsOf(node: ReactNode): ReactElement[] {
  const out: ReactElement[] = [];
  const visit = (current: ReactNode): void => {
    if (Array.isArray(current)) {
      for (const child of current) visit(child);
      return;
    }
    if (current !== null && typeof current === "object" && "props" in current) {
      const el = current as ReactElement;
      out.push(el);
      const props = el.props as { children?: ReactNode };
      if (props.children !== undefined) visit(props.children);
    }
  };
  visit(node);
  return out;
}

function buttonsOf(tree: ReactElement): ReactElement[] {
  return elementsOf(tree).filter((el) => el.type === "button");
}

describe("parseWatchTriple", () => {
  it("parses watch-v triples", () => {
    expect(parseWatchTriple("watch-v0.1.3")).toEqual([0, 1, 3]);
    expect(parseWatchTriple("watch-v10.20.30")).toEqual([10, 20, 30]);
  });
  it("ignores non-watch tags", () => {
    expect(parseWatchTriple("v0.1.3")).toBeNull();
    expect(parseWatchTriple("dispatch-v0.1.3")).toBeNull();
    expect(parseWatchTriple("watch-0.1.3")).toBeNull();
    expect(parseWatchTriple("")).toBeNull();
  });
  it("ignores malformed triples", () => {
    expect(parseWatchTriple("watch-v1.2")).toBeNull();
    expect(parseWatchTriple("watch-v1.2.3.4")).toBeNull();
    expect(parseWatchTriple("watch-v1.2.x")).toBeNull();
    expect(parseWatchTriple("watch-v")).toBeNull();
    expect(parseWatchTriple("watch-v1..3")).toBeNull();
  });
});

describe("parseLocalTriple / compareTriples / isNewer", () => {
  it("parses local versions with an optional v prefix", () => {
    expect(parseLocalTriple("0.1.3")).toEqual([0, 1, 3]);
    expect(parseLocalTriple("v0.1.3")).toEqual([0, 1, 3]);
    expect(parseLocalTriple("nope")).toBeNull();
  });
  it("compares numerically, not lexicographically", () => {
    expect(compareTriples([0, 1, 3], [0, 1, 10])).toBeLessThan(0);
    expect(compareTriples([0, 2, 0], [0, 10, 0])).toBeLessThan(0);
    expect(compareTriples([1, 0, 0], [0, 9, 9])).toBeGreaterThan(0);
    expect(compareTriples([0, 1, 3], [0, 1, 3])).toBe(0);
  });
  it("isNewer needs a strictly newer tag", () => {
    expect(isNewer("0.1.3", "watch-v0.1.4")).toBe(true);
    expect(isNewer("0.1.3", "watch-v0.2.0")).toBe(true);
    expect(isNewer("0.1.3", "watch-v1.0.0")).toBe(true);
    expect(isNewer("0.1.3", "watch-v0.1.3")).toBe(false);
    expect(isNewer("0.1.3", "watch-v0.1.2")).toBe(false);
    expect(isNewer("0.1.3", "watch-v0.1.10")).toBe(true);
  });
  it("isNewer stays false on malformed input", () => {
    expect(isNewer("0.1.3", "v0.2.0")).toBe(false);
    expect(isNewer("0.1.3", "watch-vbogus")).toBe(false);
    expect(isNewer("bogus", "watch-v0.2.0")).toBe(false);
  });
});

describe("pickWatchRelease", () => {
  it("picks the highest watch-v tag, ignoring others", () => {
    const best = pickWatchRelease([
      { tag_name: "v9.9.9" },
      { tag_name: "dispatch-v5.0.0" },
      { tag_name: "watch-vbogus" },
      { tag_name: "watch-v0.1" },
      { tag_name: "watch-v0.1.3", body: "old" },
      { tag_name: "watch-v0.2.0", body: "new" },
    ]);
    expect(best?.tag).toBe("watch-v0.2.0");
    expect(best?.body).toBe("new");
  });
  it("returns null when no usable watch release exists", () => {
    expect(pickWatchRelease([])).toBeNull();
    expect(pickWatchRelease([{ tag_name: "v1.0.0" }, { tag_name: "watch-vx" }])).toBeNull();
    expect(pickWatchRelease([{ tag_name: 42 }, {}])).toBeNull();
  });
  it("defaults missing body/name and keeps string assets only", () => {
    const best = pickWatchRelease([
      {
        tag_name: "watch-v0.2.0",
        assets: [
          { name: "Watch_0.2.0_x64-setup.exe", browser_download_url: "https://example.com/a.exe" },
          { name: "broken" },
          null,
        ],
      },
    ]);
    expect(best?.body).toBe("");
    expect(best?.name).toBe("watch-v0.2.0");
    expect(best?.assets).toEqual([
      { name: "Watch_0.2.0_x64-setup.exe", browser_download_url: "https://example.com/a.exe" },
    ]);
  });
});

describe("pickWindowsAsset rule", () => {
  it("prefers the x64 setup exe", () => {
    const picked = pickWindowsAsset([
      asset("Watch_0.2.0_x64_en-US.msi"),
      asset("Watch_0.2.0_x64-setup.exe"),
      asset("Watch_0.2.0_arm64-setup.exe"),
    ]);
    expect(picked?.name).toBe("Watch_0.2.0_x64-setup.exe");
  });
  it("takes any setup exe, then any exe, before MSI", () => {
    expect(pickWindowsAsset([asset("Watch-setup.exe"), asset("Watch.msi")])?.name).toBe(
      "Watch-setup.exe",
    );
    expect(pickWindowsAsset([asset("Watch_portable.exe"), asset("Watch.msi")])?.name).toBe(
      "Watch_portable.exe",
    );
  });
  it("falls back to MSI only when no exe exists", () => {
    expect(pickWindowsAsset([asset("Watch_0.2.0_x64_en-US.msi")])?.name).toBe(
      "Watch_0.2.0_x64_en-US.msi",
    );
    expect(pickWindowsAsset([asset("Watch.tar.gz")])).toBeNull();
    expect(pickWindowsAsset([])).toBeNull();
  });
});

describe("latestWatchRelease", () => {
  it("shapes the API payload to the newest watch release", async () => {
    const payload = [
      { tag_name: "v9.9.9", assets: [] },
      { tag_name: "watch-v0.1.3", body: "old", assets: [] },
      {
        tag_name: "watch-v0.2.0",
        body: "new",
        assets: [{ name: "Watch_0.2.0_x64-setup.exe", browser_download_url: "https://example.com/a.exe" }],
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => payload })),
    );
    const latest = await latestWatchRelease();
    expect(latest?.tag).toBe("watch-v0.2.0");
    expect(latest?.body).toBe("new");
  });
  it("throws on HTTP failure so callers choose silent vs. noted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => [] })),
    );
    await expect(latestWatchRelease()).rejects.toThrow("HTTP 500");
  });
});

describe("checkForWatchUpdate", () => {
  it("resolves the release when newer, null when current", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => [{ tag_name: "watch-v0.2.0", assets: [] }],
      })),
    );
    expect((await checkForWatchUpdate())?.tag).toBe("watch-v0.2.0");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => [{ tag_name: "watch-v0.1.3", assets: [] }],
      })),
    );
    expect(await checkForWatchUpdate()).toBeNull();
  });
  it("stays silent (null) when offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect(await checkForWatchUpdate()).toBeNull();
  });
});

describe("installWatchUpdate", () => {
  it("downloads the picked asset, stages it, launches it", async () => {
    const release = releaseOf("watch-v0.2.0", "notes", [
      asset("Watch_0.2.0_x64_en-US.msi", "https://example.com/a.msi"),
      asset("Watch_0.2.0_x64-setup.exe", "https://example.com/a.exe"),
    ]);
    const download = vi.fn(async (_url: string) => new Uint8Array([1, 2, 3]));
    const stage = vi.fn(async (filename: string, _bytes: number[]) => `C:\\Temp\\${filename}`);
    const launch = vi.fn(async (_path: string) => undefined);
    const staged = await installWatchUpdate(release, { download, stage, launch });
    expect(download).toHaveBeenCalledWith("https://example.com/a.exe");
    expect(stage).toHaveBeenCalledWith("Watch_0.2.0_x64-setup.exe", [1, 2, 3]);
    expect(launch).toHaveBeenCalledWith("C:\\Temp\\Watch_0.2.0_x64-setup.exe");
    expect(staged).toBe("C:\\Temp\\Watch_0.2.0_x64-setup.exe");
  });
  it("throws a one-liner when no Windows installer exists", async () => {
    await expect(installWatchUpdate(releaseOf("watch-v0.2.0", "", [asset("Watch.tar.gz")]))).rejects.toThrow(
      "no Windows installer asset in watch-v0.2.0",
    );
  });
});

describe("WatchUpdateModal render", () => {
  function propsOf(overrides: Partial<Parameters<typeof WatchUpdateModal>[0]> = {}) {
    return {
      release: releaseOf("watch-v0.2.0", "Shiny fixes."),
      updating: false,
      error: null as string | null,
      updateRef: null,
      onUpdate: () => {},
      onLater: () => {},
      ...overrides,
    };
  }
  it("renders dialog semantics, version, notes, and both buttons", () => {
    const html = renderToStaticMarkup(WatchUpdateModal(propsOf()));
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="watch-update-title"');
    expect(html).toContain('id="watch-update-title"');
    expect(html).toContain("watch-v0.2.0");
    expect(html).toContain("Shiny fixes.");
    expect(html).toContain("Update");
    expect(html).toContain("Later");
  });
  it("renders notes as plain text, never HTML", () => {
    const html = renderToStaticMarkup(
      WatchUpdateModal(propsOf({ release: releaseOf("watch-v0.2.0", '<b>bold</b> & "quotes"') })),
    );
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });
  it("shows the updating state and errors", () => {
    const busy = renderToStaticMarkup(WatchUpdateModal(propsOf({ updating: true })));
    expect(busy).toContain("Updating...");
    expect(busy).toContain("disabled");
    const failed = renderToStaticMarkup(WatchUpdateModal(propsOf({ error: "download failed" })));
    expect(failed).toContain("download failed");
  });
});

describe("WatchUpdateModal dismiss", () => {
  it("Later click calls onLater", () => {
    const onLater = vi.fn();
    const onUpdate = vi.fn();
    const tree = WatchUpdateModal({
      release: releaseOf("watch-v0.2.0"),
      updating: false,
      error: null,
      updateRef: null,
      onUpdate,
      onLater,
    });
    const later = buttonsOf(tree).find((button) => {
      const props = button.props as { children?: ReactNode };
      return props.children === "Later";
    });
    expect(later).toBeTruthy();
    (later?.props as { onClick: () => void }).onClick();
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });
  it("Update click calls onUpdate", () => {
    const onLater = vi.fn();
    const onUpdate = vi.fn();
    const tree = WatchUpdateModal({
      release: releaseOf("watch-v0.2.0"),
      updating: false,
      error: null,
      updateRef: null,
      onUpdate,
      onLater,
    });
    const apply = buttonsOf(tree).find((button) => {
      const props = button.props as { children?: ReactNode };
      return props.children === "Update";
    });
    expect(apply).toBeTruthy();
    (apply?.props as { onClick: () => void }).onClick();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onLater).not.toHaveBeenCalled();
  });
  it("Escape dismisses, other keys do not", () => {
    const onLater = vi.fn();
    const tree = WatchUpdateModal({
      release: releaseOf("watch-v0.2.0"),
      updating: false,
      error: null,
      updateRef: null,
      onUpdate: () => {},
      onLater,
    });
    const keyed = elementsOf(tree).find((el) => {
      const props = el.props as { onKeyDown?: unknown };
      return typeof props.onKeyDown === "function";
    });
    expect(keyed).toBeTruthy();
    const onKeyDown = (keyed?.props as { onKeyDown: (event: { key: string }) => void }).onKeyDown;
    onKeyDown({ key: "Enter" });
    expect(onLater).not.toHaveBeenCalled();
    onKeyDown({ key: "Escape" });
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});
