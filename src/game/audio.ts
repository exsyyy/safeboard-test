import { createMusic } from './music';

export function createAudio() {
  let context: AudioContext | null = null;
  let enabled = true;
  let playing = false;
  let music: ReturnType<typeof createMusic> | null = null;
  let lastExplosion = -1;
  return {
    unlock() {
      if (!context) {
        context = new AudioContext();
        music = createMusic(context);
      }
      music?.setPlaying(playing && enabled);
      context.resume().catch(() => {
        /* Sound is optional when browser audio is unavailable. */
      });
    },
    setEnabled(value: boolean) {
      enabled = value;
      music?.setPlaying(playing && enabled);
    },
    setPlaying(value: boolean) {
      playing = value;
      music?.setPlaying(playing && enabled);
    },
    update() {
      music?.tick();
    },
    play(event: string) {
      if (!context || !enabled || context.state !== 'running') return;
      const now = context.currentTime;
      if (event === 'wave') return;
      if (event === 'explosion' && now - lastExplosion < 0.04) return;
      if (event === 'explosion') lastExplosion = now;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const duration = event === 'shot' ? 0.07 : 0.22;
      const frequencies: Record<string, number> = { shot: 750, overheat: 250 };
      const frequency = frequencies[event] || 95;
      oscillator.type = event === 'shot' ? 'triangle' : 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(35, now + duration);
      gain.gain.setValueAtTime(event === 'shot' ? 0.035 : 0.025, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    },
    dispose() {
      music?.setPlaying(false);
      music = null;
      context?.close().catch(() => {
        /* The context may already be closed. */
      });
      context = null;
    },
  };
}
