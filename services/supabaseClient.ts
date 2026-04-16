import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in different build environments
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
       // @ts-ignore
       return import.meta.env[`VITE_${key}`] || import.meta.env[key];
    }
  } catch (e) {
    return '';
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_KEY');

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey && supabaseUrl !== 'undefined';

if (!isSupabaseConfigured) {
  console.warn("Supabase URL or Key is missing. App will run in Mock/Demo mode.");
}

// Initialize with safe placeholders to prevent crash
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);