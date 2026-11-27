// BeatMatch audio-thread processors. index.html embeds this same source and loads it from a Blob.
// Tested in Node by tools/worklet.test.js.

// Two-tap granular pitch shifter with synchronised grains (WSOLA-style).
// Each read head sweeps through a delay line at speed 'ratio' under a sin² window; the heads are half a
// grain apart so their gains always sum to 1. When a head starts a new grain it picks, from a small
// search range, the start point whose waveform best matches the other head, so grains join in phase
// and the pitch lands exactly on the target. ratio 2 = octave up, 0.5 = octave down, tempo unchanged.
// ratio 1 passes audio straight through.
class BMShifter extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'ratio', defaultValue: 1, minValue: 0.25, maxValue: 4, automationRate: 'k-rate' }]; }
  constructor() {
    super();
    this.N = 1 << 15; this.mask = this.N - 1; this.W = 1536; this.S = 384; this.L = 256;
    this.buf = [new Float32Array(this.N), new Float32Array(this.N)];
    this.w = 0; this.q = [0, 0.5]; this.d = [this.W / 2, this.W]; this.dir = 0;
  }
  rd(c, pos) { const i0 = Math.floor(pos), f = pos - i0, b = this.buf[c]; return b[i0 & this.mask] * (1 - f) + b[(i0 + 1) & this.mask] * f; }
  // choose a start delay for head k near 'nominal' that lines up with the other head's waveform
  pick(k, nominal, r) {
    const o = 1 - k, dOther = this.d[o], L = this.L, S = this.S;
    let best = -Infinity, bestD = nominal;
    for (let cand = nominal - S; cand <= nominal + S; cand += 2) {
      let dot = 0, e = 0;
      for (let j = 0; j < L; j += 4) {
        const a = this.rd(0, this.w - cand + j * r), b = this.rd(0, this.w - dOther + j * r);
        dot += a * b; e += a * a;
      }
      const score = e > 1e-9 ? dot / Math.sqrt(e) : 0;
      if (score > best) { best = score; bestD = cand; }
    }
    return bestD;
  }
  process(inputs, outputs, params) {
    const inp = inputs[0], out = outputs[0], r = params.ratio[0], n = out[0].length, W = this.W, S = this.S;
    const ch = out.length, bypass = Math.abs(r - 1) < 1e-4, dq = Math.abs(1 - r) / W;
    const dir = r > 1 ? 1 : -1;
    if (!bypass && dir !== this.dir) { // starting, or crossed ratio 1: lay the heads out afresh
      this.dir = dir; const start = dir > 0 ? W + 2 + S : 2 + S;
      this.d = [start - dir * W * 0.0, start - dir * W * 0.5]; this.q = [0, 0.5];
    }
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < ch; c++) { const src = inp[c] || inp[0]; this.buf[c & 1][this.w] = src ? src[i] : 0; }
      if (bypass) {
        for (let c = 0; c < ch; c++) { const src = inp[c] || inp[0]; out[c][i] = src ? src[i] : 0; }
      } else {
        for (let c = 0; c < ch; c++) {
          let y = 0;
          for (let k = 0; k < 2; k++) { const s = Math.sin(Math.PI * this.q[k]); y += this.rd(c & 1, this.w - this.d[k]) * s * s; }
          out[c][i] = y;
        }
        for (let k = 0; k < 2; k++) {
          this.d[k] += 1 - r; this.q[k] += dq;
          if (this.q[k] >= 1) { this.q[k] -= 1; this.d[k] = this.pick(k, dir > 0 ? W + 2 + S : 2 + S, r); }
          if (this.d[k] < 2 || this.d[k] > this.N - W - 4 * S) { this.d[k] = dir > 0 ? W + 2 + S : 2 + S; }
        }
      }
      this.w = (this.w + 1) & this.mask;
    }
    if (bypass) this.dir = 0;
    return true;
  }
}
// Bitcrusher: fewer bits (coarser steps) and sample-and-hold (lower sample rate).
class BMCrusher extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: 'bits', defaultValue: 6, minValue: 1, maxValue: 16, automationRate: 'k-rate' }, { name: 'hold', defaultValue: 6, minValue: 1, maxValue: 64, automationRate: 'k-rate' }]; }
  constructor() { super(); this.cnt = 0; this.last = [0, 0]; }
  process(inputs, outputs, params) {
    const inp = inputs[0], out = outputs[0], n = out[0].length;
    const step = Math.pow(2, 1 - params.bits[0]), hold = Math.max(1, Math.round(params.hold[0]));
    for (let i = 0; i < n; i++) {
      if (this.cnt <= 0) { this.cnt = hold; for (let c = 0; c < out.length; c++) { const src = inp[c] || inp[0]; const x = src ? src[i] : 0; this.last[c & 1] = Math.round(x / step) * step; } }
      this.cnt--;
      for (let c = 0; c < out.length; c++) out[c][i] = this.last[c & 1];
    }
    return true;
  }
}
registerProcessor('bm-shifter', BMShifter);
registerProcessor('bm-crusher', BMCrusher);
