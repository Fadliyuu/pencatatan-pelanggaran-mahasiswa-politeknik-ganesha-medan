"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { getDoc, doc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getPelanggaran, getPeraturan, getMahasiswa } from '@/lib/firebase';
import { 
  User, 
  AlertTriangle, 
  Bell, 
  Calendar, 
  FileText, 
  Users, 
  CheckCircle, 
  ChevronRight,
  Clock,
  Settings,
  BookOpen,
  Megaphone,
  BarChart3,
  TrendingUp,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface UserData {
  displayName?: string;
  name?: string;
  email: string;
  role: string;
  photoURL?: string;
  nip?: string;
  prodi?: string;
}

interface StatistikData {
  totalMahasiswa: number;
  totalPelanggaran: number;
}

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
  createdAt: any;
}

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
}

interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
}

export default function DosenDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [statistik, setStatistik] = useState<StatistikData>({
    totalMahasiswa: 0,
    totalPelanggaran: 0
  });
  const [isLoadingStatistik, setIsLoadingStatistik] = useState(true);
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [pelanggaranTerbaru, setPelanggaranTerbaru] = useState<Pelanggaran[]>([]);
  const [peraturan, setPeraturan] = useState<Peraturan[]>([]);
  const [mahasiswa, setMahasiswa] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          if (userData.role === 'dosen') {
            setUser(userData);
          } else {
            if (userData.role === 'admin') {
              router.push('/admin/dashboard');
            } else if (userData.role === 'mahasiswa') {
              router.push('/mahasiswa/dashboard');
            } else {
              router.push('/login');
            }
          }
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
      setIsLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setIsLoadingData(true);
        
        // Fetch Statistik
        const mahasiswaRef = collection(db, 'users');
        const q = query(mahasiswaRef, where('role', '==', 'mahasiswa'));
        const querySnapshot = await getDocs(q);
        
        // Fetch Pelanggaran, Peraturan, dan Mahasiswa
        const [pelanggaranData, peraturanData, mahasiswaData] = await Promise.all([
          getPelanggaran(),
          getPeraturan(),
          getMahasiswa()
        ]);

        setStatistik({
          totalMahasiswa: querySnapshot.size,
          totalPelanggaran: pelanggaranData.length
        });

        // Sort pelanggaran berdasarkan createdAt
        const sortedPelanggaran = [...pelanggaranData].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5);

        setPelanggaranTerbaru(sortedPelanggaran);
        setPeraturan(peraturanData as Peraturan[]);
        setMahasiswa(mahasiswaData);

        // Fetch Pengumuman
        const pengumumanRef = collection(db, 'pengumuman');
        const pengumumanQuery = query(
          pengumumanRef,
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const pengumumanSnapshot = await getDocs(pengumumanQuery);
        const pengumumanData = pengumumanSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Pengumuman[];
        setPengumuman(pengumumanData);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal mengambil data');
      } finally {
        setIsLoadingStatistik(false);
        setIsLoadingData(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg animate-fade-in-up">
              Selamat Datang, {user?.displayName || user?.name || 'Dosen'}!
            </h1>
            <p className="text-lg text-white/80 animate-fade-in-up-delay">
              Ini adalah dashboard Anda sebagai Dosen di Politeknik Ganesha Medan.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dosen/profil" className="bg-white/10 backdrop-blur-lg p-3 rounded-full hover:bg-white/20 transition-all duration-300">
              <User className="h-6 w-6 text-white" />
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/dosen/pelanggaran" className="bg-white/10 backdrop-blur-lg rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
            <AlertTriangle className="h-8 w-8 text-red-300 mb-2" />
            <h3 className="text-white font-semibold">Pelanggaran</h3>
            <p className="text-white/60 text-sm">Kelola pelanggaran mahasiswa</p>
          </Link>
          <Link href="/dosen/mahasiswa" className="bg-white/10 backdrop-blur-lg rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
            <Users className="h-8 w-8 text-blue-300 mb-2" />
            <h3 className="text-white font-semibold">Mahasiswa</h3>
            <p className="text-white/60 text-sm">Data mahasiswa</p>
          </Link>
          <Link href="/dosen/laporan" className="bg-white/10 backdrop-blur-lg rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
            <FileText className="h-8 w-8 text-green-300 mb-2" />
            <h3 className="text-white font-semibold">Laporan</h3>
            <p className="text-white/60 text-sm">Lihat laporan</p>
          </Link>
          <Link href="/dosen/pengaturan" className="bg-white/10 backdrop-blur-lg rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
            <Settings className="h-8 w-8 text-yellow-300 mb-2" />
            <h3 className="text-white font-semibold">Pengaturan</h3>
            <p className="text-white/60 text-sm">Pengaturan akun</p>
          </Link>
        </div>

        {/* Statistik Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl transform hover:scale-105 transition-all duration-300 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Mahasiswa</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {isLoadingStatistik ? '...' : statistik.totalMahasiswa}
                </h3>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-full">
                <Users className="h-8 w-8 text-blue-300" />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl transform hover:scale-105 transition-all duration-300 animate-fade-in-up delay-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Pelanggaran</p>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {isLoadingStatistik ? '...' : statistik.totalPelanggaran}
                </h3>
              </div>
              <div className="bg-red-500/20 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-300" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pengumuman Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl transform hover:scale-105 transition-all duration-300 animate-fade-in-up delay-400">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Megaphone className="h-5 w-5 mr-2 text-yellow-300" />
                Pengumuman Penting
              </h2>
              <Link href="/dosen/pengumuman" className="text-sm text-white/80 hover:text-white transition-colors flex items-center">
                Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {isLoadingData ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4">
                      <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : pengumuman.length > 0 ? (
                pengumuman.map((item) => (
                  <div key={item.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
                    <h3 className="text-white font-medium mb-1">{item.judul}</h3>
                    <p className="text-white/70 text-sm">{item.isi}</p>
                    <p className="text-white/50 text-xs mt-2">{item.tanggal}</p>
                  </div>
                ))
              ) : (
                <p className="text-white/60 text-center py-4">Tidak ada pengumuman</p>
              )}
            </div>
          </div>

          {/* Pelanggaran Terbaru Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl transform hover:scale-105 transition-all duration-300 animate-fade-in-up delay-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-300" />
                Pelanggaran Terbaru
              </h2>
              <Link href="/dosen/pelanggaran" className="text-sm text-white/80 hover:text-white transition-colors flex items-center">
                Lihat Semua <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-4">
              {isLoadingData ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4">
                      <div className="h-4 bg-white/10 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : pelanggaranTerbaru && pelanggaranTerbaru.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-white/60 text-sm border-b border-white/10">
                        <th className="pb-3 font-medium">Nama</th>
                        <th className="pb-3 font-medium">NIM</th>
                        <th className="pb-3 font-medium">Jenis Pelanggaran</th>
                        <th className="pb-3 font-medium">Tanggal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pelanggaranTerbaru.map((item) => {
                        const peraturanItem = peraturan.find(p => p.id === item.peraturanId);
                        const mahasiswaItem = mahasiswa.find(m => m.id === item.mahasiswaId);
                        return (
                          <tr key={item.id} className="text-white/80 text-sm border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3">{mahasiswaItem?.name || '-'}</td>
                            <td className="py-3">{mahasiswaItem?.nim || '-'}</td>
                            <td className="py-3">
                              <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">
                                {peraturanItem?.kategori || '-'}
                              </span>
                            </td>
                            <td className="py-3">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">Belum ada data pelanggaran</p>
                  <p className="text-white/40 text-sm mt-2">Data akan muncul setelah ada pelanggaran yang dilaporkan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 