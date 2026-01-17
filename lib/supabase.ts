// Developed by KBP (King of Best Practice)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validation de la configuration
export const isSupabaseConfigured = () => {
    return supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
};

// Client Supabase
const clientUrl = supabaseUrl;
const clientKey = supabaseAnonKey;

export const supabase = createClient(clientUrl, clientKey);