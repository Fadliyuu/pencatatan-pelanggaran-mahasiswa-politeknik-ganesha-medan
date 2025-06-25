"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getPeraturan } from '@/lib/firebase';
import { 
  Search, 
  Filter, 
  ChevronDown,
  ChevronUp,
  FileText,
  PlusCircle,
  X,
  AlertTriangle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: 'Ringan' | 'Sedang' | 'Berat';
  poin: number;
}

export default function PeraturanPage() {
  const router = useRouter();
  const [peraturan, setPeraturan] = useState<Peraturan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('kode');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeraturan, setSelectedPeraturan] = useState<Peraturan | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        fetchData();
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchData = async () => {
    try {
      const peraturanData = await getPeraturan();
      setPeraturan(peraturanData as Peraturan[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredPeraturan = peraturan
    .filter(item => {
      const matchesSearch = 
        item.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nama.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'semua' || item.kategori === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'kode') {
        comparison = a.kode.localeCompare(b.kode);
      } else if (sortField === 'nama') {
        comparison = a.nama.localeCompare(b.nama);
      } else if (sortField === 'kategori') {
        comparison = a.kategori.localeCompare(b.kategori);
      } else if (sortField === 'poin') {
        comparison = a.poin - b.poin;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getStatusColor = (kategori: string) => {
    switch (kategori) {
      case 'Ringan':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'Sedang':
        return 'bg-orange-500/20 text-orange-300';
      case 'Berat':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getStatusIcon = (kategori: string) => {
    switch (kategori) {
      case 'Ringan':
        return <Clock className="h-5 w-5" />;
      case 'Sedang':
        return <AlertTriangle className="h-5 w-5" />;
      case 'Berat':
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const handleDetailClick = (peraturan: Peraturan) => {
    setSelectedPeraturan(peraturan);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPeraturan(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Daftar Peraturan</h1>
          <p className="text-white/80">Lihat dan pelajari peraturan yang berlaku</p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan kode atau nama peraturan..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-white transition-all duration-300"
              >
                <Filter className="h-5 w-5" />
                Filter
                {showFilters ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/80 mb-2">Kategori Pelanggaran</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="semua">Semua Kategori</option>
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-white/80 border-b border-white/10">
                <th className="pb-4 px-4">
                  <button
                    onClick={() => handleSort('kode')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Kode
                    {sortField === 'kode' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="pb-4 px-4">
                  <button
                    onClick={() => handleSort('nama')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Nama Peraturan
                    {sortField === 'nama' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="pb-4 px-4">
                  <button
                    onClick={() => handleSort('kategori')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Kategori
                    {sortField === 'kategori' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="pb-4 px-4">
                  <button
                    onClick={() => handleSort('poin')}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                  >
                    Poin
                    {sortField === 'poin' && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="pb-4 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeraturan.map((item) => (
                <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4 text-white/80">{item.kode}</td>
                  <td className="py-4 px-4 text-white/80">{item.nama}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(item.kategori)}`}>
                      {getStatusIcon(item.kategori)}
                      {item.kategori}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-white/80">{item.poin}</td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleDetailClick(item)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                      title="Detail"
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPeraturan.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-white/60 mx-auto mb-4" />
              <p className="text-white/80">Tidak ada data peraturan yang ditemukan</p>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedPeraturan && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Detail Peraturan</h2>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-white/80 mb-2">Kode Peraturan</h3>
                  <p className="text-white">{selectedPeraturan.kode}</p>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Nama Peraturan</h3>
                  <p className="text-white">{selectedPeraturan.nama}</p>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Kategori & Poin</h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getStatusColor(selectedPeraturan.kategori)}`}>
                      {getStatusIcon(selectedPeraturan.kategori)}
                      {selectedPeraturan.kategori}
                    </span>
                    <span className="text-white">{selectedPeraturan.poin} poin</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 