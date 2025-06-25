'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { Search, FileText, Download, Filter, AlertTriangle, CheckCircle, XCircle, Trash2, Edit } from 'lucide-react';
import { getLaporan, createPelanggaran, getPeraturan, addLaporanStatusNotifikasi, addBandingStatusNotifikasi, addNotifikasi } from '@/lib/firebase';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import Modal from '@/components/UI/Modal';
import { useAuth } from '@/hooks/useAuth';

interface Laporan {
  id: string;
  mahasiswaId: string;
  judul: string;
  isi: string;
  tanggal: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  jenis: 'Pelanggaran' | 'Banding';
  createdAt: string;
  updatedAt: string;
  mahasiswa?: {
    name: string;
    nim: string;
  };
  pelanggaranId?: string;
  alasanBanding?: string;
  statusBanding?: 'Menunggu' | 'Diterima' | 'Ditolak';
  peraturanId?: string;
  buktiURLs?: string[];
}

interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
}

interface Mahasiswa {
  id: string;
  name: string;
  nim: string;
  jurusan: string;
  angkatan: string;
}

export default function LaporanPage() {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jenisFilter, setJenisFilter] = useState<string>('all');
  const [selectedLaporan, setSelectedLaporan] = useState<Laporan | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPeraturanModal, setShowPeraturanModal] = useState(false);
  const [peraturanList, setPeraturanList] = useState<Peraturan[]>([]);
  const [selectedPeraturan, setSelectedPeraturan] = useState<string>('');
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<Mahasiswa | null>(null);
  const [searchMahasiswa, setSearchMahasiswa] = useState('');
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [deskripsi, setDeskripsi] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchLaporan();
    fetchPeraturan();
  }, []);

  useEffect(() => {
    if (selectedLaporan) {
      setSelectedMahasiswa({
        id: selectedLaporan.mahasiswaId || '',
        name: selectedLaporan.mahasiswa?.name || '',
        nim: selectedLaporan.mahasiswa?.nim || '',
        jurusan: '',
        angkatan: ''
      });
      setDeskripsi(selectedLaporan.isi || '');
    }
  }, [selectedLaporan]);

  const fetchLaporan = async () => {
    try {
      setLoading(true);
      const data = await getLaporan();
      console.log('Data Laporan:', data);
      console.log('Data Laporan dengan jenis dan status:', data.map((item: any) => ({
        id: item.id,
        jenis: item.jenis,
        status: item.status
      })));
      setLaporan(data as Laporan[]);
    } catch (error) {
      console.error('Error fetching laporan:', error);
      toast.error('Gagal mengambil data laporan');
    } finally {
      setLoading(false);
    }
  };

  const fetchPeraturan = async () => {
    try {
      const data = await getPeraturan();
      const formattedData = data.map((item: any) => ({
        id: item.id,
        kode: item.kode || '',
        nama: item.nama || 'Peraturan Default',
        kategori: item.kategori || 'Ringan',
        poin: item.poin || 0
      }));
      setPeraturanList(formattedData);
    } catch (error) {
      console.error('Error fetching peraturan:', error);
      toast.error('Gagal mengambil data peraturan');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'Menunggu' | 'Disetujui' | 'Ditolak') => {
    try {
      const laporanRef = doc(db, 'laporan', id);
      const laporanData = laporan.find(l => l.id === id);

      if (newStatus === 'Disetujui' && laporanData?.jenis === 'Banding' && laporanData?.pelanggaranId) {
        // Hapus pelanggaran terkait jika banding disetujui
        await deleteDoc(doc(db, 'pelanggaran', laporanData.pelanggaranId));
        toast.success('Pelanggaran berhasil dihapus');
      }

      await updateDoc(laporanRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      setLaporan(laporan.map(item => 
        item.id === id ? { ...item, status: newStatus } : item
      ));
      toast.success('Status laporan berhasil diperbarui');

      // Notifikasi ke mahasiswa terkait
      if (laporanData && (newStatus === 'Disetujui' || newStatus === 'Ditolak')) {
        const adminName = user?.displayName || 'Admin';
        await addLaporanStatusNotifikasi(laporanData.mahasiswaId, adminName, newStatus);
        // Notifikasi ke semua admin lain
        const adminUid = user?.uid;
        const adminSnapshot = await getDocs(collection(db, 'admin'));
        const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Status Laporan',
                message: `Admin ${adminName} ${newStatus === 'Disetujui' ? 'menyetujui' : 'menolak'} laporan ${laporanData.mahasiswa?.name || ''} (${laporanData.mahasiswa?.nim || ''})`,
                type: 'laporan'
              })
            )
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal memperbarui status laporan');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      try {
        await deleteDoc(doc(db, 'laporan', id));
        setLaporan(laporan.filter(item => item.id !== id));
        toast.success('Laporan berhasil dihapus');
      } catch (error) {
        console.error('Error deleting laporan:', error);
        toast.error('Gagal menghapus laporan');
      }
    }
  };

  const handleSearchMahasiswa = async (query: string) => {
    setSearchMahasiswa(query);
    if (!query.trim()) {
      setMahasiswaList([]);
      return;
    }

    try {
      const mahasiswaRef = collection(db, 'mahasiswa');
      const snapshot = await getDocs(mahasiswaRef);
      const data = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          nim: data.nim || '',
          jurusan: data.jurusan || '',
          angkatan: data.angkatan || ''
        };
      });

      // Filter di client side
      const filteredData = data.filter(mhs => 
        mhs.name.toLowerCase().includes(query.toLowerCase()) || 
        mhs.nim.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5); // Batasi 5 hasil

      setMahasiswaList(filteredData);
    } catch (error) {
      console.error('Error searching mahasiswa:', error);
    }
  };

  const handleProsesPelanggaran = async (laporan: Laporan) => {
    if (!laporan.peraturanId) {
      setSelectedLaporan(laporan);
      setShowPeraturanModal(true);
      return;
    }

    try {
      const selectedPeraturanData = peraturanList.find(p => p.id === laporan.peraturanId);
      
      const pelanggaranData = {
        mahasiswaId: laporan.mahasiswaId,
        peraturanId: laporan.peraturanId,
        tanggal: new Date().toISOString(),
        keterangan: laporan.isi,
        buktiURL: undefined
      };

      await createPelanggaran(pelanggaranData);
      toast.success('Laporan berhasil diproses menjadi pelanggaran');
      
      // Refresh data laporan
      await fetchLaporan();
    } catch (error) {
      console.error('Error processing laporan:', error);
      toast.error('Gagal memproses laporan');
    }
  };

  const handlePeraturanSelect = async () => {
    if (!selectedLaporan || !selectedPeraturan || !selectedMahasiswa) return;

    try {
      const selectedPeraturanData = peraturanList.find(p => p.id === selectedPeraturan);
      
      const pelanggaranData = {
        mahasiswaId: selectedLaporan.mahasiswaId,
        peraturanId: selectedPeraturan,
        tanggal: new Date().toISOString(),
        keterangan: deskripsi,
        buktiURL: undefined
      };

      await createPelanggaran(pelanggaranData);
      
      // Kirim notifikasi ke mahasiswa
      await addNotifikasi({
        userId: selectedLaporan.mahasiswaId,
        title: 'Pelanggaran Baru',
        message: `Anda telah menerima pelanggaran baru: ${selectedPeraturanData?.nama || 'Pelanggaran'}`,
        type: 'pelanggaran'
      });

      // Update status laporan menjadi disetujui
      await handleStatusChange(selectedLaporan.id, 'Disetujui');
      
      setShowPeraturanModal(false);
      setSelectedLaporan(null);
      setSelectedPeraturan('');
      setDeskripsi('');
      toast.success('Laporan berhasil diproses menjadi pelanggaran');
      
      // Refresh data laporan
      await fetchLaporan();
    } catch (error) {
      console.error('Error processing laporan:', error);
      toast.error('Gagal memproses laporan');
    }
  };

  const handleBandingStatus = async (id: string, status: 'Diterima' | 'Ditolak') => {
    try {
      const laporanRef = doc(db, 'laporan', id);
      await updateDoc(laporanRef, {
        statusBanding: status,
        updatedAt: new Date().toISOString()
      });
      
      setLaporan(laporan.map(item => 
        item.id === id ? { ...item, statusBanding: status } : item
      ));
      toast.success(`Aju banding ${status.toLowerCase()}`);

      // Notifikasi ke mahasiswa terkait
      const laporanData = laporan.find(l => l.id === id);
      if (laporanData) {
        const adminName = user?.displayName || 'Admin';
        await addBandingStatusNotifikasi(laporanData.mahasiswaId, adminName, status);
        // Notifikasi ke semua admin lain
        const adminUid = user?.uid;
        const adminSnapshot = await getDocs(collection(db, 'admin'));
        const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Status Banding',
                message: `Admin ${adminName} ${status === 'Diterima' ? 'menyetujui' : 'menolak'} banding ${laporanData.mahasiswa?.name || ''} (${laporanData.mahasiswa?.nim || ''})`,
                type: 'banding'
              })
            )
        );
      }
    } catch (error) {
      console.error('Error updating banding status:', error);
      toast.error('Gagal memperbarui status banding');
    }
  };

  const filteredLaporan = laporan.filter(item => {
    const matchesSearch = 
      (item.judul || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.mahasiswa?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.mahasiswa?.nim || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesJenis = jenisFilter === 'all' || item.jenis === jenisFilter;
    
    return matchesSearch && matchesStatus && matchesJenis;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Menunggu':
        return 'bg-yellow-100 text-yellow-800';
      case 'Disetujui':
        return 'bg-green-100 text-green-800';
      case 'Ditolak':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getJenisIcon = (jenis: string) => {
    switch (jenis) {
      case 'Pelanggaran':
        return <AlertTriangle size={18} className="text-red-500" />;
      case 'Banding':
        return <FileText size={18} className="text-blue-500" />;
      default:
        return <FileText size={18} className="text-gray-500" />;
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Laporan</h1>
        <Button variant="outline" className="flex items-center gap-2">
          <Download size={18} />
          <span>Export</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari laporan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <select
                value={jenisFilter}
                onChange={(e) => setJenisFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Semua Jenis</option>
                <option value="Pelanggaran">Pelanggaran</option>
                <option value="Banding">Banding</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Semua Status</option>
                <option value="Menunggu">Menunggu</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Jenis</th>
                  <th className="text-left py-3 px-4">Judul</th>
                  <th className="text-left py-3 px-4">Mahasiswa</th>
                  <th className="text-left py-3 px-4">Tanggal</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLaporan.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getJenisIcon(item.jenis)}
                        <span>{item.jenis}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-gray-500" />
                        <span>{item.judul}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{item.mahasiswa?.name}</p>
                        <p className="text-sm text-gray-500">{item.mahasiswa?.nim}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{formatDate(item.tanggal)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {item.status === 'Menunggu' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                if (item.jenis === 'Pelanggaran') {
                                  setSelectedLaporan(item);
                                  setShowPeraturanModal(true);
                                } else {
                                  handleStatusChange(item.id, 'Disetujui');
                                }
                              }}
                              className="bg-green-500 hover:bg-green-600 text-white"
                            >
                              <CheckCircle size={16} className="mr-1" />
                              Setuju
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleStatusChange(item.id, 'Ditolak')}
                              className="bg-red-500 hover:bg-red-600 text-white"
                            >
                              <XCircle size={16} className="mr-1" />
                              Tolak
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedLaporan(item);
                            setShowModal(true);
                          }}
                        >
                          Detail
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Detail */}
      <Modal
        isOpen={showModal && !!selectedLaporan}
        onClose={() => setShowModal(false)}
        title="Detail Laporan"
        size="lg"
      >
        {selectedLaporan && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">Judul</h3>
              <p>{selectedLaporan.judul}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Mahasiswa</h3>
              <p>{selectedLaporan.mahasiswa?.name} ({selectedLaporan.mahasiswa?.nim})</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Isi Laporan</h3>
              <p className="whitespace-pre-wrap">{selectedLaporan.isi}</p>
            </div>
            {selectedLaporan.jenis === 'Banding' && (
              <div>
                <h3 className="font-medium text-gray-700">Alasan Banding</h3>
                <p className="whitespace-pre-wrap">{selectedLaporan.alasanBanding}</p>
              </div>
            )}
            <div>
              <h3 className="font-medium text-gray-700">Status</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLaporan.status)}`}>
                {selectedLaporan.status}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-700">Tanggal Dikirim</h3>
              <p>{formatDate(selectedLaporan.createdAt)}</p>
            </div>
            {selectedLaporan.buktiURLs && selectedLaporan.buktiURLs.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700">Bukti</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {selectedLaporan.buktiURLs.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Bukti ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm hover:bg-opacity-70"
                      >
                        Lihat Full
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Pilih Peraturan */}
      <Modal
        isOpen={showPeraturanModal && !!selectedLaporan}
        onClose={() => {
          setShowPeraturanModal(false);
          setSelectedPeraturan('');
          setSelectedMahasiswa(null);
          setDeskripsi('');
        }}
        title="Tambah Pelanggaran"
        size="md"
      >
        {selectedLaporan && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cari Mahasiswa
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchMahasiswa}
                  onChange={(e) => handleSearchMahasiswa(e.target.value)}
                  placeholder="Cari nama atau NIM mahasiswa..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {mahasiswaList.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {mahasiswaList.map((mhs) => (
                      <div
                        key={mhs.id}
                        onClick={() => {
                          setSelectedMahasiswa(mhs);
                          setSearchMahasiswa(mhs.name);
                          setMahasiswaList([]);
                        }}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <p className="font-medium">{mhs.name}</p>
                        <p className="text-sm text-gray-500">NIM: {mhs.nim}</p>
                        {mhs.jurusan && (
                          <p className="text-sm text-gray-500">{mhs.jurusan} - Angkatan {mhs.angkatan}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selectedMahasiswa && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mahasiswa Terpilih
                </label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="font-medium">{selectedMahasiswa.name}</p>
                  <p className="text-sm text-gray-600">NIM: {selectedMahasiswa.nim}</p>
                  {selectedMahasiswa.jurusan && (
                    <p className="text-sm text-gray-600">{selectedMahasiswa.jurusan} - Angkatan {selectedMahasiswa.angkatan}</p>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Pelanggaran
              </label>
              <select
                value={selectedPeraturan}
                onChange={(e) => setSelectedPeraturan(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Pilih Jenis Pelanggaran</option>
                {peraturanList.map((peraturan) => (
                  <option key={peraturan.id} value={peraturan.id}>
                    {peraturan.kode} - {peraturan.nama} ({peraturan.kategori}, {peraturan.poin} poin)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi
              </label>
              <textarea
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
                placeholder="Masukkan deskripsi pelanggaran..."
              />
            </div>
            {selectedLaporan.buktiURLs && selectedLaporan.buktiURLs.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bukti
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {selectedLaporan.buktiURLs.map((url, index) => (
                    <div key={index} className="relative">
                      <img 
                        src={url} 
                        alt={`Bukti ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPeraturanModal(false);
                  setSelectedPeraturan('');
                  setSelectedMahasiswa(null);
                  setDeskripsi('');
                }}
              >
                Batal
              </Button>
              <Button
                variant="default"
                onClick={handlePeraturanSelect}
                disabled={!selectedPeraturan || !selectedMahasiswa}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Simpan
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 