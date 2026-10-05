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

- Kéo chuột trái / 1 ngón: xoay
- Cuộn chuột / chụm 2 ngón: zoom
- Chuột phải / kéo 2 ngón: di chuyển (pan)
- Bảng "Điều khiển" (góc trên phải): tạm dừng, tốc độ thời gian, về hôm nay, bật/tắt quỹ đạo

## Mô phỏng

- Vị trí hành tinh tính theo quỹ đạo Kepler từ bộ tham số JPL (J2000), bắt đầu từ thời điểm hiện tại.
- Khoảng cách và kích thước được nén (xem `src/data/scale.ts`) để nhìn thấy mọi hành tinh cùng lúc.

## Nguồn texture

- Trái Đất, Mặt Trăng: [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets) (MIT).
- Mặt Trời, các hành tinh khác và vành đai Sao Thổ: sinh thủ tục (`src/objects/textures/procedural.ts`).
