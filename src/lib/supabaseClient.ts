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

export interface SatelliteSchool {
  id: string;
  nama: string;
  npsn?: string | null;
  kota_kabupaten?: string | null;
  provinsi?: string | null;
  vercel_url?: string | null;
  supabase_url?: string | null;
  supabase_anon_key?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// In-memory fallback context for Server-Side / Node / Test environments
let serverTenantContext: TenantContext = {};
let serverActiveTargetSchool: SatelliteSchool | null = null;

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
 * Helper to explicitly set in-memory active target school in test / server environments.
 */
export function setServerActiveTargetSchool(school: SatelliteSchool | null): void {
  serverActiveTargetSchool = school;
}

/**
 * Sets the active target school for Superadmin scope switching.
 * Stored in browser localStorage and dispatches a 'sipjam_target_school_changed' CustomEvent.
 */
export function setActiveTargetSchool(school: SatelliteSchool | null): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      if (school) {
        localStorage.setItem('sipjam_active_target_school', JSON.stringify(school));
      } else {
        localStorage.removeItem('sipjam_active_target_school');
      }
      window.dispatchEvent(new CustomEvent('sipjam_target_school_changed', { detail: school }));
    } catch (e) {
      console.warn('[supabaseClient] Failed to persist sipjam_active_target_school:', e);
    }
  } else {
    serverActiveTargetSchool = school;
  }
}

/**
 * Retrieves the currently active target school.
 * Enforces strict RBAC: only Superadmin is authorized to use an active target scope.
 * For local Admin or Guru roles, this unconditionally returns null to preserve data isolation.
 */
export function getActiveTargetSchool(): SatelliteSchool | null {
  const tenant = getActiveTenantContext();
  const roleNorm = (tenant.role || '').toLowerCase().replace(/\s+/g, '');
  if (roleNorm !== 'superadmin') {
    return null;
  }

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('sipjam_active_target_school');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[supabaseClient] Failed to parse sipjam_active_target_school:', e);
    }
    return null;
  }

  return serverActiveTargetSchool;
}

/**
 * Clears the active target school and returns client scope to Master/Global.
 */
export function clearActiveTargetSchool(): void {
  setActiveTargetSchool(null);
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
    return { sekolahId: null, role: null, userId: null, sessionToken: null };
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
 * Normalizes a Supabase project URL by trimming whitespace, stripping trailing slashes,
 * and ensuring an absolute 'https://' protocol if missing.
 */
export function normalizeSupabaseUrl(url?: string | null): string {
  if (!url || !url.trim()) return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

/**
 * Subscribes to active target school changes across the current tab and other browser tabs.
 * Returns an unsubscription cleanup function.
 */
export function onActiveTargetSchoolChange(callback: (school: SatelliteSchool | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: any) => {
    callback(e.detail || null);
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'sipjam_active_target_school') {
      try {
        const parsed = e.newValue ? JSON.parse(e.newValue) : null;
        callback(parsed);
      } catch (_) {
        callback(null);
      }
    }
  };

  window.addEventListener('sipjam_target_school_changed', handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener('sipjam_target_school_changed', handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * Custom fetch wrapper that intercepts every outgoing PostgREST / Storage / RPC request
 * and dynamically injects `x-sekolah-id`, `x-user-role`, `x-user-id`, and `x-session-token` headers according to the active
 * user session or context.
 *
 * When Superadmin switches to a satellite target school (`activeTargetSchool`), this fetcher
 * dynamically routes requests to the target Supabase instance URL and injects the target anon key
 * seamlessly without requiring user re-authentication.
 *
 * Requests targeting the central school registry (`sekolah_registry`) or login RPCs are protected
 * and always execute against the central Master Supabase instance.
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
  const targetSchool = getActiveTargetSchool();

  // If Superadmin has an active satellite school scope, prioritize target school ID
  const effectiveSekolahId = targetSchool?.id ? String(targetSchool.id).trim() : sekolahId;

  // Inject headers only if not already explicitly provided by the caller
  if (effectiveSekolahId && !headers.has('x-sekolah-id')) {
    headers.set('x-sekolah-id', effectiveSekolahId);
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

  const requestUrlStr = typeof input === 'string'
    ? input
    : (typeof Request !== 'undefined' && input instanceof Request)
      ? input.url
      : (typeof URL !== 'undefined' && input instanceof URL)
        ? input.href
        : '';

  // Central tables and RPCs that must NEVER be rewritten to satellite instances
  const isMasterOnlyRequest =
    requestUrlStr.includes('/rest/v1/sekolah_registry') ||
    requestUrlStr.includes('/rest/v1/rpc/verify_login') ||
    headers.get('x-target-scope') === 'master';

  let effectiveInput = input;
  // If target school specifies an external Supabase instance URL & key, route requests dynamically
  // (unless this is a master-only central registry or session query)
  if (!isMasterOnlyRequest && targetSchool?.supabase_url && targetSchool.supabase_url.trim()) {
    const targetBase = normalizeSupabaseUrl(targetSchool.supabase_url);
    const currentBase = normalizeSupabaseUrl(supabaseUrl);

    if (typeof input === 'string') {
      if (input.startsWith(currentBase)) {
        effectiveInput = input.replace(currentBase, targetBase);
      } else if (input.startsWith('/')) {
        effectiveInput = `${targetBase}${input}`;
      } else if (!input.startsWith('http://') && !input.startsWith('https://')) {
        effectiveInput = `${targetBase}/${input.replace(/^\/+/, '')}`;
      }
    } else if (typeof URL !== 'undefined' && input instanceof URL) {
      if (input.href.startsWith(currentBase)) {
        effectiveInput = new URL(input.href.replace(currentBase, targetBase));
      }
    } else if (typeof Request !== 'undefined' && input instanceof Request) {
      if (input.url.startsWith(currentBase)) {
        const rewritten = input.url.replace(currentBase, targetBase);
        effectiveInput = new Request(rewritten, input);
      } else if (input.url.startsWith('/')) {
        effectiveInput = new Request(`${targetBase}${input.url}`, input);
      }
    }

    if (targetSchool.supabase_anon_key && targetSchool.supabase_anon_key.trim()) {
      const anonKey = targetSchool.supabase_anon_key.trim();
      headers.set('apikey', anonKey);
      headers.set('authorization', `Bearer ${anonKey}`);
    }
  }

  // ponytail: native fetch cache: 'no-store' prevents stale cached responses after idle
  const res = await fetch(effectiveInput, {
    ...init,
    cache: 'no-store',
    headers,
  });

  // Invalidate stale browser session if server returns 401 Unauthorized
  // Note: Only invalidate central user session if not in active satellite switch scope
  if (res.status === 401 && typeof window !== 'undefined' && !targetSchool) {
    try {
      localStorage.removeItem('sipjam_user');
      window.dispatchEvent(new Event('sipjam_unauthorized'));
    } catch (_) {}
  }

  return res;
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
 * Central Master Supabase client instance pinned directly to the master portal database.
 * Completely bypasses dynamic satellite rewriting. Essential for central registry operations,
 * session authentication validations, and platform-wide administrative queries.
 */
export const masterSupabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/**
 * Factory helper to instantiate a dedicated Supabase client for a specific satellite school.
 * Useful for checking health status, querying metrics, or isolated operations.
 */
export function getSatelliteSupabaseClient(
  school?: SatelliteSchool | null,
  options?: SupabaseClientOptions<any>
): SupabaseClient {
  const target = school || getActiveTargetSchool();
  const rawTargetUrl = (target?.supabase_url && target.supabase_url.trim()) ? target.supabase_url.trim() : supabaseUrl;
  const targetUrl = normalizeSupabaseUrl(rawTargetUrl) || supabaseUrl;
  const targetKey = (target?.supabase_anon_key && target.supabase_anon_key.trim()) ? target.supabase_anon_key.trim() : supabaseKey;
  const targetSekolahId = target?.id ? String(target.id).trim() : null;

  return createClient(targetUrl, targetKey, {
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

        if (targetSekolahId && !headers.has('x-sekolah-id')) {
          headers.set('x-sekolah-id', targetSekolahId);
        }
        if (!headers.has('x-user-role')) {
          headers.set('x-user-role', 'Superadmin');
        }

        const customFetch = options?.global?.fetch || fetch;
        return customFetch(input, {
          ...init,
          cache: 'no-store',
          headers,
        });
      },
    },
  });
}

/**
 * Helper factory to instantiate an explicitly scoped Supabase client for a specific
 * school (sekolahId), role, userId, and sessionToken. Useful for background workers, tests, or Superadmin
 * school impersonation/maintenance scripts.
 */
export function getTenantSupabaseClient(
  sekolahId?: string | null,
  role?: string | null,
  userIdOrOptions?: string | null | SupabaseClientOptions<any>,
  maybeOptionsOrSessionToken?: SupabaseClientOptions<any> | string | null,
  maybeSessionToken?: string | null
): SupabaseClient {
  let userId: string | null = null;
  let options: SupabaseClientOptions<any> | undefined = undefined;
  let explicitSessionToken: string | null = null;

  if (userIdOrOptions && typeof userIdOrOptions === 'object') {
    options = userIdOrOptions as SupabaseClientOptions<any>;
  } else {
    userId = typeof userIdOrOptions === 'string' ? userIdOrOptions : null;
    if (typeof maybeOptionsOrSessionToken === 'string') {
      explicitSessionToken = maybeOptionsOrSessionToken;
      options = undefined;
    } else {
      options = maybeOptionsOrSessionToken || undefined;
      explicitSessionToken = maybeSessionToken ?? null;
    }
  }

  if (maybeSessionToken && !explicitSessionToken) {
    explicitSessionToken = maybeSessionToken;
  }

  const sessionToken = explicitSessionToken || serverTenantContext.sessionToken || null;
  const effectiveUserId = userId || serverTenantContext.userId || null;
  const effectiveSekolahId = sekolahId || getActiveTargetSchool()?.id || serverTenantContext.sekolahId || null;
  const effectiveRole = role || serverTenantContext.role || null;

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

        if (effectiveSekolahId && !headers.has('x-sekolah-id')) {
          headers.set('x-sekolah-id', String(effectiveSekolahId).trim());
        }
        if (effectiveRole && !headers.has('x-user-role')) {
          headers.set('x-user-role', String(effectiveRole).trim());
        }
        if (effectiveUserId && !headers.has('x-user-id')) {
          headers.set('x-user-id', String(effectiveUserId).trim());
        }
        if (sessionToken && !headers.has('x-session-token')) {
          headers.set('x-session-token', String(sessionToken).trim());
        }

        const customFetch = options?.global?.fetch || fetch;
        return customFetch(input, {
          ...init,
          cache: 'no-store',
          headers,
        });
      },
    },
  });
}

// Quick connectivity test on module load (client-side only, once per session)
let _connectivityChecked = false;
if (typeof window !== 'undefined' && !_connectivityChecked) {
  _connectivityChecked = true;
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

