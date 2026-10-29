import { describe, expect, it } from 'vitest';

import { CONFIG } from './config';
import { createGame, stepGame } from './engine';

const idle = { left: false, right: false, thrust: false, fire: false };
function emptyGame() {
  const game = createGame(CONFIG, 42);
  game.asteroids = [];
  game.ufoTimer = 100;
  game.waveTimer = 100;
  return game;
}

describe('controllable ship', () => {
  it('limits the speed to 190 world units per second', () => {
    const game = emptyGame();
    for (let n = 0; n < 100; n += 1) stepGame(game, { ...idle, thrust: true }, 0.05);
    expect(Math.hypot(game.ship.vx, game.ship.vy)).toBeLessThanOrEqual(190.001);
  });
  it('brakes smoothly after releasing thrust instead of coasting forever', () => {
    const game = emptyGame();
    game.ship.vx = 180;
    for (let n = 0; n < 10; n += 1) stepGame(game, idle, 0.05);
    expect(game.ship.vx).toBeLessThan(80);
    expect(game.ship.vx).toBeGreaterThan(0);
  });
  it('uses frame-rate independent damping', () => {
    const a = emptyGame();
    const b = emptyGame();
    a.ship.vx = 180;
    b.ship.vx = 180;
    for (let n = 0; n < 10; n += 1) stepGame(a, idle, 0.1);
    for (let n = 0; n < 100; n += 1) stepGame(b, idle, 0.01);
    expect(a.ship.vx).toBeCloseTo(b.ship.vx, 6);
  });
});
