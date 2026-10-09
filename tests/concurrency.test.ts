import { it, expect } from "vitest";
import { mapLimited } from "../src/main/sync/concurrency";
it("limits active reads to two and returns results in input order", async () => {
  let active = 0,
    maximum = 0;
  const release: (() => void)[] = [];
  const started: number[] = [];
  const result = mapLimited([0, 1, 2, 3], 2, async (index) => {
    active++;
    maximum = Math.max(active, maximum);
    started.push(index);
    await new Promise<void>((resolve) => (release[index] = resolve));
    active--;
    return index;
  });
  expect(started).toEqual([0, 1]);
  release[1]();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(started).toEqual([0, 1, 2]);
  release[0]();
  await new Promise((resolve) => setTimeout(resolve, 0));
  release[2]();
  release[3]();
  expect(await result).toEqual([0, 1, 2, 3]);
  expect(maximum).toBe(2);
});
it("accepts empty input and rejects invalid concurrency", async () => {
  expect(await mapLimited([], 2, async (v) => v)).toEqual([]);
  await expect(mapLimited([1], 0, async (v) => v)).rejects.toThrow(
    "positive integer",
  );
});
