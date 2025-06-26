'use client';

import React, { useEffect, useState } from 'react';
import { UserPlus, Search, Filter, Download, Upload, Edit, Trash, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/UI/Table';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import Modal from '@/components/UI/Modal';
import { getMahasiswa, createMahasiswa, updateMahasiswa, deleteMahasiswa, uploadImageToCloudinary } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import Image from 'next/image';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { addDoc, collection, updateDoc, getDocs, query, where, deleteDoc, writeBatch, setDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { addNotifikasi, getOrCreateAdminData } from '@/lib/firebase';

// Schema validasi untuk form mahasiswa
const mahasiswaSchema = z.object({
  nim: z.string().optional(),
  name: z.string().min(1, 'Nama harus diisi'),
  email: z.string().email('Email tidak valid').optional(),
  password: z.string().min(1, 'Password minimal 1 karakter').optional(),
  alamat: z.string().optional(),
  tanggalLahir: z.string().min(1, 'Tanggal lahir harus diisi'),
  agama: z.string().optional(),
  angkatan: z.string().optional(),
  programStudi: z.enum(['Manajemen Informatika', 'Akuntansi', 'Teknik Informatika'], {
    required_error: 'Program studi harus diisi',
  }).optional(),
  jalur: z.enum(['Umum', 'KIP', 'Beasiswa']).optional(),
});

type MahasiswaFormData = z.infer<typeof mahasiswaSchema>;

interface ImportRow {
  nim?: string;
  name?: string;
  email?: string;
  password?: string;
  alamat?: string;
  tanggalLahir?: string;
  agama?: string;
  angkatan?: string;
  programStudi?: string;
  jalur?: string;
  photoURL?: string;
  status?: string;
  totalPoin?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface MahasiswaSettings {
  notifikasiRealtime: boolean;
  notifikasiEmail: boolean;
  notifikasiWeb: boolean;
  notifikasiMobile: boolean;
  darkMode: boolean;
  bahasa: string;
  privasi: {
    tampilkanProfil: boolean;
    tampilkanRiwayat: boolean;
  };
}

function MahasiswaPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mahasiswa, setMahasiswa] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<string[]>([]);
  const [selectedMahasiswaData, setSelectedMahasiswaData] = useState<any>(null);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    programStudi: '',
    angkatan: '',
    status: '',
    agama: '',
    totalPoin: '',
    jalur: ''
  });
  const [filters, setFilters] = useState({
    nim: '',
    name: '',
    programStudi: '',
    angkatan: '',
    poin: '',
    status: '',
    agama: '',
    jalur: ''
  });
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pengaturan, setPengaturan] = useState<any>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MahasiswaFormData>({
    resolver: zodResolver(mahasiswaSchema),
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;

      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }

      try {
        // Periksa role dari Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'admin') {
          console.log('User is not admin, redirecting to login');
          router.push('/login');
          return;
        }

        console.log('User is admin, fetching mahasiswa data');
        await fetchMahasiswa();
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [user, loading, router]);

  useEffect(() => {
    const fetchPengaturan = async () => {
      try {
        setIsLoading(true);
        const pengaturanRef = doc(db, 'pengaturan', 'settings');
        const pengaturanDoc = await getDoc(pengaturanRef);
        
        if (pengaturanDoc.exists()) {
          const data = pengaturanDoc.data();
          console.log('Pengaturan ditemukan:', data);
          setPengaturan(data);
        } else {
          // Set default pengaturan jika belum ada
          const defaultPengaturan = {
            ambangPoin: {
              pembinaan: 20,
              terancamDO: 50
            }
          };
          console.log('Membuat pengaturan default:', defaultPengaturan);
          await setDoc(pengaturanRef, defaultPengaturan);
          setPengaturan(defaultPengaturan);
        }
      } catch (error) {
        console.error('Error fetching pengaturan:', error);
        toast.error('Gagal mengambil data pengaturan');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPengaturan();
  }, []);

  const fetchMahasiswa = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Memulai pengambilan data mahasiswa...');
      
      const mahasiswaRef = collection(db, 'mahasiswa');
      const snapshot = await getDocs(mahasiswaRef);
      
      if (snapshot.empty) {
        console.log('Tidak ada data mahasiswa yang ditemukan');
        setMahasiswa([]);
        return;
      }
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`Berhasil mengambil ${data.length} data mahasiswa:`, data);
      setMahasiswa(data);
    } catch (error) {
      console.error('Error fetching mahasiswa:', error);
      setError('Gagal mengambil data mahasiswa. Silakan coba lagi.');
      toast.error('Gagal mengambil data mahasiswa');
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk menentukan status berdasarkan poin
  const getStatusFromPoin = (poin: number) => {
    if (!pengaturan) {
      console.log('Pengaturan belum tersedia');
      return 'Normal';
    }
    
    console.log('Menghitung status untuk poin:', poin);
    console.log('Ambang batas:', pengaturan.ambangPoin);
    
    if (poin >= pengaturan.ambangPoin.terancamDO) {
      return 'Terancam DO';
    } else if (poin >= pengaturan.ambangPoin.pembinaan) {
      return 'Pembinaan';
    }
    return 'Normal';
  };

  // Update status mahasiswa saat pengaturan berubah
  useEffect(() => {
    if (pengaturan && mahasiswa.length > 0) {
      const updateAllStatus = async () => {
        try {
          console.log('Memulai update status mahasiswa');
          console.log('Jumlah mahasiswa:', mahasiswa.length);
          console.log('Pengaturan saat ini:', pengaturan);
          
          const batch = writeBatch(db);
          let hasChanges = false;
          
          mahasiswa.forEach(m => {
            const currentStatus = m.status || 'Normal';
            const newStatus = getStatusFromPoin(m.totalPoin || 0);
            
            console.log(`Mahasiswa ${m.name}:`, {
              poin: m.totalPoin,
              statusLama: currentStatus,
              statusBaru: newStatus
            });
            
            if (newStatus !== currentStatus) {
              const mahasiswaRef = doc(db, 'mahasiswa', m.id);
              batch.update(mahasiswaRef, { status: newStatus });
              hasChanges = true;
            }
          });
          
          if (hasChanges) {
            console.log('Menyimpan perubahan status...');
            await batch.commit();
            console.log('Perubahan status berhasil disimpan');
            toast.success('Status mahasiswa berhasil diperbarui');
            fetchMahasiswa();
          } else {
            console.log('Tidak ada perubahan status yang diperlukan');
          }
        } catch (error) {
          console.error('Error updating all status:', error);
          toast.error('Gagal memperbarui status mahasiswa');
        }
      };
      
      updateAllStatus();
    }
  }, [pengaturan, mahasiswa]);

  // Handle edit mahasiswa
  const handleEdit = (mahasiswa: any) => {
    setSelectedMahasiswa([mahasiswa.id]);
    setSelectedMahasiswaData(mahasiswa);
    reset(mahasiswa);
    setCurrentPhotoURL(mahasiswa.photoURL || '');
    if (mahasiswa.photoURL) {
      setPhotoPreview(mahasiswa.photoURL);
    }
    setShowEditModal(true);
  };

  // Handle submit form
  const onSubmit = async (data: MahasiswaFormData) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setIsLoading(true);
      
      // Upload foto jika ada
      let photoURL = currentPhotoURL;
      if (photoFile) {
        photoURL = await uploadImageToCloudinary(photoFile);
      }

      // Siapkan data untuk Firebase Auth
      const loginId = data.nim?.toLowerCase().replace(/\s+/g, '') || data.name.toLowerCase().replace(/\s+/g, '');
      const password = data.password || 'admin123';
      const email = `${loginId}@poligamed.ac.id`.toLowerCase().replace(/\s+/g, '');

      if (showAddModal) {
        try {
          // Buat akun mahasiswa melalui API endpoint
          const response = await fetch('/api/admin/create-mahasiswa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mahasiswa: [{
                nim: data.nim?.trim(),
                name: data.name.trim(),
                email: email.trim(),
                password,
                alamat: data.alamat?.trim() || '',
                tanggalLahir: data.tanggalLahir?.trim() || '',
                agama: data.agama?.trim() || '',
                angkatan: data.angkatan?.trim() || '',
                programStudi: data.programStudi || 'Manajemen Informatika',
                jalur: data.jalur || 'Umum',
                photoURL: photoURL || '',
                status: 'Normal',
                totalPoin: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                settings: {
                  notifikasiRealtime: true,
                  notifikasiEmail: true,
                  notifikasiWeb: true,
                  notifikasiMobile: true,
                  darkMode: false,
                  bahasa: 'id',
                  privasi: {
                    tampilkanProfil: true,
                    tampilkanRiwayat: true
                  }
                }
              }]
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal membuat akun mahasiswa');
          }

          const responseData = await response.json();
          console.log('Response from create-mahasiswa:', responseData);

          // Pastikan uid ada sebelum menambahkan ke batch
          if (!responseData.results?.[0]?.uid) {
            console.error('Response tidak mengandung UID:', responseData);
            throw new Error('UID tidak ditemukan dalam response. Response: ' + JSON.stringify(responseData));
          }

          // Ambil UID dari response
          const uid = responseData.results[0].uid;
          console.log('UID yang akan digunakan:', uid);

          // Tambahkan data ke Firestore
          const mahasiswaRef = collection(db, 'mahasiswa');
          await addDoc(mahasiswaRef, {
            nim: data.nim?.trim(),
            name: data.name.trim(),
            email: email.trim(),
            alamat: data.alamat?.trim() || '',
            tanggalLahir: data.tanggalLahir?.trim() || '',
            agama: data.agama?.trim() || '',
            angkatan: data.angkatan?.trim() || '',
            programStudi: data.programStudi || 'Manajemen Informatika',
            jalur: data.jalur || 'Umum',
            photoURL: photoURL || '',
            status: 'Normal',
            totalPoin: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            uid: uid,
            settings: {
              notifikasiRealtime: true,
              notifikasiEmail: true,
              notifikasiWeb: true,
              notifikasiMobile: true,
              darkMode: false,
              bahasa: 'id',
              privasi: {
                tampilkanProfil: true,
                tampilkanRiwayat: true
              }
            }
          });

          // Notifikasi ke admin (jika ada admin lain, bisa di-loop semua admin)
          if (user?.uid) {
            await addNotifikasi({
              userId: user.uid,
              title: 'Tambah Mahasiswa',
              message: `Anda menambahkan mahasiswa baru: ${data.name} (NIM ${data.nim})`,
              type: 'akun'
            });
          }
          // Notifikasi ke mahasiswa
          await addNotifikasi({
            userId: uid,
            title: 'Akun Mahasiswa Dibuat',
            message: `Akun Anda telah dibuat oleh admin. Selamat datang, ${data.name} (NIM ${data.nim})!`,
            type: 'akun'
          });

          toast.success('Mahasiswa baru berhasil ditambahkan');
          setShowAddModal(false);
        } catch (error: any) {
          console.error('Error creating user:', error);
          if (error.message.includes('email-already-in-use')) {
            toast.error('Email sudah terdaftar. Gunakan NIM atau nama yang berbeda.');
          } else if (error.message.includes('invalid-email')) {
            toast.error('Format email tidak valid. Pastikan NIM atau nama tidak mengandung karakter khusus.');
          } else {
            toast.error(`Gagal membuat akun: ${error.message}`);
          }
          throw error;
        }
      } else {
        // Update data mahasiswa
        if (!selectedMahasiswaData?.id) {
          throw new Error('ID mahasiswa tidak ditemukan');
        }
        const mahasiswaRef = doc(db, 'mahasiswa', selectedMahasiswaData.id);
        await updateDoc(mahasiswaRef, {
          nim: data.nim?.trim(),
          name: data.name.trim(),
          email: email.trim(),
          alamat: data.alamat?.trim() || '',
          tanggalLahir: data.tanggalLahir?.trim() || '',
          agama: data.agama?.trim() || '',
          angkatan: data.angkatan?.trim() || '',
          programStudi: data.programStudi || 'Manajemen Informatika',
          jalur: data.jalur || 'Umum',
          photoURL: photoURL || '',
          updatedAt: new Date().toISOString()
        });
        // Notifikasi ke admin
        if (user?.uid) {
          await addNotifikasi({
            userId: user.uid,
            title: 'Edit Mahasiswa',
            message: `Anda mengedit data mahasiswa: ${data.name} (NIM ${data.nim})`,
            type: 'akun'
          });
        }
        // Notifikasi ke mahasiswa
        if (selectedMahasiswaData?.uid) {
          await addNotifikasi({
            userId: selectedMahasiswaData.uid,
            title: 'Data Mahasiswa Diperbarui',
            message: `Data Anda telah diperbarui oleh admin.`,
            type: 'akun'
          });
        }
        toast.success('Data mahasiswa berhasil diperbarui');
        setShowEditModal(false);
      }

      reset();
      setPhotoPreview(null);
      setPhotoFile(null);
      setCurrentPhotoURL('');
      fetchMahasiswa();
    } catch (error: any) {
      console.error('Error saving mahasiswa:', error);
      const errorMessage = error.message || 'Terjadi kesalahan';
      toast.error(showAddModal ? `Gagal menambahkan data mahasiswa: ${errorMessage}` : `Gagal memperbarui data mahasiswa: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  // Handle delete mahasiswa
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus mahasiswa ini? Semua data terkait (pelanggaran, riwayat, dll) akan ikut terhapus.')) {
      try {
        setIsLoading(true);
        
        // 1. Dapatkan data mahasiswa terlebih dahulu
        const mahasiswaRef = doc(db, 'mahasiswa', id);
        const mahasiswaDoc = await getDoc(mahasiswaRef);
        
        if (!mahasiswaDoc.exists()) {
          throw new Error('Data mahasiswa tidak ditemukan');
        }
        
        const mahasiswaData = mahasiswaDoc.data();
        
        // 2. Hapus data pelanggaran terkait
        const pelanggaranQuery = query(
          collection(db, 'pelanggaran'),
          where('mahasiswaId', '==', id)
        );
        const pelanggaranDocs = await getDocs(pelanggaranQuery);
        
        // Hapus setiap dokumen pelanggaran
        const deletePelanggaranPromises = pelanggaranDocs.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        // 3. Hapus data riwayat terkait
        const riwayatQuery = query(
          collection(db, 'riwayat'),
          where('mahasiswaId', '==', id)
        );
        const riwayatDocs = await getDocs(riwayatQuery);
        
        // Hapus setiap dokumen riwayat
        const deleteRiwayatPromises = riwayatDocs.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        // 4. Hapus data user terkait
        const userQuery = query(
          collection(db, 'users'),
          where('email', '==', mahasiswaData.email)
        );
        const userDocs = await getDocs(userQuery);
        
        // Hapus setiap dokumen user
        const deleteUserPromises = userDocs.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        
        // 5. Hapus data mahasiswa
        const deleteMahasiswaPromise = deleteDoc(mahasiswaRef);
        
        // 6. Hapus akun Firebase Auth
        if (mahasiswaData.uid) {
          try {
            console.log('Mencoba menghapus akun auth untuk UID:', mahasiswaData.uid);
            const response = await fetch('/api/admin/delete-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ uid: mahasiswaData.uid }),
            });

            const responseData = await response.json();
            console.log('Response dari delete-user:', responseData);

            if (!response.ok) {
              console.error('Gagal menghapus akun auth:', responseData);
              throw new Error(responseData.error || 'Gagal menghapus akun');
            }
          } catch (error) {
            console.error('Error deleting auth account:', error);
            // Lanjutkan proses meskipun ada error pada auth
            // karena data di Firestore sudah dihapus
          }
        }
        
        // Jalankan semua proses penghapusan secara paralel
        await Promise.all([
          ...deletePelanggaranPromises,
          ...deleteRiwayatPromises,
          ...deleteUserPromises,
          deleteMahasiswaPromise
        ]);
        
        // Notifikasi ke admin
        if (user?.uid) {
          await addNotifikasi({
            userId: user.uid,
            title: 'Hapus Mahasiswa',
            message: `Anda menghapus mahasiswa: ${mahasiswaData.name} (NIM ${mahasiswaData.nim})`,
            type: 'akun'
          });
        }
        // Notifikasi ke mahasiswa
        if (mahasiswaData?.uid) {
          await addNotifikasi({
            userId: mahasiswaData.uid,
            title: 'Akun Dihapus',
            message: `Akun Anda telah dihapus oleh admin.`,
            type: 'akun'
          });
        }
        toast.success('Mahasiswa dan semua data terkait berhasil dihapus');
        fetchMahasiswa();
      } catch (error: any) {
        console.error('Error deleting mahasiswa:', error);
        const errorMessage = error.message || 'Terjadi kesalahan';
        toast.error(`Gagal menghapus mahasiswa: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle view detail mahasiswa
  const handleView = (id: string) => {
    console.log('Mengarahkan ke detail mahasiswa dengan ID:', id);
    router.push(`/admin/mahasiswa/${id}`);
  };

  // Handle export data
  const handleExport = () => {
    try {
      // Log data sebelum diekspor untuk debugging
      console.log('Data mahasiswa sebelum diekspor:', mahasiswa);

      const data = mahasiswa.map(m => {
        // Log setiap item untuk debugging
        console.log('Item mahasiswa:', m);
        
        return {
          NIM: m.nim || '',
          Nama: m.name || '',
          Email: m.email || '',
          Password: m.password || 'admin123',
          'Program Studi': m.programStudi || '',
          Angkatan: m.angkatan || '',
          'Total Poin': m.totalPoin || 0,
          Status: m.status || 'Normal',
          Alamat: m.alamat || '',
          'Tanggal Lahir': m.tanggalLahir || '',
          Agama: m.agama || '',
          Jalur: m.jalur || 'Umum',
          'Photo URL': m.photoURL || '',
          'Created At': m.createdAt || new Date().toISOString(),
          'Updated At': m.updatedAt || new Date().toISOString(),
          UID: m.uid || ''
        };
      });

      // Log data yang akan diekspor
      console.log('Data yang akan diekspor:', data);

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Atur lebar kolom
      const wscols = [
        {wch: 10}, // NIM
        {wch: 20}, // Nama
        {wch: 25}, // Email
        {wch: 15}, // Password
        {wch: 20}, // Program Studi
        {wch: 10}, // Angkatan
        {wch: 10}, // Total Poin
        {wch: 10}, // Status
        {wch: 30}, // Alamat
        {wch: 15}, // Tanggal Lahir
        {wch: 15}, // Agama
        {wch: 10}, // Jalur
        {wch: 50}, // Photo URL
        {wch: 20}, // Created At
        {wch: 20}, // Updated At
        {wch: 30}  // UID
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Mahasiswa');
      XLSX.writeFile(wb, 'data_mahasiswa.xlsx');
      toast.success('Data berhasil diekspor');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Gagal mengekspor data');
    }
  };

  // Handle import data
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        console.log('Memulai proses import data...');
        
        // Dapatkan range data
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        console.log('Data range:', range);
        
        // Baca header
        const headers: string[] = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
          headers.push(cell ? cell.v : '');
        }
        console.log('Headers:', headers);
        
        // Map header ke field yang diinginkan
        const headerMap: { [key: string]: string } = {
          'NIM': 'nim',
          'Nama': 'name',
          'Email': 'email',
          'Password': 'password',
          'Program Studi': 'programStudi',
          'Angkatan': 'angkatan',
          'Total Poin': 'totalPoin',
          'Status': 'status',
          'Alamat': 'alamat',
          'Tanggal Lahir': 'tanggalLahir',
          'Agama': 'agama',
          'Jalur': 'jalur',
          'Photo URL': 'photoURL',
          'Created At': 'createdAt',
          'Updated At': 'updatedAt'
        };
        
        // Konversi data Excel ke JSON
        const jsonData = XLSX.utils.sheet_to_json<ImportRow>(worksheet, {
          raw: false,
          defval: '',
          range: 1,
          header: headers.map(h => headerMap[h] || h.toLowerCase())
        });

        console.log('Data yang akan diimpor:', jsonData);

        if (!jsonData || jsonData.length === 0) {
          throw new Error('Tidak ada data yang valid untuk diimpor');
        }

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Proses import dalam batch
        const batch = writeBatch(db);
        const mahasiswaRef = collection(db, 'mahasiswa');

        for (const row of jsonData) {
          try {
            console.log('Memproses baris:', row);

            // Validasi data wajib
            if (!row.nim || row.nim.trim() === '') {
              throw new Error('NIM harus diisi');
            }

            if (!row.name || row.name.trim() === '') {
              throw new Error(`Nama harus diisi untuk NIM ${row.nim}`);
            }

            // Validasi dan normalisasi program studi
            const programStudi = row.programStudi?.trim();
            if (!programStudi) {
              throw new Error(`Program studi harus diisi untuk NIM ${row.nim}`);
            }

            let normalizedProgramStudi: 'Manajemen Informatika' | 'Akuntansi' | 'Teknik Informatika';
            switch (programStudi.toLowerCase()) {
              case 'manajemen informatika':
              case 'mi':
                normalizedProgramStudi = 'Manajemen Informatika';
                break;
              case 'akuntansi':
              case 'ak':
                normalizedProgramStudi = 'Akuntansi';
                break;
              case 'teknik informatika':
              case 'ti':
                normalizedProgramStudi = 'Teknik Informatika';
                break;
              default:
                throw new Error(`Program studi tidak valid: "${programStudi}" untuk NIM ${row.nim}`);
            }

            // Validasi dan normalisasi jalur
            const jalur = row.jalur?.trim();
            if (!jalur) {
              throw new Error(`Jalur harus diisi untuk NIM ${row.nim}`);
            }

            let normalizedJalur: 'Umum' | 'KIP' | 'Beasiswa';
            switch (jalur.toLowerCase()) {
              case 'umum':
                normalizedJalur = 'Umum';
                break;
              case 'kip':
                normalizedJalur = 'KIP';
                break;
              case 'beasiswa':
                normalizedJalur = 'Beasiswa';
                break;
              default:
                throw new Error(`Jalur tidak valid: "${jalur}" untuk NIM ${row.nim}`);
            }

            // Generate email dan password
            const loginId = row.nim.toLowerCase().replace(/\s+/g, '');
            const email = row.email || `${loginId}@poligamed.ac.id`.toLowerCase().replace(/\s+/g, '');
            const password = row.password || 'admin123';

            const defaultSettings: MahasiswaSettings = {
              notifikasiRealtime: true,
              notifikasiEmail: true,
              notifikasiWeb: true,
              notifikasiMobile: true,
              darkMode: false,
              bahasa: 'id',
              privasi: {
                tampilkanProfil: true,
                tampilkanRiwayat: true
              }
            };

            // Cek apakah email sudah terdaftar
            const emailQuery = query(
              collection(db, 'mahasiswa'),
              where('email', '==', email)
            );
            const emailSnapshot = await getDocs(emailQuery);
            
            if (!emailSnapshot.empty) {
              throw new Error(`Email ${email} sudah terdaftar. Gunakan NIM atau nama yang berbeda.`);
            }

            // Buat akun melalui API dengan retry
            let response;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries) {
              try {
                response = await fetch('/api/admin/create-mahasiswa', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    mahasiswa: [{
                      nim: row.nim.trim(),
                      name: row.name.trim(),
                      email: email.trim(),
                      password,
                      alamat: row.alamat?.trim() || '',
                      tanggalLahir: row.tanggalLahir?.trim() || '',
                      agama: row.agama?.trim() || '',
                      angkatan: row.angkatan?.trim() || '',
                      programStudi: normalizedProgramStudi,
                      jalur: normalizedJalur,
                      photoURL: row.photoURL?.trim() || '',
                      status: row.status?.trim() || 'Normal',
                      totalPoin: parseInt(row.totalPoin?.toString() || '0'),
                      createdAt: row.createdAt || new Date().toISOString(),
                      updatedAt: row.updatedAt || new Date().toISOString(),
                      settings: defaultSettings
                    }]
                  }),
                });

                const responseData = await response.json();
                console.log('Response from create-mahasiswa:', responseData);

                if (!response.ok) {
                  if (responseData.error?.includes('email-already-in-use')) {
                    throw new Error(`Email ${email} sudah terdaftar. Gunakan NIM atau nama yang berbeda.`);
                  }

                  if (responseData.error?.includes('network-request-failed')) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                      console.log(`Retry ${retryCount} untuk NIM ${row.nim}...`);
                      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                      continue;
                    }
                  }

                  throw new Error(responseData.error || 'Gagal membuat akun mahasiswa');
                }

                // Pastikan uid ada dalam response
                if (!responseData.results?.[0]?.uid) {
                  console.error('Response tidak mengandung UID:', responseData);
                  throw new Error('UID tidak ditemukan dalam response. Response: ' + JSON.stringify(responseData));
                }

                // Jika berhasil, keluar dari loop
                break;
              } catch (error: any) {
                console.error('Error in retry loop:', error);
                if (error.message?.includes('email-already-in-use')) {
                  throw error;
                }
                if (retryCount < maxRetries - 1) {
                  retryCount++;
                  console.log(`Retry ${retryCount} untuk NIM ${row.nim}...`);
                  await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                  continue;
                }
                throw error;
              }
            }

            if (!response?.ok) {
              throw new Error('Gagal membuat akun setelah beberapa percobaan');
            }

            successCount++;
          } catch (error: any) {
            console.error('Error importing row:', error);
            errorCount++;
            errors.push(`Error pada NIM ${row.nim}: ${error.message}`);
          }
        }

        // Commit batch
        await batch.commit();
        console.log('Batch commit berhasil');

        // Reset input file
        if (e.target instanceof HTMLInputElement) {
          e.target.value = '';
        }

        // Tampilkan hasil
        if (successCount > 0) {
          toast.success(`Berhasil mengimpor ${successCount} data mahasiswa`);
        }
        if (errorCount > 0) {
          toast.error(`${errorCount} data gagal diimpor. Silakan periksa log untuk detail.`);
          console.error('Import errors:', errors);
        }

        // Refresh data
        await fetchMahasiswa();
      } catch (error: any) {
        console.error('Error importing data:', error);
        toast.error(`Gagal mengimpor data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter mahasiswa berdasarkan kriteria
  const filteredMahasiswa = mahasiswa.filter(m => {
    return (
      (filters.nim ? m.nim.toLowerCase().includes(filters.nim.toLowerCase()) : true) &&
      (filters.name ? m.name.toLowerCase().includes(filters.name.toLowerCase()) : true) &&
      (filters.programStudi ? m.programStudi === filters.programStudi : true) &&
      (filters.angkatan ? m.angkatan === filters.angkatan : true) &&
      (filters.status ? m.status === filters.status : true) &&
      (filters.agama ? m.agama === filters.agama : true) &&
      (filters.jalur ? m.jalur === filters.jalur : true) &&
      (filters.poin ? {
        '20<': m.totalPoin < 20,
        '50<': m.totalPoin < 50,
        '100<': m.totalPoin < 100,
        '100>': m.totalPoin > 100
      }[filters.poin] : true)
    );
  });

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedMahasiswa(filteredMahasiswa.map(m => m.id));
    } else {
      setSelectedMahasiswa([]);
    }
  };

  // Handle select individual
  const handleSelectMahasiswa = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedMahasiswa([...selectedMahasiswa, id]);
    } else {
      setSelectedMahasiswa(selectedMahasiswa.filter(mId => mId !== id));
    }
  };

  // Handle bulk reset poin
  const handleBulkResetPoin = async () => {
    if (!selectedMahasiswa.length) return;
    
    try {
      setIsLoading(true);
      const batch = writeBatch(db);
      
      selectedMahasiswa.forEach(id => {
        const mahasiswaRef = doc(db, 'mahasiswa', id);
        batch.update(mahasiswaRef, { 
          totalPoin: 0,
          status: 'Normal'
        });
      });
      
      await batch.commit();
      toast.success('Poin berhasil direset');
      fetchMahasiswa();
      setSelectedMahasiswa([]);
      setSelectAll(false);
    } catch (error: any) {
      toast.error(`Gagal mereset poin: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (!selectedMahasiswa.length) return;
    
    if (window.confirm(`Apakah Anda yakin ingin menghapus ${selectedMahasiswa.length} mahasiswa? Semua data terkait (pelanggaran, riwayat, dll) akan ikut terhapus.`)) {
      try {
        setIsLoading(true);
        console.log(`Memulai penghapusan ${selectedMahasiswa.length} mahasiswa...`);
        
        // Ambil data mahasiswa yang dipilih
        const selectedMahasiswaData = mahasiswa.filter(m => selectedMahasiswa.includes(m.id));
        console.log('Data mahasiswa yang akan dihapus:', selectedMahasiswaData);
        
        // Siapkan batch untuk penghapusan
        const batch = writeBatch(db);
        let deletedCount = 0;
        
        for (const m of selectedMahasiswaData) {
          try {
            // 1. Hapus data pelanggaran terkait
            const pelanggaranQuery = query(
              collection(db, 'pelanggaran'),
              where('mahasiswaId', '==', m.id)
            );
            const pelanggaranDocs = await getDocs(pelanggaranQuery);
            
            // Hapus setiap dokumen pelanggaran
            for (const doc of pelanggaranDocs.docs) {
              batch.delete(doc.ref);
            }
            
            // 2. Hapus data riwayat terkait
            const riwayatQuery = query(
              collection(db, 'riwayat'),
              where('mahasiswaId', '==', m.id)
            );
            const riwayatDocs = await getDocs(riwayatQuery);
            
            // Hapus setiap dokumen riwayat
            for (const doc of riwayatDocs.docs) {
              batch.delete(doc.ref);
            }
            
            // 3. Hapus data user terkait
            const userQuery = query(
              collection(db, 'users'),
              where('email', '==', m.email)
            );
            const userDocs = await getDocs(userQuery);
            
            // Hapus setiap dokumen user
            for (const doc of userDocs.docs) {
              batch.delete(doc.ref);
            }
            
            // 4. Hapus data mahasiswa
            const mahasiswaRef = doc(db, 'mahasiswa', m.id);
            batch.delete(mahasiswaRef);
            
            // 5. Hapus akun Firebase Auth
            if (m.uid) {
              try {
                console.log('Mencoba menghapus akun auth untuk UID:', m.uid);
                const response = await fetch('/api/admin/delete-user', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ uid: m.uid }),
                });

                const responseData = await response.json();
                console.log('Response dari delete-user:', responseData);

                if (!response.ok) {
                  console.error('Gagal menghapus akun auth:', responseData);
                  throw new Error(responseData.error || 'Gagal menghapus akun');
                }
              } catch (error) {
                console.error(`Error deleting auth account for ${m.name}:`, error);
                // Lanjutkan proses meskipun ada error pada auth
                // karena data di Firestore sudah dihapus
              }
            }
            
            deletedCount++;
          } catch (error) {
            console.error(`Error deleting data for ${m.name}:`, error);
            // Lanjutkan ke mahasiswa berikutnya
          }
        }
        
        // Jalankan batch delete
        await batch.commit();
        
        console.log(`Berhasil menghapus ${deletedCount} mahasiswa`);
        toast.success(`${deletedCount} mahasiswa berhasil dihapus`);
        
        // Reset state dan refresh data
        setSelectedMahasiswa([]);
        setSelectAll(false);
        await fetchMahasiswa();
      } catch (error: any) {
        console.error('Error dalam penghapusan massal:', error);
        toast.error(`Gagal menghapus mahasiswa: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle bulk edit
  const handleBulkEdit = async () => {
    if (!selectedMahasiswa.length) return;
    
    try {
      setIsLoading(true);
      console.log('Memulai edit massal untuk', selectedMahasiswa.length, 'mahasiswa');
      console.log('Data yang akan diupdate:', bulkEditData);
      
      const batch = writeBatch(db);
      let hasChanges = false;
      let updatedCount = 0;
      
      // Ambil data mahasiswa yang dipilih
      const selectedMahasiswaData = mahasiswa.filter(m => selectedMahasiswa.includes(m.id));
      console.log('Data mahasiswa yang dipilih:', selectedMahasiswaData);
      
      for (const m of selectedMahasiswaData) {
        const mahasiswaRef = doc(db, 'mahasiswa', m.id);
        const updates: any = {};
        
        // Log data sebelum update
        console.log(`Data mahasiswa ${m.name} sebelum update:`, {
          jalur: m.jalur,
          programStudi: m.programStudi,
          angkatan: m.angkatan,
          agama: m.agama,
          totalPoin: m.totalPoin
        });
        
        if (bulkEditData.programStudi && bulkEditData.programStudi !== m.programStudi) {
          updates.programStudi = bulkEditData.programStudi;
          hasChanges = true;
        }
        
        if (bulkEditData.angkatan && bulkEditData.angkatan !== m.angkatan) {
          updates.angkatan = bulkEditData.angkatan;
          hasChanges = true;
        }
        
        if (bulkEditData.jalur && bulkEditData.jalur !== m.jalur) {
          updates.jalur = bulkEditData.jalur;
          hasChanges = true;
        }
        
        if (bulkEditData.agama && bulkEditData.agama !== m.agama) {
          updates.agama = bulkEditData.agama;
          hasChanges = true;
        }
        
        if (bulkEditData.totalPoin) {
          const newPoin = parseInt(bulkEditData.totalPoin);
          if (newPoin !== m.totalPoin) {
            updates.totalPoin = newPoin;
            updates.status = getStatusFromPoin(newPoin);
            hasChanges = true;
          }
        }
        
        if (Object.keys(updates).length > 0) {
          console.log(`Mengupdate mahasiswa ${m.name}:`, updates);
          batch.update(mahasiswaRef, updates);
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        console.log(`Menyimpan perubahan untuk ${updatedCount} mahasiswa...`);
        await batch.commit();
        console.log('Perubahan berhasil disimpan');
        toast.success(`Berhasil mengupdate ${updatedCount} mahasiswa`);
        
        // Tunggu sebentar sebelum fetch data baru
        setTimeout(async () => {
          await fetchMahasiswa();
          setSelectedMahasiswa([]);
          setSelectAll(false);
          setShowBulkEditModal(false);
          setBulkEditData({
            programStudi: '',
            angkatan: '',
            status: '',
            agama: '',
            totalPoin: '',
            jalur: ''
          });
        }, 1000);
      } else {
        console.log('Tidak ada perubahan yang akan disimpan');
        toast.error('Tidak ada perubahan yang dilakukan. Pastikan nilai yang diubah berbeda dari nilai saat ini.');
      }
    } catch (error: any) {
      console.error('Error dalam edit massal:', error);
      toast.error(`Gagal memperbarui data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Tambahkan useEffect untuk memantau perubahan data
  useEffect(() => {
    if (mahasiswa.length > 0) {
      console.log('Data mahasiswa diperbarui:', mahasiswa);
    }
  }, [mahasiswa]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Akan di-redirect oleh useEffect
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => {
            setError(null);
            fetchMahasiswa();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Mahasiswa</h1>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 w-full sm:w-auto"
          disabled={isSubmitting}
        >
          <UserPlus size={18} />
          <span>Tambah Mahasiswa</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <CardTitle>Daftar Mahasiswa</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-1 py-1 px-2 w-full sm:w-auto"
                onClick={() => setShowFilters(!showFilters)}
                disabled={isSubmitting}
              >
                <Filter size={16} />
                <span>Filter</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex items-center gap-1 py-1 px-2 w-full sm:w-auto"
                onClick={handleExport}
                disabled={isSubmitting}
              >
                <Download size={16} />
                <span>Export</span>
              </Button>
              <label className="btn-outline flex items-center gap-1 py-1 px-2 cursor-pointer w-full sm:w-auto">
                <Upload size={16} />
                <span>Import</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImport}
                  disabled={isSubmitting}
                />
              </label>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMahasiswa.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <h3 className="font-medium">{selectedMahasiswa.length} mahasiswa dipilih</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedMahasiswa([]);
                    setSelectAll(false);
                  }}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkResetPoin}
                  className="w-full sm:w-auto"
                >
                  Reset Poin
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="w-full sm:w-auto"
                >
                  Hapus
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkEditModal(true)}
                  className="w-full sm:w-auto"
                >
                  Edit Data
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">NIM</div>
                      {showFilters && (
                        <input
                          type="text"
                          value={filters.nim}
                          onChange={(e) => setFilters({ ...filters, nim: e.target.value })}
                          placeholder="Cari NIM..."
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Nama</div>
                      {showFilters && (
                        <input
                          type="text"
                          value={filters.name}
                          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                          placeholder="Cari nama..."
                          className="w-full px-2 py-1 text-sm border rounded"
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Program Studi</div>
                      {showFilters && (
                        <select
                          value={filters.programStudi}
                          onChange={(e) => setFilters({ ...filters, programStudi: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="">Semua</option>
                          <option value="Manajemen Informatika">Manajemen Informatika</option>
                          <option value="Akuntansi">Akuntansi</option>
                          <option value="Teknik Informatika">Teknik Informatika</option>
                        </select>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Angkatan</div>
                      {showFilters && (
                        <select
                          value={filters.angkatan}
                          onChange={(e) => setFilters({ ...filters, angkatan: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="">Semua</option>
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                            <option key={year} value={year.toString()}>{year}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Total Poin</div>
                      {showFilters && (
                        <select
                          value={filters.poin}
                          onChange={(e) => setFilters({ ...filters, poin: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="">Semua</option>
                          <option value="20<">Kurang dari 20</option>
                          <option value="50<">Kurang dari 50</option>
                          <option value="100<">Kurang dari 100</option>
                          <option value="100>">Lebih dari 100</option>
                        </select>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Status</div>
                      {showFilters && (
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="">Semua</option>
                          <option value="Normal">Normal</option>
                          <option value="Pembinaan">Pembinaan</option>
                          <option value="Terancam DO">Terancam DO</option>
                        </select>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Agama</div>
                      {showFilters && (
                        <select
                          value={filters.agama}
                          onChange={(e) => setFilters({ ...filters, agama: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="">Semua</option>
                          <option value="Islam">Islam</option>
                          <option value="Kristen">Kristen</option>
                          <option value="Katolik">Katolik</option>
                          <option value="Hindu">Hindu</option>
                          <option value="Buddha">Buddha</option>
                          <option value="Konghucu">Konghucu</option>
                        </select>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="space-y-2">
                      <div className="font-medium">Jalur</div>
                      {showFilters && (
                        <select
                          value={filters.jalur}
                          onChange={(e) => setFilters({ ...filters, jalur: e.target.value })}
                          className="w-full px-2 py-1 text-sm border rounded"
                        >
                          <option value="">Semua</option>
                          <option value="Umum">Umum</option>
                          <option value="KIP">KIP</option>
                          <option value="Beasiswa">Beasiswa</option>
                        </select>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMahasiswa.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedMahasiswa.includes(m.id)}
                        onChange={(e) => handleSelectMahasiswa(m.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell>{m.nim}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell>{m.programStudi}</TableCell>
                    <TableCell>{m.angkatan}</TableCell>
                    <TableCell>{m.totalPoin || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.status === 'Normal'
                            ? 'success'
                            : m.status === 'Pembinaan'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {m.status || 'Normal'}
                      </Badge>
                    </TableCell>
                    <TableCell>{m.agama}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.jalur === 'Umum'
                            ? 'default'
                            : m.jalur === 'KIP'
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {m.jalur || 'Umum'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(m.id)}
                          disabled={isSubmitting}
                          className="p-1 sm:p-2"
                        >
                          <Eye size={14} className="sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(m)}
                          disabled={isSubmitting}
                          className="p-1 sm:p-2"
                        >
                          <Edit size={14} className="sm:w-4 sm:h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(m.id)}
                          disabled={isSubmitting}
                          className="p-1 sm:p-2"
                        >
                          <Trash size={14} className="sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Tambah/Edit Mahasiswa */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          reset();
          setPhotoPreview(null);
          setPhotoFile(null);
          setCurrentPhotoURL('');
        }}
        title={showAddModal ? 'Tambah Mahasiswa' : 'Edit Mahasiswa'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">NIM</label>
              <input
                type="text"
                {...register('nim')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.nim && (
                <p className="mt-1 text-sm text-red-600">{errors.nim.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nama</label>
              <input
                type="text"
                {...register('name')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                {...register('password')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Program Studi</label>
              <select
                {...register('programStudi')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="">Pilih Program Studi</option>
                <option value="Manajemen Informatika">Manajemen Informatika</option>
                <option value="Akuntansi">Akuntansi</option>
                <option value="Teknik Informatika">Teknik Informatika</option>
              </select>
              {errors.programStudi && (
                <p className="mt-1 text-sm text-red-600">{errors.programStudi.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Angkatan</label>
              <select
                {...register('angkatan')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="">Pilih Angkatan</option>
                {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
              {errors.angkatan && (
                <p className="mt-1 text-sm text-red-600">{errors.angkatan.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Tanggal Lahir</label>
              <input
                type="date"
                {...register('tanggalLahir')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.tanggalLahir && (
                <p className="mt-1 text-sm text-red-600">{errors.tanggalLahir.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Agama</label>
              <input
                type="text"
                {...register('agama')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              />
              {errors.agama && (
                <p className="mt-1 text-sm text-red-600">{errors.agama.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Alamat</label>
              <textarea
                {...register('alamat')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                disabled={isSubmitting}
              />
              {errors.alamat && (
                <p className="mt-1 text-sm text-red-600">{errors.alamat.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Jalur</label>
              <select
                {...register('jalur')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                <option value="">Pilih Jalur</option>
                <option value="Umum">Umum</option>
                <option value="KIP">KIP</option>
                <option value="Beasiswa">Beasiswa</option>
              </select>
              {errors.jalur && (
                <p className="mt-1 text-sm text-red-600">{errors.jalur.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Foto</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setPhotoPreview(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="mt-1 block w-full"
                disabled={isSubmitting}
              />
              {photoPreview && (
                <div className="mt-2">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                reset();
                setPhotoPreview(null);
                setPhotoFile(null);
                setCurrentPhotoURL('');
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Menyimpan...' : showAddModal ? 'Tambah' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Massal */}
      <Modal
        isOpen={showBulkEditModal}
        onClose={() => {
          setShowBulkEditModal(false);
          setBulkEditData({
            programStudi: '',
            angkatan: '',
            status: '',
            agama: '',
            totalPoin: '',
            jalur: ''
          });
        }}
        title={`Edit ${selectedMahasiswa.length} Mahasiswa`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Program Studi</label>
            <select
              value={bulkEditData.programStudi}
              onChange={(e) => setBulkEditData({ ...bulkEditData, programStudi: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tidak diubah</option>
              <option value="Manajemen Informatika">Manajemen Informatika</option>
              <option value="Akuntansi">Akuntansi</option>
              <option value="Teknik Informatika">Teknik Informatika</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Angkatan</label>
            <select
              value={bulkEditData.angkatan}
              onChange={(e) => setBulkEditData({ ...bulkEditData, angkatan: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tidak diubah</option>
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={bulkEditData.status}
              onChange={(e) => setBulkEditData({ ...bulkEditData, status: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tidak diubah</option>
              <option value="Normal">Normal</option>
              <option value="Pembinaan">Pembinaan</option>
              <option value="Terancam DO">Terancam DO</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Agama</label>
            <select
              value={bulkEditData.agama}
              onChange={(e) => setBulkEditData({ ...bulkEditData, agama: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tidak diubah</option>
              <option value="Islam">Islam</option>
              <option value="Kristen">Kristen</option>
              <option value="Katolik">Katolik</option>
              <option value="Hindu">Hindu</option>
              <option value="Buddha">Buddha</option>
              <option value="Konghucu">Konghucu</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Total Poin</label>
            <input
              type="number"
              value={bulkEditData.totalPoin}
              onChange={(e) => setBulkEditData({ ...bulkEditData, totalPoin: e.target.value })}
              placeholder="Kosongkan jika tidak diubah"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Jalur</label>
            <select
              value={bulkEditData.jalur}
              onChange={(e) => setBulkEditData({ ...bulkEditData, jalur: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tidak diubah</option>
              <option value="Umum">Umum</option>
              <option value="KIP">KIP</option>
              <option value="Beasiswa">Beasiswa</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkEditModal(false);
                setBulkEditData({
                  programStudi: '',
                  angkatan: '',
                  status: '',
                  agama: '',
                  totalPoin: '',
                  jalur: ''
                });
              }}
              className="w-full sm:w-auto"
            >
              Batal
            </Button>
            <Button 
              onClick={handleBulkEdit}
              className="w-full sm:w-auto"
            >
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MahasiswaPage; 