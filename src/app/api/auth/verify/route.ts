import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';

// Cache untuk menyimpan hasil verifikasi
const verifyCache = new Map<string, { role: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

export async function GET() {
  try {
    const session = cookies().get('session');

    if (!session) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    // Cek cache terlebih dahulu
    const cachedData = verifyCache.get(session.value);
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return NextResponse.json({ role: cachedData.role });
    }

    // Verifikasi session dengan Firebase Admin SDK
    const decodedToken = await getAuth().verifySessionCookie(session.value, true);
    
    // Cek role di Firestore
    const adminRef = doc(db, 'admin', decodedToken.uid);
    const adminDoc = await getDoc(adminRef);

    let role = 'mahasiswa'; // Default role

    if (adminDoc.exists()) {
      role = 'admin';
    } else {
      // Cek role dosen
      const dosenRef = doc(db, 'dosen', decodedToken.uid);
      const dosenDoc = await getDoc(dosenRef);
      if (dosenDoc.exists()) {
        role = 'dosen';
      }
    }

    // Simpan ke cache
    verifyCache.set(session.value, {
      role,
      timestamp: now
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error verifying session:', error);
    return NextResponse.json({ role: null }, { status: 401 });
  }
} 