// Original procedural score for this game. No samples or third-party compositions.
const ROOTS = [40, 36, 43, 38];
const ARPEGGIO: (number | null)[] = [24, 31, 36, 31, 27, 31, 34, 31, 24, 31, 36, 38, 36, 31, 27, null];
const STEP = 0.24;

export function createMusic(context: AudioContext) {
  let playing = false;
  let nextNote = 0;
  let position = 0;
  const voices = new Map<OscillatorNode, GainNode>();

  function note(midi: number, time: number, duration: number, sound: { volume: number; type: OscillatorType }) {
    const { volume, type } = sound;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), time);
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    voices.set(oscillator, gain);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices.delete(oscillator);
    };
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  return {
    setPlaying(value: boolean) {
      if (playing === value) return;
      playing = value;
      nextNote = 0;
      if (!value) {
        voices.forEach((gain, oscillator) => {
          gain.gain.cancelScheduledValues(context.currentTime);
          gain.gain.setTargetAtTime(0, context.currentTime, 0.008);
          oscillator.stop(context.currentTime + 0.03);
        });
        voices.clear();
      }
    },
    tick() {
      if (!playing || context.state !== 'running') return;
      if (nextNote < context.currentTime) nextNote = context.currentTime + 0.03;
      while (nextNote < context.currentTime + 0.12) {
        const root = ROOTS[Math.floor(position / 16) % ROOTS.length];
        const melody = ARPEGGIO[position % ARPEGGIO.length];
        if (melody !== null) note(root + melody, nextNote, STEP * 0.7, { volume: 0.012, type: 'square' });
        if (position % 4 === 0) {
          note(root, nextNote, STEP * 2.5, { volume: 0.045, type: 'triangle' });
          note(28, nextNote, 0.055, { volume: 0.035, type: 'sine' });
        }
        position = (position + 1) % 64;
        nextNote += STEP;
      }
    },
  };
}
