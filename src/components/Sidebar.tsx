"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell, Calendar, Settings, FileText, Users, LogOut, LayoutDashboard, AlertTriangle, BookOpen, User, BarChart2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface SidebarProps {
  menuItems: { href: string; icon: React.ElementType; title: string }[];
  pathname: string;
  handleLogout: () => void;
}

export default function Sidebar({ menuItems, pathname, handleLogout }: SidebarProps) {
  const router = useRouter();

  const handleLogoutClick = async () => {
    await auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-50 hidden lg:block border-r border-gray-200 dark:border-gray-700">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dosen/dashboard" className="flex items-center gap-2">
            <img
              src="/images/logo politeknik ganesha medan.png"
              alt="Logo"
              className="w-8 h-8 flex-shrink-0"
            />
            <span className="text-sm font-bold text-gray-800 dark:text-white leading-tight">
              Portal Dosen<br />Politeknik Ganesha Medan
            </span>
          </Link>
        </div>

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

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </aside>
  );
} 