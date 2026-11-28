"""Export a Claude Code session transcript (~/.claude/projects/<dir>/<session>.jsonl) to a readable Markdown chat log:
user messages verbatim (queued ones and multiple-choice answers included, attached images saved next to it), Claude text replies,
no tool calls. Emails and model ids are masked.  python3 -I export_chat.py <session.jsonl> projects/<proj>/PERCAKAPAN_SESIn.md"""
import json, re, sys, os, base64
src, out = sys.argv[1], sys.argv[2]
IMG_DIR = os.path.join(os.path.dirname(out), "percakapan_img"); os.makedirs(IMG_DIR, exist_ok=True); NIMG = [0]; seen_img = {}
EMAIL = re.compile(r"[\w.+-]+@gmail\.com")
def clean(t):
    t = re.sub(r"<system-reminder>.*?</system-reminder>", "", t, flags=re.S)
    t = re.sub(r"<(task-notification|command-[a-z]+|local-command-[a-z]+)>.*?</\1>", "", t, flags=re.S)
    t = EMAIL.sub("[email disembunyikan]", t)
    t = re.sub(r"claude-[a-z]+-\d[\w.-]*", "[model]", t)
    return t.strip()
SKIP = ("This session is being continued", "This session's worker process", "[SYSTEM NOTIFICATION", "Stop hook feedback", "[Request interrupted")
rows = []
for l in open(src):
    d = json.loads(l)
    if d.get("isMeta") or d.get("isCompactSummary") or d.get("isSidechain"): continue
    t = d.get("type")
    if t == "attachment" and d.get("attachment", {}).get("type") == "queued_command":
        t = "user"; c = d["attachment"].get("prompt")
        if c is None: continue
    elif t not in ("user", "assistant"): continue
    else: c = d["message"]["content"]
    parts = []; imgs = 0
    if isinstance(c, str): parts = [c]
    else:
        trs = [x for x in c if x.get("type") == "tool_result"]
        if trs:
            ans = []
            for x in trs:
                cc = x.get("content"); cc = cc if isinstance(cc, str) else " ".join(y.get("text", "") for y in (cc or []) if isinstance(y, dict))
                if cc.lstrip().startswith(("Your questions have been answered", "User has answered your questions")): ans.append("[Jawaban atas pertanyaan pilihan Claude] " + re.sub(r"\s*You can now continue.*$", "", cc.replace("Your questions have been answered: ", ""), flags=re.S))
            if not ans: continue
            c = [{"type": "text", "text": a} for a in ans]
        for x in c:
            if x.get("type") == "text": parts.append(x["text"])
            elif x.get("type") == "image" and t == "user":
                imgs += 1; data = x.get("source", {}).get("data")
                if data:
                    key = data[:200] + data[-200:]
                    if key not in seen_img:
                        NIMG[0] += 1; ext = "png" if "png" in x["source"].get("media_type", "") else "jpg"
                        fn = f"user_{NIMG[0]:02d}.{ext}"; open(os.path.join(IMG_DIR, fn), "wb").write(base64.b64decode(data)); seen_img[key] = fn
                    parts.append(f"![gambar dari user](percakapan_img/{seen_img[key]})")
            elif x.get("type") == "document" and t == "user": parts.append("[lampiran dokumen]")
    txt = clean("\n\n".join(parts))
    if t == "user" and (not txt and not imgs or txt.startswith(SKIP)): continue
    if t == "assistant" and not txt: continue
    if imgs: txt = ("[%d gambar dilampirkan]\n\n" % imgs) + txt
    who = "User" if t == "user" else "Claude"
    if who == "User" and any(r[0] == "User" and r[1] == txt for r in rows[-3:]): continue
    if rows and rows[-1][0] == who == "Claude": rows[-1][1] += "\n\n" + txt
    else: rows.append([who, txt, d.get("timestamp", "")[:16].replace("T", " ")])
with open(out, "w") as f:
    f.write("# Percakapan sesi 2: video detektif \"The Photograph\" (22 Nov 2026)\n\n")
    f.write("Ekspor transkrip sesi Claude Code: pesan user apa adanya dan balasan teks Claude, tanpa pemanggilan alat dan log teknis.\n")
    f.write("Email disembunyikan. Rangkuman arahan: `PROMPT_USER_SESI2.md`. Aturan untuk video berikutnya: `.claude/skills/pion-raja/BRIEF_KONTEN.md`.\n")
    f.write("Bagian awal sesi sempat diringkas otomatis saat konteks penuh, tetapi semua pesan aslinya tetap ada di sini.\n\n")
    for who, txt, ts in rows:
        f.write(f"---\n\n### {who} · {ts} UTC\n\n{txt}\n\n")
print(len(rows), sum(1 for r in rows if r[0] == "User"))
