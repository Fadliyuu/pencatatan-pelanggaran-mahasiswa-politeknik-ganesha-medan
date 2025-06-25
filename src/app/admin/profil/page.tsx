"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { Label } from "@/components/UI/Label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import { User, Mail, Phone, MapPin, Globe, Camera } from "lucide-react";
import { updateMahasiswaPhoto, updateMahasiswaPassword, updateAdminProfile, updateAdminPhoto } from "@/lib/firebase";
import Image from "next/image";
import { getOrCreateAdminData } from "@/lib/firebase";

export default function AdminProfilPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phoneNumber: "",
    address: "",
    website: ""
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminData = async () => {
      if (user) {
        try {
          const adminData = await getOrCreateAdminData(user.uid);
          console.log("Data admin yang dimuat:", adminData); // Debug log
          
          setFormData({
            displayName: adminData.displayName || "",
            email: adminData.email || "",
            phoneNumber: adminData.phoneNumber || "",
            address: adminData.address || "",
            website: adminData.website || ""
          });
          
          if (adminData.photoURL) {
            console.log("URL foto yang dimuat:", adminData.photoURL); // Debug log
            setPreviewUrl(adminData.photoURL);
          }
        } catch (error) {
          console.error("Error loading admin data:", error);
          toast.error("Gagal memuat data profil");
        }
      }
    };

    loadAdminData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setIsLoading(true);

    try {
      await updateAdminProfile(user?.uid || "", {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        website: formData.website
      });
      
      toast.success("Profil berhasil diperbarui");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Gagal memperbarui profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Password baru tidak cocok");
      return;
    }

    setIsLoading(true);
    try {
      await updateMahasiswaPassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success("Password berhasil diperbarui");
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Gagal memperbarui password");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile || !user) return;

    setIsLoading(true);
    try {
      const photoURL = await updateAdminPhoto(user.uid, selectedFile);
      console.log("URL foto yang diupload:", photoURL); // Debug log
      setPreviewUrl(photoURL);
      toast.success("Foto profil berhasil diperbarui");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Gagal mengupload foto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profil Admin</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profil
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Foto Profil */}
        <Card>
          <CardHeader>
            <CardTitle>Foto Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={48} className="text-gray-400" />
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="space-y-2 w-full">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full"
                  />
                  <Button
                    onClick={handlePhotoUpload}
                    disabled={!selectedFile || isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Mengupload..." : "Upload Foto"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informasi Profil */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informasi Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nama</Label>
                <div className="flex items-center gap-2">
                  <User size={20} className="text-gray-500" />
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail size={20} className="text-gray-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Nomor Telepon</Label>
                <div className="flex items-center gap-2">
                  <Phone size={20} className="text-gray-500" />
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <div className="flex items-center gap-2">
                  <MapPin size={20} className="text-gray-500" />
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="flex items-center gap-2">
                  <Globe size={20} className="text-gray-500" />
                  <Input
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isLoading}
                  >
                    Batal
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Ubah Password */}
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ubah Password</CardTitle>
              {!isChangingPassword && (
                <Button
                  variant="outline"
                  onClick={() => setIsChangingPassword(true)}
                >
                  Ubah Password
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isChangingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Password Saat Ini</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Menyimpan..." : "Simpan Password"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: ""
                      });
                    }}
                    disabled={isLoading}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-gray-500">
                Untuk keamanan akun Anda, sebaiknya ganti password secara berkala.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 