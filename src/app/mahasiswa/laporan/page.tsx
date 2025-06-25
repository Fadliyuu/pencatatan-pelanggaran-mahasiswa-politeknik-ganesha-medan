"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { useAuth } from "@/hooks/useAuth";
import { getLaporanByMahasiswaId, getPelanggaran, getPeraturan, createLaporan, addNotifikasi } from "@/lib/firebase";
import Badge from "@/components/UI/Badge";
import { formatTanggalIndonesia } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/UI/Tabs";
import { toast } from "react-hot-toast";
import Button from "@/components/UI/Button";
import { Plus, Upload, X } from "lucide-react";
// @ts-ignore: Tidak ada deklarasi tipe untuk 'uuid', aman untuk digunakan di sini
import { v4 as uuidv4 } from "uuid";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Laporan {
  id: string;
  mahasiswaId: string;
  judul: string;
  isi: string;
  tanggal: string;
  status: string;
  jenis: "Pelanggaran" | "Banding";
  createdAt: string;
  updatedAt: string;
  mahasiswa?: {
    name: string;
    nim: string;
  };
  pelanggaranId?: string;
  alasanBanding?: string;
  statusBanding?: string;
  buktiURL?: string;
  peraturanId?: string;
  deskripsi: string;
  buktiURLs: string[];
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
  buktiURL?: string;
}

export default function LaporanPage() {
  const { user } = useAuth();
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [pelanggaran, setPelanggaran] = useState<Pelanggaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [formData, setFormData] = useState({
    namaMahasiswa: "",
    nimMahasiswa: "",
    peraturanId: "",
    deskripsi: "",
    buktiFiles: [] as File[]
  });
  const [uploading, setUploading] = useState(false);
  const [peraturanList, setPeraturanList] = useState<any[]>([]);

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

        // Ambil data peraturan terlebih dahulu
        const peraturanData = await getPeraturan();
        console.log("HASIL getPeraturan:", peraturanData);
        setPeraturanList(peraturanData);

        // Ambil data laporan berdasarkan mahasiswaId atau uid
        const laporanData = await getLaporanByMahasiswaId(user.uid);
        console.log("Data Laporan Mentah:", laporanData);

        // Filter tambahan jika perlu:
        const filteredLaporan = laporanData.filter((item: any) =>
          item.mahasiswaId === user.uid || item.uid === user.uid
        );

        // Transformasi data laporan ke format yang sesuai
        const formattedLaporan = filteredLaporan.map((item: any) => {
          console.log("Memproses item laporan:", item);
          return {
            id: item.id,
            mahasiswaId: item.mahasiswaId || user.uid,
            judul: item.judul || "Laporan",
            isi: item.isi || "",
            deskripsi: item.deskripsi || "",
            tanggal: item.tanggal || item.createdAt,
            status: item.status || "Menunggu",
            jenis: item.jenis || "Pelanggaran",
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            mahasiswa: item.mahasiswa,
            pelanggaranId: item.pelanggaranId,
            alasanBanding: item.alasanBanding,
            statusBanding: item.statusBanding,
            buktiURL: item.buktiURL,
            buktiURLs: item.buktiURLs,
            peraturanId: item.peraturanId
          };
        });

        console.log("Data Laporan yang Diformat:", formattedLaporan);
        setLaporan(formattedLaporan);

        // Ambil data pelanggaran
        const pelanggaranData = await getPelanggaran();
        console.log("Data Pelanggaran Mentah:", pelanggaranData);

        // Filter pelanggaran berdasarkan mahasiswaId dan gabungkan dengan data peraturan
        const filteredPelanggaran = await Promise.all(
          pelanggaranData
            .filter((p: any) => {
              console.log("Memeriksa pelanggaran:", p);
              return p.mahasiswaId === user.uid;
            })
            .map(async (p: any) => {
              const peraturan = peraturanData.find(
                (per: any) => per.id === p.peraturanId
              );
              console.log("Peraturan yang ditemukan:", peraturan);
              return {
                ...p,
                peraturan: peraturan || {
                  nama: "Peraturan tidak ditemukan",
                  kategori: "Tidak Diketahui",
                  poin: 0
                }
              };
            })
        );

        console.log("Pelanggaran yang difilter:", filteredPelanggaran);
        setPelanggaran(filteredPelanggaran);
      } catch (error) {
        console.error("Error dalam fetchData:", error);
        const errorMessage = error instanceof Error ? error.message : "Gagal memuat data";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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

  const getMahasiswaDocIdByUid = async (uid: string) => {
    const q = query(collection(db, "mahasiswa"), where("uid", "==", uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error("Silakan login terlebih dahulu");
      return;
    }

    if (formData.buktiFiles.length === 0) {
      toast.error("Mohon upload minimal satu bukti");
      return;
    }

    try {
      setUploading(true);
      // Ambil document ID mahasiswa berdasarkan UID
      const mahasiswaDocId = await getMahasiswaDocIdByUid(user.uid);
      if (!mahasiswaDocId) {
        toast.error("Data mahasiswa tidak ditemukan");
        setUploading(false);
        return;
      }
      // Upload semua file ke Cloudinary
      const buktiUrls = await Promise.all(
        formData.buktiFiles.map(file => uploadToCloudinary(file))
      );

      // Buat laporan baru
      let laporanData: any = {
        id: uuidv4(),
        mahasiswaId: mahasiswaDocId, // gunakan document ID
        uid: user.uid, // simpan juga UID untuk pencarian fleksibel
        namaPelapor: user.displayName || "Anonim",
        namaMahasiswa: formData.namaMahasiswa || "Tidak Diketahui",
        nimMahasiswa: formData.nimMahasiswa || "Tidak Diketahui",
        peraturanId: formData.peraturanId,
        deskripsi: formData.deskripsi,
        buktiURLs: buktiUrls,
        status: "Menunggu",
        jenis: "Pelanggaran",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      // Hapus field undefined
      Object.keys(laporanData).forEach(key => {
        if (laporanData[key] === undefined) delete laporanData[key];
      });

      await createLaporan(laporanData);
      // Notifikasi ke semua admin
      const adminSnapshot = await getDocs(collection(db, 'admin'));
      const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      await Promise.all(
        allAdmins.map(a =>
          addNotifikasi({
            userId: a.uid,
            title: laporanData.jenis === 'Banding' ? 'Banding Baru' : 'Laporan Pelanggaran Baru',
            message: `${laporanData.namaMahasiswa} (${laporanData.nimMahasiswa}) membuat ${laporanData.jenis === 'Banding' ? 'banding' : 'laporan pelanggaran'}, segera periksa.`,
            type: laporanData.jenis === 'Banding' ? 'banding' : 'laporan'
          })
        )
      );
      toast.success("Laporan berhasil dikirim");
      setShowForm(false);
      setFormData({
        namaMahasiswa: "",
        nimMahasiswa: "",
        peraturanId: "",
        deskripsi: "",
        buktiFiles: []
      });
      // Refresh data
      window.location.reload();
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("Gagal mengirim laporan");
    } finally {
      setUploading(false);
    }
  };

  // Debug render
  console.log("State saat render:", {
    laporanLength: laporan.length,
    pelanggaranLength: pelanggaran.length,
    laporanData: laporan,
    pelanggaranData: pelanggaran
  });

  console.log("ISI peraturanList:", peraturanList);

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
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold">Laporan & Banding</h1>
        <Button
          onClick={() => setShowForm(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Laporkan Pelanggaran
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Laporan & Banding</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="semua" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2">
              <TabsTrigger value="semua">Semua Laporan</TabsTrigger>
              <TabsTrigger value="pelanggaran">Laporan Pelanggaran</TabsTrigger>
              <TabsTrigger value="banding">Banding</TabsTrigger>
            </TabsList>

            <TabsContent value="semua">
              {laporan.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">Belum ada laporan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {laporan.map((item) => (
                    <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                        <div className="space-y-2 flex-1">
                          <div>
                            <h4 className="font-medium text-lg">
                              {item.judul}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge 
                                variant={
                                  item.jenis === "Pelanggaran"
                                    ? "warning"
                                    : "info"
                                }
                              >
                                {item.jenis}
                              </Badge>
                            </div>
                          </div>
                          <div className="pt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Deskripsi:</span>
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {item.isi}
                            </p>
                          </div>
                          {item.buktiURL && (
                            <div className="pt-2">
                              <a
                                href={item.buktiURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-600 hover:underline"
                              >
                                Lihat bukti pendukung
                              </a>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-2">
                          <Badge
                            variant={
                              item.status === "Disetujui"
                                ? "success"
                                : item.status === "Menunggu"
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
            </TabsContent>

            <TabsContent value="pelanggaran">
              {laporan.filter((l) => (l.jenis || '').toLowerCase() === 'pelanggaran').length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">Belum ada laporan pelanggaran</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {laporan
                    .filter((l) => (l.jenis || '').toLowerCase() === 'pelanggaran')
                    .map((item) => {
                      const peraturanId = ((item as any).peraturanId || "").trim();
                      const peraturan = peraturanList.find(p => (p.id || "").trim() === peraturanId);
                      const deskripsi = item.deskripsi || "-";
                      console.log('Render:', { peraturan, deskripsi });
                      return (
                        <div key={item.id} style={{border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 16}}>
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <div><b>Nama Peraturan:</b> {peraturan?.nama || "Peraturan tidak ditemukan"}</div>
                              <div><b>Kategori:</b> {peraturan?.kategori || "Tidak diketahui"}</div>
                              <div><b>Poin:</b> {peraturan?.poin ?? "-"}</div>
                              <div><b>Deskripsi:</b> {deskripsi}</div>
                              <div><b>Status:</b> {item.status}</div>
                              <div><b>Tanggal:</b> {formatTanggalIndonesia(item.createdAt)}</div>
                            </div>
                            {Array.isArray(item.buktiURLs) && item.buktiURLs.length > 0 && (
                              <div className="ml-4 flex flex-col gap-2">
                                {item.buktiURLs.map((url: string, idx: number) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt={`Bukti ${idx + 1}`}
                                    style={{
                                      width: 120,
                                      height: 120,
                                      objectFit: 'cover',
                                      borderRadius: 8,
                                      border: '1px solid #eee',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      setSelectedImage(url);
                                      setShowImagePreview(true);
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="banding">
              {laporan.filter((l) => (l.jenis || '').toLowerCase() === 'banding').length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500">Belum ada banding</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {laporan
                    .filter((l) => (l.jenis || '').toLowerCase() === 'banding')
                    .map((item) => {
                      // Lookup pelanggaran terkait jika ada
                      const pelanggaranTerkait = pelanggaran.find(p => p.id === item.pelanggaranId);
                      // Lookup peraturan terkait jika ada
                      const peraturanTerkait = peraturanList.find(p => p.id === (item.peraturanId || pelanggaranTerkait?.peraturanId));
                      return (
                        <div key={item.id} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div>
                                <h4 className="font-medium text-lg">
                                  Banding Pelanggaran
                                </h4>
                                {/* Detail pelanggaran/peraturan jika ada */}
                                {peraturanTerkait && (
                                  <div className="text-sm text-gray-700 mt-1">
                                    <div><b>Peraturan:</b> {peraturanTerkait.nama}</div>
                                    <div><b>Kategori:</b> {peraturanTerkait.kategori}</div>
                                    <div><b>Poin:</b> {peraturanTerkait.poin}</div>
                                  </div>
                                )}
                                {pelanggaranTerkait && (
                                  <div className="text-sm text-gray-700 mt-1">
                                    <div><b>Tanggal Pelanggaran:</b> {formatTanggalIndonesia(pelanggaranTerkait.tanggal)}</div>
                                    <div><b>Deskripsi Pelanggaran:</b> {pelanggaranTerkait.keterangan}</div>
                                  </div>
                                )}
                                <div className="pt-2">
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">
                                      Alasan Banding:
                                    </span>
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {item.alasanBanding || item.isi}
                                  </p>
                                </div>
                                {/* Tampilkan semua foto bukti */}
                                {Array.isArray(item.buktiURLs) && item.buktiURLs.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {item.buktiURLs.map((url, idx) => (
                                      <img
                                        key={idx}
                                        src={url}
                                        alt={`Bukti ${idx + 1}`}
                                        className="w-28 h-28 object-cover rounded border"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => {
                                          setSelectedImage(url);
                                          setShowImagePreview(true);
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-start md:items-end gap-2">
                              <Badge 
                                variant={
                                  item.statusBanding === "Diterima"
                                    ? "success"
                                    : item.statusBanding === "Ditolak"
                                    ? "danger"
                                    : "warning"
                                }
                              >
                                {item.statusBanding || item.status || "Menunggu"}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatTanggalIndonesia(item.tanggal || item.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal Form Laporan */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-2 mt-20 md:mt-0">
          <div className="bg-white rounded-lg p-2 md:p-6 w-full max-w-sm md:max-w-2xl max-h-[60vh] overflow-y-auto animate-slideDown">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Laporkan Pelanggaran</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Mahasiswa (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.namaMahasiswa}
                  onChange={(e) => setFormData(prev => ({ ...prev, namaMahasiswa: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Masukkan nama mahasiswa yang melanggar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIM Mahasiswa (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.nimMahasiswa}
                  onChange={(e) => setFormData(prev => ({ ...prev, nimMahasiswa: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Masukkan NIM mahasiswa yang melanggar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Pelanggaran
                </label>
                {peraturanList.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">Memuat data peraturan...</div>
                ) : (
                  <>
                    <select
                      value={formData.peraturanId}
                      onChange={(e) => setFormData(prev => ({ ...prev, peraturanId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Pilih Jenis Pelanggaran</option>
                      {peraturanList.map((peraturan) => (
                        <option key={peraturan.id} value={peraturan.id}>
                          {peraturan.nama} ({peraturan.kategori}, {peraturan.poin} poin)
                        </option>
                      ))}
                    </select>
                    {formData.peraturanId && (
                      <div className="mt-2 text-sm text-gray-700">
                        {(() => {
                          const selected = peraturanList.find(p => p.id === formData.peraturanId);
                          if (!selected) return null;
                          return (
                            <div>
                              <span className="font-semibold">{selected.nama}</span> -
                              <span className="ml-1">{selected.kategori}, {selected.poin} poin</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi Pelanggaran
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => setFormData(prev => ({ ...prev, deskripsi: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={4}
                  placeholder="Jelaskan detail pelanggaran yang terjadi"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bukti Pelanggaran (Wajib)
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
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="w-full sm:w-auto"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  {uploading ? "Mengirim..." : "Kirim Laporan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Foto */}
      {showImagePreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="w-full h-auto max-h-[80vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
} 