'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Bell, 
  Calendar, 
  Settings, 
  BookOpen,
  AlertTriangle,
  FileWarning,
  UserCog,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Mahasiswa',
    href: '/admin/mahasiswa',
    icon: Users
  },
  {
    title: 'Pelanggaran',
    href: '/admin/pelanggaran',
    icon: FileWarning
  },
  {
    title: 'Peraturan',
    href: '/admin/peraturan',
    icon: BookOpen
  },
  {
    title: 'Pengumuman',
    href: '/admin/pengumuman',
    icon: Bell
  },
  {
    title: 'Kalender',
    href: '/admin/kalender',
    icon: Calendar
  },
  {
    title: 'Laporan',
    href: '/admin/laporan',
    icon: FileText
  },
  {
    title: 'Pengguna',
    href: '/admin/users',
    icon: UserCog
  },
  {
    title: 'Pengaturan',
    href: '/admin/settings',
    icon: Settings
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Berhasil keluar');
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Gagal keluar');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r">
      <div className="p-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <img src="/images/logo politeknik ganesha medan.png" alt="Logo" className="w-8 h-8" />
          <span className="text-lg font-semibold">Admin Panel</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <item.icon size={20} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-semibold">
            A
          </div>
          <div>
            <p className="text-sm font-medium">Admin</p>
            <p className="text-xs text-gray-500">admin@polgan.ac.id</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
} 