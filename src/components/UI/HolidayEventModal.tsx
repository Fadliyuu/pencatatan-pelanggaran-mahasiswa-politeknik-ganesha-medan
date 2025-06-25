import React from 'react';
import { X, Calendar, Info } from 'lucide-react';
import { formatTanggalIndonesia } from '@/lib/dates';

interface Holiday {
  date: Date;
  name: string;
  description?: string;
  type?: string;
}

interface HolidayEventModalProps {
  holiday: Holiday | null;
  isOpen: boolean;
  onClose: () => void;
}

const HolidayEventModal: React.FC<HolidayEventModalProps> = ({
  holiday,
  isOpen,
  onClose
}) => {
  if (!isOpen || !holiday) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Detail Hari Libur Nasional
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
          <h3 className="text-xl font-semibold text-red-600">{holiday.name}</h3>
          
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-gray-800 font-medium">{formatTanggalIndonesia(holiday.date)}</p>
              <p className="text-sm text-gray-500">Hari Libur Nasional</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {holiday.description || `Hari libur nasional Indonesia: ${holiday.name}`}
              </p>
            </div>
          </div>

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

export default HolidayEventModal; 