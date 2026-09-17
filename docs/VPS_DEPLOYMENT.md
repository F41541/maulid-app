# Panduan Deployment Maulid App ke VPS (Ubuntu / Debian + MariaDB)

Dokumen ini memandu Anda langkah demi langkah untuk melakukan deploy aplikasi **Maulid App** ke VPS pribadi dengan database **MariaDB / MySQL**.

---

## 1. Persiapan di Server VPS

Pastikan VPS sudah memiliki:
- **Node.js**: Versi 20 LTS atau 22 LTS
- **MariaDB Server**
- **Git**
- **PM2** (Process Manager)
- **Nginx** (Reverse Proxy)

### Instalasi Dependensi Dasar di VPS:
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install Git, MariaDB, Nginx, Curl
sudo apt install -y git mariadb-server nginx curl

# Install Node.js 22 LTS (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 secara global
sudo npm install -g pm2
```

---

## 2. Setup Database MariaDB di VPS

Jalankan pengamanan awal MariaDB:
```bash
sudo mysql_secure_installation
```

Masuk ke konsol MariaDB sebagai root:
```bash
sudo mariadb -u root
```

Buat database dan user khusus aplikasi:
```sql
-- 1. Buat Database
CREATE DATABASE IF NOT EXISTS maulid_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Buat User & Password (ganti 'password_rahasia_anda' dengan password yang kuat)
CREATE USER IF NOT EXISTS 'maulid_user'@'localhost' IDENTIFIED BY 'password_rahasia_anda';

-- 3. Berikan Hak Akses Penuh ke Database maulid_app
GRANT ALL PRIVILEGES ON maulid_app.* TO 'maulid_user'@'localhost';

-- 4. Flush Hak Akses
FLUSH PRIVILEGES;

-- Keluar
EXIT;
```

---

## 3. Clone & Setup Aplikasi di VPS

Pilih direktori deployment (misal di `/var/www/maulid-app` atau di home directory user Anda):
```bash
# Pindah ke direktori tujuan
cd /var/www

# Clone repository
git clone https://github.com/F41541/maulid-app.git maulid-app
cd maulid-app

# Install dependensi
npm install
```

---

## 4. Konfigurasi Environment (`.env`)

Buat file `.env` di dalam folder project:
```bash
nano .env
```

Isi dengan kredensial database yang telah dibuat sebelumnya:
```env
# Konfigurasi Database MariaDB
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=maulid_user
DB_PASSWORD=password_rahasia_anda
DB_NAME=maulid_app

# Environment
NODE_ENV=production
PORT=3000

# Secret Key Sesi (Wajib diisi string acak & kuat)
AUTH_SECRET=rahasia-token-panitia-maulid-super-aman-1448h
```
Simpan file (`Ctrl + O`, lalu `Enter`, lalu `Ctrl + X`).

---

## 5. Inisialisasi Database MariaDB

Inisialisasi database MariaDB dapat dilakukan dengan menjalankan skema SQL:
```bash
mariadb -u maulid_user -p maulid_app < scripts/schema.sql
```
*(Tabel dan data seed akun ketua panitia juga otomatis diinisialisasi saat aplikasi pertama kali dijalankan).*

---

## 6. Build Aplikasi Next.js

Jalankan proses kompilasi produksi:
```bash
npm run build
```

---

## 7. Menjalankan Aplikasi dengan PM2

Jalankan aplikasi di latar belakang menggunakan PM2:
```bash
# Jalankan aplikasi dengan nama 'maulid-app'
pm2 start npm --name "maulid-app" -- start

# Pastikan PM2 otomatis berjalan saat VPS reboot
pm2 startup
pm2 save
```

Cek status aplikasi:
```bash
pm2 status
pm2 logs maulid-app
```

---

## 8. Konfigurasi Nginx Reverse Proxy (Domain / Port 80 & 443)

Buat file konfigurasi Nginx baru:
```bash
sudo nano /etc/nginx/sites-available/maulid.conf
```

Tambahkan konfigurasi berikut (ganti `domainanda.com` dengan domain atau IP VPS Anda):
```nginx
server {
    listen 80;
    server_name domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktifkan konfigurasi dan reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/maulid.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Memasang SSL Gratis (HTTPS) dengan Certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d domainanda.com
```

---

## 9. Pemeliharaan & Update di Masa Depan

Ketika ada update kode di repository:
```bash
cd /var/www/maulid-app
git pull origin main
npm install
npm run build
pm2 restart maulid-app
```

Selesai! Aplikasi Maulid App Anda kini berjalan stabil di VPS dengan MariaDB.
