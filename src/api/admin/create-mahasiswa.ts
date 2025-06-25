import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { mahasiswa } = req.body; // mahasiswa: array of data
    if (!Array.isArray(mahasiswa)) return res.status(400).json({ error: 'Data mahasiswa tidak valid' });

    const results = [];
    for (const mhs of mahasiswa) {
      // 1. Buat akun Auth
      let userRecord;
      try {
        userRecord = await adminAuth.createUser({
          email: mhs.email,
          password: mhs.password || 'admin123',
          displayName: mhs.name,
        });
      } catch (e: any) {
        results.push({ nim: mhs.nim, error: e.message });
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
        results.push({ nim: mhs.nim, success: true });
      } catch (e: any) {
        results.push({ nim: mhs.nim, error: e.message });
      }
    }

    res.status(200).json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
} 