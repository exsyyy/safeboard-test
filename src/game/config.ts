import type { GameConfig } from './types';

export const CONFIG: GameConfig = {
  width: 960,
  height: 600,
  lives: 3,
  acceleration: 180,
  turnSpeed: 3.5,
  maxSpeed: 190,
  braking: 2.1,
  bulletSpeed: 580,
  shotInterval: 0.16,
  heatPerShot: 10,
  cooling: 20,
  unlockHeat: 30,
  rockScores: [0, 100, 50, 20],
};
