import cv2, sys
from PIL import Image, ImageDraw, ImageFont
out=sys.argv[1]; fr_list=[int(x) for x in sys.argv[2].split(',')]; X0,Y0,X1,Y1=map(int,sys.argv[3].split(',')); cols=int(sys.argv[4])
cap=cv2.VideoCapture('src/input.mp4'); got={}; i=0
while i<=max(fr_list):
    ok,fr=cap.read()
    if i in fr_list: got[i]=Image.fromarray(cv2.cvtColor(fr,cv2.COLOR_BGR2RGB))
    i+=1
f=ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf',26)
w,h=(X1-X0)//2,(Y1-Y0)//2; rows=(len(fr_list)+cols-1)//cols; S=Image.new('RGB',(w*cols,h*rows))
for k,fi in enumerate(fr_list):
    im=got[fi].crop((X0,Y0,X1,Y1)); d=ImageDraw.Draw(im)
    for gx in range((X0//50+1)*50,X1,50): d.line([(gx-X0,0),(gx-X0,Y1-Y0)],fill=(0,255,255) if gx%100==0 else (0,120,120),width=2)
    for gy in range((Y0//50+1)*50,Y1,50): d.line([(0,gy-Y0),(X1-X0,gy-Y0)],fill=(0,255,255) if gy%100==0 else (0,120,120),width=2)
    for gx in range((X0//100+1)*100,X1,100): d.text((gx-X0+3,3),str(gx),fill='yellow',font=f,stroke_width=3,stroke_fill='black')
    for gy in range((Y0//100+1)*100,Y1,100): d.text((3,gy-Y0+3),str(gy),fill='yellow',font=f,stroke_width=3,stroke_fill='black')
    d.text((X1-X0-120,Y1-Y0-40),f'f{fi}',fill='red',font=f,stroke_width=3,stroke_fill='white')
    S.paste(im.resize((w,h)),((k%cols)*w,(k//cols)*h))
S.save(out)
