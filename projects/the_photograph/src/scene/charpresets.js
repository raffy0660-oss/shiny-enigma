// charpresets.js: reusable character APPEARANCE + RENDERING settings (separate from scene placement).
// A plan gives placement only ({ eng, anchor | groundAnchor, height, lift, ... , preset: "detective" }); everything else comes from here.
// Any key set on the character itself wins over the preset (old plans without `preset` behave exactly as before).
//
// facing      "yaw"     upright, turns about the vertical axis toward the camera (default for standing characters)
//             "full"    follows the camera orientation fully (use with an engine render drawn from this camera: --view)
//             "fixed"   keeps a world rotation (P.yaw, radians)
//             "faceCam" = "full" (compatibility name used by the old plans)
// groundMode  "explicit" ground = P.ground ?? P.groundY ?? anchor.y - lift      (default, exactly the old behaviour)
//             "raycast"  ground = first surface tagged userData.ground below the anchor (never just "the lowest floor")
// contact     "feet"   compact contact shadow under the feet      "body"  long shadow along the body (lying characters)
// push        depth bias in metres toward the lens (the 2D base lip is drawn a little below the contact point); it only moves
//             the DEPTH used for occlusion, never the picture or the size. pushMode: "legacy" = the old move+scale.
// light       E  flat base so the drawing stays readable, D  diffuse share of the set lights,
//             rim  light-side rim inside the ink outline (0..1), glow  soft light gradient on the lit side (0..1)
export const CHAR_PRESETS = {
  detective: { facing: "faceCam", groundMode: "explicit", contact: "feet", cast: true, push: 0.2, rim: 0.55, glow: 0.22 },
  police:    { facing: "faceCam", groundMode: "explicit", contact: "feet", cast: true, push: 0.2, rim: 0.4, glow: 0.15 },
  civilian:  { facing: "faceCam", groundMode: "explicit", contact: "feet", cast: true, push: 0.2, rim: 0.4, glow: 0.15 },
  victim:    { facing: "full", groundMode: "explicit", contact: "body", cast: false, push: 0.7, rim: 0.2, glow: 0.08 },
  seated:    { facing: "faceCam", groundMode: "explicit", contact: "seat", cast: true, push: 0.15, rim: 0.45, glow: 0.18 },
};
export function withPreset(P) {
  if (!P) return P; const pr = P.preset && CHAR_PRESETS[P.preset]; if (!pr) return P;
  const out = Object.assign({}, pr, P); return out;
}

// Lighting presets for the CHARACTERS: rim colour / strength of the light-side rim, matched to the environment's light.
// Chosen per set + mood so the character light always matches the environment (warm lamp, cold moon, street sodium...).
export const LIGHT_PRESETS = {
  interior_night:     { rimCol: [0.62, 0.74, 1.0], rimK: 1.0 },
  interior_warm_lamp: { rimCol: [1.0, 0.78, 0.5], rimK: 1.0 },
  exterior_daylight:  { rimCol: [1.0, 0.95, 0.85], rimK: 0.8 },
  exterior_overcast:  { rimCol: [0.8, 0.86, 0.95], rimK: 0.6 },
  exterior_dusk:      { rimCol: [1.0, 0.72, 0.45], rimK: 1.0 },
  crime_scene:        { rimCol: [0.55, 0.7, 1.0], rimK: 1.1 },
  closeup_dramatic:   { rimCol: [1.0, 0.85, 0.65], rimK: 1.3 },
};
