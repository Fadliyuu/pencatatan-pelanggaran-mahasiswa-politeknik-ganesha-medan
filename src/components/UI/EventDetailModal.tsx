import React from 'react';
import { X, Calendar, Clock, MapPin, Tag, Info } from 'lucide-react';
import { formatTanggalIndonesia } from '@/lib/dates';
import { Event } from './Calendar';
import { cn } from '@/lib/utils';

interface EventDetailModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose
}) => {
  if (!isOpen || !event) return null;

  const categoryOptions = [
    { value: "academic", label: "Akademik" },
    { value: "ceremony", label: "Upacara/Seremonial" },
    { value: "meeting", label: "Rapat" },
    { value: "exam", label: "Ujian" },
    { value: "registration", label: "Pendaftaran" },
    { value: "holiday", label: "Libur" },
    { value: "seminar", label: "Seminar/Workshop" },
    { value: "other", label: "Lainnya" }
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Detail Acara
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <h3 className="text-xl font-semibold">{event.title}</h3>
          
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-800">{formatTanggalIndonesia(event.date)}</p>
              {event.allDay ? (
                <p className="text-sm text-gray-500">Sepanjang hari</p>
              ) : (
                <p className="text-sm text-gray-500">
                  {event.startTime} - {event.endTime || '...'}
                </p>
              )}
            </div>
          </div>

          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
              <p className="text-gray-800">{event.location}</p>
            </div>
          )}

          {event.category && (
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex items-center">
                <span 
                  className={cn(
                    "px-2 py-1 rounded-md text-sm",
                    event.category === "exam" ? "bg-red-100 text-red-800" :
                    event.category === "meeting" ? "bg-blue-100 text-blue-800" :
                    event.category === "seminar" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  )}
                >
                  {categoryOptions.find(cat => cat.value === event.category)?.label || event.category}
                </span>
              </div>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <button
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              onClick={onClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailModal; 