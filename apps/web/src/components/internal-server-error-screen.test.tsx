import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import InternalServerErrorScreen from "./internal-server-error-screen";

describe("InternalServerErrorScreen", () => {
  it("renders a static 500 fallback message", () => {
    render(<InternalServerErrorScreen />);

    expect(screen.getByText("Error 500")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Internal server error" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Oops! Something went wrong on our side. Please try again later.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go back home" })).toHaveAttribute("href", "/");
  });
});
