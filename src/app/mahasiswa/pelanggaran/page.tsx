"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { useAuth } from "@/hooks/useAuth";
import { getPelanggaranByMahasiswaId, createLaporan, db, addNotifikasi } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Badge from "@/components/UI/Badge";
import { formatTanggalIndonesia } from "@/lib/utils";
import Image from "next/image";
import Button from "@/components/UI/Button";
import { Upload, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-hot-toast";

interface Pelanggaran {
  id: string;
  jenis: string;
  deskripsi: string;
  tanggal: string;
  poin: number;
  status: string;
  buktiURLs?: string[];
  peraturan: {
    nama: string;
    kategori: string;
    poin: number;
  };
}

export default function PelanggaranPage() {
  const { user } = useAuth();
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBandingModal, setShowBandingModal] = useState(false);
  const [selectedPelanggaran, setSelectedPelanggaran] = useState<Pelanggaran | null>(null);
  const [formData, setFormData] = useState({
    alasanBanding: "",
    buktiFiles: [] as File[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        const pelanggaranData = await getPelanggaranByMahasiswaId(user.uid);
        setPelanggaran(pelanggaranData as unknown as Pelanggaran[]);
    } catch (error) {
        console.error("Error dalam fetchData:", error);
        setError(error instanceof Error ? error.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

    fetchData();
  }, [user]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        buktiFiles: [...prev.buktiFiles, ...files]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      buktiFiles: prev.buktiFiles.filter((_, i) => i !== index)
    }));
  };

  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error);
      throw error;
    }
  };

  const handleBandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedPelanggaran) return;

    try {
      setIsSubmitting(true);
      // Ambil docId mahasiswa berdasarkan user.uid
      const mahasiswaRef = collection(db, "mahasiswa");
      const mahasiswaQuery = query(mahasiswaRef, where("uid", "==", user.uid));
      const mahasiswaSnapshot = await getDocs(mahasiswaQuery);
      if (mahasiswaSnapshot.empty) {
        toast.error("Data mahasiswa tidak ditemukan");
        setIsSubmitting(false);
        return;
      }
      const mahasiswaDocId = mahasiswaSnapshot.docs[0].id;
      // Upload semua file ke Cloudinary
      const buktiUrls = await Promise.all(
        formData.buktiFiles.map(file => uploadToCloudinary(file))
      );
      // Buat laporan banding
      const bandingData = {
        id: uuidv4(),
        mahasiswaId: mahasiswaDocId, // gunakan docId mahasiswa
        uid: user.uid, // simpan juga uid user
        pelanggaranId: selectedPelanggaran.id,
        jenis: "Banding",
        alasanBanding: formData.alasanBanding,
        buktiURLs: buktiUrls,
        status: "Menunggu",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await createLaporan(bandingData);
      // Notifikasi ke semua admin
      const adminSnapshot = await getDocs(collection(db, 'admin'));
      const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      await Promise.all(
        allAdmins.map(a =>
          addNotifikasi({
            userId: a.uid,
            title: 'Banding Baru',
            message: `Mahasiswa ${user.displayName || 'Mahasiswa'} mengajukan banding pelanggaran ${selectedPelanggaran.peraturan.nama}, segera periksa.`,
            type: 'banding'
          })
        )
      );
      toast.success("Banding berhasil diajukan");
      setShowBandingModal(false);
      setFormData({
        alasanBanding: "",
        buktiFiles: []
      });
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Error submitting banding:", error);
      toast.error("Gagal mengajukan banding");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pelanggaran Saya</CardTitle>
        </CardHeader>
        <CardContent>
          {pelanggaran.length > 0 ? (
            <div className="space-y-6">
              {pelanggaran.map((p) => (
                <div key={p.id} className="p-6 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium">{p.peraturan.nama}</h4>
                      <p className="text-sm text-gray-600 mt-1">{p.deskripsi}</p>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Tanggal:</span>
                        <span>{formatTanggalIndonesia(p.tanggal)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Kategori:</span>
                        <Badge
                          variant={
                            p.peraturan.kategori === "Ringan"
                              ? "success"
                              : p.peraturan.kategori === "Sedang"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {p.peraturan.kategori}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Poin:</span>
                        <span className="font-medium text-primary-600">
                          {p.peraturan.poin} poin
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-medium">Status debug:</span>
                        <span className="font-medium text-red-600">{p.status}</span>
                      </div>
                    </div>

                    {p.buktiURLs && p.buktiURLs.length > 0 && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {p.buktiURLs.map((url, index) => (
                          <div key={index} className="relative h-48 rounded-lg overflow-hidden">
                            <Image
                              src={url}
                              alt={`Bukti ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tombol Ajukan Banding selalu muncul untuk debugging */}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedPelanggaran(p);
                        setShowBandingModal(true);
                      }}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                    >
                      Ajukan Banding
                    </button>
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

      {/* Modal Ajukan Banding */}
      {showBandingModal && selectedPelanggaran && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Ajukan Banding</h2>
              <button
                onClick={() => {
                  setShowBandingModal(false);
                  setSelectedPelanggaran(null);
                  setFormData({
                    alasanBanding: "",
                    buktiFiles: []
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Detail Pelanggaran</h3>
              <p className="text-sm text-gray-600">{selectedPelanggaran.peraturan.nama}</p>
              <p className="text-sm text-gray-600 mt-1">{selectedPelanggaran.deskripsi}</p>
            </div>

            <form onSubmit={handleBandingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alasan Banding
              </label>
                <textarea
                  value={formData.alasanBanding}
                  onChange={(e) => setFormData(prev => ({ ...prev, alasanBanding: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="Jelaskan alasan banding Anda"
                required
              />
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bukti Pendukung (Opsional)
              </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                  type="file"
                  accept="image/*"
                    multiple
                  onChange={handleFileChange}
                  className="hidden"
                    id="bukti-upload"
                />
                <label
                    htmlFor="bukti-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      Klik untuk upload foto bukti
                    </span>
                </label>
                </div>

                {formData.buktiFiles.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {formData.buktiFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Bukti ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBandingModal(false);
                    setSelectedPelanggaran(null);
                    setFormData({
                      alasanBanding: "",
                      buktiFiles: []
                    });
                  }}
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
              type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
                  {isSubmitting ? "Mengirim..." : "Ajukan Banding"}
                </button>
              </div>
          </form>
          </div>
        </div>
      )}
    </div>
  );
} 