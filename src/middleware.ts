import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Inisialisasi Firebase Admin jika belum ada
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Cache untuk menyimpan hasil verifikasi
const sessionCache = new Map<string, { role: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Jika user sudah di halaman login, tidak perlu redirect
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Cek session
  const session = request.cookies.get('session');

  // Jika tidak ada session dan bukan di halaman login, redirect ke login
  if (!session && !pathname.startsWith('/login')) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Jika ada session, cek role
  if (session) {
    try {
      // Cek cache terlebih dahulu
      const cachedData = sessionCache.get(session.value);
      const now = Date.now();
      
      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        // Gunakan data dari cache
        const { role } = cachedData;
        
        // Redirect berdasarkan role jika diperlukan
        if (pathname.startsWith('/admin') && role !== 'admin') {
          return redirectBasedOnRole(role, request.url);
        }
        if (pathname.startsWith('/dosen') && role !== 'dosen') {
          return redirectBasedOnRole(role, request.url);
        }
        if (pathname.startsWith('/mahasiswa') && role !== 'mahasiswa') {
          return redirectBasedOnRole(role, request.url);
        }
        
        return NextResponse.next();
      }

      // Jika tidak ada di cache, lakukan verifikasi
      const response = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `session=${session.value}`
        }
      });

      if (!response.ok) {
        throw new Error('Session tidak valid');
      }

      const data = await response.json();
      
      // Simpan ke cache
      sessionCache.set(session.value, {
        role: data.role,
        timestamp: now
      });

      // Redirect berdasarkan role jika diperlukan
      if (pathname.startsWith('/admin') && data.role !== 'admin') {
        return redirectBasedOnRole(data.role, request.url);
      }
      if (pathname.startsWith('/dosen') && data.role !== 'dosen') {
        return redirectBasedOnRole(data.role, request.url);
      }
      if (pathname.startsWith('/mahasiswa') && data.role !== 'mahasiswa') {
        return redirectBasedOnRole(data.role, request.url);
      }

      return NextResponse.next();
    } catch (error) {
      console.error('Error verifying session:', error);
      // Hapus cookie session yang tidak valid
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      sessionCache.delete(session.value);
      return response;
    }
  }

  return NextResponse.next();
}

// Helper function untuk redirect berdasarkan role
function redirectBasedOnRole(role: string, currentUrl: string) {
  switch (role) {
    case 'admin':
      return NextResponse.redirect(new URL('/admin/dashboard', currentUrl));
    case 'dosen':
      return NextResponse.redirect(new URL('/dosen/dashboard', currentUrl));
    case 'mahasiswa':
      return NextResponse.redirect(new URL('/mahasiswa/dashboard', currentUrl));
    default:
      return NextResponse.redirect(new URL('/login', currentUrl));
  }
}

// Konfigurasi path yang perlu dilindungi
export const config = {
  matcher: [
    '/admin/:path*',
    '/dosen/:path*',
    '/mahasiswa/:path*',
    '/login'
  ]
}; 