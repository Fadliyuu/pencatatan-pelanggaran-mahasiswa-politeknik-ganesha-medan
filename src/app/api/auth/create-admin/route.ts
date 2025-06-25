import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const {
      email,
      password,
      name,
      nip,
      jabatan,
      noHp,
      alamat,
      foto
    } = await request.json();

    // Validasi input
    if (!email || !password || !name || !nip) {
      return NextResponse.json(
        { error: 'Email, password, nama, dan NIP harus diisi' },
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

    // Data admin lengkap
    const adminData = {
      email,
      password: hashedPassword,
      name,
      nip,
      jabatan: jabatan || 'Admin',
      noHp: noHp || '',
      alamat: alamat || '',
      foto: foto || '',
      role: 'admin',
      status: 'aktif',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Simpan ke Firestore
    const docRef = await addDoc(usersRef, adminData);

    return NextResponse.json({
      message: 'Admin berhasil ditambahkan',
      adminId: docRef.id,
      admin: {
        id: docRef.id,
        email: adminData.email,
        name: adminData.name,
        nip: adminData.nip,
        jabatan: adminData.jabatan,
        role: adminData.role
      }
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat membuat admin' },
      { status: 500 }
    );
  }
} 