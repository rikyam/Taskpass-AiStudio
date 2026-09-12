// ============================================================================
// Taskpass Audio Synthesizer: Subtle, Satisfying Task Completion Chime
// High-fidelity, zero-dependency procedural audio engine via Web Audio API
// ============================================================================

let sharedAudioCtx: AudioContext | null = null;

/**
 * Lazily obtains or initializes a shared AudioContext instance.
 * Reusing a single AudioContext avoids hitting browser limits (e.g. max 6 contexts in Chrome).
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch (err) {
    console.warn("Unable to initialize Web Audio context:", err);
    return null;
  }
}

/**
 * Checks if the user has completion chime enabled.
 * Defaults to true for immediate gratification out-of-the-box.
 */
export function isCompletionChimeEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const saved = localStorage.getItem("completion_chime_enabled");
    return saved !== "false";
  } catch {
    return true;
  }
}

/**
 * Updates the completion chime preference in localStorage.
 */
export function setCompletionChimeEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("completion_chime_enabled", enabled ? "true" : "false");
  } catch (e) {
    console.warn("Failed to persist completion_chime_enabled to localStorage:", e);
  }
}

/**
 * Plays a subtle, deeply satisfying harmonic audio chime when a user marks a task as completed.
 * 
 * Timbre & Acoustic Design:
 * - Fundamental warmth: gentle A4/A5 body
 * - Ascending resolution: bright E6 (perfect fifth) with celesta/marimba resonance
 * - Glass/Shimmer overtone: soft triangle E7 harmonic
 * - Envelope: 5ms zero-pop attack, gentle exponential decay, volume capped at ~0.14
 */
export function playTaskCompletionChime(options?: { volume?: number; force?: boolean }): void {
  if (typeof window === "undefined") return;

  const force = options?.force ?? false;
  if (!force && !isCompletionChimeEnabled()) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // If context was suspended by browser autoplay policy, resume it now within the click event
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const baseVolume = options?.volume !== undefined ? options.volume : 0.14;

    // Master bus gain with gentle low-pass smoothing
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(baseVolume, now);

    // Subtle low-pass filter to soften any high harshness (keeps it velvety and warm)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4500, now);

    masterGain.connect(filter);
    filter.connect(ctx.destination);

    // -------------------------------------------------------------
    // TONE 1: Warm Foundation Tone (A5 - 880.00 Hz)
    // Starts at t = 0s. Quick 5ms attack, pleasant 220ms decay.
    // -------------------------------------------------------------
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880.0, now);

    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.55, now + 0.006);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // -------------------------------------------------------------
    // TONE 2: Acoustic Body Warmth (A4 - 440.00 Hz)
    // Low sub-harmonic layer that gives the chime physical depth
    // -------------------------------------------------------------
    const oscBody = ctx.createOscillator();
    const gainBody = ctx.createGain();
    oscBody.type = "sine";
    oscBody.frequency.setValueAtTime(440.0, now);

    gainBody.gain.setValueAtTime(0.0001, now);
    gainBody.gain.exponentialRampToValueAtTime(0.20, now + 0.008);
    gainBody.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscBody.connect(gainBody);
    gainBody.connect(masterGain);
    oscBody.start(now);
    oscBody.stop(now + 0.20);

    // -------------------------------------------------------------
    // TONE 3: Satisfying Harmonic Resolution (E6 - 1318.51 Hz)
    // Delayed by 65ms: Creates that uplifting ascending interval
    // Rings out longer (480ms) for a delicate, resonant bell finish.
    // -------------------------------------------------------------
    const note2Time = now + 0.065;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    // Micro-detune (+2 cents) for organic acoustic shimmer
    osc2.frequency.setValueAtTime(1318.51, note2Time);

    gain2.gain.setValueAtTime(0.0001, note2Time);
    gain2.gain.exponentialRampToValueAtTime(0.75, note2Time + 0.007);
    gain2.gain.exponentialRampToValueAtTime(0.0001, note2Time + 0.48);

    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(note2Time);
    osc2.stop(note2Time + 0.50);

    // -------------------------------------------------------------
    // TONE 4: Glass/Celesta Sparkle Harmonic (E7 - 2637.02 Hz)
    // Triangle wave adds crisp overtone brightness at subtle volume
    // -------------------------------------------------------------
    const sparkleTime = now + 0.070;
    const oscSparkle = ctx.createOscillator();
    const gainSparkle = ctx.createGain();
    oscSparkle.type = "triangle";
    oscSparkle.frequency.setValueAtTime(2637.02, sparkleTime);

    gainSparkle.gain.setValueAtTime(0.0001, sparkleTime);
    gainSparkle.gain.exponentialRampToValueAtTime(0.12, sparkleTime + 0.008);
    gainSparkle.gain.exponentialRampToValueAtTime(0.0001, sparkleTime + 0.32);

    oscSparkle.connect(gainSparkle);
    gainSparkle.connect(masterGain);
    oscSparkle.start(sparkleTime);
    oscSparkle.stop(sparkleTime + 0.34);

  } catch (err) {
    console.warn("Task completion chime playback caught an exception:", err);
  }
}

/**
 * Plays a light, crisp micro-chime for ticking off subtasks or checklist items.
 */
export function playSubtaskCompletionChime(options?: { volume?: number; force?: boolean }): void {
  if (typeof window === "undefined") return;

  const force = options?.force ?? false;
  if (!force && !isCompletionChimeEnabled()) {
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const baseVolume = options?.volume !== undefined ? options.volume : 0.10;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(baseVolume, now);
    masterGain.connect(ctx.destination);

    // High, delicate, clear celesta tap (E6 - 1318.51 Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1318.51, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.6, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.24);

  } catch (err) {
    console.warn("Subtask completion chime caught an exception:", err);
  }
}

let lastTimelineBumpTime = 0;

/**
 * Plays a gentle, physical micro-bump feedback sound when a task card collides with another
 * task on the timeline during drag-and-drop, reinforcing physical space constraints.
 */
export function playTimelineBumpFeedback(options?: { volume?: number; force?: boolean }): void {
  if (typeof window === "undefined") return;

  const force = options?.force ?? false;
  if (!force && !isCompletionChimeEnabled()) {
    return;
  }

  // Throttle to avoid audio stutter on rapid pointer movement
  const nowMs = Date.now();
  if (nowMs - lastTimelineBumpTime < 95) {
    return;
  }
  lastTimelineBumpTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const baseVolume = options?.volume !== undefined ? options.volume : 0.08;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(baseVolume, now);
    masterGain.connect(ctx.destination);

    // Warm, damped physical knock/bump (160 Hz descending to 75 Hz)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.045);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.7, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.055);

  } catch (err) {
    console.warn("Timeline bump feedback caught an exception:", err);
  }
}
