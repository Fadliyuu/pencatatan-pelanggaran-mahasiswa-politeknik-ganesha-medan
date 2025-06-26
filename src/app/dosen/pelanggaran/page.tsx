"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { getPelanggaran, getMahasiswa, getPeraturan, createPelanggaran, uploadImageToCloudinary, addNotifikasi } from '@/lib/firebase';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  User,
  PlusCircle,
  X,
  Upload,
  Calendar,
  Info,
  AlertCircle,
  Eye
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Pelanggaran {
  id: string;
  mahasiswaId: string;
  peraturanId: string;
  tanggal: string;
  poin: number;
  buktiURLs?: string[];
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
  banding?: {
    id: string;
    alasanBanding: string;
    buktiURLs: string[];
    createdAt: string;
    status: 'Disetujui' | 'Menunggu' | 'Ditolak';
    updatedAt: string;
  };
}

interface Mahasiswa {
  id: string;
  uid?: string;
  name: string;
  nim: string;
  totalPoin: number;
  status: string;
  photoURL?: string;
}

interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
}

interface LaporanPelanggaran {
  mahasiswaId: string;
  peraturanId: string;
  tanggal: string;
  keterangan: string;
  buktiURLs: string[];
  poin: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  dosenId: string;
  dosenName: string;
}

// Perbaiki interface Notifikasi
interface Notifikasi {
  userId: string;
  title: string;
  message: string;
  type: 'pelanggaran' | 'banding';
  read: boolean;
  pelanggaranId?: string;
}

// Schema validasi untuk form pelanggaran
const pelanggaranSchema = z.object({
  mahasiswaId: z.string().min(1, 'Mahasiswa harus dipilih'),
  peraturanId: z.string().min(1, 'Peraturan harus dipilih'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  keterangan: z.string().min(1, 'Keterangan harus diisi'),
  buktiURLs: z.array(z.string()).optional(),
});

type PelanggaranFormData = z.infer<typeof pelanggaranSchema>;

export default function PelanggaranPage() {
  const router = useRouter();
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [peraturan, setPeraturan] = useState<Peraturan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('tanggal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [searchMahasiswa, setSearchMahasiswa] = useState('');
  const [filteredMahasiswa, setFilteredMahasiswa] = useState<Mahasiswa[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedPelanggaran, setSelectedPelanggaran] = useState<Pelanggaran | null>(null);
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<Mahasiswa | null>(null);
  const [showBandingModal, setShowBandingModal] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<PelanggaranFormData>({
    resolver: zodResolver(pelanggaranSchema),
  });

  useEffect(() => {
    let isMounted = true;
    let redirecting = false;

    const checkAuth = async () => {
      // Jika sudah dicek atau sedang redirect, tidak perlu cek lagi
      if (isAuthChecked || redirecting) return;

      try {
        const user = auth.currentUser;
        
        // Jika tidak ada user, redirect ke login
        if (!user) {
          if (isMounted && !redirecting) {
            redirecting = true;
            router.replace('/login');
          }
          return;
        }

        // Cek role user
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (!isMounted) return;

        // Jika bukan dosen, redirect sesuai role
        if (userData?.role !== 'dosen') {
          if (isMounted && !redirecting) {
            redirecting = true;
            if (userData?.role === 'mahasiswa') {
              router.replace('/mahasiswa/dashboard');
            } else if (userData?.role === 'admin') {
              router.replace('/admin/dashboard');
            } else {
              router.replace('/login');
            }
          }
          return;
        }

        // Jika dosen, set authorized dan load data
        if (isMounted) {
          setCurrentUser(user);
          setIsAuthorized(true);
          setIsAuthChecked(true);
          await fetchData();
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        if (isMounted && !redirecting) {
          redirecting = true;
          router.replace('/login');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Jalankan pengecekan auth
    checkAuth();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []); // Hapus semua dependencies

  const fetchData = async () => {
    try {
      const [pelanggaranData, mahasiswaData, peraturanData] = await Promise.all([
        getPelanggaran(),
        getMahasiswa(),
        getPeraturan(),
      ]);
      
      // Validasi data sebelum set state
      const validPelanggaran = Array.isArray(pelanggaranData) ? pelanggaranData.filter((item: any) => 
        item && typeof item === 'object' && item.id && item.tanggal
      ) : [];
      
      const validMahasiswa = Array.isArray(mahasiswaData) ? mahasiswaData.filter((item: any) => 
        item && typeof item === 'object' && item.id && item.name
      ) : [];
      
      const validPeraturan = Array.isArray(peraturanData) ? peraturanData.filter((item: any) => 
        item && typeof item === 'object' && item.id && item.nama
      ) : [];
      
      setPelanggaran(validPelanggaran as Pelanggaran[]);
      setMahasiswa(validMahasiswa as Mahasiswa[]);
      setPeraturan(validPeraturan as Peraturan[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays jika terjadi error
      setPelanggaran([]);
      setMahasiswa([]);
      setPeraturan([]);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredPelanggaran = (pelanggaran || [])
    .filter(item => {
      if (!item || !item.mahasiswaId || !item.peraturanId || !item.tanggal) return false;
      
      const selectedMahasiswa = mahasiswa.find(m => m.id === item.mahasiswaId) as Mahasiswa | undefined;
      const selectedPeraturan = peraturan.find(p => p.id === item.peraturanId) as Peraturan | undefined;
      
      const matchesSearch = 
        selectedMahasiswa?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        selectedMahasiswa?.nim?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        selectedPeraturan?.nama?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'semua' || selectedPeraturan?.kategori === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'tanggal') {
        try {
          // Pastikan tanggal valid sebelum membuat Date object
          if (!a.tanggal || !b.tanggal) {
            comparison = (a.tanggal || '').localeCompare(b.tanggal || '');
          } else {
            const dateA = new Date(a.tanggal);
            const dateB = new Date(b.tanggal);
            if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
              comparison = dateA.getTime() - dateB.getTime();
            } else {
              comparison = a.tanggal.localeCompare(b.tanggal);
            }
          }
        } catch (error) {
          comparison = (a.tanggal || '').localeCompare(b.tanggal || '');
        }
      } else if (sortField === 'nama') {
        const namaA = mahasiswa.find(m => m.id === a.mahasiswaId)?.name || '';
        const namaB = mahasiswa.find(m => m.id === b.mahasiswaId)?.name || '';
        comparison = namaA.localeCompare(namaB);
      } else if (sortField === 'status') {
        const statusA = peraturan.find(p => p.id === a.peraturanId)?.kategori || '';
        const statusB = peraturan.find(p => p.id === b.peraturanId)?.kategori || '';
        comparison = statusA.localeCompare(statusB);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getStatusColor = (kategori: string) => {
    switch (kategori) {
      case 'Ringan':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'Sedang':
        return 'bg-orange-500/20 text-orange-300';
      case 'Berat':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusIcon = (kategori: string) => {
    switch (kategori) {
      case 'Ringan':
        return <Clock className="h-5 w-5" />;
      case 'Sedang':
        return <AlertTriangle className="h-5 w-5" />;
      case 'Berat':
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  // Update useEffect untuk memfilter mahasiswa
  useEffect(() => {
    if (searchMahasiswa) {
      const filtered = mahasiswa.filter(m => 
        m.name.toLowerCase().includes(searchMahasiswa.toLowerCase()) ||
        m.nim.toLowerCase().includes(searchMahasiswa.toLowerCase())
      );
      setFilteredMahasiswa(filtered);
    } else {
      setFilteredMahasiswa([]);
    }
  }, [searchMahasiswa, mahasiswa]);

  // Perbaiki fungsi sendNotifikasi
  const sendNotifikasi = async (notifikasi: Omit<Notifikasi, 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'notifikasi'), {
        ...notifikasi,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Perbaiki fungsi onSubmit
  const onSubmit = async (data: PelanggaranFormData) => {
    try {
      // Validasi data
      if (!data.mahasiswaId) {
        toast.error('Mahasiswa harus dipilih');
        return;
      }
      if (!data.peraturanId) {
        toast.error('Peraturan harus dipilih');
        return;
      }
      if (!data.tanggal) {
        toast.error('Tanggal harus diisi');
        return;
      }
      if (!data.keterangan) {
        toast.error('Keterangan harus diisi');
        return;
      }

      // Cari peraturan yang dipilih
      const selectedPeraturan = peraturan.find(p => p.id === data.peraturanId);
      if (!selectedPeraturan) {
        toast.error('Peraturan tidak ditemukan');
        return;
      }

      // Cari mahasiswa yang dipilih
      const selectedMahasiswa = mahasiswa.find(m => m.id === data.mahasiswaId);
      if (!selectedMahasiswa) {
        toast.error('Mahasiswa tidak ditemukan');
        return;
      }

      const laporanData: LaporanPelanggaran = {
        mahasiswaId: data.mahasiswaId,
        peraturanId: data.peraturanId,
        tanggal: data.tanggal,
        keterangan: data.keterangan,
        buktiURLs: data.buktiURLs || [],
        poin: selectedPeraturan.poin,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dosenId: currentUser?.uid || '',
        dosenName: currentUser?.displayName || currentUser?.email || ''
      };

      const laporanRef = await addDoc(collection(db, 'laporan'), laporanData);
      
      // Kirim notifikasi ke admin
      await sendNotifikasi({
        userId: 'admin',
        title: 'Laporan Pelanggaran Baru',
        message: `Dosen ${currentUser?.displayName || currentUser?.email} melaporkan pelanggaran baru:\nKode: ${selectedPeraturan.kode}\nJenis: ${selectedPeraturan.nama}\nKategori: ${selectedPeraturan.kategori}\nPoin: ${selectedPeraturan.poin}\n\nStatus: Menunggu Persetujuan`,
        type: 'pelanggaran',
        read: false,
        pelanggaranId: laporanRef.id
      });

      // Notifikasi ke mahasiswa
      if (selectedMahasiswa && (selectedMahasiswa.uid || selectedMahasiswa.id)) {
        await sendNotifikasi({
          userId: selectedMahasiswa.uid || selectedMahasiswa.id,
          title: 'Laporan Pelanggaran',
          message: `Anda dilaporkan melakukan pelanggaran: ${selectedPeraturan.nama} (${selectedPeraturan.kategori} - ${selectedPeraturan.poin} poin)\nStatus: Menunggu Persetujuan Admin`,
          type: 'pelanggaran',
          read: false,
          pelanggaranId: laporanRef.id
        });
      }

      // Notifikasi ke dosen
      await sendNotifikasi({
        userId: currentUser?.uid || '',
        title: 'Laporan Pelanggaran Terkirim',
        message: `Laporan pelanggaran Anda telah terkirim dan menunggu persetujuan admin:\nKode: ${selectedPeraturan.kode}\nJenis: ${selectedPeraturan.nama}\nKategori: ${selectedPeraturan.kategori}\nPoin: ${selectedPeraturan.poin}`,
        type: 'pelanggaran',
        read: false,
        pelanggaranId: laporanRef.id
      });

      toast.success('Laporan pelanggaran berhasil dikirim dan menunggu persetujuan admin');
      handleCloseModal();
      
      const updatedData = await getPelanggaran();
      setPelanggaran(updatedData as Pelanggaran[]);
    } catch (error) {
      console.error('Error saving laporan:', error);
      toast.error('Gagal menyimpan laporan pelanggaran');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadImageToCloudinary(file));
      const uploadedUrls = await Promise.all(uploadPromises);
      
      setPreviewImages(prev => [...prev, ...uploadedUrls]);
      setValue('buktiURLs', [...watch('buktiURLs') || [], ...uploadedUrls]);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Gagal mengunggah gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setPreviewImages(prev => prev.filter((_, i) => i !== index));
    const currentBuktiURLs = watch('buktiURLs') || [];
    setValue('buktiURLs', currentBuktiURLs.filter((_, i) => i !== index));
  };

  const handleCloseModal = () => {
    setShowModal(false);
    reset();
    setPreviewImages([]);
  };

  const handleDetailClick = (pelanggaran: Pelanggaran) => {
    setSelectedPelanggaran(pelanggaran);
    setShowDetailModal(true);
  };

  const handleProfileClick = (mahasiswa: Mahasiswa) => {
    setSelectedMahasiswa(mahasiswa);
    setShowProfileModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPelanggaran(null);
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setSelectedMahasiswa(null);
  };

  const handleDetailBanding = (pelanggaran: Pelanggaran) => {
    if (!pelanggaran.banding) return;
    
    setSelectedPelanggaran(pelanggaran);
    setShowBandingModal(true);
  };

  // Tampilkan loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  // Tampilkan unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
          <p className="text-white/80 mb-4">Anda tidak memiliki akses ke halaman ini</p>
          <button
            onClick={() => {
              router.replace('/login');
            }}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  function getTanggalString(tanggal: any) {
    if (!tanggal) return '-';
    if (typeof tanggal === 'string') return tanggal;
    if (tanggal instanceof Date) return tanggal.toLocaleDateString();
    if (typeof tanggal.toDate === 'function') return tanggal.toDate().toLocaleDateString();
    return '-';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Data Pelanggaran Mahasiswa</h1>
            <p className="text-white/80">Kelola dan pantau pelanggaran mahasiswa</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all duration-300"
          >
            <PlusCircle className="h-5 w-5" />
            Laporkan Pelanggaran
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama, NIM, atau jenis pelanggaran..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white transition-all duration-300"
              >
                <Filter className="h-5 w-5" />
                Filter
                {showFilters ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Kategori Pelanggaran</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="semua">Semua Kategori</option>
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-white/80 border-b border-white/10">
                <th className="pb-4 px-4">
                  <button
                    onClick={() => handleSort('tanggal')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Tanggal
                    {sortField === 'tanggal' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="pb-4 px-4">
                  <button
                    onClick={() => handleSort('nama')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Nama Mahasiswa
                    {sortField === 'nama' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="pb-4 px-4">NIM</th>
                <th className="pb-4 px-4">Jenis Pelanggaran</th>
                <th className="pb-4 px-4">Poin</th>
                <th className="pb-4 px-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Kategori
                    {sortField === 'status' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="pb-4 px-4">Status Banding</th>
                <th className="pb-4 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPelanggaran.map((item) => {
                if (!item || !item.id) return null;
                
                const selectedMahasiswa = mahasiswa.find(m => m.id === item.mahasiswaId);
                const selectedPeraturan = peraturan.find(p => p.id === item.peraturanId);
                
                return (
                  <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 text-white/80">{getTanggalString(item.tanggal)}</td>
                    <td className="py-4 px-4 text-white/80">{selectedMahasiswa?.name || '-'}</td>
                    <td className="py-4 px-4 text-white/80">{selectedMahasiswa?.nim || '-'}</td>
                    <td className="py-4 px-4 text-white/80">{selectedPeraturan?.nama || '-'}</td>
                    <td className="py-4 px-4 text-white/80">{item.poin || 0}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(selectedPeraturan?.kategori || '')}`}>
                        {getStatusIcon(selectedPeraturan?.kategori || '')}
                        {selectedPeraturan?.kategori || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {item.banding ? (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.banding.status === 'Disetujui' 
                            ? 'bg-green-500/20 text-green-300'
                            : item.banding.status === 'Ditolak'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                        }`}>
                          {item.banding.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-500/20 text-gray-300">
                          Tidak Ada Banding
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDetailClick(item)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                          title="Detail"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        {selectedMahasiswa && (
                          <button
                            onClick={() => handleProfileClick(selectedMahasiswa)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                            title="Profil Mahasiswa"
                          >
                            <User className="h-5 w-5" />
                          </button>
                        )}
                        {item.banding && (
                          <button
                            onClick={() => handleDetailBanding(item)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-yellow-400 transition-colors"
                            title="Detail Banding"
                          >
                            <AlertCircle className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredPelanggaran.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-white/60 mx-auto mb-4" />
              <p className="text-white/80">Tidak ada data pelanggaran yang ditemukan</p>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedPelanggaran && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Detail Pelanggaran</h2>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-white/80 mb-2">Mahasiswa</h3>
                    <p className="text-white">
                      {mahasiswa.find(m => m.id === selectedPelanggaran.mahasiswaId)?.name}
                    </p>
                    <p className="text-white/60">
                      {mahasiswa.find(m => m.id === selectedPelanggaran.mahasiswaId)?.nim}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-white/80 mb-2">Tanggal</h3>
                    <p className="text-white">{getTanggalString(selectedPelanggaran.tanggal)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Jenis Pelanggaran</h3>
                  <p className="text-white">
                    {peraturan.find(p => p.id === selectedPelanggaran.peraturanId)?.nama}
                  </p>
                  <p className="text-white/60">
                    Kode: {peraturan.find(p => p.id === selectedPelanggaran.peraturanId)?.kode}
                  </p>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Kategori & Poin</h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(peraturan.find(p => p.id === selectedPelanggaran.peraturanId)?.kategori || '')}`}>
                      {getStatusIcon(peraturan.find(p => p.id === selectedPelanggaran.peraturanId)?.kategori || '')}
                      {peraturan.find(p => p.id === selectedPelanggaran.peraturanId)?.kategori}
                    </span>
                    <span className="text-white">{selectedPelanggaran.poin} poin</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Keterangan</h3>
                  <p className="text-white">{selectedPelanggaran.keterangan}</p>
                </div>

                {selectedPelanggaran.buktiURLs && selectedPelanggaran.buktiURLs.length > 0 && (
                  <div>
                    <h3 className="text-white/80 mb-2">Bukti Pelanggaran</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedPelanggaran.buktiURLs.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Bukti ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && selectedMahasiswa && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]" style={{ backfaceVisibility: 'hidden' }}>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Profil Mahasiswa</h2>
                <button
                  onClick={handleCloseProfileModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden bg-white/10">
                    {selectedMahasiswa.photoURL ? (
                      <Image
                        src={selectedMahasiswa.photoURL}
                        alt={selectedMahasiswa.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-10 h-10 text-white/60" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedMahasiswa.name}</h3>
                    <p className="text-white/60">{selectedMahasiswa.nim}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-white/80 mb-2">Total Poin</h3>
                    <p className="text-white">{selectedMahasiswa.totalPoin} poin</p>
                  </div>
                  <div>
                    <h3 className="text-white/80 mb-2">Status</h3>
                    <p className="text-white">{selectedMahasiswa.status}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-white/80 mb-4">Riwayat Pelanggaran</h3>
                  <div className="space-y-4">
                    {pelanggaran
                      .filter(p => p.mahasiswaId === selectedMahasiswa.id)
                      .map(p => {
                        const peraturanItem = peraturan.find(pr => pr.id === p.peraturanId);
                        return (
                          <div key={p.id} className="bg-white/5 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-white font-medium">{peraturanItem?.nama}</p>
                                <p className="text-white/60 text-sm">{p.tanggal}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(peraturanItem?.kategori || '')}`}>
                                {getStatusIcon(peraturanItem?.kategori || '')}
                                {peraturanItem?.kategori}
                              </span>
                            </div>
                            <p className="text-white/80 text-sm">{p.keterangan}</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banding Modal */}
        {showBandingModal && selectedPelanggaran?.banding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-2xl border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Detail Banding</h3>
                <button
                  onClick={() => setShowBandingModal(false)}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Status</label>
                  <span className={`px-3 py-1.5 rounded-full text-sm ${
                    selectedPelanggaran.banding.status === 'Disetujui' 
                      ? 'bg-green-500/20 text-green-300'
                      : selectedPelanggaran.banding.status === 'Ditolak'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {selectedPelanggaran.banding.status}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-1">Alasan Banding</label>
                  <p className="text-white">{selectedPelanggaran.banding.alasanBanding}</p>
                </div>
                
                {selectedPelanggaran.banding.buktiURLs && selectedPelanggaran.banding.buktiURLs.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Bukti Pendukung</label>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedPelanggaran.banding.buktiURLs.map((url, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden">
                          <img
                            src={url}
                            alt={`Bukti ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between text-sm text-white/60">
                  <span>Diajukan: {getTanggalString(selectedPelanggaran.banding.createdAt)}</span>
                  <span>Diperbarui: {getTanggalString(selectedPelanggaran.banding.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Laporkan Pelanggaran Baru</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Pencarian Mahasiswa */}
                <div>
                  <label className="block text-white/80 mb-2">Cari Mahasiswa</label>
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama atau NIM..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
                    value={searchMahasiswa}
                    onChange={(e) => setSearchMahasiswa(e.target.value)}
                  />
                  {filteredMahasiswa.length > 0 && (
                    <div className="mt-2 bg-white/5 rounded-xl overflow-hidden">
                      {filteredMahasiswa.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setValue('mahasiswaId', m.id);
                            setSearchMahasiswa(m.name);
                            setFilteredMahasiswa([]);
                          }}
                          className="w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors"
                        >
                          {m.name} - {m.nim}
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.mahasiswaId && (
                    <p className="mt-1 text-red-400 text-sm">{errors.mahasiswaId.message}</p>
                  )}
                </div>

                {/* Peraturan */}
                <div>
                  <label className="block text-white/80 mb-2">Peraturan</label>
                  <div className="relative">
                    <select
                      {...register('peraturanId')}
                      className="w-full bg-[#1e2a78]/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none"
                    >
                      <option value="" className="bg-[#1e2a78] text-white">Pilih Peraturan</option>
                      {peraturan.map((p) => (
                        <option 
                          key={p.id} 
                          value={p.id}
                          className="bg-[#1e2a78] text-white"
                        >
                          {p.nama} ({p.kategori} - {p.poin} poin)
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-white/60" />
                    </div>
                  </div>
                  {errors.peraturanId && (
                    <p className="mt-1 text-red-400 text-sm">{errors.peraturanId.message}</p>
                  )}
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-white/80 mb-2">Tanggal</label>
                  <input
                    type="date"
                    {...register('tanggal')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  {errors.tanggal && (
                    <p className="mt-1 text-red-400 text-sm">{errors.tanggal.message}</p>
                  )}
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-white/80 mb-2">Keterangan</label>
                  <textarea
                    {...register('keterangan')}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                    placeholder="Jelaskan detail pelanggaran..."
                  />
                  {errors.keterangan && (
                    <p className="mt-1 text-red-400 text-sm">{errors.keterangan.message}</p>
                  )}
                </div>

                {/* Upload Bukti */}
                <div>
                  <label className="block text-white/80 mb-2">Bukti Pelanggaran</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white cursor-pointer transition-all duration-300">
                      <Upload className="h-5 w-5" />
                      Upload Gambar
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                    {isUploading && (
                      <span className="text-white/60">Mengunggah...</span>
                    )}
                  </div>
                  
                  {/* Preview Images */}
                  {previewImages.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                      {previewImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Bukti ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2 text-white/80 hover:text-white transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 