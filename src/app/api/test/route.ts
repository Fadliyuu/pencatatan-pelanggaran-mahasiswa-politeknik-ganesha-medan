import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    // Test koneksi Firebase Admin
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      status: 'success',
      message: 'API berfungsi dengan baik',
      timestamp: new Date().toISOString(),
      firebase: {
        connected: true,
        usersCount: users.length,
        users: users.map(user => ({
          id: user.id,
          email: user.email || '',
          role: user.role || ''
        }))
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasFirebaseConfig: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasFirebaseAdminConfig: !!process.env.FIREBASE_PROJECT_ID,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
      }
    });
  } catch (error: any) {
    console.error('Test API error:', error);
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Terjadi kesalahan',
      timestamp: new Date().toISOString(),
      firebase: {
        connected: false,
        error: error.message,
        errorCode: error.code,
        errorInfo: error.errorInfo
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasFirebaseConfig: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasFirebaseAdminConfig: !!process.env.FIREBASE_PROJECT_ID,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
      }
    }, { status: 500 });
  }
} 