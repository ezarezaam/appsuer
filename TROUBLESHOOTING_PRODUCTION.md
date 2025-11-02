# 🚨 Troubleshooting Error 500 di Production

## Error yang Muncul
```
Failed to load resource: the server responded with a status of 500 ()
Error in getAllTopupRequests: Error: HTTP error! status: 500
Error loading data: Error: Failed to load requests
```

## Penyebab Utama

### 1. **Tabel `topup_requests` Belum Ada di Production**
Error 500 ini kemungkinan besar terjadi karena tabel `topup_requests` belum dibuat di database Supabase production.

### 2. **Environment Variables Tidak Tersedia**
Pastikan semua environment variables sudah di-set di Netlify Dashboard:

#### Wajib Ada:
- `SUPABASE_URL` atau `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` atau `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `VITE_ADMIN_SECRET_KEY`

#### Optional (untuk email):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Solusi Langkah-demi-Langkah

### 🔍 Step 1: Cek Environment Variables
1. Buka [Netlify Dashboard](https://app.netlify.com)
2. Pilih project Anda
3. Klik **Site settings** → **Environment variables**
4. Pastikan semua variables di atas sudah terisi

### 🗄️ Step 2: Setup Database di Supabase

#### Opsi A: Jalankan Function Setup (Recommended)
1. Buka aplikasi di production
2. Gunakan endpoint setup:
```bash
curl -X POST https://your-app.netlify.app/.netlify/functions/setup-database \
  -H "x-admin-secret: your-admin-secret-key"
```

#### Opsi B: Jalankan SQL Manual
1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project production Anda
3. Klik **SQL Editor**
4. Jalankan SQL berikut:

```sql
-- Create topup_requests table
CREATE TABLE IF NOT EXISTS topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_proof_url TEXT,
  payment_details JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT topup_requests_amount_positive CHECK (amount > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_topup_requests_user_id ON topup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_topup_requests_status ON topup_requests(status);
CREATE INDEX IF NOT EXISTS idx_topup_requests_created_at ON topup_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE topup_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert their own topup requests" ON topup_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own topup requests" ON topup_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending requests" ON topup_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Service role can manage all topup requests" ON topup_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topup_requests_updated_at 
  BEFORE UPDATE ON topup_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 🧪 Step 3: Test Koneksi
Setelah setup, test koneksi dengan:
```bash
curl -H "x-admin-secret: your-admin-secret-key" \
  "https://your-app.netlify.app/.netlify/functions/admin?action=test-connection"
```

Response yang diharapkan:
```json
{
  "success": true,
  "connection": "Connected successfully",
  "table_exists": true,
  "records_found": 0
}
```

### 🔄 Step 4: Refresh Aplikasi
1. Buka kembali aplikasi di browser
2. Login dengan admin secret key
3. Cek apakah data topup requests sudah muncul

## Debug dengan Function Logs

Untuk melihat detail error, cek Netlify Function logs:

1. Buka [Netlify Dashboard](https://app.netlify.com)
2. Pilih project Anda
3. Klik **Functions**
4. Pilih function `admin.js`
5. Klik **Logs** untuk melihat error detail

## Error Codes Reference

| Error Code | Penyebab | Solusi |
|------------|----------|---------|
| `42P01` | Tabel tidak ada | Jalankan setup database |
| `42501` | Permission denied | Cek RLS policies dan service role key |
| `PGRST116` | Column tidak ada | Cek struktur tabel |
| `PGRST301` | JWT expired | Cek Supabase service role key |

## Tips Tambahan

1. **Backup Database**: Selalu backup sebelum melakukan perubahan
2. **Test di Local**: Pastikan semua berjalan di local sebelum deploy
3. **Environment Variables**: Jangan gunakan production keys di local
4. **Logs**: Selalu cek logs untuk debugging

## Butuh Bantuan?

Jika masih mengalami masalah:
1. Cek kembali semua environment variables
2. Pastikan Supabase service role key memiliki akses penuh
3. Cek logs di Netlify Functions
4. Test koneksi ke Supabase dari local

---
*Last updated: Setup database untuk production*