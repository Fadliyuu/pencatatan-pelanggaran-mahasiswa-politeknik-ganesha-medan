"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

// Import Lottie secara langsung
import Lottie from 'lottie-react';
import animationData from '@/assets/lottie/Animation - 1748593956370.json';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// Cache untuk menyimpan role user
const roleCache = new Map<string, { role: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

// Loading component
const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50" style={{ willChange: 'transform' }}>
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      <p className="mt-4 text-white text-center">Memuat...</p>
    </div>
  </div>
);

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const authChecked = useRef(false);
  const { user } = useAuth();

  // Timeout untuk loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isCheckingAuth) {
        setIsCheckingAuth(false);
        toast.error('Terjadi kesalahan saat memuat halaman. Silakan refresh halaman.');
      }
    }, 10000); // 10 detik timeout

    return () => clearTimeout(timeout);
  }, [isCheckingAuth]);

  useEffect(() => {
    if (authChecked.current || !user) {
      setIsCheckingAuth(false);
      return;
    }
    
    const checkUserRole = async () => {
      try {
        // Cek cache terlebih dahulu
        const cachedData = roleCache.get(user.uid);
        const now = Date.now();
        
        if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
          router.replace(`/${cachedData.role}/dashboard`);
          return;
        }

        // Cek di koleksi users terlebih dahulu
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (userData) {
          roleCache.set(user.uid, {
            role: userData.role,
            timestamp: now
          });
          router.replace(`/${userData.role}/dashboard`);
          return;
        }

        // Jika tidak ada di users, cek di koleksi admin
        const adminDoc = await getDoc(doc(db, 'admin', user.uid));
        if (adminDoc.exists()) {
          roleCache.set(user.uid, {
            role: 'admin',
            timestamp: now
          });
          router.replace('/admin/dashboard');
          return;
        }

        // Jika tidak ada di admin, cek di koleksi dosen
        const dosenDoc = await getDoc(doc(db, 'dosen', user.uid));
        if (dosenDoc.exists()) {
          roleCache.set(user.uid, {
            role: 'dosen',
            timestamp: now
          });
          router.replace('/dosen/dashboard');
          return;
        }

        // Jika tidak ada di semua koleksi, logout
        await auth.signOut();
        toast.error('Akun tidak ditemukan');
        router.replace('/login');
      } catch (error) {
        console.error('Error checking user role:', error);
        await auth.signOut();
        toast.error('Terjadi kesalahan saat memeriksa akun');
        router.replace('/login');
      } finally {
        authChecked.current = true;
        setIsCheckingAuth(false);
      }
    };

    checkUserRole();
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      
      // Login dengan Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      const now = Date.now();

      // Cek di koleksi users terlebih dahulu
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData) {
        roleCache.set(user.uid, {
          role: userData.role,
          timestamp: now
        });
        toast.success('Login berhasil!');
        router.replace(`/${userData.role}/dashboard`);
        return;
      }

      // Cek di koleksi admin
      const adminDoc = await getDoc(doc(db, 'admin', user.uid));
      if (adminDoc.exists()) {
        roleCache.set(user.uid, {
          role: 'admin',
          timestamp: now
        });
        toast.success('Login berhasil!');
        router.replace('/admin/dashboard');
        return;
      }

      // Cek di koleksi dosen
      const dosenDoc = await getDoc(doc(db, 'dosen', user.uid));
      if (dosenDoc.exists()) {
        roleCache.set(user.uid, {
          role: 'dosen',
          timestamp: now
        });
        toast.success('Login berhasil!');
        router.replace('/dosen/dashboard');
        return;
      }

      // Jika tidak ditemukan di semua koleksi
      await auth.signOut();
      toast.error('Akun tidak ditemukan');
      router.replace('/login');

    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('Pengguna tidak ditemukan atau tidak terdaftar.');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Password salah.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Format email tidak valid.');
      } else if (error.code === 'auth/user-disabled') {
        toast.error('Akun pengguna telah dinonaktifkan.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Terlalu banyak percobaan login. Silakan coba lagi nanti.');
      } else {
        toast.error('Login gagal. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff] relative overflow-hidden">
      {/* Loading Overlay */}
      {isLoading && <LoadingSpinner />}

      {/* Background Animation */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e2a78]/50 via-[#6e3ff6]/50 to-[#00e0ff]/50"></div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12">
          {/* Left Side - Animation */}
          <div className="w-full lg:w-1/2 max-w-lg animate-fade-in">
            <Lottie 
              animationData={animationData} 
              loop={true}
              className="w-full h-full"
            />
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full lg:w-1/2 max-w-md animate-fade-in-delay">
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
              {/* Logo */}
              <div className="text-center mb-8">
                <Link href="/" className="inline-block hover:scale-105 transition-transform duration-300">
                  <Image 
                    src="/images/logo politeknik ganesha medan.png" 
                    alt="Logo Politeknik Ganesha Medan"
                    width={80}
                    height={80}
                    className="mx-auto rounded-xl shadow-lg"
                    priority
                  />
                </Link>
                <h1 className="mt-6 text-3xl font-extrabold text-white drop-shadow-lg tracking-wide animate-fade-in-up">
                  Selamat Datang
                </h1>
                <p className="mt-2 text-base text-white/80 animate-fade-in-up-delay">
                  Masuk ke sistem pencatatan pelanggaran kedisiplinan
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-white">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-white/60" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      className="block w-full pl-10 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                      placeholder="Masukkan Email Anda"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1 animate-shake">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-white">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-white/60" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className="block w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                      placeholder="Masukkan password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <FiEyeOff className="h-5 w-5 text-white/60 hover:text-white/80 transition-colors" />
                      ) : (
                        <FiEye className="h-5 w-5 text-white/60 hover:text-white/80 transition-colors" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-400 text-sm mt-1 animate-shake">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-white text-primary-600 rounded-xl font-semibold hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-primary-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-600 mr-2"></div>
                      Memproses...
                    </div>
                  ) : (
                    'Masuk'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}