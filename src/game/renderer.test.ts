import { expect, it, vi } from 'vitest';

import { CONFIG } from './config';
import { createGame } from './engine';
import { renderGame } from './renderer';

it('renders the next-wave message in readable Russian', () => {
  const state = createGame(CONFIG, 42);
  state.asteroids = [];
  state.waveTimer = 2.5;
  const fillText = vi.fn();
  const methods = [
    'setTransform',
    'fillRect',
    'save',
    'translate',
    'scale',
    'beginPath',
    'rect',
    'clip',
    'arc',
    'fill',
    'stroke',
    'moveTo',
    'lineTo',
    'rotate',
    'restore',
    'closePath',
  ];
  const context = { canvas: { width: 960, height: 600 }, fillText };
  const mock = Object.assign(context, Object.fromEntries(methods.map((name) => [name, vi.fn()])));
  renderGame(mock as unknown as CanvasRenderingContext2D, state);
  expect(fillText).toHaveBeenCalledWith('Волна 2 через 3', 480, 45);
});
