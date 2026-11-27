# BeatMatch — two-deck tempo sync with FX

Created by **PREM CHANDRAN** (Mixed Signal Game Studios)

Two decks that each play a **YouTube video** or an **audio file**. You can set the tempo, sync the speeds, line up the beats, and add effects.

## Run it

YouTube embeds need a real web address, so serve the folder rather than double-clicking the file:

```
cd beatmatch
python3 -m http.server 8000
```

Then open http://localhost:8000 in Chrome or Edge. Audio files and the demo tracks also work if you open `index.html` directly.

## Tooltips

Hover over any button, slider, menu or display for a short explanation, including its keyboard shortcut where there is one. On a touch screen, press and hold. Hot-cue tooltips show the cue's time.

## Simple view and full controls

New visitors start in **Simple view**, which shows only what you need to pick songs, play them and crossfade. **Show all controls** (top right) reveals everything, and **Simple view** takes you back. The app remembers your choice.

## Walkthrough

Click **▶ Walkthrough** in the top-right corner. It also opens by itself on your first visit. Pick a chapter from the menu:

| # | Chapter | Steps | What you learn |
|---|---|---|---|
| 1 | Quick start (simple view) | 4 | Load two songs, play, crossfade, then reveal everything |
| 2 | Getting started | 4 | The practice songs, a deck, the waveform, play |
| 3 | Matching beats | 6 | BPM, AUTO/TAP, the beat meter, SYNC, nudging, Beat Lock |
| 4 | Mixing | 4 | Crossfader, EQ and kills, one-press transitions, hot cues |
| 5 | **Mixer in action (live demo)** | 15 | Every mixer control demonstrated on playing tracks: beat meter, Beat Lock, crossfader, all 5 transitions, every FX pad, quantize, sound masking |
| 6 | Effects | 8 | Loop roll, gate and brake, filter, echo and tape, reverse, pads, masking, visuals |
| 7 | Video mix & controllers | 2 | VJ screen, MIDI controller |
| 8 | Sets, recording & sessions | 5 | Playlist, Auto-DJ, recording, sessions, FX presets |
| 9 | Your own music | 3 | YouTube links, song files, AUTO on YouTube |

Each step has a **Try it** action and a **Do it for me** button. Live-demo steps also say what to **🎧 Listen for**. **▶ Auto-play chapter** runs a whole chapter hands-free, like a guided show. The live demo uses your own loaded tracks if both have a BPM, otherwise the practice songs. Each chapter gets the practice songs ready itself, and finished chapters get a ✓.

## Waveforms and EQ

- **Scrolling waveform** (top strip): about 6 seconds around the white playhead. Solid blocks are kicks and the white core is treble. Bar lines are numbered, beats show as ticks, and hot cues show as coloured flags. Click to jump.
- **Overview** (thin strip): the whole song, with elapsed and remaining time, a line every 16 bars, and cue markers. Click or drag to jump. A jump on a synced deck lands on the beat. YouTube decks show a progress bar here, because the app can't read YouTube audio to draw a waveform.
- **EQ** (audio files): LOW, MID and HIGH sliders from −26 to +6 dB, with a KILL button for each band. Double-click a slider to reset it. **BLEND** transitions fade out the outgoing deck's bass (a bass swap).

## Playlist, Auto-DJ, recording, sessions

- **Playlist:** add YouTube links, song files or the demos. **A** and **B** load a track onto a deck, and the arrows reorder.
- **Auto-DJ:** plays the list in order. Near the end of each song it loads the next one, syncs it and blends over 8, 16 or 32 beats, then stops the old deck. Files are analysed automatically. A YouTube video needs a BPM saved from an earlier AUTO or TAP, otherwise Auto-DJ fades it in without beat sync.
- **Record:** captures everything you hear. Download the recording (WebM/Opus), or press **Save as WAV**. With a YouTube deck loaded, recording uses tab audio (Chrome/Edge asks once).
- **Sessions:** save both decks (song, position, speed, BPM, cues, EQ, effects), the mixer and the playlist by name, or **EXPORT** them to a file and **IMPORT** it later. Audio files have to be reopened with FILE… because browsers don't let a page reopen files by itself.
- **FX presets:** 8 built in (Dub echo, Underwater, Old radio, Build-up, Breakdown, Strobe party, Noir lo-fi, Clean). Save your own from either deck.

## Test audio (`test-audio/`)

| File | BPM | Use it to test |
|---|---|---|
| `demo_A_120bpm.wav` | 120 | Basic sync against B (house groove, breakdown at bar 25) |
| `demo_B_126bpm.wav` | 126 | Speed matching: SYNC should set 0.952× when following A |
| `demo_C_63bpm_halftime.wav` | 63 | Half/double-time matching: SYNC against B treats it as 126 BPM at 1.00× |

Every file starts with a kick at exactly 0:00. The BPM is in the filename, so BeatMatch fills in the tempo and beat grid when you load the file with **FILE…**. You can name your own files the same way (`mytrack_124bpm.wav`). To make new test tracks, run `python3 tools/make_test_audio.py`.

### 5-minute test plan
1. Load `demo_A` on Deck A and `demo_B` on Deck B. Press play on both. The offset meter should keep sliding.
2. Press **SYNC** on B. Speed should show **0.952×**, playing BPM **120.0**, and the needle should sit in the green band.
3. Press **+100ms** on B to hear the flam, then turn on **BEAT LOCK**. B should snap back within about 3 seconds.
4. Load `demo_C` on Deck A and press **SYNC** on B. The message should say it matched as half/double-time.
5. Try each effect below while both decks play.

## Auto BPM, hot cues, video mix, MIDI

**AUTO** (on each deck) finds the BPM and the beat position.
- Audio files are analysed straight away from the decoded audio.
- YouTube decks: the app listens to this tab for 10 seconds with that deck soloed. The first time, Chrome or Edge asks what to share: choose **This tab** and turn on **Share tab audio**. The mixer's AUTO BPM section shows whether tab audio is connected.
- **CALIBRATE** (optional): play a demo track and press it. The app measures your computer's capture delay and saves it as the capture offset. Two YouTube decks stay in sync with each other even without this, because both have the same delay.
- The detector snaps to a whole BPM when the result is within 0.12 of one. It warns you when its confidence is low.
- Detection is tested in `tools/beatdetect.js` (a Node test). On the test tracks it gets the BPM exact and the beat within about 2 ms, including with heavy noise and at 0.95× speed.

**Hot cues 1–8:** click an empty cue to save the current spot, snapped to the beat. Click a saved cue to jump there. The jump keeps your place inside the beat, so a synced deck stays synced. Shift+click, or DEL then a cue, deletes it. **BPM, beat grid and cues are remembered for each YouTube video and each file** (stored in this browser).

**Video mix (VJ):** both decks' videos appear on one floating stage, or in fullscreen.
- **Crossfade** follows the crossfader.
- **Beat cuts** switches deck every beat, 2 beats, bar or 2 bars while the fader is mid-way, and holds one deck when the fader is near an end.
- **Split screen** and **Picture in picture**, where the louder deck is the big one.
- Audio-file decks show their visualizer. Visual FX still apply.

**MIDI controller:** press CONNECT MIDI, then LEARN. Click any button or slider and move or press something on your controller. Hold-style buttons (rolls, reverse, bleep) work as holds. Jog wheels (relative encoders) are detected automatically. Mappings are saved, and mapped controls get a blue underline. CLEAR removes them all. Playlist, Auto-DJ and REC buttons can be mapped too.

## Effects

**Per deck: works on YouTube and audio files**
- **Loop roll 2 / 1 / ½ / ¼** (hold): repeats a beat-sized slice. When you let go, the track resumes where it would have been (slip mode). On YouTube, use ½ or longer.
- **Gate ¼ / ⅛ / 1/16 / TRANCE**: chops the volume in time with the beat.
- **BRAKE**: slows the deck to a stop. On audio files the pitch dives like a turntable.
- **BLEEP** (hold): masks the deck with a censor tone, like a radio edit.
- **Visual FX**: strobe, hue step, invert on 2 and 4, blur pulse, zoom pump and noir, all in time with the beat.

**Per deck: audio files only** (a web page can't process YouTube's audio)
- **Filter**: left gives a low-pass (muffled) sound, right gives a high-pass (thin) one.
- **ECHO ¾ / ECHO OUT**: a delay locked to the tempo. ECHO OUT fades the track into its echo and stops it.
- **TAPE ECHO / DIVE ↓ / RISE ↑ / Warble**: a tape-style delay with wow, flutter and saturation. DIVE and RISE change the tape speed, so the echoes bend down or up in pitch.
- **REVERSE** (hold): backmasking. The audio plays backwards while the real track keeps running silently underneath.
- **BACKSPIN**: a fast reverse spin-down, then stop.
- **KEY LOCK**: keeps the pitch the same when you change speed.

**Mixer**
- **Transitions** (start on the next bar): BLEND 8, BLEND 16, CUT @ BAR, BRAKE OUT, ECHO OUT → CUT.
- **FX pads**: AIR HORN, RISER, IMPACT, SIREN, LASER, SNARE ROLL. They are synthesized, follow the tempo and wait for the beat when QUANTIZE is on. They also have their own echo.
- **Sound masking**: a white, pink, brown or vinyl-crackle noise layer with level and tone controls. PUMP ducks it on every beat.

## Keys
Q / P tap A / B · 1 / 0 play A / B · N M nudge A · Z X nudge B · ← → crossfader · A S D F G H pads · Esc closes the tour.

## Limits
- YouTube doesn't let a web page process its audio. Auto BPM gets around this by listening to the tab, with your permission. Filter, echo, tape, reverse and backspin still need audio files, because the original YouTube sound always plays directly.
- Tab-audio capture and MIDI need Chrome or Edge on a computer, opened from `localhost` or `https`.
- Some YouTube videos only allow coarse speed steps such as 1.25×. The app warns you when that happens, and BEAT LOCK keeps the beats together.
- Videos whose uploader has turned off embedding will show an error.
