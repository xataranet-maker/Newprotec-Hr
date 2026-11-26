# Hướng Dẫn Đóng Gói Ứng Dụng (Windows, Android, Apple)

Ứng dụng **Newprotec Vina HRM** được cấu hình để chạy nguyên vẹn trên **Trình duyệt Web & PWA** (cài trực tiếp từ Chrome/Edge/Safari như hiện tại), đồng thời hỗ trợ đóng gói thành file cài đặt gốc cho **Windows (.exe)**, **Android (.apk)** và **Apple (macOS .dmg / iOS .ipa)** mà không làm thay đổi mã nguồn ứng dụng chính.

---

## Cách 1: Đóng Gói & Nén File Tự Động Trên GitHub (Khuyên Dùng - Dễ Nhất)

Không cần cài đặt Android Studio, Xcode hay Electron trên máy cá nhân:

1. Đẩy mã nguồn (push code) lên kho lưu trữ **GitHub** của bạn.
2. Mở tab **Actions** trên GitHub → chọn workflow **`Build Installers (Windows, Android, Apple)`**.
3. Nhấn nút **Run workflow**:
   - Chọn **`all`** (hoặc chọn riêng `windows`, `macos`, `android`, `ios`).
   - *(Tùy chọn)* Nhập `api_base_url` là địa chỉ web đang triển khai nếu bạn muốn app đóng gói gọi thêm đồng bộ API nội bộ (`/api/sync`, `/api/qr-login`) song song với Firebase.
4. Chờ vài phút để GitHub tự build và nén thành các file `.zip` ở mục **Artifacts**:
   - `Newprotec-Vina-HRM-Windows-Installer.zip` (chứa file cài đặt `.exe` + bản Portable chạy ngay)
   - `Newprotec-Vina-HRM-macOS-Installer.zip` (chứa file `.dmg` & `.zip` cho macOS Apple Silicon / Intel)
   - `Newprotec-Vina-HRM-Android-APK.zip` (chứa file `Newprotec-Vina-HRM-Android.apk`)
   - `Newprotec-Vina-HRM-iOS-Package.zip` (chứa file `.ipa` chưa ký để cài qua AltStore/Sideloadly/MDM hoặc mở ký bằng Xcode)

> **Mẹo phát hành nhanh:** Nếu bạn tạo tag phiên bản (ví dụ `git tag v2.1.0 && git push origin v2.1.0`), GitHub sẽ tự động tạo mục **Releases** kèm sẵn các file `.zip` để nhân viên tải về.

---

## Cách 2: Đóng Gói Trực Tiếp Trên Máy Cá Nhân

Các lệnh dưới đây tự động build bản Web/PWA (`npm run build`), cài công cụ đóng gói tạm thời (`--no-save`, không làm nặng hệ thống web) và xuất kết quả vào thư mục `release/`:

- **Windows (.exe)**:
  ```bash
  npm run pack:win
  ```
- **Apple macOS (.dmg / .zip)** *(chạy trên máy Mac)*:
  ```bash
  npm run pack:mac
  ```
- **Android (.apk)** *(yêu cầu đã cài Java JDK 21 & Android SDK)*:
  ```bash
  npm run pack:android
  ```
- **Apple iOS (.ipa / Xcode)** *(chạy trên máy Mac có Xcode)*:
  ```bash
  npm run pack:ios
  ```

---

## Trình Duyệt Web & PWA Hiện Tại

Toàn bộ cấu hình trình duyệt và PWA (`npm run dev`, `npm run build`, `npm run start`, Service Worker, Web Manifest) được giữ nguyên 100% và không bị ảnh hưởng bởi các file cấu hình đóng gói.
