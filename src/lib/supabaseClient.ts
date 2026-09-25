import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
// Use Service Role key on the server if available to bypass RLS for cron jobs, otherwise fallback to Anon key
const supabaseKey = (typeof process !== 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY) ? process.env.SUPABASE_SERVICE_ROLE_KEY : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[supabaseClient] MISSING ENV VARS! Falling back to placeholder client.',
    'NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
  );
}

export interface TenantContext {
  sessionToken?: string | null;
  sekolahId?: string | null;
  role?: string | null;
  userId?: string | null;
}

// In-memory fallback context for Server-Side / Node / Test environments
let serverTenantContext: TenantContext = {};

/**
 * Explicitly sets the tenant context for Node.js / Server-side / Test execution.
 */
export function setServerTenantContext(context: TenantContext): void {
  serverTenantContext = { ...context };
}

/**
 * Clears the server-side tenant context.
 */
export function clearServerTenantContext(): void {
  serverTenantContext = {};
}

/**
 * Retrieves the currently active tenant context from localStorage (browser)
 * or in-memory server context / process environment (Node/SSR).
 */
export function getActiveTenantContext(): TenantContext {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const rawUser = localStorage.getItem('sipjam_user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        return {
          sekolahId: user?.sekolah_id ? String(user.sekolah_id).trim() : null,
          role: user?.role ? String(user.role).trim() : null,
          userId: user?.id ? String(user.id).trim() : null,
          sessionToken: user?.session_token ? String(user.session_token).trim() : null,
        };
      }
    } catch (e) {
      console.warn('[supabaseClient] Failed to parse sipjam_user from localStorage:', e);
    }
    return { sekolahId: null, role: null, userId: null };
  }

  return {
    sekolahId:
      serverTenantContext.sekolahId ??
      (typeof process !== 'undefined' ? process.env.DEFAULT_SEKOLAH_ID ?? null : null),
    role:
      serverTenantContext.role ??
      (typeof process !== 'undefined' ? process.env.DEFAULT_USER_ROLE ?? null : null),
    sessionToken: serverTenantContext.sessionToken ?? null,
    userId:
      serverTenantContext.userId ??
      (typeof process !== 'undefined' ? process.env.DEFAULT_USER_ID ?? null : null),
  };
}

/**
 * Custom fetch wrapper that intercepts every outgoing PostgREST / Storage / RPC request
 * and dynamically injects `x-sekolah-id`, `x-user-role`, and `x-user-id` headers according to the active
 * user session or context.
 */
export const dynamicTenantFetch: typeof fetch = async (input, init) => {
  // Initialize Headers from existing Request object or init.headers
  const headers = new Headers(
    typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined
  );

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const { sekolahId, role, userId, sessionToken } = getActiveTenantContext();

  // Inject headers only if not already explicitly provided by the caller
  if (sekolahId && !headers.has('x-sekolah-id')) {
    headers.set('x-sekolah-id', sekolahId);
  }
  if (role && !headers.has('x-user-role')) {
    headers.set('x-user-role', role);
  }
  if (userId && !headers.has('x-user-id')) {
    headers.set('x-user-id', userId);
  }
  if (sessionToken && !headers.has('x-session-token')) {
    headers.set('x-session-token', sessionToken);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

/**
 * Universal default Supabase client instance with dynamic tenant header injection.
 * Seamlessly used across all 20+ frontend components.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: dynamicTenantFetch,
  },
});

/**
 * Helper factory to instantiate an explicitly scoped Supabase client for a specific
 * school (sekolahId), role, and userId. Useful for background workers, tests, or Superadmin
 * school impersonation/maintenance scripts.
 */
export function getTenantSupabaseClient(
  sekolahId?: string | null,
  role?: string | null,
  userIdOrOptions?: string | null | SupabaseClientOptions<any>,
  maybeOptions?: SupabaseClientOptions<any>
): SupabaseClient {
  let userId: string | null = null;
  let options: SupabaseClientOptions<any> | undefined = undefined;

  if (userIdOrOptions && typeof userIdOrOptions === 'object') {
    options = userIdOrOptions as SupabaseClientOptions<any>;
  } else {
    userId = typeof userIdOrOptions === 'string' ? userIdOrOptions : null;
    options = maybeOptions;
  }

  return createClient(supabaseUrl, supabaseKey, {
    ...options,
    global: {
      ...options?.global,
      fetch: async (input, init) => {
        const headers = new Headers(
          typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined
        );

        if (init?.headers) {
          new Headers(init.headers).forEach((value, key) => {
            headers.set(key, value);
          });
        }

        if (sekolahId && !headers.has('x-sekolah-id')) {
          headers.set('x-sekolah-id', String(sekolahId).trim());
        }
        if (role && !headers.has('x-user-role')) {
          headers.set('x-user-role', String(role).trim());
        }
        if (userId && !headers.has('x-user-id')) {
          headers.set('x-user-id', String(userId).trim());
        }
        if (sessionToken && !headers.has('x-session-token')) {
          headers.set('x-session-token', String(sessionToken).trim());
        }

        const customFetch = options?.global?.fetch || fetch;
        return customFetch(input, {
          ...init,
          headers,
        });
      },
    },
  });
}

// Quick connectivity test on module load (client-side only)
if (typeof window !== 'undefined') {
  supabase
    .from('sekolah')
    .select('id')
    .limit(1)
    .then(({ error }) => {
      if (error && error.code !== 'PGRST116') {
        console.error('[supabaseClient] Connectivity test note:', error.message);
      } else {
        console.log('[supabaseClient] Supabase is reachable.');
      }
    });
}
