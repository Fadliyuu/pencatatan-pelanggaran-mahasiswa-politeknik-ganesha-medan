'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Fungsi untuk memformat nomor telepon
const formatPhoneNumber = (phone: string) => {
  // Hapus semua karakter non-digit
  const cleaned = phone.replace(/\D/g, '');
  
  // Jika nomor dimulai dengan '0', ganti dengan '62'
  if (cleaned.startsWith('0')) {
    return '62' + cleaned.substring(1);
  }
  
  // Jika nomor dimulai dengan '62', biarkan
  if (cleaned.startsWith('62')) {
    return cleaned;
  }
  
  // Jika nomor dimulai dengan '8' atau '9', tambahkan '62'
  if (cleaned.startsWith('8') || cleaned.startsWith('9')) {
    return '62' + cleaned;
  }
  
  return cleaned;
};

export default function LupaPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nim, setNim] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<Array<{ name: string; phoneNumber: string }>>([]);

  useEffect(() => {
    const fetchAdmins = async () => {
      const adminsRef = collection(db, 'users');
      const q = query(adminsRef, where('role', '==', 'admin'));
      const querySnapshot = await getDocs(q);
      const adminList = querySnapshot.docs.map(doc => ({
        name: doc.data().name || 'Admin',
        phoneNumber: formatPhoneNumber(doc.data().phoneNumber || '')
      }));
      setAdmins(adminList);
    };
    fetchAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Cek apakah email dan NIM cocok di Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), where('nim', '==', nim));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Email atau NIM tidak ditemukan. Silakan coba lagi atau hubungi admin.');
        setLoading(false);
        return;
      }

      // Kirim email reset password
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setSuccess('Link reset password telah dikirim ke email Anda. Silakan cek inbox atau folder spam.');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba lagi atau hubungi admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff] relative overflow-hidden">
      {/* Card Glassmorphism */}
      <div className="relative z-10 w-full max-w-md mx-auto p-8 shadow-2xl rounded-3xl bg-white/20 backdrop-blur-lg border border-white/30 animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image 
              src="/images/logo politeknik ganesha medan.png" 
              alt="Logo Politeknik Ganesha Medan"
              width={70}
              height={70}
              className="mx-auto rounded-lg shadow-lg"
            />
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold text-white drop-shadow-lg tracking-wide animate-fade-in-up">Lupa Password</h1>
          <p className="mt-2 text-base text-white/80 animate-fade-in-up delay-100">
            Masukkan email dan NIM Anda untuk reset password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="Masukkan email Anda"
              required
            />
          </div>

          <div>
            <label htmlFor="nim" className="block text-sm font-medium text-white">NIM</label>
            <input
              type="text"
              id="nim"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="Masukkan NIM Anda"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-500 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-white/20 hover:bg-white/30 text-white font-medium rounded-md transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Kirim Link Reset Password'}
          </button>

          <div className="text-center mt-4">
            <Link href="/login" className="text-white/80 hover:text-white text-sm">
              Kembali ke Login
            </Link>
          </div>

          <div className="text-center mt-4 text-white/80 text-sm">
            Jika mengalami kesulitan, silakan hubungi admin berikut:
            <div className="mt-2 space-y-1">
              {admins.map((admin, index) => (
                <div key={index}>
                  <a 
                    href={`https://wa.me/${admin.phoneNumber}?text=${encodeURIComponent('Halo Admin, saya mengalami masalah terkait reset password di aplikasi Politeknik Ganesha Medan.')}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-white hover:underline"
                  >
                    {admin.name} (WhatsApp)
                  </a>
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 