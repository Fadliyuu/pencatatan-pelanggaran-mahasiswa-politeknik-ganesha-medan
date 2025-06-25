"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Filter, CheckCircle, XCircle } from 'lucide-react';

interface Pelanggaran {
  id: string;
  mahasiswaId: string;
  mahasiswaName: string;
  jenisPelanggaran: string;
  tanggal: string;
  lokasi: string;
  deskripsi: string;
  status: string;
  bukti: string;
}

export default function DosenVerifikasi() {
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const fetchPelanggaran = async () => {
      try {
        const pelanggaranRef = collection(db, 'pelanggaran');
        const q = query(pelanggaranRef, where('status', '==', 'menunggu'));
        const querySnapshot = await getDocs(q);
        
        const pelanggaranData = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const data = docSnapshot.data();
            const mahasiswaRef = doc(db, 'users', data.mahasiswaId);
            const mahasiswaDoc = await getDoc(mahasiswaRef);
            const mahasiswaData = mahasiswaDoc.data();
            
            return {
              id: docSnapshot.id,
              mahasiswaId: data.mahasiswaId,
              mahasiswaName: mahasiswaData?.name || 'Unknown',
              jenisPelanggaran: data.jenisPelanggaran,
              tanggal: data.tanggal,
              lokasi: data.lokasi,
              deskripsi: data.deskripsi,
              status: data.status,
              bukti: data.bukti
            } as Pelanggaran;
          })
        );

        setPelanggaran(pelanggaranData);
      } catch (error) {
        console.error('Error fetching pelanggaran:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPelanggaran();
  }, []);

  const handleVerifikasi = async (id: string, status: 'terverifikasi' | 'ditolak') => {
    try {
      const pelanggaranRef = doc(db, 'pelanggaran', id);
      await updateDoc(pelanggaranRef, {
        status: status,
        tanggalVerifikasi: new Date().toISOString()
      });

      setPelanggaran(pelanggaran.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error updating pelanggaran:', error);
    }
  };

  const filteredPelanggaran = pelanggaran.filter(p => {
    const matchesSearch = p.mahasiswaName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.jenisPelanggaran.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Verifikasi Pelanggaran</h1>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari pelanggaran..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="menunggu">Menunggu</option>
            <option value="terverifikasi">Terverifikasi</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mahasiswa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jenis Pelanggaran
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lokasi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPelanggaran.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.mahasiswaName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.jenisPelanggaran}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(p.tanggal).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.lokasi}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      p.status === 'menunggu' ? 'bg-yellow-100 text-yellow-800' :
                      p.status === 'terverifikasi' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleVerifikasi(p.id, 'terverifikasi')}
                        className="text-green-600 hover:text-green-900"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleVerifikasi(p.id, 'ditolak')}
                        className="text-red-600 hover:text-red-900"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 