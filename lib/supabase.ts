// Developed by KBP (King of Best Practice)
import { createClient } from '@supabase/supabase-js';

// On utilise import.meta.env pour Vite, avec fallback sur process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Validation de la configuration
export const isSupabaseConfigured = () => {
    return supabaseUrl.length > 0 && supabaseAnonKey.length > 0 && supabaseUrl !== 'https://placeholder.supabase.co';
};

// Client Supabase
// IMPORTANT: On fournit des valeurs par défaut pour éviter que createClient ne crash l'app
// si les variables d'environnement sont manquantes. isSupabaseConfigured() protège les appels.
const clientUrl = supabaseUrl || 'https://placeholder.supabase.co';
const clientKey = supabaseAnonKey || 'placeholder-key';

export const supabase = createClient(clientUrl, clientKey);