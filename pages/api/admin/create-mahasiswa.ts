import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { mahasiswa } = req.body;
    
    // Validasi input
    if (!mahasiswa || !Array.isArray(mahasiswa)) {
      return res.status(400).json({ error: 'Data mahasiswa harus berupa array' });
    }

    if (mahasiswa.length === 0) {
      return res.status(400).json({ error: 'Array mahasiswa tidak boleh kosong' });
    }

    const results = [];
    for (const mhs of mahasiswa) {
      try {
        // Validasi data mahasiswa
        if (!mhs.nim || !mhs.name || !mhs.email) {
          results.push({ 
            nim: mhs.nim || 'unknown', 
            error: 'NIM, nama, dan email harus diisi' 
          });
          continue;
        }

        // Validasi format email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mhs.email)) {
          results.push({
            nim: mhs.nim,
            error: 'Format email tidak valid'
          });
          continue;
        }

        // Cek apakah email sudah terdaftar
        const emailQuery = await adminDb.collection('mahasiswa')
          .where('email', '==', mhs.email)
          .get();

        if (!emailQuery.empty) {
          results.push({
            nim: mhs.nim,
            error: 'Email sudah terdaftar'
          });
          continue;
        }

        // 1. Buat akun Auth
        let userRecord;
        try {
          userRecord = await adminAuth.createUser({
            email: mhs.email,
            password: mhs.password || 'admin123',
            displayName: mhs.name,
          });
        } catch (e: any) {
          console.error('Error creating auth user:', e);
          results.push({ 
            nim: mhs.nim, 
            error: e.message || 'Gagal membuat akun auth' 
          });
          continue;
        }

        // 2. Simpan data ke Firestore
        try {
          await adminDb.collection('mahasiswa').doc(userRecord.uid).set({
            ...mhs,
            uid: userRecord.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          results.push({ 
            nim: mhs.nim, 
            success: true, 
            uid: userRecord.uid 
          });
        } catch (e: any) {
          console.error('Error saving to Firestore:', e);
          // Jika gagal menyimpan ke Firestore, hapus akun auth yang baru dibuat
          try {
            await adminAuth.deleteUser(userRecord.uid);
          } catch (deleteError) {
            console.error('Error deleting auth user:', deleteError);
          }
          results.push({ 
            nim: mhs.nim, 
            error: e.message || 'Gagal menyimpan data ke database' 
          });
        }
      } catch (error: any) {
        console.error('Error processing mahasiswa:', error);
        results.push({
          nim: mhs.nim || 'unknown',
          error: error.message || 'Terjadi kesalahan saat memproses data'
        });
      }
    }

    // Cek apakah ada yang berhasil
    const successCount = results.filter(r => r.success).length;
    if (successCount === 0) {
      return res.status(400).json({ 
        error: 'Tidak ada data yang berhasil disimpan',
        results 
      });
    }

    res.status(200).json({ 
      message: `Berhasil menyimpan ${successCount} dari ${mahasiswa.length} data`,
      results 
    });
  } catch (error: any) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      details: error.message 
    });
  }
} 