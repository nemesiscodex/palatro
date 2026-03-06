import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SoundSettingsProvider, useSoundSettings } from "./sound-settings";

function SoundSettingsProbe() {
  const { muted, toggleMuted } = useSoundSettings();

  return (
    <button type="button" onClick={toggleMuted}>
      {muted ? "muted" : "unmuted"}
    </button>
  );
}

describe("SoundSettingsProvider", () => {
  it("reads initial muted preference from localStorage", async () => {
    window.localStorage.setItem("palatro:sound-muted", "true");

    render(
      <SoundSettingsProvider>
        <SoundSettingsProbe />
      </SoundSettingsProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "muted" })).toBeInTheDocument();
    });
  });

  it("persists mute toggles to localStorage", async () => {
    window.localStorage.removeItem("palatro:sound-muted");

    render(
      <SoundSettingsProvider>
        <SoundSettingsProbe />
      </SoundSettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "unmuted" }));

    await waitFor(() => {
      expect(window.localStorage.getItem("palatro:sound-muted")).toBe("true");
    });
  });
});

