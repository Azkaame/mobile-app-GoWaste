"""
Script seed artikel GoWaste untuk MongoDB lokal.

CARA PAKAI:
1. Pastikan MongoDB lokal Anda sudah running.
2. Pastikan Python 3.x terinstall + library 'pymongo':
     pip install pymongo
3. Edit MONGO_URL & DB_NAME di bawah jika perlu (atau set lewat env var).
4. Letakkan file 'gowaste_articles.json' di folder yang sama dengan script ini.
5. Jalankan:
     python seed_articles.py
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from pymongo import MongoClient

# === KONFIGURASI ===
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "gowaste")
JSON_FILE = Path(__file__).parent / "gowaste_articles.json"


def parse_dt(value):
    """Parse ISO string -> datetime (timezone-naive UTC, sesuai pola server)."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        # Hilangkan trailing 'Z' bila ada
        v = value.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(v)
            # Konversi ke UTC naive supaya seragam dgn datetime.utcnow() di server
            if dt.tzinfo is not None:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        except ValueError:
            pass
    return datetime.utcnow()


def main():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    print(f"Menghubungkan ke: {MONGO_URL} (database: {DB_NAME})")

    if not JSON_FILE.exists():
        print(f"ERROR: File {JSON_FILE} tidak ditemukan.")
        return

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        articles = json.load(f)

    # Pastikan setiap artikel punya field yg dibutuhkan model
    for art in articles:
        art["created_at"] = parse_dt(art.get("created_at"))
        art.setdefault("image_url", None)

    # Hapus existing data agar idempoten
    deleted = db.articles.delete_many({}).deleted_count
    print(f"Menghapus {deleted} artikel lama.")

    result = db.articles.insert_many(articles)
    print(f"Berhasil menambahkan {len(result.inserted_ids)} artikel ke koleksi 'articles'.")

    # Buat index
    db.articles.create_index("category")
    print("Index 'category' dibuat.")

    print("Selesai!")


if __name__ == "__main__":
    main()
