import React from "react";
import { X, Calendar, Clock, MapPin, Tag, Info, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTanggalIndonesia } from "@/lib/dates";
import { Event } from "./Calendar";

interface EventModalProps {
  event?: Event | null;
  isOpen: boolean;
  isEditing?: boolean;
  selectedDate?: Date | null;
  onClose: () => void;
  onSave?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
}

export function EventModal({
  event,
  isOpen,
  isEditing = false,
  selectedDate,
  onClose,
  onSave,
  onDelete
}: EventModalProps) {
  const [formData, setFormData] = React.useState<Event>({
    id: "",
    title: "",
    date: selectedDate || new Date(),
    description: "",
    location: "",
    allDay: false,
    startTime: "",
    endTime: "",
    category: "",
    color: "bg-primary-100 text-primary-800"
  });

  const [dateInput, setDateInput] = React.useState('');

  const [mode, setMode] = React.useState<"view" | "edit" | "create">(
    isEditing ? "edit" : event ? "view" : "create"
  );

  React.useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        date: new Date(event.date)
      });
      setDateInput(event.date ? new Date(event.date).toISOString().split('T')[0] : '');
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate
      }));
      setDateInput(selectedDate ? selectedDate.toISOString().split('T')[0] : '');
    }
    setMode(isEditing ? "edit" : event ? "view" : "create");
  }, [event, isEditing, selectedDate]);

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (name === 'date') {
      setDateInput(value);
      setFormData(prev => ({
        ...prev,
        date: new Date(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave({ ...formData, date: formData.date });
    }
    onClose();
  };

  const handleEdit = () => {
    setMode("edit");
  };

  const handleDelete = () => {
    if (onDelete && event?.id) {
      onDelete(event.id);
      onClose();
    }
  };

  const modalTitle = {
    view: "Detail Acara",
    edit: "Edit Acara",
    create: "Buat Acara Baru"
  };

  const colorOptions = [
    { value: "bg-primary-100 text-primary-800", label: "Biru (Default)" },
    { value: "bg-green-100 text-green-800", label: "Hijau" },
    { value: "bg-red-100 text-red-800", label: "Merah" },
    { value: "bg-yellow-100 text-yellow-800", label: "Kuning" },
    { value: "bg-purple-100 text-purple-800", label: "Ungu" },
    { value: "bg-gray-100 text-gray-800", label: "Abu-abu" }
  ];

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
    <div className="fixed inset-0 flex items-end justify-center bg-black bg-opacity-50 z-[100] p-4 pb-16">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {modalTitle[mode]}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {mode === "view" && event && (
          <div className="p-4 space-y-4">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-800">{formatTanggalIndonesia(event.date)}</p>
                {event.allDay ? (
                  <p className="text-sm text-gray-500">Sepanjang hari</p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {event.startTime} - {event.endTime}
                  </p>
                )}
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-800 break-words">{event.location}</p>
              </div>
            )}

            {event.category && (
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-800">
                  {categoryOptions.find(cat => cat.value === event.category)?.label || event.category}
                </p>
              </div>
            )}

            {event.description && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-gray-800 whitespace-pre-wrap break-words">{event.description}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                className="btn-outline"
                onClick={onClose}
              >
                Tutup
              </button>
              <button
                className="btn-primary"
                onClick={handleEdit}
              >
                Edit
              </button>
              <button
                className="btn-danger"
                onClick={handleDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        )}

        {(mode === "edit" || mode === "create") && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Judul Acara*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Masukkan judul acara"
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal*
              </label>
              <input
                type="date"
                id="date"
                name="date"
                required
                value={dateInput}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="allDay"
                name="allDay"
                checked={formData.allDay}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 rounded border-gray-300"
              />
              <label htmlFor="allDay" className="ml-2 text-sm text-gray-700">
                Sepanjang hari
              </label>
            </div>

            {!formData.allDay && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Waktu Selesai
                  </label>
                  <input
                    type="time"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime || ""}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Lokasi
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Masukkan lokasi acara"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                id="category"
                name="category"
                value={formData.category || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Pilih Kategori</option>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                Warna
              </label>
              <select
                id="color"
                name="color"
                value={formData.color || "bg-primary-100 text-primary-800"}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {colorOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 h-24 resize-none"
                placeholder="Tambahkan deskripsi acara"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={onClose}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Simpan
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EventModal; 