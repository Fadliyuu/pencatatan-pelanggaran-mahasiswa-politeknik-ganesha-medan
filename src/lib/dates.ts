/**
 * Library untuk menangani kalender dan format tanggal dalam bahasa Indonesia
 */

export const BULAN_INDONESIA = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

export const HARI_INDONESIA = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu'
];

export const HARI_INDONESIA_SHORT = [
  'Min',
  'Sen',
  'Sel',
  'Rab',
  'Kam',
  'Jum',
  'Sab'
];

/**
 * Format tanggal ke format Indonesia (contoh: Senin, 10 April 2023)
 */
export function formatTanggalIndonesia(date: Date | string): string {
  // Pastikan date adalah objek Date
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Set timezone ke UTC untuk konsistensi
  const utcDate = new Date(Date.UTC(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  ));

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: 'UTC' // Gunakan UTC untuk konsistensi
  };

  try {
    return utcDate.toLocaleDateString("id-ID", options);
  } catch (error) {
    console.error('Error formatting date:', error);
    // Fallback format jika toLocaleDateString gagal
    const day = utcDate.getUTCDate();
    const month = BULAN_INDONESIA[utcDate.getUTCMonth()];
    const year = utcDate.getUTCFullYear();
    const weekday = HARI_INDONESIA[utcDate.getUTCDay()];
    return `${weekday}, ${day} ${month} ${year}`;
  }
}

/**
 * Format tanggal ke format singkat (contoh: 10 Apr 2023)
 */
export function formatTanggalSingkat(date: Date | string | null): string {
  if (!date) return '';
  
  const d = new Date(date);
  const tanggal = d.getDate();
  const bulan = BULAN_INDONESIA[d.getMonth()].substring(0, 3);
  const tahun = d.getFullYear();
  
  return `${tanggal} ${bulan} ${tahun}`;
}

/**
 * Dapatkan nama bulan dalam bahasa Indonesia
 */
export function getNamaBulan(month: number): string {
  return BULAN_INDONESIA[month];
}

/**
 * Dapatkan semua tanggal dalam satu bulan
 */
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const lastDay = new Date(year, month + 1, 0).getDate();
  
  for (let i = 1; i <= lastDay; i++) {
    days.push(new Date(year, month, i));
  }
  
  return days;
}

/**
 * Dapatkan semua tanggal untuk tampilan kalender bulanan, termasuk tanggal dari bulan sebelum dan sesudahnya
 */
export function getCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  
  // Tanggal pertama dari bulan yang dipilih
  const firstDayOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  
  // Tambahkan hari-hari dari bulan sebelumnya
  const daysFromPrevMonth = dayOfWeek;
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevMonthYear = month === 0 ? year - 1 : year;
  const lastDayOfPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
  
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    days.push(new Date(prevMonthYear, prevMonth, lastDayOfPrevMonth - i));
  }
  
  // Tambahkan hari-hari dari bulan yang dipilih
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 1; i <= lastDayOfMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  // Tambahkan hari-hari dari bulan berikutnya
  const remainingDays = 42 - days.length; // 6 baris x 7 hari = 42 sel kalender
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextMonthYear = month === 11 ? year + 1 : year;
  
  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(nextMonthYear, nextMonth, i));
  }
  
  return days;
}

/**
 * Cek apakah tanggal adalah hari ini
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Cek apakah tanggal adalah dari bulan yang ditampilkan
 */
export function isSameMonth(date: Date, month: number): boolean {
  return date.getMonth() === month;
}

/**
 * Cek apakah dua tanggal adalah sama
 */
export function isSameDate(date1: Date, date2: Date): boolean {
  // Konversi kedua tanggal ke UTC untuk perbandingan yang konsisten
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return utc1 === utc2;
}

/**
 * Tambahkan bulan ke tanggal
 */
export function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

/**
 * Dapatkan array tahun (untuk dropdown selectbox)
 */
export function getYearOptions(startYear: number, endYear: number): number[] {
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push(year);
  }
  return years;
}

/**
 * Mendapatkan hari libur dari API Hari Libur Nasional Indonesia
 * Menggunakan public API: https://api-harilibur.vercel.app/
 */
export async function fetchHariLiburNasional(year?: number): Promise<{ date: Date; name: string; description?: string; type?: string }[]> {
  try {
    // Jika tahun tidak diberikan, gunakan tahun saat ini
    const targetYear = year || new Date().getFullYear();
    
    // Menggunakan API dari https://api-harilibur.vercel.app/
    const response = await fetch(`https://api-harilibur.vercel.app/api?year=${targetYear}`);
    
    if (!response.ok) {
      throw new Error(`Error mengambil data hari libur: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter hanya hari libur nasional
    return data
      .filter((holiday: any) => holiday.is_national_holiday)
      .map((holiday: any) => {
        // Format tanggal dari API: YYYY-MM-DD
        const [y, m, d] = holiday.holiday_date.split('-').map(Number);
        return {
          date: new Date(y, m - 1, d), // Bulan di JavaScript dimulai dari 0
          name: holiday.holiday_name,
          description: `Hari Libur Nasional: ${holiday.holiday_name}`,
          type: 'national'
        };
      });
  } catch (error) {
    console.error('Error fetching hari libur:', error);
    // Jika API gagal, kembalikan array kosong
    return [];
  }
}

/**
 * Cek apakah tanggal adalah hari libur
 */
export function isHoliday(date: Date, holidays: { date: Date; name: string }[]): string | null {
  const holiday = holidays.find(h => isSameDate(h.date, date));
  return holiday ? holiday.name : null;
} 