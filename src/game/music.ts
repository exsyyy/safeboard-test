// Original ambient score. No samples or third-party compositions.
const CHORDS = [
  [45, 52, 59],
  [41, 48, 55],
  [43, 50, 57],
  [40, 47, 54],
];
const STEP = 5.4;

export function createMusic(context: AudioContext) {
  let playing = false;
  let nextNote = 0;
  let position = 0;
  const voices = new Map<OscillatorNode, GainNode>();

  function note(midi: number, time: number) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), time);
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.012, time + 1.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 6.8);
    oscillator.connect(gain);
    gain.connect(context.destination);
    voices.set(oscillator, gain);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      voices.delete(oscillator);
    };
    oscillator.start(time);
    oscillator.stop(time + 6.85);
  }

  return {
    setPlaying(value: boolean) {
      if (playing === value) return;
      playing = value;
      nextNote = 0;
      if (!value) {
        voices.forEach((gain, oscillator) => {
          gain.gain.cancelScheduledValues(context.currentTime);
          gain.gain.setTargetAtTime(0, context.currentTime, 0.025);
          oscillator.stop(context.currentTime + 0.12);
        });
        voices.clear();
      }
    },
    tick() {
      if (!playing || context.state !== 'running') return;
      if (nextNote < context.currentTime) nextNote = context.currentTime + 0.03;
      while (nextNote < context.currentTime + 0.12) {
        const time = nextNote;
        CHORDS[position].forEach((midi) => note(midi, time));
        position = (position + 1) % CHORDS.length;
        nextNote += STEP;
      }
    },
  };
}
