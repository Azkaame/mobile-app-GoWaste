# 🌱 GoWaste

> Aplikasi mobile untuk pengelolaan sampah organik berbasis Maggot BSF.

## 📱 Overview
...

## ✨ Features
- Registrasi & Login
- Pilih lokasi
- Informasi artikel Maggot BSF
- Transaksi sampah organik
- Upload bukti transaksi
- Riwayat transaksi
- Profil pengguna

## 🛠️ Tech Stack
- Expo React Native
- FastAPI
- MongoDB
- Python
- TypeScript
- Figma

## 📸 Application Preview
<img width="811" height="756" alt="Picture3" src="https://github.com/user-attachments/assets/6d94c7d7-c3c9-410b-ade2-9c8bcb566a9f" />



## 🏗️ Project Structure

GoWasteLast11-main/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   ├── tests/
│   │   └── test_concurrent_transactions.py
│   └── uploads/
│       ├── gowaste_articles.json
│       ├── seed_articles.py
│       └── seed_users.py
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (tabs)/
│   │   ├── article/
│   │   ├── transaction/
│   │   └── pilih-lokasi.tsx
│   │
│   ├── assets/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── services/
│   │   └── types/
│   │
│   ├── package.json
│   └── app.json
│
├── tests/
│   └── __init__.py
│
├── articles_export.json
├── gowaste_articles.json
├── test_result.md
├── README.md
└── .gitignore

## 🚀 Installation
1. Clone Repository
git clone https://github.com/Azkaame/mobile-app-GoWaste.git
cd mobile-app-GoWaste

2. Backend Setup
cd backend
pip install -r requirements.txt
Buat file .env dan sesuaikan konfigurasi MongoDB.

Kemudian jalankan server:
uvicorn server:app --reload

3. Frontend Setup
Buka terminal baru:
cd frontend
npm install
npx expo start

⚙️ Environment Variables
Backend
MONGO_URL=your_mongodb_connection
DB_NAME=gowaste

⚙️ Environment Variables
Backend
MONGO_URL=your_mongodb_connection
DB_NAME=gowaste

## 🧪 Testing

https://github.com/user-attachments/assets/174c5c5c-4468-457b-bab6-07338d08a01e


## 👨‍💻 Author
Mohamad Fawaid Aska
