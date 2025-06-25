import { db, storage } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Tipe data untuk parameter pagination
interface PaginationParams {
  lastDoc?: QueryDocumentSnapshot<DocumentData>;
  pageSize?: number;
}

// Fungsi untuk mengambil data dengan pagination
export async function getPaginatedData(
  collectionName: string,
  { lastDoc, pageSize = 10 }: PaginationParams = {}
) {
  try {
    let q = query(
      collection(db, collectionName),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      data,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
      hasMore: snapshot.docs.length === pageSize,
    };
  } catch (error) {
    console.error('Error getting paginated data:', error);
    throw error;
  }
}

// Fungsi untuk mengambil data berdasarkan ID
export async function getDataById(collectionName: string, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting data by id:', error);
    throw error;
  }
}

// Fungsi untuk menambah data
export async function addData(collectionName: string, data: any) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding data:', error);
    throw error;
  }
}

// Fungsi untuk mengupdate data
export async function updateData(collectionName: string, id: string, data: any) {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
}

// Fungsi untuk menghapus data
export async function deleteData(collectionName: string, id: string) {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}

// Fungsi untuk upload file
export async function uploadFile(file: File, path: string) {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Fungsi untuk mengambil data berdasarkan query
export async function getDataByQuery(
  collectionName: string,
  field: string,
  operator: any,
  value: any
) {
  try {
    const q = query(
      collection(db, collectionName),
      where(field, operator, value)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting data by query:', error);
    throw error;
  }
} 