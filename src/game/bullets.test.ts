import { expect, it } from 'vitest';

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

it.each([false, true])('removes outgoing projectiles on all edges, enemy=%s', (enemy) => {
  const game = emptyGame();
  game.bullets = [
    { x: 1, y: 200, vx: -100, vy: 0 },
    { x: 959, y: 200, vx: 100, vy: 0 },
    { x: 200, y: 1, vx: 0, vy: -100 },
    { x: 200, y: 599, vx: 0, vy: 100 },
  ].map((body, n) => ({ ...body, id: 100 + n, radius: 2, life: 1, enemy }));
  stepGame(game, idle, 0.02);
  expect(game.bullets).toHaveLength(0);
});

it('does not let an enemy bullet hit the ship across the opposite edge', () => {
  const game = emptyGame();
  game.ship.x = 2;
  game.ship.y = 200;
  game.ship.invulnerable = 0;
  game.bullets.push({ id: 100, x: 958, y: 200, vx: 0, vy: 0, radius: 3, life: 1, enemy: true });
  stepGame(game, idle, 0.01);
  expect(game.lives).toBe(3);
});

it('does not create a player shot on the opposite edge when its muzzle is outside', () => {
  const game = emptyGame();
  game.ship.x = 959;
  game.ship.angle = 0;
  stepGame(game, { ...idle, fire: true }, 0.01);
  expect(game.bullets).toHaveLength(0);
});

it('cannot hit a rock through the opposite edge', () => {
  const game = emptyGame();
  game.asteroids.push({ id: 90, x: 2, y: 200, vx: 0, vy: 0, radius: 10, size: 1, angle: 0, spin: 0, shape: [1, 1, 1] });
  game.bullets.push({ id: 100, x: 958, y: 200, vx: 0, vy: 0, radius: 2, life: 1, enemy: false });
  stepGame(game, idle, 0.01);
  expect(game.score).toBe(0);
  expect(game.asteroids).toHaveLength(1);
});
