import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PointCardGrid from "./point-card-grid";

describe("PointCardGrid", () => {
  it("renders each card in the deck and highlights the selected value", () => {
    const { container } = render(
      <PointCardGrid deck={["1", "2", "3"]} selectedValue="2" onSelect={vi.fn()} />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(container.querySelectorAll(".ring-2")).toHaveLength(1);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("blocks selection when disabled", () => {
    const onSelect = vi.fn();

    render(<PointCardGrid deck={["1", "2"]} selectedValue={null} disabled onSelect={onSelect} />);

    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
