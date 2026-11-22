// charpresets.js: reusable character APPEARANCE + RENDERING settings (separate from scene placement).
// A plan gives placement only ({ eng, anchor | groundAnchor, height, lift, ... , preset: "detective" }); everything else comes from here.
// Any key set on the character itself wins over the preset (old plans without `preset` behave exactly as before).
//
// facing      "yaw"     upright, turns about the vertical axis toward the camera (default for standing characters)
//             "full"    follows the camera orientation fully (use with an engine render drawn from this camera: --view)
//             "fixed"   keeps a world rotation (P.yaw, radians)
//             "faceCam" = "full" (compatibility name used by the old plans)
//             "floor"   lying: the drawing (rendered front-on, view [0,0]) lies flat on the ground, head toward P.yaw
// groundMode  "explicit" ground = P.ground ?? P.groundY ?? anchor.y - lift      (default, exactly the old behaviour)
//             "raycast"  ground = first surface tagged userData.ground below the anchor (never just "the lowest floor")
// contact     "feet"   compact contact shadow under the feet      "body"  long shadow along the body (lying characters)
// push        depth bias in metres toward the lens (the 2D base lip is drawn a little below the contact point); it only moves
//             the DEPTH used for occlusion, never the picture or the size. pushMode: "legacy" = the old move+scale.
// light       E  flat base so the drawing stays readable, D  diffuse share of the set lights,
//             rim  light-side rim inside the ink outline, glow  soft light gradient on the lit side,
//             shade  two-tone form light: lit side litCol, far side shadeCol (cel step), 0..1. Highlights are capped (never burn to white)
export const CHAR_PRESETS = {
  detective: { facing: "faceCam", groundMode: "explicit", contact: "feet", cast: true, push: 0.2, rim: 1.3, glow: 0.45, shade: 0.85 },
  police:    { facing: "faceCam", groundMode: "explicit", contact: "feet", cast: true, push: 0.2, rim: 1.1, glow: 0.35, shade: 0.8 },
  civilian:  { facing: "faceCam", groundMode: "explicit", contact: "feet", cast: true, push: 0.2, rim: 1.1, glow: 0.35, shade: 0.8 },
  victim:    { facing: "floor", groundMode: "explicit", contact: "body", cast: false, push: 0, rim: 0.3, glow: 0.1, shade: 0.5 },   // engine view [0,0] (front), card flat on the floor
  seated:    { facing: "faceCam", groundMode: "explicit", contact: "seat", cast: true, push: 0.15, rim: 1.2, glow: 0.4, shade: 0.85 },
};
export function withPreset(P) {
  if (!P) return P; const pr = P.preset && CHAR_PRESETS[P.preset]; if (!pr) return P;
  const out = Object.assign({}, pr, P); return out;
}

// Lighting presets for the CHARACTERS: rim colour / strength of the light-side rim, matched to the environment's light.
// Chosen per set + mood so the character light always matches the environment (warm lamp, cold moon, street sodium...).
export const LIGHT_PRESETS = {   // rimCol/rimK: rim light; shadeCol: the character's shadow side (cool, dark); litCol: the lit side (warm lift)
  interior_night:     { rimCol: [0.62, 0.74, 1.0], rimK: 1.0, shadeCol: [0.26, 0.3, 0.52], litCol: [0.98, 1.0, 1.1] },
  interior_warm_lamp: { rimCol: [1.0, 0.78, 0.5], rimK: 1.0, shadeCol: [0.3, 0.32, 0.55], litCol: [1.12, 1.0, 0.86] },
  exterior_daylight:  { rimCol: [1.0, 0.95, 0.85], rimK: 0.9, shadeCol: [0.42, 0.46, 0.66], litCol: [1.1, 1.04, 0.94] },
  exterior_overcast:  { rimCol: [0.8, 0.86, 0.95], rimK: 0.6, shadeCol: [0.6, 0.63, 0.72], litCol: [1.02, 1.02, 1.04] },
  exterior_dusk:      { rimCol: [1.0, 0.72, 0.45], rimK: 1.0, shadeCol: [0.32, 0.29, 0.55], litCol: [1.14, 0.98, 0.84] },
  crime_scene:        { rimCol: [0.55, 0.7, 1.0], rimK: 1.1, shadeCol: [0.22, 0.26, 0.5], litCol: [0.96, 1.0, 1.12] },
  closeup_dramatic:   { rimCol: [1.0, 0.85, 0.65], rimK: 1.3, shadeCol: [0.24, 0.26, 0.45], litCol: [1.15, 1.0, 0.85] },
};
