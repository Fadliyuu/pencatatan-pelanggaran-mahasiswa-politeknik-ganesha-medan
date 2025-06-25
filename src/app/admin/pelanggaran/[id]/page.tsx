'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import Badge from '@/components/UI/Badge';
import { getPelanggaran, getMahasiswa, getPeraturan, deletePelanggaran } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface Mahasiswa {
  id: string;
  name: string;
  nim: string;
  totalPoin: number;
  status: string;
}

interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
}

interface Pelanggaran {
  id: string;
  mahasiswaId: string;
  peraturanId: string;
  tanggal: string;
  poin: number;
  buktiURLs?: string[];
  keterangan?: string;
  createdAt: string;
  updatedAt: string;
}

export default function DetailPelanggaranPage({ params }: { params: { id: string } }) {
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran | null>(null);
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa | null>(null);
  const [peraturan, setPeraturan] = useState<Peraturan | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pelanggaranData, mahasiswaData, peraturanData] = await Promise.all([
          getPelanggaran(),
          getMahasiswa(),
          getPeraturan(),
        ]);

        const selectedPelanggaran = pelanggaranData.find((p: Pelanggaran) => p.id === params.id);
        if (!selectedPelanggaran) {
          toast.error('Data pelanggaran tidak ditemukan');
          router.push('/admin/pelanggaran');
          return;
        }

        const selectedMahasiswa = mahasiswaData.find((m: Mahasiswa) => m.id === selectedPelanggaran.mahasiswaId);
        const selectedPeraturan = peraturanData.find((p: Peraturan) => p.id === selectedPelanggaran.peraturanId);

        setPelanggaran(selectedPelanggaran);
        setMahasiswa(selectedMahasiswa || null);
        setPeraturan(selectedPeraturan || null);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!pelanggaran) return;

    if (window.confirm('Apakah Anda yakin ingin menghapus data pelanggaran ini?')) {
      try {
        await deletePelanggaran(pelanggaran.id);
        toast.success('Data pelanggaran berhasil dihapus');
        router.push('/admin/pelanggaran');
      } catch (error) {
        console.error('Error deleting pelanggaran:', error);
        toast.error('Gagal menghapus data pelanggaran');
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

  if (!pelanggaran || !mahasiswa || !peraturan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Data tidak ditemukan</h2>
          <p className="text-gray-600 mt-2">Data pelanggaran yang Anda cari tidak ditemukan</p>
          <Button
            onClick={() => router.push('/admin/pelanggaran')}
            className="mt-4"
          >
            Kembali ke Daftar Pelanggaran
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/pelanggaran')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>Kembali</span>
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Detail Pelanggaran</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span>Data Mahasiswa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Nama</label>
              <p className="mt-1">{mahasiswa.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">NIM</label>
              <p className="mt-1">{mahasiswa.nim}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Poin</label>
              <p className="mt-1">{mahasiswa.totalPoin} Poin</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <Badge
                variant={
                  mahasiswa.status === 'Normal'
                    ? 'success'
                    : mahasiswa.status === 'Pembinaan'
                    ? 'warning'
                    : 'danger'
                }
                className="mt-1"
              >
                {mahasiswa.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Detail Pelanggaran</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Jenis Pelanggaran</label>
              <p className="mt-1">{peraturan.nama}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Kategori</label>
              <Badge
                variant={
                  peraturan.kategori === 'Ringan'
                    ? 'info'
                    : peraturan.kategori === 'Sedang'
                    ? 'warning'
                    : 'danger'
                }
                className="mt-1"
              >
                {peraturan.kategori}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Poin</label>
              <p className="mt-1">{peraturan.poin} Poin</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tanggal</label>
              <p className="mt-1">{formatDate(pelanggaran.tanggal)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Keterangan</label>
              <p className="mt-1">{pelanggaran.keterangan}</p>
            </div>
            {pelanggaran.buktiURLs && pelanggaran.buktiURLs.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-500">Bukti</label>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  {pelanggaran.buktiURLs.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Bukti ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/pelanggaran/edit/${pelanggaran.id}`)}
        >
          Edit Data
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
        >
          Hapus Data
        </Button>
      </div>
    </div>
  );
} 