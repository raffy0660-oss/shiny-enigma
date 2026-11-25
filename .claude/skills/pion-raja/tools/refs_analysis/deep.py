import json, glob, os, numpy as np, re
H=os.path.expanduser('~/refs_det'); S=json.load(open(f'{H}/motion/summary.json'))
names=[k for k in S if k!='the_mona_lisa_heist']
def load(n):
    m=json.load(open(f'{H}/motion/{n}.json')); c=json.load(open(f'{H}/motion/{n}.mp4.color.json'))
    w=[x for x in json.load(open(f"{H}/stt/{n.replace(' ','_').replace(chr(39),'_')}.json"))['words'] if x['type']=='word']
    return m,c,w
TURN=re.compile(r"^(but|until|wait|suddenly|then|night|dark|nobody|everyone|laughing|laughed|impossible|you)$")
arc=[];ev={};sync=[];sync_s=[];rollstat=[];shake=[];flash=[];vig=[];dof=[];vigs=[];warmarc=[];satarc=[]
for n in names:
    m,c,w=load(n); fps=m['fps']; R=m['rows']; C=c['rows']; N=min(len(R),len(C)); T=N/fps
    l=np.array([r['l'] for r in C[:N]]); warm=np.array([r['warm'] for r in C[:N]]); sat=np.array([r['sat'] for r in C[:N]])
    ok=np.array([r['inl']>=25 for r in R[:N]])
    ls=np.array([np.log(r['s']) if o and abs(np.log(r['s']))<.08 else 0 for r,o in zip(R[:N],ok)])
    rot=np.array([r['a'] if o and abs(r['a'])<3 else 0 for r,o in zip(R[:N],ok)])
    tx=np.array([r['tx'] if o else 0 for r,o in zip(R[:N],ok)]); ty=np.array([r['ty'] if o else 0 for r,o in zip(R[:N],ok)])
    # arcs over runtime (10 bins)
    b=np.array_split(np.arange(N),10); arc.append([l[i].mean()/l.mean() for i in b]); warmarc.append([warm[i].mean()-warm.mean() for i in b]); satarc.append([sat[i].mean()/sat.mean() for i in b])
    # roll: cumulative within windows
    cr=np.cumsum(rot); rollstat.append((np.percentile(np.abs(rot),99)*fps, np.ptp(cr), np.mean(np.abs(rot)>0.05)))
    # shake: high-frequency residual of translation (px @360 wide)
    k=np.ones(9)/9; hf=np.hypot(tx-np.convolve(tx,k,'same'),ty-np.convolve(ty,k,'same')); shake.append(np.median(hf[ok]))
    # flashes: luma jump > +25 within 3 frames then back
    d=np.diff(l); fl=[i/fps for i in range(3,N-6) if l[i]-l[i-3]>25 and l[i+5]<l[i]-10]; flash.append(fl)
    vig.append(np.median([r['vig'] for r in C[:N]])); dof.append(np.median([r['st']/max(r['sc'],1) for r in C[:N]]))
    # event-related: around turn words
    for x in w:
        t=x['text'].lower().strip('.,"?!'); 
        if not TURN.match(t): continue
        i=int(x['start']*fps)
        if i<2*fps or i+3*fps>=N: continue
        pre=slice(i-int(1.5*fps),i); post=slice(i,i+int(2*fps))
        e=ev.setdefault(t,[]); e.append((l[post].mean()-l[pre].mean(), warm[post].mean()-warm[pre].mean(), np.abs(ls[post]).mean()*fps/ (np.abs(ls[pre]).mean()*fps+1e-3), np.sign(ls[post].sum())))
    # sync: zoom starts vs word onsets
    on=np.array([x['start'] for x in w]); ss=np.array([w[0]['start']]+[w[i+1]['start'] for i in range(len(w)-1) if w[i]['text'].rstrip()[-1:] in '.?!,'])
    for z in S[n]['zooms']:
        if z['dur']<0.3: continue
        dz=z['t']-on; sync.append(dz[np.argmin(np.abs(dz))]); dzs=z['t']-ss; sync_s.append(dzs[np.argmin(np.abs(dzs))])
A=np.array(arc); print('LUMA arc (10 bins, rel to mean):',' '.join('%.2f'%v for v in A.mean(0)))
print('  per-video min bin position:',[int(np.argmin(a)) for a in A])
print('WARMTH arc (R-B minus mean):',' '.join('%+.1f'%v for v in np.mean(warmarc,0)))
print('SAT arc:',' '.join('%.2f'%v for v in np.mean(satarc,0)))
r=np.array(rollstat); print('ROLL: p99 speed %.1f deg/s, total roll range med %.1f deg, frames rolling %.0f%%'%(np.median(r[:,0]),np.median(r[:,1]),100*np.median(r[:,2])))
print('SHAKE hf residual med px@360: %.2f'%np.median(shake), ['%.2f'%s for s in shake])
print('FLASHES per video:',[len(f) for f in flash])
print('VIGNETTE corner/center med: %.2f'%np.median(vig),' DOF top/center sharpness med %.2f'%np.median(dof), ['%.2f'%v for v in dof])
sy=np.array(sync); print('ZOOM START - nearest word onset: med %.3f, |off|<0.1s %.0f%%, mean %.3f'%(np.median(sy),100*np.mean(np.abs(sy)<0.1),sy.mean()))
ss_=np.array(sync_s); print('ZOOM START - nearest clause/sentence start: med %.3f, within ±0.25s %.0f%%'%(np.median(ss_),100*np.mean(np.abs(ss_)<0.25)))
h,_=np.histogram(sy,bins=np.arange(-0.5,0.51,0.1)); print('  hist -0.5..0.5 step .1:',h)
for t,e in sorted(ev.items(),key=lambda kv:-len(kv[1])):
    e=np.array(e); print(f"  '{t}' n={len(e):3} dLuma {e[:,0].mean():+5.1f} dWarm {e[:,1].mean():+5.1f} zoomspeed x{np.median(e[:,2]):.2f} zoom-in frac {np.mean(e[:,3]>0):.2f}")
# ours
c=json.load(open(f'{H}/motion/OURS.color.json'))['rows']; print('OURS vignette %.2f dof %.2f'%(np.median([r['vig'] for r in c]),np.median([r['st']/max(r['sc'],1) for r in c])))
l=np.array([r['l'] for r in c]); print('OURS luma arc',' '.join('%.2f'%(l[i].mean()/l.mean()) for i in np.array_split(np.arange(len(l)),10)))
print('\n--- refinements')
rng=np.random.default_rng(0); base=[]; rolls=[]; simA=[];simB=[]; shk=[]
for n in names:
    m,c,w=load(n); fps=m['fps']; R=m['rows']; C=c['rows']; N=min(len(R),len(C))
    l=np.array([r['l'] for r in C[:N]]); warm=np.array([r['warm'] for r in C[:N]])
    ok=np.array([r['inl']>=25 for r in R[:N]]); ls=np.array([np.log(r['s']) if o and abs(np.log(r['s']))<.08 else 0 for r,o in zip(R[:N],ok)])
    rot=np.array([r['a'] if o and abs(r['a'])<3 else 0 for r,o in zip(R[:N],ok)])
    for x in w:
        i=int(x['start']*fps)
        if 2*fps<i<N-3*fps: pre=slice(i-int(1.5*fps),i); post=slice(i,i+int(2*fps)); base.append((l[post].mean()-l[pre].mean(),warm[post].mean()-warm[pre].mean(),np.abs(ls[post]).mean()/(np.abs(ls[pre]).mean()+1e-3/fps)))
    # roll events
    rs=np.convolve(rot,np.ones(3)/3,'same'); msk=np.abs(rs)>0.12; i=0
    while i<N:
        if msk[i]:
            j=i
            while j<N and msk[j]: j+=1
            if j-i>=6: rolls.append((abs(rs[i:j].sum()),(j-i)/fps))
            i=j
        else: i+=1
    on=np.array([x['start'] for x in w]); ss=np.array([w[0]['start']]+[w[q+1]['start'] for q in range(len(w)-1) if w[q]['text'].rstrip()[-1:] in '.?!,'])
    zt=np.array([z['t'] for z in S[n]['zooms'] if z['dur']>=0.3]); rt=rng.uniform(1,N/fps-1,2000)
    f=lambda t,arr,th: np.mean([np.min(np.abs(x-arr))<th for x in t])
    simA.append((f(zt,on,0.1),f(rt,on,0.1))); simB.append((f(zt,ss,0.25),f(rt,ss,0.25)))
b=np.array(base); print('BASELINE all words: dLuma %+.1f dWarm %+.1f zoomspeed x%.2f'%(b[:,0].mean(),b[:,1].mean(),np.median(b[:,2])))
r=np.array(rolls); print('ROLL events: %d total (%.1f/min), angle med %.1f deg p90 %.1f, dur med %.2fs'%(len(r),len(r)/sum(S[n]['dur'] for n in names)*60,np.median(r[:,0]),np.percentile(r[:,0],90),np.median(r[:,1])))
a=np.array(simA); bb=np.array(simB); print('SYNC word onset ±0.1: zooms %.0f%% vs random %.0f%% | clause start ±0.25: zooms %.0f%% vs random %.0f%%'%(100*a[:,0].mean(),100*a[:,1].mean(),100*bb[:,0].mean(),100*bb[:,1].mean()))
m=json.load(open(f'{H}/motion/the_mona_lisa_heist.json')); R=m['rows']; ok=np.array([r['inl']>=25 for r in R]); tx=np.array([r['tx'] if o else 0 for r,o in zip(R,ok)]); ty=np.array([r['ty'] if o else 0 for r,o in zip(R,ok)])
tx,ty=tx[::2]+tx[1::2][:len(tx[::2])],ty[::2]+ty[1::2][:len(ty[::2])]; k=np.ones(9)/9; hf=np.hypot(tx-np.convolve(tx,k,'same'),ty-np.convolve(ty,k,'same')); print('OURS shake (30fps equiv) %.2f'%np.median(hf))
