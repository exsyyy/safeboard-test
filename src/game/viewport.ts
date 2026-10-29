import type { GameState } from './types';

/** Keep positions relative to the field while leaving sizes, speeds and progress intact. */
export function resizeWorld(state: GameState, width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  if (state.config.width === width && state.config.height === height) return;
  const shrinking = width < state.config.width || height < state.config.height;
  const xRatio = width / state.config.width;
  const yRatio = height / state.config.height;
  const bodies = [state.ship, ...state.asteroids, ...state.bullets, ...state.ufos, ...state.particles];
  bodies.forEach((body) => {
    body.x *= xRatio;
    body.y *= yRatio;
  });
  state.config = { ...state.config, width, height };
  // Resizing can bring formerly separated bodies together; give the player time to react.
  if (shrinking) state.ship.invulnerable = Math.max(state.ship.invulnerable, 1.5);
}
