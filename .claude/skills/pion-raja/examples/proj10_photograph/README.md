# proj10_photograph: template for the next detective / 3D-world Pion video

Approved pipeline of "The Photograph" (73.4 s, 1080x1920, 60 fps), plus the character-in-world layer the user asked for next.
Full project (all plans, cues, assets, history): `projects/the_photograph/`. Rules and every user decision: `../../BRIEF_KONTEN.md`.

## What is in here
| File | What |
|---|---|
| `scene/office.js`, `apartment.js`, `exterior.js` | three sets, built to Pion's scale (a pawn ~1.03 m): office (pendant lamp, case board, door with light under it, calendar that tears, laptop with a live screen), abandoned apartment in 3 versions (A photo world / B searched / C crime scene), dusk street. Moods / versions switch the light |
| `scene/charlayer.js` | **the characters INSIDE the world** (2D engine drawing kept, like the 15 references): full depth occlusion, set lights + received shadows on the drawing (two-sided paper cut-out light), real silhouette shadow from a light-facing proxy, contact blob vs height, dust puffs, squash. See `../../PANDUAN_INTEGRASI3D.md` |
| `scene/render_seq.js` | renders a plan (frame range, `--skip`, several sets in one plan, engine tracks scaled for 4K engine renders) |
| `plans/lib.js` | camera keys (`io` = a fly move with sine ease, `lin` = drift), scalar keys |
| `plans/*.js` | examples: office hook + envelope + dive into a photo (`s12`), physical hops (`s6`), crime scene with 3 characters (`s78`), street (`s5`), the photo camera (`photo_still`) |
| `build_film.py` | joins the scene renders into one film sequence: crossfades, a photo laid exactly over a scene, colour lift, black end |
| `overlay_film.py` | Remotion data words (`word` item: big bold "11:42", "FRIDAY", "NO BODY"...) glued to tracked 3D points. No captions (user) |
| `mix_film.py` | stems: VO (-13 LUFS, compressed, as loud as it goes), music score in parts (-24 LUFS), SFX + ambiences (-25 LUFS), limiter -1.5 dBTP, + `sfx_only` |
| `sfx_gen.py` | ElevenLabs SFX v3 list (music loops too: free plan has no Music API; watch the credit quota) |
| `assemble.sh` | check -> build -> overlay -> mix -> mux |
| `tools/` | `sheet.sh` contact sheets, `make_photo.py` (a still of a set -> aged photo front + handwritten back), `make_reflection.py` (silhouette reflection) |

## Workflow per scene (what the user wants)
1. Plan + cue, commit. 2. Engine render (lip-sync VO), then the scene render; split ranges (background jobs max 2 h; use `nohup`, the app kills long waits).
3. Contact sheet, fix, commit plan + cue + a test (never the raw frames). 4. At the end: overlay, SFX + `sfx_only.wav`, assemble, check, send.

## Setup
Same as `projects/the_photograph/setup.sh` (engine copy, Remotion, three@0.186.0, Caveat font). Symlink the scene modules/plans/cues into
`~/pion/projN/` so edits land in git; copy the node runners (node resolves `__dirname` through symlinks).
