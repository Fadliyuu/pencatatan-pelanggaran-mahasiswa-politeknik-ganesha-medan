"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Menu, Bell, User } from "lucide-react";
import Link from "next/link";

interface UserData {
  displayName?: string;
  name?: string;
  email: string;
  photoURL?: string;
}

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserData);
      }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <nav className="bg-white shadow-sm fixed top-0 w-full z-40 lg:pl-64">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden md:flex items-center">
              <img
                src="/images/logo politeknik ganesha medan.png"
                alt="Logo"
                className="h-8 w-auto"
              />
              <span className="ml-2 text-lg font-semibold text-gray-900">
                Sistem Pencatatan Pelanggaran
              </span>
            </div>
          </div>

          <div className="flex items-center">
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <Bell className="h-6 w-6" />
              </button>

            <div className="ml-4 flex items-center md:ml-6">
              <div className="relative">
                <button className="flex items-center max-w-xs rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  {user?.photoURL ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.photoURL}
                      alt=""
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                  )}
                  </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/dosen/dashboard"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <Link
              href="/dosen/pelanggaran"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Pelanggaran
            </Link>
            <Link
              href="/dosen/pengumuman"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Pengumuman
            </Link>
            <Link
              href="/dosen/kalender"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Kalender
            </Link>
            <Link
              href="/dosen/peraturan"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Peraturan
            </Link>
            <Link
              href="/dosen/profil"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Profil
            </Link>
            <Link
              href="/dosen/pengaturan"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              Pengaturan
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
} 