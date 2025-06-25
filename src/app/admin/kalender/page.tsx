"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Filter, List, DownloadIcon, Calendar as CalendarIcon, InfoIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/UI/Card";
import { Calendar } from "@/components/UI/Calendar";
import EventModal from "@/components/UI/EventModal";
import { formatTanggalIndonesia, fetchHariLiburNasional } from "@/lib/dates";
import { formatDate } from "@/lib/utils";
import Badge from "@/components/UI/Badge";
import HolidayEventModal from "@/components/UI/HolidayEventModal";
import { downloadCalendarICS } from "@/lib/calendarExport";
import { getKalenderEvents, createKalenderEvent, updateKalenderEvent, deleteKalenderEvent, addKalenderNotifikasi, addNotifikasi } from "@/lib/firebase";
import { toast } from "react-hot-toast";
import Button from "@/components/UI/Button";
import Modal from "@/components/UI/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Holiday as CalendarHoliday } from "@/components/UI/Calendar";
import { useAuth } from '@/hooks/useAuth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Gunakan tipe CalendarHoliday
type Holiday = CalendarHoliday;

interface TargetPenerima {
  programStudi: string[];
  angkatan: string[];
  status: string[];
  agama: string[];
  jalur: string[];
  totalPoin?: {
    operator: 'kurang' | 'lebih' | 'sama';
    nilai: number;
  };
}

interface KalenderEvent {
  id: string;
  title: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  color?: string;
  category?: string;
  allDay?: boolean;
  targetPenerima?: TargetPenerima;
}

// Contoh data acara untuk demo
const dummyEvents: KalenderEvent[] = [
  {
    id: "1",
    title: "UTS Semester Genap",
    date: new Date(2023, 5, 10),
    color: "bg-red-100 text-red-800",
    description: "Ujian Tengah Semester Genap 2022/2023",
    category: "exam",
    allDay: true
  },
  {
    id: "2",
    title: "Rapat Dosen",
    date: new Date(2023, 5, 15),
    startTime: "10:00",
    endTime: "12:00",
    location: "Ruang Rapat Utama",
    color: "bg-blue-100 text-blue-800",
    category: "meeting"
  },
  {
    id: "3",
    title: "Workshop Kewirausahaan",
    date: new Date(2023, 5, 18),
    startTime: "09:00",
    endTime: "15:00",
    location: "Aula Gedung A",
    description: "Workshop kewirausahaan bagi mahasiswa semester 4-6",
    color: "bg-green-100 text-green-800",
    category: "seminar"
  },
  {
    id: "4",
    title: "Batas Akhir Pembayaran SPP",
    date: new Date(2023, 5, 25),
    color: "bg-yellow-100 text-yellow-800",
    allDay: true,
    category: "academic"
  },
  {
    id: "5",
    title: "Upacara Bendera",
    date: new Date(2023, 7, 17),
    startTime: "08:00",
    endTime: "10:00",
    location: "Lapangan Utama",
    description: "Upacara Peringatan Kemerdekaan RI",
    color: "bg-red-100 text-red-800",
    category: "ceremony"
  }
];

// Hapus definisi EventFormData yang duplikat dan gunakan satu definisi saja
type EventFormData = {
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  color?: string;
  category?: string;
  allDay?: boolean;
};

// Perbaiki schema validasi
const eventSchema = z.object({
  title: z.string().min(1, "Judul acara harus diisi"),
  date: z.string().min(1, "Tanggal harus diisi"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  allDay: z.boolean().optional()
});

// Tambahkan fungsi formatDateToYYYYMMDD
const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function KalenderPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<KalenderEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<KalenderEvent[]>([]);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showHolidays, setShowHolidays] = useState(true);
  const [upcomingHolidays, setUpcomingHolidays] = useState<CalendarHoliday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<CalendarHoliday | null>(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    search: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showTargetPenerima, setShowTargetPenerima] = useState(false);
  const [targetPenerima, setTargetPenerima] = useState<TargetPenerima>({
    programStudi: [],
    angkatan: [],
    status: [],
    agama: [],
    jalur: [],
    totalPoin: undefined
  });
  const { user } = useAuth();

  // Perbaiki useForm
  const { register, handleSubmit, reset, setValue, watch } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: "",
      date: formatDateToYYYYMMDD(new Date()),
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      color: "bg-primary-100 text-primary-800",
      category: "other",
      allDay: false
    }
  });

  // Watch allDay untuk mengatur waktu
  const isAllDay = watch("allDay");

  // Reset form saat modal dibuka/ditutup
  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setShowTargetPenerima(false);
    setTargetPenerima({
      programStudi: [],
      angkatan: [],
      status: [],
      agama: [],
      jalur: [],
      totalPoin: undefined
    });
    reset();
  };

  // Handle submit form
  const onSubmit = async (data: EventFormData) => {
    try {
      const eventData: KalenderEvent = {
        id: selectedEvent?.id || '',
        title: data.title,
        date: new Date(data.date),
        startTime: isAllDay ? undefined : data.startTime,
        endTime: isAllDay ? undefined : data.endTime,
        location: data.location,
        description: data.description,
        color: data.color,
        category: data.category,
        allDay: isAllDay,
        targetPenerima: targetPenerima
      };

      await handleSaveEvent(eventData);
      handleModalClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Gagal menyimpan acara');
    }
  };

  // Handle date click dari kalender
  const handleDateClick = (date: Date | string) => {
    let adjustedDate: Date;
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      adjustedDate = new Date(year, month - 1, day);
    } else {
      adjustedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    // Reset form dan set nilai default
    reset({
      title: "",
      date: formatDateToYYYYMMDD(adjustedDate),
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      color: "bg-primary-100 text-primary-800",
      category: "other",
      allDay: false
    });
    
    setSelectedDate(adjustedDate);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  // Handle event click untuk edit
  const handleEventClick = (event: KalenderEvent) => {
    setSelectedEvent(event);
    setSelectedDate(event.date);
    
    // Reset form dengan nilai event yang dipilih
    reset({
      title: event.title,
      date: formatDateToYYYYMMDD(event.date),
      startTime: event.startTime || "",
      endTime: event.endTime || "",
      location: event.location || "",
      description: event.description || "",
      color: event.color || "bg-primary-100 text-primary-800",
      category: event.category || "other",
      allDay: event.allDay || false
    });
    
    if (event.targetPenerima) {
      setTargetPenerima(event.targetPenerima);
    }
    setIsCreating(false);
    setIsModalOpen(true);
  };

  // Mengambil data acara dari Firebase
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const data = await getKalenderEvents();
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const futureEvents = [];
        for (const event of data) {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          if (eventDate >= now) {
            futureEvents.push(event);
          } else {
            // Hapus dari Firestore jika sudah lewat
            await deleteKalenderEvent(event.id);
          }
        }
        const formattedEvents = futureEvents.map(event => ({
          id: event.id,
          title: event.title || '',
          date: new Date(event.date),
          startTime: event.startTime || '',
          endTime: event.endTime || '',
          location: event.location || '',
          description: event.description || '',
          color: event.color || 'bg-primary-100 text-primary-800',
          category: event.category || 'other',
          allDay: event.allDay || false
        }));
        setEvents(formattedEvents);
        setFilteredEvents(formattedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Gagal mengambil data acara');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events berdasarkan kategori dan pencarian
  useEffect(() => {
    let filtered = [...events];
    
    if (filters.category) {
      filtered = filtered.filter(event => event.category === filters.category);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        event => 
          event.title.toLowerCase().includes(searchLower) || 
          (event.description && event.description.toLowerCase().includes(searchLower)) ||
          (event.location && event.location.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredEvents(filtered);
  }, [events, filters]);

  // Mendapatkan hari libur yang akan datang
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
          .slice(0, 5);
          
        setUpcomingHolidays(upcoming);
      } catch (error) {
        console.error("Gagal mengambil data hari libur mendatang:", error);
        setUpcomingHolidays([]);
      } finally {
        setIsLoadingHolidays(false);
      }
    };
    
    loadUpcomingHolidays();
  }, []);

  const handleHolidayClick = (holiday: CalendarHoliday) => {
    setSelectedHoliday(holiday);
    setIsHolidayModalOpen(true);
  };

  const handleAddEvent = () => {
    setSelectedDate(new Date());
    setSelectedEvent(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (event: KalenderEvent) => {
    try {
      // Pastikan tanggal memiliki timezone yang benar
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      // Pastikan targetPenerima.totalPoin tidak undefined
      const targetPenerimaData = targetPenerima.totalPoin ? {
        ...targetPenerima,
        totalPoin: {
          operator: targetPenerima.totalPoin.operator,
          nilai: targetPenerima.totalPoin.nilai
        }
      } : {
        ...targetPenerima,
        totalPoin: null
      };

      const eventData = {
        title: event.title,
        date: eventDate.toISOString(),
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        location: event.location || '',
        description: event.description || '',
        color: event.color || 'bg-primary-100 text-primary-800',
        category: event.category || 'other',
        allDay: event.allDay || false,
        targetPenerima: targetPenerimaData
      };

      if (event.id) {
        // Update existing event
        await updateKalenderEvent(event.id, eventData);
        setEvents(events.map(e => (e.id === event.id ? { ...event, date: eventDate } : e)));
        toast.success('Acara berhasil diperbarui');
        // Notifikasi ke mahasiswa
        const adminName = user?.displayName || 'Admin';
        await addKalenderNotifikasi(adminName, `Acara diperbarui: ${event.title}`);
        // Notifikasi ke semua admin lain
        const adminUid = user?.uid;
        const adminSnapshot = await getDocs(collection(db, 'admin'));
        const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Edit Kalender',
                message: `Admin ${adminName} mengedit acara kalender: ${event.title}`,
                type: 'kalender'
              })
            )
        );
      } else {
        // Create new event
        const docRef = await createKalenderEvent(eventData);
        const createdEvent = {
          ...event,
          id: docRef.id,
          date: eventDate
        };
        setEvents([...events, createdEvent]);
        toast.success('Acara berhasil ditambahkan');
        // Notifikasi ke mahasiswa
        const adminName = user?.displayName || 'Admin';
        await addKalenderNotifikasi(adminName, `Acara baru: ${event.title}`);
        // Notifikasi ke semua admin lain
        const adminUid = user?.uid;
        const adminSnapshot = await getDocs(collection(db, 'admin'));
        const allAdmins = adminSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        await Promise.all(
          allAdmins
            .filter(a => a.uid !== adminUid)
            .map(a =>
              addNotifikasi({
                userId: a.uid,
                title: 'Kalender Baru',
                message: `Admin ${adminName} menambahkan acara kalender: ${event.title}`,
                type: 'kalender'
              })
            )
        );
      }
      setIsModalOpen(false);
      setShowTargetPenerima(false);
      setTargetPenerima({
        programStudi: [],
        angkatan: [],
        status: [],
        agama: [],
        jalur: [],
        totalPoin: undefined
      });
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Gagal menyimpan acara');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteKalenderEvent(eventId);
      setEvents(events.filter(event => event.id !== eventId));
      toast.success('Acara berhasil dihapus');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Gagal menghapus acara');
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Mendapatkan acara untuk tanggal tertentu (untuk tampilan list)
  const getEventsForMonth = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const categoryOptions = [
    { value: "", label: "Semua Kategori" },
    { value: "academic", label: "Akademik" },
    { value: "ceremony", label: "Upacara/Seremonial" },
    { value: "meeting", label: "Rapat" },
    { value: "exam", label: "Ujian" },
    { value: "registration", label: "Pendaftaran" },
    { value: "holiday", label: "Libur" },
    { value: "seminar", label: "Seminar/Workshop" },
    { value: "other", label: "Lainnya" }
  ];

  const handleExportCalendar = () => {
    const year = new Date().getFullYear();
    downloadCalendarICS(filteredEvents, upcomingHolidays, `kalender_poligamed_${year}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kalender Kegiatan</h1>
          <p className="text-gray-600">Jadwal kegiatan dan acara kampus</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn-outline flex items-center gap-1 py-1.5 px-3"
            onClick={() => setView(view === "calendar" ? "list" : "calendar")}
          >
            {view === "calendar" ? <List size={18} /> : <CalendarIcon size={18} />}
            <span>{view === "calendar" ? "Tampilan List" : "Tampilan Kalender"}</span>
          </button>
          <button
            className="btn-primary flex items-center gap-1 py-1.5 px-3"
            onClick={handleAddEvent}
          >
            <PlusCircle size={18} />
            <span>Tambah Acara</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  className="input-field"
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pencarian
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Cari judul acara..."
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="showHolidays"
                  checked={showHolidays}
                  onChange={(e) => setShowHolidays(e.target.checked)}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label htmlFor="showHolidays" className="ml-2 text-sm text-gray-700">
                  Tampilkan Hari Libur Nasional
                </label>
              </div>
              <button
                className="btn-outline w-full mt-2"
                onClick={() => setFilters({ category: "", search: "" })}
              >
                Reset Filter
              </button>
              <button
                className="flex items-center gap-1 justify-center w-full mt-4 text-primary-600 hover:text-primary-700 py-2 border border-primary-200 rounded-md bg-primary-50"
                onClick={handleExportCalendar}
              >
                <DownloadIcon size={16} />
                <span>Ekspor Kalender</span>
              </button>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Acara Mendatang</CardTitle>
              <CardDescription>Acara dalam 7 hari ke depan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredEvents
                .filter(event => {
                  const eventDate = new Date(event.date).getTime();
                  const today = new Date().getTime();
                  const oneWeek = 7 * 24 * 60 * 60 * 1000;
                  return eventDate >= today && eventDate <= today + oneWeek;
                })
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 3)
                .map(event => (
                  <div 
                    key={event.id} 
                    className="p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex justify-between">
                      <h3 className="font-medium">{event.title}</h3>
                      <Badge 
                        variant={event.category === "exam" ? "danger" : 
                               event.category === "meeting" ? "default" : 
                               event.category === "seminar" ? "success" : "info"}
                        className="text-xs">
                        {categoryOptions.find(cat => cat.value === event.category)?.label.split('/')[0] || "Lainnya"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTanggalIndonesia(event.date)}
                      {!event.allDay && event.startTime && ` • ${event.startTime}`}
                    </p>
                    {event.location && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        📍 {event.location}
                      </p>
                    )}
                  </div>
                ))}
              {filteredEvents.filter(event => {
                const eventDate = new Date(event.date).getTime();
                const today = new Date().getTime();
                const oneWeek = 7 * 24 * 60 * 60 * 1000;
                return eventDate >= today && eventDate <= today + oneWeek;
              }).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">
                  Tidak ada acara dalam 7 hari ke depan
                </p>
              )}
            </CardContent>
          </Card>

          {showHolidays && (
            <Card className="mt-4">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-md">Hari Libur Mendatang</CardTitle>
                <InfoIcon size={18} className="text-gray-400" />
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {isLoadingHolidays ? (
                  <p className="text-sm text-gray-500 text-center py-2">
                    Memuat data hari libur...
                  </p>
                ) : (
                  <>
                    {upcomingHolidays.length > 0 ? (
                      upcomingHolidays.map((holiday, index) => (
                        <div 
                          key={index} 
                          className="border-b pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 p-2 rounded-md"
                          onClick={() => handleHolidayClick(holiday)}
                        >
                          <p className="font-medium text-sm">{holiday.name}</p>
                          <p className="text-xs text-red-600">
                            {formatTanggalIndonesia(holiday.date)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">
                        Tidak ada hari libur dalam waktu dekat
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          {view === "calendar" ? (
            <Calendar
              events={filteredEvents}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              onHolidayClick={handleHolidayClick}
              showHolidays={showHolidays}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Daftar Acara</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getEventsForMonth().length > 0 ? (
                    getEventsForMonth().map(event => (
                      <div 
                        key={event.id}
                        className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                          <div>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <p className="text-gray-600">
                              {formatTanggalIndonesia(event.date)}
                              {!event.allDay && event.startTime && ` • ${event.startTime} - ${event.endTime || '...'}`}
                            </p>
                            {event.description && (
                              <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                            {event.location && (
                              <p className="text-sm text-gray-500 mt-1">
                                📍 {event.location}
                              </p>
                            )}
                          </div>
                          <div>
                            <Badge 
                              variant={event.category === "exam" ? "danger" : 
                                    event.category === "meeting" ? "default" : 
                                    event.category === "seminar" ? "success" : "info"}
                            >
                              {categoryOptions.find(cat => cat.value === event.category)?.label.split('/')[0] || "Lainnya"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Tidak ada acara yang ditemukan</p>
                      <button 
                        className="mt-4 btn-primary"
                        onClick={handleAddEvent}
                      >
                        Tambah Acara Baru
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Acara */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={selectedEvent ? "Edit Acara" : "Tambah Acara"}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Judul Acara */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Acara
                </label>
                <input
                  type="text"
                  {...register("title")}
                  className="input-field w-full"
                  placeholder="Masukkan judul acara"
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  className="input-field w-full"
                  {...register("date")}
                  defaultValue={selectedDate ? formatDateToYYYYMMDD(selectedDate) : formatDateToYYYYMMDD(new Date())}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setValue("date", e.target.value);
                    setSelectedDate(date);
                  }}
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  {...register("category")}
                  className="input-field w-full"
                >
                  {categoryOptions.filter(opt => opt.value !== "").map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Waktu Mulai */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waktu Mulai
                </label>
                <input
                  type="time"
                  {...register("startTime")}
                  className="input-field w-full"
                  disabled={isAllDay}
                />
              </div>

              {/* Waktu Selesai */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Waktu Selesai
                </label>
                <input
                  type="time"
                  {...register("endTime")}
                  className="input-field w-full"
                  disabled={isAllDay}
                />
              </div>

              {/* Lokasi */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lokasi
                </label>
                <input
                  type="text"
                  {...register("location")}
                  className="input-field w-full"
                  placeholder="Masukkan lokasi acara"
                />
              </div>

              {/* Deskripsi */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  {...register("description")}
                  className="input-field w-full h-24"
                  placeholder="Masukkan deskripsi acara"
                />
              </div>

              {/* Warna */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warna
                </label>
                <select
                  {...register("color")}
                  className="input-field w-full"
                >
                  <option value="bg-primary-100 text-primary-800">Biru</option>
                  <option value="bg-red-100 text-red-800">Merah</option>
                  <option value="bg-green-100 text-green-800">Hijau</option>
                  <option value="bg-yellow-100 text-yellow-800">Kuning</option>
                  <option value="bg-purple-100 text-purple-800">Ungu</option>
                </select>
              </div>

              {/* Acara Sehari Penuh */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("allDay")}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Acara Sehari Penuh
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Target Penerima</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTargetPenerima(!showTargetPenerima)}
                >
                  {showTargetPenerima ? "Sembunyikan Filter" : "Tampilkan Filter"}
                </Button>
              </div>

              {showTargetPenerima && (
                <div className="space-y-4 p-4 border rounded-lg">
                  {/* Program Studi */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Program Studi</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Manajemen Informatika', 'Akuntansi', 'Teknik Informatika'].map((prodi) => (
                        <label key={prodi} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={targetPenerima.programStudi.includes(prodi)}
                            onChange={(e) => {
                              const newProdi = e.target.checked
                                ? [...targetPenerima.programStudi, prodi]
                                : targetPenerima.programStudi.filter(p => p !== prodi);
                              setTargetPenerima({ ...targetPenerima, programStudi: newProdi });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{prodi}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Angkatan */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Angkatan</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 11 }, (_, i) => (2020 + i).toString()).map((tahun) => (
                        <label key={tahun} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={targetPenerima.angkatan.includes(tahun)}
                            onChange={(e) => {
                              const newAngkatan = e.target.checked
                                ? [...targetPenerima.angkatan, tahun]
                                : targetPenerima.angkatan.filter(a => a !== tahun);
                              setTargetPenerima({ ...targetPenerima, angkatan: newAngkatan });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{tahun}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Normal', 'Pembinaan', 'Terancam DO'].map((status) => (
                        <label key={status} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={targetPenerima.status.includes(status)}
                            onChange={(e) => {
                              const newStatus = e.target.checked
                                ? [...targetPenerima.status, status]
                                : targetPenerima.status.filter(s => s !== status);
                              setTargetPenerima({ ...targetPenerima, status: newStatus });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{status}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Agama */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Agama</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'].map((agama) => (
                        <label key={agama} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={targetPenerima.agama.includes(agama)}
                            onChange={(e) => {
                              const newAgama = e.target.checked
                                ? [...targetPenerima.agama, agama]
                                : targetPenerima.agama.filter(a => a !== agama);
                              setTargetPenerima({ ...targetPenerima, agama: newAgama });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{agama}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Jalur */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Jalur</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Umum', 'KIP', 'Beasiswa'].map((jalur) => (
                        <label key={jalur} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={targetPenerima.jalur.includes(jalur)}
                            onChange={(e) => {
                              const newJalur = e.target.checked
                                ? [...targetPenerima.jalur, jalur]
                                : targetPenerima.jalur.filter(j => j !== jalur);
                              setTargetPenerima({ ...targetPenerima, jalur: newJalur });
                            }}
                            className="rounded border-gray-300"
                          />
                          <span>{jalur}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Total Poin */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Poin</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={targetPenerima.totalPoin?.operator || ''}
                        onChange={(e) => {
                          const operator = e.target.value as 'kurang' | 'lebih' | 'sama';
                          setTargetPenerima({
                            ...targetPenerima,
                            totalPoin: {
                              operator,
                              nilai: targetPenerima.totalPoin?.nilai || 0
                            }
                          });
                        }}
                        className="rounded border-gray-300"
                      >
                        <option value="">Pilih operator</option>
                        <option value="kurang">Kurang dari</option>
                        <option value="lebih">Lebih dari</option>
                        <option value="sama">Sama dengan</option>
                      </select>
                      <input
                        type="number"
                        value={targetPenerima.totalPoin?.nilai || ''}
                        onChange={(e) => {
                          const nilai = parseInt(e.target.value);
                          setTargetPenerima({
                            ...targetPenerima,
                            totalPoin: {
                              operator: targetPenerima.totalPoin?.operator || 'kurang',
                              nilai: isNaN(nilai) ? 0 : nilai
                            }
                          });
                        }}
                        placeholder="Nilai poin"
                        className="rounded border-gray-300 w-32"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {selectedEvent && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Apakah Anda yakin ingin menghapus acara ini?')) {
                      handleDeleteEvent(selectedEvent.id);
                      handleModalClose();
                    }
                  }}
                >
                  Hapus Acara
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
              >
                Batal
              </Button>
              <Button type="submit">
                {selectedEvent ? "Simpan Perubahan" : "Tambah Acara"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Hari Libur */}
      {isHolidayModalOpen && selectedHoliday && (
        <HolidayEventModal
          holiday={selectedHoliday}
          isOpen={isHolidayModalOpen}
          onClose={() => {
            setIsHolidayModalOpen(false);
            setSelectedHoliday(null);
          }}
        />
      )}
    </div>
  );
} 