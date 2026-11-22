#!/usr/bin/env bash
# Rebuilds the working tree for "The Photograph" in a fresh cloud session (~/pion/...), from the repo only.
#   bash projects/the_photograph/setup.sh
# After it: ~/pion/pion_raja (engine), ~/pion/castle3d/remotion (Remotion + node_modules),
#           ~/pion/proj10/{scene,plans,cues,audio,sfx,eng,out,final} with three.js installed in scene/.
set -e
REPO="$(cd "$(dirname "$0")/../.." && pwd)"; SK="$REPO/.claude/skills/pion-raja"; PR="$REPO/projects/the_photograph"
mkdir -p ~/pion
rm -rf ~/pion/pion_raja && cp -r "$SK/engine" ~/pion/pion_raja
mkdir -p ~/pion/castle3d && rm -rf ~/pion/castle3d/remotion && cp -r "$SK/castle3d/remotion" ~/pion/castle3d/remotion
(cd ~/pion/castle3d/remotion && npm install --no-audit --no-fund >/dev/null)
P=~/pion/proj10; mkdir -p $P/{scene,plans,cues,audio,sfx,eng,out,final}
cp "$PR"/src/scene/* $P/scene/; cp "$PR"/src/plans/* $P/plans/; cp "$PR"/src/cues/* $P/cues/; cp "$PR"/src/*.py $P/
cp "$PR/vo.mp3" $P/audio/vo.mp3; cp "$PR/vo_stt.json" $P/audio/stt.json
for f in "$PR"/assets/sfx/*.mp3; do n=$(basename "$f" .mp3); cp "$f" $P/sfx/; ffmpeg -v error -y -i "$f" -ar 48000 -ac 2 $P/sfx/$n.wav; done
(cd $P/scene && [ -d node_modules/three ] || { [ -f package.json ] || echo '{"name":"proj10-scene","private":true}' > package.json; npm install --no-audit --no-fund three@0.186.0 @pmndrs/assets@1.7.0 >/dev/null; })
python3 -c "import numpy, PIL" 2>/dev/null || pip install -q numpy pillow
python3 -c "import faster_whisper" 2>/dev/null || pip install -q faster-whisper || true   # word timings (pass audio as a numpy array: its av decoder is broken here)
echo "SETUP_DONE  -> smoke test: cd ~/pion/proj10/scene && node render_office.js ../eng/office wide"
