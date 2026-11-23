/**
 * Procedural Web Audio Foley & Generative Room Tone Engine.
 * Lazy-loaded ONLY after the user explicitly enables sound.
 * 100% original physical modeling (zero licensed samples, ~5 KB payload).
 */

// Warm architectural pentatonic scale (C4, D4, E4, G4, A4, C5, D5, E5)
const PENTATONIC_HZ = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
const MAX_SIMULTANEOUS_VOICES = 8;

export class CabinetrySoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private ambientGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private activeVoices = 0;
  private enabled = false;
  private noteIndex = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private padOscs: OscillatorNode[] = [];
  private roomToneNode: AudioBufferSourceNode | null = null;

  public start(): boolean {
    if (typeof window === "undefined") return false;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 5;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.14;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;

      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createPinkNoiseBuffer(this.ctx, 2.5);
      this.startAmbientBed();
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    this.enabled = true;
    const now = this.ctx.currentTime;
    this.masterGain?.gain.cancelScheduledValues(now);
    // Quiet architectural room level — never loud
    this.masterGain?.gain.setTargetAtTime(0.32, now, 0.25);
    return true;
  }

  public stop(): void {
    this.enabled = false;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.18);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private createPinkNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const out = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /** Warm low architectural room tone + subtle slow harmonic pad (zero beat, zero swells) */
  private startAmbientBed(): void {
    if (!this.ctx || !this.compressor || !this.noiseBuffer) return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.11;

    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = 260;
    this.padFilter.Q.value = 0.7;

    this.padFilter.connect(this.ambientGain);
    this.ambientGain.connect(this.compressor);

    // Subtle open-fifth warm timber drone (C2 = 65.4 Hz, G2 = 98.0 Hz, D3 = 146.8 Hz)
    const freqs = [65.41, 98.0, 146.83];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.padFilter) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = idx === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      g.gain.value = idx === 0 ? 0.45 : 0.16;
      osc.connect(g);
      g.connect(this.padFilter);
      osc.start();
      this.padOscs.push(osc);
    });

    // Very soft low room air tone
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;
    const roomFilter = this.ctx.createBiquadFilter();
    roomFilter.type = "lowpass";
    roomFilter.frequency.value = 180;
    const roomGain = this.ctx.createGain();
    roomGain.gain.value = 0.09;
    noise.connect(roomFilter);
    roomFilter.connect(roomGain);
    roomGain.connect(this.compressor);
    noise.start();
    this.roomToneNode = noise;
  }

  /**
   * Dry resonant wood "tock" pitched to our pentatonic cascade.
   * Larger panels resonate slightly deeper; gentle stretch-goal harmonic bloom on cascade.
   */
  public playWoodTock(panelSizeWeight = 0.5): void {
    if (!this.enabled || !this.ctx || !this.compressor || !this.noiseBuffer) return;
    if (this.activeVoices >= MAX_SIMULTANEOUS_VOICES) return;

    const now = this.ctx.currentTime;
    this.activeVoices++;

    // Choose pentatonic pitch, subtly weighted by panel size + tiny organic ±1.5% jitter
    const basePitch = PENTATONIC_HZ[this.noteIndex % PENTATONIC_HZ.length];
    this.noteIndex++;
    const sizeShift = panelSizeWeight > 0.7 ? 0.5 : 1.0; // large panels drop an octave warmer
    const jitter = 1 + (Math.random() - 0.5) * 0.03;
    const freq = basePitch * sizeShift * jitter;

    // Duck volume slightly when multiple voices overlap
    const voiceVol = Math.min(0.45, 0.42 / Math.sqrt(Math.max(1, this.activeVoices)));

    // 1. Woody body resonant sine pulse
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq * 1.12, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.022);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(voiceVol, now + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = "bandpass";
    bodyFilter.frequency.value = freq * 1.6;
    bodyFilter.Q.value = 3.2;

    osc.connect(bodyFilter);
    bodyFilter.connect(env);
    env.connect(this.compressor);

    // 2. Dry wood transient click (short filtered noise burst)
    const click = this.ctx.createBufferSource();
    click.buffer = this.noiseBuffer;
    const clickFilter = this.ctx.createBiquadFilter();
    clickFilter.type = "bandpass";
    clickFilter.frequency.value = 1150 + Math.random() * 350;
    clickFilter.Q.value = 2.4;
    const clickEnv = this.ctx.createGain();
    clickEnv.gain.setValueAtTime(voiceVol * 0.9, now);
    clickEnv.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    click.connect(clickFilter);
    clickFilter.connect(clickEnv);
    clickEnv.connect(this.compressor);

    // Sound-reactive ambient pad nudge: gently brighten the warm bed filter during join cascades
    if (this.padFilter) {
      this.padFilter.frequency.cancelScheduledValues(now);
      this.padFilter.frequency.setTargetAtTime(420, now, 0.08);
      this.padFilter.frequency.setTargetAtTime(260, now + 0.35, 0.9);
    }

    osc.start(now);
    osc.stop(now + 0.11);
    click.start(now, Math.random() * 1.5, 0.04);

    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
  }

  /** Soft concealed metallic hinge click */
  public playHingeClick(): void {
    if (!this.enabled || !this.ctx || !this.compressor) return;
    if (this.activeVoices >= MAX_SIMULTANEOUS_VOICES) return;

    const now = this.ctx.currentTime;
    this.activeVoices++;

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(2650 + Math.random() * 250, now);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.018);

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.14, now + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

    osc.connect(env);
    env.connect(this.compressor);
    osc.start(now);
    osc.stop(now + 0.03);
    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
  }

  /** Soft-close drawer air slide */
  public playSoftSlide(): void {
    if (!this.enabled || !this.ctx || !this.compressor || !this.noiseBuffer) return;
    if (this.activeVoices >= MAX_SIMULTANEOUS_VOICES) return;

    const now = this.ctx.currentTime;
    this.activeVoices++;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(680, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.24);
    filter.Q.value = 1.6;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.16, now + 0.05);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);
    src.start(now, Math.random() * 1.2, 0.28);
    src.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
  }

  /** Faint airy brush sound synced to the physical finish light-wipe */
  public playLightWipeBrush(): void {
    if (!this.enabled || !this.ctx || !this.compressor || !this.noiseBuffer) return;
    if (this.activeVoices >= MAX_SIMULTANEOUS_VOICES) return;

    const now = this.ctx.currentTime;
    this.activeVoices++;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.22);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.52);
    filter.Q.value = 1.1;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(0.12, now + 0.14);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);

    src.connect(filter);
    filter.connect(env);
    env.connect(this.compressor);
    src.start(now, Math.random() * 1.0, 0.58);
    src.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
  }

  public dispose(): void {
    this.enabled = false;
    this.padOscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // ignore
      }
    });
    try {
      this.roomToneNode?.stop();
    } catch {
      // ignore
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
