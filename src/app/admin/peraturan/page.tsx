'use client';

import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, FileEdit, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/UI/Table';
import Badge from '@/components/UI/Badge';
import { getPeraturan, createPeraturan, updatePeraturan, deletePeraturan } from '@/lib/firebase';
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { addNotifikasi, addPengumumanNotifikasi } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Schema validasi untuk form peraturan
const peraturanSchema = z.object({
  kode: z.string().min(1, 'Kode harus diisi'),
  nama: z.string().min(1, 'Nama pelanggaran harus diisi'),
  kategori: z.enum(['Ringan', 'Sedang', 'Berat']),
  poin: z.coerce.number().min(1, 'Poin harus diisi'),
});

type PeraturanFormData = z.infer<typeof peraturanSchema>;

interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
  createdAt: string;
  updatedAt: string;
}

export default function PeraturanPage() {
  const [peraturan, setPeraturan] = useState<Peraturan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPeraturan, setSelectedPeraturan] = useState<Peraturan | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PeraturanFormData>({
    resolver: zodResolver(peraturanSchema),
  });

  const { user } = useAuth();

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getPeraturan();
        setPeraturan(data as Peraturan[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter peraturan berdasarkan pencarian
  const filteredPeraturan = peraturan.filter(p => 
    p.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle submit form
  const onSubmit = async (data: PeraturanFormData) => {
    try {
      const adminName = user?.displayName || 'Admin';
      const adminUid = user?.uid;

      // Ambil semua admin dan mahasiswa
      const [adminSnapshot, mahasiswaSnapshot] = await Promise.all([
        getDocs(collection(db, 'admin')),
        getDocs(collection(db, 'mahasiswa'))
      ]);

      const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      const allMahasiswa = mahasiswaSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

      if (selectedPeraturan) {
        // Update peraturan
        await updatePeraturan(selectedPeraturan.id, data);
        toast.success('Data peraturan berhasil diperbarui');

        // Notifikasi ke semua mahasiswa
        await Promise.all(
          allMahasiswa.map(m =>
            addNotifikasi({
              userId: m.uid,
              title: 'Peraturan Diperbarui',
              message: `Peraturan "${data.nama}" telah diperbarui oleh admin`,
              type: 'peraturan'
            })
          )
        );

        // Notifikasi ke semua admin lain
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Edit Peraturan',
                message: `Admin ${adminName} mengedit peraturan: ${data.nama}`,
                type: 'peraturan'
              })
            )
        );
      } else {
        // Buat peraturan baru
        await createPeraturan(data);
        toast.success('Peraturan baru berhasil ditambahkan');

        // Notifikasi ke semua mahasiswa
        await Promise.all(
          allMahasiswa.map(m =>
            addNotifikasi({
              userId: m.uid,
              title: 'Peraturan Baru',
              message: `Peraturan baru "${data.nama}" telah ditambahkan`,
              type: 'peraturan'
            })
          )
        );

        // Notifikasi ke semua admin lain
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Peraturan Baru',
                message: `Admin ${adminName} menambahkan peraturan baru: ${data.nama}`,
                type: 'peraturan'
              })
            )
        );
      }

      setShowModal(false);
      reset();
      // Refresh data
      const updatedData = await getPeraturan();
      setPeraturan(updatedData as Peraturan[]);
    } catch (error) {
      console.error('Error saving peraturan:', error);
      toast.error('Gagal menyimpan data peraturan');
    }
  };

  // Handle edit peraturan
  const handleEdit = (peraturan: Peraturan) => {
    setSelectedPeraturan(peraturan);
    reset({
      kode: peraturan.kode,
      nama: peraturan.nama,
      kategori: peraturan.kategori,
      poin: peraturan.poin,
    });
    setShowModal(true);
  };

  // Handle delete peraturan
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus peraturan ini?')) {
      try {
        const peraturanToDelete = peraturan.find(p => p.id === id);
        if (!peraturanToDelete) {
          throw new Error('Peraturan tidak ditemukan');
        }

        const adminName = user?.displayName || 'Admin';
        const adminUid = user?.uid;

        // Ambil semua admin dan mahasiswa
        const [adminSnapshot, mahasiswaSnapshot] = await Promise.all([
          getDocs(collection(db, 'admin')),
          getDocs(collection(db, 'mahasiswa'))
        ]);

        const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        const allMahasiswa = mahasiswaSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

        // Hapus peraturan
        await deletePeraturan(id);
        toast.success('Peraturan berhasil dihapus');

        // Notifikasi ke semua mahasiswa
        await Promise.all(
          allMahasiswa.map(m =>
            addNotifikasi({
              userId: m.uid,
              title: 'Peraturan Dihapus',
              message: `Peraturan "${peraturanToDelete.nama}" telah dihapus`,
              type: 'peraturan'
            })
          )
        );

        // Notifikasi ke semua admin lain
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Hapus Peraturan',
                message: `Admin ${adminName} menghapus peraturan: ${peraturanToDelete.nama}`,
                type: 'peraturan'
              })
            )
        );

        // Refresh data
        const updatedData = await getPeraturan();
        setPeraturan(updatedData as Peraturan[]);
      } catch (error) {
        console.error('Error deleting peraturan:', error);
        toast.error('Gagal menghapus peraturan');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Peraturan</h1>
        <Button
          onClick={() => {
            setSelectedPeraturan(null);
            reset({});
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusCircle size={18} />
          <span>Tambah Peraturan</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Daftar Peraturan Kedisiplinan</CardTitle>
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Cari peraturan..."
                className="input-field pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Pelanggaran</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Poin</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPeraturan.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Tidak ada data peraturan
                  </TableCell>
                </TableRow>
              ) : (
                filteredPeraturan.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.kode}</TableCell>
                    <TableCell>{p.nama}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.kategori === 'Ringan'
                            ? 'info'
                            : p.kategori === 'Sedang'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {p.kategori}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.poin}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(p)}
                        >
                          <FileEdit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Form */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          reset();
        }}
        title={selectedPeraturan ? 'Edit Peraturan' : 'Tambah Peraturan'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Kode</label>
            <input
              type="text"
              {...register('kode')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.kode && (
              <p className="mt-1 text-sm text-red-600">{errors.kode.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Pelanggaran</label>
            <input
              type="text"
              {...register('nama')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.nama && (
              <p className="mt-1 text-sm text-red-600">{errors.nama.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Kategori</label>
            <select
              {...register('kategori')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Pilih Kategori</option>
              <option value="Ringan">Ringan</option>
              <option value="Sedang">Sedang</option>
              <option value="Berat">Berat</option>
            </select>
            {errors.kategori && (
              <p className="mt-1 text-sm text-red-600">{errors.kategori.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Poin</label>
            <input
              type="number"
              {...register('poin', { valueAsNumber: true })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.poin && (
              <p className="mt-1 text-sm text-red-600">{errors.poin.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                reset();
              }}
            >
              Batal
            </Button>
            <Button type="submit">
              {selectedPeraturan ? 'Simpan Perubahan' : 'Tambah Peraturan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 