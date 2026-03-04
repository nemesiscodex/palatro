import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

function installLocationStub() {
  const locationStub = {
    ...window.location,
    assign: vi.fn(),
    href: "http://localhost/rooms/demo",
  };

  Object.defineProperty(window, "location", {
    configurable: true,
    value: locationStub,
  });
}

beforeEach(() => {
  installLocationStub();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});
