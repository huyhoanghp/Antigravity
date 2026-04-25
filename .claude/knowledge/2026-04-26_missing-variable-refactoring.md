# KI: Lỗi mất biến toàn cục khi tái cấu trúc code (Refactoring)

## 🔴 Problem
Sau khi thực hiện nâng cấp lớn (Epic) liên quan đến nhiều file hoặc nhiều khối lệnh trong một file, ứng dụng bị crash hoàn toàn (màn hình đen hoặc không phản hồi) ngay khi khởi động.

## 🔍 Root Cause
Khi sử dụng công cụ `multi_replace_file_content` hoặc `replace_file_content` để thay thế các khối mã lớn, các biến toàn cục (global variables) nằm giữa hoặc bên cạnh các khối đó vô tình bị xóa mất. 
Cụ thể trong dự án này: Biến `let mousePos = { x: 0, y: 0 };` bị xóa khi nâng cấp logic Input.

## ✅ Solution
1. **Kiểm tra Blast Radius**: Luôn kiểm tra xem các dòng code bị thay thế có chứa khai báo biến dùng chung cho các phần khác không.
2. **Runtime Check**: Sử dụng Puppeteer để mở ứng dụng và kiểm tra lỗi console (`ReferenceError`) ngay sau khi sửa code.
3. **Phục hồi**: Khai báo lại các biến bị thiếu ở phạm vi phù hợp (Global scope).

## 🛡️ Prevention
- Checklist khi Refactor: [ ] Kiểm tra các biến khai báo ở đầu file hoặc đầu khối. [ ] Đảm bảo không xóa `let/const` của các biến được dùng trong các sự kiện (EventListeners).
- Luôn chạy Puppeteer debug sau mỗi lần `replace_file_content` có quy mô lớn.
