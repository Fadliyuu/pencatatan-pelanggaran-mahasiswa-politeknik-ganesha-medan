/**
 * Fungsi untuk mengupload gambar ke Cloudinary
 */
export async function uploadToCloudinary(formData: FormData) {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

/**
 * Fungsi untuk menghapus gambar dari Cloudinary
 */
export async function deleteImage(publicId: string) {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          timestamp: Math.round(new Date().getTime() / 1000),
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Delete failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

/**
 * Ekstrak public_id dari URL Cloudinary
 */
export function getPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    // Format URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/filename.jpg
    const match = url.match(/\/v\d+\/([^/]+)\/?([^/]+)?$/);
    if (match && match[1]) {
      // Jika ada folder
      if (match[2]) {
        return `${match[1]}/${match[2].split('.')[0]}`;
      }
      // Jika tidak ada folder
      return match[1].split('.')[0];
    }
    return null;
  } catch (error) {
    console.error('Error extracting public_id:', error);
    return null;
  }
} 