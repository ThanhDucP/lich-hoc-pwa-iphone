# Lịch học PWA cho iPhone

## Cách dùng nhanh

1. Upload toàn bộ thư mục này lên GitHub.
2. Bật GitHub Pages cho repository.
3. Mở URL GitHub Pages bằng Safari trên iPhone.
4. Chọn Share → Add to Home Screen.
5. Mở app từ icon ngoài màn hình.

## Kết nối Google Sheets

### Cách A — Sheet public/published CSV
Trong Google Sheets chọn File → Share → Publish to web, sau đó lấy URL CSV tương ứng với tab lịch.

Hoặc dùng dạng:
`https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=GID`

Dán URL vào Cài đặt → URL CSV.

### Cách B — Sheet riêng tư
Dùng Apps Script trong thư mục `apps-script`.

Mở Google Sheet → Extensions → Apps Script, dán `Code.gs`, thay `SPREADSHEET_ID` và `SHEET_GID`, rồi Deploy → New deployment → Web app.

Dán URL `/exec` vào trường URL API trong app.

## Header dữ liệu

App tự nhận nhiều tên cột phổ biến. Khuyến nghị chuẩn hóa thành:

id,date,startTime,endTime,subject,teacher,room,note,status

Ví dụ:

2026-09-21-01,2026-09-21,09:30,11:30,Software Architecture,Nguyen Van A,B201,,SCHEDULED

## Lưu ý notification iPhone

PWA này có service worker, offline cache và nút xin quyền Notification. Notification web thực sự khi app bị đóng cần một push backend; không nên giả vờ rằng JavaScript timer trong PWA có thể đảm bảo báo thức trên iPhone. Phase tiếp theo có thể nối Web Push/OneSignal hoặc một backend riêng.

## Kiến trúc

Google Sheets → Apps Script API → PWA → IndexedDB/localStorage

Google Sheets vẫn là nguồn dữ liệu lịch. App giữ bản cache cuối cùng trên thiết bị.
