# Hướng dẫn Điều phối Dự án (AGENTS.md)

## Bối cảnh Dự án
Dự án này là một **Trò chơi Bắn Xe tăng** được phát triển bằng các công nghệ web hiện đại: **Vanilla JavaScript, HTML5 Canvas và CSS3**. Mục tiêu là tạo ra một trò chơi phong cách arcade hiệu suất cao, có hình ảnh ấn tượng và lôi cuốn với thẩm mỹ cao cấp và cơ chế chơi mượt mà.

## Các Agent/Skill đang hoạt động
Các kỹ năng sau đã được cài đặt và sẵn sàng cho dự án này (Tổng cộng 20 skills):

### Nhóm Cốt lõi & Quy trình (Core & Process)
| Kỹ năng | Vai trò & Khả năng |
|-------|-------------------|
| `clean-code` | Chuyển đổi mã nguồn thành "mã sạch" (SRP, tên có ý nghĩa, hàm nhỏ). |
| `systematic-debugging` | Cô lập và khắc phục lỗi logic/runtime bằng phương pháp giả thuyết. |
| `concise-planning` | Soạn thảo kế hoạch thực hiện hiệu quả, giảm thiểu nợ kỹ thuật. |
| `git-pushing` | Tự động hóa và tiêu chuẩn hóa quy trình làm việc với Git. |
| `lint-and-validate` | Kiểm tra lỗi cú pháp, vi phạm phong cách và rủi ro runtime. |
| `mermaid-expert` | Tạo biểu đồ và sơ đồ kiến trúc chuyên nghiệp để minh họa logic game. |

### Nhóm Phát triển Game & Hiệu suất (Game Dev & Performance)
| Kỹ năng | Vai trò & Khả năng |
|-------|-------------------|
| `game-development` | Điều phối logic game, vòng lặp game (Game Loop), và các pattern như Object Pooling, State Machine. |
| `javascript-mastery` | Chuyên sâu ES6+, thao tác DOM và tối ưu hóa logic JavaScript phức tạp. |
| `web-performance-optimization` | Tối ưu hóa tốc độ tải và hiệu suất chạy của ứng dụng web. |
| `performance-profiling` | Phân tích và đo lường hiệu suất để tìm điểm nghẽn (bottleneck). |
| `fixing-motion-performance` | Tối ưu hóa các chuyển động và hoạt ảnh để đạt 60 FPS mượt mà. |

### Nhóm Thiết kế & Trải nghiệm (Design & UX)
| Kỹ năng | Vai trò & Khả năng |
|-------|-------------------|
| `antigravity-design-expert` | Tập trung vào UI/UX cao cấp, bảng màu hiện đại và hiệu ứng mượt mà. |
| `high-end-visual-design` | Tạo ra các thiết kế thị giác đẳng cấp, chuyên nghiệp và đầy ấn tượng. |
| `ui-ux-designer` | Thiết kế trải nghiệm người dùng, menu và hệ thống điều khiển tối ưu. |
| `canvas-design` | Triết lý thiết kế thẩm mỹ đỉnh cao, mang tính nghệ thuật cho các yếu tố hình ảnh. |

### Nhóm Công cụ GitNexus (GitNexus Tools)
| Kỹ năng | Vai trò & Khả năng |
|-------|-------------------|
| `gitnexus-claude-plugin` | Tích hợp sâu với Claude để quản lý repository. |
| `gitnexus-cursor-integration` | Tối ưu hóa quy trình làm việc trên Cursor. |
| `gitnexus-shared` | Các module chia sẻ chung của bộ công cụ GitNexus. |
| `gitnexus-test-setup` | Cấu hình môi trường kiểm thử cho các công cụ Git. |
| `gitnexus-web` | Giao diện web và các tính năng liên quan của GitNexus. |

## Hệ thống Sub-agents (Chuyên biệt hóa)
Để tăng hiệu quả làm việc, tôi đã khởi tạo nhóm nhân sự chuyên trách:

### Cấp Quản lý
- **@A-Manager**: Tổng Giám Đốc điều phối (Orchestrator). Người tiếp nhận Epic, lập kế hoạch và giao việc cho các Sub-agent. Không trực tiếp viết code.

### Cấp Thực thi
- **@A-Core**: Chuyên gia về logic, hiệu suất và cấu trúc game cốt lõi.
- **@A-UX**: Nghệ sĩ thiết kế, lo liệu thẩm mỹ, hiệu ứng và trải nghiệm người dùng.
- **@A-Test**: Chuyên gia gỡ lỗi, kiểm định UI/UX và quét rủi ro bằng LeanKG/Puppeteer.

## Hướng dẫn Phối hợp
- **Khởi động tính năng**: Sử dụng `concise-planning` và `mermaid-expert` để thiết kế kiến trúc trước khi viết code.
- **Phát triển Game**: Kết hợp `game-development` cho cấu trúc chung và `javascript-mastery` cho logic chi tiết.
- **Tối ưu hóa**: Luôn sử dụng `performance-profiling` và `fixing-motion-performance` khi thấy game bị lag hoặc tụt FPS.
- **Thẩm mỹ**: Tham khảo `high-end-visual-design` và `antigravity-design-expert` để đảm bảo game trông "premium" nhất có thể.
- **Bảo trì**: `clean-code` và `lint-and-validate` là bắt buộc cho mọi dòng code.

## Session Protocol
**Mandatory First Step — Không thể bỏ qua:**
Khi bắt đầu bất kỳ phiên làm việc mới nào, AI PHẢI:
1. Đọc `.claude/knowledge/knowledge-index.md` để lấy danh sách KI.
2. Nếu task hiện tại liên quan đến bất kỳ tag nào trong index (vd: "bug", "storage", "mcp"), đọc nội dung KI đó TRƯỚC khi viết code.
3. Nêu rõ trong câu trả lời đầu tiên: "Đã kiểm tra KI — [tên KI liên quan hoặc 'Không có KI liên quan']".

### MCP Tools Menu
| Tên MCP/Tool | Có gì trong tay | Khi nào cần dùng |
|--------------|----------------|------------------|
| `dev-tools` (Puppeteer) | Hệ thống duyệt web ảo có khả năng click, chụp ảnh, và tương tác với DOM. | Dùng để mở localhost, kiểm tra giao diện game, chụp ảnh màn hình để review lỗi UI. |
| `leankg` (Knowledge Graph) | Công cụ phân tích tác động và quản lý kiến trúc mã nguồn dựa trên đồ thị. | Dùng để quét "Blast Radius" trước khi sửa logic cốt lõi, đảm bảo không làm hỏng các phần liên quan. |
