# -*- coding: utf-8 -*-
"""
크롭 데이터셋 검수/수정 툴 (로컬 웹앱).

크롭된 이미지(= 실제 학습에 들어갈 데이터)를 클래스별 갤러리로 쭉 보여준다.
잘못 잘린 것만 클릭하면 원본 사진이 열리고, 그 위에 마우스로 직접 박스를
다시 그려서 고친다. 고치는 즉시 갤러리의 크롭 썸네일도 갱신된다.

진행 상황은 매 동작마다 pipeline/annotations.json 에 저장되므로 언제든
창을 닫았다가 다시 실행하면 이어서 작업할 수 있다.

사용법:
  python pipeline/annotator.py
  python pipeline/annotator.py --port 8765 --data 0721_data_split
"""
import argparse
import io
import json
import statistics
import threading
from collections import defaultdict, OrderedDict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs
import webbrowser

from PIL import Image

MARGIN = 0.12          # 03_make_crops.py 와 동일한 여유
TILE_W, TILE_H = 320, 132   # 갤러리 타일 (표지판은 대개 가로로 길어 이 비율이 잘 맞는다)
TILE_BG = (45, 51, 59)      # 여백을 회색으로 둬야 '이미지 없음'으로 오해하지 않는다
CACHE_MAX = 600

STATE = {
    'data': None,
    'items': [],
    'byrel': {},
    'ann': {},
    'ann_path': None,
    'lock': threading.Lock(),
    'cache': OrderedDict(),
}


def build_items(data_root, boxes_path):
    """의심 점수(같은 클래스 안에서 종횡비/면적 이탈도)를 매겨 정렬한 목록."""
    boxes = json.loads(Path(boxes_path).read_text(encoding='utf-8'))
    by_cls = defaultdict(list)
    for rel, dets in boxes.items():
        by_cls[Path(rel).parent.name].append((rel, dets))

    items = []
    for cls, entries in by_cls.items():
        ars, areas = [], []
        for rel, dets in entries:
            if not dets:
                continue
            x1, y1, x2, y2 = dets[0]['xyxy']
            w, h = max(1.0, x2 - x1), max(1.0, y2 - y1)
            ars.append(max(w / h, h / w))
            areas.append(w * h)
        med_ar = statistics.median(ars) if ars else 1.0
        med_area = statistics.median(areas) if areas else 1.0
        for rel, dets in entries:
            if dets:
                x1, y1, x2, y2 = dets[0]['xyxy']
                w, h = max(1.0, x2 - x1), max(1.0, y2 - y1)
                susp = (abs(max(w / h, h / w) - med_ar) / max(med_ar, 1e-6)
                        + abs(w * h - med_area) / max(med_area, 1e-6))
            else:
                susp = 99.0     # 검출 실패 → 최우선
            items.append({
                'rel': rel,
                'cls': cls,
                'split': Path(rel).parts[0],
                'boxes': [d['xyxy'] for d in dets[:4]],
                'susp': round(susp, 3),
            })
    items.sort(key=lambda it: (it['cls'], -it['susp'], it['rel']))
    return items


def current_box(rel):
    """수동 수정본이 있으면 그것, 없으면 자동 검출 0번 박스."""
    a = STATE['ann'].get(rel)
    if a is not None:
        if a.get('status') == 'none':
            return None
        if a.get('box'):
            return a['box']
    it = STATE['byrel'].get(rel)
    return it['boxes'][0] if it and it['boxes'] else None


def render_crop(rel):
    box = current_box(rel)
    key = (rel, tuple(box) if box else None)
    with STATE['lock']:
        if key in STATE['cache']:
            STATE['cache'].move_to_end(key)
            return STATE['cache'][key]

    img = Image.open(STATE['data'] / rel).convert('RGB')
    # 크롭을 타일 캔버스에 '맞춰서' 올린다. 가로로 매우 납작한 크롭도
    # 폭을 꽉 채워 보이므로 무엇이 잘렸는지 한눈에 판단할 수 있다.
    tile = Image.new('RGB', (TILE_W, TILE_H), TILE_BG)
    if box is None:
        tile = Image.new('RGB', (TILE_W, TILE_H), (80, 34, 34))
    else:
        W, H = img.size
        x1, y1, x2, y2 = box
        mw, mh = (x2 - x1) * MARGIN, (y2 - y1) * MARGIN
        crop = img.crop((max(0, x1 - mw), max(0, y1 - mh),
                         min(W, x2 + mw), min(H, y2 + mh)))
        if crop.width > 0 and crop.height > 0:
            r = min(TILE_W / crop.width, TILE_H / crop.height)
            nw, nh = max(1, int(crop.width * r)), max(1, int(crop.height * r))
            crop = crop.resize((nw, nh), Image.LANCZOS)
            tile.paste(crop, ((TILE_W - nw) // 2, (TILE_H - nh) // 2))
    out = tile
    buf = io.BytesIO()
    out.save(buf, format='JPEG', quality=82)
    data = buf.getvalue()
    with STATE['lock']:
        STATE['cache'][key] = data
        while len(STATE['cache']) > CACHE_MAX:
            STATE['cache'].popitem(last=False)
    return data


PAGE = r"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>크롭 검수 툴</title><style>
*{box-sizing:border-box}
body{font-family:'Malgun Gothic',sans-serif;background:#161b22;color:#e6edf3;margin:0}
header{background:#0d1117;padding:9px 16px;display:flex;align-items:center;gap:16px;
       border-bottom:1px solid #30363d;position:sticky;top:0;z-index:10;flex-wrap:wrap}
header h1{font-size:15px;margin:0;color:#58a6ff;white-space:nowrap}
.stat{font-size:13px;color:#8b949e}.stat b{color:#e6edf3}
#prog{height:6px;background:#30363d;border-radius:3px;width:180px;overflow:hidden}
#prog i{display:block;height:100%;background:#3fb950;width:0}
select,button{background:#21262d;color:#e6edf3;border:1px solid #30363d;border-radius:6px;
              padding:6px 11px;font-size:13px;font-family:inherit;cursor:pointer}
button:hover{background:#30363d}
button.warn{border-color:#8957e5;color:#d2a8ff}
#hint{padding:10px 16px;font-size:13px;color:#8b949e;background:#0d1117;border-bottom:1px solid #21262d}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;padding:16px}
.card{background:#0d1117;border:3px solid #30363d;border-radius:9px;overflow:hidden;
      cursor:pointer;transition:transform .08s}
.card:hover{transform:scale(1.03);border-color:#58a6ff}
.card img{width:100%;aspect-ratio:320/132;object-fit:cover;background:#2d333b;display:block}
.card img.err{outline:2px dashed #da3633;outline-offset:-6px}
.card .cap{padding:5px 8px;font-size:11px;color:#6e7681;display:flex;justify-content:space-between}
.card.s-ok{border-color:#238636}.card.s-manual{border-color:#8957e5}
.card.s-none{border-color:#da3633}.card.susp{box-shadow:0 0 0 1px #bb8009 inset}
.card .flag{color:#e3b341}
#editor{position:fixed;inset:0;background:rgba(1,4,9,.96);z-index:50;display:none;
        flex-direction:column;padding:10px;gap:8px;overflow:auto}
#editor.on{display:flex}
#etop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:0 0 auto}
#etop h2{margin:0;font-size:16px;color:#e3b341}
#etop button{padding:5px 9px;font-size:12px}
#ebody{flex:1;display:flex;gap:10px;min-height:0}
#estage{flex:1;display:flex;align-items:center;justify-content:center;background:#000;
        border-radius:10px;min-width:0;overflow:hidden}
#wrap{position:relative;line-height:0}
#im{max-width:100%;max-height:100%;display:block}
#ov{position:absolute;left:0;top:0;cursor:crosshair}
#eside{width:230px;flex:0 0 230px;display:flex;flex-direction:column;gap:8px;overflow:auto}
@media (max-width:760px){ #eside{display:none} }
.panel{background:#0d1117;border:1px solid #30363d;border-radius:9px;padding:10px}
.panel h3{margin:0 0 8px;font-size:11.5px;color:#8b949e;font-weight:normal;letter-spacing:.5px}
#cropPrev{width:100%;height:170px;object-fit:contain;background:#000;border-radius:6px;display:block}
.keys{font-size:12.5px;line-height:1.95}
.keys kbd{background:#21262d;border:1px solid #30363d;border-bottom-width:2px;border-radius:4px;
          padding:1px 7px;color:#58a6ff;margin-right:6px}
#toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#3fb950;
       color:#04260f;padding:8px 22px;border-radius:20px;font-weight:bold;font-size:13px;
       opacity:0;transition:opacity .18s;pointer-events:none;z-index:99}
</style></head><body>

<header>
  <h1>🖼 크롭 검수</h1>
  <div id="prog"><i></i></div>
  <span class="stat"><b id="done">0</b>/<span id="total">0</span> 검수
        · <b id="nman">0</b> 수정 · <b id="nskip">0</b> 제외</span>
  <span class="stat">클래스 <select id="clsfilter"></select></span>
  <span class="stat">보기 <select id="filter">
      <option value="all">전체</option>
      <option value="susp">의심스러운 것만</option>
      <option value="todo">미검수만</option>
      <option value="manual">내가 수정한 것</option>
      <option value="none">제외한 것</option>
  </select></span>
  <span class="stat">대상 <select id="splitfilter">
      <option value="trainval">train + val (학습용)</option>
      <option value="train">train</option>
      <option value="val">val</option>
      <option value="test">test (users 사진)</option>
      <option value="">전체</option>
  </select></span>
  <button onclick="approveAll()">이 화면 전부 승인</button>
</header>

<div id="hint">크롭이 <b>표지판을 제대로 담고 있으면 그대로 두시면 됩니다.</b>
  잘못 잘린 것만 클릭 → 원본에서 박스를 다시 그려주세요.
  노란 테두리는 자동으로 의심된다고 표시한 것입니다.</div>

<div id="grid"></div>

<div id="editor">
  <div id="etop">
    <h2 id="ecls">—</h2>
    <span class="stat" id="epos"></span>
    <span class="stat" id="erel"></span>
    <button onclick="closeEd()">닫기 (Esc)</button>
    <button onclick="edPrev()">← 이전</button>
    <button onclick="edNext()">다음 →</button>
    <button class="warn" onclick="resetBox()">자동 박스로 되돌리기</button>
  </div>
  <div id="ebody">
    <div id="estage"><div id="wrap"><img id="im"><canvas id="ov"></canvas></div></div>
    <div id="eside">
      <div class="panel">
        <h3>이렇게 잘립니다 (학습 입력)</h3>
        <canvas id="cropPrev" height="170"></canvas>
      </div>
      <div class="panel">
        <h3>사용법</h3>
        <div class="keys">
          <div><kbd>드래그</kbd> 박스 다시 그리기</div>
          <div><kbd>Space</kbd> 확정하고 다음</div>
          <div><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 다른 후보 박스</div>
          <div><kbd>X</kbd> 표지판 없음 → 제외</div>
          <div><kbd>Esc</kbd> 갤러리로 돌아가기</div>
        </div>
      </div>
    </div>
  </div>
</div>
<div id="toast"></div>

<script>
const SUSP = 1.5;   // 이 값을 넘으면 '의심' 표시 (상위 약 27%)
let ITEMS=[], ANN={}, view=[], ver={}, ed=-1, drag=null, curBox=null, curBoxes=[];
const $ = s => document.querySelector(s);
const im=$('#im'), ov=$('#ov'), ctx=ov.getContext('2d');
const prev=$('#cropPrev'), px=prev.getContext('2d');

async function boot(){
  const d = await (await fetch('/api/items')).json();
  ITEMS = d.items; ANN = d.ann;
  const sel = $('#clsfilter');
  sel.innerHTML = '<option value="">전체 클래스</option>';
  [...new Set(ITEMS.map(i=>i.cls))].sort().forEach(c=>{
    const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o);
  });
  sel.onchange = $('#filter').onchange = $('#splitfilter').onchange = renderGrid;
  renderGrid();
}

function stats(){
  // 진행률은 지금 선택한 split 범위 기준으로 표시한다
  const sf=$('#splitfilter').value;
  const scope = ITEMS.filter(it => sf==='trainval' ? it.split!=='test'
                                 : (!sf || it.split===sf));
  let man=0, skip=0, done=0;
  scope.forEach(it=>{ const a=ANN[it.rel]; if(!a||!a.status) return;
    done++; if(a.status==='manual')man++; else if(a.status==='none')skip++; });
  $('#done').textContent=done; $('#total').textContent=scope.length;
  $('#nman').textContent=man; $('#nskip').textContent=skip;
  $('#prog i').style.width = (scope.length? 100*done/scope.length : 0)+'%';
}

function renderGrid(){
  const cf=$('#clsfilter').value, f=$('#filter').value, sf=$('#splitfilter').value;
  view = ITEMS.filter(it=>{
    if (cf && it.cls!==cf) return false;
    if (sf==='trainval'){ if(it.split==='test') return false; }
    else if (sf && it.split!==sf) return false;
    const a=ANN[it.rel];
    if (f==='susp')   return it.susp>SUSP;
    if (f==='todo')   return !a;
    if (f==='manual') return a && a.status==='manual';
    if (f==='none')   return a && a.status==='none';
    return true;
  });
  const g=$('#grid'); g.innerHTML='';
  view.forEach((it,i)=>{
    const a=ANN[it.rel];
    const cls = 'card' + (a? ' s-'+a.status : '') + (it.susp>SUSP?' susp':'');
    const div=document.createElement('div');
    div.className=cls; div.dataset.rel=it.rel;
    div.innerHTML = '<img loading="lazy" onerror="this.classList.add(\'err\')" '
      + 'src="/crop/'+encodeURI(it.rel)+'?v='+(ver[it.rel]||0)+'">'
      + '<div class="cap"><span>'+it.cls+'</span>'
      + '<span class="flag">'+(it.susp>SUSP?'⚠':'')+(a&&a.status==='manual'?'✎':'')
      + (a&&a.status==='none'?'✕':'')+'</span></div>';
    div.onclick=()=>openEd(i);
    g.appendChild(div);
  });
  stats();
}

function refreshCard(rel){
  ver[rel]=(ver[rel]||0)+1;
  const c=[...document.querySelectorAll('.card')].find(c=>c.dataset.rel===rel);
  if(!c) return;
  const a=ANN[rel];
  const it=ITEMS.find(x=>x.rel===rel);
  c.className='card'+(a?' s-'+a.status:'')+(it.susp>SUSP?' susp':'');
  c.querySelector('img').src='/crop/'+encodeURI(rel)+'?v='+ver[rel];
  c.querySelector('.flag').textContent=(it.susp>SUSP?'⚠':'')
      +(a&&a.status==='manual'?'✎':'')+(a&&a.status==='none'?'✕':'');
}

function openEd(i){
  ed=i; const it=view[ed]; if(!it) return;
  $('#editor').classList.add('on');
  $('#ecls').textContent=it.cls;
  $('#erel').textContent=it.rel;
  $('#epos').textContent='('+(ed+1)+'/'+view.length+')';
  curBoxes=it.boxes||[];
  const a=ANN[it.rel];
  curBox = (a&&a.box)? a.box.slice() : (curBoxes[0]?curBoxes[0].slice():null);
  im.src='/img/'+encodeURI(it.rel);
  for(let k=1;k<=2;k++){ const n=view[ed+k]; if(n) new Image().src='/img/'+encodeURI(n.rel); }
}
function closeEd(){ $('#editor').classList.remove('on'); ed=-1; }
function edNext(){ if(ed<view.length-1) openEd(ed+1); else closeEd(); }
function edPrev(){ if(ed>0) openEd(ed-1); }

im.onload=()=>{ syncCanvas(); draw(); };
im.onerror=()=>{ toast('원본 이미지를 못 불러왔습니다: '+im.getAttribute('src')); };
function syncCanvas(){
  ov.width=im.clientWidth; ov.height=im.clientHeight;
  ov.style.width=im.clientWidth+'px'; ov.style.height=im.clientHeight+'px';
}
window.addEventListener('resize',()=>{ if(ed>=0){syncCanvas();draw();} });
function sc(){ return im.naturalWidth/im.clientWidth; }

function draw(){
  ctx.clearRect(0,0,ov.width,ov.height);
  const s=sc();
  curBoxes.forEach((b,i)=>{
    if(curBox&&b[0]===curBox[0]&&b[1]===curBox[1]&&b[2]===curBox[2]&&b[3]===curBox[3])return;
    ctx.strokeStyle='rgba(255,171,0,.7)'; ctx.lineWidth=2;
    ctx.strokeRect(b[0]/s,b[1]/s,(b[2]-b[0])/s,(b[3]-b[1])/s);
    ctx.fillStyle='rgba(255,171,0,.95)'; ctx.font='bold 14px sans-serif';
    ctx.fillText(String(i+1), b[0]/s+4, b[1]/s+15);
  });
  if(curBox){
    ctx.strokeStyle='#3fb950'; ctx.lineWidth=3;
    ctx.strokeRect(curBox[0]/s,curBox[1]/s,(curBox[2]-curBox[0])/s,(curBox[3]-curBox[1])/s);
  }
  if(drag&&drag.cur){
    ctx.strokeStyle='#a371f7'; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.strokeRect(drag.x0,drag.y0,drag.cur[0]-drag.x0,drag.cur[1]-drag.y0);
    ctx.setLineDash([]);
  }
  drawPrev();
}
function drawPrev(){
  prev.width=prev.clientWidth;
  px.fillStyle='#000'; px.fillRect(0,0,prev.width,prev.height);
  if(!curBox||!im.naturalWidth) return;
  const m=0.12, w=curBox[2]-curBox[0], h=curBox[3]-curBox[1];
  if(w<=0||h<=0) return;
  const sx=Math.max(0,curBox[0]-w*m), sy=Math.max(0,curBox[1]-h*m);
  const sw=Math.min(im.naturalWidth-sx,w*(1+2*m)), sh=Math.min(im.naturalHeight-sy,h*(1+2*m));
  const r=Math.min(prev.width/sw, prev.height/sh);
  px.drawImage(im,sx,sy,sw,sh,(prev.width-sw*r)/2,(prev.height-sh*r)/2,sw*r,sh*r);
}

ov.addEventListener('mousedown',e=>{
  const r=ov.getBoundingClientRect();
  drag={x0:e.clientX-r.left, y0:e.clientY-r.top, cur:null};
});
ov.addEventListener('mousemove',e=>{
  if(!drag)return;
  const r=ov.getBoundingClientRect();
  drag.cur=[e.clientX-r.left,e.clientY-r.top]; draw();
});
window.addEventListener('mouseup',()=>{
  if(!drag)return;
  const d=drag; drag=null;
  if(!d.cur){ draw(); return; }
  const s=sc();
  const x1=Math.min(d.x0,d.cur[0])*s, y1=Math.min(d.y0,d.cur[1])*s;
  const x2=Math.max(d.x0,d.cur[0])*s, y2=Math.max(d.y0,d.cur[1])*s;
  if(x2-x1<12||y2-y1<12){ draw(); return; }
  curBox=[Math.round(x1),Math.round(y1),Math.round(x2),Math.round(y2)];
  draw(); save('manual',curBox);
});

function save(status,box,advance){
  const it=view[ed]; if(!it)return;
  ANN[it.rel]={status:status,box:box};
  fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({rel:it.rel,status:status,box:box})});
  refreshCard(it.rel); stats();
  toast(status==='manual'?'수정 저장':status==='none'?'제외':'승인');
  if(advance) edNext();
}
function resetBox(){
  const it=view[ed]; if(!it)return;
  delete ANN[it.rel];
  fetch('/api/save',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({rel:it.rel,status:null})});
  curBox=curBoxes[0]?curBoxes[0].slice():null;
  draw(); refreshCard(it.rel); stats(); toast('자동 박스로 복원');
}
function pick(n){ if(curBoxes[n]){ curBox=curBoxes[n].slice(); draw(); save('manual',curBox,true);} }

function approveAll(){
  if(!confirm('지금 화면에 보이는 '+view.length+'장을 모두 "이대로 정상"으로 표시할까요?'))return;
  const rels=view.filter(v=>!ANN[v.rel]).map(v=>v.rel);
  rels.forEach(r=>{ ANN[r]={status:'ok',box:current(r)}; });
  fetch('/api/save_bulk',{method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({rels:rels})});
  renderGrid(); toast(rels.length+'장 승인');
}
function current(rel){
  const a=ANN[rel]; if(a&&a.box)return a.box;
  const it=ITEMS.find(x=>x.rel===rel); return it&&it.boxes[0]?it.boxes[0]:null;
}

let tt;
function toast(m){ const t=$('#toast'); t.textContent=m; t.style.opacity=1;
  clearTimeout(tt); tt=setTimeout(()=>t.style.opacity=0,700); }

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='SELECT')return;
  if(ed<0) return;
  if(e.key==='Escape'){ closeEd(); }
  else if(e.code==='Space'){ e.preventDefault(); save(ANN[view[ed].rel]?.status==='manual'?'manual':'ok',curBox,true); }
  else if(e.key==='x'||e.key==='X'){ save('none',null,true); }
  else if(e.key==='ArrowRight'){ edNext(); }
  else if(e.key==='ArrowLeft'){ edPrev(); }
  else if(['1','2','3','4'].includes(e.key)){ pick(parseInt(e.key)-1); }
});

boot();
</script></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, ctype, body, extra=None):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        path = u.path
        if path == '/':
            return self._send(200, 'text/html; charset=utf-8', PAGE.encode('utf-8'))
        if path == '/api/items':
            body = json.dumps({'items': STATE['items'], 'ann': STATE['ann']},
                              ensure_ascii=False).encode('utf-8')
            return self._send(200, 'application/json; charset=utf-8', body)
        if path == '/api/export':
            body = json.dumps(STATE['ann'], ensure_ascii=False, indent=1).encode('utf-8')
            return self._send(200, 'application/json; charset=utf-8', body,
                              {'Content-Disposition': 'attachment; filename=annotations.json'})
        if path.startswith('/crop/'):
            rel = unquote(path[len('/crop/'):])
            if rel not in STATE['byrel']:
                return self._send(404, 'text/plain', b'nf')
            return self._send(200, 'image/jpeg', render_crop(rel))
        if path.startswith('/img/'):
            rel = unquote(path[len('/img/'):])
            fp = (STATE['data'] / rel).resolve()
            if STATE['data'].resolve() not in fp.parents or not fp.exists():
                return self._send(404, 'text/plain', b'nf')
            return self._send(200, 'image/jpeg', fp.read_bytes())
        return self._send(404, 'text/plain', b'nf')

    def do_POST(self):
        path = urlparse(self.path).path
        n = int(self.headers.get('Content-Length', 0))
        data = json.loads(self.rfile.read(n).decode('utf-8')) if n else {}
        if path == '/api/save':
            with STATE['lock']:
                if data.get('status') is None:
                    STATE['ann'].pop(data['rel'], None)
                else:
                    STATE['ann'][data['rel']] = {'status': data['status'],
                                                 'box': data.get('box')}
            self._flush()
            return self._send(200, 'application/json', b'{"ok":true}')
        if path == '/api/save_bulk':
            with STATE['lock']:
                for rel in data.get('rels', []):
                    it = STATE['byrel'].get(rel)
                    box = it['boxes'][0] if it and it['boxes'] else None
                    STATE['ann'][rel] = {'status': 'ok', 'box': box}
            self._flush()
            return self._send(200, 'application/json', b'{"ok":true}')
        return self._send(404, 'text/plain', b'nf')

    def _flush(self):
        with STATE['lock']:
            STATE['ann_path'].write_text(
                json.dumps(STATE['ann'], ensure_ascii=False), encoding='utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='0721_data_split')
    ap.add_argument('--boxes', default='pipeline/boxes.json')
    ap.add_argument('--ann', default='pipeline/annotations.json')
    ap.add_argument('--port', type=int, default=8765)
    args = ap.parse_args()

    STATE['data'] = Path(args.data)
    STATE['ann_path'] = Path(args.ann)
    STATE['items'] = build_items(args.data, args.boxes)
    STATE['byrel'] = {it['rel']: it for it in STATE['items']}
    if STATE['ann_path'].exists():
        STATE['ann'] = json.loads(STATE['ann_path'].read_text(encoding='utf-8'))

    n_susp = sum(1 for it in STATE['items'] if it['susp'] > 1.5)
    print(f'크롭 {len(STATE["items"])}장 (의심 표시 {n_susp}장, '
          f'검수 완료 {len(STATE["ann"])}장)')
    print(f'  http://localhost:{args.port}  (창을 닫아도 진행 상황은 저장됩니다)')

    srv = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    threading.Timer(0.6, lambda: webbrowser.open(f'http://localhost:{args.port}')).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print(f'\n종료. 검수 결과: {args.ann} ({len(STATE["ann"])}장)')


if __name__ == '__main__':
    main()
