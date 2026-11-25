---
name: pion-raja
description: >
  Pion Raja: the user's own 3D cartoon mascot (an orange chess pawn with a gold crown, red robe and ermine
  collar) for their semi-AI YouTube Shorts. Use whenever the user asks to put Pion Raja / "pion" into a video,
  make Pion react or talk over a voice-over (green screen), render a castle/hospital commentary scene,
  add Pion sound effects, continue a Pion project (proj1/proj2/proj4 style), or put the original Pion in the
  3D "AAA" throne room (Blender background, real shadows, room light and per-emotion lighting on Pion: castle3d/),
  flood / underwater scenes (water_fx), or an animated three.js 3D world with Remotion explainer text (Mode 4:
  city, landmarks, morphing objects, falling objects, camera moves; PANDUAN_DUNIA3D.md, examples/proj7).
  Renders locally with WebGL2 + Playwright + ffmpeg (+ Blender's bpy for castle3d); no AI image/video API needed.
---

# Pion Raja

Pion Raja is the creator's own character, rendered procedurally (no external assets or libraries).
Look: orange round head, gold five-point crown, red pawn body, white ermine collar and robe edges,
thick dark toon outline, white-glove hands that appear only for gestures. See `reference.png`.

**Read `BRIEF_KONTEN.md` and `ATURAN.md` before starting any new project**, and `PANDUAN_SINEMATIK.md` for any full-animation or 3D-world video. It holds the creator's mandatory rules
(4K output, frame-by-frame review, eye placement on the focus point, no teleport spam, maximal interaction,
no subtitles, dramatic hook, SFX on every action). Talk to the user in Indonesian.

## Files

| Path | What |
|---|---|
| `engine/` | The renderer. `engine.js` (WebGL2 model + toon shading + spring physics), `render.js` (per-frame scene), `react.js` + `castle.js` (reaction mode, castle/hospital backgrounds), `timeline.js` (example in-video timeline) |
| `engine/drive.js` | Renders an in-video plan to transparent PNG frames, in parallel |
| `engine/react_render.js` | Reaction mode: voice-over + cue file -> talking Pion video |
| `engine/preview.js` | Quick contact sheet of the character with no video |
| `engine/camplan.js`, `engine/moods.json` | Camera plan (zoom/corner/roll per atmosphere) and the expression -> mood map, shared by engine and castle3d |
| `engine/microzoom.py` | Micro zoom (punch-in every few words) on any finished video, same rules as the `autozoom` cue |
| `engine/sfx.py` | Procedural cartoon SFX (no samples) + mixer |
| `engine/smooth_track.py` | Removes tracking jitter from `anchors.json` / `track.json` without sliding (keeps cuts, frozen frames, sudden moves) |
| `engine/integrate.py` | Composites Pion into footage: matches sharpness, light wrap, matching grain (used by the example `composite*.py`) |
| `engine/track.py`, `objtrack.py`, `verify.py`, `comp.py`, `plan.py` | Tools from the first project (tracking, plan, checks) |
| `PANDUAN_REAKSI.md` | Full user-facing guide to reaction mode and the cue format (Indonesian) |
| `PERUBAHAN.md` | Changelog of the engine |
| `examples/proj1`, `proj2`, `proj4` | Finished projects: `plan_pN.py`, `cues/`, `sfx_events.txt`, `composite*.py`, helper grids. Copy one as a template |
| `PERBANDINGAN_V2.jpg` | Before/after of the v2 motion & shading upgrade |
| `castle3d/studio/` | Browser studio (three.js): live 3D castle + 2D Pion video plane, mood lights, the camera plan, timeline scrub, free orbit cam (`make_studio.py`) |
| `castle3d/` | Mode 3: 3D throne room in Blender + relight of the engine Pion (`build_castle.py`, `comp_pion.py`, `emotion_sheet.py`, `setup.sh`, guide `PANDUAN_ISTANA3D.md`, examples in `contoh/`) |
| `EKSPRESI.jpg`, `SOKTAHU.jpg` | All 33 expressions (+5 new in v4.1: melet gembung tiup malu sewot); the soktahu pose |
| `castle3d/water_fx.py` | Leak, wall burst, flood, underwater look, mouth bubbles, bubble rings (cues in the castle cue file) |
| `castle3d/remotion/src/SceneOverlay.tsx` | Remotion explainer layer: dimension lines glued to 3D points, counters, pops, captions, cut flashes |
| `PANDUAN_DUNIA3D.md`, `PROMPT_AI_DUNIA3D.md` | Mode 4 guide (three.js world in the castle style) and a ready-to-paste prompt for a future AI |
| `PANDUAN_KUALITAS.md`, `REFERENSI_KURVA_ZOOM.png`, `REFERENSI_ZOOM_3D.jpg`, `PERBANDINGAN_KUALITAS.jpg`, `engine/camease.js`, `tools/refs_analysis/qc_kualitas.py` | **Production quality measured on the 14 detective references**: zoom curve = easeInOutSine (216 zooms tracked), 0.8-1.6 s 3D camera moves eased in log space, 1 in 3 is a pull-out, small settles, drift; brightness/black/highlight targets (mysterious is not crushed black); world density, captions, motion blur export, loudness. `camease.js` = camera keyframe kit for plans; `qc_kualitas.py` = OK/!! report of a final video vs the references (Indonesian) |
| `PANDUAN_VIRAL.md` | **Why the 14 detective references went viral, measured** (STT word timing, loudness, hook/ending frames): hook in the first 0.2 s, script structure in % of runtime, zero pauses > 0.34 s, 3.7 words/s, -14 LUFS, loop ending, title formulas, our gaps vs the references, and the pre-render checklist (Indonesian) |
| `PANDUAN_SINEMATIK.md`, `REFERENSI_CAHAYA.jpg`, `REFERENSI_KAMERA.jpg` | **Cinematic style learned from the user's 15 reference Shorts** (measured frame by frame): story beats, hook spotlight, night shift on "But/Until one night", white-flash payoff, practical lights, god rays, DOF, continuous fly-through camera (a move every ~1.65 s, 0.6 s sine ease, +2%/s drift), one-word captions. Read before any full-animation project |
| `engine/render.js` `drawPiece` + cue `piece <knight\|rook\|bishop\|queen\|pawn>` | Other chess pieces for the detective series, same rig/face/arms as Pion, never red. `castle3d/remotion/src/CastSheet.tsx` makes the cast sheet |
| cue `style2d` + `outfit <daniel\|police>` | **2D reference look** for every model (Pion and the pieces): orthographic eye-level camera (no perspective), painted airbrush gradient instead of 3D lighting (one-sided soft core shade, slight darker silhouette, faces almost flat, tinted by the scene light), original colours kept (Pion: red head with orange gradient), bare shapes (head, body, piece forms) flat with no volume while clothes/accessories carry the light (core shade + lit-side rim strip), graphic cool cast shadows (hat on forehead, head on collar), painted cloth textures with stitching (video-14 look), no gloss, near-black ink outline x1.3, thin ink stick arms. Outfits are shells that follow the piece profile (shirt, vest, tie, collar, belt, cap...); add new outfits in `outfitKit`/`outfitParts` per story |
| `castle3d/remotion/src/GreenFX.tsx` | Green-screen FX: words flying out of a mouth (`BossWords`), spit spray at the camera (`BossSpit`) |
| **`BRIEF_KONTEN.md`** | **Read FIRST for any new Pion video**: every user rule and decision from "The Photograph" (format, workflow, 2D look, world built to Pion's scale, characters inside the world with clear shadows, moods, no captions, data words, SUCCIFY name, loud VO + genre backsound, technical traps) |
| `PANDUAN_INTEGRASI3D.md`, `REFERENSI_INTEGRASI.jpg`, `REFERENSI_SUDUT.jpg` | How the 2D character sits INSIDE the 3D world (`charlayer.js`): full depth occlusion, set light + received shadows on the drawing, real silhouette shadows, contact, physics; checklist so the shadow is actually visible; cartoonish outfits; **draw the character from the scene camera's angle** (`--view` from `make_view.js`, card `faceCam`, ground meshes `userData.ground`) so the feet stand on the floor. The user rejected a full 3D mesh Pion: keep the 2D look of the 15 references |
| `examples/proj10_photograph/` | **Template for the next 3D-world video** (approved code of "The Photograph" + charlayer): 3 sets, render runner, plan lib, film assembly, Remotion data words, stem audio mix, SFX list, tools |
| `examples/proj6`, `examples/proj7` | Flood/underwater project; Las Vegas Sphere project (three.js city, Remotion overlay, SFX, assembly) |

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
   `cam`, `shake`, `photo`, `say`, `word` (word timing only, never drawn; drives `autozoom`), effects (`aha`, `ask`, `sweat`, `anger`, `money`, `stamp`, `poof`...).
   - Expressions: datar imut senang kaget penasaran curiga pusing sinis ngakak duit marah sakit kecewa ragu licik
     nangis tersedu girang bahagia cium lega gemas syok kesal ngiler merajuk memelas bosan cemas bangga ngamuk santai soktahu
     (`soktahu` = "well, actually" face: puts thick nerd glasses on and, unless another gesture covers it,
     takes the `nerd` pose by itself: right index finger up, an open "THE BOOK OF LARP" in the left hand, as if reading it)
   - Gestures: up cheer present shrug wave point press clap lookout dance facepalm knock cross think phone paper throw hang fist write magnify nerd crownlift
     (`crownlift`: one hand lifts the crown off, the bald head glints, the other hand points at it, then the crown goes back on)
   - `bg castle` / `bg hospital` puts Pion in a full commentary scene instead of green screen.
   - `light dir x y z key r g b amb r g b sky .. gnd .. rim .. exp v` overrides the toon light (to match a 3D plate).
   - `soktahu` also brings the "enlightenment" glow: the open book flares gold onto his face for ~1.5 s, then dims.
   - `<t> autozoom [N] [strength]` / `<t> autozoom off`: camera plan (`engine/camplan.js`, shared with Remotion):
     smooth eased step zooms 1.18 -> 1.34 -> 1.5x every N `word` cues, held until the next key (no overshoot or
     settle), "!" words go straight to 1.5x; each lighting mood ("atmosphere", `engine/moods.json`) holds its own
     corner offset + dutch angle; every mood change zooms back out to normal first.
   - `acting <0..2>` (default 1): automatic acting layer (weight-shift sway, lean-in while talking, bounce/nod on
     stressed syllables, hop on "!" words, a head-tilt "take" on every expression change, idle glances).
   - `<t> light ...` (timed light cue, 0.4 s crossfade). `react_render.js` also writes `<out>_track.json`
     (Pion's base/ground/head in screen pixels per frame) and `--camplan file.json` dumps the camera keys.
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

1. Setup once: `bash .claude/skills/pion-raja/castle3d/setup.sh` (EGL libs, `bpy==5.2.4` in `/opt/bpyenv`, engine copy,
   Remotion packages).
   Finished video in one command: `python3 castle_video.py --cues cues.txt --audio vo.wav --out pion.mp4 --res 1080x1350`
   Props v4: `<t> coin <dur>` + `gest toss` / `gest cointhrow` (teal "!!" brilliant coin flipped, then thrown at the lens
   until it fills the frame), `gest pouch` (empty coin purse, moth + dust), `<t> hearteyes <dur>` (jelly heart eyes),
   `gest deathnote <dur>` (book appears, torn from the middle, halves thrown down) + `<t> stomp <dur>` (hops on them),
   `<t> stat <dur> "LABEL" <value> from=.. prefix=$` (Remotion counting card), `<t> autozoom N amt pola` (3 in, 1 out).
   Camera centring: while Pion talks his tracked FACE is the exact centre of every zoom (no corner offsets);
   `<t> zoomitem <coin|pouch|book|floorbook|sebum|button|handL|handR> [z] [dur]` centres a held item (positions are in
   the engine's `_track.json` `items`), then `<t> zoomto 1.0 0 0 0 0.3` zooms back out to the face/whole scene.
   Term titles: `<t> callout <dur> "TERM" ["subtitle"] [top|bottom] [label="..."]` (Remotion `Callouts.tsx`, above the
   camera layer: gold label, letter-by-letter reveal, sweeping gold rule, subtitle). Also `<t> mood X` pins the lighting
   mood, `<t> zoomto z oy ox roll dur` adds a manual camera key, defaults are 60 fps and `--eframe auto` (nothing cut).
   (per-mood clean plate + moving shadow pass + light pass, engine frames with timed mood lights and a position track,
   per-frame composite where Pion's floor shadow and the room light follow him, mood crossfades, then the Remotion
   finisher `castle3d/remotion` applies the camera plan with camera motion blur, vignette and audio).
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

## Mode 4: animated 3D world (three.js) + Remotion text

For white screens that need a moving 3D world (camera zoom-outs, objects that morph or fall, Pion growing or
flying). Read `PANDUAN_DUNIA3D.md` first; `examples/proj7` is the template.
1. Engine Pion frames (`--png --bg black --size 1080x1920`, `frame full`) with a `light` cue that matches the scene sun.
2. `examples/proj7/scene`: `npm install three@0.186.0 @pmndrs/assets@1.7.0`, edit `scene.js` (world + SHOTS
   timeline), `node render_scene.js w1 out/w1` (frames + `pts.json` with tracked 3D points on screen).
   Castle-style look: AgX + punchy grade, GTAO, Freestyle-like ink from depth/normal edges, golden-hour sun,
   bump maps, bloom on emissives only, vignette; cartoon shapes (RoundedBox, bright colours).
   Pion = billboard of the engine frames, shadow on layer 1, composited after AgX and before the grade.
3. `overlay.py` -> Remotion `SceneOverlay` (dimension lines, counters, pops, captions, zoom-blur cuts, intro video).
4. `sfx/gen.py` (ElevenLabs SFX v3, one request at a time) + `sfx/build_sfx.py`; `assemble.py` puts it all in the video.

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
- When Pion speaks: mouth/jelly driven by audio. The engine draws no subtitles (removed on the creator's request).
