"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, updatePassword, updateEmail, updateProfile } from 'firebase/auth';
import { auth, storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  User,
  Mail,
  Lock,
  Camera,
  X,
  Check,
  AlertTriangle,
  Loader2,
  Phone,
  MapPin,
  GraduationCap,
  Building,
  BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
  nip?: string;
  prodi?: string;
  noHp?: string;
  alamat?: string;
  pendidikan?: string;
  jabatan?: string;
}

export default function ProfilPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    nip: '',
    prodi: '',
    noHp: '',
    alamat: '',
    pendidikan: '',
    jabatan: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    displayName: '',
    email: '',
    nip: '',
    prodi: '',
    noHp: '',
    alamat: '',
    pendidikan: '',
    jabatan: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data() as UserData;

          // Set user data from Firestore
          setUserData({
            ...userData,
            displayName: userData?.displayName || user.displayName || '',
            email: userData?.email || user.email || '',
            photoURL: userData?.photoURL || user.photoURL || undefined,
          });

          // Set form data
          setFormData(prev => ({
            ...prev,
            displayName: userData?.displayName || user.displayName || '',
            email: userData?.email || user.email || '',
            nip: userData?.nip || '',
            prodi: userData?.prodi || '',
            noHp: userData?.noHp || '',
            alamat: userData?.alamat || '',
            pendidikan: userData?.pendidikan || '',
            jabatan: userData?.jabatan || '',
          }));
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      displayName: '',
      email: '',
      nip: '',
      prodi: '',
      noHp: '',
      alamat: '',
      pendidikan: '',
      jabatan: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Nama tidak boleh kosong';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email tidak boleh kosong';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email tidak valid';
      isValid = false;
    }

    if (!formData.nip.trim()) {
      newErrors.nip = 'NIP tidak boleh kosong';
      isValid = false;
    }

    if (!formData.prodi.trim()) {
      newErrors.prodi = 'Program Studi tidak boleh kosong';
      isValid = false;
    }

    if (!formData.noHp.trim()) {
      newErrors.noHp = 'Nomor HP tidak boleh kosong';
      isValid = false;
    }

    if (!formData.alamat.trim()) {
      newErrors.alamat = 'Alamat tidak boleh kosong';
      isValid = false;
    }

    if (!formData.pendidikan.trim()) {
      newErrors.pendidikan = 'Pendidikan tidak boleh kosong';
      isValid = false;
    }

    if (!formData.jabatan.trim()) {
      newErrors.jabatan = 'Jabatan tidak boleh kosong';
      isValid = false;
    }

    if (showPasswordModal) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Password saat ini tidak boleh kosong';
        isValid = false;
      }

      if (!formData.newPassword) {
        newErrors.newPassword = 'Password baru tidak boleh kosong';
        isValid = false;
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password minimal 6 karakter';
        isValid = false;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Password tidak cocok';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User tidak ditemukan');

      if (showPasswordModal) {
        // Update password
        await updatePassword(user, formData.newPassword);
        toast.success('Password berhasil diperbarui');
        setShowPasswordModal(false);
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        // Update profile in Firebase Auth
        await updateProfile(user, {
          displayName: formData.displayName,
        });
        if (formData.email !== user.email) {
          await updateEmail(user, formData.email);
        }

        // Update additional data in Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          displayName: formData.displayName,
          email: formData.email,
          nip: formData.nip,
          prodi: formData.prodi,
          noHp: formData.noHp,
          alamat: formData.alamat,
          pendidikan: formData.pendidikan,
          jabatan: formData.jabatan,
        });

        setUserData(prev => prev ? {
          ...prev,
          displayName: formData.displayName,
          email: formData.email,
          nip: formData.nip,
          prodi: formData.prodi,
          noHp: formData.noHp,
          alamat: formData.alamat,
          pendidikan: formData.pendidikan,
          jabatan: formData.jabatan,
        } : null);

        toast.success('Profil berhasil diperbarui');
        setIsEditing(false);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Terjadi kesalahan saat memperbarui profil');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const user = auth.currentUser;
      if (!user) throw new Error('User tidak ditemukan');

      // Create form data for Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
      formData.append('cloud_name', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

      console.log('Uploading to Cloudinary...', {
        file: file.name,
        size: file.size,
        type: file.type
      });

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const responseData = await response.json();
      console.log('Cloudinary Response:', responseData);

      if (!response.ok) {
        throw new Error(`Gagal mengupload gambar: ${responseData.error?.message || 'Unknown error'}`);
      }

      const imageUrl = responseData.secure_url;
      console.log('Image URL:', imageUrl);

      // Update profile in Firebase Auth
      await updateProfile(user, {
        photoURL: imageUrl
      });

      // Update photoURL in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        photoURL: imageUrl
      });

      // Update local state
      setUserData(prev => prev ? {
        ...prev,
        photoURL: imageUrl
      } : null);

      toast.success('Foto profil berhasil diperbarui');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || 'Terjadi kesalahan saat mengunggah foto');
    } finally {
      setIsUploading(false);
    }
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profil Dosen</h1>
          <p className="text-white/80">Kelola informasi profil Anda</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-white/10">
                  {userData?.photoURL ? (
                    <Image
                      src={userData.photoURL}
                      alt="Profile"
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-white/60" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="imageUpload"
                  className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </label>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="mt-4 text-white/80 hover:text-white transition-colors flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Ubah Password</span>
              </button>
            </div>

            {/* Profile Form Section */}
            <div className="flex-1">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/80 mb-2">Nama</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="text"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.displayName ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.displayName && (
                      <p className="mt-1 text-red-500 text-sm">{errors.displayName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2">NIP</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="text"
                        name="nip"
                        value={formData.nip}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.nip ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.nip && (
                      <p className="mt-1 text-red-500 text-sm">{errors.nip}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.email ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-red-500 text-sm">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2">Program Studi</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="text"
                        name="prodi"
                        value={formData.prodi}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.prodi ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.prodi && (
                      <p className="mt-1 text-red-500 text-sm">{errors.prodi}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2">Nomor HP</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="tel"
                        name="noHp"
                        value={formData.noHp}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.noHp ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.noHp && (
                      <p className="mt-1 text-red-500 text-sm">{errors.noHp}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2">Alamat</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="text"
                        name="alamat"
                        value={formData.alamat}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.alamat ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.alamat && (
                      <p className="mt-1 text-red-500 text-sm">{errors.alamat}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2">Pendidikan</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="text"
                        name="pendidikan"
                        value={formData.pendidikan}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.pendidikan ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.pendidikan && (
                      <p className="mt-1 text-red-500 text-sm">{errors.pendidikan}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-white/80 mb-2">Jabatan</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                      <input
                        type="text"
                        name="jabatan"
                        value={formData.jabatan}
                        onChange={handleInputChange}
                        disabled={!isEditing && !showPasswordModal}
                        className={`w-full bg-white/5 border ${
                          errors.jabatan ? 'border-red-500' : 'border-white/10'
                        } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50`}
                      />
                    </div>
                    {errors.jabatan && (
                      <p className="mt-1 text-red-500 text-sm">{errors.jabatan}</p>
                    )}
                  </div>
                </div>

                {showPasswordModal && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-white/80 mb-2">Password Saat Ini</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleInputChange}
                          className={`w-full bg-white/5 border ${
                            errors.currentPassword ? 'border-red-500' : 'border-white/10'
                          } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20`}
                        />
                      </div>
                      {errors.currentPassword && (
                        <p className="mt-1 text-red-500 text-sm">{errors.currentPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2">Password Baru</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleInputChange}
                          className={`w-full bg-white/5 border ${
                            errors.newPassword ? 'border-red-500' : 'border-white/10'
                          } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20`}
                        />
                      </div>
                      {errors.newPassword && (
                        <p className="mt-1 text-red-500 text-sm">{errors.newPassword}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2">Konfirmasi Password Baru</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-5 w-5" />
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          className={`w-full bg-white/5 border ${
                            errors.confirmPassword ? 'border-red-500' : 'border-white/10'
                          } rounded-xl pl-10 pr-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20`}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-red-500 text-sm">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  {!showPasswordModal && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl transition-colors"
                    >
                      {isEditing ? 'Batal' : 'Edit Profil'}
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={(!isEditing && !showPasswordModal) || isUploading}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        <span>Simpan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 