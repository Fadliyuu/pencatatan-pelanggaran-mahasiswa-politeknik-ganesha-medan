'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';
import { deleteMahasiswa, getPelanggaranByMahasiswaId, deletePelanggaran } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Mahasiswa } from '@/types/model';

export default function MahasiswaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa | null>(null);
  const [pelanggaran, setPelanggaran] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!params?.id) {
        console.error('ID tidak ditemukan dalam params');
        setError('ID mahasiswa tidak ditemukan');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Mencoba mengambil data mahasiswa dengan ID:', params.id);

        // Ambil data mahasiswa
        const mahasiswaRef = doc(db, 'mahasiswa', params.id as string);
        const mahasiswaDoc = await getDoc(mahasiswaRef);
        
        if (!mahasiswaDoc.exists()) {
          console.error('Dokumen mahasiswa tidak ditemukan');
          setError('Data mahasiswa tidak ditemukan');
          toast.error('Data mahasiswa tidak ditemukan');
          router.push('/admin/mahasiswa');
          return;
        }

        const mahasiswaData = {
          id: mahasiswaDoc.id,
          ...mahasiswaDoc.data()
        } as Mahasiswa;
        
        console.log('Data mahasiswa berhasil diambil:', mahasiswaData);
        setMahasiswa(mahasiswaData);

        // Ambil data pelanggaran
        console.log('Mencoba mengambil data pelanggaran untuk mahasiswa:', params.id);
        const pelanggaranData = await getPelanggaranByMahasiswaId(params.id as string);
        console.log('Data pelanggaran berhasil diambil:', pelanggaranData);
        setPelanggaran(pelanggaranData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Gagal mengambil data');
        toast.error('Gagal mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!params || !('id' in params) || !params.id) return;
    if (window.confirm('Apakah Anda yakin ingin menghapus mahasiswa ini?')) {
      try {
        await deleteMahasiswa(params.id as string);
        toast.success('Mahasiswa berhasil dihapus');
        router.push('/admin/mahasiswa');
      } catch (error) {
        console.error('Error deleting mahasiswa:', error);
        toast.error('Gagal menghapus mahasiswa');
      }
    }
  };

  const handleDeletePelanggaran = async (pelanggaranId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pelanggaran ini?')) {
      try {
        await deletePelanggaran(pelanggaranId);
        toast.success('Pelanggaran berhasil dihapus');
        // Refresh data pelanggaran
        if (params && 'id' in params && params.id) {
          const pelanggaranData = await getPelanggaranByMahasiswaId(params.id as string);
          setPelanggaran(pelanggaranData);
        }
      } catch (error) {
        console.error('Error deleting pelanggaran:', error);
        toast.error('Gagal menghapus pelanggaran');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !mahasiswa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error || 'Data mahasiswa tidak ditemukan'}</p>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/mahasiswa')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>Kembali ke Daftar Mahasiswa</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/mahasiswa')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>Kembali</span>
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Detail Mahasiswa</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                {mahasiswa.photoURL ? (
                  <Image
                    src={mahasiswa.photoURL}
                    alt={mahasiswa.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                    {mahasiswa.name.charAt(0)}
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-semibold">{mahasiswa.name}</h2>
              <p className="text-gray-500">{mahasiswa.nim}</p>
              <Badge
                variant={
                  mahasiswa.status === 'Normal'
                    ? 'success'
                    : mahasiswa.status === 'Pembinaan'
                    ? 'warning'
                    : 'danger'
                }
                className="mt-2"
              >
                {mahasiswa.status}
              </Badge>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p>{mahasiswa.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Program Studi</label>
                <p>{mahasiswa.programStudi}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Angkatan</label>
                <p>{mahasiswa.angkatan}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tanggal Lahir</label>
                <p>{formatDate(mahasiswa.tanggalLahir)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Agama</label>
                <p>{mahasiswa.agama}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Alamat</label>
                <p>{mahasiswa.alamat}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/admin/mahasiswa/${params && 'id' in params ? params.id : ''}/edit`)}
              >
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDelete}
              >
                <Trash size={16} className="mr-2" />
                Hapus
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Riwayat Pelanggaran</CardTitle>
          </CardHeader>
          <CardContent>
            {pelanggaran.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Belum ada riwayat pelanggaran
              </p>
            ) : (
              <div className="space-y-4">
                {pelanggaran.map((p) => (
                  <div
                    key={p.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{p.peraturan?.nama || 'Pelanggaran'}</h3>
                        <p className="text-sm text-gray-500">
                          {p.tanggal ? formatDate(p.tanggal) : '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            p.poin < 25
                              ? 'success'
                              : p.poin < 40
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {p.poin} Poin
                        </Badge>
                        <button
                          onClick={() => handleDeletePelanggaran(p.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Hapus pelanggaran"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{p.keterangan || '-'}</p>
                    </div>
                    {p.buktiURLs && p.buktiURLs.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        {p.buktiURLs.map((url, index) => (
                          <div key={index} className="relative">
                            <Image
                              src={url}
                              alt={`Bukti ${index + 1}`}
                              width={200}
                              height={200}
                              className="rounded-lg object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 