import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and Service Role Key must be provided in .env file');
}

// Create client with proper config
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-node'
    }
  }
});

export const SUPABASE_BUCKET = 'certificates';

// Test connection on start
const testConnection = async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('[ERROR] Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('[SUCCESS] Supabase connected');
  
    return true;
  } catch (err) {
    console.error('[ERROR] Supabase connection error:', err.message);
    return false;
  }
};


testConnection();