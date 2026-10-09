export const hotkeyPattern =
  /^(?:(?:Ctrl|Alt|Shift|Super|CommandOrControl)\+)+(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Space)$/;
export function captureHotkey(
  event: Pick<
    KeyboardEvent,
    "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
  >,
): string | undefined {
  const modifiers = [
    event.ctrlKey ? "Ctrl" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : "",
    event.metaKey ? "Super" : "",
  ].filter(Boolean);
  const key = /^Key[A-Z]$/.test(event.code)
    ? event.code.slice(3)
    : /^Digit[0-9]$/.test(event.code)
      ? event.code.slice(5)
      : event.code === "Space"
        ? "Space"
        : /^F(?:[1-9]|1[0-9]|2[0-4])$/.test(event.key)
          ? event.key
          : undefined;
  if (!key || !modifiers.length) return;
  return [...modifiers, key].join("+");
}
