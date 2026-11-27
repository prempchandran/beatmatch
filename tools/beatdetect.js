// Beat detector shared by the app (pasted into index.html) and the Node test.
// Input: mono Float32Array + sample rate. Output: { bpm, phase (s, first beat in window), conf }.
function detectBeat(x, sr, opt = {}) {
  const minBpm = opt.min || 78, maxBpm = opt.max || 170;
  const hop = Math.max(1, Math.round(sr / 200)), fps = sr / hop, nF = Math.floor(x.length / hop);
  if (nF < fps * 4) return null;
  // two-band onset envelope: low band (kick) weighted strongly, full band lightly
  const low = new Float32Array(nF), full = new Float32Array(nF);
  const a = Math.exp(-2 * Math.PI * 150 / sr); let lp = 0, lp2 = 0;
  for (let j = 0; j < nF; j++) {
    let el = 0, ef = 0;
    for (let i = j * hop, e = i + hop; i < e; i++) { const s = x[i]; lp = (1 - a) * s + a * lp; lp2 = (1 - a) * lp + a * lp2; el += lp2 * lp2; ef += s * s; }
    low[j] = Math.log(1 + 1e4 * el / hop); full[j] = Math.log(1 + 1e3 * ef / hop);
  }
  const on = new Float32Array(nF);
  for (let j = 1; j < nF; j++) on[j] = Math.max(0, low[j] - low[j - 1]) + .35 * Math.max(0, full[j] - full[j - 1]);
  // subtract a moving average so sustained loud parts don't dominate
  const W = Math.round(fps * .4), pre = new Float64Array(nF + 1);
  for (let j = 0; j < nF; j++) pre[j + 1] = pre[j] + on[j];
  const o = new Float32Array(nF);
  for (let j = 0; j < nF; j++) { const lo = Math.max(0, j - W), hi = Math.min(nF, j + W + 1); o[j] = Math.max(0, on[j] - (pre[hi] - pre[lo]) / (hi - lo)); }
  // comb filter: average onset strength on a beat grid of period P, best phase
  const comb = (bpm, phStep = .5) => {
    const P = fps * 60 / bpm; let best = 0, bp = 0;
    for (let ph = 0; ph < P; ph += phStep) {
      let s = 0, c = 0;
      for (let t = ph; t < nF - 1; t += P) { const k = Math.round(t); s += o[k] + .5 * (o[k - 1] || 0) + .5 * o[k + 1]; c++; }
      s /= c; if (s > best) { best = s; bp = ph; }
    }
    return [best, bp];
  };
  const prior = bpm => Math.exp(-.5 * Math.pow(Math.log2(bpm / 122) / 1.1, 2));
  let bestB = minBpm, bestS = -1, total = 0, n = 0;
  for (let b = minBpm; b <= maxBpm; b += .25) { const [s] = comb(b); const w = s * prior(b); total += s; n++; if (w > bestS) { bestS = w; bestB = b; } }
  let fineB = bestB, fineS = -1;
  for (let b = bestB - .4; b <= bestB + .4; b += .01) { const [s] = comb(b); if (s > fineS) { fineS = s; fineB = b; } }
  return { bpm: fineB, conf: fineS / (total / n), phaseOf: bpm => comb(bpm, .25)[1] / fps + hop / sr / 2, fps };
}
// Choose the final BPM in *track* terms (divide out playback rate), snap to a whole number when close,
// and return the first-beat time in the analysed window.
function finishDetect(r, rate = 1) {
  if (!r) return null;
  let track = r.bpm / rate;
  const whole = Math.round(track);
  if (Math.abs(track - whole) < .12) track = whole;
  else track = Math.round(track * 100) / 100;
  return { bpm: track, phase: r.phaseOf(track * rate), conf: r.conf };
}
if (typeof module !== 'undefined') module.exports = { detectBeat, finishDetect };
