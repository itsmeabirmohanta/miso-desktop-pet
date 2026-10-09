import { describe, it, expect } from "vitest";
import { captureHotkey, hotkeyPattern } from "../src/shared/hotkey";
const event = {
  key: "b",
  code: "KeyB",
  ctrlKey: true,
  altKey: true,
  shiftKey: false,
  metaKey: false,
};
describe("custom hotkey capture", () => {
  it("captures physical letter keys with selected modifiers", () => {
    expect(captureHotkey(event)).toBe("Ctrl+Alt+B");
    expect(captureHotkey({ ...event, code: "KeyK", shiftKey: true })).toBe(
      "Ctrl+Alt+Shift+K",
    );
  });
  it("ignores bare keys and modifier-only presses", () => {
    expect(
      captureHotkey({ ...event, ctrlKey: false, altKey: false }),
    ).toBeUndefined();
    expect(
      captureHotkey({ ...event, key: "Control", code: "ControlLeft" }),
    ).toBeUndefined();
  });
  it("supports function, number and Space keys", () => {
    for (const [key, code, expected] of [
      ["F12", "F12", "Ctrl+Alt+F12"],
      ["2", "Digit2", "Ctrl+Alt+2"],
      [" ", "Space", "Ctrl+Alt+Space"],
    ]) {
      const combo = captureHotkey({ ...event, key, code });
      expect(combo).toBe(expected);
      expect(hotkeyPattern.test(combo!)).toBe(true);
    }
    expect(hotkeyPattern.test("Ctrl+Alt+Invalid")).toBe(false);
  });
});
