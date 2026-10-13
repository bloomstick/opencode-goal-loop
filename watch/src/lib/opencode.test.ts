import { describe, expect, it } from "vitest";
import {
  authHeaders,
  endpointFromRegistration,
  normalizeServiceUrl,
} from "./opencode.js";

describe("normalizeServiceUrl", () => {
  it("maps the 0.0.0.0 registration host to loopback", () => {
    expect(normalizeServiceUrl("http://0.0.0.0:49374")).toBe("http://127.0.0.1:49374");
  });
  it("leaves loopback and hostnames untouched", () => {
    expect(normalizeServiceUrl("http://127.0.0.1:49374")).toBe("http://127.0.0.1:49374");
    expect(normalizeServiceUrl("http://localhost:49374")).toBe("http://localhost:49374");
  });
});

describe("endpointFromRegistration", () => {
  it("attaches basic auth when a password is registered", () => {
    expect(endpointFromRegistration({ url: "http://0.0.0.0:1", password: "s3cret" })).toEqual({
      url: "http://127.0.0.1:1",
      auth: { type: "basic", username: "opencode", password: "s3cret" },
    });
  });
  it("omits auth when no password is registered", () => {
    expect(endpointFromRegistration({ url: "http://127.0.0.1:1" })).toEqual({
      url: "http://127.0.0.1:1",
      auth: undefined,
    });
    expect(endpointFromRegistration({ url: "http://127.0.0.1:1", password: "" })).toEqual({
      url: "http://127.0.0.1:1",
      auth: undefined,
    });
  });
});

describe("authHeaders", () => {
  it("mints a Basic header and round-trips through base64", () => {
    const headers = authHeaders({
      url: "http://127.0.0.1:1",
      auth: { type: "basic", username: "opencode", password: "s3cret" },
    });
    expect(headers?.authorization).toBe(
      `Basic ${Buffer.from("opencode:s3cret", "utf8").toString("base64")}`,
    );
  });
  it("returns undefined without auth", () => {
    expect(authHeaders({ url: "http://127.0.0.1:1", auth: undefined })).toBeUndefined();
  });
});
