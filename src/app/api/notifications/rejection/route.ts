import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendWebPush, PushNotificationPayload } from '@/lib/vapid';

export interface RejectionNotificationRequest {
  teacherName: string;
  teacherId?: string;
  sekolahId?: string;
  category: 'Presensi' | 'Jurnal' | 'Piket';
  detailInfo?: string;
  rejectionReason: string;
  adminName?: string;
  adminId?: string;
}

/**
 * Sanitizes input text to strip HTML and script tags for push and in-app display.
 */
function sanitizeText(str: any): string {
  if (typeof str !== 'string' || !str) return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/**
 * Returns deep link URL for each rejected category.
 */
function getCategoryDeepLink(category: 'Presensi' | 'Jurnal' | 'Piket'): string {
  switch (category) {
    case 'Presensi':
      return '/?view=view-guru-presensi';
    case 'Jurnal':
      return '/?view=view-guru-jurnal';
    case 'Piket':
      return '/?view=view-piket';
    default:
      return '/';
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json().catch(() => ({}));

    // 1. Validate required fields (F5-B1)
    const teacherName = typeof body.teacherName === 'string' ? body.teacherName.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';

    if (!teacherName || !category || !rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid required parameters' },
        { status: 400 }
      );
    }

    const validCategories = ['Presensi', 'Jurnal', 'Piket'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category. Must be Presensi, Jurnal, or Piket' },
        { status: 400 }
      );
    }

    const cleanReason = sanitizeText(rejectionReason);
    const detailInfo = sanitizeText(body.detailInfo || category);
    const adminName = body.adminName ? sanitizeText(body.adminName) : 'Admin Verifikasi';
    const adminId = body.adminId || '00000000-0000-0000-0000-000000000000';

    // 2. Resolve teacher and tenant context
    let recipientId = body.teacherId;
    let sekolahId = body.sekolahId;

    if (!recipientId || !sekolahId) {
      let teacherQuery = supabase
        .from('data_guru')
        .select('id, nama_guru, sekolah_id')
        .ilike('nama_guru', teacherName);

      if (sekolahId) {
        teacherQuery = teacherQuery.eq('sekolah_id', sekolahId);
      }

      const { data: teacherRecord } = await teacherQuery.maybeSingle();
      if (teacherRecord) {
        if (!recipientId) recipientId = teacherRecord.id;
        if (!sekolahId) sekolahId = teacherRecord.sekolah_id;
      }
    }

    const fallbackRecipientId = recipientId || '00000000-0000-0000-0000-000000000000';

    // 3. Create persistent In-App Notification in chat_messages (F5.3)
    const inAppPayload = {
      sender_id: adminId,
      sender_nama: adminName.includes('(Admin)') ? adminName : `${adminName} (Admin)`,
      recipient_id: fallbackRecipientId,
      recipient_nama: teacherName,
      pesan: `[Pemberitahuan Sistem] Pengajuan ${detailInfo} ditolak: ${cleanReason}. Silakan melakukan perbaikan dan pengisian ulang hari ini.`,
      is_read: false,
      ...(sekolahId ? { sekolah_id: sekolahId } : {})
    };

    let inAppCreated = false;
    try {
      const { error: chatErr } = await supabase
        .from('chat_messages').insert([inAppPayload]);

      if (chatErr) {
        console.error('[rejection-notification] In-app chat insert error:', chatErr.message);
      } else {
        inAppCreated = true;
      }
    } catch (chatEx: any) {
      console.error('[rejection-notification] In-app chat exception:', chatEx.message);
    }

    // 4. Query Push Subscriptions with strict tenant isolation (F5-B5)
    let subQuery = supabase.from('push_subscriptions').select('*');
    if (sekolahId) {
      subQuery = subQuery.eq('sekolah_id', sekolahId);
    }
    const { data: allSubs, error: subErr } = await subQuery;

    if (subErr) {
      console.error('[rejection-notification] Fetch subscriptions error:', subErr.message);
    }

    const matchedSubs = (allSubs || []).filter(sub => {
      // Prevent leakage to different schools
      if (sekolahId && sub.sekolah_id && sub.sekolah_id !== sekolahId) return false;
      // Match by teacher user ID if available
      if (recipientId && sub.user_id && sub.user_id === recipientId) return true;
      // Match by teacher name
      if (sub.user_nama && sub.user_nama.toLowerCase().trim() === teacherName.toLowerCase()) return true;
      return false;
    });

    // 5. Dispatch Web Push Notifications (F5.2, F5-B3)
    const deepLink = getCategoryDeepLink(category);
    const pushPayload: PushNotificationPayload = {
      title: `Pengajuan ${category} Ditolak`,
      body: `Pengajuan ${detailInfo} Anda ditolak. Alasan: "${cleanReason}". Silakan isi ulang.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      url: deepLink,
      data: {
        category,
        teacherName,
        detailInfo,
        rejectionReason: cleanReason,
        timestamp: new Date().toISOString()
      }
    };

    let pushSent = 0;
    let pushErrors = 0;

    for (const sub of matchedSubs) {
      try {
        await sendWebPush(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          pushPayload
        );
        pushSent++;
      } catch (err: any) {
        console.error(`[rejection-notification] Push send error for ${teacherName}:`, err.message);
        pushErrors++;

        // Clean up expired or unregistered push subscriptions (HTTP 410 / 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          try {
            await supabase
              .from('push_subscriptions').delete()
              .eq('id', sub.id);
          } catch {
            // Ignore cleanup error
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      pushSent,
      pushErrors,
      inAppCreated,
      matchedSubscriptions: matchedSubs.length
    });
  } catch (error: any) {
    console.error('[API /api/notifications/rejection] Exception:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
