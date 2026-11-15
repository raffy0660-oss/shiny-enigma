#!/usr/bin/env bash
# One-time setup for the 3D castle pipeline (castle3d/):
#   - system libraries Blender needs to render headless (EGL/GL)
#   - Blender 5.2 LTS as a Python module (pip "bpy") in /opt/bpyenv  (needs Python 3.13)
#   - numpy + pillow for the compositor
#   - a working copy of the Pion engine at ~/pion/pion_raja (what react_render.js expects)
# Safe to run again.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SKILL="$(dirname "$HERE")"

LIBS="libegl1 libgl1 libxkbcommon0 libsm6 libxi6 libxrender1 libxfixes3"
if ! ldconfig -p | grep -q libEGL.so.1; then
  apt-get install -y -q $LIBS >/dev/null 2>&1 || { apt-get update -q >/dev/null 2>&1 && apt-get install -y -q $LIBS >/dev/null; }
fi

if [ ! -x /opt/bpyenv/bin/python ]; then
  python3 -m venv /opt/bpyenv
  /opt/bpyenv/bin/pip install -q bpy==5.2.4 numpy
fi
python3 -c "import numpy, PIL" 2>/dev/null || pip install -q numpy pillow

mkdir -p ~/pion
rm -rf ~/pion/pion_raja
cp -r "$SKILL/engine" ~/pion/pion_raja

# Remotion finisher (camera moves, camera motion blur, audio)
(cd "$HERE/remotion" && { [ -d node_modules ] || npm install --no-audit --no-fund >/dev/null; })

/opt/bpyenv/bin/python -c "import bpy; print('bpy', bpy.app.version_string)"
command -v ffmpeg >/dev/null && echo "ffmpeg ok" || echo "WARNING: ffmpeg missing"
node -e "require('playwright'); console.log('playwright ok')" 2>/dev/null || echo "WARNING: playwright not found for node"
echo "castle3d setup done"
