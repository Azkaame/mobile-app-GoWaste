// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'masyarakat' | 'pembudidaya';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  profile_image: string | null;
  created_at: string;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'masyarakat' | 'pembudidaya';
}

export interface LocationUpdateData {
  address: string;
  latitude: number;
  longitude: number;
}

// Article Types
export interface Article {
  id: string;
  title: string;
  content: string;
  category: 'sampah_organik' | 'bank_sampah' | 'maggot_bsf';
  image_url: string | null;
  created_at: string;
}

// Transaction Types
export type WasteType = 'sisa_makanan' | 'sayur_buah' | 'organik_lainnya';
export type TransactionStatus = 'menunggu' | 'diterima' | 'ditolak' | 'selesai';

export interface Transaction {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  waste_type: WasteType;
  estimated_weight: number;
  description: string;
  pickup_address: string;
  latitude: number;
  longitude: number;
  status: TransactionStatus;
  breeder_id: string | null;
  breeder_notes: string;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionData {
  waste_type: WasteType;
  estimated_weight: number;
  description?: string;
  pickup_address: string;
  latitude: number;
  longitude: number;
  photo_base64?: string;
}

export interface UpdateTransactionData {
  status: TransactionStatus;
  breeder_notes?: string;
}

// Stats Types
export interface UserStats {
  total_transactions: number;
  pending: number;
  accepted: number;
  completed: number;
  total_weight_kg: number;
}

export interface BreederStats {
  pending_requests: number;
  handled_transactions: number;
  completed: number;
  total_weight_kg: number;
}
