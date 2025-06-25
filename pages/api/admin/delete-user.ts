import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebase-admin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'UID harus diisi' });
    }

    console.log('Mencoba menghapus user dengan UID:', uid);

    try {
      await adminAuth.deleteUser(uid);
      console.log('User berhasil dihapus:', uid);
      res.status(200).json({ 
        success: true,
        message: 'User berhasil dihapus' 
      });
    } catch (error: any) {
      console.error('Error saat menghapus user:', error);
      
      // Jika user tidak ditemukan, anggap sebagai sukses
      if (error.code === 'auth/user-not-found') {
        console.log('User tidak ditemukan, dianggap sukses');
        return res.status(200).json({ 
          success: true,
          message: 'User tidak ditemukan atau sudah dihapus' 
        });
      }

      throw error;
    }
  } catch (error: any) {
    console.error('Error dalam handler delete-user:', error);
    res.status(500).json({ 
      error: 'Gagal menghapus user',
      details: error.message 
    });
  }
} 