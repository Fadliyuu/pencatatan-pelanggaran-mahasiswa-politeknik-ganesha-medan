export type Role = 'admin' | 'dosen' | 'mahasiswa';

export interface User {
  uid: string;
  email: string;
  role: Role;
  name?: string;
  photoURL?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
} 