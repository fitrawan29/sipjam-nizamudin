import { NextRequest, NextResponse } from 'next/server';
import { sendWebPush, VAPID_PUBLIC_KEY } from '@/lib/vapid';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  return NextResponse.json({
    success: true,
    publicKey: VAPID_PUBLIC_KEY
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let subscription = body.subscription;
    const { endpoint, payload } = body;

    // If subscription is not provided directly, try looking up via endpoint
    if (!subscription && endpoint) {
      const { data: subData, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('endpoint', endpoint)
        .single();

      if (subError || !subData) {
        return NextResponse.json(
          { success: false, error: 'Subscription dengan endpoint tersebut tidak ditemukan' },
          { status: 404 }
        );
      }

      subscription = {
        endpoint: subData.endpoint,
        keys: {
          p256dh: subData.p256dh,
          auth: subData.auth
        }
      };
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: 'Objek subscription atau endpoint valid diperlukan' },
        { status: 400 }
      );
    }

    const testPayload = {
      title: payload?.title || 'SIPJAM - Uji Coba Push Notifikasi',
      body: payload?.body || 'Layanan Push Notifikasi VAPID aktif dan berfungsi sempurna!',
      icon: payload?.icon || '/favicon.ico',
      badge: payload?.badge || '/favicon.ico',
      url: payload?.url || '/',
      data: {
        timestamp: new Date().toISOString(),
        test: true
      }
    };

    const pushResult = await sendWebPush(subscription, testPayload);

    return NextResponse.json({
      success: true,
      message: 'Notifikasi uji coba berhasil dikirim ke perangkat.',
      statusCode: pushResult.statusCode
    });
  } catch (err: any) {
    console.error('[API /api/push/validate] Push error:', err);

    // If status 410 or 404, the subscription has expired or unsubscribed
    const statusCode = err.statusCode || 500;
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal mengirim push notification',
        statusCode
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}
