import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sign } from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validasi input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Cari user berdasarkan email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Email tidak ditemukan' },
        { status: 404 }
      );
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Verifikasi password
    const isValid = await compare(password, userData.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Password salah' },
        { status: 401 }
      );
    }

    // Buat JWT token
    const token = sign(
      {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
      process.env.NEXTAUTH_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    // Set cookie
    const response = NextResponse.json({
      message: 'Login berhasil',
      user: {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 hari
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  }
} 