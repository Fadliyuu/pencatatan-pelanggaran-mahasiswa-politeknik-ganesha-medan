"use client";

import React from "react";
import { Bell, Shield, Globe } from "lucide-react";
import { toast } from "react-hot-toast";
import { useSettings } from "@/contexts/SettingsContext";

export default function PengaturanPage() {
  const { settings, isLoading, toggleSetting } = useSettings();

  const handleToggle = async (key: keyof typeof settings | "privasi.tampilkanProfil" | "privasi.tampilkanRiwayat") => {
    try {
      await toggleSetting(key);
      toast.success("Pengaturan berhasil diperbarui");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Gagal memperbarui pengaturan. Silakan coba lagi.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Pengaturan</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Notifikasi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="text-primary-600" size={20} />
            Notifikasi
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Notifikasi Realtime</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Terima notifikasi secara realtime</p>
              </div>
              <button
                onClick={() => handleToggle("notifikasiRealtime")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  settings.notifikasiRealtime ? "bg-primary-600" : "bg-gray-200"
                }`}
                disabled={isLoading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifikasiRealtime ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Notifikasi Email</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Terima notifikasi melalui email</p>
              </div>
              <button
                onClick={() => handleToggle("notifikasiEmail")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  settings.notifikasiEmail ? "bg-primary-600" : "bg-gray-200"
                }`}
                disabled={isLoading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifikasiEmail ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privasi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Shield className="text-primary-600" size={20} />
            Privasi
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Tampilkan Profil</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Izinkan pengguna lain melihat profil Anda</p>
              </div>
              <button
                onClick={() => handleToggle("privasi.tampilkanProfil")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  settings.privasi.tampilkanProfil ? "bg-primary-600" : "bg-gray-200"
                }`}
                disabled={isLoading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privasi.tampilkanProfil ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Tampilkan Riwayat</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Izinkan pengguna lain melihat riwayat pelanggaran</p>
              </div>
              <button
                onClick={() => handleToggle("privasi.tampilkanRiwayat")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  settings.privasi.tampilkanRiwayat ? "bg-primary-600" : "bg-gray-200"
                }`}
                disabled={isLoading}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privasi.tampilkanRiwayat ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Informasi Aplikasi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="text-primary-600" size={20} />
            Informasi Aplikasi
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-200">Versi Aplikasi</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">1.0.0</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-200">Platform</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Web & Mobile</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-700 dark:text-gray-200">Dikembangkan oleh</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pengembang, Fadli Iskandar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 