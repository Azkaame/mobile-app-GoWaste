from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime
import hashlib
import secrets
import base64
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'gowaste_db')]

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / 'uploads'
UPLOADS_DIR.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI(title="GoWaste API", description="API untuk aplikasi pengelolaan sampah organik GoWaste")

# Mount static files for uploads at /api/uploads (to match Kubernetes routing)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# Auth Models
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    phone: str
    role: str = "masyarakat"  # masyarakat or pembudidaya
    # Lokasi tidak diperlukan saat registrasi

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    profile_image: Optional[str] = None
    created_at: datetime
    token: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserLocationUpdate(BaseModel):
    address: str
    latitude: float
    longitude: float

class UserProfileImageUpdate(BaseModel):
    image_base64: str

# Article Models
class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str  # sampah_organik, bank_sampah, maggot_bsf
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ArticleResponse(BaseModel):
    id: str
    title: str
    content: str
    category: str
    image_url: Optional[str]
    created_at: datetime

# Transaction Models
class TransactionCreate(BaseModel):
    waste_type: str  # sisa_makanan, sayur_buah, organik_lainnya
    estimated_weight: float  # dalam kg
    description: Optional[str] = ""
    pickup_address: str
    latitude: float
    longitude: float
    photo_base64: Optional[str] = None  # Base64 encoded photo

class TransactionUpdate(BaseModel):
    status: str  # menunggu, diterima, ditolak, selesai
    breeder_notes: Optional[str] = ""

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    user_phone: str
    waste_type: str
    estimated_weight: float
    description: str
    pickup_address: str
    latitude: float
    longitude: float
    status: str
    breeder_id: Optional[str]
    breeder_notes: str
    photo_url: Optional[str] = None  # Made optional with default None
    created_at: datetime
    updated_at: datetime

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Hash password dengan SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate random token"""
    return secrets.token_hex(32)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user dari token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Token tidak ditemukan")
    
    token = credentials.credentials
    user = await db.users.find_one({"token": token})
    if not user:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    
    return user

def get_waste_type_label(waste_type: str) -> str:
    """Get label untuk jenis sampah"""
    labels = {
        "sisa_makanan": "Sisa Makanan",
        "sayur_buah": "Sayur & Buah",
        "organik_lainnya": "Sampah Organik Lainnya"
    }
    return labels.get(waste_type, waste_type)

def get_status_label(status: str) -> str:
    """Get label untuk status"""
    labels = {
        "menunggu": "Menunggu",
        "diterima": "Diterima",
        "ditolak": "Ditolak",
        "selesai": "Selesai"
    }
    return labels.get(status, status)

def transaction_to_response(t: dict) -> TransactionResponse:
    """Convert transaction dict to TransactionResponse, handling missing fields"""
    return TransactionResponse(
        id=t["id"],
        user_id=t["user_id"],
        user_name=t["user_name"],
        user_phone=t["user_phone"],
        waste_type=t["waste_type"],
        estimated_weight=t["estimated_weight"],
        description=t.get("description", ""),
        pickup_address=t["pickup_address"],
        latitude=t["latitude"],
        longitude=t["longitude"],
        status=t["status"],
        breeder_id=t.get("breeder_id"),
        breeder_notes=t.get("breeder_notes", ""),
        photo_url=t.get("photo_url"),  # Handle missing photo_url
        created_at=t["created_at"],
        updated_at=t["updated_at"]
    )

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserRegister):
    """Registrasi user baru"""
    # Check if email already exists
    existing = await db.users.find_one({"email": user.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    # Validate role
    if user.role not in ["masyarakat", "pembudidaya"]:
        raise HTTPException(status_code=400, detail="Role tidak valid")
    
    # Create user
    user_id = str(uuid.uuid4())
    token = generate_token()
    
    user_doc = {
        "id": user_id,
        "email": user.email.lower(),
        "password": hash_password(user.password),
        "name": user.name,
        "phone": user.phone,
        "role": user.role,
        "address": None,  # Lokasi diatur nanti via halaman profil
        "latitude": None,
        "longitude": None,
        "token": token,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    
    return UserResponse(
        id=user_id,
        email=user_doc["email"],
        name=user_doc["name"],
        phone=user_doc["phone"],
        role=user_doc["role"],
        address=user_doc.get("address"),
        latitude=user_doc.get("latitude"),
        longitude=user_doc.get("longitude"),
        profile_image=user_doc.get("profile_image"),
        created_at=user_doc["created_at"],
        token=token
    )

@api_router.post("/auth/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    """Login user"""
    user = await db.users.find_one({
        "email": credentials.email.lower(),
        "password": hash_password(credentials.password)
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Email atau password salah")
    
    # Generate new token
    token = generate_token()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"token": token}}
    )
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user["phone"],
        role=user["role"],
        address=user.get("address"),
        latitude=user.get("latitude"),
        longitude=user.get("longitude"),
        profile_image=user.get("profile_image"),
        created_at=user["created_at"],
        token=token
    )

@api_router.post("/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user - invalidate token"""
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"token": None}}
    )
    return {"message": "Berhasil logout"}

# ==================== USER ENDPOINTS ====================

@api_router.get("/users/profile", response_model=UserResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get profil user yang sedang login"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user["phone"],
        role=current_user["role"],
        address=current_user.get("address"),
        latitude=current_user.get("latitude"),
        longitude=current_user.get("longitude"),
        profile_image=current_user.get("profile_image"),
        created_at=current_user["created_at"]
    )

@api_router.put("/users/profile", response_model=UserResponse)
async def update_profile(update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update profil user"""
    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    if update.phone is not None:
        update_data["phone"] = update.phone
    if update.address is not None:
        update_data["address"] = update.address
    if update.latitude is not None:
        update_data["latitude"] = update.latitude
    if update.longitude is not None:
        update_data["longitude"] = update.longitude
    
    if update_data:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_data}
        )
    
    # Get updated user
    user = await db.users.find_one({"id": current_user["id"]})
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user["phone"],
        role=user["role"],
        address=user.get("address"),
        latitude=user.get("latitude"),
        longitude=user.get("longitude"),
        profile_image=user.get("profile_image"),
        created_at=user["created_at"]
    )

@api_router.put("/users/location", response_model=UserResponse)
async def update_location(location: UserLocationUpdate, current_user: dict = Depends(get_current_user)):
    """Update lokasi user (address, latitude, longitude)"""
    update_data = {
        "address": location.address,
        "latitude": location.latitude,
        "longitude": location.longitude
    }
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    # Get updated user
    user = await db.users.find_one({"id": current_user["id"]})
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user["phone"],
        role=user["role"],
        address=user.get("address"),
        latitude=user.get("latitude"),
        longitude=user.get("longitude"),
        profile_image=user.get("profile_image"),
        created_at=user["created_at"]
    )

@api_router.put("/users/profile-image", response_model=UserResponse)
async def update_profile_image(data: UserProfileImageUpdate, current_user: dict = Depends(get_current_user)):
    """Update foto profil user"""
    # Save the image
    image_url = await save_photo_from_base64(data.image_base64)
    
    # Update user's profile_image
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"profile_image": image_url}}
    )
    
    # Get updated user
    user = await db.users.find_one({"id": current_user["id"]})
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        phone=user["phone"],
        role=user["role"],
        address=user.get("address"),
        latitude=user.get("latitude"),
        longitude=user.get("longitude"),
        profile_image=user.get("profile_image"),
        created_at=user["created_at"]
    )

# ==================== ARTICLE ENDPOINTS ====================

@api_router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(category: Optional[str] = None):
    """Get semua artikel atau filter by category"""
    query = {}
    if category:
        query["category"] = category
    
    articles = await db.articles.find(query).sort("created_at", -1).to_list(100)
    return [ArticleResponse(**article) for article in articles]

@api_router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str):
    """Get detail artikel"""
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel tidak ditemukan")
    return ArticleResponse(**article)

# ==================== TRANSACTION ENDPOINTS ====================

async def save_photo_from_base64(base64_data: str) -> str:
    """Save base64 photo to uploads folder and return the URL path"""
    try:
        # Remove data URL prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
        
        # Decode base64
        photo_bytes = base64.b64decode(base64_data)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.jpg"
        filepath = UPLOADS_DIR / filename
        
        # Save file
        async with aiofiles.open(filepath, 'wb') as f:
            await f.write(photo_bytes)
        
        # Return URL path with /api prefix for Kubernetes routing
        return f"/api/uploads/{filename}"
    except Exception as e:
        logger.error(f"Error saving photo: {e}")
        raise HTTPException(status_code=400, detail="Gagal menyimpan foto")

@api_router.post("/transactions", response_model=TransactionResponse)
async def create_transaction(
    transaction: TransactionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Buat pengajuan setoran sampah baru (untuk masyarakat)"""
    if current_user["role"] != "masyarakat":
        raise HTTPException(status_code=403, detail="Hanya masyarakat yang dapat membuat pengajuan")
    
    # Validate waste type
    valid_types = ["sisa_makanan", "sayur_buah", "organik_lainnya"]
    if transaction.waste_type not in valid_types:
        raise HTTPException(status_code=400, detail="Jenis sampah tidak valid")
    
    # Save photo if provided
    photo_url = None
    if transaction.photo_base64:
        photo_url = await save_photo_from_base64(transaction.photo_base64)
    
    transaction_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    transaction_doc = {
        "id": transaction_id,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "user_phone": current_user["phone"],
        "waste_type": transaction.waste_type,
        "estimated_weight": transaction.estimated_weight,
        "description": transaction.description or "",
        "pickup_address": transaction.pickup_address,
        "latitude": transaction.latitude,
        "longitude": transaction.longitude,
        "status": "menunggu",
        "breeder_id": None,
        "breeder_notes": "",
        "photo_url": photo_url,
        "created_at": now,
        "updated_at": now
    }
    
    await db.transactions.insert_one(transaction_doc)
    
    return transaction_to_response(transaction_doc)

@api_router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get riwayat transaksi untuk masyarakat"""
    if current_user["role"] != "masyarakat":
        raise HTTPException(status_code=403, detail="Endpoint ini hanya untuk masyarakat")
    
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query).sort("created_at", -1).to_list(100)
    return [transaction_to_response(t) for t in transactions]

@api_router.get("/transactions/pending", response_model=List[TransactionResponse])
async def get_pending_transactions(current_user: dict = Depends(get_current_user)):
    """Get pengajuan yang menunggu (untuk pembudidaya)"""
    if current_user["role"] != "pembudidaya":
        raise HTTPException(status_code=403, detail="Endpoint ini hanya untuk pembudidaya")
    
    transactions = await db.transactions.find({"status": "menunggu"}).sort("created_at", -1).to_list(100)
    return [transaction_to_response(t) for t in transactions]

@api_router.get("/transactions/breeder", response_model=List[TransactionResponse])
async def get_breeder_transactions(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get transaksi yang dihandle oleh pembudidaya"""
    if current_user["role"] != "pembudidaya":
        raise HTTPException(status_code=403, detail="Endpoint ini hanya untuk pembudidaya")
    
    query = {"breeder_id": current_user["id"]}
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query).sort("updated_at", -1).to_list(100)
    return [transaction_to_response(t) for t in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction_detail(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detail transaksi"""
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    # Check access
    if current_user["role"] == "masyarakat" and transaction["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    return transaction_to_response(transaction)

@api_router.put("/transactions/{transaction_id}/status", response_model=TransactionResponse)
async def update_transaction_status(
    transaction_id: str,
    update: TransactionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update status transaksi (untuk pembudidaya)"""
    if current_user["role"] != "pembudidaya":
        raise HTTPException(status_code=403, detail="Hanya pembudidaya yang dapat mengupdate status")
    
    # Validate status
    valid_statuses = ["diterima", "ditolak", "selesai"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Status tidak valid")
    
    transaction = await db.transactions.find_one({"id": transaction_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    # CHECK 1: Transaksi sudah ditangani pembudidaya lain
    if transaction.get("breeder_id") and transaction["breeder_id"] != current_user["id"]:
        raise HTTPException(
            status_code=409, 
            detail="Transaksi ini sudah ditangani oleh pembudidaya lain"
        )
    
    # CHECK 2: Untuk status "diterima", pastikan transaksi masih "menunggu"
    if update.status == "diterima" and transaction["status"] != "menunggu":
        raise HTTPException(
            status_code=409,
            detail=f"Transaksi tidak dapat diterima karena status sudah '{transaction['status']}'"
        )
    
    # CHECK 3: Untuk status "ditolak", pastikan transaksi masih "menunggu"
    if update.status == "ditolak" and transaction["status"] != "menunggu":
        raise HTTPException(
            status_code=409,
            detail=f"Transaksi tidak dapat ditolak karena status sudah '{transaction['status']}'"
        )
    
    # CHECK 4: Untuk status "selesai", pastikan transaksi sudah "diterima" dan oleh pembudidaya yang sama
    if update.status == "selesai":
        if transaction["status"] != "diterima":
            raise HTTPException(
                status_code=409,
                detail="Transaksi hanya dapat diselesaikan jika sudah diterima"
            )
        if transaction.get("breeder_id") != current_user["id"]:
            raise HTTPException(
                status_code=409,
                detail="Hanya pembudidaya yang menerima yang dapat menyelesaikan transaksi"
            )
    
    # Use atomic update with condition to prevent race condition
    update_data = {
        "status": update.status,
        "breeder_id": current_user["id"],
        "breeder_notes": update.breeder_notes or "",
        "updated_at": datetime.utcnow()
    }
    
    # Atomic update: only update if status is still as expected
    if update.status in ["diterima", "ditolak"]:
        # For accept/reject, transaction must still be "menunggu"
        result = await db.transactions.update_one(
            {"id": transaction_id, "status": "menunggu"},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            # Another breeder already updated this transaction
            raise HTTPException(
                status_code=409,
                detail="Transaksi ini sudah diproses oleh pembudidaya lain"
            )
    else:
        # For "selesai", use normal update
        await db.transactions.update_one(
            {"id": transaction_id},
            {"$set": update_data}
        )
    
    # Get updated transaction
    updated = await db.transactions.find_one({"id": transaction_id})
    return transaction_to_response(updated)

# ==================== STATS ENDPOINTS ====================

@api_router.get("/stats/user")
async def get_user_stats(current_user: dict = Depends(get_current_user)):
    """Get statistik user"""
    if current_user["role"] == "masyarakat":
        total = await db.transactions.count_documents({"user_id": current_user["id"]})
        pending = await db.transactions.count_documents({"user_id": current_user["id"], "status": "menunggu"})
        accepted = await db.transactions.count_documents({"user_id": current_user["id"], "status": "diterima"})
        completed = await db.transactions.count_documents({"user_id": current_user["id"], "status": "selesai"})
        
        # Calculate total weight
        pipeline = [
            {"$match": {"user_id": current_user["id"], "status": "selesai"}},
            {"$group": {"_id": None, "total_weight": {"$sum": "$estimated_weight"}}}
        ]
        result = await db.transactions.aggregate(pipeline).to_list(1)
        total_weight = result[0]["total_weight"] if result else 0
        
        return {
            "total_transactions": total,
            "pending": pending,
            "accepted": accepted,
            "completed": completed,
            "total_weight_kg": total_weight
        }
    else:
        # Pembudidaya stats
        pending = await db.transactions.count_documents({"status": "menunggu"})
        handled = await db.transactions.count_documents({"breeder_id": current_user["id"]})
        completed = await db.transactions.count_documents({"breeder_id": current_user["id"], "status": "selesai"})
        
        pipeline = [
            {"$match": {"breeder_id": current_user["id"], "status": "selesai"}},
            {"$group": {"_id": None, "total_weight": {"$sum": "$estimated_weight"}}}
        ]
        result = await db.transactions.aggregate(pipeline).to_list(1)
        total_weight = result[0]["total_weight"] if result else 0
        
        return {
            "pending_requests": pending,
            "handled_transactions": handled,
            "completed": completed,
            "total_weight_kg": total_weight
        }

# ==================== SEED DATA ====================

@api_router.post("/seed/articles")
async def seed_articles():
    """Seed artikel edukasi (run once)"""
    # Check if already seeded
    count = await db.articles.count_documents({})
    if count > 0:
        return {"message": "Artikel sudah ada", "count": count}
    
    articles = [
        {
            "id": str(uuid.uuid4()),
            "title": "Apa itu Sampah Organik?",
            "content": """Sampah organik adalah jenis sampah yang berasal dari makhluk hidup dan dapat terurai secara alami oleh mikroorganisme. Sampah ini merupakan bahan yang mudah membusuk karena mengandung senyawa karbon yang dapat diuraikan oleh bakteri.

**Contoh Sampah Organik:**
• Sisa makanan (nasi, sayur, buah)
• Daun-daun kering
• Kulit buah dan sayuran
• Tulang ikan dan ayam
• Ampas teh dan kopi

**Mengapa Pengelolaan Sampah Organik Penting?**
1. Mengurangi volume sampah di TPA
2. Mencegah pencemaran lingkungan
3. Dapat diolah menjadi kompos atau pakan ternak
4. Mendukung pertanian berkelanjutan

**Tips Memilah Sampah Organik:**
• Pisahkan dari sampah anorganik
• Simpan dalam wadah tertutup
• Hindari mencampur dengan sampah berbahaya
• Setor rutin ke bank sampah atau pengepul""",
            "category": "sampah_organik",
            "image_url": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Manfaat Bank Sampah untuk Lingkungan",
            "content": """Bank sampah adalah sistem pengelolaan sampah berbasis masyarakat yang menerapkan prinsip 3R (Reduce, Reuse, Recycle). Di bank sampah, warga dapat menyetorkan sampah yang sudah dipilah dan mendapat imbalan.

**Manfaat Bank Sampah:**

**1. Lingkungan:**
• Mengurangi volume sampah ke TPA
• Mencegah pencemaran tanah dan air
• Mendukung pengelolaan sampah berkelanjutan
• Mengurangi emisi gas rumah kaca

**2. Ekonomi:**
• Memberikan nilai ekonomi pada sampah
• Menciptakan lapangan kerja
• Menghemat biaya pengelolaan sampah
• Mendorong ekonomi sirkular

**3. Sosial:**
• Meningkatkan kesadaran lingkungan
• Membangun gotong royong masyarakat
• Menciptakan lingkungan yang bersih
• Edukasi pemilahan sampah

**Cara Kerja Bank Sampah:**
1. Warga memilah sampah di rumah
2. Sampah ditimbang dan dicatat
3. Nilai sampah dikonversi ke tabungan
4. Sampah diolah atau dijual ke pengepul""",
            "category": "bank_sampah",
            "image_url": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Mengenal Maggot Black Soldier Fly (BSF)",
            "content": """Black Soldier Fly (BSF) atau Hermetia illucens adalah lalat hitam yang larvanya (maggot) memiliki kemampuan luar biasa dalam mengurai sampah organik. Maggot BSF menjadi solusi inovatif untuk pengelolaan sampah organik.

**Keunggulan Maggot BSF:**

**1. Pengurai Sampah Efektif:**
• Dapat mengurai berbagai jenis sampah organik
• Proses penguraian cepat (2-3 minggu)
• Tidak menimbulkan bau menyengat
• Mengurangi volume sampah hingga 80%

**2. Nilai Ekonomi Tinggi:**
• Maggot sebagai pakan ternak alternatif
• Kandungan protein tinggi (40-50%)
• Pupuk organik dari kotoran maggot
• Potensi bisnis budidaya BSF

**3. Ramah Lingkungan:**
• Lalat dewasa tidak mengganggu manusia
• Tidak menyebarkan penyakit
• Siklus hidup terkontrol
• Mendukung pertanian organik

**Sampah yang Dapat Diolah BSF:**
• Sisa makanan rumah tangga
• Buah dan sayur busuk
• Ampas tahu dan tempe
• Limbah pasar
• Kotoran ternak""",
            "category": "maggot_bsf",
            "image_url": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Cara Memilah Sampah Organik di Rumah",
            "content": """Memilah sampah organik di rumah adalah langkah awal yang penting dalam pengelolaan sampah berkelanjutan. Berikut panduan lengkap untuk memulai pemilahan sampah organik.

**Langkah-Langkah Memilah Sampah:**

**1. Siapkan Wadah Terpisah:**
• Wadah untuk sampah organik (hijau/coklat)
• Wadah untuk sampah anorganik
• Wadah untuk sampah B3 (berbahaya)

**2. Kenali Jenis Sampah Organik:**
• Sisa makanan dan minuman
• Kulit buah dan sayuran
• Tulang dan duri ikan
• Daun dan ranting kecil
• Ampas kopi dan teh

**3. Tips Penyimpanan:**
• Gunakan wadah tertutup rapat
• Letakkan di tempat teduh
• Buang secara rutin (2-3 hari)
• Hindari mencampur dengan plastik

**4. Yang Perlu Dihindari:**
• Jangan campur dengan sampah berbahaya
• Hindari sampah yang mengandung minyak berlebih
• Pisahkan bungkus plastik dari makanan
• Jangan buang obat-obatan bersama organik

**Manfaat Memilah di Rumah:**
• Mempermudah proses daur ulang
• Mengurangi bau tidak sedap
• Mendukung program bank sampah
• Berkontribusi pada lingkungan bersih""",
            "category": "sampah_organik",
            "image_url": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Proses Biokonversi Maggot BSF",
            "content": """Biokonversi adalah proses mengubah sampah organik menjadi produk bernilai menggunakan organisme hidup. Maggot BSF adalah agen biokonversi yang sangat efektif untuk mengolah sampah organik menjadi protein dan pupuk.

**Tahapan Biokonversi BSF:**

**1. Persiapan:**
• Siapkan wadah budidaya (biopond)
• Kumpulkan sampah organik
• Cacah sampah menjadi ukuran kecil
• Pastikan kelembaban optimal (60-70%)

**2. Pemberian Sampah:**
• Masukkan sampah ke biopond
• Tambahkan larva BSF umur 5-7 hari
• Rasio: 1 kg larva untuk 5-10 kg sampah
• Tutup dengan penutup berventilasi

**3. Proses Penguraian:**
• Larva akan mengkonsumsi sampah
• Proses berlangsung 2-3 minggu
• Larva tumbuh dan bertambah berat
• Volume sampah berkurang drastis

**4. Hasil Biokonversi:**
• Larva BSF (prepupa) - pakan ternak
• Kascing BSF - pupuk organik
• Residu minimal

**Keuntungan Biokonversi BSF:**
• Ramah lingkungan
• Menghasilkan protein berkualitas
• Pupuk organik untuk tanaman
• Solusi pengelolaan sampah berkelanjutan
• Potensi usaha yang menjanjikan""",
            "category": "maggot_bsf",
            "image_url": None,
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.articles.insert_many(articles)
    return {"message": "Berhasil menambahkan artikel", "count": len(articles)}

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "Selamat datang di GoWaste API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("token")
    await db.transactions.create_index("user_id")
    await db.transactions.create_index("breeder_id")
    await db.transactions.create_index("status")
    await db.articles.create_index("category")
    logger.info("GoWaste API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
