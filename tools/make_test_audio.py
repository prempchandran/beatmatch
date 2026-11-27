"""Generate BeatMatch test tracks: 16-bit 44.1 kHz stereo WAVs with the first beat at exactly 0:00.

Filenames contain the BPM (e.g. demo_A_120bpm.wav) so BeatMatch fills in tempo + beat grid automatically.
Usage: python3 make_test_audio.py [output_dir]
"""
import sys, wave
from pathlib import Path
import numpy as np

SR = 44100
rng = np.random.default_rng(7)

def env_exp(n, decay_s):
    return np.exp(-np.arange(n) / (decay_s * SR))

def kick(v=1.0):
    n = int(.42 * SR); t = np.arange(n) / SR
    f = 48 + (165 - 48) * np.exp(-t / .03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return v * .9 * np.sin(ph) * env_exp(n, .12)

def hat(open_=False, v=1.0):
    n = int((.3 if open_ else .08) * SR)
    x = rng.uniform(-1, 1, n); x = np.diff(x, prepend=0) * .5      # crude high-pass
    return v * .3 * x * env_exp(n, .07 if open_ else .015)

def clap(v=1.0):
    n = int(.25 * SR); x = rng.uniform(-1, 1, n)
    e = env_exp(n, .05)
    for o in (0, .012, .024):
        s = int(o * SR); e[s:s + int(.01 * SR)] += .8
    return v * .45 * x * e

def snare(v=1.0):
    n = int(.18 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * env_exp(n, .03)
    x = rng.uniform(-1, 1, n); x = np.diff(x, prepend=0)
    return v * (.35 * body + .35 * x * env_exp(n, .045))

def rim(v=1.0):
    n = int(.06 * SR); t = np.arange(n) / SR
    return v * .3 * np.sign(np.sin(2 * np.pi * 820 * t)) * env_exp(n, .01)

def saw(f, n):
    t = np.arange(n) / SR
    return 2 * ((f * t) % 1.0) - 1

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); acc = 0.0
    for i, s in enumerate(x):
        acc = (1 - a) * s + a * acc; y[i] = acc
    return y

def bass(f, dur, v=1.0):
    n = int(dur * SR)
    x = .7 * saw(f, n) + .3 * np.sign(np.sin(2 * np.pi * f / 2 * np.arange(n) / SR))
    x = lowpass(x, 600)
    e = np.ones(n); r = int(n * .3); e[-r:] = np.linspace(1, 0, r)
    return v * .45 * x * e

def chord(freqs, dur, vol=.05, att=.02, rel=.1, cutoff=1400, square=False):
    n = int(dur * SR); x = np.zeros(n)
    for f in freqs:
        for c in (-7, 7):
            ff = f * 2 ** (c / 1200)
            x += np.sign(np.sin(2 * np.pi * ff * np.arange(n) / SR)) if square else saw(ff, n)
    x = lowpass(x, cutoff)
    e = np.ones(n); a = max(1, int(att * SR)); r = max(1, int(rel * SR))
    e[:a] = np.linspace(0, 1, a); e[-r:] = np.minimum(e[-r:], np.linspace(1, 0, r))
    return vol * x * e

PROG = {'Am': (110, [220, 261.63, 329.63]), 'F': (87.31, [174.61, 220, 261.63]),
        'C': (130.81, [261.63, 329.63, 392]), 'G': (98, [196, 246.94, 293.66])}

def render(bpm, bars, pattern):
    B = 60 / bpm; total = int((bars * 4 * B + 1.5) * SR)
    out = np.zeros(total)
    def add(sig, t):
        s = int(round(t * SR)); e = min(total, s + len(sig)); out[s:e] += sig[:e - s]
    for i in range(bars * 4):
        pattern(add, i * B, B, i)
    out = np.tanh(out * 1.1) * .9
    return out

def track_a(add, t, B, i):  # Sunset House, 120 BPM
    bar, bt = divmod(i, 4); root, ch = PROG[['Am', 'F', 'C', 'G'][bar % 4]]; brk = 24 <= bar < 28
    if not brk: add(kick(), t)
    if bar >= 2: add(hat(True, .8), t + B / 2)
    if bar >= 8 and bt in (1, 3): add(clap(), t)
    if bar >= 8 and not brk: add(bass(root, B * .45), t + B / 2)
    if bt == 0 and (bar >= 16 or brk): add(chord(ch, B * 4, vol=.05 if brk else .03, att=.4, rel=.6, cutoff=900 if brk else 1800), t)

def track_b(add, t, B, i):  # Night Drive, 126 BPM
    bar, bt = divmod(i, 4); root, ch = PROG[['Am', 'Am', 'F', 'G'][bar % 4]]; brk = 20 <= bar < 24
    if not brk: add(kick(.95), t)
    if bar >= 2:
        for s in range(4): add(hat(False, .8 if s == 2 else .35), t + s * B / 4)
    if bar >= 4 and not brk:
        for s in (1, 2, 3): add(bass(root * (2 if s == 3 else 1), B / 4 * .8, .8), t + s * B / 4)
    if bar >= 6 and bt in (1, 3): add(rim(.8), t + B * .75)
    if bar >= 8 and bt == 1: add(chord([f * 2 for f in ch], B * .35, vol=.03, att=.005, rel=.05, cutoff=2600, square=True), t + B / 2)
    if brk and bt == 0: add(chord(ch, B * 4, vol=.05, att=.5, rel=.8, cutoff=1100), t)
    if bar == 23:
        for s in range(4): add(snare(.3 + .7 * (bt * 4 + s) / 16), t + s * B / 4)

def track_c(add, t, B, i):  # Slow Motion, 63 BPM half-time hip-hop (pairs with the 126 BPM track)
    bar, bt = divmod(i, 4); root, ch = PROG[['Am', 'Am', 'F', 'G'][bar % 4]]
    if bt == 0: add(kick(), t)
    if bt == 1: add(kick(.7), t + B * .75)
    if bt == 2: add(snare(1.0), t)
    if bt == 3: add(kick(.6), t + B * .5)
    for s in range(2): add(hat(False, .5 if s else .3), t + s * B / 2)
    if bar >= 2 and bt == 0: add(bass(root, B * 1.6), t)
    if bar >= 4 and bt in (0, 2): add(chord(ch, B * 1.8, vol=.035, att=.05, rel=.4, cutoff=1300), t)

def write_wav(path, mono):
    st = np.stack([mono, mono], axis=1)
    pcm = (np.clip(st, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())

if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'test-audio'); out.mkdir(parents=True, exist_ok=True)
    for name, bpm, bars, fn in [('demo_A_120bpm.wav', 120, 32, track_a),
                                 ('demo_B_126bpm.wav', 126, 32, track_b),
                                 ('demo_C_63bpm_halftime.wav', 63, 16, track_c)]:
        write_wav(out / name, render(bpm, bars, fn)); print('wrote', out / name)
