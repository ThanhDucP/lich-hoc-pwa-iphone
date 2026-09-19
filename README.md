# Lịch học iPhone PWA

PWA cá nhân để xem lịch học trên iPhone, đồng bộ từ Google Sheets thông qua Google Apps Script.

## Features

- Hôm nay / 7 ngày / Môn học
- Offline cache bằng localStorage + Service Worker
- Đồng bộ tất cả tab lịch trong Google Sheets
- Tự nhận diện bảng lịch dựa trên header
- JSONP để PWA tĩnh gọi Apps Script
- Nhắc trước giờ học khi PWA đang mở và Notification được cấp quyền
- GitHub Actions deploy lên GitHub Pages

## GitHub Pages

Site được deploy từ root bằng .github/workflows/deploy-pages.yml.

URL dự kiến:
https://thanhducp.github.io/lich-hoc-pwa-iphone/

GitHub Pages trên GitHub Free yêu cầu repository public. Nếu repository đang private, cần đổi visibility hoặc dùng gói GitHub hỗ trợ Pages cho private repositories.

## Google Sheets

Xem apps-script/README.md.

## Kiến trúc

Google Sheets → Apps Script Web App → JSON/JSONP → iPhone PWA.

AI tạo/cập nhật lịch nên nằm ở backend/private repository; PWA chỉ hiển thị và đồng bộ dữ liệu.

## Notification

Notification trong app được kiểm tra khi PWA đang chạy. Muốn đảm bảo thông báo khi app đã bị đóng trên iPhone cần Web Push/backend; không dựa vào JavaScript timer như một alarm hệ thống.
