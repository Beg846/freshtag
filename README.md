# FreshTag — Tem thông minh, bữa ăn an tâm

FreshTag là một web app demo **mobile-first** cho tem thực phẩm thông minh: quét mã QR trên tem, xem độ tươi, đọc chứng nhận, truy xuất nguồn gốc và nhận gợi ý món ngon.

Trang chạy hoàn toàn phía trình duyệt, không có backend. Dữ liệu sản phẩm, trang trại, chứng nhận và kết quả kiểm nghiệm đều là **dữ liệu hư cấu** dùng để trình diễn giao diện.

## Bản demo

**https://beg846.github.io/freshtag/**

### Tính năng

- Quét mã QR thật bằng camera (BarcodeDetector gốc, dự phòng jsQR)
- Nhập mã tem thủ công và mở tem mẫu
- Kết quả độ tươi theo 3 mức: an toàn, cần nấu chín, không an toàn
- Thang màu tem và mô phỏng tem đổi màu theo nhiệt độ/thời gian
- Sơ đồ vị trí phần thịt trên con vật
- Truy xuất nguồn gốc, hành trình lô hàng và bản đồ
- Chứng nhận/phiếu kiểm nghiệm minh hoạ, có watermark DEMO
- Gợi ý công thức nấu ăn theo loại thịt và trạng thái tem
- Đọc nội dung bằng tiếng Việt (Web Speech API)
- Lịch sử quét lưu cục bộ trên thiết bị
- Giao diện sáng/tối, chia sẻ liên kết, deep link `?lot=...`
- PWA: cài lên màn hình chính, hoạt động offline sau lần tải đầu

### Tem mẫu

| Mã tem | Sản phẩm | Trạng thái |
| --- | --- | --- |
| `FT-BEEF-8892` | Thịt bò thăn lưng | An toàn |
| `FT-PORK-4102` | Thịt heo ba chỉ | Cần nấu chín kỹ |
| `FT-BEEF-0012` | Thịt bò thăn lưng (lô quá hạn) | Không an toàn |
| `FT-CHICKEN-2231` | Ức gà | An toàn |

Mở nhanh kết quả bằng liên kết:

- https://beg846.github.io/freshtag/?lot=FT-BEEF-8892
- https://beg846.github.io/freshtag/?lot=FT-PORK-4102
- https://beg846.github.io/freshtag/?lot=FT-BEEF-0012
- https://beg846.github.io/freshtag/?lot=FT-CHICKEN-2231

Có thể thêm `&tab=recipes` hoặc `&tab=farm` để mở thẳng tab tương ứng.

## Chạy cục bộ

Vì trang dùng đường dẫn tương đối và service worker, hãy chạy qua HTTP:

```bash
python -m http.server 4173
```

Sau đó mở `http://localhost:4173/`.

Camera chỉ hoạt động trên `https://` hoặc `localhost`. Trên máy tính không có camera, dùng nút **Nhập mã** hoặc **Tem mẫu**.

## Cấu trúc

```
index.html                 # khung ứng dụng + icon sprite
assets/css/styles.css      # toàn bộ giao diện, responsive, dark mode
assets/js/data.js          # dữ liệu demo 4 lô hàng
assets/js/app.js           # logic quét, kết quả, công thức, PWA
assets/vendor/jsQR.min.js  # giải mã QR dự phòng
assets/vendor/qrcode.js    # tạo QR cho tem mẫu
assets/icons/              # icon PWA
manifest.webmanifest       # cấu hình PWA
sw.js                      # cache offline
.github/workflows/pages.yml# deploy GitHub Pages
```

## Công nghệ

HTML, CSS và JavaScript thuần, không framework, không bước build. Font Lexend/Nunito từ Google Fonts. Icon theo phong cách Lucide (ISC). Mã QR dùng [jsQR](https://github.com/cozmo/jsQR) (Apache-2.0) và [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT).

## Giấy phép

[MIT](LICENSE).

## Lưu ý

Đây là sản phẩm minh hoạ, **không phải công cụ đánh giá an toàn thực phẩm**. Không dùng thông tin trong trang để kết luận về thực phẩm thật. Khi nghi ngờ thực phẩm không an toàn, hãy bỏ và liên hệ cơ sở y tế/cơ quan chức năng.
