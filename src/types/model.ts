export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'dosen' | 'mahasiswa';
  name?: string;
  photoURL?: string;
}

export interface Mahasiswa {
  id: string;
  nim: string;
  name: string;
  email: string;
  alamat: string;
  tanggalLahir: string;
  agama: string;
  angkatan: string;
  programStudi: 'Manajemen Informatika' | 'Akuntansi' | 'Teknik Informatika';
  photoURL?: string;
  totalPoin: number;
  status: 'Normal' | 'Pembinaan' | 'Terancam DO';
  createdAt: string;
  updatedAt: string;
}

export interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pelanggaran {
  id: string;
  mahasiswaId: string;
  peraturanId: string;
  tanggal: string;
  poin: number;
  buktiURLs?: string[];
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  gambarURL?: string;
  tanggal: string;
  createdAt: string;
  updatedAt: string;
}

export interface Acara {
  id: string;
  nama: string;
  deskripsi: string;
  lokasi: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  createdAt: string;
  updatedAt: string;
}

export interface Laporan {
  id: string;
  mahasiswaId: string;
  judul: string;
  isi: string;
  tanggal: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  jenis: 'Pelanggaran' | 'Banding';
  createdAt: string;
  updatedAt: string;
  mahasiswa?: {
    name: string;
    nim: string;
  };
  pelanggaranId?: string;
  alasanBanding?: string;
  statusBanding?: 'Menunggu' | 'Diterima' | 'Ditolak';
  peraturanId?: string;
}

export interface Banding {
  id: string;
  pelanggaranId: string;
  mahasiswaId: string;
  alasan: string;
  tanggal: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  createdAt: string;
  updatedAt: string;
}

export interface Pengaturan {
  id: string;
  ambangPoin: {
    pembinaan: number;
    terancamDO: number;
  };
  deskripsiKampus: string;
  kontakKampus: string;
  logoURL?: string;
} 