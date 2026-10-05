# Hệ Mặt Trời 3D

Web view Hệ Mặt Trời 3D dùng Three.js + TypeScript + Vite. Kế hoạch chi tiết: [PLAN.md](PLAN.md).

## Chạy

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build ra dist/
npm run lint
npm test         # unit test (Vitest)
npm run test:e2e # end-to-end test (Playwright, tự build + preview)
```

Lần đầu chạy e2e trên máy mới: `npx playwright install chromium`.

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

## Đồ hoạ & hiệu năng

- Mặt Trời dùng shader động (nhiễu simplex + tối rìa) xuất màu HDR; **bloom** (UnrealBloomPass) chỉ làm sáng phần vượt ngưỡng 1.0 nên các hành tinh vẫn sắc nét.
- Trái Đất và Sao Kim có lớp khí quyển phát sáng (Fresnel) ở phía được chiếu sáng.
- **Chất lượng đồ hoạ** (trong hộp Hướng dẫn & cài đặt, hoặc phím `Q`): Tự động / Cao / Trung bình / Thấp.
  - Cao: pixel ratio ≤ 2, bloom. Trung bình: ≤ 1,25, bloom. Thấp: 1, không bloom.
  - Tự động: bắt đầu ở Cao (máy tính) hoặc Trung bình (thiết bị cảm ứng), tự hạ một bậc khi FPS < 40 kéo dài.
- Texture thủ tục sinh trong Web Worker; màn hình loading theo dõi cả ảnh lẫn texture thủ tục và biên dịch shader trước khi hiện cảnh.
- Ở tốc độ thời gian cao, tốc độ tự quay hiển thị bị giới hạn để tránh nhấp nháy (vị trí quỹ đạo vẫn chính xác).

## Triển khai (GitHub Pages)

Workflow `.github/workflows/ci.yml` chạy format, lint, typecheck, unit test, build và e2e cho mọi push/PR. Để deploy:

1. Vào **Settings → Pages**, chọn **Source: GitHub Actions**.
2. Push lên nhánh `main`, hoặc vào tab **Actions → CI → Run workflow**.

## Nguồn texture

- Trái Đất, Mặt Trăng: [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets) (MIT).
- Mặt Trời, các hành tinh khác và vành đai Sao Thổ: sinh thủ tục (`src/objects/textures/procedural.ts`).
