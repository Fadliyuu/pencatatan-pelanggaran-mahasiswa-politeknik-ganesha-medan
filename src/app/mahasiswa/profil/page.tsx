"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { User, Mail, MapPin, AlertTriangle, Calendar, GraduationCap, Lock, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getMahasiswaByUserId, updateMahasiswa, updateMahasiswaPassword, updateMahasiswaPhoto, addNotifikasi } from "@/lib/firebase";
import Badge from "@/components/UI/Badge";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Button from "@/components/UI/Button";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Mahasiswa {
  id: string;
  name: string;
  nim: string;
  programStudi: string;
  email: string;
  alamat: string;
  agama: string;
  angkatan: string;
  tanggalLahir: string;
  status: string;
  totalPoin: number;
  uid: string;
  photoURL?: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function ProfilPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get("tab") || "profile";
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    alamat: ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [editingField, setEditingField] = useState<"email" | "password" | null>(null);

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

        const mahasiswaData = await getMahasiswaByUserId(user.uid);
        if (!mahasiswaData) {
          throw new Error("Data mahasiswa tidak ditemukan");
        }

        setMahasiswa(mahasiswaData as unknown as Mahasiswa);
        setFormData({
          email: mahasiswaData?.email || "",
          alamat: mahasiswaData?.alamat || ""
        });
        if (mahasiswaData?.photoURL) {
          setPreviewUrl(mahasiswaData.photoURL);
        }
      } catch (error) {
        console.error("Error dalam fetchData:", error);
        setError(error instanceof Error ? error.message : "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !mahasiswa) return;

    try {
      setLoading(true);
      await updateMahasiswa(mahasiswa.id, formData);
      setMahasiswa(prev => prev ? { ...prev, ...formData } : null);
      setIsEditing(false);
      toast.success("Profil berhasil diperbarui");
      // Notifikasi ke semua admin
      const adminSnapshot = await getDocs(collection(db, 'admin'));
      const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      await Promise.all(
        allAdmins.map(a =>
          addNotifikasi({
            userId: a.uid,
            title: 'Update Profil Mahasiswa',
            message: `Mahasiswa ${mahasiswa.name} (${mahasiswa.nim}) baru saja mengubah data email/alamat`,
            type: 'akun'
          })
        )
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }

    try {
      setLoading(true);
      await updateMahasiswaPassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success("Password berhasil diperbarui");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      // Notifikasi ke semua admin
      if (mahasiswa) {
        const adminSnapshot = await getDocs(collection(db, 'admin'));
        const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        await Promise.all(
          allAdmins.map(a =>
            addNotifikasi({
              userId: a.uid,
              title: 'Update Password Mahasiswa',
              message: `Mahasiswa ${mahasiswa.name} (${mahasiswa.nim}) baru saja mengubah password`,
              type: 'akun'
            })
          )
        );
      }
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Gagal memperbarui password");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedFile) return;

    try {
      setIsLoading(true);
      const photoURL = await updateMahasiswaPhoto(user.uid, selectedFile);
      setMahasiswa(prev => prev ? { ...prev, photoURL } : null);
      setPreviewUrl("");
      setSelectedFile(null);
      toast.success('Foto profil berhasil diperbarui');
      // Notifikasi ke semua admin
      if (mahasiswa) {
        const adminSnapshot = await getDocs(collection(db, 'admin'));
        const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        await Promise.all(
          allAdmins.map(a =>
            addNotifikasi({
              userId: a.uid,
              title: 'Update Foto Mahasiswa',
              message: `Mahasiswa ${mahasiswa.name} (${mahasiswa.nim}) baru saja mengubah foto profil`,
              type: 'akun'
            })
          )
        );
      }
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal memperbarui foto profil');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleEditClick = (field: "email" | "password") => {
    setEditingField(field);
    setShowPasswordModal(true);
    setVerificationPassword("");
    setVerificationError("");
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    try {
      setLoading(true);
      // Verifikasi password dengan Firebase
      await signInWithEmailAndPassword(auth, user.email, verificationPassword);
      setShowPasswordModal(false);
      setIsEditing(true);
      setVerificationError("");
    } catch (error) {
      console.error("Error verifying password:", error);
      setVerificationError("Password yang Anda masukkan salah");
    } finally {
      setLoading(false);
    }
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

  if (!mahasiswa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Data mahasiswa tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
            <CardHeader>
          <CardTitle>Profil Mahasiswa</CardTitle>
            </CardHeader>
            <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Foto Profil */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={mahasiswa.name}
                    fill
                    className="object-cover"
                  />
                ) : mahasiswa.photoURL ? (
                  <Image
                    src={mahasiswa.photoURL}
                    alt={mahasiswa.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl text-gray-400">
                      {mahasiswa.name.charAt(0)}
                    </span>
                  </div>
                )}
                    </div>
              <form onSubmit={handlePhotoSubmit} className="flex flex-col gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg cursor-pointer hover:bg-primary/20"
                >
                  <Camera size={18} />
                  <span>Ganti Foto</span>
                </label>
                {selectedFile && (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Menyimpan..." : "Simpan Foto"}
                  </Button>
                )}
              </form>
                  </div>

            {/* Informasi Profil */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap
                  </label>
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-gray-400" />
                    <span>{mahasiswa.name}</span>
                  </div>
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIM
                  </label>
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} className="text-gray-400" />
                    <span>{mahasiswa.nim}</span>
                  </div>
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Program Studi
                  </label>
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} className="text-gray-400" />
                    <span>{mahasiswa.programStudi}</span>
                  </div>
                    </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Angkatan
                  </label>
                      <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    <span>{mahasiswa.angkatan}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail size={18} className="text-gray-400" />
                      <span>{mahasiswa.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick("email")}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock size={18} className="text-gray-400" />
                      <span>••••••••</span>
                  </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick("password")}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat
                  </label>
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-gray-400" />
                    <span>{mahasiswa.alamat}</span>
                  </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

      {/* Modal Verifikasi Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Verifikasi Password</h2>
            <p className="text-gray-600 mb-4">
              Untuk mengubah {editingField === "email" ? "email" : "password"}, 
              silakan masukkan password Anda saat ini.
            </p>
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={verificationPassword}
                  onChange={(e) => setVerificationPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                {verificationError && (
                  <p className="text-red-500 text-sm mt-1">{verificationError}</p>
                      )}
                  </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setEditingField(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Memverifikasi..." : "Verifikasi"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Email */}
      {isEditing && editingField === "email" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Email</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Baru
                    </label>
                    <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                    />
                  </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingField(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                      type="submit"
                  disabled={loading}
                    >
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
                </div>
              </form>
                    </div>
                  </div>
      )}

      {/* Modal Edit Password */}
      {isEditing && editingField === "password" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Password</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Baru
                </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                      />
                </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                      />
                </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingField(null);
                  }}
                >
                  Batal
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                  >
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
              </form>
          </div>
        </div>
      )}
    </div>
  );
} 