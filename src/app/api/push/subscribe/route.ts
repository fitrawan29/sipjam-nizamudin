import { NextRequest, NextResponse } from 'next/server';
import { getTenantSupabaseClient } from '@/lib/supabaseClient';

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

    const subscriptionRow = {
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

    const { data, error } = await client
      .from('push_subscriptions')
      .upsert(subscriptionRow, { onConflict: 'endpoint' })
      .select()
      .single();

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
