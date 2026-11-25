# The Mona Lisa Heist (73 s, 1080x1920, 60 fps)

VO: ElevenLabs (user upload), word timing from ElevenLabs STT (`~/pion/proj13/audio/stt.json`). Plan: `src/plans/film.js`. Sets: `src/scene/museum.js`
(built from `src/scene/parts/*` by `build_museum.py`) + The Photograph's office (`case` laptop screen). Thief: physics rig (`heist_sim.js`, `heist_shot.js`).

| t (s) | VO | Shot | Light |
|---|---|---|---|
| 0.0-5.6 | Someone had stolen the Mona Lisa ... without a trace. | Starts IN the fall: shadow thief drops on the rope, turns over, punches the glass, lifts the painting, yanked up; the empty frame | warm gold, top light on the thief, the rest dark |
| 5.6-10.8 | And now I was the one assigned ... the identity of the thief. | Office: CASE FILE on the laptop, ASSIGNED stamp on "assigned"; DEATH NOTE (gest catat tinggi) | neutral, laptop light |
| 10.8-14.1 | When I arrived at the museum, I examined the crime scene. | Pion hops in through the arch, looks around | neutral white, key on Pion (his shadow), spot on the frame |
| 14.1-19.75 | The painting was gone, but the protective glass was untouched ... | Push to the empty frame; his shock (zoom punch); flashlight (gest senter) on the glass | same, flashlight |
| 19.75-24.4 | I looked above the empty frame ... metal hook ... ceiling. | Tilt up with his flashlight; the hook | blue creeps in |
| 24.4-28.4 | The thief had used it to lower himself ... | Reconstruction: the descent above the painting, slowed | cold |
| 28.4-32.4 | I examined the hook and found a piece of black fabric ... | The fabric in the hook (flashlight); he notes it in the DEATH NOTE | cool |
| 32.4-39.05 | Then I reviewed the security footage. Three minutes before ... offline. | CCTV wall live, cameras die one by one (NO SIGNAL); his reaction | cooler, deeper blue |
| 39.05-49.25 | I checked the maintenance records ... He had disappeared three days ... | Log: head.technician rows; "one problem"; staff record: MISSING - 3 DAYS | deeper blue |
| 49.25-54.25 | I investigated further ... ceiling access hatch ... opened that same night. | Corridor: he walks in, flashlight up into the open hatch | strong blue |
| 54.25-59.45 | Beside it, I discovered a second set of footprints. I compared the two patterns. | Flashlight on the dust; the two patterns (zigzag / ring) | strong blue |
| 59.45-65.55 | One belonged to the thief ... but the second ... waiting below. | Reconstruction: the thief drops out of the hatch; the second shadow waiting, eyes + grin | cold, rim only |
| 65.55-73.0 | And according to the key card records ... the museum director. | Keycard reader (LED turns green); the record takes over: MUSEUM DIRECTOR, held | deep blue, light on the evidence |

User rules applied (see `.claude/skills/pion-raja/ATURAN.md` 21-23): hands only when needed, books/phones face Pion, action moves by physics.
Engine assets added for this film: `gest catat` (DEATH NOTE + pen, `tinggi` when seated), `gest senter` (flashlight).
