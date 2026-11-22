#!/bin/bash
# sheet.sh <dir> <out.jpg> [cols] [width] [filelist...]: tile jpgs from dir (or listed frames) into a contact sheet
D=$1; O=$2; C=${3:-6}; W=${4:-270}; shift 4 2>/dev/null
if [ $# -gt 0 ]; then L=""; for f in "$@"; do L="$L $D/$(printf %05d $((10#$f))).jpg"; done; else L=$(ls $D/*.jpg); fi
python3 - "$O" "$C" "$W" $L <<'PY'
import sys; from PIL import Image, ImageDraw
o,c,w=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]); fs=sys.argv[4:]
ims=[Image.open(f).convert('RGB') for f in fs]; h=int(w*ims[0].height/ims[0].width); r=(len(ims)+c-1)//c
S=Image.new('RGB',(c*w,r*h),(20,20,20)); d=ImageDraw.Draw(S)
for i,(f,im) in enumerate(zip(fs,ims)):
  x,y=(i%c)*w,(i//c)*h; S.paste(im.resize((w,h)),(x,y)); d.text((x+4,y+4),f.split('/')[-1][:-4],fill=(255,255,0))
S.save(o,quality=88)
PY
