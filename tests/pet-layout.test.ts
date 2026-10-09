import { describe, it, expect } from "vitest";
import { petPlacement } from "../src/shared/pet-layout";
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
