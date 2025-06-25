import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getCalendarDays,
  isToday,
  isSameMonth,
  HARI_INDONESIA_SHORT,
  BULAN_INDONESIA,
  fetchHariLiburNasional,
  isHoliday,
  isSameDate,
  addMonths
} from "@/lib/dates";

export interface Event {
  id: string;
  title: string;
  date: Date;
  color?: string;
  description?: string;
  location?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  category?: string;
}

export interface Holiday {
  date: Date;
  name: string;
  description?: string;
  type?: string;
}

interface CalendarProps {
  events?: Event[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: Event) => void;
  onHolidayClick?: (holiday: Holiday) => void;
  className?: string;
  showHolidays?: boolean;
}

export function Calendar({
  events = [],
  onDateClick,
  onEventClick,
  onHolidayClick,
  className,
  showHolidays = true
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    setCalendarDays(getCalendarDays(currentYear, currentMonth));
    
    if (showHolidays) {
      const loadHolidays = async () => {
        setIsLoadingHolidays(true);
        try {
          const holidaysData = await fetchHariLiburNasional(currentYear);
          setHolidays(holidaysData);
        } catch (error) {
          console.error("Gagal mengambil data hari libur:", error);
          setHolidays([]);
        } finally {
          setIsLoadingHolidays(false);
        }
      };
      
      loadHolidays();
    }
  }, [currentMonth, currentYear, showHolidays]);

  const goToPreviousMonth = () => {
    setCurrentDate(addMonths(currentDate, -1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventsForDate = (date: Date): Event[] => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return isSameDate(eventDate, targetDate);
    });
  };

  const getHolidayForDate = (date: Date): Holiday | null => {
    return holidays.find(holiday => isSameDate(holiday.date, date)) || null;
  };

  const handleDateClick = (date: Date) => {
    const holiday = getHolidayForDate(date);
    
    if (holiday && onHolidayClick) {
      onHolidayClick(holiday);
    } else if (onDateClick) {
      onDateClick(date);
    }
  };

  // Fungsi untuk menampilkan maksimum 2 acara di sel kalender
  const renderEvents = (date: Date) => {
    const dateEvents = getEventsForDate(date);
    if (!dateEvents.length) return null;

    return (
      <div className="mt-1 max-h-12 overflow-hidden">
        {dateEvents.slice(0, 2).map((event, index) => (
          <div
            key={event.id || index}
            className={cn(
              "text-xs truncate p-1 rounded-sm mb-1 cursor-pointer",
              event.color || "bg-primary-100 text-primary-800"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick && onEventClick(event);
            }}
            title={event.title}
          >
            {event.startTime && !event.allDay ? `${event.startTime} ` : ""}
            {event.title}
          </div>
        ))}
        {dateEvents.length > 2 && (
          <div className="text-xs text-gray-500 pl-1">
            +{dateEvents.length - 2} lainnya
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-md", className)}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {BULAN_INDONESIA[currentMonth]} {currentYear}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={goToToday}
            >
              Hari Ini
            </button>
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={goToPreviousMonth}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              className="p-2 rounded-full hover:bg-gray-100"
              onClick={goToNextMonth}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b">
        {HARI_INDONESIA_SHORT.map((day, i) => (
          <div
            key={i}
            className={cn(
              "p-2 text-center text-sm font-medium",
              i === 0 ? "text-red-600" : "text-gray-600"
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 overflow-hidden">
        {calendarDays.map((date, i) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isCurrentDate = isToday(date);
          const holiday = showHolidays ? getHolidayForDate(date) : null;
          const holidayName = holiday ? holiday.name : null;
          
          return (
            <div
              key={i}
              className={cn(
                "border-b border-r p-1 min-h-[80px] transition-colors",
                "hover:bg-gray-50 cursor-pointer",
                !isCurrentMonth && "text-gray-400 bg-gray-50",
                isCurrentMonth && "bg-white",
                isCurrentDate && "bg-blue-50",
                holidayName && "bg-red-50",
                i % 7 === 0 && "border-l" // Hari Minggu ada border kiri
              )}
              onClick={() => handleDateClick(date)}
            >
              <div className="flex justify-between items-start">
                <span
                  className={cn(
                    "text-sm font-medium inline-flex items-center justify-center h-6 w-6 rounded-full",
                    isCurrentDate && "bg-primary-600 text-white",
                    !isCurrentDate && i % 7 === 0 && "text-red-600",
                    !isCurrentDate && holidayName && "text-red-600"
                  )}
                >
                  {date.getDate()}
                </span>
                {holidayName && (
                  <span className="text-xs text-red-600 font-medium" title={holidayName}>
                    {holidayName.length > 10 ? `${holidayName.substring(0, 10)}...` : holidayName}
                  </span>
                )}
              </div>
              {renderEvents(date)}
            </div>
          );
        })}
      </div>
      
      {isLoadingHolidays && (
        <div className="text-center py-2 text-sm text-gray-500">
          Memuat data hari libur...
        </div>
      )}
    </div>
  );
}

export default Calendar; 