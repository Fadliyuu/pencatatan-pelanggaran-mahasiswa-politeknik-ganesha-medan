"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { useAuth } from "@/hooks/useAuth";
import { getMahasiswaByUserId, getPelanggaranByMahasiswaId } from "@/lib/firebase";
import Badge from "@/components/UI/Badge";
import { AlertTriangle } from "lucide-react";

interface Mahasiswa {
  id: string;
  name: string;
  nim: string;
  email: string;
  programStudi: string;
  angkatan: string;
  tanggalLahir: string;
  agama: string;
  alamat: string;
  photoURL: string;
  totalPoin: number;
  status: string;
}

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
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa | null>(null);
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (loading && isInitialLoad) {
        setError("Waktu loading terlalu lama. Silakan refresh halaman.");
        setLoading(false);
        setIsInitialLoad(false);
      }
    }, 10000); // 10 detik timeout

    const fetchData = async () => {
      if (!user?.uid) {
        setError("Silakan login terlebih dahulu");
        setLoading(false);
        setIsInitialLoad(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Fetch data secara parallel
        const [mahasiswaData, pelanggaranData] = await Promise.all([
          getMahasiswaByUserId(user.uid),
          getPelanggaranByMahasiswaId(user.uid)
        ]);

        if (!mahasiswaData) {
          throw new Error("Data mahasiswa tidak ditemukan");
        }

        if (isMounted) {
          setMahasiswa(mahasiswaData as unknown as Mahasiswa);
          setPelanggaran(pelanggaranData as unknown as Pelanggaran[]);
          setLoading(false);
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error("Error dalam fetchData:", error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : "Gagal memuat data");
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user]);

  const formatTanggalIndonesia = (date: string | null | undefined) => {
    if (!date) return "-";
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.error("Invalid date string:", date);
        return "-";
      }
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(dateObj);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  if (loading && isInitialLoad) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            <p className="text-white/80">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <div className="text-white mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!mahasiswa) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <div className="text-white">Data mahasiswa tidak ditemukan</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Kedisiplinan */}
        <Card className="md:col-span-2">
        <CardHeader>
            <CardTitle>Status Kedisiplinan</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Total Poin</h3>
                <div className="text-3xl font-bold text-primary-600">
                  {mahasiswa.totalPoin}
              </div>
                <p className="text-sm text-gray-500 mt-1">Poin pelanggaran terkumpul</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
                <Badge
                  variant={
                    mahasiswa.status === "Normal"
                      ? "success"
                      : mahasiswa.status === "Pembinaan"
                      ? "warning"
                      : "danger"
                  }
                  className="text-lg"
                >
                  {mahasiswa.status}
                </Badge>
                <p className="text-sm text-gray-500 mt-1">Status kedisiplinan Anda</p>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Informasi</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <span>Batas Pembinaan: 50 poin</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span>Batas Terancam DO: 100 poin</span>
                  </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* Pelanggaran Terbaru */}
      <Card>
          <CardHeader>
            <CardTitle>Pelanggaran Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
            {pelanggaran.length > 0 ? (
            <div className="space-y-4">
                {pelanggaran.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{p.peraturan?.nama || "Pelanggaran"}</h4>
                        <p className="text-sm text-gray-600">{p.keterangan}</p>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Nama:</span> {p.mahasiswa?.name || "-"}
                    </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">NIM:</span> {p.mahasiswa?.nim || "-"}
                          </p>
                        </div>
                  </div>
                  <Badge
                    variant={
                          p.peraturan?.kategori === "Ringan"
                        ? "success"
                            : p.peraturan?.kategori === "Sedang"
                        ? "warning"
                        : "danger"
                    }
                  >
                        {p.peraturan?.kategori || "Tidak Diketahui"}
                  </Badge>
                </div>
                    <div className="flex justify-between items-center mt-2 text-sm">
                      <span className="text-gray-500">
                        {formatTanggalIndonesia(p.tanggal)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            p.status === "Diterima"
                              ? "success"
                              : p.status === "Diproses"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {p.status}
                        </Badge>
                        <span className="font-medium text-primary-600">
                          {p.peraturan?.poin || 0} poin
                        </span>
                      </div>
            </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">Belum ada pelanggaran</p>
              </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
} 