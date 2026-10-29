import { overlaps, wrap, wrappedDistance } from './collisions';
import type { Body, GameConfig, GameState, InputState, Rock, Ship } from './types';
import { coolWeapon, fireWeapon } from './weapon';

function random(state: GameState): number {
  // eslint-disable-next-line no-bitwise -- Normalize the seeded generator to an unsigned 32-bit integer.
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function shipAt(config: GameConfig, x = config.width / 2, y = config.height / 2): Ship {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: 12,
    angle: -Math.PI / 2,
    invulnerable: 2.5,
    weapon: { heat: 0, locked: false, cooldown: 0 },
  };
}

function rockAt(state: GameState, size: 1 | 2 | 3, x: number, y: number): Rock {
  const angle = random(state) * Math.PI * 2;
  const speed = (34 + random(state) * 30 + (3 - size) * 25) * Math.min(2.4, 1 + (state.wave - 1) * 0.09);
  const shape = Array.from({ length: 10 }, () => 0.7 + random(state) * 0.3);
  state.nextId += 1;
  return {
    id: state.nextId,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: [0, 14, 27, 48][size],
    size,
    angle,
    spin: (random(state) - 0.5) * 0.8,
    shape,
  };
}

function spawnWave(state: GameState) {
  const { width, height } = state.config;
  for (let n = 0; n < Math.min(14, 3 + state.wave); n += 1) {
    let x = random(state) * width;
    let y = random(state) * height;
    if (wrappedDistance({ x, y }, state.ship, state.config) < 180) {
      x = wrap(state.ship.x + width * 0.4, width);
      y = wrap(state.ship.y + height * 0.4 + n * 30, height);
    }
    state.asteroids.push(rockAt(state, 3, x, y));
  }
  state.waveTimer = 2.5;
  state.events.push('wave');
}

export function createGame(config: GameConfig, seed: number): GameState {
  const state: GameState = {
    config,
    // eslint-disable-next-line no-bitwise -- Normalize a seed to the generator unsigned integer range.
    seed: seed >>> 0,
    nextId: 0,
    time: 0,
    status: 'playing',
    score: 0,
    lives: config.lives,
    wave: 1,
    waveTimer: 2.5,
    ufoTimer: 14,
    ship: shipAt(config),
    asteroids: [],
    bullets: [],
    ufos: [],
    particles: [],
    events: [],
  };
  spawnWave(state);
  return state;
}

function advance(body: Body, dt: number, config: GameConfig) {
  body.x = wrap(body.x + body.vx * dt, config.width);
  body.y = wrap(body.y + body.vy * dt, config.height);
}

function burst(state: GameState, body: Body, color: string, count: number) {
  for (let n = 0; n < count; n += 1) {
    const angle = random(state) * Math.PI * 2;
    const speed = 35 + random(state) * 140;
    const life = 0.2 + random(state) * 0.5;
    state.particles.push({
      x: body.x,
      y: body.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1,
      life,
      maxLife: life,
      color,
    });
  }
  if (state.particles.length > 300) state.particles.splice(0, state.particles.length - 300);
}

function playerShot(state: GameState, input: InputState) {
  const { ship, config } = state;
  if (!input.fire || !fireWeapon(ship.weapon, config)) return;
  state.nextId += 1;
  const dx = Math.cos(ship.angle);
  const dy = Math.sin(ship.angle);
  state.bullets.push({
    id: state.nextId,
    x: wrap(ship.x + dx * 19, config.width),
    y: wrap(ship.y + dy * 19, config.height),
    vx: dx * config.bulletSpeed + ship.vx * 0.3,
    vy: dy * config.bulletSpeed + ship.vy * 0.3,
    radius: 2,
    life: 1.2,
    enemy: false,
  });
  state.events.push(ship.weapon.locked ? 'overheat' : 'shot');
}

function updateShip(state: GameState, input: InputState, dt: number) {
  const { ship, config } = state;
  ship.invulnerable = Math.max(0, ship.invulnerable - dt);
  ship.angle += (Number(input.right) - Number(input.left)) * config.turnSpeed * dt;
  if (input.thrust) {
    ship.vx += Math.cos(ship.angle) * config.acceleration * dt;
    ship.vy += Math.sin(ship.angle) * config.acceleration * dt;
  }
  if (!input.thrust) {
    const damping = Math.exp(-config.braking * dt);
    ship.vx *= damping;
    ship.vy *= damping;
  }
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > config.maxSpeed) {
    ship.vx *= config.maxSpeed / speed;
    ship.vy *= config.maxSpeed / speed;
  }
  advance(ship, dt, config);
  coolWeapon(ship.weapon, config, dt);
  playerShot(state, input);
}

function spawnUfo(state: GameState) {
  const small = state.wave >= 3 && random(state) > 0.45;
  const fromLeft = random(state) > 0.5;
  state.nextId += 1;
  state.ufos.push({
    id: state.nextId,
    small,
    x: fromLeft ? 0 : state.config.width - 1,
    y: 60 + random(state) * (state.config.height - 120),
    vx: (fromLeft ? 1 : -1) * (small ? 95 : 65),
    vy: 0,
    radius: small ? 13 : 23,
    fireTimer: 1.2,
    life: 14,
  });
  state.ufoTimer = Math.max(7, 20 - state.wave * 1.1) + random(state) * 5;
}

function updateUfos(state: GameState, dt: number) {
  state.ufoTimer -= dt;
  if (state.ufoTimer <= 0 && state.ufos.length < 2) spawnUfo(state);
  state.ufos.forEach((ufo) => {
    advance(ufo, dt, state.config);
    ufo.y = wrap(ufo.y + Math.sin(state.time * 1.7 + ufo.id) * 24 * dt, state.config.height);
    ufo.life -= dt;
    ufo.fireTimer -= dt;
    if (ufo.fireTimer > 0) return;
    const angle = ufo.small
      ? Math.atan2(state.ship.y - ufo.y, state.ship.x - ufo.x) + (random(state) - 0.5) * 0.28
      : random(state) * Math.PI * 2;
    const speed = Math.min(300, 180 + state.wave * 8);
    state.nextId += 1;
    state.bullets.push({
      id: state.nextId,
      x: ufo.x,
      y: ufo.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 3,
      life: 2.8,
      enemy: true,
    });
    ufo.fireTimer = Math.max(0.6, 1.8 - state.wave * 0.07);
  });
  state.ufos = state.ufos.filter((ufo) => ufo.life > 0);
}

function hitTargets(state: GameState) {
  const deadRocks = new Set<number>();
  const deadUfos = new Set<number>();
  const children: Rock[] = [];
  state.bullets.forEach((bullet) => {
    if (bullet.enemy || bullet.life <= 0) return;
    const rock = state.asteroids.find((item) => !deadRocks.has(item.id) && overlaps(bullet, item, state.config));
    if (rock) {
      deadRocks.add(rock.id);
      bullet.life = 0;
      state.score += state.config.rockScores[rock.size];
      burst(state, rock, '#a4cbd0', 12);
      if (rock.size > 1) {
        const size = (rock.size - 1) as 1 | 2;
        children.push(rockAt(state, size, rock.x, rock.y), rockAt(state, size, rock.x, rock.y));
      }
      state.events.push('explosion');
      return;
    }
    const ufo = state.ufos.find((item) => !deadUfos.has(item.id) && overlaps(bullet, item, state.config));
    if (ufo) {
      deadUfos.add(ufo.id);
      bullet.life = 0;
      state.score += ufo.small ? 1000 : 200;
      burst(state, ufo, '#e79188', 22);
      state.events.push('explosion');
    }
  });
  state.asteroids = state.asteroids.filter((rock) => !deadRocks.has(rock.id)).concat(children);
  state.ufos = state.ufos.filter((ufo) => !deadUfos.has(ufo.id));
}

function damageShip(state: GameState) {
  if (state.ship.invulnerable > 0) return;
  const enemyBullet = state.bullets.find(
    (bullet) => bullet.enemy && bullet.life > 0 && overlaps(bullet, state.ship, state.config),
  );
  const collision =
    enemyBullet ||
    state.asteroids.some((rock) => overlaps(rock, state.ship, state.config)) ||
    state.ufos.some((ufo) => overlaps(ufo, state.ship, state.config));
  if (!collision) return;
  if (enemyBullet) enemyBullet.life = 0;
  burst(state, state.ship, '#ffbd70', 35);
  state.events.push('hit');
  state.lives -= 1;
  if (state.lives <= 0) {
    state.status = 'gameover';
    return;
  }
  // Pick the safest of a small set of spawn positions; invulnerability covers unavoidable overlap.
  let best = { x: state.config.width / 2, y: state.config.height / 2, distance: -1 };
  for (let n = 0; n < 12; n += 1) {
    const x = n === 0 ? state.config.width / 2 : random(state) * state.config.width;
    const y = n === 0 ? state.config.height / 2 : random(state) * state.config.height;
    const distance = Math.min(
      ...state.asteroids.map((rock) => wrappedDistance({ x, y }, rock, state.config) - rock.radius),
      1000,
    );
    if (distance > best.distance) best = { x, y, distance };
  }
  state.ship = shipAt(state.config, best.x, best.y);
}

/** Advances the owned simulation state in place; React only receives HUD snapshots. */
export function stepGame(state: GameState, input: InputState, dtSeconds: number): GameState {
  if (state.status !== 'playing' || !Number.isFinite(dtSeconds) || dtSeconds <= 0) return state;
  const dt = Math.min(0.1, dtSeconds);
  state.events = [];
  state.time += dt;
  updateShip(state, input, dt);
  state.asteroids.forEach((rock) => {
    advance(rock, dt, state.config);
    rock.angle += rock.spin * dt;
  });
  state.bullets.forEach((bullet) => {
    advance(bullet, dt, state.config);
    bullet.life -= dt;
  });
  updateUfos(state, dt);
  hitTargets(state);
  damageShip(state);
  state.bullets = state.bullets.filter((bullet) => bullet.life > 0);
  state.particles.forEach((particle) => {
    advance(particle, dt, state.config);
    particle.life -= dt;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);
  if (state.status === 'playing' && state.asteroids.length === 0) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      state.wave += 1;
      spawnWave(state);
    }
  }
  return state;
}
