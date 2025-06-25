importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Konfigurasi Firebase akan diambil dari environment variables
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID
});

const messaging = firebase.messaging();

// Menangani notifikasi saat aplikasi di background
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
    badge: '/badge.png',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'Buka'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Menangani klik pada notifikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    // Buka tab baru dengan URL yang sesuai
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
}); 