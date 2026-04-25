# Kiến trúc Game - Tank Modern

## Tổng quan
Game được xây dựng bằng JavaScript thuần (Vanilla JS) sử dụng HTML5 Canvas để vẽ và quản lý logic game. Giao diện người dùng được xây dựng bằng HTML/CSS với phong cách Glassmorphism.

## Cấu trúc File
- `index.html`: Chứa cấu trúc DOM, Canvas và các lớp phủ UI.
- `style.css`: Định nghĩa hệ thống thiết kế, màu sắc, font chữ và hiệu ứng Glassmorphism.
- `game.js`: File logic chính chứa các class và vòng lặp game.

## Thành phần Chính (Classes)
1. **Tank (Lớp cơ sở)**: Định nghĩa các thuộc tính cơ bản của xe tăng (vị trí, máu, màu sắc, vẽ).
2. **Player (Kế thừa Tank)**: Xử lý input từ người dùng (bàn phím, chuột) để di chuyển và bắn.
3. **Enemy (Kế thừa Tank)**: Chứa logic AI đơn giản, tự động bám theo và bắn người chơi.
4. **Bullet**: Quản lý quỹ đạo, tốc độ và loại đạn (người chơi hay kẻ địch).
5. **Particle**: Tạo hiệu ứng nổ khi đạn va chạm hoặc xe tăng bị tiêu diệt.

## Logic Game
- **Vòng lặp (Game Loop)**: Sử dụng `requestAnimationFrame` để đảm bảo game chạy mượt mà ở 60 FPS.
- **Phát hiện va chạm**: Sử dụng thuật toán khoảng cách Euclid (Hypot) giữa các điểm để xác định va chạm tròn-tròn giữa đạn và xe tăng.
- **Quản lý trạng thái**: Sử dụng một đối tượng `STATE` đơn giản để chuyển đổi giữa Menu, Playing và Game Over.
- **Tăng độ khó**: Tần suất xuất hiện của kẻ địch tăng dần dựa trên điểm số hiện tại.
