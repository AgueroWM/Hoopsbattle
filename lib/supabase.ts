import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};

const DEFAULT_SUPABASE_URL = 'https://kmmtqwawpfowytwskotl.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_9F9C7KaEwV7VJrZSz5Tcww_OWfN2ZXt';

const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

export const isSupabaseConfigured = () => {
    return !!(supabaseUrl && supabaseAnonKey);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);