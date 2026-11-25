import json, glob, numpy as np, os
def runs(mask, gap=2):
    out=[]; i=0; n=len(mask)
    while i<n:
        if mask[i]:
            j=i
            while j<n and (mask[j] or (j+gap<n and mask[j:j+gap+1].any() and mask[min(n-1,j+1):j+gap+1].any())): j+=1
            out.append((i,j)); i=j
        else: i+=1
    return out
summ={}
for f in sorted(glob.glob(os.path.expanduser('~/refs_det/motion/*.json'))):
    d=json.load(open(f)); fps=d['fps']; R=d['rows']; n=len(R)
    ls=np.array([np.log(r['s']) for r in R]); tx=np.array([r['tx'] for r in R]); ty=np.array([r['ty'] for r in R])
    inl=np.array([r['inl'] for r in R]); diff=np.array([r['diff'] for r in R]); sharp=np.array([r['sharp'] for r in R])
    bad=(inl<25)|(np.abs(ls)>0.08)          # cuts / unreliable
    cut=(diff>3*np.median(diff)+8)&(inl<40)
    ls[bad]=0; tx[bad]=0; ty[bad]=0
    k=30/fps                                 # normalise per-frame to 30fps units
    lsn=ls/k; pan=np.hypot(tx,ty)/k*(720/360)   # px per frame @720 wide, 30fps units
    # smooth 3 frames (30fps) to reduce noise
    w=max(1,int(round(3/k))); ker=np.ones(w)/w
    lss=np.convolve(lsn,ker,'same'); pans=np.convolve(pan,ker,'same')
    Z=[]
    for a,b in runs(np.abs(lss)>0.0015):
        seg=lss[a:b]; tot=seg.sum()
        if abs(tot)<0.04 or np.sign(seg).mean()*np.sign(tot)<0.6: continue
        sp=np.abs(seg); dur=(b-a)/fps
        Z.append(dict(t=a/fps,dur=dur,pct=(np.exp(abs(tot))-1)*100,dir='in' if tot>0 else 'out',peak_at=float(np.argmax(sp)/max(1,len(sp)-1)),peak_mean=float(sp.max()/sp.mean())))
    moving=np.mean((np.abs(lss)>0.0004)|(pans>0.6))
    vel=np.stack([lss*300,pans],1); jerk=np.mean(np.abs(np.diff(vel,axis=0)).sum(1)[~bad[1:]])
    held=np.mean(diff[1:]<0.25)
    cuts=int(cut.sum())
    summ[os.path.basename(f)[:-5]]=dict(fps=fps,dur=n/fps,cuts=cuts,moving=moving,jerk=jerk,held=held,sharp=float(np.median(sharp)),zooms=Z)
for k,v in summ.items():
    Z=v['zooms']; durs=[z['dur'] for z in Z]; pcts=[z['pct'] for z in Z]; pk=[z['peak_at'] for z in Z]; pm=[z['peak_mean'] for z in Z]
    print(f"{k[:32]:32} cuts{v['cuts']:3} moving{v['moving']*100:4.0f}% jerk{v['jerk']:.3f} held{v['held']*100:3.0f}% zooms{len(Z):3} "
          + (f"dur med{np.median(durs):.2f} [{min(durs):.2f}-{max(durs):.2f}] pct med{np.median(pcts):.0f}% peak_at med{np.median(pk):.2f} peak/mean{np.median(pm):.2f} in/out {sum(z['dir']=='in' for z in Z)}/{sum(z['dir']=='out' for z in Z)}" if Z else ""))
json.dump(summ,open(os.path.expanduser('~/refs_det/motion/summary.json'),'w'),indent=1)
