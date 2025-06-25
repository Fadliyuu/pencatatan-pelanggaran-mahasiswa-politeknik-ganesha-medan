"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { AlertCircle, Search, Calendar, FileText, Pin, ChevronDown, ChevronUp, Clock, Tag, X, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getPengumuman } from "@/lib/firebase";
import { formatTanggalIndonesia } from "@/lib/dates";
import Badge from "@/components/UI/Badge";

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  kategori: string;
  tanggal: string;
  penting: boolean;
  gambarURL?: string;
}

const KATEGORI_OPTIONS = [
  { value: "akademik", label: "Akademik", icon: FileText },
  { value: "non-akademik", label: "Non-Akademik", icon: AlertCircle },
  { value: "beasiswa", label: "Beasiswa", icon: Tag },
  { value: "kampus", label: "Kampus", icon: Calendar }
];

export default function PengumumanPage() {
  const { user } = useAuth();
  const [pengumuman, setPengumuman] = useState<Pengumuman[]>([]);
  const [filteredPengumuman, setFilteredPengumuman] = useState<Pengumuman[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("");
  const [expandedPengumuman, setExpandedPengumuman] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getPengumuman();
        const sortedData = data.sort((a: any, b: any) => {
          if (a.penting && !b.penting) return -1;
          if (!a.penting && b.penting) return 1;
          return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
        });
        setPengumuman(sortedData as Pengumuman[]);
        setFilteredPengumuman(sortedData as Pengumuman[]);
      } catch (error) {
        console.error("Error fetching pengumuman:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = pengumuman;

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.isi.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedKategori) {
      filtered = filtered.filter((p) => p.kategori === selectedKategori);
    }

    setFilteredPengumuman(filtered);
  }, [searchQuery, selectedKategori, pengumuman]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKategoriSelect = (kategori: string) => {
    setSelectedKategori(kategori === selectedKategori ? "" : kategori);
  };

  const toggleExpand = (id: string) => {
    setExpandedPengumuman(expandedPengumuman === id ? null : id);
  };

  const handleImageClick = (url: string) => {
    setSelectedImage(url);
  };

  const handleImageLoad = (id: string) => {
    setImageLoading(prev => ({ ...prev, [id]: false }));
  };

  const getKategoriColor = (kategori: string = "") => {
    const kategoriLower = kategori.toLowerCase();
    switch (kategoriLower) {
      case "akademik":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "non-akademik":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "beasiswa":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "kampus":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari pengumuman..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white text-lg"
              />
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <button
              onClick={() => handleKategoriSelect("")}
              className={`px-6 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                selectedKategori === ""
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Semua
            </button>
            {KATEGORI_OPTIONS.map((kategori) => {
              const Icon = kategori.icon;
              return (
                <button
                  key={kategori.value}
                  onClick={() => handleKategoriSelect(kategori.value)}
                  className={`px-6 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                    selectedKategori === kategori.value
                      ? "bg-primary-600 text-white shadow-md"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  <Icon size={16} />
                  {kategori.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pengumuman List */}
      <div className="grid grid-cols-1 gap-8">
        {filteredPengumuman.map((p) => (
          <Card 
            key={p.id}
            className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
              p.penting ? 'border-2 border-red-500 dark:border-red-400' : ''
            }`}
          >
            {p.penting && (
              <div className="absolute top-0 right-0 bg-red-500 dark:bg-red-400 text-white px-4 py-2 rounded-bl-xl flex items-center gap-2">
                <Pin size={16} />
                <span className="font-medium">Penting</span>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge className={getKategoriColor(p.kategori)}>
                      {p.kategori || "Umum"}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      <span>{formatTanggalIndonesia(new Date(p.tanggal))}</span>
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2">{p.judul}</CardTitle>
                </div>
                <button
                  onClick={() => toggleExpand(p.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  {expandedPengumuman === p.id ? (
                    <ChevronUp size={24} />
                  ) : (
                    <ChevronDown size={24} />
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className={`prose dark:prose-invert max-w-none ${
                expandedPengumuman === p.id ? 'block' : 'line-clamp-3'
              }`}>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">{p.isi}</p>
              </div>
              {p.gambarURL && (
                <div className="mt-6 relative group">
                  <div className="relative aspect-video overflow-hidden rounded-xl">
                    {imageLoading[p.id] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    )}
                    <img
                      src={p.gambarURL}
                      alt={p.judul}
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                      onClick={() => handleImageClick(p.gambarURL!)}
                      onLoad={() => handleImageLoad(p.id)}
                      style={{ display: imageLoading[p.id] ? 'none' : 'block' }}
                    />
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                    <ImageIcon 
                      size={32} 
                      className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredPengumuman.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
            <AlertCircle size={64} className="mx-auto text-gray-400 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              Tidak ada pengumuman ditemukan
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery || selectedKategori
                ? "Coba ubah filter atau kata kunci pencarian Anda"
                : "Belum ada pengumuman yang tersedia"}
            </p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl w-full mx-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X size={32} />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="w-full h-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
} 