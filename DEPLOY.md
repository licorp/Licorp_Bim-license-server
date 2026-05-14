# 🚀 Hướng Dẫn Deploy lên Railway

## Yêu Cầu Trước Khi Deploy

- [ ] Tài khoản [GitHub](https://github.com) (miễn phí)
- [ ] Tài khoản [Railway](https://railway.app) (đăng nhập bằng GitHub)
- [ ] Tài khoản [MongoDB Atlas](https://cloud.mongodb.com) (miễn phí 512MB)

---

## Bước 1 — Tạo MongoDB Atlas (nếu chưa có)

> Server đang dùng MongoDB (không phải PostgreSQL). Bạn cần MongoDB URI.

1. Vào [cloud.mongodb.com](https://cloud.mongodb.com) → **Sign Up** miễn phí
2. Tạo **Free Cluster** (M0 Sandbox — 512MB miễn phí)
3. Tạo **Database User**: `Admin` > `Database Access` > Add New User
4. Whitelist IP: `Admin` > `Network Access` > Add `0.0.0.0/0` (allow all)
5. Lấy connection string: `Connect` > `Drivers` > Copy URI
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bim-manager?retryWrites=true&w=majority
   ```

---

## Bước 2 — Đưa Code lên GitHub

Mở PowerShell trong thư mục project:

```powershell
# Bước 2.1: Tạo repo mới trên GitHub (vào github.com tạo repo tên 'bim-license-server')

# Bước 2.2: Khởi tạo Git và push
cd c:\revit-api-main

git init                          # nếu chưa có git
git add .
git commit -m "feat: initial deploy setup"
git remote add origin https://github.com/TEN_BAN_CUA_BAN/bim-license-server.git
git push -u origin main
```

> ⚠️ **Kiểm tra**: Đảm bảo file `.env` KHÔNG xuất hiện khi `git status`

---

## Bước 3 — Deploy lên Railway

1. Vào [railway.app](https://railway.app) → **Start a New Project**
2. Chọn **Deploy from GitHub repo**
3. Chọn repo `bim-license-server` vừa push
4. Railway tự detect Dockerfile và bắt đầu build

---

## Bước 4 — Cấu Hình Biến Môi Trường trên Railway

Vào **Variables** tab của project, thêm từng biến:

| Tên biến | Giá trị |
|---|---|
| `MONGODB_URI` | `mongodb+srv://...` (từ Atlas) |
| `ACCESS_TOKEN_SECRET` | chuỗi ngẫu nhiên 64 ký tự |
| `REFRESH_TOKEN_SECRET` | chuỗi ngẫu nhiên 64 ký tự khác |
| `ADMIN_SECRET_KEY` | `Licorp 2026` |
| `VITE_ADMIN_USER` | `admin` |
| `VITE_ADMIN_PASS` | `Admin@2024` |
| `VITE_ADMIN_KEY` | `Licorp 2026` |
| `NODE_ENV` | `production` |

### Tạo secret keys ngẫu nhiên:
```powershell
# Chạy trong PowerShell để tạo key ngẫu nhiên
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Bước 5 — Lấy Domain và Test

1. Vào tab **Settings** > **Domains** → Generate Domain
2. Railway cấp URL dạng: `https://bim-license-server-xxxx.up.railway.app`
3. Test health check:
   ```
   GET https://bim-license-server-xxxx.up.railway.app/health
   ```
   Kết quả mong đợi:
   ```json
   { "status": "ok", "db": "connected", "uptime": 42 }
   ```

---

## Bước 6 — Cập nhật Plugin

Trong plugin Revit/AutoCAD C#, thay địa chỉ server:

```csharp
// Cũ (local)
private const string BASE_URL = "http://localhost:3000";

// Mới (Railway)
private const string BASE_URL = "https://bim-license-server-xxxx.up.railway.app";
```

---

## Lưu Ý Quan Trọng

### 🔒 Bảo mật
- **KHÔNG bao giờ** commit file `.env` lên GitHub
- Đổi `ADMIN_SECRET_KEY` thành giá trị khó đoán trước khi deploy
- Đổi `VITE_ADMIN_PASS` thành mật khẩu mạnh

### 🔄 Auto-deploy
Railway tự động redeploy khi bạn push code mới lên GitHub.

### 📊 Monitor
- Xem logs: Railway Dashboard > **Deployments** > **View Logs**
- Thêm [UptimeRobot](https://uptimerobot.com) miễn phí để nhận alert khi server down

---

## Troubleshooting

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Build failed | Thiếu dependency | Kiểm tra `package.json` |
| `MongoDB connection error` | Sai URI hoặc chưa whitelist IP | Kiểm tra Atlas Network Access |
| `Health: degraded` | MongoDB chưa kết nối | Kiểm tra `MONGODB_URI` trong Variables |
| 401 trên admin API | Sai `ADMIN_SECRET_KEY` | Kiểm tra header `x-admin-key` |
