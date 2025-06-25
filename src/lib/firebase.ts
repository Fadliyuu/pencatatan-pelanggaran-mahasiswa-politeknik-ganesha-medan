import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, addDoc, updateDoc, doc, deleteDoc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validasi konfigurasi
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error(`Missing Firebase config: ${key}`);
  }
});

// Initialize Firebase
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  console.log('Firebase berhasil diinisialisasi');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };

// Fungsi untuk mengambil data peraturan
export const getPeraturan = async () => {
  const peraturanRef = collection(db, 'peraturan');
  const q = query(peraturanRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

interface PeraturanData {
  nama: string;
  kategori: string;
  poin: number;
}

// Fungsi untuk mengambil data pelanggaran berdasarkan mahasiswaId
export const getPelanggaranByMahasiswaId = async (userId: string) => {
  try {
    console.log("=== Mulai getPelanggaranByMahasiswaId ===");
    console.log("Parameter userId:", userId);

    // Pertama, dapatkan ID dokumen mahasiswa
    const mahasiswaRef = collection(db, "mahasiswa");
    const mahasiswaQuery = query(mahasiswaRef, where("uid", "==", userId));
    const mahasiswaSnapshot = await getDocs(mahasiswaQuery);

    if (mahasiswaSnapshot.empty) {
      console.log("Data mahasiswa tidak ditemukan");
      return [];
    }

    const mahasiswaDoc = mahasiswaSnapshot.docs[0];
    const mahasiswaId = mahasiswaDoc.id;
    console.log("ID dokumen mahasiswa:", mahasiswaId);

    // Gunakan ID dokumen mahasiswa untuk mencari pelanggaran
    const pelanggaranRef = collection(db, "pelanggaran");
    const q = query(pelanggaranRef, where("mahasiswaId", "==", mahasiswaId));
    console.log("Query dibuat dengan filter mahasiswaId =", mahasiswaId);
    
    const querySnapshot = await getDocs(q);
    console.log("Jumlah dokumen yang ditemukan:", querySnapshot.size);

    if (querySnapshot.empty) {
      console.log("Tidak ada data pelanggaran ditemukan untuk mahasiswaId:", mahasiswaId);
      return [];
    }

    const pelanggaranData = await Promise.all(querySnapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      console.log("Data mentah pelanggaran:", data);
      
      // Ambil data peraturan
      let peraturanData: PeraturanData = {
        nama: "Peraturan tidak ditemukan",
        kategori: "Tidak diketahui",
        poin: 0
      };
      
      if (data.peraturanId) {
        const peraturanDocRef = doc(db, "peraturan", data.peraturanId);
        const peraturanDoc = await getDoc(peraturanDocRef);
        if (peraturanDoc.exists()) {
          const peraturanDocData = peraturanDoc.data() as PeraturanData;
          peraturanData = {
            nama: peraturanDocData.nama || "Peraturan tidak ditemukan",
            kategori: peraturanDocData.kategori || "Tidak diketahui",
            poin: peraturanDocData.poin || 0
          };
          console.log("Data peraturan ditemukan:", peraturanData);
        } else {
          console.log("Data peraturan tidak ditemukan untuk ID:", data.peraturanId);
        }
      }
      
      return {
        id: docSnapshot.id,
        peraturanId: data.peraturanId,
        tanggal: data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.tanggal),
        keterangan: data.keterangan || "",
        buktiURLs: data.buktiURLs || [],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        peraturan: peraturanData
      };
    }));

    console.log("Data pelanggaran yang ditemukan:", pelanggaranData);
    return pelanggaranData;
  } catch (error) {
    console.error("Error dalam getPelanggaranByMahasiswaId:", error);
    throw new Error("Gagal mengambil data pelanggaran");
  }
};

// Fungsi untuk mengambil data pengumuman
export const getPengumuman = async () => {
  const pengumumanRef = collection(db, 'pengumuman');
  const q = query(pengumumanRef, orderBy('tanggal', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Fungsi untuk upload gambar ke Cloudinary
export const uploadImageToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();
  return data.secure_url;
};

// Fungsi untuk membuat laporan baru
export const createLaporan = async (laporanData: any) => {
  try {
    console.log("Membuat laporan baru:", laporanData);
    
    // Tambahkan laporan ke koleksi laporan
    const laporanRef = doc(db, "laporan", laporanData.id);
    await setDoc(laporanRef, laporanData);
    
    console.log("Laporan berhasil dibuat dengan ID:", laporanData.id);
    return laporanData.id;
  } catch (error) {
    console.error("Error creating laporan:", error);
    throw new Error("Gagal membuat laporan");
  }
};

// Fungsi untuk membuat banding baru
export const createBanding = async (bandingData: {
  pelanggaranId: string;
  mahasiswaId: string;
  alasan: string;
  fotoURL?: string;
}) => {
  const bandingRef = collection(db, 'banding');
  const newBanding = {
    ...bandingData,
    tanggal: new Date().toISOString(),
    status: 'Menunggu',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return await addDoc(bandingRef, newBanding);
};

// Fungsi untuk mengambil semua laporan
export const getLaporan = async () => {
  const laporanRef = collection(db, 'laporan');
  const q = query(laporanRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Fungsi untuk mengambil semua banding
export const getBanding = async () => {
  const bandingRef = collection(db, 'banding');
  const q = query(bandingRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

// Fungsi untuk mengambil semua data mahasiswa
export const getMahasiswa = async () => {
  try {
    console.log('Mencoba mengambil data mahasiswa...');
    const mahasiswaRef = collection(db, 'mahasiswa');
    const q = query(mahasiswaRef, orderBy('createdAt', 'desc'));
    
    console.log('Mengambil data dari Firestore...');
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('Tidak ada data mahasiswa ditemukan');
      return [];
    }

    const mahasiswaData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Berhasil mengambil ${mahasiswaData.length} data mahasiswa:`, mahasiswaData);
    return mahasiswaData;
  } catch (error) {
    console.error('Error dalam getMahasiswa:', error);
    throw new Error('Gagal mengambil data mahasiswa: ' + (error as Error).message);
  }
};

interface MahasiswaData {
  id: string;
  nim?: string;
  name: string;
  email: string;
  password?: string;
  alamat?: string;
  tanggalLahir: string;
  agama?: string;
  angkatan?: string;
  programStudi?: string;
  photoURL?: string;
  totalPoin?: number;
  status?: string;
  uid?: string;
  settings?: {
    notifikasiRealtime: boolean;
    notifikasiEmail: boolean;
    notifikasiWeb: boolean;
    notifikasiMobile: boolean;
    darkMode: boolean;
    bahasa: string;
    privasi: {
      tampilkanProfil: boolean;
      tampilkanRiwayat: boolean;
    };
  };
}

export const createMahasiswa = async (data: MahasiswaData) => {
  try {
    // Siapkan data untuk Firebase Auth
    let loginId = '';
    
    // 1. Coba gunakan NIM jika ada
    if (data.nim) {
      loginId = data.nim.replace(/[^0-9]/g, ''); // Hanya angka
    } 
    // 2. Jika tidak ada NIM, gunakan nama
    else {
      loginId = data.name
        .toLowerCase()
        .replace(/[^a-z]/g, '') // Hanya huruf kecil
        .substring(0, 5); // Batasi panjang sangat pendek
    }

    // Pastikan loginId tidak kosong dan minimal 3 karakter
    if (!loginId || loginId.length < 3) {
      throw new Error('Login ID tidak valid (minimal 3 karakter)');
    }

    // Buat email dengan format yang sangat sederhana
    const email = `${loginId}@test.com`;
    const password = data.password || data.tanggalLahir;

    console.log('Creating account with:', { email, password });

    // Buat akun Firebase Auth baru
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Tambahkan data ke Firestore dengan UID sebagai ID dokumen
    const docRef = doc(db, 'mahasiswa', userCredential.user.uid);
    await setDoc(docRef, {
      ...data,
      email,
      password,
      uid: userCredential.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return userCredential.user.uid;
  } catch (error) {
    console.error('Error creating mahasiswa:', error);
    throw error;
  }
};

export const updateMahasiswa = async (id: string, data: Partial<MahasiswaData>) => {
  try {
    const docRef = doc(db, 'mahasiswa', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating mahasiswa:', error);
    throw error;
  }
};

export const deleteMahasiswa = async (id: string) => {
  try {
    const docRef = doc(db, 'mahasiswa', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting mahasiswa:', error);
    throw error;
  }
};

// Fungsi untuk menambah pelanggaran baru
export const createPelanggaran = async (data: {
  mahasiswaId: string;
  peraturanId: string;
  tanggal: string;
  keterangan: string;
  buktiURLs?: string[];
}) => {
  try {
    const pelanggaranRef = collection(db, "pelanggaran");
    const newPelanggaran = {
      ...data,
      buktiURLs: data.buktiURLs || [], // Simpan array buktiURLs
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(pelanggaranRef, newPelanggaran);
    console.log("Pelanggaran berhasil dibuat dengan ID:", docRef.id);

    // Update total poin mahasiswa
    const peraturanRef = doc(db, "peraturan", data.peraturanId);
    const peraturanDoc = await getDoc(peraturanRef);
    
    if (peraturanDoc.exists()) {
      const peraturanData = peraturanDoc.data();
      const mahasiswaRef = doc(db, "mahasiswa", data.mahasiswaId);
      const mahasiswaDoc = await getDoc(mahasiswaRef);
      
      if (mahasiswaDoc.exists()) {
        const mahasiswaData = mahasiswaDoc.data();
        const currentPoin = mahasiswaData.totalPoin || 0;
        const newPoin = currentPoin + (peraturanData.poin || 0);
        
        await updateDoc(mahasiswaRef, {
          totalPoin: newPoin,
          updatedAt: new Date().toISOString()
        });
        
        console.log("Total poin mahasiswa berhasil diperbarui:", newPoin);
      }
    }

    return docRef.id;
  } catch (error) {
    console.error("Error dalam createPelanggaran:", error);
    throw new Error("Gagal membuat pelanggaran baru");
  }
};

// Fungsi untuk mengupdate pelanggaran
export const updatePelanggaran = async (id: string, data: Partial<{
  peraturanId: string;
  tanggal: string;
  poin: number;
  buktiURL: string;
  keterangan: string;
}>) => {
  const pelanggaranRef = doc(db, 'pelanggaran', id);
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  return await updateDoc(pelanggaranRef, updateData);
};

// Fungsi untuk membuat pengumuman baru
export const createPengumuman = async (pengumumanData: {
  judul: string;
  isi: string;
  gambarURL?: string;
}) => {
  const pengumumanRef = collection(db, 'pengumuman');
  const newPengumuman = {
    ...pengumumanData,
    tanggal: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  return await addDoc(pengumumanRef, newPengumuman);
};

// Fungsi untuk mengupdate pengumuman
export const updatePengumuman = async (id: string, data: Partial<{
  judul: string;
  isi: string;
  gambarURL: string;
}>) => {
  const pengumumanRef = doc(db, 'pengumuman', id);
  const updateData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  return await updateDoc(pengumumanRef, updateData);
};

// Fungsi untuk mengambil semua data pelanggaran
export const getPelanggaran = async () => {
  try {
    console.log('Mencoba mengambil data pelanggaran...');
    const pelanggaranRef = collection(db, 'pelanggaran');
    const q = query(pelanggaranRef, orderBy('createdAt', 'desc'));
    
    console.log('Mengambil data dari Firestore...');
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('Tidak ada data pelanggaran ditemukan');
      return [];
    }

    const pelanggaranData = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      console.log('Data mentah pelanggaran:', data);
      
      // Ambil data peraturan
      let peraturanData = {
        nama: 'Peraturan tidak ditemukan',
        kategori: 'Tidak diketahui',
        poin: 0
      };
      
      if (data.peraturanId) {
        const peraturanDocRef = doc(db, 'peraturan', data.peraturanId);
        const peraturanDoc = await getDoc(peraturanDocRef);
        if (peraturanDoc.exists()) {
          const peraturanDocData = peraturanDoc.data();
          peraturanData = {
            nama: peraturanDocData.nama || 'Peraturan tidak ditemukan',
            kategori: peraturanDocData.kategori || 'Tidak diketahui',
            poin: peraturanDocData.poin || 0
          };
          console.log('Data peraturan ditemukan:', peraturanData);
        } else {
          console.log('Data peraturan tidak ditemukan untuk ID:', data.peraturanId);
        }
      }
      
      return {
        id: docSnapshot.id,
        mahasiswaId: data.mahasiswaId,
        peraturanId: data.peraturanId,
        tanggal: data.tanggal?.toDate ? data.tanggal.toDate() : new Date(data.tanggal),
        poin: data.poin || 0,
        buktiURLs: data.buktiURLs || [],
        keterangan: data.keterangan || '',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
        peraturan: peraturanData
      };
    }));
    
    console.log(`Berhasil mengambil ${pelanggaranData.length} data pelanggaran:`, pelanggaranData);
    return pelanggaranData;
  } catch (error) {
    console.error('Error dalam getPelanggaran:', error);
    throw new Error('Gagal mengambil data pelanggaran: ' + (error as Error).message);
  }
};

// Fungsi untuk menambahkan notifikasi saat admin membuat pengumuman
export const addPengumumanNotifikasi = async (adminName: string, judul: string) => {
  try {
    const mahasiswaRef = collection(db, 'mahasiswa');
    const mahasiswaSnapshot = await getDocs(mahasiswaRef);
    
    const notifikasiPromises = mahasiswaSnapshot.docs.map(async doc => {
      try {
        const mahasiswaData = doc.data();
        await addNotifikasi({
          userId: mahasiswaData.uid,
          title: 'Pengumuman Baru',
          message: `${adminName} telah membuat pengumuman baru: ${judul}`,
          type: 'pengumuman'
        });
      } catch (err) {
        console.error('Gagal mengirim notifikasi ke mahasiswa:', doc.id, err);
        // Lanjutkan proses meski ada error individual
      }
    });

    await Promise.all(notifikasiPromises);
    return true;
  } catch (error) {
    console.error("Error adding pengumuman notifications:", error);
    throw error;
  }
};

// Fungsi untuk menambahkan notifikasi saat admin menambahkan acara kalender
export const addKalenderNotifikasi = async (adminName: string, judul: string) => {
  try {
    const mahasiswaRef = collection(db, 'mahasiswa');
    const mahasiswaSnapshot = await getDocs(mahasiswaRef);
    
    const notifikasiPromises = mahasiswaSnapshot.docs.map(doc => {
      const mahasiswaData = doc.data();
      return addNotifikasi({
        userId: mahasiswaData.uid,
        title: 'Acara Baru',
        message: `${adminName} telah menambahkan acara baru: ${judul}`,
        type: 'kalender'
      });
    });

    await Promise.all(notifikasiPromises);
  } catch (error) {
    console.error("Error adding kalender notifications:", error);
    throw error;
  }
};

// Fungsi untuk menambahkan notifikasi saat admin memberikan sanksi pelanggaran
export const addPelanggaranNotifikasi = async (mahasiswaId: string, adminName: string, peraturanNama: string) => {
  try {
    await addNotifikasi({
      userId: mahasiswaId,
      title: 'Pelanggaran Baru',
      message: `${adminName} telah memberikan sanksi pelanggaran: ${peraturanNama}`,
      type: 'pelanggaran'
    });
  } catch (error) {
    console.error("Error adding pelanggaran notification:", error);
    throw error;
  }
};

// Fungsi untuk menambahkan notifikasi saat laporan disetujui/ditolak
export const addLaporanStatusNotifikasi = async (mahasiswaId: string, adminName: string, status: 'Disetujui' | 'Ditolak') => {
  try {
    await addNotifikasi({
      userId: mahasiswaId,
      title: 'Status Laporan Diperbarui',
      message: `Laporan Anda telah ${status.toLowerCase()} oleh ${adminName}`,
      type: 'laporan'
    });
  } catch (error) {
    console.error("Error adding laporan status notification:", error);
    throw error;
  }
};

// Fungsi untuk menambahkan notifikasi saat banding disetujui/ditolak
export const addBandingStatusNotifikasi = async (mahasiswaId: string, adminName: string, status: 'Diterima' | 'Ditolak') => {
  try {
    await addNotifikasi({
      userId: mahasiswaId,
      title: 'Status Banding Diperbarui',
      message: `Banding Anda telah ${status.toLowerCase()} oleh ${adminName}`,
      type: 'banding'
    });
  } catch (error) {
    console.error("Error adding banding status notification:", error);
    throw error;
  }
};

// Fungsi untuk menambahkan notifikasi saat pelanggaran dihapus
export const addPelanggaranDihapusNotifikasi = async (mahasiswaId: string, adminName: string, peraturanNama: string) => {
  try {
    await addNotifikasi({
      userId: mahasiswaId,
      title: 'Pelanggaran Dihapus',
      message: `${adminName} telah menghapus sanksi pelanggaran: ${peraturanNama}`,
      type: 'pelanggaran'
    });
  } catch (error) {
    console.error("Error adding pelanggaran deleted notification:", error);
    throw error;
  }
};

interface Settings {
  notifikasiRealtime: boolean;
  notifikasiEmail: boolean;
  notifikasiWeb: boolean;
  notifikasiMobile: boolean;
  darkMode: boolean;
  bahasa: string;
  privasi: {
    tampilkanProfil: boolean;
    tampilkanRiwayat: boolean;
  };
}

export const updateMahasiswaSettings = async (userId: string, settings: Settings) => {
  try {
    const q = query(collection(db, 'mahasiswa'), where('uid', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('Data mahasiswa tidak ditemukan');
    }

    const docRef = doc(db, 'mahasiswa', querySnapshot.docs[0].id);
    await updateDoc(docRef, {
      settings: settings,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error updating mahasiswa settings:", error);
    throw error;
  }
};

// Fungsi untuk menghapus pengumuman
export const deletePengumuman = async (id: string) => {
  try {
    const pengumumanRef = doc(db, 'pengumuman', id);
    await deleteDoc(pengumumanRef);
  } catch (error) {
    console.error('Error deleting pengumuman:', error);
    throw error;
  }
};

// Fungsi untuk mengambil semua acara kalender
export const getKalenderEvents = async () => {
  try {
    const kalenderRef = collection(db, 'kalender');
    const q = query(kalenderRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      // Pastikan semua field yang diperlukan ada
      return {
        id: doc.id,
        title: data.title || '',
        date: data.date,
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        location: data.location || '',
        description: data.description || '',
        color: data.color || 'bg-primary-100 text-primary-800',
        category: data.category || 'other',
        allDay: data.allDay || false
      };
    });
    
    console.log('Raw events from Firebase:', events); // Debug log
    return events;
  } catch (error) {
    console.error('Error getting kalender events:', error);
    throw error;
  }
};

// Fungsi untuk menambah acara kalender baru
export const createKalenderEvent = async (eventData: {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  color: string;
  category: string;
  allDay?: boolean;
  targetPenerima?: {
    programStudi: string[];
    angkatan: string[];
    status: string[];
    agama: string[];
    jalur: string[];
    totalPoin: {
      operator: 'kurang' | 'lebih' | 'sama';
      nilai: number;
    } | null;
  };
}) => {
  try {
    const kalenderRef = collection(db, 'kalender');
    const newEvent = {
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return await addDoc(kalenderRef, newEvent);
  } catch (error) {
    console.error('Error creating kalender event:', error);
    throw error;
  }
};

// Fungsi untuk mengupdate acara kalender
export const updateKalenderEvent = async (id: string, data: Partial<{
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  color: string;
  category: string;
  allDay: boolean;
}>) => {
  try {
    const eventRef = doc(db, 'kalender', id);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    return await updateDoc(eventRef, updateData);
  } catch (error) {
    console.error('Error updating kalender event:', error);
    throw error;
  }
};

// Fungsi untuk menghapus acara kalender
export const deleteKalenderEvent = async (id: string) => {
  try {
    const eventRef = doc(db, 'kalender', id);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Error deleting kalender event:', error);
    throw error;
  }
};

// Fungsi untuk mengambil data banding berdasarkan mahasiswaId
export const getBandingByMahasiswaId = async (mahasiswaId: string) => {
  try {
    const bandingRef = collection(db, 'banding');
    const q = query(
      bandingRef,
      where('mahasiswaId', '==', mahasiswaId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting banding:', error);
    throw error;
  }
};

// Fungsi untuk menambah notifikasi ke Firestore
export const addNotifikasi = async (data: {
  userId: string;
  title: string;
  message: string;
  type: 'akun' | 'pelanggaran' | 'laporan' | 'banding' | 'kalender' | 'peraturan' | 'pengumuman';
  laporanId?: string;
}) => {
  try {
    const notifikasiRef = collection(db, 'notifikasi');
    const newNotifikasi = {
      ...data,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(notifikasiRef, newNotifikasi);
    return docRef.id;
  } catch (error) {
    console.error('Error menambah notifikasi:', error);
    throw new Error('Gagal menambah notifikasi');
  }
};

// Fungsi untuk mengambil laporan berdasarkan mahasiswaId
export const getLaporanByMahasiswaId = async (mahasiswaId: string) => {
  try {
    console.log("=== Mulai getLaporanByMahasiswaId ===");
    console.log("Parameter mahasiswaId:", mahasiswaId);

    if (!mahasiswaId) {
      console.error("mahasiswaId kosong!");
      throw new Error("ID mahasiswa tidak valid");
    }

    // Pertama, dapatkan ID dokumen mahasiswa
    const mahasiswaRef = collection(db, "mahasiswa");
    const mahasiswaQuery = query(mahasiswaRef, where("uid", "==", mahasiswaId));
    const mahasiswaSnapshot = await getDocs(mahasiswaQuery);

    let mahasiswaDocId = mahasiswaId;
    if (!mahasiswaSnapshot.empty) {
      mahasiswaDocId = mahasiswaSnapshot.docs[0].id;
      console.log("ID dokumen mahasiswa:", mahasiswaDocId);
    }

    const laporanRef = collection(db, "laporan");
    // Query 1: mahasiswaId = docId
    const q1 = query(laporanRef, where("mahasiswaId", "==", mahasiswaDocId));
    const snapshot1 = await getDocs(q1);
    // Query 2: mahasiswaId = user.uid (fallback)
    const q2 = query(laporanRef, where("mahasiswaId", "==", mahasiswaId));
    const snapshot2 = await getDocs(q2);

    // Gabungkan hasil unik
    const allDocs = [...snapshot1.docs, ...snapshot2.docs.filter(doc2 => !snapshot1.docs.some(doc1 => doc1.id === doc2.id))];
    if (allDocs.length === 0) {
      console.log("Tidak ada data laporan ditemukan untuk mahasiswaId:", mahasiswaDocId, "atau", mahasiswaId);
      return [];
    }

    const laporanData = allDocs.map(doc => {
      const data = doc.data();
      console.log("Data mentah laporan:", data);
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
      };
    });

    // Urutkan secara manual di sisi client
    laporanData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log("Data laporan yang ditemukan:", laporanData);
    return laporanData;
  } catch (error) {
    console.error("Error dalam getLaporanByMahasiswaId:", error);
    throw new Error("Gagal mengambil data laporan: " + (error instanceof Error ? error.message : "Unknown error"));
  }
};

// Fungsi untuk mengambil pengaturan
export const getPengaturan = async () => {
  try {
    const pengaturanRef = doc(db, 'pengaturan', 'settings');
    const pengaturanDoc = await getDoc(pengaturanRef);
    
    if (pengaturanDoc.exists()) {
      return pengaturanDoc.data();
    }
    
    // Jika belum ada, buat pengaturan default
    const defaultPengaturan = {
      ambangPoin: {
        pembinaan: 20,
        terancamDO: 40
      },
      deskripsiKampus: 'Politeknik Ganesha Medan adalah perguruan tinggi vokasi yang berfokus pada pengembangan teknologi dan industri.',
      kontakKampus: 'Jl. Veteran No. 194, Medan, Sumatera Utara',
      logoURL: '/images/logo politeknik ganesha medan.png'
    };
    
    await setDoc(pengaturanRef, defaultPengaturan);
    return defaultPengaturan;
  } catch (error) {
    console.error('Error getting pengaturan:', error);
    throw new Error('Gagal mengambil pengaturan');
  }
};

// Fungsi untuk memperbarui pengaturan
export const updatePengaturan = async (data: {
  ambangPoin: {
    pembinaan: number;
    terancamDO: number;
  };
  deskripsiKampus: string;
  kontakKampus: string;
  logoURL?: string;
}) => {
  try {
    const pengaturanRef = doc(db, 'pengaturan', 'settings');
    await updateDoc(pengaturanRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating pengaturan:', error);
    throw new Error('Gagal memperbarui pengaturan');
  }
};

// Interface untuk data admin
interface AdminData {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  phoneNumber?: string;
  address?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

// Fungsi untuk membuat atau mendapatkan data admin
export const getOrCreateAdminData = async (userId: string): Promise<AdminData> => {
  try {
    const adminRef = doc(db, 'admin', userId);
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists()) {
      // Jika dokumen belum ada, buat baru
      const user = auth.currentUser;
      if (!user) throw new Error('User tidak ditemukan');
      
      const adminData: AdminData = {
        uid: userId,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        phoneNumber: '',
        address: '',
        website: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(adminRef, adminData);
      return adminData;
    }
    
    return adminDoc.data() as AdminData;
  } catch (error) {
    console.error('Error in getOrCreateAdminData:', error);
    throw error;
  }
};

// Fungsi untuk mengupdate foto profil admin
export const updateAdminPhoto = async (userId: string, file: File) => {
  try {
    // Validasi ukuran file (maksimal 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB dalam bytes
    if (file.size > maxSize) {
      throw new Error('Ukuran file terlalu besar. Maksimal 10MB');
    }

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Format file tidak didukung. Gunakan JPG, PNG, atau GIF');
    }

    // Upload foto ke Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    formData.append('max_file_size', '10485760'); // 10MB dalam bytes

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Gagal mengupload foto ke Cloudinary');
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Gagal mendapatkan URL foto dari Cloudinary');
    }

    // Pastikan data admin ada
    const adminData = await getOrCreateAdminData(userId);

    // Update URL foto di Firestore
    const adminRef = doc(db, 'admin', userId);
    await updateDoc(adminRef, {
      photoURL: data.secure_url,
      updatedAt: new Date().toISOString(),
    });

    // Update foto profil di Firebase Auth
    const user = auth.currentUser;
    if (user) {
      await updateProfile(user, {
        photoURL: data.secure_url
      });
    }

    return data.secure_url;
  } catch (error) {
    console.error("Error updating admin photo:", error);
    throw error;
  }
};

// Fungsi untuk memperbarui profil admin
export const updateAdminProfile = async (userId: string, data: {
  displayName?: string;
  phoneNumber?: string;
  address?: string;
  website?: string;
}) => {
  try {
    const adminRef = doc(db, 'admin', userId);
    const adminDoc = await getDoc(adminRef);
    
    if (!adminDoc.exists()) {
      // Jika dokumen belum ada, buat baru
      await setDoc(adminRef, {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      // Update dokumen yang ada
      await updateDoc(adminRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    }

    // Update displayName di Firebase Auth jika ada
    if (data.displayName) {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, {
          displayName: data.displayName
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating admin profile:', error);
    throw error;
  }
};

// Fungsi untuk menghapus notifikasi yang lebih dari 7 hari
export const deleteOldNotifications = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const notifikasiRef = collection(db, 'notifikasi');
    const q = query(
      notifikasiRef,
      where('createdAt', '<', sevenDaysAgo)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Berhasil menghapus ${snapshot.size} notifikasi lama`);
  } catch (error) {
    console.error('Error menghapus notifikasi lama:', error);
  }
};

// Fungsi untuk menjalankan pembersihan notifikasi secara otomatis
export const scheduleNotificationCleanup = () => {
  // Jalankan pembersihan setiap hari pada pukul 00:00
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow.getTime() - now.getTime();

  // Jalankan pembersihan pertama kali setelah tengah malam
  setTimeout(() => {
    deleteOldNotifications();
    // Setelah itu jalankan setiap 24 jam
    setInterval(deleteOldNotifications, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
};

// Fungsi untuk mengatur custom claims admin
export const setAdminRole = async (userId: string) => {
  try {
    const adminRef = doc(db, 'admin', userId);
    const adminDoc = await getDoc(adminRef);
    
    if (adminDoc.exists()) {
      // Set custom claims untuk admin menggunakan Firebase Admin SDK
      // Note: Ini memerlukan Firebase Admin SDK di server
      const response = await fetch('/api/set-admin-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error('Gagal mengatur role admin');
      }
      
      console.log('Admin role berhasil diset untuk user:', userId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting admin role:', error);
    throw error;
  }
};

// Fungsi untuk mengecek apakah user adalah admin
export const isAdmin = async (userId: string) => {
  try {
    // Cek di koleksi admin
    const adminRef = doc(db, 'admin', userId);
    const adminDoc = await getDoc(adminRef);
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
};

export const updateLaporanStatus = async (laporanId: string, status: 'approved' | 'rejected', adminId: string) => {
  try {
    const laporanRef = doc(db, 'laporan', laporanId);
    const laporanDoc = await getDoc(laporanRef);
    
    if (!laporanDoc.exists()) {
      throw new Error('Laporan tidak ditemukan');
    }

    const laporanData = laporanDoc.data();
    const dosenId = laporanData.dosenId;
    const dosenName = laporanData.dosenName;
    const mahasiswaId = laporanData.mahasiswaId;
    const peraturanId = laporanData.peraturanId;

    // Update status laporan
    await updateDoc(laporanRef, {
      status,
      updatedAt: new Date().toISOString(),
      approvedBy: adminId
    });

    // Jika disetujui, tambahkan ke koleksi pelanggaran
    if (status === 'approved') {
      const pelanggaranData = {
        mahasiswaId: laporanData.mahasiswaId,
        peraturanId: laporanData.peraturanId,
        tanggal: laporanData.tanggal,
        keterangan: laporanData.keterangan,
        buktiURLs: laporanData.buktiURLs,
        poin: laporanData.poin,
        createdAt: laporanData.createdAt,
        updatedAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'pelanggaran'), pelanggaranData);
    }

    // Notifikasi ke dosen
    await addNotifikasi({
      userId: dosenId,
      title: status === 'approved' ? 'Laporan Disetujui' : 'Laporan Ditolak',
      message: `Laporan pelanggaran Anda telah ${status === 'approved' ? 'disetujui' : 'ditolak'} oleh admin.`,
      type: 'laporan',
      laporanId
    });

    // Notifikasi ke mahasiswa
    if (mahasiswaId) {
      await addNotifikasi({
        userId: mahasiswaId,
        title: status === 'approved' ? 'Pelanggaran Disetujui' : 'Laporan Ditolak',
        message: `Laporan pelanggaran ${status === 'approved' ? 'telah disetujui' : 'telah ditolak'} oleh admin.`,
        type: 'laporan',
        laporanId
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating laporan status:', error);
    throw error;
  }
};

// Fungsi untuk membuat peraturan baru
export const createPeraturan = async (data: {
  nama: string;
  kategori: string;
  poin: number;
  deskripsi?: string;
}) => {
  try {
    const peraturanRef = collection(db, 'peraturan');
    const newPeraturan = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return await addDoc(peraturanRef, newPeraturan);
  } catch (error) {
    console.error('Error creating peraturan:', error);
    throw error;
  }
};

// Fungsi untuk mengupdate peraturan
export const updatePeraturan = async (id: string, data: Partial<{
  nama: string;
  kategori: string;
  poin: number;
  deskripsi: string;
}>) => {
  try {
    const peraturanRef = doc(db, 'peraturan', id);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    return await updateDoc(peraturanRef, updateData);
  } catch (error) {
    console.error('Error updating peraturan:', error);
    throw error;
  }
};

// Fungsi untuk menghapus peraturan
export const deletePeraturan = async (id: string) => {
  try {
    const peraturanRef = doc(db, 'peraturan', id);
    await deleteDoc(peraturanRef);
  } catch (error) {
    console.error('Error deleting peraturan:', error);
    throw error;
  }
};

// Fungsi untuk menghapus pelanggaran
export const deletePelanggaran = async (id: string) => {
  try {
    const pelanggaranRef = doc(db, 'pelanggaran', id);
    await deleteDoc(pelanggaranRef);
  } catch (error) {
    console.error('Error deleting pelanggaran:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan data mahasiswa berdasarkan userId
export const getMahasiswaByUserId = async (userId: string) => {
  try {
    const mahasiswaRef = collection(db, 'mahasiswa');
    const q = query(mahasiswaRef, where('uid', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting mahasiswa by userId:', error);
    throw error;
  }
};

// Fungsi untuk mengupdate password mahasiswa
export const updateMahasiswaPassword = async (userId: string, newPassword: string) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('User tidak ditemukan');
    
    await updatePassword(user, newPassword);
    return true;
  } catch (error) {
    console.error('Error updating mahasiswa password:', error);
    throw error;
  }
};

// Fungsi untuk mengupdate foto profil mahasiswa
export const updateMahasiswaPhoto = async (userId: string, file: File) => {
  try {
    // Upload foto ke Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Gagal mengupload foto ke Cloudinary');
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('Gagal mendapatkan URL foto dari Cloudinary');
    }

    // Update URL foto di Firestore
    const mahasiswaRef = doc(db, 'mahasiswa', userId);
    await updateDoc(mahasiswaRef, {
      photoURL: data.secure_url,
      updatedAt: new Date().toISOString(),
    });

    return data.secure_url;
  } catch (error) {
    console.error('Error updating mahasiswa photo:', error);
    throw error;
  }
};

// Fungsi untuk meminta izin notifikasi
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Fungsi untuk mendapatkan notifikasi berdasarkan userId
export const getNotifikasiByUserId = async (userId: string) => {
  try {
    const notifikasiRef = collection(db, 'notifikasi');
    const q = query(
      notifikasiRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting notifikasi by userId:', error);
    throw error;
  }
};

// Fungsi untuk mengupdate status notifikasi
export const updateNotifikasiStatus = async (notifikasiId: string, isRead: boolean) => {
  try {
    const notifikasiRef = doc(db, 'notifikasi', notifikasiId);
    await updateDoc(notifikasiRef, {
      isRead,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating notifikasi status:', error);
    throw error;
  }
};

// Fungsi untuk menyimpan FCM token
export const saveFCMToken = async (userId: string, token: string) => {
  try {
    const tokenRef = doc(db, 'fcm_tokens', userId);
    await setDoc(tokenRef, {
      token,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
};

// Fungsi untuk mengirim push notification
export const sendPushNotification = async (userId: string, title: string, body: string) => {
  try {
    const tokenRef = doc(db, 'fcm_tokens', userId);
    const tokenDoc = await getDoc(tokenRef);
    
    if (!tokenDoc.exists()) {
      throw new Error('FCM token tidak ditemukan');
    }
    
    const token = tokenDoc.data().token;
    
    // Implementasi pengiriman push notification menggunakan Firebase Cloud Messaging
    // Note: Ini memerlukan Firebase Admin SDK di server
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        title,
        body,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Gagal mengirim push notification');
    }
    
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}; 