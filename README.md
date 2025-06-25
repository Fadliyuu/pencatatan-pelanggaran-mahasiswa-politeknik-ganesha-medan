# Sistem Pencatatan Pelanggaran Kedisiplinan Mahasiswa Politeknik Ganesha Medan

Sistem informasi berbasis web untuk pencatatan dan pengelolaan pelanggaran kedisiplinan mahasiswa di Politeknik Ganesha Medan. Aplikasi ini memungkinkan admin dan dosen untuk mencatat pelanggaran, serta mahasiswa dapat memantau status kedisiplinan mereka.

## 🚀 Fitur Utama

### 👥 Multi-Role User
- **Admin**: Pengelolaan penuh sistem dan data
- **Dosen**: Input pelanggaran dan monitoring mahasiswa
- **Mahasiswa**: Monitoring status dan pengajuan banding

### 📊 Dashboard Informatif
- Statistik pelanggaran real-time
- Grafik tren pelanggaran
- Status kedisiplinan mahasiswa
- Notifikasi dan pengumuman terkini

### 📝 Manajemen Data
- Pencatatan pelanggaran dengan bukti
- Sistem poin otomatis
- Pengajuan dan proses banding
- Export/import data (CSV)

### 🔔 Notifikasi
- Notifikasi real-time
- Email notifikasi
- Pengumuman kampus
- Reminder status kedisiplinan

## 🛠️ Teknologi

### Frontend
- **Next.js 14** - Framework React modern dengan App Router
- **React 18** - Library UI dengan fitur terbaru
- **TypeScript** - Type safety dan developer experience
- **TailwindCSS** - Styling modern dan responsif
- **Zustand** - State management ringan dan efisien

### Backend & Database
- **Firebase Auth** - Sistem autentikasi aman
- **Cloud Firestore** - Database NoSQL scalable
- **Firebase Storage** - Penyimpanan file dan media
- **Firebase Cloud Functions** - Backend serverless

### Package Utama
- **React Hook Form** + **Zod** - Form handling dan validasi
- **Lucide Icons** - Icon modern dan konsisten
- **React Hot Toast** - Notifikasi elegan
- **TanStack Table** - Tabel dengan fitur lengkap

## 🚀 Cara Menjalankan

### Prerequisites
- Node.js versi 16.x atau lebih baru
- NPM atau Yarn
- Akun Firebase
- Git

### Langkah Instalasi

1. Clone repository
```bash
git clone https://github.com/username/repo-name.git
cd repo-name
```

2. Install dependencies
```bash
npm install
# atau
yarn install
```

3. Setup environment variables
```bash
cp .env.example .env.local
# Edit .env.local dengan kredensial Firebase Anda
```

4. Jalankan development server
```bash
npm run dev
# atau
yarn dev
```

5. Buka aplikasi di browser
```
http://localhost:3000
```

## 📁 Struktur Database

### Collections

#### users
```typescript
{
  uid: string;          // Firebase Auth UID
  email: string;        // Email pengguna
  role: string;         // admin | dosen | mahasiswa
  name: string;         // Nama lengkap
  photoURL?: string;    // URL foto profil
  createdAt: timestamp; // Waktu pembuatan
}
```

#### mahasiswa
```typescript
{
  id: string;           // ID unik
  nim: string;          // Nomor Induk Mahasiswa
  name: string;         // Nama lengkap
  programStudi: string; // Program studi
  angkatan: number;     // Tahun angkatan
  totalPoin: number;    // Akumulasi poin pelanggaran
  status: string;       // Normal | Pembinaan | Terancam DO
}
```

#### pelanggaran
```typescript
{
  id: string;           // ID unik
  mahasiswaId: string;  // Referensi ke mahasiswa
  peraturanId: string;  // Referensi ke peraturan
  tanggal: timestamp;   // Waktu pelanggaran
  poin: number;         // Poin pelanggaran
  buktiURL?: string[];  // URL bukti pelanggaran
  keterangan: string;   // Deskripsi pelanggaran
  status: string;       // Active | Banding | Selesai
}
```

## 🔐 Environment Variables

```env
# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Sistem Pencatatan Pelanggaran"
```

## 📱 Responsive Design

Aplikasi dioptimalkan untuk:
- 📱 Mobile (320px+)
- 💻 Tablet (768px+)
- 🖥️ Desktop (1024px+)

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📝 Lisensi

Distributed under the MIT License. See `LICENSE` for more information.

## 📧 Kontak

Politeknik Ganesha Medan - [@poligamed](https://instagram.com/poligamed)

Project Link: [https://github.com/username/repo-name](https://github.com/username/repo-name)