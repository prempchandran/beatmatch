// Node test for tools/worklet.js: run `node tools/worklet.test.js`
const fs = require('fs'), path = require('path');
const procs = {};
global.AudioWorkletProcessor = class {};
global.registerProcessor = (name, cls) => { procs[name] = cls; };
eval(fs.readFileSync(path.join(__dirname, 'worklet.js'), 'utf8'));

const SR = 44100, Q = 128;
function run(name, sig, params) {
  const p = new procs[name](), out = new Float32Array(sig.length);
  for (let i = 0; i + Q <= sig.length; i += Q) {
    const o = [new Float32Array(Q)];
    p.process([[sig.subarray(i, i + Q)]], [o], Object.fromEntries(Object.entries(params).map(([k, v]) => [k, [v]])));
    out.set(o[0], i);
  }
  return out;
}
// frequency by autocorrelation peak over the steady part
// dominant frequency: scan a band around the expected pitch with a Goertzel-style DFT, 0.25 Hz steps
function freq(x, around) {
  const s = x.subarray(SR * 0.2, SR * 0.95); let best = 0, bf = 0;
  for (let f = around * 0.85; f <= around * 1.15; f += 0.25) {
    const w = 2 * Math.PI * f / SR; let re = 0, im = 0;
    for (let i = 0; i < s.length; i++) { re += s[i] * Math.cos(w * i); im -= s[i] * Math.sin(w * i); }
    const m = re * re + im * im; if (m > best) { best = m; bf = f; }
  }
  return bf;
}
const rms = x => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
const sine = f => Float32Array.from({ length: SR }, (_, i) => 0.5 * Math.sin(2 * Math.PI * f * i / SR));
let ok = 0, n = 0; const check = (name, pass, info) => { n++; if (pass) ok++; console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  — ${info}`); };

const base = sine(220);
for (const [st, label] of [[0, 'no shift'], [12, '+12 semitones (octave up)'], [-12, '−12 semitones (octave down)'], [7, '+7 semitones'], [-5, '−5 semitones']]) {
  const r = Math.pow(2, st / 12), out = run('bm-shifter', base, { ratio: r }), want = 220 * r, f = freq(out, want);
  check(`Shifter ${label}`, Math.abs(f - want) / want < 0.03, `${f.toFixed(1)} Hz (want ${want.toFixed(1)}), level ${rms(out.subarray(SR * 0.3)).toFixed(3)} vs ${rms(base).toFixed(3)}`);
}
const thru = run('bm-shifter', base, { ratio: 1 });
const done = Math.floor(SR / Q) * Q;
check('Shifter at ratio 1 is an exact pass-through', thru.subarray(0, done).every((v, i) => v === base[i]), 'bit-identical');
const cr = run('bm-crusher', base, { bits: 4, hold: 8 });
const levels = new Set(Array.from(cr.subarray(1000, 5000)).map(v => v.toFixed(5)));
check('Crusher reduces resolution', levels.size <= 17, `${levels.size} distinct levels at 4 bits`);
console.log(`\n${ok}/${n} worklet checks passed`);
