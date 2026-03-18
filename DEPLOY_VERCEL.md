# Vercel Deploy Draft

Project này hiện được cấu hình theo hướng đơn giản và ổn định hơn cho Vercel:

- Frontend tĩnh chạy trên Vercel
- Các route backend được rewrite sang backend đang chạy ở Render:
  - `/auth/*`
  - `/api/*`
  - `/shopee/*`
  - `/autopee-api/*`
  - `/mail-api/*`
  - `/otistx-api/*`

## Ý nghĩa

- Trang mở nhanh hơn trên domain Vercel
- Không cần ép Python runtime nội bộ của Vercel ngay từ đầu
- Dễ deploy hơn và tránh lỗi `Invalid vercel.json`

## Lưu ý

- API vẫn đi qua backend Render hiện tại
- Nếu backend Render đang sleep thì thao tác API vẫn có thể chậm
- Đây là bước trung gian gọn và an toàn nhất để đưa frontend lên Vercel trước
