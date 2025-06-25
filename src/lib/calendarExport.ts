/**
 * Library untuk ekspor kalender ke format iCalendar (.ics)
 */

import { Event, Holiday } from "@/components/UI/Calendar";

/**
 * Mengonversi tanggal ke format iCalendar (YYYYMMDD)
 */
function formatDateToICS(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Mengonversi waktu ke format iCalendar (HHMMSS)
 */
function formatTimeToICS(time: string): string {
  return time.replace(':', '') + '00';
}

/**
 * Membuat string iCalendar untuk satu acara
 */
function createEventICS(event: Event): string {
  const dateFormatted = formatDateToICS(new Date(event.date));
  const uid = `${event.id}@poligamed.ac.id`;
  let icsEvent = `BEGIN:VEVENT\r\n`;
  icsEvent += `UID:${uid}\r\n`;
  icsEvent += `DTSTAMP:${dateFormatted}T000000Z\r\n`;
  
  if (event.allDay) {
    icsEvent += `DTSTART;VALUE=DATE:${dateFormatted}\r\n`;
  } else {
    const startTime = event.startTime ? formatTimeToICS(event.startTime) : '000000';
    const endTime = event.endTime ? formatTimeToICS(event.endTime) : '235959';
    icsEvent += `DTSTART:${dateFormatted}T${startTime}Z\r\n`;
    icsEvent += `DTEND:${dateFormatted}T${endTime}Z\r\n`;
  }
  
  icsEvent += `SUMMARY:${event.title}\r\n`;
  
  if (event.description) {
    icsEvent += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\r\n`;
  }
  
  if (event.location) {
    icsEvent += `LOCATION:${event.location}\r\n`;
  }
  
  if (event.category) {
    icsEvent += `CATEGORIES:${event.category}\r\n`;
  }
  
  icsEvent += `END:VEVENT\r\n`;
  return icsEvent;
}

/**
 * Membuat string iCalendar untuk hari libur
 */
function createHolidayICS(holiday: Holiday): string {
  const dateFormatted = formatDateToICS(holiday.date);
  const uid = `holiday-${dateFormatted}@poligamed.ac.id`;
  
  let icsEvent = `BEGIN:VEVENT\r\n`;
  icsEvent += `UID:${uid}\r\n`;
  icsEvent += `DTSTAMP:${dateFormatted}T000000Z\r\n`;
  icsEvent += `DTSTART;VALUE=DATE:${dateFormatted}\r\n`;
  icsEvent += `SUMMARY:${holiday.name} (Hari Libur)\r\n`;
  
  if (holiday.description) {
    icsEvent += `DESCRIPTION:${holiday.description.replace(/\n/g, '\\n')}\r\n`;
  }
  
  icsEvent += `CATEGORIES:HOLIDAY\r\n`;
  icsEvent += `END:VEVENT\r\n`;
  return icsEvent;
}

/**
 * Mengekspor kalender ke format iCalendar (.ics)
 */
export function exportCalendarToICS(
  events: Event[], 
  holidays: Holiday[],
  calendarName: string = "Kalender Kegiatan Politeknik Ganesha Medan"
): string {
  let icsContent = `BEGIN:VCALENDAR\r\n`;
  icsContent += `VERSION:2.0\r\n`;
  icsContent += `PRODID:-//Politeknik Ganesha Medan//Kalender Kegiatan//ID\r\n`;
  icsContent += `CALSCALE:GREGORIAN\r\n`;
  icsContent += `METHOD:PUBLISH\r\n`;
  icsContent += `X-WR-CALNAME:${calendarName}\r\n`;
  icsContent += `X-WR-TIMEZONE:Asia/Jakarta\r\n`;
  
  // Tambahkan semua acara
  events.forEach(event => {
    icsContent += createEventICS(event);
  });
  
  // Tambahkan semua hari libur
  holidays.forEach(holiday => {
    icsContent += createHolidayICS(holiday);
  });
  
  icsContent += `END:VCALENDAR\r\n`;
  
  return icsContent;
}

/**
 * Download kalender sebagai file .ics
 */
export function downloadCalendarICS(
  events: Event[], 
  holidays: Holiday[],
  filename: string = "kalender_kegiatan"
): void {
  const icsContent = exportCalendarToICS(events, holidays);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
} 