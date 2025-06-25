import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadImage = async (file: File): Promise<string> => {
  try {
    const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Gagal mengupload gambar');
  }
}; 