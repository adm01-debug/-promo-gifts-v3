import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

const FIXED_NOW = new Date("2025-06-15T12:00:00.000Z").getTime();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

function daysAgo(days: number) {
  return new Date(FIXED_NOW - days * 86400000).toISOString();
}

describe("PriceFreshnessBadge", () => {
  it("renders inline variant with full label for fresh status", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="inline"
      />,
    );
    expect(screen.getByRole("status")).toHaveAccessibleName(/atualizado/i);
  });

  it("does NOT render compact variant when status is fresh", () => {
    const { container } = render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="compact"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders compact variant when status is aging", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(45)}
        thresholdDays={60}
        variant="compact"
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does NOT render icon-only variant when status is fresh", () => {
    const { container } = render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="icon-only"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders icon-only variant for stale and uses warning color", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(90)}
        thresholdDays={60}
        variant="icon-only"
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/amber-600/);
  });

  it("renders inline variant for unknown when alwaysShow is implicit (inline always shows)", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={null}
        thresholdDays={60}
        variant="inline"
      />,
    );
    expect(screen.getByRole("status")).toHaveAccessibleName(/indisponível/i);
  });

  it("forces compact render when alwaysShow=true even for fresh status", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="compact"
        alwaysShow
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
