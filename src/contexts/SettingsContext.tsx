"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getMahasiswaByUserId, updateMahasiswaSettings } from '@/lib/firebase';

interface Settings {
  notifikasiRealtime: boolean;
  notifikasiEmail: boolean;
  notifikasiWeb: boolean;
  notifikasiMobile: boolean;
  darkMode: boolean;
  bahasa: string;
  privasi: {
    tampilkanProfil: boolean;
    tampilkanRiwayat: boolean;
  };
}

interface SettingsContextType {
  settings: Settings;
  isLoading: boolean;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  toggleSetting: (key: keyof Settings | "privasi.tampilkanProfil" | "privasi.tampilkanRiwayat") => Promise<void>;
  changeLanguage: (language: string) => Promise<void>;
}

const defaultSettings: Settings = {
  notifikasiRealtime: true,
  notifikasiEmail: true,
  notifikasiWeb: true,
  notifikasiMobile: true,
  darkMode: false,
  bahasa: "id",
  privasi: {
    tampilkanProfil: true,
    tampilkanRiwayat: true,
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.uid) {
        setIsLoading(false);
        return;
      }

      try {
        const mahasiswaData = await getMahasiswaByUserId(user.uid);
        if (mahasiswaData?.settings) {
          setSettings(mahasiswaData.settings as Settings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.uid]);

  // Effect untuk menerapkan mode gelap
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const updatedSettings = { ...settings, ...newSettings };
      await updateMahasiswaSettings(user.uid, updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSetting = async (key: keyof Settings | "privasi.tampilkanProfil" | "privasi.tampilkanRiwayat") => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const newSettings = { ...settings };
      
      if (key.includes("privasi.")) {
        const privasiKey = key.split(".")[1] as keyof Settings["privasi"];
        newSettings.privasi[privasiKey] = !newSettings.privasi[privasiKey];
      } else {
        (newSettings as any)[key] = !(newSettings as any)[key];
      }

      await updateMahasiswaSettings(user.uid, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error("Error toggling setting:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (language: string) => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const newSettings = { ...settings, bahasa: language };
      await updateMahasiswaSettings(user.uid, newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error("Error changing language:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, updateSettings, toggleSetting, changeLanguage }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 