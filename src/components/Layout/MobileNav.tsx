'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, User, AlertCircle, BookOpen, Calendar, 
  Bell, FileText, FileInput, Settings, Users, LogOut,
  Menu, X
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface MobileNavProps {
  user: FirebaseUser | null;
  onLogout: () => Promise<void>;
}

const mobileNavItems = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { title: 'Mahasiswa', href: '/admin/mahasiswa', icon: 'Users' },
  { title: 'Pelanggaran', href: '/admin/pelanggaran', icon: 'AlertCircle' },
  { title: 'Peraturan', href: '/admin/peraturan', icon: 'BookOpen' },
  { title: 'Pengumuman', href: '/admin/pengumuman', icon: 'Bell' },
  { title: 'Laporan', href: '/admin/laporan', icon: 'FileText' },
  { title: 'Acara', href: '/admin/acara', icon: 'Calendar' },
  { title: 'Pengaturan', href: '/admin/pengaturan', icon: 'Settings' },
];

export default function MobileNav({ user, onLogout }: MobileNavProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const getIcon = (icon: string, isActive: boolean) => {
    const props = {
      size: 20,
      className: isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-primary-600'
    };

    switch (icon) {
      case 'LayoutDashboard': return <LayoutDashboard {...props} />;
      case 'User': return <User {...props} />;
      case 'AlertCircle': return <AlertCircle {...props} />;
      case 'BookOpen': return <BookOpen {...props} />;
      case 'Calendar': return <Calendar {...props} />;
      case 'Bell': return <Bell {...props} />;
      case 'FileText': return <FileText {...props} />;
      case 'FileInput': return <FileInput {...props} />;
      case 'Settings': return <Settings {...props} />;
      case 'Users': return <Users {...props} />;
      default: return <LayoutDashboard {...props} />;
    }
  };

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center">
          <img 
            src="/images/logo politeknik ganesha medan.png" 
            alt="Logo Politeknik Ganesha Medan" 
            className="h-8 mr-2"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Politeknik Ganesha</h1>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
        <button
          onClick={toggleMenu}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="bg-white h-full w-64 p-4 shadow-lg overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold">Menu</h2>
              <button
                onClick={toggleMenu}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="space-y-1">
              {mobileNavItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={index} 
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div
                      className={`flex items-center px-4 py-3 rounded-md group transition-colors ${
                        isActive 
                          ? 'bg-primary-50 text-primary-600' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {getIcon(item.icon, isActive)}
                      <span className="ml-3 text-sm font-medium">{item.title}</span>
                    </div>
                  </Link>
                );
              })}
              
              <div className="pt-6 mt-6 border-t">
                <button 
                  onClick={onLogout}
                  className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100"
                >
                  <LogOut size={20} className="text-gray-500" />
                  <span className="ml-3">Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
} 