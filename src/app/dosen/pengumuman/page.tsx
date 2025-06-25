"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getPengumuman } from '@/lib/firebase';
import { 
  Search, 
  Filter, 
  ChevronDown,
  ChevronUp,
  FileText,
  PlusCircle,
  X,
  AlertTriangle,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  gambarURL?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PengumumanPage() {
  const router = useRouter();
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPengumuman, setSelectedPengumuman] = useState<Pengumuman | null>(null);

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
      const pengumumanData = await getPengumuman();
      setPengumuman(pengumumanData as Pengumuman[]);
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

  const filteredPengumuman = pengumuman
    .filter(item => {
      return item.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.isi.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'judul') {
        comparison = a.judul.localeCompare(b.judul);
      } else if (sortField === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleDetailClick = (pengumuman: Pengumuman) => {
    setSelectedPengumuman(pengumuman);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPengumuman(null);
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
          <h1 className="text-3xl font-bold text-white mb-2">Pengumuman</h1>
          <p className="text-white/80">Lihat pengumuman terbaru dari admin</p>
        </div>

        {/* Search Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Cari pengumuman..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pengumuman Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPengumuman.map((item) => (
            <div 
              key={item.id}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 cursor-pointer"
              onClick={() => handleDetailClick(item)}
            >
              {item.gambarURL && (
                <div className="relative w-full h-48 mb-4 rounded-xl overflow-hidden">
                  <Image
                    src={item.gambarURL}
                    alt={item.judul}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-white/60 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">{formatDate(item.createdAt)}</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">{item.judul}</h3>
              <p className="text-white/80 line-clamp-3">{item.isi}</p>
            </div>
          ))}
        </div>

        {filteredPengumuman.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-white/60 mx-auto mb-4" />
            <p className="text-white/80">Tidak ada pengumuman yang ditemukan</p>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedPengumuman && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Detail Pengumuman</h2>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {selectedPengumuman.gambarURL && (
                  <div className="relative w-full h-64 rounded-xl overflow-hidden">
                    <Image
                      src={selectedPengumuman.gambarURL}
                      alt={selectedPengumuman.judul}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-white/80 mb-2">Judul</h3>
                  <p className="text-white text-xl font-semibold">{selectedPengumuman.judul}</p>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Tanggal</h3>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="h-5 w-5" />
                    <span>{formatDate(selectedPengumuman.createdAt)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Isi Pengumuman</h3>
                  <p className="text-white whitespace-pre-wrap">{selectedPengumuman.isi}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 