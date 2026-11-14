import cv2, sys
from PIL import Image, ImageDraw, ImageFont
frames=[int(x) for x in sys.argv[2].split(',')]; out=sys.argv[1]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 6
cap=cv2.VideoCapture('src/input.mp4'); got={}; i=0
while i<=max(frames):
    ok,fr=cap.read()
    if not ok: break
    if i in frames: got[i]=Image.fromarray(cv2.cvtColor(fr,cv2.COLOR_BGR2RGB))
    i+=1
f=ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf',34)
w,h=360,460; rows=(len(frames)+cols-1)//cols; S=Image.new('RGB',(w*cols,h*rows))
for k,fi in enumerate(frames):
    im=got[fi].crop((0,276,1078,1656)); d=ImageDraw.Draw(im)
    for gx in range(0,1078,50): d.line([(gx,0),(gx,1380)],fill=(0,255,255) if gx%100==0 else (0,110,110),width=2 if gx%100==0 else 1)
    for gy in range(24,1380,50): d.line([(0,gy),(1078,gy)],fill=(0,255,255) if (gy+276)%100==0 else (0,110,110),width=2 if (gy+276)%100==0 else 1)
    for gy in range(24,1380,100): d.text((2,gy),str(gy+276),fill='yellow',font=f,stroke_width=3,stroke_fill='black')
    for gx in range(100,1078,200): d.text((gx,30),str(gx),fill='yellow',font=f,stroke_width=3,stroke_fill='black')
    d.text((700,80),f'f{fi}',fill='red',font=f,stroke_width=3,stroke_fill='white')
    S.paste(im.resize((w,h)),((k%cols)*w,(k//cols)*h))
S.save(out)
