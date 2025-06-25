import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'dosen' | 'mahasiswa';
    } & DefaultSession['user'];
  }

  interface User {
    role: 'admin' | 'dosen' | 'mahasiswa';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'admin' | 'dosen' | 'mahasiswa';
  }
} 