"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getKalenderEvents } from '@/lib/firebase';
import { 
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Info,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface KalenderEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  color: string;
  category: string;
  allDay?: boolean;
}

export default function KalenderPage() {
  const router = useRouter();
  const [events, setEvents] = useState<KalenderEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<KalenderEvent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        fetchData();
      } else {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchData = async () => {
    try {
      const eventsData = await getKalenderEvents();
      setEvents(eventsData as KalenderEvent[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMonthName = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
  };

  const getDayName = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(date);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleEventClick = (event: KalenderEvent) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedEvent(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e2a78] via-[#6e3ff6] to-[#00e0ff] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Kalender Akademik</h1>
          <p className="text-white/80">Lihat jadwal dan acara akademik</p>
        </div>

        {/* Calendar Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h2 className="text-2xl font-bold text-white">{getMonthName(currentDate)}</h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
              <div key={day} className="text-center text-white/60 py-2">
                {day}
              </div>
            ))}
            {days.map((date, index) => (
              <div
                key={index}
                className={`min-h-[100px] p-2 rounded-xl ${
                  date ? 'bg-white/5 hover:bg-white/10' : ''
                } transition-colors`}
              >
                {date && (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm ${
                        date.getDate() === new Date().getDate() &&
                        date.getMonth() === new Date().getMonth() &&
                        date.getFullYear() === new Date().getFullYear()
                          ? 'bg-blue-500 text-white px-2 py-1 rounded-full'
                          : 'text-white/80'
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {getEventsForDate(date).map((event) => (
                        <button
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className="w-full text-left p-1 rounded text-xs text-white truncate"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedEvent && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Detail Acara</h2>
                <button
                  onClick={handleCloseDetailModal}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-white/80 mb-2">Judul</h3>
                  <p className="text-white font-semibold">{selectedEvent.title}</p>
                </div>

                <div>
                  <h3 className="text-white/80 mb-2">Tanggal</h3>
                  <div className="flex items-center gap-2 text-white">
                    <CalendarIcon className="h-5 w-5" />
                    <span>{formatDate(new Date(selectedEvent.date))}</span>
                  </div>
                </div>

                {selectedEvent.startTime && (
                  <div>
                    <h3 className="text-white/80 mb-2">Waktu</h3>
                    <div className="flex items-center gap-2 text-white">
                      <Clock className="h-5 w-5" />
                      <span>
                        {formatTime(selectedEvent.startTime)}
                        {selectedEvent.endTime && ` - ${formatTime(selectedEvent.endTime)}`}
                      </span>
                    </div>
                  </div>
                )}

                {selectedEvent.location && (
                  <div>
                    <h3 className="text-white/80 mb-2">Lokasi</h3>
                    <div className="flex items-center gap-2 text-white">
                      <MapPin className="h-5 w-5" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <h3 className="text-white/80 mb-2">Deskripsi</h3>
                    <div className="flex items-start gap-2 text-white">
                      <Info className="h-5 w-5 mt-1" />
                      <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-white/80 mb-2">Kategori</h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: selectedEvent.color + '40', color: selectedEvent.color }}>
                    {selectedEvent.category}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 