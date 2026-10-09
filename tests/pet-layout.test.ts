import { describe, it, expect } from "vitest";
import { petPlacement, workflowPlacement } from "../src/shared/pet-layout";
describe("centered workflow on different screens", () => {
  it.each([480, 600, 728, 768, 780, 1040])(
    "centers the popup and keeps the window and cat visible at height %i",
    (height) => {
      const area = { x: -1024, y: -200, width: 1024, height };
      const placement = workflowPlacement(area);
      expect(placement.window.y + placement.layout.popupCenter).toBe(
        area.y + height / 2,
      );
      expect(placement.window.y).toBeGreaterThanOrEqual(area.y);
      expect(placement.window.y + placement.window.height).toBeLessThanOrEqual(
        area.y + height,
      );
      expect(
        placement.layout.popupCenter + placement.layout.popupMaxHeight / 2,
      ).toBeLessThanOrEqual(placement.layout.y - 20);
      expect(
        placement.layout.popupCenter - placement.layout.popupMaxHeight / 2,
      ).toBeGreaterThanOrEqual(8);
      expect(placement.layout.y + 105).toBeLessThanOrEqual(
        placement.window.height,
      );
    },
  );
});
describe("free cat positioning", () => {
  const area = { x: 0, y: 0, width: 1920, height: 1040 };
  it("allows the cat at the top and opens its popup below", () => {
    const p = petPlacement(0, 0, area);
    expect(p.anchor).toEqual({ x: 0, y: 0 });
    expect(p.layout.above).toBe(false);
    expect(p.window.y + p.layout.y).toBe(0);
  });
  it("allows the bottom-right edge with popup above", () => {
    const p = petPlacement(1910, 1040, area);
    expect(p.anchor).toEqual({ x: 1810, y: 915 });
    expect(p.layout.above).toBe(true);
    expect(p.window.x + p.layout.x).toBe(p.anchor.x);
    expect(p.window.y + p.layout.y).toBe(p.anchor.y);
  });
  it("supports monitors with negative coordinates", () => {
    const p = petPlacement(-1900, -200, {
      x: -1920,
      y: -200,
      width: 1920,
      height: 1080,
    });
    expect(p.anchor).toEqual({ x: -1900, y: -200 });
    expect(p.layout.above).toBe(false);
    expect(p.window.x).toBe(-1920);
  });
  it("keeps the cat position stable while popup changes sides", () => {
    for (const y of [200, 289, 290, 400, 900]) {
      const p = petPlacement(500, y, area);
      expect(p.window.y + p.layout.y).toBe(y);
      expect(p.window.x + p.layout.x).toBe(500);
    }
  });
});
