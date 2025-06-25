"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Bell, 
  User, 
  FileText,
  LogOut,
  Calendar,
  BookOpen,
  AlertTriangle,
  MessageSquare,
  Menu,
  X,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Users,
  Megaphone
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, Timestamp, writeBatch, doc, updateDoc, getDoc } from "firebase/firestore";
import { addNotifikasi } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";

type Notifikasi = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  time: string;
  type: string;
  userId: string;
  [key: string]: any;
};

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard
  },
  {
    title: "Mahasiswa",
    href: "/admin/mahasiswa",
    icon: Users
  },
  {
    title: "Pelanggaran",
    href: "/admin/pelanggaran",
    icon: AlertTriangle
  },
  {
    title: "Peraturan",
    href: "/admin/peraturan",
    icon: BookOpen
  },
  {
    title: "Pengumuman",
    href: "/admin/pengumuman",
    icon: Megaphone
  },
  {
    title: "Laporan",
    href: "/admin/laporan",
    icon: FileText
  },
  {
    title: "Kalender",
    href: "/admin/kalender",
    icon: Calendar
  },
  {
    title: "Profil",
    href: "/admin/profil",
    icon: User
  },
  {
    title: "Pengguna",
    href: "/admin/pengguna",
    icon: Users
  },
  {
    title: "Pengaturan",
    href: "/admin/settings",
    icon: Settings
  }
];

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [notifications, setNotifications] = useState<Notifikasi[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const authChecked = useRef(false);
  const dataFetched = useRef(false);
  const notificationListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (authChecked.current || !user?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (!userData || userData.role !== 'admin') {
          throw new Error('Akses ditolak');
        }

        setIsAdmin(true);
        authChecked.current = true;
        dataFetched.current = true;
      } catch (error) {
        console.error('Error checking admin role:', error);
        toast.error('Akses ditolak');
        await signOut();
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminRole();
  }, [user?.uid, router, signOut]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial check
    }
    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Hapus logika penutupan otomatis
      return;
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    // Hapus listener sebelumnya jika ada
    if (notificationListenerRef.current) {
      notificationListenerRef.current();
      notificationListenerRef.current = null;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          message: data.message,
          isRead: data.isRead || false,
          createdAt: data.createdAt,
          time: formatTimeAgo(data.createdAt.toDate()),
          type: data.type || 'info',
          userId: data.userId
        };
      });
            
      setNotifications(notifications);
    }, (error) => {
      console.error('Error listening to notifications:', error);
    });
      
    // Simpan fungsi unsubscribe ke ref
    notificationListenerRef.current = unsubscribe;
      
    return () => {
      if (notificationListenerRef.current) {
        notificationListenerRef.current();
        notificationListenerRef.current = null;
      }
    };
  }, [user]);

  // Fungsi untuk memformat waktu
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} hari yang lalu`;
    if (hours > 0) return `${hours} jam yang lalu`;
    if (minutes > 0) return `${minutes} menit yang lalu`;
    return 'Baru saja';
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Berhasil keluar');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Gagal keluar');
    }
  };

  const NotificationButton = () => (
    <div className="relative" ref={notificationRef}>
      <button 
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      {showNotifications && (
        <div className="fixed inset-0 z-50">
          <div className="absolute right-4 top-16 z-50">
            <NotificationDropdown />
          </div>
        </div>
      )}
    </div>
  );

  const ProfileButton = () => (
    <div className="relative" ref={profileRef}>
      <button
        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
        className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
      >
        <div className="relative w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Profile" 
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.onerror = null;
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <User size={20} className="text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {user?.displayName || "Admin"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user?.email || ""}
          </span>
        </div>
        <ChevronDown size={16} className="text-gray-500" />
      </button>
      {showProfileDropdown && (
        <div className="fixed inset-0 z-50">
          <div className="absolute right-4 top-16 z-50">
            <ProfileDropdown />
          </div>
        </div>
      )}
    </div>
  );

  const NotificationDropdown = () => (
    <div 
      className="w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Notifikasi</h3>
          <button
            onClick={() => setShowNotifications(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {notifications.filter(n => !n.isRead).length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const batch = writeBatch(db);
                  notifications.forEach(notif => {
                    if (!notif.isRead) {
                      const notifRef = doc(db, "notifications", notif.id);
                      batch.update(notifRef, { isRead: true });
                    }
                  });
                  batch.commit().then(() => {
                    toast.success('Semua notifikasi ditandai sudah dibaca');
                  }).catch(error => {
                    console.error('Error menandai notifikasi:', error);
                    toast.error('Gagal menandai notifikasi');
                  });
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Tandai sudah dibaca
              </button>
            )}
            {Notification.permission !== "granted" && (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof window !== "undefined" && "Notification" in window) {
                    Notification.requestPermission().then(permission => {
                      if (permission === "granted") {
                        new Notification("Notifikasi Diaktifkan", {
                          body: "Anda akan menerima notifikasi untuk pembaruan penting",
                          icon: '/icon.png'
                        });
                        toast.success("Izin notifikasi diaktifkan!");
                      } else {
                        toast.error("Izin notifikasi ditolak!");
                      }
                    });
                  }
                }} 
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Aktifkan Notifikasi
              </button>
            )}
          </div>
        </div>
        {notifications.length > 0 ? (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg ${!notif.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notif.message}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">{notif.time}</span>
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const notifRef = doc(db, "notifications", notif.id);
                        updateDoc(notifRef, { isRead: true })
                          .then(() => {
                            toast.success('Notifikasi ditandai sudah dibaca');
                          })
                          .catch(error => {
                            console.error('Error menandai notifikasi:', error);
                            toast.error('Gagal menandai notifikasi');
                          });
                      }}
                      className="ml-2 p-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada notifikasi</p>
          </div>
        )}
      </div>
    </div>
  );

  const ProfileDropdown = () => (
    <div 
      className="w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Profil</h3>
          <button
            onClick={() => setShowProfileDropdown(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.onerror = null;
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <User size={24} className="text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.displayName || "Admin"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email || ""}
            </p>
          </div>
        </div>
      </div>
      <div className="p-2">
        <Link
          href="/admin/settings"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = '/admin/settings';
          }}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <Settings size={16} />
          <span>Pengaturan</span>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleLogout();
          }}
          className="flex items-center gap-2 w-full px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  if (!authChecked.current || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar - Desktop Only */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <img 
                  src="/images/logo politeknik ganesha medan.png" 
                  alt="Logo" 
                  className="w-8 h-8 flex-shrink-0"
                />
                <span className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                  Portal Admin<br/>Politeknik Ganesha Medan
                </span>
              </Link>
            </div>

            {/* Menu */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400" 
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:ml-64 pb-20 lg:pb-0">
          {/* Mobile Header */}
          <header className="lg:hidden sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-4">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <img 
                  src="/images/logo politeknik ganesha medan.png" 
                  alt="Logo" 
                  className="w-8 h-8"
                />
                <span className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
                  Portal Admin<br/>Politeknik Ganesha Medan
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <NotificationButton />
                <div className="relative" ref={profileRef}>
                  <ProfileButton />
                </div>
              </div>
            </div>
          </header>

          {/* Desktop Header */}
          <header className="hidden lg:block sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
                {menuItems.find(item => item.href === pathname)?.title || 'Dashboard'}
              </h1>
              <div className="flex items-center gap-4">
                <NotificationButton />
                <div className="relative" ref={profileRef}>
                  <ProfileButton />
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700" style={{ transform: 'translateZ(0)' }}>
            <div className="relative">
              {/* Scroll Buttons */}
              {showLeftArrow && (
                <button
                  onClick={scrollLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 p-2 rounded-r-lg shadow-md"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {showRightArrow && (
                <button
                  onClick={scrollRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 p-2 rounded-l-lg shadow-md"
                >
                  <ChevronRight size={20} />
                </button>
              )}
              
              {/* Scrollable Menu */}
              <div 
                ref={scrollContainerRef}
                className="flex items-center overflow-x-auto scrollbar-hide px-4 py-2"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex flex-col items-center justify-center min-w-[80px] p-2 rounded-lg transition-colors ${
                        isActive 
                          ? "text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20" 
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <item.icon size={24} />
                      <span className="text-xs mt-1 text-center">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </main>
      </div>
    </SettingsProvider>
  );
}

export default AdminLayoutContent; 