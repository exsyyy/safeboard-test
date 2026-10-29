import { describe, expect, it } from 'vitest';

import { canvasSize } from './surface';

describe('canvas display resolution', () => {
  it('allocates a full-HD backing buffer instead of stretching 960x600', () => {
    expect(canvasSize(1920, 1080, 1)).toEqual({ width: 1920, height: 1080 });
  });
  it('accounts for the device pixel ratio', () => {
    expect(canvasSize(1000, 625, 2)).toEqual({ width: 2000, height: 1250 });
  });
  it('keeps valid dimensions for hidden and very small views', () => {
    expect(canvasSize(0, 0, 1)).toEqual({ width: 1, height: 1 });
    expect(canvasSize(800, 500, 0)).toEqual({ width: 800, height: 500 });
  });
});
