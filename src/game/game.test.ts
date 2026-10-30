import { describe, expect, it } from 'vitest';

import { CONFIG } from './config';
import { createGame, stepGame } from './engine';
import { createInput } from './input';
import { fireWeapon, coolWeapon } from './weapon';

const idle = { left: false, right: false, thrust: false, fire: false };
function emptyGame() {
  const game = createGame(CONFIG, 42);
  game.asteroids = [];
  game.ufoTimer = 100;
  game.waveTimer = 100;
  return game;
}

describe('ship and simulation', () => {
  it('starts reproducibly with three lives and large asteroids', () => {
    const a = createGame(CONFIG, 42);
    expect(a).toEqual(createGame(CONFIG, 42));
    expect(a.lives).toBe(3);
    expect(a.asteroids.length).toBe(4);
    expect(a.asteroids.every((rock) => rock.size === 3)).toBe(true);
  });
  it('accelerates, rotates and retains inertia without thrust', () => {
    const game = emptyGame();
    const { angle } = game.ship;
    stepGame(game, { ...idle, thrust: true, right: true }, 0.1);
    expect(game.ship.angle).toBeGreaterThan(angle);
    expect(Math.hypot(game.ship.vx, game.ship.vy)).toBeGreaterThan(0);
    const { y } = game.ship;
    stepGame(game, idle, 0.1);
    expect(game.ship.y).not.toBe(y);
  });
  it('wraps through edges and caps long frame delays', () => {
    const game = emptyGame();
    game.ship.x = 959;
    game.ship.vx = 100;
    stepGame(game, idle, 0.1);
    expect(game.ship.x).toBeLessThan(20);
    const before = game.time;
    stepGame(game, idle, 50);
    expect(game.time - before).toBeCloseTo(0.1);
  });
  it('expires projectiles and ignores game-over frames', () => {
    const game = emptyGame();
    game.bullets.push({ id: 999, x: 10, y: 10, vx: 0, vy: 0, radius: 2, life: 0.01, enemy: false });
    stepGame(game, idle, 0.02);
    expect(game.bullets).toHaveLength(0);
    game.status = 'gameover';
    const snapshot = JSON.stringify(game);
    stepGame(game, { ...idle, fire: true }, 0.1);
    expect(JSON.stringify(game)).toBe(snapshot);
  });
});

describe('weapon heat', () => {
  it('allows the last shot then blocks the eleventh without adding heat', () => {
    const weapon = { heat: 0, locked: false, cooldown: 0 };
    for (let n = 0; n < 10; n += 1) {
      weapon.cooldown = 0;
      expect(fireWeapon(weapon, CONFIG)).toBe(true);
    }
    expect(weapon.heat).toBe(100);
    expect(weapon.locked).toBe(true);
    weapon.cooldown = 0;
    expect(fireWeapon(weapon, CONFIG)).toBe(false);
    expect(weapon.heat).toBe(100);
  });
  it('unlocks at thirty and cools independently of frame subdivision', () => {
    const a = { heat: 100, locked: true, cooldown: 0 };
    const b = { ...a };
    coolWeapon(a, CONFIG, 3.5);
    for (let n = 0; n < 350; n += 1) coolWeapon(b, CONFIG, 0.01);
    expect(a.heat).toBeCloseTo(b.heat);
    expect(a.locked).toBe(false);
    expect(b.locked).toBe(false);
    coolWeapon(a, CONFIG, 100);
    expect(a.heat).toBe(0);
  });
  it('does not block rotation or thrust', () => {
    const game = emptyGame();
    game.ship.weapon = { heat: 100, locked: true, cooldown: 0 };
    stepGame(game, { ...idle, left: true, thrust: true, fire: true }, 0.1);
    expect(game.ship.angle).toBeLessThan(-Math.PI / 2);
    expect(Math.hypot(game.ship.vx, game.ship.vy)).toBeGreaterThan(0);
    expect(game.bullets).toHaveLength(0);
  });
});

describe('collisions and progression', () => {
  it.each([3, 2, 1] as const)('splits size %s correctly and scores only once', (size) => {
    const game = emptyGame();
    game.asteroids.push({
      id: 800,
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 10,
      size,
      angle: 0,
      spin: 0,
      shape: [1, 1, 1],
    });
    for (let n = 0; n < 2; n += 1)
      game.bullets.push({ id: 900 + n, x: 100, y: 100, vx: 0, vy: 0, radius: 2, life: 1, enemy: false });
    stepGame(game, idle, 0.01);
    expect(game.score).toBe(CONFIG.rockScores[size]);
    expect(game.asteroids).toHaveLength(size === 1 ? 0 : 2);
    expect(game.asteroids.every((rock) => rock.size === size - 1)).toBe(true);
  });
  it('loses at most one life per step and respawns protected', () => {
    const game = emptyGame();
    game.ship.invulnerable = 0;
    for (let n = 0; n < 2; n += 1)
      game.bullets.push({ id: 900 + n, x: game.ship.x, y: game.ship.y, vx: 0, vy: 0, radius: 2, life: 1, enemy: true });
    stepGame(game, idle, 0.01);
    expect(game.lives).toBe(2);
    expect(game.ship.invulnerable).toBeGreaterThan(0);
    stepGame(game, idle, 0.01);
    expect(game.lives).toBe(2);
  });
  it('detects collisions across the wrapped seam', () => {
    const game = emptyGame();
    game.ship.x = 2;
    game.ship.y = 100;
    game.ship.invulnerable = 0;
    game.asteroids.push({
      id: 800,
      x: 958,
      y: 100,
      vx: 0,
      vy: 0,
      radius: 12,
      size: 1,
      angle: 0,
      spin: 0,
      shape: [1, 1, 1],
    });
    stepGame(game, idle, 0.01);
    expect(game.lives).toBe(2);
  });
  it('spawns a firing saucer and removes it when its lifetime ends', () => {
    const game = emptyGame();
    game.ufoTimer = 0;
    stepGame(game, idle, 0.01);
    expect(game.ufos).toHaveLength(1);
    game.ufos[0].fireTimer = 0;
    stepGame(game, idle, 0.01);
    expect(game.bullets.some((bullet) => bullet.enemy)).toBe(true);
    game.ufos[0].life = 0;
    stepGame(game, idle, 0.01);
    expect(game.ufos).toHaveLength(0);
  });
  it('scores a saucer kill and advances waves without waiting for saucers', () => {
    const game = emptyGame();
    game.ufoTimer = 0;
    stepGame(game, idle, 0.01);
    const ufo = game.ufos[0];
    ufo.vx = 0;
    game.bullets.push({ id: 900, x: ufo.x, y: ufo.y, vx: 0, vy: 0, radius: 2, life: 1, enemy: false });
    stepGame(game, idle, 0.01);
    expect(game.ufos).toHaveLength(0);
    expect(game.score).toBe(ufo.small ? 1000 : 200);
    game.waveTimer = 0;
    stepGame(game, idle, 0.01);
    expect(game.wave).toBe(2);
    expect(game.asteroids.length).toBe(5);
  });
});

describe('input sources', () => {
  it('keeps keyboard and simultaneous pointer actions independent', () => {
    const input = createInput();
    input.set('key-up', 'thrust', true);
    input.set('pointer-1', 'fire', true);
    input.set('pointer-2', 'left', true);
    expect(input.read()).toEqual({ ...idle, thrust: true, fire: true, left: true });
    input.set('key-space', 'fire', true);
    input.release('pointer-1');
    expect(input.read().fire).toBe(true);
    input.reset();
    expect(input.read()).toEqual(idle);
  });
});

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

it('ends the game when the last life is lost', () => {
  const game = emptyGame();
  game.lives = 1;
  game.ship.invulnerable = 0;
  game.bullets.push({ id: 100, x: game.ship.x, y: game.ship.y, vx: 0, vy: 0, radius: 3, life: 1, enemy: true });
  stepGame(game, idle, 0.01);
  expect(game.status).toBe('gameover');
  expect(game.lives).toBe(0);
});

it('limits ship speed and brakes after thrust is released', () => {
  const game = emptyGame();
  for (let n = 0; n < 100; n += 1) stepGame(game, { ...idle, thrust: true }, 0.05);
  expect(Math.hypot(game.ship.vx, game.ship.vy)).toBeLessThanOrEqual(190.001);
  for (let n = 0; n < 10; n += 1) stepGame(game, idle, 0.05);
  expect(Math.hypot(game.ship.vx, game.ship.vy)).toBeLessThan(80);
});
