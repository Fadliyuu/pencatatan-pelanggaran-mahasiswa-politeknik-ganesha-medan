'use client';

import { useEffect } from 'react';
import { scheduleNotificationCleanup } from '@/lib/firebase';
import AuthProvider from '@/components/Providers/AuthProvider';
import { Toaster } from 'react-hot-toast';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // Jalankan pembersihan notifikasi saat aplikasi dimuat
  useEffect(() => {
    scheduleNotificationCleanup();
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster position="top-right" />
    </AuthProvider>
  );
} 