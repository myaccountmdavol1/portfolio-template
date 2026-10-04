// A short, gentle celebration tune made live with the Web Audio API (no audio files, no licensing).

const NOTES: [number, number, number][] = [
  // [semitones from A4, start (s), length (s)]
  [3, 0, 0.35], [7, 0.3, 0.35], [10, 0.6, 0.35], [15, 0.9, 0.9],
  [5, 1.9, 0.35], [8, 2.2, 0.35], [12, 2.5, 0.35], [17, 2.8, 0.9],
  [7, 3.8, 0.35], [10, 4.1, 0.35], [14, 4.4, 0.35], [19, 4.7, 1.4],
  [15, 6.4, 0.5], [14, 6.9, 0.5], [12, 7.4, 0.5], [15, 7.9, 2.2],
];

const freq = (semitones: number) => 440 * 2 ** (semitones / 12);

/** Plays the tune (looping softly under the credits). Returns a stop function. */
export function playFinaleTune(): () => void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return () => {};
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const playOnce = (at: number) => {
    for (const [st, start, len] of NOTES) {
      for (const [type, detune, level] of [['triangle', 0, 1], ['sine', 1200, 0.25]] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq(st);
        osc.detune.value = detune;
        const t = at + start;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5 * level, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + len + 0.4);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + len + 0.5);
      }
    }
  };

  const loop = () => {
    if (stopped) return;
    playOnce(ctx.currentTime + 0.05);
    timer = setTimeout(loop, 10_500);
  };
  loop();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    master.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    setTimeout(() => void ctx.close(), 600);
  };
}
