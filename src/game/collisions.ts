import type { Body, GameConfig, Vec2 } from './types';

export function wrap(value: number, limit: number): number {
  return ((value % limit) + limit) % limit;
}

export function wrappedDistance(a: Vec2, b: Vec2, config: GameConfig): number {
  const dx = Math.abs(a.x - b.x) % config.width;
  const dy = Math.abs(a.y - b.y) % config.height;
  return Math.hypot(Math.min(dx, config.width - dx), Math.min(dy, config.height - dy));
}

export function overlaps(a: Body, b: Body, config: GameConfig): boolean {
  return wrappedDistance(a, b, config) < a.radius + b.radius;
}
