import { describe, expect, it, vi } from 'vitest';

import { createMusic } from './music';

function audioFixture() {
  const oscillators: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
  });
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    createOscillator: () => {
      const oscillator = {
        frequency: parameter(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null,
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }),
  };
  return { context, oscillators, music: createMusic(context as unknown as AudioContext) };
}

describe('background music lifecycle', () => {
  it('stays silent before play and does not schedule the same notes twice', () => {
    const { music, oscillators } = audioFixture();
    music.tick();
    expect(oscillators).toHaveLength(0);
    music.setPlaying(true);
    music.tick();
    const count = oscillators.length;
    expect(count).toBeGreaterThan(0);
    music.tick();
    expect(oscillators).toHaveLength(count);
  });
  it('stops scheduled voices on pause and resumes without a catch-up burst', () => {
    const { music, context, oscillators } = audioFixture();
    music.setPlaying(true);
    music.tick();
    const count = oscillators.length;
    music.setPlaying(false);
    expect(oscillators.every((oscillator) => oscillator.stop.mock.calls.length === 2)).toBe(true);
    context.currentTime = 100;
    music.tick();
    expect(oscillators).toHaveLength(count);
    music.setPlaying(true);
    music.tick();
    expect(oscillators.length - count).toBeLessThanOrEqual(3);
    expect(oscillators.length).toBeGreaterThan(count);
  });
  it('does not queue music while the audio context is suspended', () => {
    const { music, context, oscillators } = audioFixture();
    context.state = 'suspended';
    music.setPlaying(true);
    music.tick();
    expect(oscillators).toHaveLength(0);
  });
});
