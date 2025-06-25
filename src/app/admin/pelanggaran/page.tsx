'use client';

import React, { useEffect, useState } from 'react';
import { PlusCircle, Search, Filter, Calendar, Eye, FileText, Edit, Trash, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/UI/Table';
import Badge from '@/components/UI/Badge';
import { getPelanggaran, createPelanggaran, updatePelanggaran, getMahasiswa, getPeraturan, uploadImageToCloudinary, deletePelanggaran, addNotifikasi } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Modal from '@/components/UI/Modal';
import Button from '@/components/UI/Button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

// Schema validasi untuk form pelanggaran
const pelanggaranSchema = z.object({
  mahasiswaId: z.string().min(1, 'Mahasiswa harus dipilih'),
  peraturanId: z.string().min(1, 'Peraturan harus dipilih'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  keterangan: z.string().min(1, 'Keterangan harus diisi'),
  buktiURLs: z.array(z.string()).optional(),
});

type PelanggaranFormData = z.infer<typeof pelanggaranSchema>;

interface Mahasiswa {
  id: string;
  uid?: string;
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

export default function PelanggaranPage() {
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [peraturan, setPeraturan] = useState<Peraturan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPelanggaran, setSelectedPelanggaran] = useState<Pelanggaran | null>(null);
  const [filters, setFilters] = useState({
    tanggal: '',
    jenis: '',
    poin: '',
  });
  const router = useRouter();

  // Tambahkan state untuk pencarian mahasiswa
  const [searchMahasiswa, setSearchMahasiswa] = useState('');
  const [filteredMahasiswa, setFilteredMahasiswa] = useState<Mahasiswa[]>([]);

  // Tambahkan state untuk preview gambar
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<PelanggaranFormData>({
    resolver: zodResolver(pelanggaranSchema),
  });

  const [filteredPelanggaran, setFilteredPelanggaran] = useState<Pelanggaran[]>([]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pelanggaranData, mahasiswaData, peraturanData] = await Promise.all([
          getPelanggaran(),
          getMahasiswa(),
          getPeraturan(),
        ]);
        setPelanggaran(pelanggaranData as Pelanggaran[]);
        setMahasiswa(mahasiswaData as Mahasiswa[]);
        setPeraturan(peraturanData as Peraturan[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update useEffect untuk memfilter mahasiswa
  useEffect(() => {
    if (searchMahasiswa) {
      const filtered = mahasiswa.filter(m => 
        m.name.toLowerCase().includes(searchMahasiswa.toLowerCase()) ||
        m.nim.toLowerCase().includes(searchMahasiswa.toLowerCase())
      );
      setFilteredMahasiswa(filtered);
    } else {
      setFilteredMahasiswa([]);
    }
  }, [searchMahasiswa, mahasiswa]);

  // Update useEffect untuk memfilter pelanggaran
  useEffect(() => {
    const filtered = pelanggaran.filter(p => {
      const selectedMahasiswa = mahasiswa.find(m => m.id === p.mahasiswaId);
      const selectedPeraturan = peraturan.find(pr => pr.id === p.peraturanId);
      
      const matchesSearch = 
        selectedMahasiswa?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        selectedMahasiswa?.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
        selectedPeraturan?.nama.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        (!filters.tanggal || p.tanggal === filters.tanggal) &&
        (!filters.jenis || selectedPeraturan?.kategori === filters.jenis) &&
        (!filters.poin || selectedPeraturan?.poin === parseInt(filters.poin));

      return matchesSearch && matchesFilter;
    });

    setFilteredPelanggaran(filtered);
  }, [pelanggaran, mahasiswa, peraturan, searchQuery, filters]);

  // Hitung statistik
  const totalPelanggaran = pelanggaran.length;
  const pelanggaranBulanIni = pelanggaran.filter(p => {
    const date = new Date(p.tanggal);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const perluDiperhatikan = mahasiswa.filter(m => m.status === 'Terancam DO').length;

  // Handle submit form
  const onSubmit = async (data: PelanggaranFormData) => {
    try {
      // Validasi data
      if (!data.mahasiswaId) {
        toast.error('Mahasiswa harus dipilih');
        return;
      }
      if (!data.peraturanId) {
        toast.error('Peraturan harus dipilih');
        return;
      }
      if (!data.tanggal) {
        toast.error('Tanggal harus diisi');
        return;
      }
      if (!data.keterangan) {
        toast.error('Keterangan harus diisi');
        return;
      }

      // Cari peraturan yang dipilih
      const selectedPeraturan = peraturan.find(p => p.id === data.peraturanId);
      if (!selectedPeraturan) {
        toast.error('Peraturan tidak ditemukan');
        return;
      }

      // Cari mahasiswa yang dipilih
      const selectedMahasiswa = mahasiswa.find(m => m.id === data.mahasiswaId);
      if (!selectedMahasiswa) {
        toast.error('Mahasiswa tidak ditemukan');
        return;
      }

      const pelanggaranData = {
        mahasiswaId: data.mahasiswaId,
        peraturanId: data.peraturanId,
        tanggal: data.tanggal,
        keterangan: data.keterangan,
        buktiURLs: data.buktiURLs || [],
        poin: selectedPeraturan.poin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (selectedPelanggaran) {
        await updatePelanggaran(selectedPelanggaran.id, pelanggaranData);
        toast.success('Data pelanggaran berhasil diperbarui');
        // Notifikasi ke mahasiswa
        if (selectedMahasiswa && (selectedMahasiswa.uid || selectedMahasiswa.id)) {
          await addNotifikasi({
            userId: selectedMahasiswa.uid || selectedMahasiswa.id,
            title: 'Pelanggaran Diperbarui',
            message: `Data pelanggaran Anda telah diperbarui oleh admin. (${selectedPeraturan?.nama || ''} - ${selectedPeraturan?.kategori || ''})`,
            type: 'pelanggaran'
          });
        }
      } else {
        await createPelanggaran(pelanggaranData);
        toast.success('Pelanggaran baru berhasil ditambahkan');
        // Notifikasi ke mahasiswa
        if (selectedMahasiswa && (selectedMahasiswa.uid || selectedMahasiswa.id)) {
          await addNotifikasi({
            userId: selectedMahasiswa.uid || selectedMahasiswa.id,
            title: 'Pelanggaran Baru',
            message: `Anda mendapat sanksi pelanggaran: ${selectedPeraturan?.nama || ''} (${selectedPeraturan?.kategori || ''})`,
            type: 'pelanggaran'
          });
        }
      }

      // Reset form dan tutup modal
      handleCloseModal();
      
      // Refresh data
      const updatedData = await getPelanggaran();
      setPelanggaran(updatedData as Pelanggaran[]);
    } catch (error) {
      console.error('Error saving pelanggaran:', error);
      toast.error('Gagal menyimpan data pelanggaran');
    }
  };

  // Handle edit pelanggaran
  const handleEdit = (pelanggaran: Pelanggaran) => {
    setSelectedPelanggaran(pelanggaran);
    setPreviewImages(pelanggaran.buktiURLs || []);
    reset({
      mahasiswaId: pelanggaran.mahasiswaId,
      peraturanId: pelanggaran.peraturanId,
      tanggal: pelanggaran.tanggal,
      keterangan: pelanggaran.keterangan,
      buktiURLs: pelanggaran.buktiURLs,
    });
    setShowModal(true);
  };

  // Handle view detail pelanggaran
  const handleView = (id: string) => {
    router.push(`/admin/pelanggaran/${id}`);
  };

  // Handle export data
  const handleExport = () => {
    const data = filteredPelanggaran.map(p => {
      const selectedMahasiswa = mahasiswa.find(m => m.id === p.mahasiswaId);
      const selectedPeraturan = peraturan.find(pr => pr.id === p.peraturanId);
      return {
        'Nama Mahasiswa': selectedMahasiswa?.name || '',
        'NIM': selectedMahasiswa?.nim || '',
        'Jenis Pelanggaran': selectedPeraturan?.nama || '',
        'Kategori': selectedPeraturan?.kategori || '',
        'Poin': selectedPeraturan?.poin || 0,
        'Tanggal': p.tanggal,
        'Keterangan': p.keterangan,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pelanggaran');
    XLSX.writeFile(wb, 'data_pelanggaran.xlsx');
  };

  // Fungsi untuk handle upload gambar
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setIsUploading(true);
      const urls = await Promise.all(files.map(file => uploadImageToCloudinary(file)));
      setValue('buktiURLs', [...(watch('buktiURLs') || []), ...urls]);
      setPreviewImages([...previewImages, ...urls]);
      toast.success('Bukti berhasil diupload');
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Gagal mengupload bukti');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const currentUrls = watch('buktiURLs') || [];
    const newUrls = currentUrls.filter((_, i) => i !== index);
    setValue('buktiURLs', newUrls);
    setPreviewImages(newUrls);
  };

  // Update reset untuk membersihkan preview
  const handleCloseModal = () => {
    setShowModal(false);
    reset();
    setPreviewImages([]);
  };

  // Tambahkan fungsi handleDelete
  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pelanggaran ini?')) {
      try {
        await deletePelanggaran(id);
        toast.success('Pelanggaran berhasil dihapus');
        // Notifikasi ke mahasiswa (opsional, jika ingin)
        // Anda bisa mengambil data pelanggaran sebelum dihapus jika ingin mengirim notifikasi detail
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Pencatatan Pelanggaran</h1>
        <Button
          onClick={() => {
            setSelectedPelanggaran(null);
            reset({});
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusCircle size={18} />
          <span>Tambah Pelanggaran</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pelanggaran</p>
                <p className="text-2xl font-bold text-gray-900">{totalPelanggaran}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pelanggaran Bulan Ini</p>
                <p className="text-2xl font-bold text-gray-900">{pelanggaranBulanIni}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-full">
                <Eye className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Perlu Diperhatikan</p>
                <p className="text-2xl font-bold text-gray-900">{perluDiperhatikan}</p>
                <p className="text-xs text-gray-500">Mahasiswa dengan status "Terancam DO"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <CardTitle>Riwayat Pelanggaran</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Cari mahasiswa atau jenis pelanggaran..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilterModal(true)}
                className="flex items-center gap-2"
              >
                <Filter size={18} />
                <span>Filter</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mahasiswa</TableHead>
                <TableHead>NIM</TableHead>
                <TableHead>Jenis Pelanggaran</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Poin</TableHead>
                <TableHead>Bukti</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredPelanggaran.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Tidak ada data pelanggaran
                  </TableCell>
                </TableRow>
              ) : (
                filteredPelanggaran.map((p) => {
                  const selectedMahasiswa = mahasiswa.find(m => m.id === p.mahasiswaId);
                  const selectedPeraturan = peraturan.find(pr => pr.id === p.peraturanId);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                            {selectedMahasiswa?.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span>{selectedMahasiswa?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{selectedMahasiswa?.nim}</TableCell>
                      <TableCell>{selectedPeraturan?.nama}</TableCell>
                      <TableCell>{new Date(p.tanggal).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            selectedPeraturan?.kategori === 'Ringan'
                              ? 'info'
                              : selectedPeraturan?.kategori === 'Sedang'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {selectedPeraturan?.poin} Poin
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.buktiURLs && p.buktiURLs.length > 0 ? (
                          <div className="flex gap-2">
                            {p.buktiURLs.map((url, index) => (
                              <Button
                                key={index}
                                variant="link"
                                onClick={() => window.open(url, '_blank')}
                              >
                                Bukti {index + 1}
                              </Button>
                            ))}
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
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Form Pelanggaran */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={selectedPelanggaran ? 'Edit Pelanggaran' : 'Tambah Pelanggaran'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Mahasiswa</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari mahasiswa berdasarkan nama atau NIM..."
                value={searchMahasiswa}
                onChange={(e) => setSearchMahasiswa(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              />
              {filteredMahasiswa.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredMahasiswa.map((m) => (
                    <div
                      key={m.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSearchMahasiswa(`${m.name} - ${m.nim}`);
                        setValue('mahasiswaId', m.id);
                        setFilteredMahasiswa([]);
                      }}
                    >
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-gray-500">{m.nim}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              type="hidden"
              {...register('mahasiswaId')}
            />
            {errors.mahasiswaId && (
              <p className="mt-1 text-sm text-red-600">{errors.mahasiswaId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Peraturan</label>
            <select
              {...register('peraturanId')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Pilih Peraturan</option>
              {peraturan.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} - {p.poin} Poin
                </option>
              ))}
            </select>
            {errors.peraturanId && (
              <p className="mt-1 text-sm text-red-600">{errors.peraturanId.message}</p>
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
            <label className="block text-sm font-medium text-gray-700">Keterangan</label>
            <textarea
              {...register('keterangan')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={3}
            />
            {errors.keterangan && (
              <p className="mt-1 text-sm text-red-600">{errors.keterangan.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bukti Pelanggaran</label>
            <div className="mt-1">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="bukti-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="bukti-upload"
                className={`cursor-pointer px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? 'Mengupload...' : 'Upload Bukti'}
              </label>
              
              {previewImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previewImages.map((url, index) => (
                    <div key={index} className="relative">
                      <img
                        src={url}
                        alt={`Preview bukti ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              type="hidden"
              {...register('buktiURLs')}
            />
            {errors.buktiURLs && (
              <p className="mt-1 text-sm text-red-600">{errors.buktiURLs.message}</p>
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
              {selectedPelanggaran ? 'Simpan Perubahan' : 'Tambah Pelanggaran'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Filter */}
      <Modal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title="Filter Pelanggaran"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tanggal</label>
            <input
              type="date"
              value={filters.tanggal}
              onChange={(e) => setFilters({ ...filters, tanggal: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Jenis Pelanggaran</label>
            <select
              value={filters.jenis}
              onChange={(e) => setFilters({ ...filters, jenis: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Semua Jenis</option>
              <option value="Ringan">Ringan</option>
              <option value="Sedang">Sedang</option>
              <option value="Berat">Berat</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Poin</label>
            <select
              value={filters.poin}
              onChange={(e) => setFilters({ ...filters, poin: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">Semua Poin</option>
              <option value="5">5 Poin</option>
              <option value="10">10 Poin</option>
              <option value="15">15 Poin</option>
              <option value="20">20 Poin</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilters({
                  tanggal: '',
                  jenis: '',
                  poin: '',
                });
                setShowFilterModal(false);
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => setShowFilterModal(false)}
            >
              Terapkan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 