"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { Calendar, Bell, FileText, AlertTriangle, User, Book, Users, Megaphone, Settings } from "lucide-react";
import Badge from "@/components/UI/Badge";
import { fetchHariLiburNasional, formatTanggalIndonesia } from "@/lib/dates";
import { Holiday } from "@/components/UI/Calendar";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMahasiswa: 0,
    totalPelanggaran: 0,
    totalPengumuman: 0,
    mahasiswaPembinaan: 0,
    mahasiswaTerancamDO: 0
  });
  const [pengumuman, setPengumuman] = useState<any[]>([]);
  const [pelanggaran, setPelanggaran] = useState<any[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch statistik
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [mahasiswaSnapshot, pelanggaranSnapshot, pengumumanSnapshot] = await Promise.all([
          getDocs(collection(db, 'mahasiswa')),
          getDocs(collection(db, 'pelanggaran')),
          getDocs(collection(db, 'pengumuman'))
        ]);

        const mahasiswaData = mahasiswaSnapshot.docs.map(doc => doc.data());
        const pembinaan = mahasiswaData.filter((m: any) => m.status === 'Pembinaan').length;
        const terancamDO = mahasiswaData.filter((m: any) => m.status === 'Terancam DO').length;

        setStats({
          totalMahasiswa: mahasiswaSnapshot.size,
          totalPelanggaran: pelanggaranSnapshot.size,
          totalPengumuman: pengumumanSnapshot.size,
          mahasiswaPembinaan: pembinaan,
          mahasiswaTerancamDO: terancamDO
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Gagal mengambil statistik');
        toast.error('Gagal mengambil statistik');
      }
    };

    fetchStats();
  }, []);

  // Fetch pengumuman terbaru
  useEffect(() => {
    const fetchPengumuman = async () => {
      try {
        const pengumumanRef = collection(db, 'pengumuman');
        const q = query(
          pengumumanRef,
          orderBy('tanggal', 'desc'),
          limit(3)
        );
        const querySnapshot = await getDocs(q);
        const pengumumanData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPengumuman(pengumumanData);
      } catch (error) {
        console.error('Error fetching pengumuman:', error);
        toast.error('Gagal mengambil pengumuman');
      }
    };

    fetchPengumuman();
  }, []);

  // Fetch pelanggaran terakhir
  useEffect(() => {
    const fetchPelanggaran = async () => {
      try {
        const pelanggaranRef = collection(db, 'pelanggaran');
        const q = query(
          pelanggaranRef,
          orderBy('tanggal', 'desc'),
          limit(3)
        );
        const querySnapshot = await getDocs(q);
        const pelanggaranData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPelanggaran(pelanggaranData);
      } catch (error) {
        console.error('Error fetching pelanggaran:', error);
        toast.error('Gagal mengambil data pelanggaran');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPelanggaran();
  }, []);

  // Fetch hari libur
  useEffect(() => {
    const loadUpcomingHolidays = async () => {
      setIsLoadingHolidays(true);
      try {
        const currentYear = new Date().getFullYear();
        const holidaysData = await fetchHariLiburNasional(currentYear);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcoming = holidaysData
          .filter(holiday => holiday.date >= today)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 3);
          
        setUpcomingHolidays(upcoming);
      } catch (error) {
        console.error("Gagal mengambil data hari libur:", error);
        setUpcomingHolidays([]);
      } finally {
        setIsLoadingHolidays(false);
      }
    };

    loadUpcomingHolidays();
  }, []);

  if (error) {
  return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Terjadi Kesalahan</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
            </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center">
            <User size={32} className="text-primary-600" />
          </div>
            <div>
            <h1 className="text-2xl font-bold">Selamat Datang, {user?.displayName || 'Admin'}</h1>
            <p className="text-gray-600">Portal Admin Politeknik Ganesha Medan</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Mahasiswa</CardTitle>
            <Users size={18} className="text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMahasiswa}</div>
            <p className="text-xs text-muted-foreground">
              {stats.mahasiswaPembinaan} dalam pembinaan, {stats.mahasiswaTerancamDO} terancam DO
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pelanggaran</CardTitle>
            <AlertTriangle size={18} className="text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPelanggaran}</div>
            <p className="text-xs text-muted-foreground">
              {stats.mahasiswaPembinaan + stats.mahasiswaTerancamDO} mahasiswa perlu perhatian
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pengumuman</CardTitle>
            <Megaphone size={18} className="text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPengumuman}</div>
            <p className="text-xs text-muted-foreground">
              {pengumuman.length} pengumuman aktif
            </p>
          </CardContent>
        </Card>
          </div>
          
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pengumuman Terbaru</CardTitle>
            <Bell size={18} className="text-blue-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            {pengumuman.length > 0 ? (
              pengumuman.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <div className="flex items-start gap-2">
                    {item.penting && (
                      <span className="mt-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                    <span className="text-sm line-clamp-1">{item.judul}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTanggalIndonesia(item.tanggal instanceof Date ? item.tanggal : new Date(item.tanggal)).split(',')[1].trim()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Tidak ada pengumuman</p>
            )}
            <div className="pt-2">
              <Link href="/admin/pengumuman" className="text-sm text-primary-600 hover:underline">
                Lihat semua pengumuman
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pelanggaran Terbaru</CardTitle>
            <FileText size={18} className="text-gray-500" />
          </CardHeader>
          <CardContent>
            {pelanggaran.length > 0 ? (
          <div className="space-y-4">
                {pelanggaran.map((item) => (
                  <div key={item.id} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.peraturan}</span>
                      <Badge variant="danger">{item.poin} poin</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTanggalIndonesia(item.tanggal instanceof Date ? item.tanggal : new Date(item.tanggal))}
                    </p>
            </div>
                ))}
                <div className="pt-2">
                  <Link href="/admin/pelanggaran" className="text-sm text-primary-600 hover:underline">
                    Lihat semua pelanggaran
                  </Link>
          </div>
        </div>
            ) : (
              <p className="text-gray-500">Tidak ada pelanggaran terbaru</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hari Libur Mendatang</CardTitle>
            <Calendar size={18} className="text-red-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingHolidays ? (
              <p className="text-sm text-gray-500">Memuat data hari libur...</p>
            ) : (
              <>
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map((holiday, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-sm">{holiday.name}</span>
                      <span className="text-xs text-red-500">
                        {formatTanggalIndonesia(holiday.date).split(',')[1].trim()}
                      </span>
        </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada hari libur dalam waktu dekat</p>
                )}
                <div className="pt-2">
                  <Link href="/admin/kalender" className="text-sm text-primary-600 hover:underline">
                    Lihat kalender lengkap
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tautan Cepat</CardTitle>
            <Book size={18} className="text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/admin/mahasiswa" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <Users size={18} className="text-primary-600" />
                <span className="text-sm">Kelola Mahasiswa</span>
              </Link>
              <Link 
                href="/admin/pelanggaran" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <AlertTriangle size={18} className="text-primary-600" />
                <span className="text-sm">Kelola Pelanggaran</span>
              </Link>
              <Link 
                href="/admin/pengumuman" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <Megaphone size={18} className="text-primary-600" />
                <span className="text-sm">Kelola Pengumuman</span>
              </Link>
              <Link 
                href="/admin/settings" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <Settings size={18} className="text-primary-600" />
                <span className="text-sm">Pengaturan</span>
              </Link>
        </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}