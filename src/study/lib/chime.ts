type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

/** Three rising notes, each 0.18s apart. */
const NOTES = [
  { delay: 0, frequency: 660 },
  { delay: 0.18, frequency: 880 },
  { delay: 0.36, frequency: 990 },
];
const NOTE_LENGTH = 0.3;

/** Plays a little chime when a timer phase ends. */
export function playChime(): void {
  try {
    const AudioContextClass = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();

    for (const { delay, frequency } of NOTES) {
      const start = audio.currentTime + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + NOTE_LENGTH);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + NOTE_LENGTH);
    }
  } catch {
    // No audio available: stay silent.
  }
}
