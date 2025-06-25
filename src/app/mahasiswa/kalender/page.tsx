"use client";

import React, { useState, useEffect } from "react";
import { List, DownloadIcon, Calendar as CalendarIcon, InfoIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/UI/Card";
import Calendar, { Event, Holiday } from "@/components/UI/Calendar";
import { formatTanggalIndonesia, fetchHariLiburNasional } from "@/lib/dates";
import Badge from "@/components/UI/Badge";
import HolidayEventModal from "@/components/UI/HolidayEventModal";
import EventDetailModal from "@/components/UI/EventDetailModal";
import { downloadCalendarICS } from "@/lib/calendarExport";
import { getKalenderEvents } from "@/lib/firebase";
import { toast } from "react-hot-toast";

// Contoh data acara untuk mahasiswa
const dummyEvents: Event[] = [
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
    id: "3",
    title: "Batas Akhir Pembayaran SPP",
    date: new Date(2023, 5, 25),
    color: "bg-yellow-100 text-yellow-800",
    allDay: true,
    category: "academic"
  },
  {
    id: "4",
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

export default function KalenderMahasiswaPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showHolidays, setShowHolidays] = useState(true);
  const [upcomingHolidays, setUpcomingHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    search: ""
  });
  const [isLoading, setIsLoading] = useState(true);

  // Mengambil data acara dari Firebase
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const data = await getKalenderEvents();
        console.log('Fetched events:', data); // Debug log
        const formattedEvents = data.map(event => ({
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
        console.log('Formatted events:', formattedEvents); // Debug log
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
        
        // Filter hari libur yang belum lewat
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcoming = holidaysData
          .filter(holiday => holiday.date >= today)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(0, 5); // Ambil 5 hari libur terdekat
          
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

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleHolidayClick = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsHolidayModalOpen(true);
  };

  const handleExportCalendar = () => {
    const year = new Date().getFullYear();
    downloadCalendarICS(filteredEvents, upcomingHolidays, `kalender_mahasiswa_${year}`);
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
    { value: "exam", label: "Ujian" },
    { value: "registration", label: "Pendaftaran" },
    { value: "holiday", label: "Libur" },
    { value: "seminar", label: "Seminar/Workshop" },
    { value: "other", label: "Lainnya" }
  ];

  return (
    <div className="space-y-6 p-6">
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
                               event.category === "meeting" ? "info" : 
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
                                    event.category === "meeting" ? "info" : 
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <HolidayEventModal
        holiday={selectedHoliday}
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
      />

      <EventDetailModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
      />
    </div>
  );
} 