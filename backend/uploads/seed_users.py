"""
Script seed USER demo untuk GoWaste (MongoDB lokal).
Sesuai backend: hashing SHA-256, field name "password" (bukan password_hash).

Akan membuat 2 akun demo:
  - Masyarakat:   masyarakat@example.com
  - Pembudidaya: pembudidaya@example.com

CARA PAKAI:
  1. Set environment variable DEMO_PASSWORD
  2. pip install pymongo
  3. python seed_users.py
"""

import hashlib
import os
import uuid
from datetime import datetime
from pymongo import MongoClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "gowaste")

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD")

if not DEMO_PASSWORD:
    raise ValueError("DEMO_PASSWORD belum diset.")


def hash_password(password: str) -> str:
    """SHA-256 hash, sesuai server.py"""
    return hashlib.sha256(password.encode()).hexdigest()


def main():
    client = MongoClient(MONGO_URL)
    db = client[DB_NAME]

    print(f"Menghubungkan ke: {MONGO_URL} (database: {DB_NAME})")

    users = [
        {
            "id": str(uuid.uuid4()),
            "name": "Budi Masyarakat",
            "email": "masyarakat@example.com",
            "phone": "081234567890",
            "password": hash_password(DEMO_PASSWORD),
            "role": "masyarakat",
            "address": "Jl. Merdeka No. 1, Jakarta",
            "latitude": -6.2088,
            "longitude": 106.8456,
            "token": None,
            "profile_image": None,
            "created_at": datetime.utcnow(),
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Siti Pembudidaya",
            "email": "pembudidaya@example.com",
            "phone": "081298765432",
            "password": hash_password(DEMO_PASSWORD),
            "role": "pembudidaya",
            "address": "Jl. BSF No. 10, Bogor",
            "latitude": -6.5950,
            "longitude": 106.8166,
            "token": None,
            "profile_image": None,
            "created_at": datetime.utcnow(),
        },
    ]

    # Idempotent: hapus user demo lama berdasarkan email
    emails = [u["email"] for u in users]

    deleted = db.users.delete_many(
        {"email": {"$in": emails}}
    ).deleted_count

    print(f"Menghapus {deleted} user demo lama (jika ada).")

    result = db.users.insert_many(users)

    print(f"Berhasil menambahkan {len(result.inserted_ids)} user demo.")

    print("\n=== AKUN DEMO ===")
    print("  Masyarakat  : masyarakat@example.com")
    print("  Pembudidaya : pembudidaya@example.com")


if __name__ == "__main__":
    main()