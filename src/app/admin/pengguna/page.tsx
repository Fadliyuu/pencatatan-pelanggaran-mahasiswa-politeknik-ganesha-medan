"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import Button from "@/components/UI/Button";
import { Input } from "@/components/UI/Input";
import { Label } from "@/components/UI/Label";
import { toast } from "react-hot-toast";
import { Search, User, Mail, Phone, MapPin, GraduationCap, Shield, Download, Plus, Filter, Edit2, Trash2, UserPlus } from "lucide-react";
import Image from "next/image";
import { getMahasiswa, getOrCreateAdminData } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { getAuth } from "firebase-admin/auth";
import * as XLSX from 'xlsx';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UserData {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'dosen' | 'mahasiswa';
  nim?: string;
  programStudi?: string;
  angkatan?: string;
  phoneNumber?: string;
  address?: string;
  jobdesk?: string;
  createdAt: string;
  updatedAt: string;
  password?: string;
}

export default function AdminPengguna() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    phoneNumber: '',
    photoURL: '',
    jobdesk: '',
    address: ''
  });
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchTerm, selectedRole, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsers: UserData[] = [];

      // Load mahasiswa
      const mahasiswaData = await getMahasiswa();
      const mahasiswaUsers = mahasiswaData.map(mahasiswa => ({
        id: mahasiswa.id,
        uid: mahasiswa.uid || '',
        email: mahasiswa.email || '',
        displayName: mahasiswa.name || '',
        photoURL: mahasiswa.photoURL,
        role: 'mahasiswa' as const,
        nim: mahasiswa.nim,
        programStudi: mahasiswa.programStudi,
        angkatan: mahasiswa.angkatan,
        phoneNumber: mahasiswa.phoneNumber,
        address: mahasiswa.address,
        createdAt: mahasiswa.createdAt,
        updatedAt: mahasiswa.updatedAt,
        password: mahasiswa.password
      }));
      allUsers.push(...mahasiswaUsers);

      // Load admin
      const adminRef = collection(db, 'admin');
      const adminSnapshot = await getDocs(adminRef);
      const adminUsers = adminSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || '',
          email: data.email || '',
          displayName: data.displayName || '',
          photoURL: data.photoURL,
          role: 'admin' as const,
          phoneNumber: data.phoneNumber,
          address: data.address,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          password: data.password
        };
      });
      allUsers.push(...adminUsers);

      // Load dosen
      const dosenRef = collection(db, 'dosen');
      const dosenSnapshot = await getDocs(dosenRef);
      const dosenUsers = dosenSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          uid: data.uid || '',
          email: data.email || '',
          displayName: data.displayName || '',
          photoURL: data.photoURL,
          role: 'dosen' as const,
          phoneNumber: data.phoneNumber,
          address: data.address,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          password: data.password
        };
      });
      allUsers.push(...dosenUsers);

      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Gagal memuat data pengguna");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = async (role?: string) => {
    try {
      setIsExporting(true);
      let dataToExport = [...filteredUsers];
      
      if (role) {
        dataToExport = dataToExport.filter(user => user.role === role);
      }

      // Format data untuk Excel - hanya data yang diperlukan
      const excelData = dataToExport.map(user => ({
        'NIM': user.nim || '-',
        'Nama': user.displayName,
        'Email': user.email,
        'Password': user.password || '-' // Menampilkan password asli
      }));

      // Buat worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Atur lebar kolom
      const wscols = [
        { wch: 15 }, // NIM
        { wch: 30 }, // Nama
        { wch: 30 }, // Email
        { wch: 20 }  // Password
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');

      // Generate nama file
      const fileName = role 
        ? `users_${role}_${new Date().toISOString().split('T')[0]}.xlsx`
        : `all_users_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);
      toast.success('Data berhasil diekspor');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Filter berdasarkan role
    if (selectedRole !== "all") {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    // Filter berdasarkan pencarian
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.displayName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.nim?.toLowerCase().includes(searchLower) ||
        user.programStudi?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(filtered);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'dosen':
        return 'bg-blue-100 text-blue-800';
      case 'mahasiswa':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-5 h-5" />;
      case 'dosen':
        return <GraduationCap className="w-5 h-5" />;
      case 'mahasiswa':
        return <User className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Simpan user yang sedang login
      const currentUser = auth.currentUser;
      const currentEmail = currentUser?.email;
      const currentPassword = sessionStorage.getItem('userPassword');

      // Create authentication user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const userData = {
        uid: userCredential.user.uid,
        email: formData.email,
        displayName: formData.name,
        photoURL: formData.photoURL,
        role: formData.role,
        phoneNumber: formData.phoneNumber ? `62${formData.phoneNumber.replace(/^0+/, '')}` : '',
        address: formData.address,
        jobdesk: formData.jobdesk,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to users collection using UID as document ID
      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      // Save to specific role collection using UID as document ID
      if (formData.role === 'admin') {
        await setDoc(doc(db, 'admin', userCredential.user.uid), userData);
      } else if (formData.role === 'dosen') {
        await setDoc(doc(db, 'dosen', userCredential.user.uid), userData);
      }

      // Logout user yang baru dibuat
      await auth.signOut();

      // Login kembali dengan user yang sebelumnya
      if (currentEmail && currentPassword) {
        await signInWithEmailAndPassword(auth, currentEmail, currentPassword);
      }

      // Reset form and close modal
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        phoneNumber: '',
        photoURL: '',
        jobdesk: '',
        address: ''
      });
      setIsModalOpen(false);
      setIsEditMode(false);
      setSelectedUser(null);

      toast.success('Pengguna berhasil ditambahkan');
      loadUsers(); // Refresh user list
    } catch (error: any) {
      setError(error.message);
      toast.error('Gagal menambahkan pengguna');
    }
  };

  const handleEdit = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      name: user.displayName,
      email: user.email,
      password: '',
      role: user.role,
      phoneNumber: user.phoneNumber?.replace(/^62/, '') || '',
      photoURL: user.photoURL || '',
      jobdesk: user.jobdesk || '',
      address: user.address || ''
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        setUsers(users.filter(u => u.id !== id));
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const storage = getStorage();
      const storageRef = ref(storage, `profile_images/${Date.now()}_${file.name}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update form data
      setFormData(prev => ({ ...prev, photoURL: downloadURL }));
      toast.success('Foto berhasil diupload');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengupload foto');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Daftar Pengguna</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button
            onClick={() => {
              setIsEditMode(false);
              setSelectedUser(null);
              setFormData({
                name: '',
                email: '',
                password: '',
                role: '',
                phoneNumber: '',
                photoURL: '',
                jobdesk: '',
                address: ''
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah Pengguna
          </Button>
          <Button
            variant="outline"
            onClick={() => exportToExcel()}
            disabled={isExporting}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Mengekspor...' : 'Ekspor Semua'}
          </Button>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 w-full sm:w-auto"
          >
            <option value="all">Semua Role</option>
            <option value="admin">Admin</option>
            <option value="dosen">Dosen</option>
            <option value="mahasiswa">Mahasiswa</option>
          </select>
          <Button
            variant="outline"
            onClick={() => exportToExcel(selectedRole !== 'all' ? selectedRole : undefined)}
            disabled={isExporting || selectedRole === 'all'}
            className="w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Mengekspor...' : 'Ekspor Terfilter'}
          </Button>
        </div>
      </div>

      {/* Filter dan Pencarian */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Pengguna */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <p>Memuat data...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p>Tidak ada pengguna ditemukan</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="h-full">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-4">
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={24} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold truncate">{user.displayName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(user.role)} flex-shrink-0 ml-2`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 mt-2">
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={16} className="flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      {user.nim && (
                        <div className="flex items-center gap-2 truncate">
                          <User size={16} className="flex-shrink-0" />
                          <span className="truncate">NIM: {user.nim}</span>
                        </div>
                      )}
                      {user.programStudi && (
                        <div className="flex items-center gap-2 truncate">
                          <GraduationCap size={16} className="flex-shrink-0" />
                          <span className="truncate">{user.programStudi}</span>
                        </div>
                      )}
                      {user.phoneNumber && (
                        <div className="flex items-center gap-2 truncate">
                          <Phone size={16} className="flex-shrink-0" />
                          <span className="truncate">{user.phoneNumber}</span>
                        </div>
                      )}
                      {user.address && (
                        <div className="flex items-center gap-2 truncate">
                          <MapPin size={16} className="flex-shrink-0" />
                          <span className="truncate">{user.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] mt-16 md:mt-0">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-4 md:p-6 relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4 sticky top-0 bg-white pb-4">
              {isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
            </h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required={!isEditMode}
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nomor Telepon
                </label>
                <div className="mt-1 flex rounded-lg shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    62
                  </span>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="flex-1 block w-full border border-gray-300 rounded-r-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="8123456789"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Foto Profil
                </label>
                <div className="mt-1">
                  {formData.photoURL ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                      <Image
                        src={formData.photoURL}
                        alt="Profile"
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photoURL: '' })}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-full">
                      <label className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-500 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        {isUploading ? (
                          <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                            <span className="mt-2 text-sm text-gray-600">Mengupload...</span>
                          </div>
                        ) : (
                          <>
                            <UserPlus className="w-8 h-8 mx-auto text-gray-400" />
                            <span className="mt-2 block text-sm text-gray-600">
                              Klik untuk upload foto
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Pilih Role</option>
                  <option value="admin">Admin</option>
                  <option value="dosen">Dosen</option>
                </select>
              </div>
              {formData.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Jobdesk
                  </label>
                  <input
                    type="text"
                    value={formData.jobdesk}
                    onChange={(e) => setFormData({ ...formData, jobdesk: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Contoh: Bagian Keuangan"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Alamat
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  rows={3}
                />
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsEditMode(false);
                    setSelectedUser(null);
                    setError('');
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 