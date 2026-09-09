"""
Test Driven Development (TDD) untuk GoWaste API
Fokus: Concurrent Transaction Handling

Skenario yang diuji:
1. Masyarakat membuat pengajuan setoran
2. Ada 2 pembudidaya (Breeder A dan Breeder B)
3. Breeder A menerima pengajuan -> Berhasil
4. Breeder B mencoba menerima pengajuan yang sama -> Harus GAGAL
5. Breeder B mencoba menolak pengajuan yang sama -> Harus GAGAL
"""

import asyncio
import httpx
import pytest
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001/api"

# Test Users
MASYARAKAT = {
    "email": "test_masyarakat@example.com",
    "password": "test123",
    "name": "Test Masyarakat",
    "phone": "081234567890",
    "role": "masyarakat"
}

BREEDER_A = {
    "email": "test_breeder_a@example.com",
    "password": "test123",
    "name": "Test Breeder A",
    "phone": "081234567891",
    "role": "pembudidaya"
}

BREEDER_B = {
    "email": "test_breeder_b@example.com",
    "password": "test123",
    "name": "Test Breeder B", 
    "phone": "081234567892",
    "role": "pembudidaya"
}


class TestConcurrentTransactionHandling:
    """Test suite for concurrent transaction handling"""
    
    masyarakat_token = None
    breeder_a_token = None
    breeder_b_token = None
    transaction_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        pass
    
    @staticmethod
    async def register_or_login(client: httpx.AsyncClient, user_data: dict) -> str:
        """Register a new user or login if already exists"""
        # Try to register first
        response = await client.post(f"{BASE_URL}/auth/register", json=user_data)
        
        if response.status_code == 200:
            return response.json()["token"]
        elif response.status_code == 400 and "sudah terdaftar" in response.json().get("detail", ""):
            # User already exists, login instead
            login_data = {"email": user_data["email"], "password": user_data["password"]}
            response = await client.post(f"{BASE_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                return response.json()["token"]
        
        raise Exception(f"Failed to register/login: {response.text}")
    
    @staticmethod
    async def create_transaction(client: httpx.AsyncClient, token: str) -> str:
        """Create a new waste deposit transaction"""
        headers = {"Authorization": f"Bearer {token}"}
        transaction_data = {
            "waste_type": "sisa_makanan",
            "estimated_weight": 5.0,
            "description": "Test transaction for concurrent handling",
            "pickup_address": "Jl. Test No. 123, Malang",
            "latitude": -7.9666,
            "longitude": 112.6326
        }
        
        response = await client.post(
            f"{BASE_URL}/transactions",
            json=transaction_data,
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()["id"]
        raise Exception(f"Failed to create transaction: {response.text}")
    
    @staticmethod
    async def update_transaction_status(
        client: httpx.AsyncClient, 
        token: str, 
        transaction_id: str, 
        status: str,
        notes: str = ""
    ) -> tuple:
        """Update transaction status and return (status_code, response_data)"""
        headers = {"Authorization": f"Bearer {token}"}
        update_data = {
            "status": status,
            "breeder_notes": notes
        }
        
        response = await client.put(
            f"{BASE_URL}/transactions/{transaction_id}/status",
            json=update_data,
            headers=headers
        )
        
        return response.status_code, response.json()
    
    @staticmethod
    async def get_transaction(client: httpx.AsyncClient, token: str, transaction_id: str) -> dict:
        """Get transaction details"""
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get(
            f"{BASE_URL}/transactions/{transaction_id}",
            headers=headers
        )
        return response.json()


@pytest.mark.asyncio
async def test_concurrent_transaction_acceptance():
    """
    TEST CASE 1: Dua pembudidaya tidak boleh menerima transaksi yang sama
    
    Expected Behavior:
    - Pembudidaya pertama yang menerima -> SUKSES
    - Pembudidaya kedua yang mencoba menerima -> GAGAL (409 Conflict)
    """
    async with httpx.AsyncClient() as client:
        print("\n" + "="*60)
        print("TEST: Concurrent Transaction Acceptance")
        print("="*60)
        
        # Step 1: Setup users
        print("\n[Step 1] Setting up test users...")
        masyarakat_token = await TestConcurrentTransactionHandling.register_or_login(client, MASYARAKAT)
        breeder_a_token = await TestConcurrentTransactionHandling.register_or_login(client, BREEDER_A)
        breeder_b_token = await TestConcurrentTransactionHandling.register_or_login(client, BREEDER_B)
        print("✓ All users registered/logged in")
        
        # Step 2: Masyarakat creates a transaction
        print("\n[Step 2] Masyarakat creating waste deposit request...")
        
        # First update location for masyarakat
        headers = {"Authorization": f"Bearer {masyarakat_token}"}
        await client.put(
            f"{BASE_URL}/users/location",
            json={"address": "Test Address", "latitude": -7.9666, "longitude": 112.6326},
            headers=headers
        )
        
        transaction_id = await TestConcurrentTransactionHandling.create_transaction(client, masyarakat_token)
        print(f"✓ Transaction created: {transaction_id}")
        
        # Step 3: Breeder A accepts the transaction
        print("\n[Step 3] Breeder A accepting the transaction...")
        status_code_a, response_a = await TestConcurrentTransactionHandling.update_transaction_status(
            client, breeder_a_token, transaction_id, "diterima", "Breeder A accepts"
        )
        print(f"  Status Code: {status_code_a}")
        print(f"  Response: {response_a}")
        
        assert status_code_a == 200, f"Breeder A should be able to accept. Got: {status_code_a}"
        assert response_a.get("status") == "diterima", "Transaction status should be 'diterima'"
        assert response_a.get("breeder_id") is not None, "Breeder ID should be set"
        print("✓ Breeder A successfully accepted the transaction")
        
        # Step 4: Breeder B tries to accept the same transaction
        print("\n[Step 4] Breeder B trying to accept the same transaction...")
        status_code_b, response_b = await TestConcurrentTransactionHandling.update_transaction_status(
            client, breeder_b_token, transaction_id, "diterima", "Breeder B tries to accept"
        )
        print(f"  Status Code: {status_code_b}")
        print(f"  Response: {response_b}")
        
        # THIS IS THE KEY ASSERTION - Breeder B should NOT be able to accept
        assert status_code_b == 409, f"Breeder B should get 409 Conflict. Got: {status_code_b}"
        print("✓ Breeder B correctly rejected with 409 Conflict")
        
        # Step 5: Verify transaction still belongs to Breeder A
        print("\n[Step 5] Verifying transaction ownership...")
        transaction = await TestConcurrentTransactionHandling.get_transaction(
            client, breeder_a_token, transaction_id
        )
        print(f"  Current breeder_id: {transaction.get('breeder_id')}")
        print(f"  Current status: {transaction.get('status')}")
        
        # Transaction should still be accepted by Breeder A
        assert transaction.get("status") == "diterima", "Status should remain 'diterima'"
        print("✓ Transaction ownership verified - belongs to Breeder A")
        
        print("\n" + "="*60)
        print("TEST PASSED: Concurrent acceptance handled correctly!")
        print("="*60)


@pytest.mark.asyncio
async def test_breeder_cannot_modify_others_transaction():
    """
    TEST CASE 2: Pembudidaya tidak boleh mengubah transaksi yang sudah dihandle pembudidaya lain
    
    Expected Behavior:
    - Setelah transaksi diterima oleh Breeder A
    - Breeder B tidak boleh menolak atau menyelesaikan transaksi tersebut
    """
    async with httpx.AsyncClient() as client:
        print("\n" + "="*60)
        print("TEST: Breeder Cannot Modify Other's Transaction")
        print("="*60)
        
        # Setup
        masyarakat_token = await TestConcurrentTransactionHandling.register_or_login(client, MASYARAKAT)
        breeder_a_token = await TestConcurrentTransactionHandling.register_or_login(client, BREEDER_A)
        breeder_b_token = await TestConcurrentTransactionHandling.register_or_login(client, BREEDER_B)
        
        # Create and accept transaction by Breeder A
        transaction_id = await TestConcurrentTransactionHandling.create_transaction(client, masyarakat_token)
        await TestConcurrentTransactionHandling.update_transaction_status(
            client, breeder_a_token, transaction_id, "diterima"
        )
        print(f"✓ Transaction {transaction_id} accepted by Breeder A")
        
        # Breeder B tries to reject
        print("\n[Test] Breeder B trying to reject...")
        status_code, response = await TestConcurrentTransactionHandling.update_transaction_status(
            client, breeder_b_token, transaction_id, "ditolak"
        )
        assert status_code == 409, f"Should get 409, got {status_code}"
        print("✓ Breeder B cannot reject - 409 Conflict")
        
        # Breeder B tries to mark as complete
        print("\n[Test] Breeder B trying to mark as complete...")
        status_code, response = await TestConcurrentTransactionHandling.update_transaction_status(
            client, breeder_b_token, transaction_id, "selesai"
        )
        assert status_code == 409, f"Should get 409, got {status_code}"
        print("✓ Breeder B cannot complete - 409 Conflict")
        
        print("\n" + "="*60)
        print("TEST PASSED: Other breeder cannot modify transaction!")
        print("="*60)


@pytest.mark.asyncio
async def test_owner_breeder_can_complete_transaction():
    """
    TEST CASE 3: Pembudidaya yang menerima transaksi BISA menyelesaikannya
    
    Expected Behavior:
    - Breeder A menerima transaksi -> SUKSES
    - Breeder A menyelesaikan transaksi -> SUKSES
    """
    async with httpx.AsyncClient() as client:
        print("\n" + "="*60)
        print("TEST: Owner Breeder Can Complete Transaction")
        print("="*60)
        
        # Setup
        masyarakat_token = await TestConcurrentTransactionHandling.register_or_login(client, MASYARAKAT)
        breeder_a_token = await TestConcurrentTransactionHandling.register_or_login(client, BREEDER_A)
        
        # Create transaction
        transaction_id = await TestConcurrentTransactionHandling.create_transaction(client, masyarakat_token)
        print(f"✓ Transaction created: {transaction_id}")
        
        # Breeder A accepts
        status_code, _ = await TestConcurrentTransactionHandling.update_transaction_status(
            client, breeder_a_token, transaction_id, "diterima"
        )
        assert status_code == 200
        print("✓ Breeder A accepted the transaction")
        
        # Breeder A completes
        status_code, response = await TestConcurrentTransactionHandling.update_transaction_status(
            client, breeder_a_token, transaction_id, "selesai", "Sampah sudah diambil"
        )
        assert status_code == 200, f"Should be 200, got {status_code}"
        assert response.get("status") == "selesai"
        print("✓ Breeder A completed the transaction")
        
        print("\n" + "="*60)
        print("TEST PASSED: Owner breeder can complete transaction!")
        print("="*60)


if __name__ == "__main__":
    print("\n" + "="*60)
    print("GoWaste API - Concurrent Transaction Tests (TDD)")
    print("="*60)
    
    # Run tests
    asyncio.run(test_concurrent_transaction_acceptance())
    asyncio.run(test_breeder_cannot_modify_others_transaction())
    asyncio.run(test_owner_breeder_can_complete_transaction())
    
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED!")
    print("="*60)
