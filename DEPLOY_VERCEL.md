# Vercel Deploy Draft

Project này đã được chuẩn bị theo hướng deploy lên Vercel với 2 phần:

- Frontend tĩnh: `login.html`, `index.html`, `voucher.html`, `mail.html`, `bulk-mail.html`, `address.html`
- Backend serverless: `api/index.py` dùng lại logic từ `server.py`

## Files chính

- `vercel.json`: rewrite route về Python function
- `api/index.py`: entrypoint cho Vercel
- `auth-guard.js`: kiểm tra phiên đăng nhập cho các trang HTML
- `server.py`: giữ toàn bộ auth + proxy logic hiện tại

## Environment variables cần cấu hình trên Vercel

- `APP_USERNAME`
- `APP_PASSWORD`
- `SESSION_SECRET`
- `OTISTX_API_KEY`
- `RENDER_RELAY_BASE` (tuỳ chọn)

## Lưu ý

- Đây là bản nháp tương thích Vercel.
- Do app vẫn có nhiều route proxy Python, Vercel có thể vẫn có cold start ở function.
- Nếu muốn ổn định hoàn toàn như app backend riêng, Render/Northflank vẫn hợp hơn.
