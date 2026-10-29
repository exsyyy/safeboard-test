import { expect, it } from 'vitest';

import { CONFIG } from './config';
import { createGame, stepGame } from './engine';

const idle = { left: false, right: false, thrust: false, fire: false };

it('keeps new waves clear of a ship across the wrapped edge', () => {
  const game = createGame(CONFIG, 13);
  game.asteroids = [];
  game.ufos = [];
  game.ufoTimer = 100;
  game.waveTimer = 0;
  game.ship.x = 2;
  game.ship.y = 300;
  game.ship.invulnerable = 0;
  stepGame(game, idle, 1 / 120);
  expect(game.wave).toBe(2);
  stepGame(game, idle, 1 / 120);
  expect(game.lives).toBe(3);
});

it('caps the asteroid population in late waves', () => {
  const game = createGame(CONFIG, 42);
  game.asteroids = [];
  game.ufoTimer = 100;
  game.waveTimer = 0;
  game.wave = 99;
  stepGame(game, idle, 1 / 120);
  expect(game.wave).toBe(100);
  expect(game.asteroids).toHaveLength(14);
  expect(game.asteroids.every((rock) => Math.hypot(rock.vx, rock.vy) <= 64 * 2.4)).toBe(true);
});
