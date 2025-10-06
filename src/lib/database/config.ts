// src/lib/database/config.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Проверяем, настроен ли Supabase
export const isSupabaseConfigured = supabaseUrl && supabaseKey && 
  supabaseUrl !== 'your_supabase_url' && 
  supabaseKey !== 'your_supabase_anon_key' &&
  supabaseUrl.startsWith('http');

// Создаем клиент только если Supabase настроен
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

export const isProduction = process.env.NODE_ENV === 'production';
