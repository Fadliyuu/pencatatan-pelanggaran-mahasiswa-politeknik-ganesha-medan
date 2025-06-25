import { LayoutDashboard, Users, AlertTriangle, BookOpen, Megaphone, FileText, Calendar, User, Settings } from "lucide-react";

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
    title: "Pengaturan",
    href: "/admin/settings",
    icon: Settings
  }
]; 