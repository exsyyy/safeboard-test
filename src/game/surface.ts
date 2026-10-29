/** CSS size and pixel density are independent from the fixed gameplay coordinates. */
export function canvasSize(width: number, height: number, pixelRatio: number) {
  const ratio = Math.max(1, Math.min(2, pixelRatio || 1));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}
