# GoWaste - Aplikasi Pengelolaan Sampah Organik

## Deskripsi Aplikasi
GoWaste adalah aplikasi mobile untuk pengelolaan sampah organik berbasis bank sampah dan biokonversi maggot Black Soldier Fly (BSF). Aplikasi ini menghubungkan masyarakat penyetor sampah dengan pembudidaya maggot BSF di Kota Malang.

## Tech Stack
- **Frontend**: Expo (React Native)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT-based (email/password)

## Fitur Utama

### 1. Autentikasi
- Registrasi dengan pilihan role (Masyarakat/Pembudidaya)
- Login dengan email dan password
- Logout

### 2. Fitur Masyarakat
- **Dashboard**: Statistik setoran (total, menunggu, selesai, kg tersetor)
- **Artikel Edukasi**: Artikel tentang sampah organik, bank sampah, maggot BSF
- **Pengajuan Setoran**: Form pengajuan dengan jenis sampah, berat, lokasi
- **Riwayat Transaksi**: Melihat status setoran
- **Profil**: Informasi akun pengguna

### 3. Fitur Pembudidaya BSF
- **Dashboard**: Statistik pengajuan (pending, selesai, kg diterima)
- **Daftar Pengajuan**: Melihat pengajuan masuk dari masyarakat
- **Kelola Transaksi**: Terima/tolak pengajuan, tandai selesai
- **Lihat Lokasi**: Koordinat dan alamat penyetor
- **Artikel Edukasi**: Sama dengan masyarakat

### 4. Kategori Sampah Organik
- Sisa Makanan (icon: restaurant)
- Sayur & Buah (icon: leaf)
- Organik Lainnya (icon: trash)

### 5. Artikel Edukasi (Pre-populated)
1. Apa itu Sampah Organik?
2. Manfaat Bank Sampah untuk Lingkungan
3. Mengenal Maggot Black Soldier Fly (BSF)
4. Cara Memilah Sampah Organik di Rumah
5. Proses Biokonversi Maggot BSF

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrasi user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Users
- `GET /api/users/profile` - Get profil user
- `PUT /api/users/profile` - Update profil

### Articles
- `GET /api/articles` - Get semua artikel (filter by category)
- `GET /api/articles/{id}` - Get detail artikel

### Transactions
- `POST /api/transactions` - Buat pengajuan baru
- `GET /api/transactions` - Get transaksi user (masyarakat)
- `GET /api/transactions/pending` - Get pengajuan pending (pembudidaya)
- `GET /api/transactions/breeder` - Get transaksi yang dihandle pembudidaya
- `GET /api/transactions/{id}` - Get detail transaksi
- `PUT /api/transactions/{id}/status` - Update status transaksi

### Stats
- `GET /api/stats/user` - Get statistik user

## Database Schema

### users
```json
{
  "id": "uuid",
  "email": "string",
  "password": "hashed",
  "name": "string",
  "phone": "string",
  "role": "masyarakat|pembudidaya",
  "address": "string",
  "latitude": "float",
  "longitude": "float",
  "token": "string",
  "created_at": "datetime"
}
```

### transactions
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "user_name": "string",
  "user_phone": "string",
  "waste_type": "sisa_makanan|sayur_buah|organik_lainnya",
  "estimated_weight": "float",
  "description": "string",
  "pickup_address": "string",
  "latitude": "float",
  "longitude": "float",
  "status": "menunggu|diterima|ditolak|selesai",
  "breeder_id": "uuid|null",
  "breeder_notes": "string",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### articles
```json
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "category": "sampah_organik|bank_sampah|maggot_bsf",
  "image_url": "string|null",
  "created_at": "datetime"
}
```

## Batasan Sistem
- Tidak ada sistem pembayaran digital
- Tidak ada algoritma rute kompleks
- Lokasi menggunakan koordinat sederhana (tanpa Google Maps API)
- Studi kasus: Kota Malang
- Koordinat default: -7.9666, 112.6326 (Malang)

## Testing Accounts
- **Masyarakat**: test@masyarakat.com / 123456
- **Pembudidaya**: test@pembudidaya.com / 123456

## Status Implementasi
- ✅ Backend API lengkap
- ✅ Autentikasi (register/login/logout)
- ✅ Artikel edukasi dengan kategori
- ✅ Pengajuan setoran sampah
- ✅ Manajemen transaksi untuk pembudidaya
- ✅ Statistik user
- ✅ UI Bahasa Indonesia
- ✅ Tab navigation
- ✅ Lokasi dengan koordinat
