import numpy as np, librosa, json, os, sys, re, glob
H=os.path.expanduser('~/refs_det')
def db(x): return 20*np.log10(np.maximum(x,1e-6))
def an(name, sttname):
    d=f'{H}/sep/htdemucs/{name}'; sr=22050
    st={k:librosa.load(f'{d}/{k}.wav',sr=sr,mono=False)[0] for k in ['vocals','drums','bass','other']}
    mono={k:v.mean(0) for k,v in st.items()}; mus=mono['drums']+mono['bass']+mono['other']; vo=mono['vocals']
    hop=int(sr*0.05); rms=lambda x: librosa.feature.rms(y=x,frame_length=hop*2,hop_length=hop)[0]
    rv,rm,rd,rb,ro=rms(vo),rms(mus),rms(mono['drums']),rms(mono['bass']),rms(mono['other'])
    t=np.arange(len(rv))*0.05; T=len(vo)/sr
    w=[x for x in json.load(open(sttname))['words'] if x['type']=='word']
    sp=np.zeros(len(rv),bool)
    for x in w: sp[int(x['start']/0.05):int(x['end']/0.05)+1]=True
    sp=sp[:len(rv)]
    r={}
    r['bed_under_vo_db']=float(np.median(db(rv[sp]))-np.median(db(rm[sp])))
    r['music_present_pct']=float(100*np.mean(db(rm)>np.max(db(rm))-35))
    bins=np.array_split(np.arange(len(rm)),10); mdb=db(rm); r['music_arc_db']=[float(np.median(mdb[b])-np.median(mdb)) for b in bins]
    r['drums_arc_db']=[float(np.median(db(rd)[b])-np.median(db(rd))) for b in bins]
    # dropouts: 2s running median minus current, >9 dB for >=0.25 s
    med=np.array([np.median(mdb[max(0,i-40):i]) if i>5 else mdb[i] for i in range(len(mdb))]); dropm=(med-mdb)>9
    drops=[];i=0
    while i<len(dropm):
        if dropm[i]:
            j=i
            while j<len(dropm) and dropm[j]: j+=1
            if j-i>=5: drops.append((round(i*0.05,2),round((j-i)*0.05,2)))
            i=j
        else: i+=1
    r['drops']=drops
    tempo,beats=librosa.beat.beat_track(y=mus,sr=sr); r['bpm']=float(np.atleast_1d(tempo)[0])
    # SFX-ish onsets: strong onsets in 'other'+'drums' that are off the beat grid by >70 ms
    on=librosa.onset.onset_detect(y=mono['other']+mono['drums'],sr=sr,units='time',backtrack=False,delta=0.25)
    bt=librosa.frames_to_time(beats,sr=sr); off=[o for o in on if len(bt)==0 or np.min(np.abs(bt-o))>0.07]
    r['onsets_per_min']=len(on)/T*60; r['offbeat_onsets_per_min']=len(off)/T*60
    # low end share of music
    S=np.abs(librosa.stft(mus,n_fft=4096,hop_length=1024))**2; f=librosa.fft_frequencies(sr=sr,n_fft=4096)
    r['sub120_pct']=float(100*S[f<120].sum()/S.sum()); r['music_centroid']=float((f[:,None]*S).sum()/S.sum())
    # stereo width (side/mid) of music and vocals
    def width(x): return float(np.sqrt(np.mean(((x[0]-x[1])/2)**2))/np.sqrt(np.mean(((x[0]+x[1])/2)**2)+1e-9))
    r['music_width']=width(st['drums']+st['bass']+st['other']); r['vo_width']=width(st['vocals'])
    # VO: loudness steadiness, pitch, centroid
    v16=librosa.resample(vo,orig_sr=sr,target_sr=16000); f0=librosa.yin(v16,fmin=70,fmax=400,sr=16000,frame_length=1024,hop_length=320)
    vt=np.arange(len(f0))*0.02; spk=np.zeros(len(f0),bool)
    for x in w: spk[int(x['start']/0.02):int(x['end']/0.02)+1]=True
    spk=spk[:len(f0)]; fv=f0[spk]; st_=12*np.log2(fv/np.median(fv))
    r['vo_pitch_med_hz']=float(np.median(fv)); r['vo_pitch_range_st']=float(np.percentile(st_,90)-np.percentile(st_,10))
    r['vo_level_std_db']=float(np.std(db(rv[sp])))
    Sv=np.abs(librosa.stft(vo,n_fft=2048,hop_length=512))**2; fv_=librosa.fft_frequencies(sr=sr,n_fft=2048); r['vo_centroid']=float((fv_[:,None]*Sv).sum()/Sv.sum())
    # turn words: VO pitch / loudness / music level change
    tw={}
    for x in w:
        k=x['text'].lower().strip('.,"?!')
        a=int(x['start']/0.05)
        if a<40 or a+40>=len(rm): continue
        mus_d=float(np.median(mdb[a:a+30])-np.median(mdb[a-30:a]))
        i0,i1=int(x['start']/0.02),int(x['end']/0.02)+1; p=f0[i0:i1]; pp=float(np.median(12*np.log2(p/np.median(fv)))) if len(p) else 0
        vl=float(np.median(db(rv[a:int(x['end']/0.05)+1]))-np.median(db(rv[sp])))
        tw.setdefault(k if k in ('but','until','wait','night','then','you','everyone','nobody') else '_all',[]).append((mus_d,pp,vl))
        if k in ('but','until','wait','night','then','nobody'): tw.setdefault('_turn',[]).append((mus_d,pp,vl))
        tw.setdefault('_base',[]).append((mus_d,pp,vl))
    r['turn']={k:[len(v)]+list(np.mean(v,0).round(2)) for k,v in tw.items()}
    # last 3 s: music behaviour at the end, first 1 s
    r['music_first1s_db']=float(np.median(mdb[:20])-np.median(mdb)); r['music_last1s_db']=float(np.median(mdb[-20:])-np.median(mdb))
    return r
if __name__=='__main__':
    out={}
    for d in sorted(glob.glob(f'{H}/sep/htdemucs/*')):
        n=os.path.basename(d)
        if not os.path.exists(f'{d}/other.wav'): continue
        stt=f'{os.path.expanduser("~/pion/proj13/audio/stt_raw.json")}' if n=='OURS' else f'{H}/stt/{n}.json'
        if not os.path.exists(stt): print('no stt',n); continue
        out[n]=an(n,stt); print(n, json.dumps({k:(round(v,2) if isinstance(v,float) else v) for k,v in out[n].items() if k not in('turn',)}))
    json.dump(out,open(f'{H}/motion/audio.json','w'),indent=1)
