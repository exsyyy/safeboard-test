/** Stable normalized positions keep the background calm while the field resizes. */
const STARS = Array.from({ length: 150 }, (_, n) => ({
  x: (n * 0.61803398875 + 0.137) % 1,
  y: (n * n * 0.7548776662 + 0.319) % 1,
  bright: n % 13 === 0,
  size: n % 19 === 0 ? 1.7 : 0.8,
}));

export function drawStarfield(ctx: CanvasRenderingContext2D, width: number, height: number) {
  STARS.forEach((star) => {
    const x = star.x * width;
    const y = star.y * height;
    ctx.fillStyle = star.bright ? '#c3d0df' : '#566273';
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
    if (star.bright) {
      ctx.fillStyle = '#8895a755';
      ctx.fillRect(x - 3.5, y - 0.35, 7, 0.7);
      ctx.fillRect(x - 0.35, y - 3.5, 0.7, 7);
    }
  });
}
