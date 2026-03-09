import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, SUPABASE_BUCKET } from '../config/supabaseConfig.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadToSupabase = async (file, folder = 'certificates') => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    const timestamp = Date.now();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folder}/${timestamp}-${file.originalname}`;

    console.log('Attempting upload:', fileName);

    // Try Supabase first
    try {
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(fileName);

      console.log('Supabase upload successful:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (supabaseError) {
      console.warn('Supabase failed, using local storage');
      console.warn('Reason:', supabaseError.message);

      // FALLBACK: Save locally
      const uploadsDir = path.join(process.cwd(), 'uploads', folder);
      
      // Create directory if doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads directory:', uploadsDir);
      }

      const localFileName = `${timestamp}-${file.originalname}`;
      const localPath = path.join(uploadsDir, localFileName);
      
      // Write file
      fs.writeFileSync(localPath, file.buffer);
      
      console.log('Saved locally:', localPath);

      // Return local URL
      const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
      const localUrl = `${serverUrl}/uploads/${folder}/${localFileName}`;
      
      console.log('Local URL:', localUrl);
      
      return localUrl;
    }

  } catch (error) {
    console.error('Upload failed completely:', error);
    throw error;
  }
};