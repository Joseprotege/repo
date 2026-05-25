import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Foster] Supabase environment variables are not set.\n' +
    'Copy .env.example to .env.local and fill in your project credentials.\n' +
    'The app will run in mock-data mode until then.'
  );
}

// We use an untyped client here because the Database generic requires
// auto-generated types (npx supabase gen types typescript) to work correctly.
// Each service file casts query results to the hand-written types in database.types.ts.
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder'
);
