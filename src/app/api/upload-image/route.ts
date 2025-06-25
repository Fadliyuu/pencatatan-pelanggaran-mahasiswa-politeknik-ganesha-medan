import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Tidak ada file yang diunggah' },
        { status: 400 }
      );
    }

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert buffer to base64
    const fileStr = buffer.toString('base64');
    const fileType = file.type;

    // Upload ke Cloudinary
    const uploadResponse = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        `data:${fileType};base64,${fileStr}`,
        {
          upload_preset: 'pelanggaran_mahasiswa',
          folder: 'pelanggaran',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    return NextResponse.json({
      url: (uploadResponse as any).secure_url,
      public_id: (uploadResponse as any).public_id,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json(
      { error: 'Gagal mengunggah gambar', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { public_id } = await request.json();
    
    if (!public_id) {
      return NextResponse.json(
        { error: 'Public ID diperlukan' },
        { status: 400 }
      );
    }
    
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(public_id, (error: any, result: any) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Gagal menghapus gambar', details: (error as Error).message },
      { status: 500 }
    );
  }
} 