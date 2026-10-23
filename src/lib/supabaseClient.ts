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
  kotaKabupaten?: string | null;
  kota_kabupaten?: string | null;
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

/**
 * Helper to detect PostgREST schema cache errors or missing table errors (e.g. PGRST205 or undefined_table).
 * Enables graceful fallback to secondary tables (like public.sekolah) when optional or migration-pending tables
 * (like public.sekolah_registry) are not yet loaded in PostgREST schema cache.
 */
export function isSchemaCacheOrMissingTableError(err: any): boolean {
  if (!err) return false;

  // Unwrap nested error property if error was returned as { error: { ... } } or { data: null, error: ... }
  const target = (typeof err === 'object' && err !== null && 'error' in err && err.error && typeof err.error === 'object')
    ? err.error
    : err;

  const rawStr = typeof err === 'string' ? err.toLowerCase() : (typeof target === 'string' ? target.toLowerCase() : '');
  const code = String(target.code || target.status || err.code || err.status || '').trim().toUpperCase();
  const message = String(
    target.message ||
    target.error_description ||
    (typeof target.error === 'string' ? target.error : '') ||
    target.statusText ||
    err.message ||
    err.error_description ||
    (typeof err.error === 'string' ? err.error : '') ||
    err.statusText ||
    rawStr
  ).toLowerCase();
  const details = String(target.details || err.details || '').toLowerCase();
  const hint = String(target.hint || err.hint || '').toLowerCase();

  let jsonStr = '';
  try {
    jsonStr = typeof err === 'object' ? JSON.stringify(err).toLowerCase() : '';
  } catch (_) {}

  const hasSekolahRegistry =
    rawStr.includes('sekolah_registry') ||
    message.includes('sekolah_registry') ||
    details.includes('sekolah_registry') ||
    jsonStr.includes('sekolah_registry');

  const isMissingTableOrRelation =
    hasSekolahRegistry && (
      message.includes('does not exist') ||
      message.includes('not exist') ||
      message.includes('not found') ||
      message.includes('undefined table') ||
      message.includes('undefined_table') ||
      message.includes('could not find the relation') ||
      details.includes('does not exist') ||
      details.includes('not found') ||
      rawStr.includes('does not exist') ||
      rawStr.includes('not found') ||
      jsonStr.includes('does not exist') ||
      jsonStr.includes('not found')
    );

  return (
    code === 'PGRST205' || // PostgREST: Table not found in schema cache
    code === '42P01' ||    // PostgreSQL: undefined_table
    code === 'PGRST200' || // PostgREST: Schema cache relation error
    code === 'PGRST204' || // PostgREST: Column / schema error
    rawStr.includes('pgrst205') ||
    rawStr.includes('could not find the table') ||
    (rawStr.includes('sekolah_registry') && rawStr.includes('schema cache')) ||
    message.includes('could not find the table') ||
    (message.includes('sekolah_registry') && message.includes('schema cache')) ||
    (details.includes('sekolah_registry') && details.includes('schema cache')) ||
    details.includes('could not find the table') ||
    hint.includes('reload schema') ||
    jsonStr.includes('pgrst205') ||
    (jsonStr.includes('could not find the table') && jsonStr.includes('sekolah_registry')) ||
    (jsonStr.includes('sekolah_registry') && jsonStr.includes('schema cache')) ||
    isMissingTableOrRelation
  );
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
 * Sanitizes header string values by removing newlines, carriage returns, tabs, and control characters.
 */
export function sanitizeHeaderValue(val?: string | null): string | null {
  if (val === null || val === undefined) return null;
  const str = String(val).replace(/[\r\n\t\x00-\x1f\x7f]/g, '').trim();
  return str.length > 0 ? str : null;
}

/**
 * Sets the active target school for Superadmin scope switching.
 * Stored in browser localStorage and dispatches a 'sipjam_target_school_changed' CustomEvent.
 * Keeps in-memory context synchronized across both server and client environments.
 */
export function setActiveTargetSchool(school: SatelliteSchool | null): void {
  serverActiveTargetSchool = school;
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
  }
}

/**
 * Retrieves the currently active target school.
 * Enforces strict RBAC:
 * - Superadmin is authorized to use any active target scope.
 * - Role dinas_pendidikan (or dinaspendidikan) is authorized to use target schools
 *   strictly within their assigned kota_kabupaten (trimmed, case-insensitive).
 * - For local Admin or Guru roles, this unconditionally returns null to preserve data isolation.
 */
export function getActiveTargetSchool(): SatelliteSchool | null {
  const tenant = getActiveTenantContext();
  const roleNorm = (tenant.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (roleNorm !== 'superadmin' && roleNorm !== 'dinaspendidikan') {
    return null;
  }

  let school: SatelliteSchool | null = null;
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('sipjam_active_target_school');
      if (raw) {
        school = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[supabaseClient] Failed to parse sipjam_active_target_school:', e);
    }
  } else {
    school = serverActiveTargetSchool;
  }

  if (!school) {
    return null;
  }

  // If role is dinas_pendidikan, enforce that targetSchool.kota_kabupaten matches the user's kota_kabupaten (trimmed, case-insensitive)
  if (roleNorm === 'dinaspendidikan') {
    const userRegion = (tenant.kotaKabupaten || tenant.kota_kabupaten || '').trim().toLowerCase();
    const schoolRegion = (school.kota_kabupaten || '').trim().toLowerCase();
    if (!userRegion || !schoolRegion || userRegion !== schoolRegion) {
      return null;
    }
  }

  return school;
}

/**
 * Clears the active target school and returns client scope to Master/Global.
 * Symmetrically resets both in-memory state and localStorage.
 */
export function clearActiveTargetSchool(): void {
  serverActiveTargetSchool = null;
  setActiveTargetSchool(null);
}

/**
 * Completely purges all client session and active scope states from localStorage and memory on logout.
 */
export function clearAllClientSessionState(): void {
  clearActiveTargetSchool();
  clearServerTenantContext();
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      localStorage.removeItem('sipjam_user');
      localStorage.removeItem('sipjam_active_target_school');
    } catch (_) {}
  }
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
        const userRegion = user?.kota_kabupaten || user?.kotaKabupaten;
        return {
          sekolahId: user?.sekolah_id ? String(user.sekolah_id).trim() : null,
          role: user?.role ? String(user.role).trim() : null,
          userId: user?.id ? String(user.id).trim() : null,
          sessionToken: user?.session_token ? String(user.session_token).trim() : null,
          kotaKabupaten: userRegion ? String(userRegion).trim() : null,
          kota_kabupaten: userRegion ? String(userRegion).trim() : null,
        };
      }
    } catch (e) {
      console.warn('[supabaseClient] Failed to parse sipjam_user from localStorage:', e);
    }
    return { sekolahId: null, role: null, userId: null, sessionToken: null, kotaKabupaten: null, kota_kabupaten: null };
  }

  const rawServerRegion = serverTenantContext.kotaKabupaten || serverTenantContext.kota_kabupaten;
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
    kotaKabupaten:
      rawServerRegion ??
      (typeof process !== 'undefined' ? process.env.DEFAULT_KOTA_KABUPATEN ?? null : null),
    kota_kabupaten:
      rawServerRegion ??
      (typeof process !== 'undefined' ? process.env.DEFAULT_KOTA_KABUPATEN ?? null : null),
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
 * Custom fetch wrapper for masterSupabase that always queries the central master database
 * and dynamically injects the central tenant/session headers (with cache: no-store).
 * Never rewrites to satellite instances, ensuring central registry & session operations work cleanly
 * with PostgreSQL RLS policies.
 */
export const masterFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(
    typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined
  );

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const { sekolahId, role, userId, sessionToken } = getActiveTenantContext();

  const safeSekolahId = sanitizeHeaderValue(sekolahId);
  const safeRole = sanitizeHeaderValue(role);
  const safeUserId = sanitizeHeaderValue(userId);
  const safeSessionToken = sanitizeHeaderValue(sessionToken);

  if (safeSekolahId && !headers.has('x-sekolah-id')) {
    headers.set('x-sekolah-id', safeSekolahId);
  }
  if (safeRole && !headers.has('x-user-role')) {
    headers.set('x-user-role', safeRole);
  }
  if (safeUserId && !headers.has('x-user-id')) {
    headers.set('x-user-id', safeUserId);
  }
  if (safeSessionToken && !headers.has('x-session-token')) {
    headers.set('x-session-token', safeSessionToken);
  }

  if (headers.has('x-target-scope')) {
    headers.delete('x-target-scope');
  }

  const requestUrlStr = typeof input === 'string'
    ? input
    : (typeof Request !== 'undefined' && input instanceof Request)
      ? input.url
      : (typeof URL !== 'undefined' && input instanceof URL)
        ? input.href
        : '';

  // Client-side guard rejecting mutating methods (POST, PUT, PATCH, DELETE) when role is dinas_pendidikan
  const roleNorm = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const method = (
    init?.method ||
    (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
  ).toUpperCase();

  if (roleNorm === 'dinaspendidikan' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!requestUrlStr.split('?')[0].endsWith('/rpc/verify_login')) {
      return new Response(
        JSON.stringify({ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }),
        {
          status: 403,
          statusText: 'Forbidden',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  return fetch(input, {
    ...init,
    cache: 'no-store',
    headers,
  });
};

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

  const safeSekolahId = sanitizeHeaderValue(effectiveSekolahId);
  const safeRole = sanitizeHeaderValue(role);
  const safeUserId = sanitizeHeaderValue(userId);
  const safeSessionToken = sanitizeHeaderValue(sessionToken);

  // Inject headers only if not already explicitly provided by the caller
  if (safeSekolahId && !headers.has('x-sekolah-id')) {
    headers.set('x-sekolah-id', safeSekolahId);
  }
  if (safeRole && !headers.has('x-user-role')) {
    headers.set('x-user-role', safeRole);
  }
  if (safeUserId && !headers.has('x-user-id')) {
    headers.set('x-user-id', safeUserId);
  }
  if (safeSessionToken && !headers.has('x-session-token')) {
    headers.set('x-session-token', safeSessionToken);
  }

  const requestUrlStr = typeof input === 'string'
    ? input
    : (typeof Request !== 'undefined' && input instanceof Request)
      ? input.url
      : (typeof URL !== 'undefined' && input instanceof URL)
        ? input.href
        : '';

  // Client-side guard rejecting mutating methods (POST, PUT, PATCH, DELETE) when role is dinas_pendidikan
  const roleNorm = (role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const method = (
    init?.method ||
    (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')
  ).toUpperCase();

  if (roleNorm === 'dinaspendidikan' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    // Only allow login RPC if invoked
    if (!requestUrlStr.split('?')[0].endsWith('/rpc/verify_login')) {
      return new Response(
        JSON.stringify({ error: 'Role dinas_pendidikan is read-only. Data mutation prohibited.' }),
        {
          status: 403,
          statusText: 'Forbidden',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }

  // Central tables and RPCs that must NEVER be rewritten to satellite instances
  const isMasterOnlyRequest =
    requestUrlStr.includes('/rest/v1/sekolah_registry') ||
    requestUrlStr.includes('/rest/v1/rpc/verify_login') ||
    headers.get('x-target-scope') === 'master';

  if (headers.has('x-target-scope')) {
    headers.delete('x-target-scope');
  }

  let effectiveInput = input;
  // If target school specifies an external Supabase instance URL & key, route requests dynamically.
  // Security guard: Only rewrite to an external host if both URL AND valid anon key are present.
  // Never leak master portal anon key to an external host!
  const hasSatelliteUrl = Boolean(targetSchool?.supabase_url && targetSchool.supabase_url.trim());
  const hasSatelliteKey = Boolean(targetSchool?.supabase_anon_key && targetSchool.supabase_anon_key.trim());

  if (!isMasterOnlyRequest && hasSatelliteUrl && hasSatelliteKey) {
    const targetBase = normalizeSupabaseUrl(targetSchool!.supabase_url);
    const currentBase = normalizeSupabaseUrl(supabaseUrl);

    try {
      const parsedUrl = new URL(requestUrlStr);
      const parsedCurrent = new URL(currentBase);
      const parsedTarget = new URL(targetBase);

      if (parsedUrl.host === parsedCurrent.host) {
        parsedUrl.protocol = parsedTarget.protocol;
        parsedUrl.host = parsedTarget.host;
        parsedUrl.port = parsedTarget.port;
        const rewrittenUrlStr = parsedUrl.toString();

        if (typeof input === 'string') {
          effectiveInput = rewrittenUrlStr;
        } else if (typeof URL !== 'undefined' && input instanceof URL) {
          effectiveInput = new URL(rewrittenUrlStr);
        } else if (typeof Request !== 'undefined' && input instanceof Request) {
          effectiveInput = new Request(rewrittenUrlStr, input);
        }
      }
    } catch (_) {
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
    }

    const anonKey = sanitizeHeaderValue(targetSchool!.supabase_anon_key);
    if (anonKey) {
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
  if (res.status === 401 && typeof window !== 'undefined') {
    if (!targetSchool) {
      try {
        clearAllClientSessionState();
        window.dispatchEvent(new Event('sipjam_unauthorized'));
      } catch (_) {}
    } else {
      try {
        window.dispatchEvent(new CustomEvent('sipjam_satellite_error', { detail: { school: targetSchool, status: res.status } }));
      } catch (_) {}
    }
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
 * Completely bypasses dynamic satellite rewriting, while properly injecting master Superadmin
 * session headers to satisfy Row Level Security (RLS) on sekolah_registry and platform tables.
 */
export const masterSupabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: masterFetch,
  },
});

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

  const isExternalTarget = targetUrl !== normalizeSupabaseUrl(supabaseUrl);
  // Never leak master portal anon key to an external satellite URL if target key is absent
  const rawTargetKey = (target?.supabase_anon_key && target.supabase_anon_key.trim())
    ? target.supabase_anon_key.trim()
    : (isExternalTarget ? 'missing-satellite-anon-key' : supabaseKey);
  const targetKey = sanitizeHeaderValue(rawTargetKey) || (isExternalTarget ? 'missing-satellite-anon-key' : supabaseKey);
  const targetSekolahId = sanitizeHeaderValue(target?.id ? String(target.id).trim() : null);

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

        const { userId, sessionToken } = getActiveTenantContext();
        const safeUserId = sanitizeHeaderValue(userId);
        const safeSessionToken = sanitizeHeaderValue(sessionToken);
        if (safeUserId && !headers.has('x-user-id')) {
          headers.set('x-user-id', safeUserId);
        }
        if (safeSessionToken && !headers.has('x-session-token')) {
          headers.set('x-session-token', safeSessionToken);
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

  const sessionToken = sanitizeHeaderValue(explicitSessionToken || serverTenantContext.sessionToken || null);
  const effectiveUserId = sanitizeHeaderValue(userId || serverTenantContext.userId || null);
  const effectiveSekolahId = sanitizeHeaderValue(sekolahId || getActiveTargetSchool()?.id || serverTenantContext.sekolahId || null);
  const effectiveRole = sanitizeHeaderValue(role || serverTenantContext.role || null);

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
          headers.set('x-sekolah-id', effectiveSekolahId);
        }
        if (effectiveRole && !headers.has('x-user-role')) {
          headers.set('x-user-role', effectiveRole);
        }
        if (effectiveUserId && !headers.has('x-user-id')) {
          headers.set('x-user-id', effectiveUserId);
        }
        if (sessionToken && !headers.has('x-session-token')) {
          headers.set('x-session-token', sessionToken);
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

