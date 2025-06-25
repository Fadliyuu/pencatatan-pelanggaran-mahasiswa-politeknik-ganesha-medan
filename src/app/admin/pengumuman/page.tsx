'use client';

import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Filter, Calendar, Eye, FileText, Edit, Trash } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/UI/Table';
import Badge from '@/components/UI/Badge';
import { getPengumuman, createPengumuman, updatePengumuman, deletePengumuman, uploadImageToCloudinary, addPengumumanNotifikasi, addNotifikasi } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import NotificationPermissionHandler from '@/components/NotificationPermissionHandler';

// Schema validasi untuk form pengumuman
const pengumumanSchema = z.object({
  judul: z.string().min(1, 'Judul harus diisi'),
  isi: z.string().min(1, 'Isi pengumuman harus diisi'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  gambarURL: z.string().optional(),
  status: z.enum(['aktif', 'nonaktif']),
  targetPenerima: z.object({
    programStudi: z.array(z.string()).optional(),
    angkatan: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
    agama: z.array(z.string()).optional(),
    jalur: z.array(z.string()).optional(),
    totalPoin: z.object({
      operator: z.enum(['kurang', 'lebih', 'sama']),
      nilai: z.number().min(0),
    }).optional(),
  }),
});

type PengumumanFormData = z.infer<typeof pengumumanSchema>;

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
  gambarURL?: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
  targetPenerima?: PengumumanFormData['targetPenerima'];
}

export default function PengumumanPage() {
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPengumuman, setSelectedPengumuman] = useState<Pengumuman | null>(null);
  const router = useRouter();

  // State untuk preview gambar
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<PengumumanFormData>({
    resolver: zodResolver(pengumumanSchema),
  });

  const [showTargetFilter, setShowTargetFilter] = useState(false);
  const [targetPenerima, setTargetPenerima] = useState<PengumumanFormData['targetPenerima']>({
    programStudi: [],
    angkatan: [],
    status: [],
    agama: [],
    jalur: [],
    totalPoin: undefined
  });

  const { user } = useAuth ? useAuth() : { user: null };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const pengumumanData = await getPengumuman();
        setPengumuman(pengumumanData as Pengumuman[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter pengumuman berdasarkan pencarian
  const filteredPengumuman = pengumuman.filter(p => 
    p.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.isi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle submit form
  const onSubmit = async (data: PengumumanFormData) => {
    if (isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      setIsLoading(true);

      // Bersihkan totalPoin jika undefined
      const targetPenerimaClean = { ...targetPenerima };
      if (typeof targetPenerimaClean.totalPoin === 'undefined') {
        delete targetPenerimaClean.totalPoin;
      }

      const pengumumanData = {
        judul: data.judul.trim(),
        isi: data.isi.trim(),
        tanggal: data.tanggal,
        status: data.status,
        targetPenerima: targetPenerimaClean,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const adminName = user?.displayName || 'Admin';
      const adminUid = user?.uid;
      // Ambil semua admin
      const adminSnapshot = await getDocs(collection(db, 'admin'));
      const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

      if (selectedPengumuman) {
        await updatePengumuman(selectedPengumuman.id, pengumumanData);
        toast.success('Pengumuman berhasil diperbarui');
        await addPengumumanNotifikasi(adminName, pengumumanData.judul);
        // Notifikasi ke semua admin lain
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Edit Pengumuman',
                message: `Admin ${adminName} mengedit pengumuman: ${pengumumanData.judul}`,
                type: 'pengumuman'
              })
            )
        );
      } else {
        await createPengumuman(pengumumanData);
        toast.success('Pengumuman baru berhasil ditambahkan');
        await addPengumumanNotifikasi(adminName, pengumumanData.judul);
        // Notifikasi ke semua admin lain
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Pengumuman Baru',
                message: `Admin ${adminName} menambahkan pengumuman baru: ${pengumumanData.judul}`,
                type: 'pengumuman'
              })
            )
        );
      }

      reset();
      const updatedData = await getPengumuman();
      setPengumuman(updatedData as Pengumuman[]);
      setShowModal(false);
      setPreviewImage(null);
    } catch (error: any) {
      console.error('Error saving pengumuman:', error);
      toast.error(`Gagal menyimpan pengumuman: ${error.message}`);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  // Handle edit pengumuman
  const handleEdit = (pengumuman: Pengumuman) => {
    setSelectedPengumuman(pengumuman);
    setPreviewImage(pengumuman.gambarURL || null);
    reset({
      judul: pengumuman.judul,
      isi: pengumuman.isi,
      tanggal: pengumuman.tanggal,
      gambarURL: pengumuman.gambarURL,
      status: pengumuman.status === 'nonaktif' ? 'nonaktif' : 'aktif',
      targetPenerima: pengumuman.targetPenerima || {
        programStudi: [],
        angkatan: [],
        status: [],
        agama: [],
        jalur: [],
        totalPoin: undefined
      },
    });
    setTargetPenerima(pengumuman.targetPenerima || {
      programStudi: [],
      angkatan: [],
      status: [],
      agama: [],
      jalur: [],
      totalPoin: undefined
    });
    setShowModal(true);
  };

  // Handle view detail pengumuman
  const handleView = (id: string) => {
    router.push(`/admin/pengumuman/${id}`);
  };

  // Fungsi untuk handle upload gambar
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadImageToCloudinary(file);
      setValue('gambarURL', url);
      setPreviewImage(url);
      toast.success('Gambar berhasil diupload');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengupload gambar');
    } finally {
      setIsUploading(false);
    }
  };

  // Update reset untuk membersihkan preview
  const handleCloseModal = () => {
    setShowModal(false);
    reset();
    setPreviewImage(null);
  };

  // Handle delete pengumuman
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) {
      try {
        await deletePengumuman(id);
        toast.success('Pengumuman berhasil dihapus');
        
        // Refresh data
        const updatedData = await getPengumuman();
        setPengumuman(updatedData as Pengumuman[]);
      } catch (error) {
        console.error('Error deleting pengumuman:', error);
        toast.error('Gagal menghapus pengumuman');
      }
    }
  };

  // Sinkronkan targetPenerima ke form
  useEffect(() => {
    setValue('targetPenerima', targetPenerima);
  }, [targetPenerima, setValue]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Pengumuman</h1>
        <Button
          onClick={() => {
            setSelectedPengumuman(null);
            reset({
              judul: '',
              isi: '',
              tanggal: '',
              gambarURL: '',
              status: 'aktif',
              targetPenerima: {
                programStudi: [],
                angkatan: [],
                status: [],
                agama: [],
                jalur: [],
                totalPoin: undefined
              }
            });
            setTargetPenerima({
              programStudi: [],
              angkatan: [],
              status: [],
              agama: [],
              jalur: [],
              totalPoin: undefined
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusCircle size={18} />
          <span>Tambah Pengumuman</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <CardTitle>Daftar Pengumuman</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari pengumuman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Judul</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Gambar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPengumuman.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Tidak ada data pengumuman
                  </TableCell>
                </TableRow>
              ) : (
                filteredPengumuman.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.judul}</TableCell>
                    <TableCell>{new Date(p.tanggal).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell>
                      {p.gambarURL ? (
                        <div className="relative w-16 h-16">
                          <Image
                            src={p.gambarURL}
                            alt={p.judul}
                            fill
                            className="object-cover rounded-md"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(p.id)}
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(p)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(p.id)}
                          className="flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash size={16} />
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

      {/* Modal Tambah/Edit Pengumuman */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedPengumuman ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
      >
        <NotificationPermissionHandler />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Judul</label>
            <input
              type="text"
              {...register('judul')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.judul && (
              <p className="mt-1 text-sm text-red-600">{errors.judul.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Isi Pengumuman</label>
            <textarea
              {...register('isi')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={4}
            />
            {errors.isi && (
              <p className="mt-1 text-sm text-red-600">{errors.isi.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Tanggal</label>
            <input
              type="date"
              {...register('tanggal')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.tanggal && (
              <p className="mt-1 text-sm text-red-600">{errors.tanggal.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              {...register('status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          {/* Target Penerima Filter */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-700">Target Penerima</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTargetFilter(!showTargetFilter)}
              >
                {showTargetFilter ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
              </Button>
            </div>

            {showTargetFilter && (
              <div className="space-y-4">
                {/* Program Studi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Program Studi</label>
                  <div className="mt-2 space-y-2">
                    {['Manajemen Informatika', 'Akuntansi', 'Teknik Informatika'].map((prodi) => (
                      <label key={prodi} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={targetPenerima.programStudi?.includes(prodi)}
                          onChange={(e) => {
                            const newProdi = e.target.checked
                              ? [...(targetPenerima.programStudi || []), prodi]
                              : targetPenerima.programStudi?.filter(p => p !== prodi) || [];
                            setTargetPenerima({ ...targetPenerima, programStudi: newProdi });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{prodi}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Angkatan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Angkatan</label>
                  <div className="mt-2 space-y-2">
                    {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
                      <label key={year} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={targetPenerima.angkatan?.includes(year.toString())}
                          onChange={(e) => {
                            const newAngkatan = e.target.checked
                              ? [...(targetPenerima.angkatan || []), year.toString()]
                              : targetPenerima.angkatan?.filter(a => a !== year.toString()) || [];
                            setTargetPenerima({ ...targetPenerima, angkatan: newAngkatan });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-2 space-y-2">
                    {['Normal', 'Pembinaan', 'Terancam DO'].map((status) => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={targetPenerima.status?.includes(status)}
                          onChange={(e) => {
                            const newStatus = e.target.checked
                              ? [...(targetPenerima.status || []), status]
                              : targetPenerima.status?.filter(s => s !== status) || [];
                            setTargetPenerima({ ...targetPenerima, status: newStatus });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Agama */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agama</label>
                  <div className="mt-2 space-y-2">
                    {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map((agama) => (
                      <label key={agama} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={targetPenerima.agama?.includes(agama)}
                          onChange={(e) => {
                            const newAgama = e.target.checked
                              ? [...(targetPenerima.agama || []), agama]
                              : targetPenerima.agama?.filter(a => a !== agama) || [];
                            setTargetPenerima({ ...targetPenerima, agama: newAgama });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{agama}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Jalur */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Jalur</label>
                  <div className="mt-2 space-y-2">
                    {['Umum', 'KIP', 'Beasiswa'].map((jalur) => (
                      <label key={jalur} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={targetPenerima.jalur?.includes(jalur)}
                          onChange={(e) => {
                            const newJalur = e.target.checked
                              ? [...(targetPenerima.jalur || []), jalur]
                              : targetPenerima.jalur?.filter(j => j !== jalur) || [];
                            setTargetPenerima({ ...targetPenerima, jalur: newJalur });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">{jalur}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Total Poin */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Poin</label>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <select
                      value={targetPenerima.totalPoin?.operator || ''}
                      onChange={(e) => {
                        setTargetPenerima({
                          ...targetPenerima,
                          totalPoin: {
                            operator: e.target.value as 'kurang' | 'lebih' | 'sama',
                            nilai: targetPenerima.totalPoin?.nilai || 0
                          }
                        });
                      }}
                      className="rounded-md border border-gray-300 px-3 py-2"
                    >
                      <option value="">Pilih Operator</option>
                      <option value="kurang">Kurang dari</option>
                      <option value="lebih">Lebih dari</option>
                      <option value="sama">Sama dengan</option>
                    </select>
                    <input
                      type="number"
                      value={targetPenerima.totalPoin?.nilai || ''}
                      onChange={(e) => {
                        setTargetPenerima({
                          ...targetPenerima,
                          totalPoin: {
                            operator: targetPenerima.totalPoin?.operator || 'kurang',
                            nilai: parseInt(e.target.value) || 0
                          }
                        });
                      }}
                      placeholder="Nilai poin"
                      className="rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Gambar Pengumuman</label>
            <div className="mt-1 flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="gambar-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="gambar-upload"
                className={`cursor-pointer px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? 'Mengupload...' : 'Upload Gambar'}
              </label>
              {previewImage && (
                <div className="relative w-20 h-20">
                  <img
                    src={previewImage}
                    alt="Preview gambar"
                    className="w-full h-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImage(null);
                      setValue('gambarURL', '');
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <input
              type="hidden"
              {...register('gambarURL')}
            />
            {errors.gambarURL && (
              <p className="mt-1 text-sm text-red-600">{errors.gambarURL.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
            >
              Batal
            </Button>
            <Button type="submit">
              {selectedPengumuman ? 'Simpan Perubahan' : 'Tambah Pengumuman'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}