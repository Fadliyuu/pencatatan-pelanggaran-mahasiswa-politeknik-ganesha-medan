"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { useAuth } from "@/hooks/useAuth";
import { getPelanggaran, getMahasiswa, getPeraturan } from "@/lib/firebase";
import Badge from "@/components/UI/Badge";
import { formatTanggalIndonesia } from "@/lib/utils";
import { Input } from "@/components/UI/Input";
import { Select } from "@/components/UI/Select";
import { toast } from "react-hot-toast";

interface Pelanggaran {
  id: string;
  mahasiswaId: string;
  peraturanId: string;
  peraturan: {
    nama: string;
    kategori: string;
    poin: number;
  };
  tanggal: string;
  keterangan: string;
  status: string;
  mahasiswa?: {
    name: string;
    nim: string;
    programStudi: string;
  };
}

interface Peraturan {
  id: string;
  nama: string;
  kategori: string;
  poin: number;
}

export default function RiwayatPage() {
  const { user } = useAuth();
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [filteredPelanggaran, setFilteredPelanggaran] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchNim, setSearchNim] = useState("");
  const [selectedPeraturan, setSelectedPeraturan] = useState("");
  const [peraturanList, setPeraturanList] = useState<Peraturan[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setError("Silakan login terlebih dahulu");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Ambil data peraturan untuk filter
        const peraturanData = await getPeraturan();
        setPeraturanList(peraturanData as Peraturan[]);

        // Ambil semua data pelanggaran
        const pelanggaranData = await getPelanggaran();
        
        // Gabungkan data pelanggaran dengan data peraturan
        const pelanggaranWithPeraturan = await Promise.all(
          (pelanggaranData as any[]).map(async (p) => {
            const peraturan = peraturanData.find(per => per.id === p.peraturanId);
            return {
              ...p,
              status: p.status || "Diproses",
              peraturan: peraturan || {
                nama: "Peraturan tidak ditemukan",
                kategori: "Tidak Diketahui",
                poin: 0
              }
            };
          })
        );

        setPelanggaran(pelanggaranWithPeraturan);
        setFilteredPelanggaran(pelanggaranWithPeraturan);
      } catch (error) {
        console.error("Error dalam fetchData:", error);
        setError(error instanceof Error ? error.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSearch = async () => {
    if (!searchNim.trim()) {
      setFilteredPelanggaran(pelanggaran);
      return;
    }

    try {
      setLoading(true);
      
      // Cari mahasiswa berdasarkan NIM
      const mahasiswaData = await getMahasiswa();
      const mahasiswa = mahasiswaData.find((m: any) => m.nim === searchNim);

      if (!mahasiswa) {
        toast.error("Mahasiswa dengan NIM tersebut tidak ditemukan");
        setFilteredPelanggaran([]);
        return;
      }

      // Filter pelanggaran berdasarkan mahasiswaId dan peraturan yang dipilih
      let filtered = pelanggaran.filter(p => p.mahasiswaId === mahasiswa.id);
      
      if (selectedPeraturan) {
        filtered = filtered.filter(p => p.peraturanId === selectedPeraturan);
      }

      setFilteredPelanggaran(filtered);
    } catch (error) {
      console.error("Error dalam pencarian:", error);
      toast.error("Gagal melakukan pencarian");
    } finally {
      setLoading(false);
    }
  };

  const handlePeraturanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const peraturanId = e.target.value;
    setSelectedPeraturan(peraturanId);

    if (!peraturanId) {
      setFilteredPelanggaran(pelanggaran);
      return;
    }

    const filtered = pelanggaran.filter(p => p.peraturanId === peraturanId);
    setFilteredPelanggaran(filtered);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pelanggaran Mahasiswa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 flex gap-2">
            <Input
                placeholder="Cari berdasarkan NIM..."
                value={searchNim}
                onChange={(e) => setSearchNim(e.target.value)}
              className="flex-1"
            />
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Cari
              </button>
            </div>
            <Select
              value={selectedPeraturan}
              onChange={handlePeraturanChange}
              className="w-full md:w-48"
            >
              <option value="">Semua Jenis Pelanggaran</option>
              {peraturanList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} ({p.kategori})
                </option>
              ))}
            </Select>
          </div>

          {filteredPelanggaran.length === 0 ? (
            <div className="text-center py-6">
            <p className="text-gray-500">Tidak ada pelanggaran ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPelanggaran.map((item) => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-medium text-lg">{item.peraturan.nama}</h4>
                        <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant={
                          item.peraturan.kategori === "Ringan"
                            ? "success"
                            : item.peraturan.kategori === "Sedang"
                            ? "warning"
                            : "danger"
                        }
                      >
                            {item.peraturan.kategori}
                          </Badge>
                          <span className="text-sm font-medium text-primary-600">
                            {item.peraturan.poin} poin
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">NIM:</span> {item.mahasiswa?.nim ? 
                            `${item.mahasiswa.nim.substring(0, 3)}***${item.mahasiswa.nim.substring(item.mahasiswa.nim.length - 3)}` 
                            : "***"}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Program Studi:</span> {item.mahasiswa?.programStudi || "-"}
                        </p>
                      </div>
                      <div className="pt-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Deskripsi:</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.keterangan}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          item.status === "Diterima"
                            ? "success"
                            : item.status === "Diproses"
                            ? "warning"
                            : "danger"
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {formatTanggalIndonesia(item.tanggal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 