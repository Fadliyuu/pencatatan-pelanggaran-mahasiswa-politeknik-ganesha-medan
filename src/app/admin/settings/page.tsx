'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/UI/Card';
import Button from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { getPengaturan, updatePengaturan, uploadImageToCloudinary } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, Save, Upload, Bell, Shield, Info, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

const pengaturanSchema = z.object({
  ambangPoin: z.object({
    pembinaan: z.number().min(0, 'Poin pembinaan harus lebih dari 0'),
    terancamDO: z.number().min(0, 'Poin terancam DO harus lebih dari 0'),
  }),
  deskripsiKampus: z.string().min(1, 'Deskripsi kampus harus diisi'),
  kontakKampus: z.string().min(1, 'Kontak kampus harus diisi'),
  logoURL: z.string().optional(),
});

type PengaturanFormData = z.infer<typeof pengaturanSchema>;

interface Pengaturan {
  id: string;
  ambangPoin: {
    pembinaan: number;
    terancamDO: number;
  };
  deskripsiKampus: string;
  kontakKampus: string;
  logoURL?: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<PengaturanFormData>({
    resolver: zodResolver(pengaturanSchema),
  });

  useEffect(() => {
    fetchPengaturan();
  }, []);

  const fetchPengaturan = async () => {
    try {
      setLoading(true);
      const data = await getPengaturan();
      if (data) {
        reset({
          ambangPoin: data.ambangPoin,
          deskripsiKampus: data.deskripsiKampus,
          kontakKampus: data.kontakKampus,
          logoURL: data.logoURL,
        });
        setPreviewImage(data.logoURL || null);
      }
    } catch (error) {
      console.error('Error fetching pengaturan:', error);
      toast.error('Gagal mengambil data pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadImageToCloudinary(file);
      setValue('logoURL', url);
      setPreviewImage(url);
      toast.success('Logo berhasil diupload');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengupload logo');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: PengaturanFormData) => {
    try {
      await updatePengaturan(data);
      toast.success('Pengaturan berhasil disimpan');
    } catch (error) {
      console.error('Error updating pengaturan:', error);
      toast.error('Gagal menyimpan pengaturan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Umum', icon: Settings },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'security', label: 'Keamanan', icon: Shield },
    { id: 'about', label: 'Tentang', icon: Info },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tabs.find(tab => tab.id === activeTab)?.icon && 
                    React.createElement(tabs.find(tab => tab.id === activeTab)!.icon, { size: 20 })}
                  <span>{tabs.find(tab => tab.id === activeTab)?.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeTab === 'general' && (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Logo Kampus</h3>
                      <div className="flex items-center gap-4">
                        {previewImage && (
                          <div className="relative w-32 h-32">
                            <Image
                              src={previewImage}
                              alt="Logo Kampus"
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="logo-upload"
                            disabled={isUploading}
                          />
                          <label
                            htmlFor="logo-upload"
                            className={`cursor-pointer px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                              isUploading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {isUploading ? 'Mengupload...' : 'Upload Logo'}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Informasi Kampus</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Deskripsi Kampus
                        </label>
                        <textarea
                          {...register('deskripsiKampus')}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {errors.deskripsiKampus && (
                          <p className="mt-1 text-sm text-red-600">{errors.deskripsiKampus.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Kontak Kampus
                        </label>
                        <Input
                          {...register('kontakKampus')}
                          placeholder="Masukkan kontak kampus"
                          error={errors.kontakKampus?.message}
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pengaturan Notifikasi</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Notifikasi Email</h4>
                          <p className="text-sm text-gray-500">Terima notifikasi melalui email</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Notifikasi Browser</h4>
                          <p className="text-sm text-gray-500">Terima notifikasi di browser</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Pengaturan Keamanan</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ambang Batas Poin Pembinaan
                        </label>
                        <Input
                          type="number"
                          {...register('ambangPoin.pembinaan', { valueAsNumber: true })}
                          error={errors.ambangPoin?.pembinaan?.message}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ambang Batas Poin Terancam DO
                        </label>
                        <Input
                          type="number"
                          {...register('ambangPoin.terancamDO', { valueAsNumber: true })}
                          error={errors.ambangPoin?.terancamDO?.message}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'about' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Tentang Aplikasi</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Versi</h4>
                        <p className="text-sm text-gray-500">1.0.0</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Pengembang</h4>
                        <p className="text-sm text-gray-500">Tim Pengembang Politeknik Ganesha Medan</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Kontak</h4>
                        <p className="text-sm text-gray-500">support@poligamed.ac.id</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button type="submit" className="flex items-center gap-2">
                    <Save size={18} />
                    <span>Simpan Pengaturan</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
} 