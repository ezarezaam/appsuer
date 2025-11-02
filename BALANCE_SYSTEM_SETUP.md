# Balance System Setup Guide

## 🚀 Masalah yang Dipecahkan

Sebelumnya, ketika admin approve topup request di aplikasi wallet admin, balance user tidak bertambah karena:

1. **Tidak ada tabel balance**: Sistem tidak memiliki tabel `user_balance` dan `balance_transactions`
2. **Tidak ada function balance**: Tidak ada function `update_user_balance` untuk mengupdate balance
3. **Server tidak memanggil function**: Server hanya mengupdate status topup tanpa mengupdate balance

## 🛠️ Solusi yang Diimplementasikan

### 1. Database Schema Baru

#### Tabel yang Dibuat:
- **`user_balance`**: Menyimpan balance aktual setiap user
- **`balance_transactions`**: Mencatat semua transaksi balance (topup, deduct, refund)
- **`topup_requests`**: Mengelola permintaan top-up (sudah ada, diperbaiki)

#### Function yang Dibuat:
- **`update_user_balance()`**: Function utama untuk mengupdate balance
- **`get_user_balance()`**: Function untuk mendapatkan balance user
- **`get_user_transactions()`**: Function untuk mendapatkan history transaksi

### 2. Server API yang Diperbaiki

Server sekarang akan:
1. Fetch detail topup request
2. Jika status diubah ke 'approved', panggil `update_user_balance()`
3. Update balance user secara otomatis
4. Catat transaksi di `balance_transactions`
5. Update status topup request

## 📋 Langkah Setup

### Step 1: Jalankan SQL di Supabase

1. Buka terminal dan jalankan:
   ```bash
   npm run show-sql
   ```

2. Copy semua SQL yang ditampilkan

3. Buka Supabase Dashboard → SQL Editor

4. Paste dan jalankan SQL tersebut

5. Verifikasi tabel dan function berhasil dibuat

### Step 2: Restart Server

1. Stop server yang sedang berjalan (Ctrl+C)

2. Restart server:
   ```bash
   npm run dev
   ```

### Step 3: Test Balance System

1. Buka aplikasi wallet admin
2. Approve salah satu topup request
3. Cek apakah balance user bertambah

## 🔧 API Endpoints Baru

### 1. Get User Balance
```
GET /api/balance/:userId
```

**Response:**
```json
{
  "success": true,
  "balance": 100.00,
  "balanceRecord": {
    "id": "uuid",
    "user_id": "uuid",
    "balance": 100.00,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
}
```

### 2. Get User Transactions
```
GET /api/transactions/:userId?limit=50
```

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "transaction_type": "topup",
      "amount": 100.00,
      "balance_before": 0.00,
      "balance_after": 100.00,
      "description": "Top-up approved by admin",
      "reference_id": "topup_request_id",
      "created_at": "timestamp"
    }
  ]
}
```

## 🔄 Flow Balance System

### 1. Proses Top-up (Manual Approval)

```
User submit topup request
    ↓
Request masuk ke tabel topup_requests (status: pending)
    ↓
Admin review di aplikasi wallet admin
    ↓
Admin approve request
    ↓
Server memanggil update_user_balance()
    ↓
Function mengupdate user_balance dan mencatat di balance_transactions
    ↓
Status topup_requests diupdate ke 'approved'
    ↓
Balance user bertambah ✅
```

### 2. Logic Function update_user_balance()

```sql
-- 1. Validasi input (transaction_type, amount)
-- 2. Ambil balance saat ini dari user_balance
-- 3. Jika user belum ada balance, buat record baru dengan balance 0.00
-- 4. Hitung balance baru:
--    - TOPUP/REFUND: balance_baru = balance_lama + amount
--    - DEDUCT: balance_baru = balance_lama - amount
-- 5. Validasi insufficient balance untuk transaksi deduct
-- 6. Update balance di tabel user_balance
-- 7. Catat transaksi di balance_transactions dengan balance_before dan balance_after
-- 8. Return hasil operasi (success/error)
```

## 🛡️ Security Features

1. **Row Level Security (RLS)**: Semua tabel menggunakan RLS
2. **Function Security**: Function menggunakan `SECURITY DEFINER`
3. **Input Validation**: Validasi semua input parameter
4. **Transaction Safety**: Menggunakan database transaction
5. **Error Handling**: Comprehensive error handling

## 🧪 Testing

### Manual Testing:

1. **Test Topup Approval:**
   - Submit topup request dari user app
   - Approve dari admin app
   - Cek balance bertambah

2. **Test API Endpoints:**
   ```bash
   # Get balance
   curl -H "Authorization: Bearer admin_token" \
        http://localhost:3001/api/balance/USER_ID

   # Get transactions
   curl -H "Authorization: Bearer admin_token" \
        http://localhost:3001/api/transactions/USER_ID
   ```

### Database Testing:

```sql
-- Test function langsung di SQL Editor
SELECT update_user_balance(
    'user-uuid'::UUID,
    100.00,
    'topup',
    'Test topup',
    NULL,
    NULL
);

-- Cek balance
SELECT get_user_balance('user-uuid'::UUID);

-- Cek transactions
SELECT * FROM get_user_transactions('user-uuid'::UUID, 10);
```

## 📊 Monitoring

### Cek Status System:

1. **Cek Tabel:**
   ```sql
   SELECT COUNT(*) FROM user_balance;
   SELECT COUNT(*) FROM balance_transactions;
   SELECT COUNT(*) FROM topup_requests;
   ```

2. **Cek Function:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname LIKE '%balance%';
   ```

3. **Cek RLS:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' AND tablename LIKE '%balance%';
   ```

## 🚨 Troubleshooting

### Masalah Umum:

1. **Function tidak ditemukan:**
   - Pastikan SQL sudah dijalankan dengan benar
   - Cek di Supabase Dashboard → Database → Functions

2. **Permission denied:**
   - Pastikan menggunakan service_role key
   - Cek RLS policies

3. **Balance tidak update:**
   - Cek log server untuk error
   - Pastikan topup_request memiliki user_id dan amount yang valid

4. **Server error 500:**
   - Cek environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
   - Cek koneksi ke Supabase

## 📝 File yang Dimodifikasi/Dibuat

### File Baru:
- `database/user_balance.sql` - Schema dan function balance system
- `scripts/setup-balance-system.js` - Script setup otomatis
- `scripts/run-sql.js` - Script untuk menampilkan SQL
- `BALANCE_SYSTEM_SETUP.md` - Dokumentasi ini

### File yang Dimodifikasi:
- `server.js` - Ditambahkan logic untuk update balance saat approve
- `package.json` - Ditambahkan script setup-balance dan show-sql
- `.env` - Ditambahkan environment variables untuk backend

## ✅ Verifikasi Setup Berhasil

Setelah setup, pastikan:

1. ✅ Tabel `user_balance`, `balance_transactions`, `topup_requests` ada
2. ✅ Function `update_user_balance`, `get_user_balance`, `get_user_transactions` ada
3. ✅ Server bisa approve topup dan balance bertambah
4. ✅ API endpoints `/api/balance/:userId` dan `/api/transactions/:userId` berfungsi
5. ✅ RLS policies aktif dan berfungsi

## 🎉 Hasil Akhir

Sekarang ketika admin approve topup request:
- ✅ Balance user otomatis bertambah
- ✅ Transaksi tercatat di history
- ✅ System aman dengan RLS
- ✅ API tersedia untuk monitoring balance
- ✅ Error handling yang baik