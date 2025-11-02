# Wallet Admin - EvenOddPro

Aplikasi admin sederhana untuk approval wallet requests dari aplikasi EvenOddPro.

## Features

- 🔐 **Admin Authentication** - Login dengan password admin
- 📋 **Wallet Approval Table** - Melihat semua request wallet dari users
- ✅ **Approve/Reject** - Approve atau reject wallet requests
- 📝 **Admin Notes** - Menambahkan catatan untuk setiap request
- 🌙 **Dark/Light Mode** - Toggle tema gelap/terang
- 📱 **Responsive Design** - Tampilan yang responsif untuk semua device

## Tech Stack

- **React 18** dengan TypeScript
- **Chakra UI** untuk komponen UI
- **Supabase** untuk database
- **Vite** untuk build tool

## Setup

1. Install dependencies:
```bash
npm install
```

2. Konfigurasi environment variables di `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_SECRET_KEY=your_admin_password
```

3. Jalankan development server:
```bash
npm run dev
```

4. Buka browser di `http://localhost:3004`

## Database Schema

Aplikasi ini menggunakan tabel `wallet_requests` dengan struktur:

```sql
CREATE TABLE wallet_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('paypal', 'bank', 'crypto')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Usage

1. **Login**: Masukkan password admin untuk mengakses dashboard
2. **Review Requests**: Lihat semua wallet requests dari users
3. **Approve/Reject**: Klik tombol "Review" untuk melihat detail dan approve/reject
4. **Add Notes**: Tambahkan catatan admin untuk setiap request

## Security

- Password admin disimpan di environment variable
- Koneksi database menggunakan Supabase dengan RLS (Row Level Security)
- File `.env` tidak di-commit ke repository

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```