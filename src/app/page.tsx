"use client";

import { Parallax } from 'react-parallax';
import { useInView } from 'react-intersection-observer';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { collection, getDocs, query, where, addDoc, setDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { User } from 'lucide-react';
import { getMahasiswaByUserId, isAdmin } from '@/lib/firebase';
// Import Lottie secara dinamis agar SSR aman
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import bearAnimation from '@/../public/lottie/Animation - 1748593956370.json';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // State untuk statistik
  const [stats, setStats] = useState({
    mahasiswa: 0,
    dosen: 0,
    pelanggaran: 0,
    loading: true
  });

  // State untuk admin
  interface Admin {
    name: string;
    phoneNumber: string;
    email: string;
    photoURL: string;
  }

  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);

  // Animasi background gradient 3D
  useEffect(() => {
    const gradient = document.getElementById('gradient-bg');
    let angle = 0;
    let raf: number;
    function animate() {
      angle += 0.1;
      if (gradient) {
        gradient.style.background = `linear-gradient(${angle}deg, #1e2a78 0%, #6e3ff6 50%, #00e0ff 100%)`;
      }
      raf = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [mahasiswaSnap, dosenSnap, pelanggaranSnap] = await Promise.all([
          getDocs(collection(db, 'mahasiswa')),
          getDocs(collection(db, 'dosen')),
          getDocs(collection(db, 'pelanggaran')),
        ]);
        setStats({
          mahasiswa: mahasiswaSnap.size,
          dosen: dosenSnap.size,
          pelanggaran: pelanggaranSnap.size,
          loading: false
        });
      } catch (err) {
        setStats(s => ({ ...s, loading: false }));
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    // Fetch admin
    const fetchAdmins = async () => {
      setIsLoadingAdmins(true);
      try {
        console.log('Memulai fetch admin...');
        
        // Ambil dari collection 'admin'
        const adminRef = collection(db, 'admin');
        console.log('Collection reference admin:', adminRef);
        
        const adminSnapshot = await getDocs(adminRef);
        console.log('Hasil query dari collection admin:', {
          empty: adminSnapshot.empty,
          size: adminSnapshot.size,
          docs: adminSnapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
          }))
        });

        if (adminSnapshot.empty) {
          console.log('Tidak ada data admin ditemukan');
          setAdmins([]);
          return;
        }

        // Proses data admin yang ditemukan
        const adminList: Admin[] = adminSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Data admin:', data);
          return {
            name: data.name || 'Admin',
            phoneNumber: data.phoneNumber || '',
            email: data.email || '',
            photoURL: data.photoURL || ''
          };
        });

        console.log('Daftar admin yang ditemukan:', adminList);

        // Filter admin yang memiliki nomor telepon
        const validAdmins = adminList.filter(admin => {
          const hasPhone = admin.phoneNumber && admin.phoneNumber.length > 0;
          if (!hasPhone) {
            console.log('Admin tanpa nomor telepon:', admin);
          }
          return hasPhone;
        });

        console.log('Daftar admin valid:', validAdmins);
        setAdmins(validAdmins);
        
      } catch (error: any) {
        console.error('Error fetching admins:', error);
        console.error('Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        });
        setAdmins([]);
      } finally {
        setIsLoadingAdmins(false);
      }
    };

    fetchAdmins();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Cek apakah user adalah admin
          const adminStatus = await isAdmin(user.uid);
          if (adminStatus) {
            setUser({ ...user, role: 'admin' });
          } else {
            // Cek di koleksi users untuk role dosen
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists() && userDoc.data().role === 'dosen') {
              setUser({ ...user, role: 'dosen' });
            } else {
              // Jika bukan dosen, ambil data mahasiswa
              const mahasiswaData = await getMahasiswaByUserId(user.uid);
              setUser({ ...user, role: 'mahasiswa', ...mahasiswaData });
            }
          }
        } catch (error) {
          console.error('Error checking user role:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    if (user) {
      // Redirect ke dashboard sesuai role
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'dosen') {
        router.push('/dosen/dashboard');
      } else {
        router.push('/mahasiswa/dashboard');
      }
    } else {
      router.push('/login');
    }
  };

  // Fungsi untuk membuat pesan WhatsApp
  function createWhatsAppMessage(admin: Admin) {
    const message = `Halo ${admin.name}, saya ingin bertanya tentang:`;
    return encodeURIComponent(message);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background Gradient 3D */}
      <div id="gradient-bg" className="fixed inset-0 -z-10 transition-all duration-1000" style={{background: 'linear-gradient(120deg, #1e2a78 0%, #6e3ff6 50%, #00e0ff 100%)'}} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/10 backdrop-blur-md shadow-lg transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
          <div className="flex justify-between items-center h-10 sm:h-16">
            <div className="flex items-center">
              <img src="/images/logo politeknik ganesha medan.png" alt="Logo" className="h-4 w-auto sm:h-8" />
              <span className="ml-1 text-[10px] sm:text-base md:text-lg font-semibold text-white whitespace-nowrap">Politeknik Ganesha Medan</span>
            </div>
            <div className="flex items-center">
              {user ? (
                <div className="flex items-center space-x-0.5 sm:space-x-2">
                  <span className="text-[8px] text-white/80 max-w-[70px] truncate sm:max-w-none sm:text-xs">
                    {user.displayName || user.name || user.email}
                  </span>
                  <button
                    onClick={handleLogin}
                    className="flex items-center space-x-1 px-1 py-0 rounded-md bg-white/20 text-white text-[9px] hover:bg-white/30 transition-all duration-300 sm:px-2 sm:py-1 sm:text-xs"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="h-3 w-3 rounded-full sm:h-6 sm:w-6"
                      />
                    ) : (
                      <User className="h-3 w-3 text-white sm:h-6 sm:w-6" />
                    )}
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="inline sm:hidden">Dsh</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-1 py-0 rounded-md bg-white/20 text-white text-[9px] hover:bg-white/30 transition-all duration-300 sm:px-2 sm:py-1 sm:text-xs"
                >
                  Masuk
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff] opacity-90"></div>
          <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-10"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/20"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-400/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-400/20 rounded-full blur-3xl animate-float-delay"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Left Content */}
            <div className="w-full md:w-1/2 space-y-8 animate-fade-in-up">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-6xl font-bold text-white leading-tight">
                  Sistem Pencatatan
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-secondary-200">
                    Pelanggaran Kedisiplinan
                  </span>
                </h1>
                <p className="text-lg md:text-2xl text-white/80 leading-relaxed">
                  Politeknik Ganesha Medan
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleLogin}
                  className="px-8 py-4 bg-white/20 text-white font-semibold rounded-xl shadow-lg backdrop-blur-md hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  {user ? 'Masuk ke Dashboard' : 'Masuk ke Sistem'}
                </button>
                <a 
                  href="#tentang" 
                  className="px-8 py-4 bg-transparent border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-300 transform hover:scale-105"
                >
                  Pelajari Lebih Lanjut
                </a>
              </div>

              {/* Stats Preview */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{stats.loading ? '...' : stats.mahasiswa}</p>
                  <p className="text-sm text-white/70">Mahasiswa</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{stats.loading ? '...' : stats.dosen}</p>
                  <p className="text-sm text-white/70">Dosen</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{stats.loading ? '...' : stats.pelanggaran}</p>
                  <p className="text-sm text-white/70">Pelanggaran</p>
                </div>
              </div>
            </div>

            {/* Right Content - Animation */}
            <div className="w-full md:w-1/2 flex justify-center items-center animate-fade-in-up delay-200">
              <div className="relative w-[320px] h-[320px] md:w-[400px] md:h-[400px]">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-400/20 to-secondary-400/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="relative glass-card rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <Lottie animationData={bearAnimation} loop={true} style={{ width: '100%', height: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/50" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </section>

      {/* Statistik Section */}
      <section className="py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 shadow-xl animate-fade-in">
              <h3 className="text-2xl font-bold text-white mb-2">Total Mahasiswa</h3>
              <p className="text-4xl font-extrabold text-white drop-shadow-lg">{stats.loading ? '...' : stats.mahasiswa}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 shadow-xl animate-fade-in delay-100">
              <h3 className="text-2xl font-bold text-white mb-2">Total Dosen</h3>
              <p className="text-4xl font-extrabold text-white drop-shadow-lg">{stats.loading ? '...' : stats.dosen}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-lg rounded-2xl p-8 shadow-xl animate-fade-in delay-200">
              <h3 className="text-2xl font-bold text-white mb-2">Total Pelanggaran</h3>
              <p className="text-4xl font-extrabold text-white drop-shadow-lg">{stats.loading ? '...' : stats.pelanggaran}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tentang Kampus Section */}
      <section id="tentang" className="pt-32 pb-20 relative">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e2a78]/50 via-[#6e3ff6]/50 to-[#00e0ff]/50"></div>
          <div className="absolute inset-0 bg-[url('/images/grid.svg')] opacity-5"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Tentang Sistem */}
          <div className="text-center mb-20 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-white mb-6 drop-shadow">Tentang Sistem</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-xl">
              <p className="text-lg md:text-xl text-white/90 mb-6 leading-relaxed">
                Sistem Pencatatan Pelanggaran Kedisiplinan Mahasiswa adalah platform digital yang dirancang untuk mengelola dan memantau kedisiplinan mahasiswa di Politeknik Ganesha Medan. Sistem ini memungkinkan pencatatan, pemantauan, dan pengelolaan pelanggaran kedisiplinan secara efisien dan transparan.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl">
                  <h3 className="text-xl font-semibold text-white mb-3">Pencatatan Digital</h3>
                  <p className="text-white/80">Sistem pencatatan terintegrasi untuk setiap jenis pelanggaran dengan dokumentasi lengkap</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl">
                  <h3 className="text-xl font-semibold text-white mb-3">Sistem Banding</h3>
                  <p className="text-white/80">Mekanisme banding yang transparan untuk mahasiswa yang ingin mengajukan keberatan</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl">
                  <h3 className="text-xl font-semibold text-white mb-3">Laporan Real-time</h3>
                  <p className="text-white/80">Pemantauan status kedisiplinan secara real-time untuk semua pihak terkait</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tentang Politeknik */}
          <div className="text-center animate-fade-in-up delay-200">
            <h2 className="text-4xl font-bold text-white mb-6 drop-shadow">Tentang Politeknik Ganesha Medan</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="text-left space-y-4">
                  <p className="text-lg text-white/90 leading-relaxed">
                    Politeknik Ganesha Medan adalah institusi pendidikan vokasi yang berkomitmen mencetak lulusan unggul, siap kerja, dan berdaya saing global. Dengan lingkungan kampus modern, fasilitas lengkap, dan dosen profesional, kami terus berinovasi dalam memberikan pendidikan terbaik untuk generasi muda Indonesia.
                  </p>
                  <p className="text-lg text-white/90 leading-relaxed">
                    Sistem Pencatatan Pelanggaran Kedisiplinan ini hadir untuk mendukung transparansi, keadilan, dan kemudahan dalam pengelolaan tata tertib kampus. Semua proses dilakukan secara digital, real-time, dan terintegrasi.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl text-center">
                    <h4 className="text-xl font-bold text-white mb-2">Visi</h4>
                    <p className="text-white/80">Menjadi Politeknik unggul yang menghasilkan lulusan profesional dan berdaya saing global</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl text-center">
                    <h4 className="text-xl font-bold text-white mb-2">Misi</h4>
                    <p className="text-white/80">Menyelenggarakan pendidikan vokasi yang berkualitas dan berorientasi pada kebutuhan industri</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow">Fitur Utama</h2>
            <p className="text-xl text-white/80">Sistem yang dirancang untuk memudahkan pengelolaan kedisiplinan</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-white/20 backdrop-blur-lg p-6 rounded-2xl shadow-xl animate-fade-in"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="text-primary-200 text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-white">{feature.title}</h3>
                <p className="text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-white/10 backdrop-blur-lg py-20 animate-fade-in-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Siap untuk Memulai?</h2>
          <p className="text-xl text-white/80 mb-8">Bergabunglah dengan sistem kami untuk pengelolaan kedisiplinan yang lebih baik</p>
          <button type="button" className="px-8 py-3 bg-primary-600 text-white rounded-xl shadow-lg cursor-not-allowed opacity-70" disabled>
            Daftar Sekarang
          </button>
          <div className="mt-8 text-white/90 text-base max-w-xl mx-auto">
            <p className="mb-4">Untuk pendaftaran, reset password, atau masalah akun lainnya, silakan hubungi admin melalui WhatsApp:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isLoadingAdmins ? (
                <div className="col-span-2 flex flex-col items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
                  <p className="text-white/70">Memuat data admin...</p>
                </div>
              ) : admins.length > 0 ? (
                admins.map((admin, idx) => {
                  const whatsappUrl = `https://wa.me/${admin.phoneNumber}?text=${createWhatsAppMessage(admin)}`;
                  
                  return (
                    <a
                      key={idx}
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-300 transform hover:scale-105"
                    >
                      {admin.photoURL ? (
                        <img 
                          src={admin.photoURL} 
                          alt={admin.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      )}
                      <span className="font-medium">{admin.name}</span>
                    </a>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-4">
                  <p className="text-white/70">Mohon maaf, layanan admin sedang tidak tersedia. Silakan coba beberapa saat lagi.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const features = [
  {
    title: "Pencatatan Digital",
    description: "Catat dan kelola pelanggaran dengan mudah secara digital",
    icon: "📝",
  },
  {
    title: "Sistem Banding",
    description: "Ajukan banding untuk pelanggaran yang dianggap tidak sesuai",
    icon: "⚖️",
  },
  {
    title: "Laporan Real-time",
    description: "Pantau status kedisiplinan secara real-time",
    icon: "📊",
  },
];

// Glassmorphism card style
// Tambahkan di globals.css:
// .glass-card { background: rgba(255,255,255,0.15); box-shadow: 0 8px 32px 0 rgba(31,38,135,0.37); backdrop-filter: blur(8px); border-radius: 20px; border: 1px solid rgba(255,255,255,0.18); }