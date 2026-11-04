// Generative sound: everything is synthesized with Web Audio, so there are no audio files.
// Off by default; the HUD button turns it on (browsers require a user gesture anyway).

export type SoundState = {
  /** scroll speed, px per frame */
  velocity: number;
  /** transition progress 0..1 (0 when not transitioning) */
  mix: number;
  hold: number;
  awake: number;
};

export class Sound {
  enabled = false;
  private ctx?: AudioContext;
  private master!: GainNode;
  private wind!: GainNode;
  private whoosh!: GainNode;
  private whooshFilter!: BiquadFilterNode;
  private riser!: GainNode;
  private riserFilter!: BiquadFilterNode;
  private riserOsc!: OscillatorNode;
  private shimmer!: GainNode;
  private noise!: AudioBuffer;

  async toggle() {
    if (this.enabled) this.disable();
    else await this.enable();
    return this.enabled;
  }

  private build() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    // white noise buffer, shared by wind / whoosh / impacts
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noiseSrc = () => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      s.start();
      return s;
    };

    // ---- drone: detuned saws + sub through a slowly breathing low-pass ----
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 260;
    droneFilter.Q.value = 0.8;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.16;
    droneFilter.connect(droneGain).connect(this.master);
    for (const [type, f] of [['sawtooth', 55], ['sawtooth', 55.35], ['sine', 27.5], ['triangle', 82.4]] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(droneFilter);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 90;
    lfo.connect(lfoAmt).connect(droneFilter.frequency);
    lfo.start();

    // ---- wind: band-passed noise that follows scroll speed ----
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.7;
    this.wind = ctx.createGain();
    this.wind.gain.value = 0.015;
    noiseSrc().connect(windFilter).connect(this.wind).connect(this.master);

    // ---- whoosh: a resonant sweep that tracks the transition ----
    this.whooshFilter = ctx.createBiquadFilter();
    this.whooshFilter.type = 'bandpass';
    this.whooshFilter.Q.value = 2.2;
    this.whoosh = ctx.createGain();
    this.whoosh.gain.value = 0;
    noiseSrc().connect(this.whooshFilter).connect(this.whoosh).connect(this.master);

    // ---- ember riser: opens up while the reader holds ----
    this.riserOsc = ctx.createOscillator();
    this.riserOsc.type = 'sawtooth';
    this.riserOsc.frequency.value = 110;
    const riserOsc2 = ctx.createOscillator();
    riserOsc2.type = 'sine';
    riserOsc2.frequency.value = 329.6;
    this.riserFilter = ctx.createBiquadFilter();
    this.riserFilter.type = 'lowpass';
    this.riserFilter.Q.value = 6;
    this.riser = ctx.createGain();
    this.riser.gain.value = 0;
    this.riserOsc.connect(this.riserFilter);
    riserOsc2.connect(this.riserFilter);
    this.riserFilter.connect(this.riser).connect(this.master);
    this.riserOsc.start();
    riserOsc2.start();

    // ---- shimmer: a high, trembling fifth once the magic is awake ----
    this.shimmer = ctx.createGain();
    this.shimmer.gain.value = 0;
    const trem = ctx.createOscillator();
    trem.frequency.value = 5.5;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.4;
    const shimmerBus = ctx.createGain();
    shimmerBus.gain.value = 0.6;
    trem.connect(tremAmt).connect(shimmerBus.gain);
    trem.start();
    for (const f of [659.25, 987.77, 1318.5]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 12;
      o.connect(shimmerBus);
      o.start();
    }
    shimmerBus.connect(this.shimmer).connect(this.master);
  }

  async enable() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    await ctx.resume();
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.6);
    this.enabled = true;
  }

  disable() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    this.enabled = false;
    window.setTimeout(() => !this.enabled && ctx.suspend(), 600);
  }

  update(s: SoundState) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const speed = Math.min(Math.abs(s.velocity) / 40, 1);
    this.wind.gain.setTargetAtTime(0.015 + speed * 0.09, t, 0.15);
    const sweep = Math.sin(Math.PI * s.mix);
    this.whoosh.gain.setTargetAtTime(sweep * (0.05 + speed * 0.25), t, 0.05);
    this.whooshFilter.frequency.setTargetAtTime(250 + s.mix * 2800, t, 0.05);
    this.riser.gain.setTargetAtTime(s.hold * 0.11, t, 0.05);
    this.riserFilter.frequency.setTargetAtTime(180 + s.hold * s.hold * 3200, t, 0.05);
    this.riserOsc.frequency.setTargetAtTime(110 * (1 + s.hold * 0.5), t, 0.05);
    this.shimmer.gain.setTargetAtTime(s.awake * 0.022, t, 0.4);
  }

  /** a struck bell with a low boom underneath: the ember waking */
  wake() {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    for (const [f, a] of [[523.25, 0.09], [659.25, 0.07], [783.99, 0.06], [1046.5, 0.05], [1567.98, 0.03]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 3.6);
    }
    this.boom(0.55);
  }

  /** low sine drop + filtered noise burst */
  boom(level = 0.5) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 1.9);

    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(1800, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.9);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(level * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    n.connect(f).connect(ng).connect(this.master);
    n.start(t);
    n.stop(t + 1.1);
  }
}
