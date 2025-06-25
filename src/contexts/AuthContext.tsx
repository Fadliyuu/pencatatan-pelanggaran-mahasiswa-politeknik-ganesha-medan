"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  UserCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmailAndPassword: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmailAndPassword: async () => {
    throw new Error('AuthContext not initialized');
  },
  signOut: async () => {},
});

// Cache untuk menyimpan state auth
let authStateCache: {
  user: User | null;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Cek cache saat inisialisasi
    if (authStateCache && Date.now() - authStateCache.timestamp < CACHE_DURATION) {
      return authStateCache.user;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (mounted) {
        setUser(user);
        // Update cache
        authStateCache = {
          user,
          timestamp: Date.now()
        };
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Update cache setelah login berhasil
      authStateCache = {
        user: userCredential.user,
        timestamp: Date.now()
      };
      return userCredential;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      // Clear cache setelah logout
      authStateCache = null;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signInWithEmailAndPassword: signIn,
    signOut,
  }), [user, loading, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 