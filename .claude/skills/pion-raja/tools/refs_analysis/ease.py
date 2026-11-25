import json, glob, numpy as np, os
E={'linear':lambda x:x,'sine':lambda x:0.5-0.5*np.cos(np.pi*x),'quad':lambda x:np.where(x<.5,2*x*x,1-(-2*x+2)**2/2),
 'cubic':lambda x:np.where(x<.5,4*x**3,1-(-2*x+2)**3/2),'quart':lambda x:np.where(x<.5,8*x**4,1-(-2*x+2)**4/2),
 'quint':lambda x:np.where(x<.5,16*x**5,1-(-2*x+2)**5/2),'expo':lambda x:np.where(x<.5,2**(20*x-10)/2,(2-2**(-20*x+10))/2),
 'outCubic':lambda x:1-(1-x)**3,'outExpo':lambda x:1-2**(-10*x),'inCubic':lambda x:x**3,
 'cubic-bezier(.65,0,.35,1)':None}
def bez(p1x,p1y,p2x,p2y):
    t=np.linspace(0,1,2001); bx=3*(1-t)**2*t*p1x+3*(1-t)*t*t*p2x+t**3; by=3*(1-t)**2*t*p1y+3*(1-t)*t*t*p2y+t**3
    return lambda x:np.interp(x,bx,by)
E['cubic-bezier(.65,0,.35,1)']=bez(.65,0,.35,1); E['bezier(.4,0,.2,1)']=bez(.4,0,.2,1); E['bezier(.7,0,.3,1)']=bez(.7,0,.3,1); E['bezier(.8,0,.2,1)']=bez(.8,0,.2,1)
summ=json.load(open(os.path.expanduser('~/refs_det/motion/summary.json')))
x=np.linspace(0,1,21)
def curves(name):
    d=json.load(open(os.path.expanduser(f'~/refs_det/motion/{name}.json'))); fps=d['fps']; R=d['rows']
    ls=np.array([np.log(r['s']) if r['inl']>=25 and abs(np.log(r['s']))<0.08 else 0 for r in R])
    out=[]
    for z in summ[name]['zooms']:
        if z['dur']<0.45 or z['pct']<8: continue
        a=int(round(z['t']*fps)); b=a+int(round(z['dur']*fps))
        # extend edges while still moving same direction a bit (detector threshold trims tails)
        sg=np.sign(ls[a:b].sum())
        while a>0 and ls[a-1]*sg>0.0003: a-=1
        while b<len(ls) and ls[b]*sg>0.0003: b+=1
        c=np.concatenate([[0],np.cumsum(ls[a:b])]); c=c/c[-1]
        # overshoot: does motion reverse right after?
        post=ls[b:b+int(0.3*fps)]*sg; ov=float(-post[post<0].sum()/abs(np.sum(ls[a:b])))
        out.append((np.interp(x,np.linspace(0,1,len(c)),c),(b-a)/fps,ov))
    return out
allc=[];res={}
for name in summ:
    cs=curves(name)
    if name!='the_mona_lisa_heist': allc+=cs
    else: ours=cs
def fit(cs,label):
    M=np.mean([c[0] for c in cs],0); sc={k:float(np.sqrt(np.mean((f(x)-M)**2))) for k,f in E.items()}
    best=sorted(sc.items(),key=lambda kv:kv[1])[:5]
    pc=np.array([[np.sqrt(np.mean((f(x)-c[0])**2)) for f in E.values()] for c in cs]).argmin(1); names=list(E)
    from collections import Counter
    print(label,'n=',len(cs),'dur med %.2f'%np.median([c[1] for c in cs]),'overshoot>3%%: %d'%sum(c[2]>0.03 for c in cs))
    print('  mean curve:',' '.join('%.2f'%v for v in M[::2]))
    print('  best fits of mean:',', '.join(f'{k} {v:.3f}' for k,v in best))
    print('  per-zoom winner:',Counter(names[i] for i in pc).most_common(6))
fit(allc,'REFS'); fit(ours,'OURS')
