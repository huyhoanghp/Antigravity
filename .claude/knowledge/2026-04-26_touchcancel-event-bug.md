# KI: Bắt buộc xử lý sự kiện touchcancel trên Mobile Web Games

## 🔴 Problem
Khi phát triển game HTML5 hỗ trợ điều khiển đa điểm (Multi-touch Joystick, Nút bấm ảo), thỉnh thoảng nút bấm bị "kẹt" ở trạng thái đang nhấn (Ví dụ: Xe tăng tự động bắn liên tục, Joystick tự trôi đi dù không chạm màn hình).

## 🔍 Root Cause
Lập trình viên thường chỉ bắt hai sự kiện `touchstart` và `touchend` để theo dõi trạng thái chạm. Tuy nhiên, trên trình duyệt di động, nếu ngón tay người dùng trượt ra khỏi vùng màn hình (edge swipe), hoặc có thông báo hệ thống đè lên, trình duyệt sẽ KHÔNG gọi `touchend`, mà sẽ kích hoạt sự kiện `touchcancel`. Việc bỏ sót `touchcancel` khiến các biến cờ (flags) như `isFiring` hoặc `joystickActive` bị kẹt mãi ở giá trị `true`.

## ✅ Solution
Luôn gắn cả `touchend` và `touchcancel` vào cùng một hàm dọn dẹp trạng thái (cleanup function).

```javascript
const handleTouchEnd = (e) => {
    // Logic dọn dẹp ID ngón tay và reset biến cờ
};

// BẮT BUỘC có cả 2 dòng này
window.addEventListener('touchend', handleTouchEnd);
window.addEventListener('touchcancel', handleTouchEnd);
```

## 🛡️ Prevention
- Bất cứ khi nào lập trình sự kiện chạm (Touch Events), phải lập tức viết theo combo 4 sự kiện: `touchstart`, `touchmove`, `touchend`, `touchcancel`.
