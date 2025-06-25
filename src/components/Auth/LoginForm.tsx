'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

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
      console.log('Mencoba login dengan:', data.email);

      // Login dengan Firebase Auth
      const userCredential = await signIn(data.email, data.password);
      console.log('Firebase Auth berhasil, UID:', userCredential.uid);
      
      // Coba ambil data dari koleksi users dengan query
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', data.email));
      const querySnapshot = await getDocs(q);
      let userData = null;

      if (!querySnapshot.empty) {
        userData = querySnapshot.docs[0].data();
        console.log('Data dari koleksi users:', userData);
      } else {
        // Jika tidak ditemukan di users, coba di koleksi mahasiswa
        console.log('Data tidak ditemukan di users, mencoba di mahasiswa...');
        const mahasiswaRef = collection(db, 'mahasiswa');
        const mahasiswaQuery = query(mahasiswaRef, where('email', '==', data.email));
        const mahasiswaSnapshot = await getDocs(mahasiswaQuery);

        if (!mahasiswaSnapshot.empty) {
          userData = {
            ...mahasiswaSnapshot.docs[0].data(),
            role: 'mahasiswa'
          };
          console.log('Data dari koleksi mahasiswa:', userData);
        }
      }

      if (!userData) {
        console.error('Data tidak ditemukan di kedua koleksi');
        throw new Error('Data pengguna tidak ditemukan');
      }

      console.log('Data pengguna ditemukan:', userData);

      // Redirect berdasarkan role
      switch (userData.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'dosen':
          router.push('/dosen/dashboard');
          break;
        case 'mahasiswa':
          router.push('/mahasiswa/dashboard');
          break;
        default:
          router.push('/dashboard');
      }

      toast.success('Login berhasil');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found') {
        toast.error('Email tidak ditemukan');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Password salah');
      } else {
        toast.error(error.message || 'Gagal login. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          placeholder="nama@poligamed.ac.id"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Ingat saya
          </label>
        </div>

        <div className="text-sm">
          <Link href="/lupa-password" className="font-medium text-primary-600 hover:text-primary-500">
            Lupa password?
          </Link>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Memproses...' : 'Masuk'}
        </button>
      </div>
    </form>
  );
} 