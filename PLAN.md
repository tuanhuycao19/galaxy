# Kế hoạch: Web view Hệ Mặt Trời 3D

Mục tiêu: một trang web hiển thị Hệ Mặt Trời bằng đồ hoạ 3D, cho phép **zoom in / zoom out**, **xoay** góc nhìn (và kéo/pan), các hành tinh tự quay và chuyển động trên quỹ đạo.

---

## 1. Lựa chọn công nghệ

| Hạng mục          | Lựa chọn                                                             | Lý do                                                                                         |
| ----------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Ngôn ngữ          | **TypeScript**                                                       | Kiểu tĩnh, dễ bảo trì khi số module tăng                                                      |
| Build tool        | **Vite**                                                             | Khởi động nhanh, HMR, build tĩnh gọn để deploy                                                |
| Engine 3D         | **Three.js** (WebGL 2)                                               | Thư viện 3D web phổ biến nhất, tài liệu và ví dụ phong phú, nhẹ hơn Babylon.js                |
| Điều khiển camera | **OrbitControls** (three/examples)                                   | Có sẵn xoay (chuột trái / 1 ngón), zoom (cuộn / pinch), pan (chuột phải / 2 ngón), có damping |
| Nhãn hành tinh    | **CSS2DRenderer**                                                    | Chữ HTML sắc nét, luôn quay về phía người xem                                                 |
| Hiệu ứng          | **EffectComposer + UnrealBloomPass**                                 | Mặt Trời phát sáng (glow)                                                                     |
| Animation camera  | **GSAP** (hoặc tween tự viết)                                        | Bay mượt tới hành tinh khi chọn                                                               |
| Bảng điều khiển   | **lil-gui** (dev) + HTML/CSS thuần cho UI chính                      | Nhẹ, không cần framework UI                                                                   |
| Texture           | Bộ texture của **Solar System Scope** (CC BY 4.0)                    | Miễn phí, chất lượng tốt, có license rõ ràng                                                  |
| Kiểm thử          | **Vitest** (logic quỹ đạo), **Playwright** (smoke test + screenshot) |                                                                                               |
| Chất lượng code   | ESLint + Prettier                                                    |                                                                                               |
| Deploy            | **GitHub Pages** qua GitHub Actions                                  | Site tĩnh, miễn phí                                                                           |

**Phương án thay thế đã cân nhắc:**

- _React Three Fiber_: phù hợp nếu sau này cần nhiều UI React phức tạp; hiện tại Three.js thuần đơn giản hơn và ít phụ thuộc.
- _Babylon.js_: mạnh, có inspector tốt, nhưng bundle lớn hơn và cộng đồng ví dụ "solar system" ít hơn.
- _CesiumJS_: chuyên bản đồ địa cầu, không phù hợp.

**Vấn đề tỉ lệ:** khoảng cách và kích thước thật chênh lệch quá lớn (Mặt Trời ~109 lần Trái Đất, Sao Hải Vương cách ~30 AU). Giải pháp: dùng **tỉ lệ nén** (khoảng cách theo hàm log/căn, bán kính phóng đại) làm mặc định, có nút chuyển sang **tỉ lệ thật**; bật `logarithmicDepthBuffer` để tránh z-fighting.

---

## 2. Cấu trúc thư mục dự kiến

```
galaxy/
├── index.html
├── public/textures/          # texture hành tinh, vành đai, nền sao
├── src/
│   ├── main.ts               # khởi tạo app
│   ├── core/                 # renderer, scene, camera, controls, loop
│   ├── data/planets.ts       # thông số hành tinh (bán kính, quỹ đạo, chu kỳ, độ nghiêng trục...)
│   ├── objects/              # Sun, Planet, Ring, Moon, Starfield, OrbitLine
│   ├── physics/orbit.ts      # tính vị trí theo thời gian (Kepler đơn giản hoá)
│   ├── ui/                   # info panel, toolbar, labels
│   └── styles.css
├── tests/                    # vitest + playwright
└── .github/workflows/deploy.yml
```

---

## 3. Bốn phase

### Phase 1 — Nền tảng & scene 3D cơ bản ✅

**Mục tiêu:** có trang web chạy được, thấy Mặt Trời và 8 hành tinh dạng khối cầu, xoay/zoom được.

- Khởi tạo Vite + TypeScript, ESLint/Prettier, cài `three`.
- Dựng `Renderer`, `Scene`, `PerspectiveCamera`, vòng lặp `requestAnimationFrame`, xử lý resize & devicePixelRatio.
- Thêm **OrbitControls**: xoay, zoom (giới hạn `minDistance`/`maxDistance`), pan, `enableDamping`.
- File `data/planets.ts` với thông số 8 hành tinh.
- Vẽ Mặt Trời + hành tinh bằng `SphereGeometry` + màu đơn sắc, đặt theo khoảng cách nén.
- Ánh sáng: `PointLight` tại Mặt Trời + `AmbientLight` yếu.

**Kết quả bàn giao:** demo chạy local, thao tác chuột/cảm ứng xoay & zoom mượt.

### Phase 2 — Mô phỏng chuyển động & đồ hoạ chân thực ✅

**Mục tiêu:** hệ mặt trời "sống" và đẹp.

- Áp texture cho từng hành tinh (color map; Trái Đất thêm normal/specular map và lớp mây).
- Hành tinh **quay quanh Mặt Trời** (chu kỳ tương đối đúng, quỹ đạo elip đơn giản hoá, có độ nghiêng quỹ đạo) và **tự quay** quanh trục với **độ nghiêng trục** đúng.
- Vẽ **đường quỹ đạo** (`LineLoop`).
- **Vành đai Sao Thổ** (RingGeometry + texture alpha), Mặt Trăng quay quanh Trái Đất.
- **Nền sao**: skybox/sphere texture Milky Way hoặc `Points` ngẫu nhiên.
- Đồng hồ mô phỏng: hệ số tốc độ thời gian (1 ngày/giây, 1 tháng/giây...), tạm dừng.
- Unit test cho `physics/orbit.ts`.

**Kết quả bàn giao:** các hành tinh có texture, chuyển động trên quỹ đạo theo thời gian.

> Ghi chú triển khai: môi trường build không tải được texture Solar System Scope, nên Trái Đất và Mặt Trăng dùng texture từ ví dụ của three.js (MIT); Mặt Trời và các hành tinh còn lại dùng texture sinh thủ tục (procedural) trong Web Worker. Có thể thay bằng ảnh thật bằng cách đổi `surface` sang `kind: 'image'` trong `src/data/planets.ts`.

### Phase 3 — Tương tác & giao diện người dùng ✅

**Mục tiêu:** người dùng khám phá được hệ mặt trời.

- **Click chọn hành tinh** bằng `Raycaster` → camera **bay mượt** tới và bám theo hành tinh (OrbitControls target theo hành tinh).
- **Panel thông tin**: tên, bán kính, khoảng cách tới Mặt Trời, chu kỳ quỹ đạo/tự quay, số vệ tinh, mô tả ngắn.
- **Nhãn tên** bằng CSS2DRenderer, tự ẩn khi quá xa/che nhau.
- Thanh công cụ: Play/Pause, thanh trượt tốc độ, bật/tắt quỹ đạo & nhãn, chuyển **tỉ lệ nén ↔ thật**, nút "Reset view".
- Danh sách hành tinh để nhảy nhanh; phím tắt (1–8, Space, R), hỗ trợ cảm ứng mobile.
- Giao diện responsive.

**Kết quả bàn giao:** ứng dụng hoàn chỉnh về chức năng.

### Phase 4 — Hiệu ứng, tối ưu & triển khai ✅

**Mục tiêu:** đẹp, nhanh, chạy ổn trên nhiều thiết bị và public lên web.

- **Bloom** cho Mặt Trời (UnrealBloomPass), shader bề mặt Mặt Trời động, lớp khí quyển (Fresnel glow) cho Trái Đất.
- Tối ưu: LOD (giảm số polygon khi ở xa), nén texture (KTX2/Basis hoặc WebP, nhiều mức phân giải), lazy load texture, màn hình loading với tiến trình (`LoadingManager`).
- Chế độ chất lượng thấp/cao, tự hạ cấp khi FPS thấp; giới hạn pixel ratio trên mobile.
- Kiểm tra trên Chrome/Firefox/Safari, desktop & mobile; mục tiêu ≥ 60 FPS desktop, ≥ 30 FPS mobile tầm trung.
- Playwright smoke test (trang load, canvas render, click hành tinh mở panel).
- GitHub Actions: lint + test + build + deploy GitHub Pages.
- README: hướng dẫn chạy, ghi nguồn/license texture.

**Kết quả bàn giao:** website public, có CI/CD.

> Ghi chú triển khai:
>
> - Không làm LOD: mỗi thiên thể dùng chung một khối cầu ~9k tam giác, tổng < 100k tam giác — rẻ cả với điện thoại, và giữ đường viền mượt khi zoom gần.
> - Texture Trái Đất chuyển sang WebP (giảm ~40%); texture mây/Mặt Trăng giữ nguyên vì WebP không nhỏ hơn. Chưa dùng KTX2 (cần thêm công cụ `toktx` và bộ giải mã Basis).
> - E2E chạy trên Chromium (desktop + giả lập Pixel 7). Firefox/Safari chưa có trong CI, cần kiểm tra tay.
> - FPS thực tế chưa đo được trên GPU thật (môi trường phát triển chỉ có WebGL phần mềm); chế độ "Tự động" sẽ hạ chất lượng nếu FPS < 40.
> - Deploy GitHub Pages chạy khi push lên `main` hoặc chạy workflow thủ công, sau khi bật Settings → Pages → Source: GitHub Actions.

---

## 4. Tiêu chí hoàn thành chung

- Zoom in/out bằng cuộn chuột và pinch; xoay bằng kéo chuột/1 ngón; pan bằng chuột phải/2 ngón.
- 8 hành tinh + Mặt Trời + Mặt Trăng + vành đai Sao Thổ hiển thị 3D có texture và ánh sáng.
- Chọn hành tinh xem thông tin; điều khiển tốc độ thời gian.
- Chạy mượt trên trình duyệt hiện đại, không cần cài đặt.

---

## Bổ sung — Zoom xuống gia đình trên Trái Đất ✅

- Trái Đất (và các hành tinh) quay theo mô hình IAU (hướng cực + kinh tuyến gốc), nên giờ địa phương và vị trí Mặt Trời tại một điểm trên mặt đất là đúng.
- Điểm đến: bãi biển Mỹ Khê, Đà Nẵng (16,05°B, 108,25°Đ). Nhãn "🏖 Gia đình" gắn trên bề mặt Trái Đất, phím `G`.
- Chuyển cảnh: camera lao xuống điểm đến trong không gian → lớp mây che → cảnh bãi biển (đơn vị mét) → hạ xuống trước gia đình. Zoom ra / `Esc` để quay lại.
- Cảnh bãi biển: bầu trời vật lý (`Sky`), biển phản chiếu (`Water`), bãi cát trắng dốc xuống biển, biệt thự 2 tầng, sàn gỗ và bể bơi, cây dừa, ô dù, ghế tắm nắng, gia đình 4 người có hoạt cảnh; bóng đổ; ngày/hoàng hôn/đêm theo giờ mô phỏng.
- Cải tiến: zoom theo chặng (Châu Á → Việt Nam → mặt đất) với tiêu đề, chậm bằng ~½ tốc độ cũ, zoom logarit + easing nhẹ, dựng sẵn cảnh bãi biển, làm mượt thời gian khung hình, đèn thành phố ban đêm, bay ngược lên theo cùng kiểu.
