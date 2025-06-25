"use client";

import { useState, useEffect } from 'react';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Lock, Mail, Bell, Shield, User, Key, AlertCircle } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

export default function DosenPengaturan() {
  const [activeTab, setActiveTab] = useState('akun');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: false,
    violationNotifications: false,
    systemNotifications: false
  });

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setNotificationSettings({
              emailNotifications: data.emailNotifications || false,
              violationNotifications: data.violationNotifications || false,
              systemNotifications: data.systemNotifications || false
            });
          }
        }
      } catch (error) {
        console.error('Error fetching notification settings:', error);
        toast.error('Gagal mengambil pengaturan notifikasi');
      }
    };

    fetchNotificationSettings();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Password baru tidak cocok' });
      setIsLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password baru minimal 6 karakter' });
      setIsLoading(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const credential = EmailAuthProvider.credential(
          user.email!,
          passwordData.currentPassword
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordData.newPassword);
        
        toast.success('Password berhasil diperbarui');
        setMessage({ type: 'success', text: 'Password berhasil diperbarui' });
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error: any) {
      const errorMessage = error.code === 'auth/wrong-password' 
        ? 'Password saat ini salah' 
        : error.message;
      setMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const user = auth.currentUser;
      if (user) {
        const credential = EmailAuthProvider.credential(
          user.email!,
          emailData.password
        );
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, emailData.newEmail);
        await updateDoc(doc(db, 'users', user.uid), {
          email: emailData.newEmail
        });

        toast.success('Email berhasil diperbarui');
        setMessage({ type: 'success', text: 'Email berhasil diperbarui' });
        setEmailData({
          newEmail: '',
          password: ''
        });
      }
    } catch (error: any) {
      const errorMessage = error.code === 'auth/wrong-password' 
        ? 'Password saat ini salah' 
        : error.message;
      setMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = async (setting: string, value: boolean) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          [setting]: value
        });
        setNotificationSettings(prev => ({
          ...prev,
          [setting]: value
        }));
        toast.success('Pengaturan notifikasi berhasil diperbarui');
      }
    } catch (error: any) {
      toast.error('Gagal memperbarui pengaturan notifikasi');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>Pengaturan Akun Dosen</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('akun')}
              className={`${
                activeTab === 'akun'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Shield className="w-5 h-5" />
              <span>Akun</span>
            </button>
            <button
              onClick={() => setActiveTab('notifikasi')}
              className={`${
                activeTab === 'notifikasi'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <Bell className="w-5 h-5" />
              <span>Notifikasi</span>
            </button>
          </nav>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`p-4 mx-6 mt-4 rounded-lg flex items-center space-x-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <Shield className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {activeTab === 'akun' && (
            <div className="space-y-8">
              {/* Change Password */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Key className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Ubah Password</h2>
                    <p className="text-sm text-gray-500">Perbarui password akun Anda</p>
                  </div>
                </div>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password Saat Ini
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password Baru
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Konfirmasi Password Baru
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        <span>Ubah Password</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Change Email */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <Mail className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Ubah Email</h2>
                    <p className="text-sm text-gray-500">Perbarui alamat email Anda</p>
                  </div>
                </div>
                <form onSubmit={handleEmailChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Email Baru
                    </label>
                    <input
                      type="email"
                      value={emailData.newEmail}
                      onChange={(e) =>
                        setEmailData({ ...emailData, newEmail: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Password Saat Ini
                    </label>
                    <input
                      type="password"
                      value={emailData.password}
                      onChange={(e) =>
                        setEmailData({ ...emailData, password: e.target.value })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        <span>Ubah Email</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'notifikasi' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Mail className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Notifikasi Email</h3>
                      <p className="text-sm text-gray-500">
                        Terima notifikasi melalui email
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Bell className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Notifikasi Pelanggaran</h3>
                      <p className="text-sm text-gray-500">
                        Terima notifikasi ketika ada pelanggaran baru
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={notificationSettings.violationNotifications}
                      onChange={(e) => handleNotificationChange('violationNotifications', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary-50 rounded-lg">
                      <Shield className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Notifikasi Sistem</h3>
                      <p className="text-sm text-gray-500">
                        Terima notifikasi tentang pembaruan sistem
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={notificationSettings.systemNotifications}
                      onChange={(e) => handleNotificationChange('systemNotifications', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 