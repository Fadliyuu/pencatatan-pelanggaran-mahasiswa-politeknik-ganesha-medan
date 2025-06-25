'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { getMahasiswa, updateMahasiswa } from '@/lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { uploadImageToCloudinary } from '@/lib/firebase';

// Interface untuk data mahasiswa
interface Mahasiswa {
  id: string;
  nim: string;
  name: string;
  email: string;
  password?: string;
  alamat: string;
  tanggalLahir: string;
  agama: string;
  angkatan: string;
  programStudi: 'Manajemen Informatika' | 'Akuntansi' | 'Teknik Informatika';
  jalur: 'Umum' | 'KIP' | 'Beasiswa';
  photoURL?: string;
  totalPoin?: number;
  status?: 'Normal' | 'Pembinaan' | 'Terancam DO';
  createdAt?: string;
  updatedAt?: string;
}

// Schema validasi untuk form mahasiswa
const mahasiswaSchema = z.object({
  nim: z.string().min(1, 'NIM harus diisi'),
  name: z.string().min(1, 'Nama harus diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().optional(),
  alamat: z.string().min(1, 'Alamat harus diisi'),
  tanggalLahir: z.string().min(1, 'Tanggal lahir harus diisi'),
  agama: z.string().min(1, 'Agama harus diisi'),
  angkatan: z.string().min(1, 'Angkatan harus diisi'),
  programStudi: z.enum(['Manajemen Informatika', 'Akuntansi', 'Teknik Informatika'], {
    required_error: 'Program studi harus diisi',
  }),
  jalur: z.enum(['Umum', 'KIP', 'Beasiswa'], {
    required_error: 'Jalur masuk harus diisi',
  }),
});

type MahasiswaFormData = z.infer<typeof mahasiswaSchema>;

export default function EditMahasiswaPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string>('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MahasiswaFormData>({
    resolver: zodResolver(mahasiswaSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getMahasiswa() as Mahasiswa[];
        const mahasiswaData = params && 'id' in params ? data.find((m) => m.id === params.id) : undefined;
        
        if (!mahasiswaData) {
          toast.error('Data mahasiswa tidak ditemukan');
          router.push('/admin/mahasiswa');
          return;
        }

        // Reset form dengan data yang ada
        reset({
          nim: mahasiswaData.nim,
          name: mahasiswaData.name,
          email: mahasiswaData.email,
          alamat: mahasiswaData.alamat,
          tanggalLahir: mahasiswaData.tanggalLahir,
          agama: mahasiswaData.agama,
          angkatan: mahasiswaData.angkatan,
          programStudi: mahasiswaData.programStudi,
          jalur: mahasiswaData.jalur,
        });

        setCurrentPhotoURL(mahasiswaData.photoURL || '');
        if (mahasiswaData.photoURL) {
          setPhotoPreview(mahasiswaData.photoURL);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal mengambil data mahasiswa');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params && 'id' in params ? params.id : undefined, router, reset]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: MahasiswaFormData) => {
    try {
      setLoading(true);
      
      // Upload foto ke Cloudinary jika ada
      let photoURL = currentPhotoURL;
      if (photoFile) {
        photoURL = await uploadImageToCloudinary(photoFile);
      }

      // Jika password tidak diisi, gunakan tanggal lahir
      const password = data.password || data.tanggalLahir;

      if (!params || !('id' in params) || !params.id) {
        toast.error('ID mahasiswa tidak valid');
        setLoading(false);
        return;
      }
      await updateMahasiswa(params.id as string, {
        ...data,
        password,
        photoURL,
      });

      toast.success('Data mahasiswa berhasil diperbarui');
      router.push(`/admin/mahasiswa/${params.id}`);
    } catch (error) {
      console.error('Error updating mahasiswa:', error);
      toast.error('Gagal memperbarui data mahasiswa');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/admin/mahasiswa/${params && 'id' in params ? params.id : ''}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>Kembali</span>
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Edit Mahasiswa</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form Edit Mahasiswa</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">NIM</label>
                  <Input
                    {...register('nim')}
                    placeholder="Masukkan NIM"
                    error={errors.nim?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                  <Input
                    {...register('name')}
                    placeholder="Masukkan nama lengkap"
                    error={errors.name?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="Masukkan email"
                    error={errors.email?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Input
                    {...register('password')}
                    type="password"
                    placeholder="Kosongkan untuk menggunakan tanggal lahir"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Jika dikosongkan, password akan menggunakan tanggal lahir
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Program Studi</label>
                  <Select
                    {...register('programStudi')}
                    error={errors.programStudi?.message}
                  >
                    <option value="">Pilih Program Studi</option>
                    <option value="Manajemen Informatika">Manajemen Informatika</option>
                    <option value="Akuntansi">Akuntansi</option>
                    <option value="Teknik Informatika">Teknik Informatika</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Jalur Masuk</label>
                  <select
                    {...register('jalur')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    required
                  >
                    <option value="">Pilih Jalur Masuk</option>
                    <option value="Umum">Umum</option>
                    <option value="KIP">KIP</option>
                    <option value="Beasiswa">Beasiswa</option>
                  </select>
                  {errors.jalur && (
                    <p className="mt-1 text-sm text-red-600">{errors.jalur.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Angkatan</label>
                  <Input
                    {...register('angkatan')}
                    placeholder="Masukkan angkatan"
                    error={errors.angkatan?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tanggal Lahir</label>
                  <Input
                    {...register('tanggalLahir')}
                    type="date"
                    error={errors.tanggalLahir?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Agama</label>
                  <Input
                    {...register('agama')}
                    placeholder="Masukkan agama"
                    error={errors.agama?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Alamat</label>
                  <Input
                    {...register('alamat')}
                    placeholder="Masukkan alamat"
                    error={errors.alamat?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Foto Profil</label>
                  <div className="mt-2 flex items-center space-x-4">
                    <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                      {photoPreview ? (
                        <Image
                          src={photoPreview}
                          alt="Preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                          ?
                        </div>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/mahasiswa/${params && 'id' in params ? params.id : ''}`)}
                disabled={loading}
              >
                Batal
              </Button>
              <Button type="submit" loading={loading}>
                Simpan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 