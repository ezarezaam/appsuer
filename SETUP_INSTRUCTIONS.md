# 🚀 Setup Balance System - Instruksi Cepat

## ❗ PENTING: Jalankan SQL di Supabase Dulu!

Sebelum menggunakan aplikasi, Anda HARUS menjalankan SQL setup terlebih dahulu.

### Step 1: Dapatkan SQL Code

Jalankan command ini di terminal:

```bash
npm run show-sql
```

### Step 2: Copy SQL Code

Copy semua SQL code yang ditampilkan (dari `-- User Balance System` sampai `SELECT 'User balance system created successfully!'`)

### Step 3: Jalankan di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **SQL Editor** di sidebar kiri
4. Klik **New Query**
5. Paste SQL code yang sudah dicopy
6. Klik **Run** atau tekan `Ctrl+Enter`

### Step 4: Verifikasi Setup

Setelah SQL berhasil dijalankan, cek apakah tabel dan function sudah dibuat:

```sql
-- Cek tabel
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_balance', 'balance_transactions', 'topup_requests');

-- Cek function
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%balance%';
```

### Step 5: Test Balance System

1. Buka aplikasi wallet admin: http://localhost:3002
2. Login dengan kredensial admin
3. Approve salah satu topup request
4. Balance user seharusnya bertambah otomatis ✅

## 🎯 Yang Sudah Diperbaiki

- ✅ **Server Logic**: Server sekarang memanggil `update_user_balance()` saat approve
- ✅ **Database Schema**: Tabel dan function balance sudah siap
- ✅ **API Endpoints**: Endpoint untuk cek balance dan transaksi
- ✅ **Error Handling**: Comprehensive error handling
- ✅ **Security**: RLS policies untuk keamanan data

## 🔧 Troubleshooting

### Jika Balance Masih 0 Setelah Approve:

1. **Cek Console Browser**: Buka Developer Tools → Console, lihat ada error?
2. **Cek Terminal Server**: Lihat log server, ada error saat approve?
3. **Cek SQL**: Pastikan semua SQL sudah dijalankan dengan benar
4. **Cek Environment**: Pastikan `SUPABASE_SERVICE_ROLE_KEY` ada di `.env`

### Error "Function not found":

```bash
# Jalankan ulang SQL setup
npm run show-sql
# Copy dan paste lagi ke Supabase SQL Editor
```

### Error "Permission denied":

Pastikan menggunakan **Service Role Key** bukan Anon Key di environment variables.

## 📞 Support

Jika masih ada masalah, cek file `BALANCE_SYSTEM_SETUP.md` untuk dokumentasi lengkap.

---

**🎉 Setelah setup berhasil, balance akan otomatis bertambah saat admin approve topup request!**