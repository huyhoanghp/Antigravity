# KI: Lỗi thực thi npx trên Windows (PowerShell Execution Policy)

## 🔴 Problem
Khi chạy các lệnh `npx` (như cài đặt MCP tools hoặc chạy LeanKG) trong môi trường terminal của Antigravity/Claude Dev trên Windows, hệ thống báo lỗi: "File C:\Program Files\nodejs\npx.ps1 cannot be loaded because running scripts is disabled on this system."

## 🔍 Root Cause
PowerShell mặc định chặn thực thi các script `.ps1` chưa được ký (Restricted policy). Lệnh `npx` trên Windows thực chất gọi file `npx.ps1`, dẫn đến việc bị chặn bởi hệ thống bảo mật.

## ✅ Solution
Thay thế lệnh `npx` bằng `npx.cmd` trong terminal. File `.cmd` là shell script của Windows cũ (Command Prompt) nên không bị ràng buộc bởi PowerShell Execution Policy.

Ví dụ:
```powershell
# Sai:
npx -y @smithery/cli@latest run ...

# Đúng:
npx.cmd -y @smithery/cli@latest run ...
```

## 🛡️ Prevention
- Luôn sử dụng hậu tố `.cmd` cho các lệnh npm/npx khi làm việc trên môi trường Windows.
- Checklist trước khi chạy lệnh: [ ] Kiểm tra OS có phải Windows không? -> [ ] Nếu có, dùng npx.cmd/npm.cmd.
