import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Validasi environment variables
const requiredEnvVars = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
};

// Cek apakah semua environment variables sudah terisi
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

const firebaseAdminConfig = {
  credential: cert({
    projectId: "sample-firebase-ai-app-f370e",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

// Initialize Firebase Admin
const app = getApps().length === 0 ? initializeApp(firebaseAdminConfig) : getApps()[0];
const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export { app, adminDb, adminAuth };

/**
 * Verifikasi ID token dan dapatkan user data
 */
export async function verifyIdToken(token: string) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    throw new Error('Invalid auth token');
  }
}

/**
 * Get data user dari Firestore berdasarkan uid
 */
export async function getUserData(uid: string) {
  try {
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return null;
    }
    
    return {
      uid,
      ...userDoc.data(),
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
} 