import { describe, expect, it, vi } from "vitest";

import {
  clearGuestToken,
  getGuestTokenStorageKey,
  readGuestToken,
  writeGuestToken,
} from "./room-session";

describe("room-session", () => {
  it("creates a stable storage key", () => {
    expect(getGuestTokenStorageKey("demo-room")).toBe("pointing-poker:guest-token:demo-room");
  });

  it("reads, writes, and clears guest tokens", () => {
    writeGuestToken("demo-room", "guest-123");
    expect(readGuestToken("demo-room")).toBe("guest-123");

    clearGuestToken("demo-room");
    expect(readGuestToken("demo-room")).toBeNull();
  });

  it("returns safe defaults when window is unavailable", async () => {
    const savedWindow = globalThis.window;

    vi.stubGlobal("window", undefined);
    expect(readGuestToken("demo-room")).toBeNull();
    expect(() => writeGuestToken("demo-room", "guest-123")).not.toThrow();
    expect(() => clearGuestToken("demo-room")).not.toThrow();

    vi.stubGlobal("window", savedWindow);
  });
});
