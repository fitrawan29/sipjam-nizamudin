import { NextRequest, NextResponse } from 'next/server';
import { getTenantSupabaseClient, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, user_id, user_nama, user_role, sekolah_id } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Objek subscription tidak valid atau tidak lengkap' },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!p256dh || !auth) {
      return NextResponse.json(
        { success: false, error: 'Subscription keys (p256dh, auth) wajib disertakan' },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Obtain scoped tenant client with tenant headers
    const client = getTenantSupabaseClient(sekolah_id, user_role || 'Guru', user_id);

    const subscriptionRow: Record<string, any> = {
      endpoint,
      p256dh,
      auth,
      user_id: user_id || null,
      user_nama: user_nama || null,
      user_role: user_role || null,
      sekolah_id: sekolah_id || null,
      user_agent: userAgent,
      updated_at: new Date().toISOString()
    };

    let { data, error } = await client
      .from('push_subscriptions')
      .upsert(subscriptionRow, { onConflict: 'endpoint' })
      .select()
      .maybeSingle();

    // Graceful fallback if user_agent (or schema cache) fails
    if (error && (
      error.message?.includes('user_agent') ||
      isSchemaCacheOrMissingTableError(error) ||
      error.code === 'PGRST204' ||
      error.code === '42703'
    )) {
      console.warn('[API /api/push/subscribe] Retrying without user_agent due to schema cache:', error.message);
      const fallbackRow = { ...subscriptionRow };
      delete fallbackRow.user_agent;

      const retryRes = await client
        .from('push_subscriptions')
        .upsert(fallbackRow, { onConflict: 'endpoint' })
        .select()
        .maybeSingle();

      data = retryRes.data;
      error = retryRes.error;

      // Further fallback if older table also lacks user_nama or user_role
      if (error && (
        error.message?.includes('user_nama') ||
        error.message?.includes('user_role') ||
        error.code === 'PGRST204' ||
        error.code === '42703'
      )) {
        console.warn('[API /api/push/subscribe] Retrying with core subscription fields:', error.message);
        const minimalRow = {
          endpoint,
          p256dh,
          auth,
          user_id: user_id || null,
          sekolah_id: sekolah_id || null,
          updated_at: new Date().toISOString()
        };
        const minimalRes = await client
          .from('push_subscriptions')
          .upsert(minimalRow, { onConflict: 'endpoint' })
          .select()
          .maybeSingle();

        data = minimalRes.data;
        error = minimalRes.error;
      }
    }

    if (error) {
      console.error('[API /api/push/subscribe] Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription push berhasil disimpan.',
      data
    });
  } catch (err: any) {
    console.error('[API /api/push/subscribe] Server error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
