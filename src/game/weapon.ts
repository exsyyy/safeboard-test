import type { GameConfig, Weapon } from './types';

export function coolWeapon(weapon: Weapon, config: GameConfig, dt: number) {
  weapon.heat = Math.max(0, weapon.heat - config.cooling * dt);
  weapon.cooldown = Math.max(0, weapon.cooldown - dt);
  if (weapon.locked && weapon.heat <= config.unlockHeat + 0.000001) weapon.locked = false;
}

export function fireWeapon(weapon: Weapon, config: GameConfig): boolean {
  if (weapon.locked || weapon.cooldown > 0) return false;
  weapon.heat = Math.min(100, weapon.heat + config.heatPerShot);
  weapon.cooldown = config.shotInterval;
  weapon.locked = weapon.heat >= 100;
  return true;
}
