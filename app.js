const DATA_KEY="schedule-pwa-v2";
const CONFIG_KEY="schedule-config-v2";
const NOTIFIED_KEY="schedule-notified-v1";
let schedule=[];
let config=loadJSON(CONFIG_KEY,{apiUrl:"",apiToken:"",reminderMinutes:15});
config.apiUrl=normalizeApiUrl(config.apiUrl);
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

function loadJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function normalizeApiUrl(value){
  const s=String(value??"").trim();
  if(!s)return "";
  return s.replace(/(https:\/\/script\.google\.com)\/macros\/u\/\\d+\/s\//,"$1/macros/s/");
}
function saveJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
function localISO(d){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function todayISO(){return localISO(new Date())}
function fmtDate(s){return new Date(s+"T00:00:00").toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit"})}
function esc(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function timeValue(x){return String(x??"").trim().slice(0,5)}
function normalizeDate(value){
  const s=String(value??"").trim();
  if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)){const [y,m,d]=s.split("-");return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`}
  const m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if(m)return `${m[3].length===2?"20"+m[3]:m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  return s.slice(0,10);
}
function normalize(row,index){
  const get=keys=>{for(const k of keys){if(row?.[k]!==undefined&&String(row[k]).trim()!=="")return String(row[k]).trim()}return ""};
  const date=normalizeDate(get(["date","Date","Ngày","Ngày học","ngay","DATE"]));
  const subject=get(["subject","Subject","Môn","Môn học","Tên môn","Tên môn học"]);
  return {
    id:get(["id","ID"])||`${date}-${subject}-${index}`,
    date,
    start:timeValue(get(["start","startTime","Giờ bắt đầu","Bắt đầu","time","Time"])),
    end:timeValue(get(["end","endTime","Giờ kết thúc","Kết thúc"])),
    subject,
    teacher:get(["teacher","GV","Giảng viên","Giáo viên"]),
    room:get(["room","Phòng","Room"]),
    note:get(["note","Ghi chú","Note"]),
    status:get(["status","Trạng thái"])||"SCHEDULED",
    sourceSheet:get(["sourceSheet","Sheet"]),
    sourceRow:get(["sourceRow","Row"])
  };
}
function normalizePayload(payload){
  const raw=Array.isArray(payload)?payload:(Array.isArray(payload?.schedule)?payload.schedule:[]);
  const seen=new Set();
  return raw.map(normalize).filter(x=>x.date&&x.subject).filter(x=>{
    const key=[x.date,x.start,x.end,x.subject,x.room,x.teacher].join("|");
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
function jsonp(url){
  return new Promise((resolve,reject)=>{
    const callback="scheduleCallback_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    const timer=setTimeout(()=>{cleanup();reject(Error("API timeout"))},12000);
    function cleanup(){clearTimeout(timer);delete window[callback];script.remove()}
    window[callback]=payload=>{cleanup();payload?.error?reject(Error(payload.error)):resolve(payload)};
    script.onerror=()=>{cleanup();reject(Error("API request failed"))};
    const u=new URL(normalizeApiUrl(url));
    u.searchParams.set("callback",callback);
    if(config.apiToken)u.searchParams.set("token",config.apiToken);
    u.searchParams.set("t",Date.now());
    script.src=u.toString();
    document.head.appendChild(script);
  });
}
async function fetchData(){
  if(!config.apiUrl)throw Error("Chưa cấu hình Apps Script URL");
  return normalizePayload(await jsonp(config.apiUrl));
}
async function sync(){
  setStatus("Đang đồng bộ…");
  try{
    const fresh=await fetchData();
    schedule=fresh;
    saveJSON(DATA_KEY,schedule);
    localStorage.setItem("lastSync",new Date().toISOString());
    render();
    setStatus(`Đã đồng bộ ${schedule.length} buổi • ${new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}`);
  }catch(e){
    render();
    const cached=loadJSON(DATA_KEY,[]);
    setStatus(cached.length?`Offline • đang dùng ${cached.length} buổi đã lưu`:"Chưa có dữ liệu: "+e.message);
  }
}
function setStatus(text){$("#status").textContent=text}
function eventCard(e){
  const now=new Date();
  const start=new Date(`${e.date}T${e.start||"00:00"}:00`);
  const end=new Date(`${e.date}T${e.end||e.start||"23:59"}:00`);
  const cls=now>=start&&now<=end?" current":now>end?" done":"";
  const meta=[e.room&&`Phòng ${e.room}`,e.teacher,e.note].filter(Boolean).join(" • ");
  return `<article class="event${cls}">
    <div class="time">${esc(e.start||"—")}<small>${e.end?"–"+esc(e.end):""}</small></div>
    <div><div class="subject">${esc(e.subject)}</div><div class="meta">${esc(meta||"Chưa có thông tin")}</div></div>
  </article>`;
}
function render(){
  const t=todayISO();
  const today=schedule.filter(x=>x.date===t).sort((a,b)=>timeValue(a.start).localeCompare(timeValue(b.start)));
  const next=schedule.filter(x=>x.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
  $("#todayList").innerHTML=today.length?today.map(eventCard).join(""):'<div class="empty">Hôm nay không có lịch học.</div>';
  $("#summaryCard").innerHTML=next
    ?`<div class="big">${today.length} buổi hôm nay</div><div class="muted">${next.date===t?"Tiết tiếp theo":"Tiếp theo: "+fmtDate(next.date)} • ${esc(next.start||"")} • ${esc(next.subject)}</div>`
    :'<div class="big">Không có lịch sắp tới</div><div class="muted">Hãy đồng bộ dữ liệu.</div>';
  renderWeek($("#weekPicker").value||t);
  renderSubjects();
}
function renderWeek(anchor){
  const d=new Date(anchor+"T00:00:00");
  const monday=new Date(d);monday.setDate(d.getDate()-((d.getDay()+6)%7));
  let html="";
  for(let i=0;i<7;i++){
    const x=new Date(monday);x.setDate(monday.getDate()+i);
    const iso=localISO(x);
    const items=schedule.filter(e=>e.date===iso).sort((a,b)=>timeValue(a.start).localeCompare(timeValue(b.start)));
    html+=`<div class="day-card"><div class="day-title"><span>${esc(fmtDate(iso))}</span><span>${items.length} buổi</span></div>${items.length?items.map(eventCard).join(""):'<div class="hint empty-inline">Trống</div>'}</div>`;
  }
  $("#weekGrid").innerHTML=html;
}
function renderSubjects(){
  const map=new Map();
  for(const e of schedule){if(!e.subject)continue;if(!map.has(e.subject))map.set(e.subject,[]);map.get(e.subject).push(e)}
  const entries=[...map.entries()].sort((a,b)=>b[1].length-a[1].length);
  $("#subjectList").innerHTML=entries.length?entries.map(([name,items])=>{
    const first=items[0],meta=[first.teacher,first.room&&`Phòng ${first.room}`].filter(Boolean).join(" • ");
    return `<div class="subject-card"><div class="subject-row"><strong>${esc(name)}</strong><span class="badge">${items.length} buổi</span></div><div class="hint">${esc(meta||"Chưa có thông tin")}</div></div>`;
  }).join(""):'<div class="empty">Chưa có dữ liệu môn học.</div>';
}
function applyConfig(){
  $("#apiUrl").value=config.apiUrl||"";
  $("#apiToken").value=config.apiToken||"";
  $("#reminderMinutes").value=config.reminderMinutes||15;
}
async function askNotify(){
  if(!("Notification" in window)){setStatus("Trình duyệt không hỗ trợ thông báo.");return}
  const p=await Notification.requestPermission();
  setStatus("Thông báo: "+p);
}
function notificationKey(e){return `${e.id}|${e.date}|${e.start}|${config.reminderMinutes}`}
function checkReminders(){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const now=new Date(), notified=loadJSON(NOTIFIED_KEY,{});
  for(const e of schedule){
    if(!e.date||!e.start)continue;
    const start=new Date(`${e.date}T${e.start}:00`);
    const diff=start-now;
    const key=notificationKey(e);
    if(diff>=0&&diff<=Number(config.reminderMinutes||15)*60000&&!notified[key]){
      new Notification("Lịch học sắp bắt đầu",{body:`${e.start} • ${e.subject}${e.room?" • Phòng "+e.room:""}`});
      notified[key]=Date.now();
    }
  }
  saveJSON(NOTIFIED_KEY,notified);
}
function demo(){
  const base=new Date(todayISO()+"T00:00:00");
  const iso=n=>{const d=new Date(base);d.setDate(base.getDate()+n);return localISO(d)};
  schedule=[
    {id:"demo-1",date:iso(0),start:"09:30",end:"11:30",subject:"Software Architecture",teacher:"Nguyễn Văn A",room:"B201"},
    {id:"demo-2",date:iso(0),start:"13:30",end:"15:30",subject:"Database",teacher:"Trần Văn B",room:"Lab 2"},
    {id:"demo-3",date:iso(1),start:"07:30",end:"09:30",subject:"Java Advanced",teacher:"Lê Văn C",room:"A302"}
  ];
  saveJSON(DATA_KEY,schedule);render();setStatus("Đang dùng dữ liệu mẫu.");
}
$$(".nav-item").forEach(btn=>btn.onclick=()=>{
  $$(".nav-item").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
  $$(".page").forEach(x=>x.classList.remove("active"));$("#"+btn.dataset.page).classList.add("active");
  $("#pageTitle").textContent={home:"Hôm nay",week:"7 ngày",subjects:"Môn học",settings:"Cài đặt"}[btn.dataset.page];
});
$("#syncBtn").onclick=sync;
$("#todayBtn").onclick=()=>{$("#weekPicker").value=todayISO();renderWeek(todayISO())};
$("#weekPicker").onchange=e=>renderWeek(e.target.value);
$("#saveSettings").onclick=()=>{
  config={apiUrl:normalizeApiUrl($("#apiUrl").value),apiToken:$("#apiToken").value.trim(),reminderMinutes:Number($("#reminderMinutes").value)||15};
  saveJSON(CONFIG_KEY,config);sync();
};
$("#notifyBtn").onclick=askNotify;
$("#demoBtn").onclick=demo;
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
schedule=loadJSON(DATA_KEY,[]);
applyConfig();$("#weekPicker").value=todayISO();render();
if(config.apiUrl)sync();
setInterval(checkReminders,30000);
checkReminders();
