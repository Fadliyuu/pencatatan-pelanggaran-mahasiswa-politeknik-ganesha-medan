import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientLayout from '@/components/Layout/ClientLayout';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Pencatatan Pelanggaran | Politeknik Ganesha Medan',
  description: 'Sistem pencatatan pelanggaran kedisiplinan mahasiswa Politeknik Ganesha Medan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
} 