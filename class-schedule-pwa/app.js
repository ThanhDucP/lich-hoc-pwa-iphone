const KEY="schedule-pwa-v1";
const CFG="schedule-config-v1";
let schedule=[];
let config=JSON.parse(localStorage.getItem(CFG)||"{}");

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

function todayISO(){const d=new Date();return localISO(d)}
function localISO(d){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function fmtDate(s){return new Date(s+"T00:00:00").toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit"})}
function save(){localStorage.setItem(KEY,JSON.stringify(schedule))}
function load(){try{schedule=JSON.parse(localStorage.getItem(KEY)||"[]")}catch{schedule=[]}}
function normalize(r,i){
  const get=(keys)=>{for(const k of keys){if(r[k]!==undefined&&String(r[k]).trim()!=="")return String(r[k]).trim()}return""};
  let date=get(["date","Date","Ngày","Ngày học","ngay"]);
  if(date.includes("/")){const p=date.split("/");if(p.length===3)date=`${p[2].length===2?"20"+p[2]:p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`}
  return {id:get(["id","ID"])||`${date}-${i}`,date,start:get(["startTime","start","Giờ bắt đầu","Bắt đầu","time"]),end:get(["endTime","end","Giờ kết thúc","Kết thúc"]),subject:get(["subject","Subject","Môn","Môn học","Tên môn"]),teacher:get(["teacher","GV","Giảng viên","Giáo viên"]),room:get(["room","Phòng","Room"]),note:get(["note","Ghi chú","Note"]),status:get(["status","Trạng thái"])||"SCHEDULED"};
}
function parseCSV(text){
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c=='"'&&q&&n=='"'){cell+='"';i++;continue}if(c=='"'){q=!q;continue}if(c==","&&!q){row.push(cell);cell="";continue}if((c=="\n"||c=="\r")&&!q){if(c=="\r"&&n=="\n")i++;row.push(cell);cell="";if(row.some(x=>x.trim()))rows.push(row);row=[];continue}cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}
  if(!rows.length)return[];
  const headers=rows[0].map(x=>x.trim());
  return rows.slice(1).map((r,i)=>Object.fromEntries(headers.map((h,j)=>[h,r[j]??""]))).map(normalize);
}
async function fetchData(){
  if(config.apiUrl){
    const r=await fetch(config.apiUrl,{cache:"no-store"});if(!r.ok)throw Error("API "+r.status);
    const data=await r.json();return (data.schedule||data).map(normalize);
  }
  if(config.csvUrl){
    const r=await fetch(config.csvUrl,{cache:"no-store"});if(!r.ok)throw Error("CSV "+r.status);
    return parseCSV(await r.text());
  }
  throw Error("Chưa cấu hình nguồn dữ liệu");
}
async function sync(){
  setStatus("Đang đồng bộ…");
  try{const fresh=await fetchData();schedule=fresh.filter(x=>x.date&&x.subject);save();localStorage.setItem("lastSync",new Date().toISOString());render();setStatus(`Đã đồng bộ ${schedule.length} buổi • ${new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}`)}
  catch(e){setStatus("Không đồng bộ được: "+e.message+" • đang dùng dữ liệu đã lưu");render()}
}
function setStatus(s){$("#status").textContent=s}
function eventCard(e){
  const now=new Date(), start=new Date(`${e.date}T${(e.start||"00:00").slice(0,5)}:00`);
  const end=new Date(`${e.date}T${(e.end||e.start||"23:59").slice(0,5)}:00`);
  const cls=now>=start&&now<=end?"current":now>end?"done":"";
  const meta=[e.room,e.teacher,e.note].filter(Boolean).join(" • ");
  return `<div class="event ${cls}"><div class="time">${e.start||"—"}<br>${e.end||""}</div><div><div class="subject">${escapeHtml(e.subject)}</div><div class="meta">${escapeHtml(meta||"Chưa có thông tin")}</div></div></div>`;
}
function escapeHtml(x){return String(x).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function render(){
  const t=todayISO(), today=schedule.filter(x=>x.date===t).sort((a,b)=>(a.start||"").localeCompare(b.start||""));
  $("#pageTitle").textContent="Hôm nay";
  $("#todayList").innerHTML=today.length?today.map(eventCard).join(""):`<div class="empty">Hôm nay không có lịch học.</div>`;
  const next=schedule.filter(x=>x.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
  $("#summaryCard").innerHTML=next?`<div class="big">${today.length} buổi hôm nay</div><div class="muted">${next.date===t?"Tiết tiếp theo":"Tiết tiếp theo: "+fmtDate(next.date)} • ${next.start||""} • ${escapeHtml(next.subject)}</div>`:`<div class="big">Không có lịch sắp tới</div><div class="muted">Hãy đồng bộ lại dữ liệu.</div>`;
  renderWeek($("#weekPicker").value||t);renderSubjects();
}
function renderWeek(anchor){
  const d=new Date(anchor+"T00:00:00"), day=(d.getDay()+6)%7, monday=new Date(d);monday.setDate(d.getDate()-day);
  let html="";
  for(let i=0;i<7;i++){const x=new Date(monday);x.setDate(monday.getDate()+i);const iso=localISO(x), items=schedule.filter(e=>e.date===iso).sort((a,b)=>(a.start||"").localeCompare(b.start||""));html+=`<div class="day-card"><div class="day-title"><span>${fmtDate(iso)}</span><span>${items.length} buổi</span></div>${items.length?items.map(eventCard).join(""):`<div class="hint" style="margin-top:10px">Trống</div>`}</div>`}
  $("#weekGrid").innerHTML=html;
}
function renderSubjects(){
  const map={};for(const e of schedule){if(!e.subject)continue;map[e.subject]=(map[e.subject]||[]).concat(e)}
  const entries=Object.entries(map).sort((a,b)=>b[1].length-a[1].length);
  $("#subjectList").innerHTML=entries.length?entries.map(([name,items])=>`<div class="subject-card"><div class="subject-row"><strong>${escapeHtml(name)}</strong><span class="badge">${items.length} buổi</span></div><div class="hint" style="margin-top:8px">${escapeHtml([items[0].teacher,items[0].room].filter(Boolean).join(" • ")||"Chưa có thông tin")}</div></div>`).join(""):`<div class="empty">Chưa có dữ liệu môn học.</div>`;
}
function applyConfig(){
  $("#apiUrl").value=config.apiUrl||"";$("#csvUrl").value=config.csvUrl||"";$("#reminderMinutes").value=config.reminderMinutes||15;
}
async function askNotify(){
  if(!("Notification"in window)){alert("Trình duyệt này không hỗ trợ Notification.");return}
  const p=await Notification.requestPermission();setStatus("Notification: "+p);
}
function demo(){
  const t=todayISO(), d=new Date(t+"T00:00:00");const iso=n=>{const x=new Date(d);x.setDate(d.getDate()+n);return localISO(x)};
  schedule=[{id:"1",date:iso(0),start:"09:30",end:"11:30",subject:"Software Architecture",teacher:"Nguyễn Văn A",room:"B201",status:"SCHEDULED"},{id:"2",date:iso(0),start:"13:30",end:"15:30",subject:"Database",teacher:"Trần Văn B",room:"Lab 2",status:"SCHEDULED"},{id:"3",date:iso(1),start:"07:30",end:"09:30",subject:"Java Advanced",teacher:"Lê Văn C",room:"A302",status:"SCHEDULED"}];save();render();setStatus("Đang dùng dữ liệu mẫu.")}
$$(".nav-item").forEach(b=>b.onclick=()=>{ $$(".nav-item").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".page").forEach(x=>x.classList.remove("active"));$("#"+b.dataset.page).classList.add("active");$("#pageTitle").textContent={home:"Hôm nay",week:"Tuần này",subjects:"Môn học",settings:"Cài đặt"}[b.dataset.page]});
$("#syncBtn").onclick=sync;$("#todayBtn").onclick=()=>{const t=todayISO();$("#weekPicker").value=t;renderWeek(t)};
$("#weekPicker").onchange=e=>renderWeek(e.target.value);
$("#saveSettings").onclick=()=>{config={apiUrl:$("#apiUrl").value.trim(),csvUrl:$("#csvUrl").value.trim(),reminderMinutes:+$("#reminderMinutes").value};localStorage.setItem(CFG,JSON.stringify(config));setStatus("Đã lưu cấu hình.");sync()};
$("#notifyBtn").onclick=askNotify;$("#demoBtn").onclick=demo;
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
load();applyConfig();$("#weekPicker").value=todayISO();render();
if(config.apiUrl||config.csvUrl)sync();
