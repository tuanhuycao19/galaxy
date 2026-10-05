# Hệ Mặt Trời 3D

Web view Hệ Mặt Trời 3D dùng Three.js + TypeScript + Vite. Kế hoạch chi tiết: [PLAN.md](PLAN.md).

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build ra dist/
npm run lint
npm test         # unit test (Vitest)
```

## Điều khiển

| Thao tác                    | Chuột / cảm ứng                            | Phím          |
| --------------------------- | ------------------------------------------ | ------------- |
| Xoay góc nhìn               | Kéo chuột trái / 1 ngón                    |               |
| Zoom                        | Cuộn chuột / chụm 2 ngón                   |               |
| Di chuyển (khi không chọn)  | Chuột phải / kéo 2 ngón                    |               |
| Chọn thiên thể, bay tới     | Bấm vào thiên thể, nhãn tên hoặc danh sách | `0`–`9`       |
| Bỏ chọn                     | Nút × trên bảng thông tin                  | `Esc`         |
| Tạm dừng / chạy             | Nút ▶ / ❚❚                                 | `Space`       |
| Tốc độ thời gian            | Thanh trượt (1 giờ → 1 năm mỗi giây)       | `+` / `-`     |
| Quỹ đạo · Nhãn · Tỉ lệ thật | Nút trên thanh công cụ                     | `O`, `L`, `T` |
| Về toàn cảnh                | Nút "Toàn cảnh"                            | `R`           |
| Hướng dẫn                   | Nút `?`                                    | `H`           |

## Mô phỏng

- Vị trí hành tinh tính theo quỹ đạo Kepler từ bộ tham số JPL (J2000), bắt đầu từ thời điểm hiện tại.
- Hai chế độ tỉ lệ (`src/data/scale.ts`):
  - **Nén** (mặc định): kích thước và khoảng cách được nén để nhìn thấy mọi hành tinh cùng lúc.
  - **Thật**: cùng một tỉ lệ cho tất cả (1 AU = 5 đơn vị) — các hành tinh chỉ là chấm nhỏ; bấm vào nhãn để bay tới.
- Khi chọn một thiên thể, camera bay tới và bám theo nó trên quỹ đạo; bảng thông tin cập nhật khoảng cách theo thời gian thực.

## Nguồn texture

- Trái Đất, Mặt Trăng: [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets) (MIT).
- Mặt Trời, các hành tinh khác và vành đai Sao Thổ: sinh thủ tục (`src/objects/textures/procedural.ts`).
