import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export async function POST(request: Request) {
  try {
    // Inisialisasi Firebase Admin jika belum ada
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    const { token, notification } = await request.json();

    if (!token || !notification) {
      return NextResponse.json(
        { error: 'Token dan notification diperlukan' },
        { status: 400 }
      );
    }

    const message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data || {},
      webpush: {
        fcmOptions: {
          link: notification.data?.url || '/',
        },
      },
    };

    const response = await getMessaging().send(message);
    
    return NextResponse.json({ success: true, messageId: response });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim notifikasi' },
      { status: 500 }
    );
  }
} 