import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Image from 'next/image';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}
      style={{ willChange: 'transform' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link
                  href="/"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Beranda
                </Link>
                <Link
                  href="/peraturan"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Peraturan
                </Link>
                <Link
                  href="/pengumuman"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Pengumuman
                </Link>
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {user ? (
                <button
                  onClick={() => signOut()}
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Keluar
                </button>
              ) : (
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Masuk
                </Link>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-primary-600"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setIsOpen(false)}
            >
              Beranda
            </Link>
            <Link
              href="/peraturan"
              className="block px-3 py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setIsOpen(false)}
            >
              Peraturan
            </Link>
            <Link
              href="/pengumuman"
              className="block px-3 py-2 text-gray-700 hover:text-primary-600"
              onClick={() => setIsOpen(false)}
            >
              Pengumuman
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
} 