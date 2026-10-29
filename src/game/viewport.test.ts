import { expect, it } from 'vitest';

import { CONFIG } from './config';
import { createGame, stepGame } from './engine';
import { resizeWorld } from './viewport';

it('fills a wide view without stretching shapes or resetting the current game', () => {
  const game = createGame(CONFIG, 42);
  game.score = 350;
  game.lives = 2;
  game.ship.x = 240;
  game.ship.vx = 90;
  game.ship.weapon.heat = 60;
  const rock = game.asteroids[0];
  const originalRadius = rock.radius;
  const originalX = rock.x;
  resizeWorld(game, 1920, 600);
  expect(game.config.width).toBe(1920);
  expect(game.ship.x).toBe(480);
  expect(game.ship.vx).toBe(90);
  expect(rock.x).toBeCloseTo(originalX * 2);
  expect(rock.radius).toBe(originalRadius);
  expect(game.ship.weapon.heat).toBe(60);
  expect(game.score).toBe(350);
  expect(game.lives).toBe(2);
  expect(CONFIG.width).toBe(960);
});

it('ignores zero-sized views and restores relative positions on resize back', () => {
  const game = createGame(CONFIG, 42);
  game.ship.x = 240;
  resizeWorld(game, 1920, 600);
  resizeWorld(game, 0, 0);
  expect(game.config.width).toBe(1920);
  resizeWorld(game, 960, 600);
  expect(game.ship.x).toBe(240);
});

it('protects the ship from collisions introduced by narrowing the field', () => {
  const game = createGame(CONFIG, 42);
  game.ship.x = 480;
  game.ship.y = 300;
  game.ship.invulnerable = 0;
  game.asteroids = [{ ...game.asteroids[0], x: 570, y: 300, vx: 0, vy: 0, radius: 48 }];
  game.ufoTimer = 100;
  resizeWorld(game, 480, 600);
  stepGame(game, { left: false, right: false, thrust: false, fire: false }, 1 / 120);
  expect(game.lives).toBe(3);
  expect(game.ship.invulnerable).toBeGreaterThan(0);
});
