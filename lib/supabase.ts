import { createClient } from '@supabase/supabase-js';

// Sécurisation de l'accès aux variables d'environnement.
const env = (import.meta as any).env || {};

// Valeurs par défaut (Credentials fournis)
// Ces valeurs sont utilisées si le fichier .env n'est pas détecté.
const DEFAULT_SUPABASE_URL = 'https://kmmtqwawpfowytwskotl.supabase.co';
// Note: La clé fournie 'sb_publishable_...' semble avoir un format inhabituel pour une clé anon Supabase (généralement JWT 'eyJ...').
// Si vous rencontrez une erreur 401, vérifiez que c'est bien la clé 'anon' / 'public' de votre projet Supabase.
const DEFAULT_SUPABASE_KEY = 'sb_publishable_9F9C7KaEwV7VJrZSz5Tcww_OWfN2ZXt';

const supabaseUrl = env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

export const isSupabaseConfigured = () => {
    return supabaseUrl.length > 0 && supabaseAnonKey.length > 0 && supabaseUrl !== 'https://placeholder.supabase.co';
};

// Initialisation du client Supabase
// On utilise les valeurs réelles pour éviter l'erreur "Failed to fetch" sur le placeholder
const clientUrl = supabaseUrl || 'https://placeholder.supabase.co';
const clientKey = supabaseAnonKey || 'placeholder';

export const supabase = createClient(clientUrl, clientKey);