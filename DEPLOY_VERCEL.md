# Vercel Deploy Draft

Project này đã được chuyển sang hướng độc lập với Vercel:

- Frontend tĩnh chạy trực tiếp trên Vercel
- Backend proxy + auth chạy qua `api/index.py` trên Vercel Python runtime
- Không còn rewrite sang Render

## Files chính

- `vercel.json`: rewrite các route về Vercel Function nội bộ
- `api/index.py`: entrypoint cho Vercel
- `auth-guard.js`: kiểm tra phiên đăng nhập cho các trang HTML
- `server.py`: giữ toàn bộ auth + proxy logic hiện tại

## Environment variables cần cấu hình trên Vercel

- `APP_USERNAME`
- `APP_PASSWORD`
- `SESSION_SECRET`
- `OTISTX_API_KEY`

## Lưu ý

- Đây là bản standalone cho GitHub + Vercel.
- Do dùng Python serverless function, thời gian phản hồi của các route proxy vẫn phụ thuộc upstream API và cold start của chính Vercel Function.
- Không còn phụ thuộc Render relay.
