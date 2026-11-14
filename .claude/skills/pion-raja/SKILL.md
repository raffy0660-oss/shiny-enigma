---
name: pion-raja
description: >
  Pion Raja: the user's own 3D cartoon mascot (an orange chess pawn with a gold crown, red robe and ermine
  collar) for their semi-AI YouTube Shorts. Use whenever the user asks to put Pion Raja / "pion" into a video,
  make Pion react or talk over a voice-over (green screen), render a castle/hospital commentary scene,
  add Pion sound effects, continue a Pion project (proj1/proj2/proj4 style), or put the original Pion in the
  3D "AAA" throne room (Blender background, real shadows, room light and per-emotion lighting on Pion: castle3d/).
  Renders locally with WebGL2 + Playwright + ffmpeg (+ Blender's bpy for castle3d); no AI image/video API needed.
---

# Pion Raja

Pion Raja is the creator's own character, rendered procedurally (no external assets or libraries).
Look: orange round head, gold five-point crown, red pawn body, white ermine collar and robe edges,
thick dark toon outline, white-glove hands that appear only for gestures. See `reference.png`.

**Read `ATURAN.md` before starting any new project.** It holds the creator's mandatory rules
(4K output, frame-by-frame review, eye placement on the focus point, no teleport spam, maximal interaction,
karaoke subtitles, dramatic hook, SFX on every action). Talk to the user in Indonesian.

## Files

| Path | What |
|---|---|
| `engine/` | The renderer. `engine.js` (WebGL2 model + toon shading + spring physics), `render.js` (per-frame scene), `react.js` + `castle.js` (reaction mode, castle/hospital backgrounds), `timeline.js` (example in-video timeline) |
| `engine/drive.js` | Renders an in-video plan to transparent PNG frames, in parallel |
| `engine/react_render.js` | Reaction mode: voice-over + cue file -> talking Pion video |
| `engine/preview.js` | Quick contact sheet of the character with no video |
| `engine/sfx.py` | Procedural cartoon SFX (no samples) + mixer |
| `engine/smooth_track.py` | Removes tracking jitter from `anchors.json` / `track.json` without sliding (keeps cuts, frozen frames, sudden moves) |
| `engine/integrate.py` | Composites Pion into footage: matches sharpness, light wrap, matching grain (used by the example `composite*.py`) |
| `engine/track.py`, `objtrack.py`, `verify.py`, `comp.py`, `plan.py` | Tools from the first project (tracking, plan, checks) |
| `PANDUAN_REAKSI.md` | Full user-facing guide to reaction mode and the cue format (Indonesian) |
| `PERUBAHAN.md` | Changelog of the engine |
| `examples/proj1`, `proj2`, `proj4` | Finished projects: `plan_pN.py`, `cues/`, `sfx_events.txt`, `composite*.py`, helper grids. Copy one as a template |
| `PERBANDINGAN_V2.jpg` | Before/after of the v2 motion & shading upgrade |
| `castle3d/` | Mode 3: 3D throne room in Blender + relight of the engine Pion (`build_castle.py`, `comp_pion.py`, `emotion_sheet.py`, `setup.sh`, guide `PANDUAN_ISTANA3D.md`, examples in `contoh/`) |
| `EKSPRESI.jpg`, `SOKTAHU.jpg` | All 33 expressions; the soktahu pose (glasses, finger up, open book) |

## Setup (once per machine/session)

- Node + Playwright with Chromium, `ffmpeg`, Python 3 with `numpy pillow opencv-python-headless`
  (`pip install numpy pillow opencv-python-headless`). Cloud sessions already have Playwright + ffmpeg.
- Workspace layout the scripts expect: the engine folder named `pion_raja/` next to the project folder.
  ```bash
  mkdir -p ~/pion && cp -r .claude/skills/pion-raja/engine ~/pion/pion_raja
  cp -r .claude/skills/pion-raja/examples/proj4 ~/pion/proj5   # template for a new project
  ```
  The example `*.sh` files contain absolute `/home/user/...` paths from earlier sessions: fix them before reuse.
- Smoke test: `cd ~/pion/pion_raja && node react_render.js --audio test/vo_test.wav --cues test/cues_test.txt --out /tmp/t --preview 0.6,2.7,4.7`

## Mode 1: Reaction (Pion talks over the creator's voice-over)

1. User sends VO audio and tells what is said and when. Claude cannot hear audio; ask for the script/timing.
2. Write a cue file (format in `PANDUAN_REAKSI.md`): `frame`, expressions, `gest`, `look`, `fly`/`flyout`,
   `cam`, `shake`, `photo`, `say`, `word` (karaoke), effects (`aha`, `ask`, `sweat`, `anger`, `money`, `stamp`, `poof`...).
   - Expressions: datar imut senang kaget penasaran curiga pusing sinis ngakak duit marah sakit kecewa ragu licik
     nangis tersedu girang bahagia cium lega gemas syok kesal ngiler merajuk memelas bosan cemas bangga ngamuk santai soktahu
     (`soktahu` = "well, actually" face: puts thick nerd glasses on and, unless another gesture covers it,
     takes the `nerd` pose by itself: right index finger up, an open "THE BOOK OF LARP" in the left hand, as if reading it)
   - Gestures: up cheer present shrug wave point press clap lookout dance facepalm knock cross think phone paper throw hang fist write magnify nerd crownlift
     (`crownlift`: one hand lifts the crown off, the bald head glints, the other hand points at it, then the crown goes back on)
   - `bg castle` / `bg hospital` puts Pion in a full commentary scene instead of green screen.
   - `light dir x y z key r g b amb r g b sky .. gnd .. rim .. exp v` overrides the toon light (to match a 3D plate).
   - `soktahu` also brings the "enlightenment" glow: the open book flares gold onto his face for ~1.5 s, then dims.
3. Check first: `node react_render.js --audio vo.m4a --cues cues.txt --out out/r1 --preview 1,2.5,4` and look at the sheet.
4. Render: `node react_render.js --audio vo.m4a --cues cues.txt --out out/r1 --size 2160x3840` (4K).
   `--bg green,black`, `--alpha` (ProRes 4444 .mov), `--png`, `--start/--dur/--local` for a section.
   Motion blur is on by default (`--blur 16`, `--shutter 0.4`); use `--blur 1` for quick drafts.
5. Deliver `*_green.mp4`; the CapCut chroma-key steps are in `PANDUAN_REAKSI.md`.

## Mode 2: Pion inside the creator's video (overlay, tracked)

Follow `examples/proj4` (newest). Per project folder with `src/input.mp4` (1080x1920, 30 fps):
1. **Study every frame first**: `python3 grid.py sheet.jpg 0,15,30,... 8` and `zgrid.py` (zoomed region). Note shots,
   focus points, solid surfaces, the white "commentary" screens and their frame ranges.
2. **Track anchors** on surfaces/objects Pion stands on or touches: edit `JOBS` in `track_pts.py` -> `anchors.json`.
   Then **always** de-jitter: `python3 ../pion_raja/smooth_track.py anchors.json` (raw copy kept as `anchors_raw.json`;
   it prints jitter before/after and the max shift, which should stay a few px). Same tool works on proj1-style `track.json`.
3. **Plan**: edit `plan_pN.py` (helpers `stand`, `drop`, `launch`, `jump`... per frame; plus expression/gesture/fx
   timeline and `SHOTCAM`) -> writes `plan.json` and `timeline_pN.js`. Keep Pion on the focus point and on solid ground.
4. **Ambient light thumbs**: `ffmpeg -i src/input.mp4 -vf scale=36:64:flags=area -f rawvideo -pix_fmt rgb24 thumbs.raw`
5. **Render Pion layer** (4K):
   `PLAN=$PWD/plan.json THUMBS=$PWD/thumbs.raw PAGE=$PWD/index_pN.html RW=2156 RH=3840 node ../pion_raja/drive.js out4k/vframes <frames|a-b|all>`
   (`index_pN.html` loads `../pion_raja/engine.js`, the project timeline, then `../pion_raja/render.js`.)
   Motion blur is on by default (`BLUR=16`, `SHUTTER=0.4`, centred shutter, smear capped so Pion stays readable).
   Use `BLUR=1` for fast drafts / checks; the final 4K render with blur takes roughly 6-9x longer on fast scenes.
   Optional: `autoDir: true` in a `SHOTCAM` entry takes the key-light side from the footage (shadow falls to the darker side).
6. **White screens -> castle scenes**: one cue file per white segment (`cues/whiteN.txt`, `bg castle`), rendered with
   `react_render.js --audio src/input.mp4 --start S --dur D --local --size 2156x3840 --bg black --png`.
7. **SFX**: `python3 ../pion_raja/sfx.py sfx_events.txt sfx_only.wav --mix src/input.mp4 mix.m4a`
   (`--demo demo.wav` lists every sound). Always also deliver `sfx_only.wav`.
8. **Composite**: set `WHITES`, `TRANS` (zoom-blur cuts) in `composite4k.py`, run it, then mux `mix.m4a`.
   The example composites call `integrate.over()` for every Pion layer (sharpness match, light wrap, grain), so
   Pion looks shot by the same phone. For an older project's composite, replace its plain alpha blend with it.
9. **Review every frame of the result** (contact sheets, `compcheck.py`) and fix before delivering.

## Mode 3: original Pion in the 3D castle (castle3d/)

Pion stays the engine character; Blender renders only the room, his real shadow and the room's light on him.
Full guide (Indonesian): `castle3d/PANDUAN_ISTANA3D.md`.

1. Setup once: `bash .claude/skills/pion-raja/castle3d/setup.sh` (EGL libs, `bpy==5.2.4` in `/opt/bpyenv`, engine copy).
2. Fast path, one frame per mood: `cd castle3d && python3 emotion_sheet.py --out out.png --res 1080x1350 --samples 48 --only hangat,marah`
   (moods: hangat marah sedih kaget licik duit misteri pencerahan; `--res 432x540 --samples 16` to check quickly).
3. Manual: `build_castle.py --proxy --bbox b.json --lightpass lp.png --mood chandelier --emotion <mood|expression>`
   renders the plate (hidden Blender Pion casts the shadow), Pion's screen box and the light pass; render the engine
   Pion with the matching `light` cue (`emotion_sheet.PRESETS`); `comp_pion.py` places it on the proxy, multiplies
   the light pass in cel bands (majority-vote cleanup), adds light wrap, contact shadow, grain and the mood grade.
4. Room: marble chessboard floor, red carpet, big gold throne whose crest and crown clear Pion's head, coffered gold
   barrel vault, stained glass, brass chandelier facing down, torches, chests and coins, stone chess statues, haze,
   Freestyle black ink on every object. Framing: Pion about 60 % of the frame (9:16 and 4:5 each framed).
5. Video: camera static per scene, so render each mood plate + light pass once and composite every engine frame.
   Keep the Blender proxy at engine proportions (crown not enlarged), or a dark dot appears mid-face.

## What the engine does automatically (v2)

- Motion blur (both modes): centred shutter, sample count adapts to how far Pion moves; still frames stay sharp.
- Crown follow-through: the crown lags the head, tips and settles a beat later.
- Anticipation + landing read from the plan: crouch before any hop/jump/launch, squash-and-rebound after touchdown;
  in reaction mode a crouch-and-stretch before `flyout`.
- Shadows: 16-sample soft area-light shadow that fades with height, tight contact shadow under the base,
  ambient occlusion under the collar and crown; softer two-layer contact shadow in castle/hospital scenes.
- Deterministic: parallel jobs give byte-identical frames to a single job (checked).

## Rules of thumb

- Size: not too small, not too big; bigger only for the hook and close-ups.
- Entrances: jump, drop from above, slide, fly. Scene changes: fly to camera + zoom-blur.
- Interact with people/objects in the shot; Pion never floats in empty space or sits in a corner.
- When Pion speaks: karaoke subtitle + mouth/jelly driven by audio.
