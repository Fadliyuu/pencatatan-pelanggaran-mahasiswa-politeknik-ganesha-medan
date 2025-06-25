"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { Search, AlertTriangle, BookOpen } from "lucide-react";
import Badge from "@/components/UI/Badge";
import { getPeraturan } from "@/lib/firebase";

interface Peraturan {
  id: string;
  kode: string;
  nama: string;
  kategori: "Ringan" | "Sedang" | "Berat";
  poin: number;
  deskripsi: string;
  createdAt: string;
  updatedAt: string;
}

export default function PeraturanPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [peraturan, setPeraturan] = useState<Peraturan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeraturan = async () => {
      try {
        const data = await getPeraturan();
        setPeraturan(data as Peraturan[]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching peraturan:", error);
        setLoading(false);
      }
    };

    fetchPeraturan();
  }, []);

  // Filter peraturan berdasarkan pencarian dan kategori
  const filteredPeraturan = peraturan.filter(peraturan => {
    const matchesSearch = peraturan.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         peraturan.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || peraturan.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Peraturan Kampus</h1>
        <p className="text-gray-600">Daftar peraturan dan sanksi pelanggaran kedisiplinan</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari peraturan..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          <option value="Ringan">Ringan</option>
          <option value="Sedang">Sedang</option>
          <option value="Berat">Berat</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPeraturan.map((peraturan) => (
          <Card key={peraturan.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-primary-600" />
                <CardTitle className="text-lg">{peraturan.nama}</CardTitle>
              </div>
              <Badge 
                variant={
                  peraturan.kategori === "Ringan" ? "success" :
                  peraturan.kategori === "Sedang" ? "warning" : "danger"
                }
              >
                {peraturan.kategori}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Kode Peraturan</span>
                  <span className="font-medium">{peraturan.kode}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Poin Pelanggaran</span>
                  <span className="font-medium text-red-600">{peraturan.poin} poin</span>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-gray-600">{peraturan.deskripsi}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPeraturan.length === 0 && (
          <div className="text-center py-8">
            <AlertTriangle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Tidak ada peraturan ditemukan</h3>
            <p className="text-gray-500">Coba ubah kata kunci pencarian atau filter kategori</p>
          </div>
        )}
      </div>
    </div>
  );
} 