import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    // Validasi input
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Semua field harus diisi' },
        { status: 400 }
      );
    }

    // Cek apakah email sudah terdaftar
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Simpan user baru
    const newUser = {
      email,
      password: hashedPassword,
      name,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(usersRef, newUser);

    return NextResponse.json({
      message: 'User berhasil didaftarkan',
      userId: docRef.id,
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat registrasi' },
      { status: 500 }
    );
  }
} 