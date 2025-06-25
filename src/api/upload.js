const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');

// Konfigurasi server Express
const app = express();
app.use(cors());

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Konfigurasi Multer untuk penyimpanan memori
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // batas 5MB
  }
});

// Endpoint untuk upload gambar
app.post('/api/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }

    // Convert buffer to base64
    const fileStr = req.file.buffer.toString('base64');
    const fileType = req.file.mimetype;
    
    // Upload ke Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(
      `data:${fileType};base64,${fileStr}`,
      {
        upload_preset: 'pelanggaran_mahasiswa',
        folder: 'pelanggaran'
      }
    );

    res.status(200).json({ 
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Gagal mengunggah gambar', details: error.message });
  }
});

// Endpoint untuk menghapus gambar
app.delete('/api/delete-image', async (req, res) => {
  try {
    const { public_id } = req.body;
    
    if (!public_id) {
      return res.status(400).json({ error: 'Public ID diperlukan' });
    }
    
    const result = await cloudinary.uploader.destroy(public_id);
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Gagal menghapus gambar', details: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});

module.exports = app; 