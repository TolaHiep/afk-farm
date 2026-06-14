/* ===== Admin app logic (prototype) ===== */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

// ---- Navigation ----
const PAGES = {
  dashboard: ["Bảng điều hành", "Tổng quan toàn trang trại hôm nay"],
  heatmap:   ["Bản đồ nhiệt", "Trạng thái các vùng theo màu xanh / vàng / đỏ"],
  zones:     ["Vùng & Lô", "Tạo lô, vẽ ranh giới và gán tổ trưởng"],
  process:   ["Quy trình canh tác", "Số hóa các bước để hệ thống tự sinh việc"],
  calendar:  ["Lịch 10 ngày", "Công việc tự sinh, xem trước và điều phối"],
  kpi:       ["KPI hiệu suất tổ trưởng", "Đánh giá nhân sự theo kỳ"],
};
function go(page){
  $$(".nav-i").forEach(n=>n.classList.toggle("active", n.dataset.p===page));
  $$(".view").forEach(v=>v.classList.toggle("active", v.id==="v-"+page));
  $(".pg-title").textContent = PAGES[page][0];
  $(".pg-sub").textContent = PAGES[page][1];
  window.scrollTo(0,0);
}
$$(".nav-i").forEach(n=> n.onclick = ()=>go(n.dataset.p));

const fmtDate = d => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;

// ---- Dashboard ----
function renderDashboard(){
  const today = TASKS.filter(t=>t.d===0);
  const done = 3, total = today.length;
  const pct = Math.round(done/total*100);
  const overdue = today.filter(t=>t.st==="red").length + 1;
  const redZones = BLOCKS.filter(b=>b.status==="red").length;
  const amberZones = BLOCKS.filter(b=>b.status==="amber").length;
  $("#dash-metrics").innerHTML = [
    metric("% hoàn thành hôm nay", pct+"%", `${done}/${total} việc`, "up", icCheck, "var(--green-50)","var(--green-700)"),
    metric("Việc quá hạn", overdue, "cần xử lý", "down", icClock, "#F4DDD8","var(--red)"),
    metric("Vùng đỏ / vàng", redZones+" / "+amberZones, "trên "+BLOCKS.length+" lô", "", icMap, "#F6ECCF","#946409"),
    metric("Bất thường mới", ALERTS.filter(a=>a.type==="red").length, "trong hôm nay", "down", icAlert, "var(--clay-50)","var(--clay)"),
  ].join("");

  // bar chart theo vùng
  const zones = [...new Set(BLOCKS.map(b=>b.zone))];
  $("#dash-bar").innerHTML = zones.map(z=>{
    const tks = today.filter(t=>BLOCKS.find(b=>b.id===t.blk).zone===z);
    const g = tks.filter(t=>t.st==="green").length, a=tks.filter(t=>t.st==="amber").length, r=tks.filter(t=>t.st==="red").length;
    const tot = Math.max(tks.length,1);
    return `<div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><b>${z}</b><span class="mono" style="color:var(--ink-soft)">${tks.length} việc</span></div>
      <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;background:var(--paper-2)">
        <i style="width:${g/tot*100}%;background:var(--green-500)"></i>
        <i style="width:${a/tot*100}%;background:var(--amber)"></i>
        <i style="width:${r/tot*100}%;background:var(--red)"></i>
      </div></div>`;
  }).join("");

  $("#dash-alerts").innerHTML = ALERTS.map(a=>`
    <div style="display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--line-2)">
      <span class="dot s-${a.type}" style="margin-top:6px"></span>
      <div><div style="font-size:13.5px;font-weight:500">${a.txt}</div>
      <div class="mono" style="font-size:11px;color:var(--ink-soft);margin-top:3px">${a.who}</div></div>
    </div>`).join("");
}
function metric(lbl,num,sub,dir,ic,bg,fg){
  return `<div class="card metric">
    <span class="ic" style="background:${bg};color:${fg}">${ic}</span>
    <div class="lbl">${lbl}</div><div class="num">${num}</div>
    <div class="delta ${dir}">${sub}</div></div>`;
}

// ---- Heat map (SVG) ----
let selectedBlock = null;
function renderHeatmap(){
  const cw=180, ch=120, gap=22, padX=30, padY=30;
  const cols=3, rows=2;
  const W = padX*2 + cols*cw + (cols-1)*gap;
  const H = padY*2 + rows*ch + (rows-1)*gap + 26;
  let svg = `<svg class="farm-svg" viewBox="0 0 ${W} ${H}">`;
  svg += `<text x="${padX}" y="20" class="mono" style="font-size:11px;fill:var(--ink-soft)">SƠ ĐỒ TRANG TRẠI · 6 LÔ</text>`;
  BLOCKS.forEach(b=>{
    const x = padX + b.gx*(cw+gap), y = padY + b.gy*(ch+gap);
    const f = STATUS[b.status].fill;
    svg += `<g class="blk" onclick="selectBlock('${b.id}')">
      <rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="12" fill="${f}" fill-opacity="${selectedBlock===b.id?0.95:0.8}" stroke="${selectedBlock===b.id?'#173527':'rgba(0,0,0,.08)'}" stroke-width="${selectedBlock===b.id?3:1}"/>
      <text x="${x+14}" y="${y+28}" class="blk-label" style="font-size:15px">${b.id}</text>
      <text x="${x+14}" y="${y+46}" class="blk-label" style="font-size:9px;opacity:.85">${b.area} ha</text>
      <text x="${x+14}" y="${y+ch-14}" class="blk-label" style="font-size:9px;opacity:.85">${b.crops.map(c=>CROP[c].label).join(" + ")}</text>
    </g>`;
  });
  svg += `</svg>`;
  $("#map-holder").innerHTML = svg;
  $("#map-legend").innerHTML = Object.entries(STATUS).map(([k,v])=>
    `<span><span class="dot s-${k}"></span>${v.label}</span>`).join("");
  renderBlockPanel();
}
function selectBlock(id){ selectedBlock=id; renderHeatmap(); }
function renderBlockPanel(){
  const el = $("#block-panel");
  if(!selectedBlock){ el.className="panel empty"; el.innerHTML="Chọn một lô trên bản đồ để xem chi tiết việc & báo cáo"; return; }
  const b = BLOCKS.find(x=>x.id===selectedBlock);
  const tks = TASKS.filter(t=>t.d===0 && t.blk===b.id);
  el.className="panel";
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start">
      <div><div class="eyebrow">${b.zone}</div><h3 class="serif" style="font-size:24px">Lô ${b.id}</h3></div>
      <span class="badge ${STATUS[b.status].cls}"><span class="dot ${STATUS[b.status].dot}"></span>${STATUS[b.status].label}</span>
    </div>
    <div style="display:flex;gap:22px;margin:14px 0 18px">
      <div><div class="eyebrow">Diện tích</div><div class="serif" style="font-size:20px">${b.area} ha</div></div>
      <div><div class="eyebrow">Cây trồng</div><div style="margin-top:4px">${b.crops.map(c=>`<span class="badge ${CROP[c].bd}">${CROP[c].label}</span>`).join(" ")}</div></div>
      <div><div class="eyebrow">Tổ trưởng</div><div style="font-weight:600;margin-top:4px">${leaderName(b.leader)}</div></div>
    </div>
    <div class="eyebrow" style="margin-bottom:8px">Việc hôm nay (${tks.length})</div>
    ${tks.map(t=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line-2)">
      <div><span class="dot ${STATUS[t.st].dot}"></span> ${t.t} <span class="badge ${CROP[t.crop].bd}" style="margin-left:6px">${CROP[t.crop].label}</span></div>
    </div>`).join("") || '<div style="color:var(--ink-soft);font-size:13px">Không có việc</div>'}
    <button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="go('calendar')">Xem lịch lô này</button>`;
}

// ---- Zones & boundary draw ----
function renderZones(){
  const zones=[...new Set(BLOCKS.map(b=>b.zone))];
  $("#zone-list").innerHTML = zones.map(z=>{
    const bs = BLOCKS.filter(b=>b.zone===z);
    const area = bs.reduce((s,b)=>s+b.area,0).toFixed(1);
    return `<div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div><h4>${z}</h4><div class="mono" style="font-size:11.5px;color:var(--ink-soft)">${bs.length} lô · ${area} ha</div></div>
        <span class="badge b-gray">${bs.length} lô</span>
      </div>
      <table><thead><tr><th>Lô</th><th>Diện tích</th><th>Cây trồng</th><th>Tổ trưởng</th><th>Trạng thái</th></tr></thead><tbody>
      ${bs.map(b=>`<tr>
        <td><b>${b.id}</b></td><td class="t-num">${b.area} ha</td>
        <td>${b.crops.map(c=>`<span class="badge ${CROP[c].bd}">${CROP[c].label}</span>`).join(" ")}</td>
        <td>${leaderName(b.leader)}</td>
        <td><span class="badge ${STATUS[b.status].cls}"><span class="dot ${STATUS[b.status].dot}"></span>${STATUS[b.status].label}</span></td>
      </tr>`).join("")}
      </tbody></table></div>`;
  }).join("");
}
// boundary modal
let pts=[];
function openDraw(){ pts=[]; $("#draw-modal").classList.add("show"); drawPoly(); }
function closeDraw(){ $("#draw-modal").classList.remove("show"); }
function addPoint(e){
  const svg=$("#draw-svg"); const r=svg.getBoundingClientRect();
  const x=Math.round(e.clientX-r.left), y=Math.round(e.clientY-r.top);
  pts.push([x,y]); drawPoly();
}
function drawPoly(){
  const poly = pts.map(p=>p.join(",")).join(" ");
  let inner = pts.length>1 ? `<polygon points="${poly}" fill="rgba(74,138,94,.25)" stroke="var(--green-700)" stroke-width="2"/>`:"";
  inner += pts.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="var(--clay)"/>`).join("");
  $("#draw-svg").innerHTML = inner;
  // diện tích giả lập theo shoelace
  let area=0;
  for(let i=0;i<pts.length;i++){const[a,b]=pts[i],[c,d]=pts[(i+1)%pts.length];area+=a*d-c*b;}
  area=Math.abs(area/2)/900; // px -> ha giả lập
  $("#draw-area").value = pts.length>2 ? area.toFixed(2) : "";
}

// ---- Process ----
let curProc="sam";
function renderProcess(){
  $$(".proc-tab").forEach(t=>t.classList.toggle("active", t.dataset.c===curProc));
  const p=PROCESS[curProc];
  $("#proc-name").textContent=p.name;
  $("#proc-body").innerHTML = p.steps.map(s=>`<tr>
    <td class="t-num"><b>${s[0]}</b></td><td>${s[1]}</td>
    <td class="t-num">${s[2]}</td><td class="mono" style="font-size:12px">${s[3]}</td>
    <td><span class="badge ${s[4]==="Theo cây"?"b-clay":"b-gray"}">${s[4]}</span></td>
  </tr>`).join("");
}
function setProc(c){ curProc=c; renderProcess(); }

// ---- Calendar ----
function renderCalendar(){
  const base=new Date();
  let html="";
  for(let d=0;d<10;d++){
    const dt=new Date(base); dt.setDate(base.getDate()+d);
    const tks=TASKS.filter(t=>t.d===d);
    html+=`<div class="cal-col">
      <div class="cal-hd ${d===0?'today':''}"><div class="d">${dt.getDate()}</div><div class="w">${DOW[dt.getDay()]} · ${dt.getMonth()+1>9?'':'0'}${dt.getMonth()+1}</div></div>
      <div class="cal-body">${tks.map(t=>`
        <div class="task-chip ${CROP[t.crop].cls}" onclick="taskInfo('${t.t.replace(/'/g,"")}','${t.blk}','${t.crop}','${t.leader}','${t.st}')">
          <div class="tt">${t.t}</div>
          <div class="mt"><span>${t.blk} · ${CROP[t.crop].label}</span><span>${leaderInit(t.leader)}</span></div>
        </div>`).join("")||'<div style="color:var(--ink-soft);font-size:11px;text-align:center;padding:12px 0">—</div>'}
      </div></div>`;
  }
  $("#cal-grid").innerHTML=html;
}
function taskInfo(t,blk,crop,leader,st){
  $("#task-modal").classList.add("show");
  $("#task-modal-body").innerHTML=`
    <div class="eyebrow">Lô ${blk} · ${CROP[crop].label}</div>
    <h3 class="serif" style="font-size:24px;margin:4px 0 16px">${t}</h3>
    <div class="grid cols-2" style="gap:14px;margin-bottom:18px">
      <div class="card" style="box-shadow:none"><div class="eyebrow">Tổ trưởng được gán</div><div style="font-weight:600;margin-top:6px">${leaderName(leader)}</div></div>
      <div class="card" style="box-shadow:none"><div class="eyebrow">Trạng thái</div><div style="margin-top:6px"><span class="badge ${STATUS[st].cls}"><span class="dot ${STATUS[st].dot}"></span>${STATUS[st].label}</span></div></div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn" onclick="alert('(Demo) Mở hộp chọn tổ trưởng khác')">Gán lại tổ trưởng</button>
      <button class="btn btn-clay" onclick="alert('(Demo) Lùi lịch sang ngày khác — không ảnh hưởng cây còn lại trên lô')">Lùi lịch</button>
    </div>
    <p style="margin-top:16px;font-size:12.5px;color:var(--ink-soft)">Hệ thống không tự đổi lịch các ngày sau. Admin chủ động điều phối.</p>`;
}
function closeTask(){ $("#task-modal").classList.remove("show"); }

// ---- KPI ----
function renderKPI(){
  $("#kpi-body").innerHTML = KPI.map(k=>{
    const L=LEADERS.find(l=>l.id===k.id);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:10px"><span class="avatar" style="width:30px;height:30px;font-size:12px">${L.init}</span><b>${L.name}</b></div></td>
      <td style="min-width:160px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span></span><span class="mono">${k.ontime}%</span></div><div class="kbar"><i style="width:${k.ontime}%;background:${k.ontime>=90?'var(--green-500)':'var(--amber)'}"></i></div></td>
      <td class="t-num" style="text-align:center">${k.overdue}</td>
      <td class="t-num" style="text-align:center">${k.done}</td>
      <td class="t-num" style="text-align:center">${k.reportRate}%</td>
      <td class="t-num" style="text-align:center">${k.abnormal}</td>
      <td class="t-num" style="text-align:center">${k.mandays}</td>
    </tr>`;
  }).join("");
}

// ---- icons ----
const icCheck='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="M20 6 9 17l-5-5"/></svg>';
const icClock='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const icMap='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v14M15 6v14"/></svg>';
const icAlert='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

// init
renderDashboard(); renderHeatmap(); renderZones(); renderProcess(); renderCalendar(); renderKPI();
