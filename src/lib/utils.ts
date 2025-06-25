import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine multiple class names into one with Tailwind merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format tanggal ke format Indonesia
 */
export function formatDate(date: Date | string | undefined | null) {
  if (!date) return "-"; // fallback jika tanggal undefined/null
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format tanggal ke format yyyy-mm-dd
 */
export function formatDateForInput(date: Date | string): string {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format angka ke Rupiah
 */
export function formatCurrency(amount: number): string {
  if (amount === null || amount === undefined) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate random ID
 */
export function generateId(length = 20): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Status pelanggaran berdasarkan poin
 */
export function getPelanggaranStatus(poin: number, threshold: { pembinaan: number; terancamDO: number }): 'Normal' | 'Pembinaan' | 'Terancam DO' {
  if (poin >= threshold.terancamDO) {
    return 'Terancam DO';
  } else if (poin >= threshold.pembinaan) {
    return 'Pembinaan';
  } else {
    return 'Normal';
  }
}

/**
 * Ekstrak nama file dari URL
 */
export function getFileNameFromUrl(url: string): string {
  if (!url) return '';
  
  const parts = url.split('/');
  const fileWithExtension = parts[parts.length - 1];
  
  // Remove any query parameters
  return fileWithExtension.split('?')[0];
}

/**
 * Truncate text
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Format waktu ke format Indonesia
 */
export function formatTime(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format tanggal ke format Indonesia dengan validasi
 */
export function formatTanggalIndonesia(date: string | null | undefined) {
  if (!date) return "-";
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.error("Invalid date string:", date);
      return "-";
    }
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "-";
  }
}

/**
 * Format waktu ke format "x waktu yang lalu"
 */
export function formatTimeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Baru saja';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} menit yang lalu`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} jam yang lalu`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} hari yang lalu`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} minggu yang lalu`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} bulan yang lalu`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} tahun yang lalu`;
} 