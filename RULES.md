# Quy tắc Dự án (RULES.md)

## Tính minh bạch trong việc sử dụng Kỹ năng
- **Thông báo**: Khi AI sử dụng bất kỳ kỹ năng nào để tạo ra kết quả (tài liệu, mã nguồn hoặc câu trả lời cho người dùng), kết quả đó phải bắt đầu bằng một thông báo rõ ràng về tên kỹ năng đang được sử dụng.
  - *Ví dụ*: `[Sử dụng Skill: concise-planning]`
- **Tự rà soát (Self-Review)**: Ở cuối mỗi kết quả, AI phải tự rà soát lại để đảm bảo tuân thủ hoàn toàn các hướng dẫn của kỹ năng đã sử dụng.

## Tiêu chuẩn Lập trình
- **Clean Code**: Toàn bộ mã nguồn phải tuân thủ nghiêm ngặt các nguyên tắc **Clean Code**. Các tiêu chuẩn được định nghĩa và đối chuẩn thông qua kỹ năng hệ thống: `clean-code`.
- **Chất lượng là trên hết**: Ưu tiên tính dễ đọc, dễ bảo trì và khả năng mở rộng hơn là các giải pháp tạm thời.

## Quy trình Git
- **Tiêu chuẩn Commit**: Sử dụng các thông điệp commit rõ ràng, mang tính mô tả.
- **Xác thực**: Chạy `lint-and-validate` trước khi đẩy bất kỳ thay đổi nào lên hệ thống.

## Mệnh Lệnh Sắt (Iron Rules - MCP)
- **LeanKG**: KHÔNG ĐƯỢC CHẠM VÀO LOGIC CỐT LÕI (game loop, collision detection) nếu chưa dùng LeanKG quét Blast Radius để xem ảnh hưởng đến các phần khác.
- **Puppeteer**: KHÔNG ĐƯỢC KẾT THÚC TASK UI nếu chưa dùng Puppeteer chụp ảnh màn hình và tự kiểm định giao diện (visual regression).

## Quy tắc Quản trị & Điều phối (@A-Manager)
- **Rollback**: Mọi thay đổi do @A-Manager điều phối chỉ được áp dụng nếu được @A-Test đánh giá là **PASS**. Nếu không đạt, phải thực hiện Rollback toàn bộ mã nguồn về trạng thái ổn định gần nhất.
- **Mệnh lệnh Sắt số 9 (Nhật ký phối hợp)**: Manager phải trích xuất toàn bộ quá trình thảo luận giữa các Agent thành file vật lý tại `.claude/skills/agents/A-manager/logs/` dưới định dạng hội thoại để người dùng hậu kiểm.

## Quy tắc Git Workflow (@A-Manager & GitNexus)
- **Auto-Push**: Mọi thay đổi code CHỈ được push lên GitHub sau khi @A-Test đóng dấu **PASS**. AI phải tự động thực hiện commit và push — người dùng không cần gõ lệnh Git.
- **Conventional Commits**: Commit message bắt buộc theo chuẩn `type(scope): description`. Không chấp nhận message không có ý nghĩa.
