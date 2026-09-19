# Google Apps Script API

Code.gs là Web App làm nguồn dữ liệu cho PWA.

## Script Properties

Tạo 2 property:

- SCHEDULE_SPREADSHEET_ID: ID của Google Sheet.
- SCHEDULE_API_TOKEN: tùy chọn, dùng chuỗi ngẫu nhiên dài.

## Deploy

Google Apps Script → Deploy → New deployment → Web app.

- Execute as: tài khoản của bạn.
- Who has access: chọn mức ít công khai nhất vẫn đáp ứng nhu cầu của bạn.

Copy URL /exec.

## PWA

Vào Cài đặt trong app và dán Web App URL. Nếu bật token thì dán token.

API quét toàn bộ tab trong Spreadsheet. Một tab chỉ được coi là bảng lịch nếu trong 12 dòng đầu có cả cột ngày và cột môn học.

JSONP được hỗ trợ để PWA tĩnh trên GitHub Pages gọi API mà không cần CORS proxy.

## Security

Không commit Google credentials, service-account JSON hoặc token thật vào GitHub.

Token đặt trong browser không phải secret mạnh; nó chỉ là lớp bảo vệ đơn giản.
