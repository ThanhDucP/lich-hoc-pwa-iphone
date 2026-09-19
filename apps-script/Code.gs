/**
 * Lich hoc -> PWA API
 * Script Properties:
 *   SCHEDULE_SPREADSHEET_ID
 *   SCHEDULE_API_TOKEN (optional)
 */
const DATE_HEADERS=["date","ngày","ngày học","ngay"];
const SUBJECT_HEADERS=["subject","môn","môn học","tên môn","tên môn học"];
const START_HEADERS=["start","starttime","giờ bắt đầu","bắt đầu","time"];
const END_HEADERS=["end","endtime","giờ kết thúc","kết thúc"];
const TEACHER_HEADERS=["teacher","gv","giảng viên","giáo viên"];
const ROOM_HEADERS=["room","phòng"];
const NOTE_HEADERS=["note","ghi chú"];
const STATUS_HEADERS=["status","trạng thái"];

function doGet(e){
  try{
    const token=PropertiesService.getScriptProperties().getProperty("SCHEDULE_API_TOKEN");
    if(token&&(!e||!e.parameter||e.parameter.token!==token))return output({error:"Unauthorized"},e);
    return output({schedule:readAllScheduleRows(),generatedAt:new Date().toISOString()},e);
  }catch(err){return output({error:String(err&&err.message||err)},e);}
}
function output(payload,e){
  const callback=e&&e.parameter&&e.parameter.callback,json=JSON.stringify(payload);
  if(callback){
    if(!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback))return ContentService.createTextOutput(JSON.stringify({error:"Invalid callback"})).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(callback+"("+json+");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
function readAllScheduleRows(){
  const id=PropertiesService.getScriptProperties().getProperty("SCHEDULE_SPREADSHEET_ID");
  if(!id)throw new Error("Missing SCHEDULE_SPREADSHEET_ID");
  const ss=SpreadsheetApp.openById(id),output=[],seen={};
  ss.getSheets().forEach(sheet=>{
    const values=sheet.getDataRange().getDisplayValues();
    if(!values.length)return;
    const info=findHeader(values);
    if(!info)return;
    for(let r=info.row+1;r<values.length;r++){
      const row=values[r],date=getValue(row,info.headers,DATE_HEADERS),subject=getValue(row,info.headers,SUBJECT_HEADERS);
      if(!date||!subject)continue;
      const item={
        id:sheet.getName()+":"+(r+1),
        date:normalizeDate(date),
        start:normalizeTime(getValue(row,info.headers,START_HEADERS)),
        end:normalizeTime(getValue(row,info.headers,END_HEADERS)),
        subject:subject,
        teacher:getValue(row,info.headers,TEACHER_HEADERS),
        room:getValue(row,info.headers,ROOM_HEADERS),
        note:getValue(row,info.headers,NOTE_HEADERS),
        status:getValue(row,info.headers,STATUS_HEADERS)||"SCHEDULED",
        sourceSheet:sheet.getName(),
        sourceRow:r+1
      };
      if(!item.date)continue;
      const key=[item.date,item.start,item.end,item.subject,item.room,item.teacher].join("|");
      if(seen[key])continue;
      seen[key]=true;output.push(item);
    }
  });
  output.sort((a,b)=>(a.date+" "+a.start+" "+a.subject).localeCompare(b.date+" "+b.start+" "+b.subject));
  return output;
}
function findHeader(values){
  for(let r=0;r<Math.min(values.length,12);r++){
    const headers=values[r].map(normalizeHeader);
    if(headers.some(x=>DATE_HEADERS.indexOf(x)>=0)&&headers.some(x=>SUBJECT_HEADERS.indexOf(x)>=0))return {row:r,headers:headers};
  }
  return null;
}
function getValue(row,headers,aliases){
  for(let i=0;i<headers.length;i++)if(aliases.indexOf(headers[i])>=0&&String(row[i]||"").trim())return String(row[i]).trim();
  return "";
}
function normalizeHeader(value){return String(value||"").trim().toLowerCase().replace(/\s+/g," ");}
function normalizeDate(value){
  const s=String(value||"").trim();
  if(/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)){const p=s.split("-");return p[0]+"-"+p[1].padStart(2,"0")+"-"+p[2].padStart(2,"0");}
  const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if(m){const y=m[3].length===2?"20"+m[3]:m[3];return y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");}
  return "";
}
function normalizeTime(value){
  const m=String(value||"").trim().match(/^(\d{1,2}):([0-5]\d)/);
  return m?m[1].padStart(2,"0")+":"+m[2]:"";
}