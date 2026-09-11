import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[supabaseClient] MISSING ENV VARS!',
    'NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'MISSING'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Quick connectivity test on module load (client-side only)
if (typeof window !== 'undefined') {
  supabase.from('pengaturan').select('key').limit(1).then(({ data, error }) => {
    if (error) {
      console.error('[supabaseClient] Connectivity test FAILED:', error.message);
    } else {
      console.log('[supabaseClient] Connectivity test OK. Supabase is reachable.');
    }
  });
}
