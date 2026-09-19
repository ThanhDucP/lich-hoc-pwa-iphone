const SPREADSHEET_ID = 'THAY_SPREADSHEET_ID';
const SHEET_GID = 711602931;

function doGet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets().find(s => s.getSheetId() === SHEET_GID);
  if (!sheet) return json({error: 'Sheet not found'});
  const values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return json({schedule: []});

  const headers = values[0].map(h => String(h).trim());
  const schedule = values.slice(1)
    .filter(row => row.some(v => String(v).trim() !== ''))
    .map((row, i) => {
      const r = {};
      headers.forEach((h, j) => r[h] = row[j] ?? '');
      return normalizeRow(r, i);
    })
    .filter(x => x.date && x.subject);

  return json({
    updatedAt: new Date().toISOString(),
    schedule
  });
}

function normalizeRow(r, i) {
  const get = keys => {
    for (const k of keys) {
      if (r[k] !== undefined && String(r[k]).trim() !== '') return String(r[k]).trim();
    }
    return '';
  };

  let date = get(['date','Date','Ngày','Ngày học','ngay']);
  if (date.includes('/')) {
    const p = date.split('/');
    if (p.length === 3) {
      date = `${p[2].length === 2 ? '20' + p[2] : p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    }
  }

  return {
    id: get(['id','ID']) || `${date}-${i}`,
    date,
    startTime: get(['startTime','start','Giờ bắt đầu','Bắt đầu','time']),
    endTime: get(['endTime','end','Giờ kết thúc','Kết thúc']),
    subject: get(['subject','Subject','Môn','Môn học','Tên môn']),
    teacher: get(['teacher','GV','Giảng viên','Giáo viên']),
    room: get(['room','Phòng','Room']),
    note: get(['note','Ghi chú','Note']),
    status: get(['status','Trạng thái']) || 'SCHEDULED'
  };
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
