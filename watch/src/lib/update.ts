// Watch self-update (WUPD): one-shot check, modal, install.
//
// One check at startup plus a manual button, an in-app modal when a newer
// `watch-v*` release exists, and Update that downloads the setup exe,
// stages it under the OS temp dir via the Tauri shell, launches it, and
// quits Watch. Offline or up-to-date stays silent on the automatic check.
// No intervals, no retries, no background persistence, no stored skips:
// Later dismisses for the session only (held in App state, never storage).

import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";

/** Releases API for this repo (no auth). Tags look like `watch-v0.1.3`. */
export const WATCH_RELEASES_URL =
  "https://api.github.com/repos/bloomstick/opencode-goal-loop/releases";

/** One-shot abort timeout per fetch (same pattern as opencode.ts smoke). */
export const UPDATE_FETCH_TIMEOUT_MS = 8000;

/** Numeric x.y.z triple parsed from a version string. */
export type SemTriple = [number, number, number];

export interface WatchReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface WatchRelease {
  tag: string;
  name: string;
  body: string;
  assets: WatchReleaseAsset[];
}

/** Raw release row as returned by the GitHub releases API. */
export interface RawRelease {
  tag_name?: unknown;
  name?: unknown;
  body?: unknown;
  assets?: unknown;
}

function tripleOf(parts: string[]): SemTriple | null {
  if (parts.length !== 3) return null;
  const nums: number[] = [];
  for (const part of parts) {
    if (!/^[0-9]+$/.test(part)) return null;
    nums.push(Number(part));
  }
  return [nums[0] as number, nums[1] as number, nums[2] as number];
}

/**
 * Parse a `watch-vX.Y.Z` tag to its semver triple. Non-watch tags and
 * malformed triples (wrong part count, non-numeric parts) return null.
 */
export function parseWatchTriple(tag: string): SemTriple | null {
  if (!tag.startsWith("watch-v")) return null;
  return tripleOf(tag.slice("watch-v".length).split("."));
}

/** Parse a local version like `0.1.3` (leading `v` tolerated). */
export function parseLocalTriple(version: string): SemTriple | null {
  const clean = version.startsWith("v") ? version.slice(1) : version;
  return tripleOf(clean.split("."));
}

/** Numeric triple compare: negative when a < b, positive when a > b. */
export function compareTriples(a: SemTriple, b: SemTriple): number {
  for (let i = 0; i < 3; i += 1) {
    const left = a[i] as number;
    const right = b[i] as number;
    if (left !== right) return left < right ? -1 : 1;
  }
  return 0;
}

/**
 * True when the release tag is strictly newer than the local version.
 * Either side malformed reads as not-newer (never prompts on garbage).
 */
export function isNewer(local: string, tag: string): boolean {
  const current = parseLocalTriple(local);
  const candidate = parseWatchTriple(tag);
  if (!current || !candidate) return false;
  return compareTriples(current, candidate) < 0;
}

/**
 * Pick the highest `watch-v*` release. Non-watch tags and malformed tags
 * are ignored. Null when no usable watch release exists.
 */
export function pickWatchRelease(releases: RawRelease[]): WatchRelease | null {
  let best: WatchRelease | null = null;
  let bestTriple: SemTriple | null = null;
  for (const release of releases) {
    if (release === null || typeof release !== "object") continue;
    const tag = release.tag_name;
    if (typeof tag !== "string") continue;
    const triple = parseWatchTriple(tag);
    if (!triple) continue;
    if (bestTriple && compareTriples(triple, bestTriple) <= 0) continue;
    bestTriple = triple;
    const assets: WatchReleaseAsset[] = [];
    if (Array.isArray(release.assets)) {
      for (const asset of release.assets) {
        if (asset === null || typeof asset !== "object") continue;
        const row = asset as { name?: unknown; browser_download_url?: unknown };
        if (typeof row.name !== "string") continue;
        if (typeof row.browser_download_url !== "string") continue;
        if (!row.browser_download_url) continue;
        assets.push({ name: row.name, browser_download_url: row.browser_download_url });
      }
    }
    best = {
      tag,
      name: typeof release.name === "string" ? release.name : tag,
      body: typeof release.body === "string" ? release.body : "",
      assets,
    };
  }
  return best;
}

/**
 * Windows installer pick rule (recorded): prefer an x64 `*-setup.exe`,
 * then any `*-setup.exe`, then any `.exe`, then an MSI (x64 first) only
 * when no exe exists. Null when the release carries no Windows installer.
 */
export function pickWindowsAsset(assets: WatchReleaseAsset[]): WatchReleaseAsset | null {
  const lower = (value: string): string => value.toLowerCase();
  const exes = assets.filter((asset) => lower(asset.name).endsWith(".exe"));
  const setups = exes.filter((asset) => lower(asset.name).includes("setup"));
  const x64First = (list: WatchReleaseAsset[]): WatchReleaseAsset | null => {
    if (list.length === 0) return null;
    const hit = list.find((asset) => /x64|x86_64|win64/i.test(asset.name));
    return hit ?? list[0] ?? null;
  };
  const setupPick = x64First(setups);
  if (setupPick) return setupPick;
  const exePick = x64First(exes);
  if (exePick) return exePick;
  const msis = assets.filter((asset) => lower(asset.name).endsWith(".msi"));
  return x64First(msis);
}

/**
 * Fetch with a one-shot abort timeout (the opencode.ts pattern: one
 * controller, one break, no retries). An outer signal aborts early too.
 */
export async function fetchWithTimeout(
  url: string,
  ms: number = UPDATE_FETCH_TIMEOUT_MS,
  outer?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onOuterAbort = (): void => controller.abort();
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener("abort", onOuterAbort, { once: true });
  }
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
    });
  } finally {
    clearTimeout(timer);
    if (outer) outer.removeEventListener("abort", onOuterAbort);
  }
}

/**
 * Fetch the releases API and return the newest usable `watch-v*` release.
 * Throws on transport/HTTP failure so callers choose silent vs. noted.
 */
export async function latestWatchRelease(signal?: AbortSignal): Promise<WatchRelease | null> {
  const response = await fetchWithTimeout(WATCH_RELEASES_URL, UPDATE_FETCH_TIMEOUT_MS, signal);
  if (!response.ok) throw new Error(`release check failed: HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return null;
  return pickWatchRelease(data as RawRelease[]);
}

/**
 * One-shot startup check: local version vs. newest watch release. Resolves
 * null when up-to-date, offline, or anything fails (auto-check stays
 * silent; the manual button uses latestWatchRelease directly for notes).
 */
export async function checkForWatchUpdate(signal?: AbortSignal): Promise<WatchRelease | null> {
  try {
    const current = await getVersion();
    const latest = await latestWatchRelease(signal);
    if (!latest) return null;
    return isNewer(current, latest.tag) ? latest : null;
  } catch {
    return null;
  }
}

/** Download a release asset URL to bytes (one fetch, one timeout). */
export async function downloadBytes(url: string, signal?: AbortSignal): Promise<Uint8Array> {
  const response = await fetchWithTimeout(url, UPDATE_FETCH_TIMEOUT_MS, signal);
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export interface InstallDeps {
  download?: (url: string) => Promise<Uint8Array>;
  stage?: (filename: string, bytes: number[]) => Promise<string>;
  launch?: (path: string) => Promise<unknown>;
}

/**
 * Update flow: pick the Windows installer, download it to bytes, stage it
 * under the OS temp dir via the Tauri shell, then launch it and quit Watch
 * (the launch command exits the process). Resolves the staged path when the
 * process survives (tests, launch stubbed); throws with a one-line message
 * otherwise. Seams are injectable for tests; production uses fetch/invoke.
 */
export async function installWatchUpdate(
  release: WatchRelease,
  deps?: InstallDeps,
): Promise<string> {
  const asset = pickWindowsAsset(release.assets);
  if (!asset) throw new Error(`no Windows installer asset in ${release.tag}`);
  const download = deps?.download ?? ((url: string) => downloadBytes(url));
  const stage =
    deps?.stage ??
    ((filename: string, bytes: number[]) =>
      invoke<string>("watch_stage_update", { filename, bytes }));
  const launch =
    deps?.launch ?? ((path: string) => invoke("watch_launch_installer", { path }));
  const bytes = await download(asset.browser_download_url);
  const staged = await stage(asset.name, Array.from(bytes));
  await launch(staged);
  return staged;
}
