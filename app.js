const DATA_KEY="schedule-pwa-v2";
const CONFIG_KEY="schedule-config-v2";
const HISTORY_KEY="schedule-history-v1";
const NOTIFIED_KEY="schedule-notified-v1";

let schedule=[];
let selectedDate=todayISO();
let config=loadJSON(CONFIG_KEY,{apiUrl:"",apiToken:"",reminderMinutes:15});

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

function loadJSON(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function saveJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
function normalizeApiUrl(value){const s=String(value??"").trim();return s?s.replace(/(https:\/\/script\.google\.com)\/macros\/u\/\d+\/s\//,"$1/macros/s/"):""}
function localISO(d){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
function todayISO(){return localISO(new Date())}
function fmtDate(s){return new Date(s+"T00:00:00").toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit"})}
function shortDay(s){return new Date(s+"T00:00:00").toLocaleDateString("vi-VN",{weekday:"short"}).replace(".","")}
function esc(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function timeValue(x){return String(x??"").trim().slice(0,5)}
function normalizeDate(value){const s=String(value??"").trim();if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)){const[y,m,d]=s.split("-");return y+"-"+m.padStart(2,"0")+"-"+d.padStart(2,"0")}const m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);return m?(m[3].length===2?"20"+m[3]:m[3])+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0"):s.slice(0,10)}
function normalize(row,index){
  const get=keys=>{for(const k of keys){if(row?.[k]!==undefined&&String(row[k]).trim()!=="")return String(row[k]).trim()}return""};
  const date=normalizeDate(get(["date","Date","Ngày","Ngày học","ngay","DATE"]));
  const subject=get(["subject","Subject","Môn","Môn học","Tên môn","Tên môn học","task","Task"]);
  return {id:get(["id","ID"])||date+"-"+subject+"-"+index,date,start:timeValue(get(["start","startTime","Giờ bắt đầu","Bắt đầu","time","Time"])),end:timeValue(get(["end","endTime","Giờ kết thúc","Kết thúc"])),subject,teacher:get(["teacher","GV","Giảng viên","Giáo viên"]),room:get(["room","Phòng","Room"]),note:get(["note","Ghi chú","Note"]),description:get(["description","Description","Mô tả","Mô tả chi tiết","Chi tiết"]),status:get(["status","Trạng thái"])||"SCHEDULED",sourceSheet:get(["sourceSheet","Sheet"]),sourceRow:get(["sourceRow","Row"])}
}
function normalizePayload(payload){
  const raw=Array.isArray(payload)?payload:(Array.isArray(payload?.schedule)?payload.schedule:[]);
  const seen=new Set();
  return raw.map(normalize).filter(x=>x.date&&x.subject).filter(x=>{const key=[x.date,x.start,x.end,x.subject,x.room,x.teacher].join("|");if(seen.has(key))return false;seen.add(key);return true})
}
function jsonp(url){
  return new Promise((resolve,reject)=>{
    const callback="scheduleCallback_"+Date.now()+"_"+Math.random().toString(36).slice(2);
    const script=document.createElement("script");
    const timer=setTimeout(()=>{cleanup();reject(Error("API timeout"))},12000);
    function cleanup(){clearTimeout(timer);delete window[callback];script.remove()}
    window[callback]=payload=>{cleanup();payload?.error?reject(Error(payload.error)):resolve(payload)};
    script.onerror=()=>{cleanup();reject(Error("API request failed"))};
    const u=new URL(normalizeApiUrl(url));u.searchParams.set("callback",callback);if(config.apiToken)u.searchParams.set("token",config.apiToken);u.searchParams.set("t",Date.now());script.src=u.toString();document.head.appendChild(script)
  })
}
async function fetchData(){if(!config.apiUrl)throw Error("Chưa cấu hình Apps Script URL");return normalizePayload(await jsonp(config.apiUrl))}
function history(){return loadJSON(HISTORY_KEY,{})}
function saveHistory(h){saveJSON(HISTORY_KEY,h)}
function archiveDay(date,items,reason="manual"){
  if(!date||!items?.length)return false;
  const h=history();
  h[date]={date,items:JSON.parse(JSON.stringify(items)),savedAt:new Date().toISOString(),reason};
  saveHistory(h);
  return true;
}
function getDayItems(date){
  if(date===todayISO())return schedule.slice().sort(sortTime);
  const h=history()[date];
  return h?.items?.slice().sort(sortTime)||[];
}
function sortTime(a,b){return timeValue(a.start).localeCompare(timeValue(b.start))}
function isArchived(date){return !!history()[date]}
function weekStart(date){const d=new Date(date+"T00:00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));return localISO(d)}
function weekDates(anchor){const start=weekStart(anchor),out=[];const d=new Date(start+"T00:00:00");for(let i=0;i<7;i++){const x=new Date(d);x.setDate(d.getDate()+i);out.push(localISO(x))}return out}
function maybeAutoArchive(){
  const t=todayISO(), now=new Date();
  if(now.getHours()>=23 && schedule.length && !isArchived(t))archiveDay(t,schedule,"auto-23:00");
}
async function sync(){
  setStatus("Đang đồng bộ…");
  try{
    const fresh=await fetchData();
    schedule=fresh;
    saveJSON(DATA_KEY,schedule);
    localStorage.setItem("lastSync",new Date().toISOString());
    maybeAutoArchive();
    render();
    setStatus("Đã đồng bộ "+schedule.length+" task • "+new Date().toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}));
  }catch(e){
    render();
    const cached=loadJSON(DATA_KEY,[]);
    setStatus(cached.length?"Offline • đang dùng "+cached.length+" task đã lưu":"Chưa có dữ liệu: "+e.message)
  }
}
function setStatus(text){if($("#status"))$("#status").textContent=text}
function eventCard(e){
  const now=new Date(),start=new Date(e.date+"T"+(e.start||"00:00")+":00"),end=new Date(e.date+"T"+(e.end||e.start||"23:59")+":00");
  const cls=now>=start&&now<=end?" current":now>end?" done":"";
  const meta=[e.room&&"Phòng "+e.room,e.teacher].filter(Boolean).join(" • ");
  return '<button class="event'+cls+'" data-task-id="'+esc(e.id)+'"><div class="time">'+esc(e.start||"—")+'<small>'+ (e.end?"–"+esc(e.end):"")+'</small></div><div class="dot"></div><div><div class="subject">'+esc(e.subject)+'</div><div class="meta">'+esc(meta)+'</div></div></button>'
}
function render(){
  const t=todayISO();
  $("#todayLabel").textContent=fmtDate(t);
  const today=getDayItems(t);
  const next=today.find(e=>{const d=new Date(t+"T"+(e.start||"23:59")+":00");return d>=new Date()})||today[0];
  $("#todayList").innerHTML=today.length?today.map(eventCard).join(""):'<div class="empty">Hôm nay chưa có task.</div>';
  $("#summaryCard").innerHTML='<div class="big">'+today.length+' task hôm nay</div><div class="muted">'+(next?"Tiếp theo • "+esc(next.start)+" • "+esc(next.subject):"Không còn task trong ngày")+'</div>';
  bindTaskClicks();
  renderWeek();
  renderSubjects();
  maybeAutoArchive();
}
function bindTaskClicks(){
  $$(".event").forEach(btn=>btn.onclick=()=>openTask(btn.dataset.taskId))
}
function findTask(id){return schedule.find(x=>x.id===id)||Object.values(history()).flatMap(x=>x.items||[]).find(x=>x.id===id)}
function openTask(id){
  const task=findTask(id);if(!task)return;
  $("#modalTitle").textContent=task.subject;
  $("#modalMeta").textContent=[task.start&&("Bắt đầu "+task.start),task.end&&("Kết thúc "+task.end),task.room&&("Phòng "+task.room),task.teacher&&("Giảng viên "+task.teacher)].filter(Boolean).join(" • ");
  $("#modalDescription").innerHTML=task.description?esc(task.description).replace(/\n/g,"<br>"):'<span class="hint">Chưa có mô tả chi tiết.</span>';
  $("#taskModal").classList.remove("hidden");
}
function closeModal(){$("#taskModal").classList.add("hidden")}
function renderWeek(){
  const dates=weekDates(selectedDate),h=history();
  $("#weekStrip").innerHTML=dates.map(d=>'<button class="week-day '+(d===selectedDate?"active ":"")+(h[d]?"saved":"")+'" data-date="'+d+'"><strong>'+esc(shortDay(d))+'</strong><span>'+d.slice(8)+'</span><small>'+((d===todayISO())?"Hôm nay":(h[d]?"Đã lưu":""))+'</small></button>').join("");
  $$(".week-day").forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;renderWeek()});
  const items=getDayItems(selectedDate);
  const title=fmtDate(selectedDate);
  const archived=h[selectedDate];
  $("#weekContent").innerHTML='<div class="day-card"><div class="day-title"><strong>'+esc(title)+'</strong><span class="archive-badge">'+(archived?"Đã lưu":"Chưa chốt")+'</span></div><p class="hint">'+(selectedDate===todayISO()?"Đang lấy trực tiếp từ Sheet.":"Dữ liệu ngày này được lưu trên thiết bị.")+'</p>'+(items.length?'<div class="timeline">'+items.map(eventCard).join("")+'</div>':'<div class="empty">Không có task đã lưu cho ngày này.</div>')+'</div>';
  bindTaskClicks();
}
function renderSubjects(){
  const map=new Map();
  for(const e of schedule){if(!e.subject)continue;if(!map.has(e.subject))map.set(e.subject,[]);map.get(e.subject).push(e)}
  const entries=[...map.entries()].sort((a,b)=>b[1].length-a[1].length);
  $("#subjectList").innerHTML=entries.length?entries.map(([name,items])=>{const first=items[0],meta=[first.description,first.teacher,first.room&&"Phòng "+first.room].filter(Boolean).join(" • ");return '<div class="subject-card"><div class="subject-row"><strong>'+esc(name)+'</strong><span class="badge">'+items.length+' task</span></div><div class="hint">'+esc(meta||"Chưa có thông tin")+'</div></div>'}).join(""):'<div class="empty">Chưa có dữ liệu.</div>'
}
function finalizeToday(){
  const t=todayISO();
  if(!schedule.length){setStatus("Hôm nay chưa có task để lưu.");return}
  archiveDay(t,schedule,"manual");
  renderWeek();
  setStatus("Đã chốt "+fmtDate(t)+" • "+schedule.length+" task");
}
function applyConfig(){$("#apiUrl").value=config.apiUrl||"";$("#apiToken").value=config.apiToken||"";$("#reminderMinutes").value=config.reminderMinutes||15}
async function askNotify(){if(!("Notification"in window)){setStatus("Trình duyệt không hỗ trợ thông báo.");return}setStatus("Thông báo: "+await Notification.requestPermission())}
function notificationKey(e){return e.id+"|"+e.date+"|"+e.start+"|"+config.reminderMinutes}
function checkReminders(){if(!("Notification"in window)||Notification.permission!=="granted")return;const now=new Date(),notified=loadJSON(NOTIFIED_KEY,{});for(const e of schedule){if(!e.date||!e.start)continue;const start=new Date(e.date+"T"+e.start+":00"),diff=start-now,key=notificationKey(e);if(diff>=0&&diff<=Number(config.reminderMinutes||15)*60000&&!notified[key]){new Notification("Lịch sắp bắt đầu",{body:e.start+" • "+e.subject});notified[key]=Date.now()}}saveJSON(NOTIFIED_KEY,notified)}
function demo(){
  const base=new Date(todayISO()+"T00:00:00"),iso=n=>{const d=new Date(base);d.setDate(base.getDate()+n);return localISO(d)};
  schedule=[{id:"demo-1",date:iso(0),start:"09:30",end:"11:30",subject:"Software Architecture",description:"Ôn kiến trúc layered và clean architecture",teacher:"Nguyễn Văn A",room:"B201"},{id:"demo-2",date:iso(0),start:"13:30",end:"15:30",subject:"Database",description:"Làm bài SQL",teacher:"Trần Văn B",room:"Lab 2"},{id:"demo-3",date:iso(1),start:"07:30",end:"09:30",subject:"Java Advanced",description:"Ôn concurrency",teacher:"Lê Văn C",room:"A302"}];
  saveJSON(DATA_KEY,schedule);render();setStatus("Đang dùng dữ liệu mẫu.")
}
$$(".nav-item").forEach(btn=>btn.onclick=()=>{$$(".nav-item").forEach(x=>x.classList.remove("active"));btn.classList.add("active");$$(".page").forEach(x=>x.classList.remove("active"));$("#"+btn.dataset.page).classList.add("active");$("#pageTitle").textContent={home:"Hôm nay",week:"Tuần",subjects:"Môn / nhóm việc",settings:"Cài đặt"}[btn.dataset.page];if(btn.dataset.page==="week")renderWeek()});
$("#syncBtn").onclick=sync;
$("#finalizeBtn").onclick=finalizeToday;
$("#weekTodayBtn").onclick=()=>{selectedDate=todayISO();renderWeek()};
$("#saveSettings").onclick=()=>{config={apiUrl:normalizeApiUrl($("#apiUrl").value),apiToken:$("#apiToken").value.trim(),reminderMinutes:Number($("#reminderMinutes").value)||15};saveJSON(CONFIG_KEY,config);sync()};
$("#notifyBtn").onclick=askNotify;
$("#demoBtn").onclick=demo;
$$("[data-close-modal]").forEach(x=>x.onclick=closeModal);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
window.addEventListener("popstate",()=>{if(!$("#taskModal").classList.contains("hidden"))closeModal()});
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
schedule=loadJSON(DATA_KEY,[]);
applyConfig();
selectedDate=todayISO();
render();
if(config.apiUrl)sync();
setInterval(()=>{maybeAutoArchive();checkReminders()},30000);
checkReminders();
