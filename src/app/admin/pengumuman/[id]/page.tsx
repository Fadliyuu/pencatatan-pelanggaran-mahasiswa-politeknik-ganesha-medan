'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, User, Edit2, Save, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { getPengumuman, updatePengumuman, uploadImageToCloudinary } from '@/lib/firebase';
import { formatDate, formatTime } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const pengumumanSchema = z.object({
  judul: z.string().min(1, 'Judul harus diisi'),
  isi: z.string().min(1, 'Isi pengumuman harus diisi'),
  tanggal: z.string().min(1, 'Tanggal harus diisi'),
  gambarURL: z.string().optional(),
});

type PengumumanFormData = z.infer<typeof pengumumanSchema>;

interface Pengumuman {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
  gambarURL?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PengumumanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pengumuman, setPengumuman] = useState<Pengumuman | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<PengumumanFormData>({
    resolver: zodResolver(pengumumanSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!params || !('id' in params) || !params.id) {
        console.error('ID tidak ditemukan dalam params');
        toast.error('ID pengumuman tidak ditemukan');
        router.push('/admin/pengumuman');
        return;
      }

      try {
        setLoading(true);
        const pengumumanData = await getPengumuman();
        const selectedPengumuman = pengumumanData.find(p => p.id === params.id);

        if (!selectedPengumuman || !('judul' in selectedPengumuman) || !('isi' in selectedPengumuman) || !('tanggal' in selectedPengumuman) || !('createdAt' in selectedPengumuman) || !('updatedAt' in selectedPengumuman)) {
          toast.error('Pengumuman tidak ditemukan atau data tidak lengkap');
          router.push('/admin/pengumuman');
          return;
        }
        const pengumumanObj = selectedPengumuman as Pengumuman;
        setPengumuman(pengumumanObj);
        reset({
          judul: pengumumanObj.judul,
          isi: pengumumanObj.isi,
          tanggal: pengumumanObj.tanggal,
          gambarURL: pengumumanObj.gambarURL,
        });
        setPreviewImage(pengumumanObj.gambarURL || null);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Gagal mengambil data pengumuman');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params && 'id' in params ? params.id : undefined, router, reset]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadImageToCloudinary(file);
      setValue('gambarURL', url);
      setPreviewImage(url);
      toast.success('Gambar berhasil diupload');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengupload gambar');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: PengumumanFormData) => {
    if (!pengumuman) return;

    try {
      const updatedData = {
        ...data,
        updatedAt: formatDate(new Date())
      };

      await updatePengumuman(pengumuman.id, updatedData);
      setPengumuman({ ...pengumuman, ...updatedData });
      setIsEditing(false);
      toast.success('Pengumuman berhasil diperbarui');
    } catch (error) {
      console.error('Error updating pengumuman:', error);
      toast.error('Gagal memperbarui pengumuman');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!pengumuman) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">Pengumuman tidak ditemukan</p>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/pengumuman')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span>Kembali ke Daftar Pengumuman</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/pengumuman')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span>Kembali</span>
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Detail Pengumuman</h1>
        </div>
        <Button
          variant={isEditing ? "outline" : "default"}
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2"
        >
          {isEditing ? (
            <>
              <X size={18} />
              <span>Batal Edit</span>
            </>
          ) : (
            <>
              <Edit2 size={18} />
              <span>Edit Pengumuman</span>
            </>
          )}
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="overflow-hidden">
          {isEditing ? (
            <div className="p-4 border-b">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="gambar-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="gambar-upload"
                className={`cursor-pointer px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isUploading ? 'Mengupload...' : 'Ubah Gambar'}
              </label>
            </div>
          ) : null}

          {(pengumuman.gambarURL || previewImage) && (
            <div className="relative w-full h-[300px]">
              <Image
                src={previewImage || pengumuman.gambarURL || ''}
                alt={pengumuman.judul}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <CardHeader className="space-y-4">
            <div className="space-y-2">
              {isEditing ? (
                <input
                  {...register('judul')}
                  className="w-full text-3xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-primary-500 focus:outline-none"
                />
              ) : (
                <CardTitle className="text-3xl font-bold text-gray-900">
                  {pengumuman.judul}
                </CardTitle>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar size={16} />
                  {isEditing ? (
                    <input
                      type="date"
                      {...register('tanggal')}
                      className="bg-transparent border-b border-gray-300 focus:border-primary-500 focus:outline-none"
                    />
                  ) : (
                    <span>{formatDate(pengumuman.tanggal)}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{formatTime(pengumuman.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User size={16} />
                  <span>Admin</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="prose prose-lg max-w-none">
              {isEditing ? (
                <textarea
                  {...register('isi')}
                  className="w-full min-h-[200px] p-4 border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {pengumuman.isi}
                </div>
              )}
            </div>
          </CardContent>

          {isEditing && (
            <div className="p-4 border-t">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Batal
                </Button>
                <Button type="submit" className="flex items-center gap-2">
                  <Save size={18} />
                  <span>Simpan Perubahan</span>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
} 