export function petPlacement(
  x: number,
  y: number,
  area: { x: number; y: number; width: number; height: number },
) {
  const clamp = (v: number, min: number, max: number) =>
    Math.round(Math.max(min, Math.min(v, Math.max(min, max))));
  const anchor = {
    x: clamp(x, area.x, area.x + area.width - 110),
    y: clamp(y, area.y, area.y + area.height - 125),
  };
  const window = {
    x: clamp(anchor.x - 135, area.x, area.x + area.width - 380),
    y: clamp(
      anchor.y - (anchor.y - area.y >= 290 ? 320 : 0),
      area.y,
      area.y + area.height - 440,
    ),
  };
  return {
    anchor,
    window,
    layout: {
      x: anchor.x - window.x,
      y: anchor.y - window.y,
      above: anchor.y - window.y >= 278,
    },
  };
}
