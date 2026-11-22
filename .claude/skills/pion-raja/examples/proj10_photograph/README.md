# proj10_photograph: template for the next detective / 3D-world Pion video

Approved pipeline of "The Photograph" (73.4 s, 1080x1920, 60 fps), plus the character-in-world layer the user asked for next.
Full project (all plans, cues, assets, history): `projects/the_photograph/`. Rules and every user decision: `../../BRIEF_KONTEN.md`.

## What is in here
| File | What |
|---|---|
| `scene/office.js`, `apartment.js`, `exterior.js` | three sets, built to Pion's scale (a pawn ~1.03 m): office (pendant lamp, case board, door with light under it, calendar that tears, laptop with a live screen), abandoned apartment in 3 versions (A photo world / B searched / C crime scene), dusk street. Moods / versions switch the light |
| `scene/charlayer.js` | **the characters INSIDE the world** (2D engine drawing kept, like the 15 references): full depth occlusion, set lights + received shadows on the drawing (two-sided paper cut-out light), real silhouette shadow from a light-facing proxy, contact blob vs height, dust puffs, squash. See `../../PANDUAN_INTEGRASI3D.md` |
| `scene/charpresets.js` | v2: character presets (`detective`, `police`, `civilian`, `victim` lying flat, `seated`) + character light presets per set/mood |
| `plans/test_integ.js` | v2 integration test: 24 shots (orbit, near/far, low/high, lift, seated, lying, warm/cool, rim off/on, occlusion) |
| `scene/render_seq.js` | renders a plan (frame range, `--skip`, several sets in one plan, engine tracks scaled for 4K engine renders) |
| `plans/lib.js` | camera keys (`io` = a fly move with sine ease, `lin` = drift), scalar keys |
| `plans/*.js` | examples: office hook + envelope + dive into a photo (`s12`), physical hops (`s6`), crime scene with 3 characters (`s78`), street (`s5`), the photo camera (`photo_still`) |
| `build_film.py` | joins the scene renders into one film sequence: crossfades, a photo laid exactly over a scene, colour lift, black end |
| `overlay_film.py` | Remotion captions (`cap`, auto from the VO word timings: plain for all narration, first-person narration included; name pill "SUCCIFY" + big text only inside `DIALOG` ranges of in-scene dialogue with the speaker on screen) + data words (`word`: "11:42", "FRIDAY", "NO BODY"...) glued to tracked 3D points |
| `mix_film.py` | stems: VO -13 LUFS, music score in parts -22, SFX -18 (each file peak-normalised, auto whoosh on every camera move, risers before the turns, hits on data words), limiter -1.5 dBTP, + `sfx_only` |
| `sfx_gen.py` | ElevenLabs SFX v3 list (music loops too: free plan has no Music API; watch the credit quota) |
| `assemble.sh` | check -> build -> overlay -> mix -> mux |
| `tools/` | **`make_view.js`** (per-frame engine view [orbit, tilt] from the scene camera, so the character is drawn from the camera's angle and stands ON the floor), `sheet.sh` contact sheets, `make_photo.py` (a still of a set -> aged photo front + handwritten back), `make_reflection.py` (silhouette reflection) |

## Workflow per scene (what the user wants)
1. Plan + cue, commit. 2. Engine render (lip-sync VO), then the scene render; split ranges (background jobs max 2 h; use `nohup`, the app kills long waits).
3. Contact sheet, fix, commit plan + cue + a test (never the raw frames). 4. At the end: overlay, SFX + `sfx_only.wav`, assemble, check, send.

## Setup
Same as `projects/the_photograph/setup.sh` (engine copy, Remotion, three@0.186.0, Caveat font). Symlink the scene modules/plans/cues into
`~/pion/projN/` so edits land in git; copy the node runners (node resolves `__dirname` through symlinks).
