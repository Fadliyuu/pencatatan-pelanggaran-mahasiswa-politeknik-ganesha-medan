import React, { useState, useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/firebase';

interface PermissionStatus {
  success: boolean;
  message: string;
  instructions?: string[];
}

const NotificationPermissionHandler: React.FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    setIsLoading(true);
    try {
      // Cek apakah browser mendukung notifikasi
      if (!('Notification' in window)) {
        setPermissionStatus({
          success: false,
          message: 'Browser Anda tidak mendukung notifikasi'
        });
        return;
      }

      // Cek status izin saat ini
      if (Notification.permission === 'denied') {
        setIsBlocked(true);
        setPermissionStatus({
          success: false,
          message: 'Izin notifikasi diblokir. Untuk mengaktifkan notifikasi:',
          instructions: [
            '1. Klik ikon kunci/tune di sebelah URL browser',
            '2. Pilih "Pengaturan Situs" atau "Site Settings"',
            '3. Cari "Notifikasi" atau "Notifications"',
            '4. Ubah pengaturan untuk situs ini menjadi "Izinkan" atau "Allow"',
            '5. Refresh halaman setelah mengubah pengaturan'
          ]
        });
        return;
      }

      const result = await requestNotificationPermission();
      setPermissionStatus(result);
    } catch (error) {
      console.error('Error checking notification permission:', error);
      setPermissionStatus({
        success: false,
        message: 'Terjadi kesalahan saat memeriksa izin notifikasi'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const result = await requestNotificationPermission();
      setPermissionStatus(result);
      setIsBlocked(false);
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setPermissionStatus({
        success: false,
        message: 'Terjadi kesalahan saat meminta izin notifikasi'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (permissionStatus?.success) {
    return (
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-medium">
            {permissionStatus.message}
          </p>
        </div>
      </div>
    );
  }

  if (isBlocked || permissionStatus?.instructions) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-start mb-3">
          <svg className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-yellow-800 font-medium mb-2">
              {permissionStatus?.message}
            </h3>
            <ul className="list-decimal list-inside text-yellow-700 space-y-1">
              {permissionStatus?.instructions?.map((instruction, index) => (
                <li key={index} className="ml-4">{instruction}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => window.location.reload()}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
          >
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <div className="flex items-start mb-3">
        <svg className="h-5 w-5 text-blue-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-blue-800">
          {permissionStatus?.message || 'Aktifkan notifikasi untuk mendapatkan informasi terbaru'}
        </p>
      </div>
      <button
        onClick={handleRequestPermission}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        Aktifkan Notifikasi
      </button>
    </div>
  );
};

export default NotificationPermissionHandler; 