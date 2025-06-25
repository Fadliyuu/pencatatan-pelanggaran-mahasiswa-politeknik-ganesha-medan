"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/UI/Card";
import { Calendar, Bell, FileText, AlertTriangle, User, Book } from "lucide-react";
import Badge from "@/components/UI/Badge";
import { fetchHariLiburNasional, formatTanggalIndonesia } from "@/lib/dates";
import { Holiday } from "@/components/UI/Calendar";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function MahasiswaDashboardPage() {
  const { user } = useAuth();
  const [mahasiswa, setMahasiswa] = useState<any>(null);
  const [pengumuman, setPengumuman] = useState<any[]>([]);
  const [pelanggaran, setPelanggaran] = useState<any[]>([]);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);

  // Fetch data mahasiswa
  useEffect(() => {
    const fetchMahasiswa = async () => {
      if (!user) return;

      try {
        const mahasiswaDoc = await getDoc(doc(db, 'mahasiswa', user.uid));
        if (mahasiswaDoc.exists()) {
          setMahasiswa(mahasiswaDoc.data());
        }
      } catch (error) {
        console.error('Error fetching mahasiswa:', error);
        toast.error('Gagal mengambil data mahasiswa');
      }
    };

    fetchMahasiswa();
  }, [user]);

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
      if (!user) return;

      try {
        const pelanggaranRef = collection(db, 'pelanggaran');
        const q = query(
          pelanggaranRef,
          where('mahasiswaId', '==', user.uid),
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
  }, [user]);

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

  if (!mahasiswa) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Data mahasiswa tidak ditemukan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden">
            <img 
              src={mahasiswa.photoURL || `https://ui-avatars.com/api/?name=${mahasiswa.name}&background=random`} 
              alt={mahasiswa.name} 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Selamat Datang, {mahasiswa.name}</h1>
            <p className="text-gray-600">{mahasiswa.programStudi} - Semester {mahasiswa.semester}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-700">Status:</span>
          <Badge 
            variant={mahasiswa.status === "Normal" ? "success" : 
                   mahasiswa.status === "Pembinaan" ? "warning" : "danger"}
          >
            {mahasiswa.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Poin Pelanggaran</CardTitle>
            <AlertTriangle size={18} className="text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mahasiswa.totalPoin || 0} Poin</div>
            <p className="text-xs text-muted-foreground">
              Batas: 25 poin (Pembinaan), 40 poin (Terancam DO)
            </p>
            <div className="mt-4 h-2 bg-gray-200 rounded-full">
              <div 
                className={`h-2 rounded-full ${
                  (mahasiswa.totalPoin || 0) < 25 ? "bg-green-500" : 
                  (mahasiswa.totalPoin || 0) < 40 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(mahasiswa.totalPoin || 0, 40)}%` }}
              />
            </div>
          </CardContent>
        </Card>

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
                    {formatTanggalIndonesia(item.tanggal.toDate()).split(',')[1].trim()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">Tidak ada pengumuman</p>
            )}
            <div className="pt-2">
              <Link href="/mahasiswa/pengumuman" className="text-sm text-primary-600 hover:underline">
                Lihat semua pengumuman
              </Link>
            </div>
          </CardContent>
        </Card>

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
                  <Link href="/mahasiswa/kalender" className="text-sm text-primary-600 hover:underline">
                    Lihat kalender lengkap
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Riwayat Pelanggaran Terakhir</CardTitle>
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
                      {formatTanggalIndonesia(item.tanggal.toDate())}
                    </p>
                  </div>
                ))}
                <div className="pt-2">
                  <Link href="/mahasiswa/pelanggaran" className="text-sm text-primary-600 hover:underline">
                    Lihat semua pelanggaran
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Tidak ada riwayat pelanggaran</p>
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
                href="/mahasiswa/peraturan" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <Book size={18} className="text-primary-600" />
                <span className="text-sm">Peraturan Kampus</span>
              </Link>
              <Link 
                href="/mahasiswa/kalender" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <Calendar size={18} className="text-primary-600" />
                <span className="text-sm">Kalender Akademik</span>
              </Link>
              <Link 
                href="/mahasiswa/laporan" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <MessageSquare size={18} className="text-primary-600" />
                <span className="text-sm">Buat Laporan</span>
              </Link>
              <Link 
                href="/mahasiswa/profil" 
                className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-md"
              >
                <User size={18} className="text-primary-600" />
                <span className="text-sm">Profil Saya</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 