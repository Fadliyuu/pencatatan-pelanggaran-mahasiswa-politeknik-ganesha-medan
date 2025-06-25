'use client';

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
      <div className="relative animate-fade-in">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-primary-600 rounded-full" />
        </div>
      </div>
    </div>
  );
} 