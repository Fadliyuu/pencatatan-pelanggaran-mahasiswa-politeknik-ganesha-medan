import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Credentials missing:', { email: !!credentials?.email, password: !!credentials?.password });
          throw new Error('Email dan password harus diisi');
        }

        try {
          console.log('Attempting login for:', credentials.email);
          
          // Cari user berdasarkan email
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', credentials.email));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            console.log('User not found:', credentials.email);
            throw new Error('Email tidak ditemukan');
          }

          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();

          console.log('User found:', {
            id: userDoc.id,
            email: userData.email,
            hasPassword: !!userData.password
          });

          if (!userData.password) {
            console.log('Password field missing in user data');
            throw new Error('Data user tidak valid');
          }

          // Verifikasi password
          try {
            const isValid = await compare(credentials.password, userData.password);
            console.log('Password validation result:', isValid);

            if (!isValid) {
              throw new Error('Password salah');
            }
          } catch (error) {
            console.error('Password comparison error:', error);
            throw new Error('Gagal memverifikasi password');
          }

          return {
            id: userDoc.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          };
        } catch (error: any) {
          console.error('Auth error:', error);
          if (error.code === 'permission-denied') {
            throw new Error('Akses ditolak. Silakan hubungi administrator.');
          }
          throw new Error(error.message || 'Terjadi kesalahan saat login');
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export const GET = handler;
export const POST = handler; 