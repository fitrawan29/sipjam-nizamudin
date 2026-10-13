import { NextRequest, NextResponse } from 'next/server';
import { supabase, getTenantSupabaseClient } from '@/lib/supabaseClient';
import { getWitaTimestamp, getWitaDateStr } from '@/lib/wita';

let cachedSuperadminToken: string | null = null;

/**
 * Resolves session token from request headers, payload body, or server fallback.
 */
async function resolveSessionToken(req: NextRequest, body: any): Promise<string | null> {
  const headerToken = req.headers.get('x-session-token');
  if (headerToken) return headerToken;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const candidate = authHeader.substring(7).trim();
    if (candidate && !candidate.startsWith('eyJ')) { // not raw JWT
      return candidate;
    }
  }

  if (body?.session_token) return body.session_token;

  if (cachedSuperadminToken) return cachedSuperadminToken;

  const superadminPassword = process.env.SUPERADMIN_API_PASSWORD;
  if (!superadminPassword) {
    return null;
  }

  try {
    const { data } = await supabase.rpc('verify_login', {
      p_username: 'superadmin',
      p_password: superadminPassword,
    });
    if (data && data[0]?.session_token) {
      cachedSuperadminToken = data[0].session_token;
      return cachedSuperadminToken;
    }
  } catch (err) {
    console.warn('[API /api/attendance] Fallback token retrieval warning:', err);
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Support both direct fields and legacy/alternative payload structures
    const nama_guru = body.nama_guru || body.nama || '';
    const user_id = body.user_id || body.userId || null;
    const tipe_absen = body.tipe_absen || body.tipe || 'Datang';
    const jenis_presensi = body.jenis_presensi || body.status || 'Sekolah';
    const isTerlambat = jenis_presensi === 'Izin Terlambat' || jenis_presensi === 'Terlambat';
    const detail_izin = body.detail_izin || body.detail || body.keterangan || (isTerlambat ? 'Izin Datang Terlambat' : '');
    const lokasi = body.lokasi || '';
    const jarak = body.jarak ? String(body.jarak) : '';
    const link_bukti = body.link_bukti || body.foto_url || '';
    const rawKeterlambatan = typeof body.keterlambatan_detik === 'number' ? body.keterlambatan_detik : 0;
    // ponytail: naive cap to prevent negative or > 12h test values, tighten if people bypass it
    const keterlambatan_detik = Math.max(0, Math.min(rawKeterlambatan, 43200));
    const sekolah_id = body.sekolah_id || body.sekolahId || req.headers.get('x-sekolah-id') || null;
    const latitude = typeof body.latitude === 'number' ? body.latitude : (body.latitude ? parseFloat(body.latitude) : null);
    const longitude = typeof body.longitude === 'number' ? body.longitude : (body.longitude ? parseFloat(body.longitude) : null);

    // Multi-day leave parameters & server-side leave duration rule validation
    const durasi_hari = typeof body.durasi_hari === 'number' ? Math.max(1, body.durasi_hari) : (body.durasi_hari ? Math.max(1, parseInt(String(body.durasi_hari), 10) || 1) : 1);
    const tanggal_mulai = body.tanggal_mulai || getWitaDateStr();
    const tanggal_selesai = body.tanggal_selesai || getWitaDateStr();
    const isSakit = detail_izin === 'Sakit' || jenis_presensi === 'Sakit' || (typeof detail_izin === 'string' && detail_izin.toLowerCase().includes('sakit'));
    const isIzin = !isTerlambat && (jenis_presensi === 'Izin' || detail_izin === 'Izin' || (typeof detail_izin === 'string' && detail_izin.toLowerCase().includes('izin')) || (typeof jenis_presensi === 'string' && jenis_presensi.toLowerCase().includes('izin') && !jenis_presensi.toLowerCase().includes('terlambat')));
    const isLeave = isSakit || isIzin;
    const isLeavePersetujuanAdmin = (isSakit && durasi_hari >= 3) || (!isSakit && (jenis_presensi === 'Izin' || detail_izin === 'Izin' || isIzin) && durasi_hari > 3);

    // Geofence radius validation on server:
    // If 'Sekolah' attendance is outside allowable radius (default 100m or custom radius), requires admin approval -> 'Menunggu'
    const numericJarak = typeof body.jarak === 'number'
      ? body.jarak
      : (body.jarak ? parseFloat(String(body.jarak).replace(/[^0-9.]/g, '')) : null);
    const radiusToleransi = typeof body.radius === 'number' ? body.radius : 100;
    const isDiLuarRadius = (jenis_presensi === 'Sekolah' || (!jenis_presensi && !isLeave)) && numericJarak !== null && !isNaN(numericJarak) && numericJarak > radiusToleransi;

    // Status verifikasi default:
    // If 'Izin Terlambat', 'Terlambat', di luar radius, or memerlukan_persetujuan_admin (explicit or calculated by leave duration), requires admin approval -> 'Menunggu'
    // Otherwise use provided status or 'Disetujui'
    const isMemerlukanPersetujuan = body.memerlukan_persetujuan_admin === true || body.memerlukan_persetujuan_admin === 'true' || isLeavePersetujuanAdmin || isDiLuarRadius || isTerlambat;
    const status_verifikasi = (isTerlambat || isMemerlukanPersetujuan) ? 'Menunggu' : (body.status_verifikasi || 'Disetujui');

    const isMultiDayType = isLeave;

    const presensiRecord: any = {
      id: body.id || crypto.randomUUID(),
      timestamp: body.timestamp || getWitaTimestamp(),
      nama_guru: nama_guru,
      user_id: user_id,
      tipe_absen: tipe_absen,
      jenis_presensi: jenis_presensi,
      detail_izin: detail_izin,
      durasi_hari: isMultiDayType ? durasi_hari : 1,
      tanggal_mulai: isMultiDayType ? tanggal_mulai : getWitaDateStr(),
      tanggal_selesai: isMultiDayType ? tanggal_selesai : getWitaDateStr(),
      memerlukan_persetujuan_admin: isMultiDayType ? isLeavePersetujuanAdmin : (isDiLuarRadius || isTerlambat || body.memerlukan_persetujuan_admin === true || false),
      lokasi: lokasi,
      jarak: jarak,
      link_bukti: link_bukti,
      status_verifikasi: status_verifikasi,
      keterlambatan_detik: keterlambatan_detik,
      latitude: latitude,
      longitude: longitude,
    };

    if (sekolah_id) {
      presensiRecord.sekolah_id = sekolah_id;
    }

    const sessionToken = await resolveSessionToken(req, body);
    const effectiveSekolahId = sekolah_id || req.headers.get('x-sekolah-id') || null;
    const effectiveRole = req.headers.get('x-user-role') || (sessionToken === cachedSuperadminToken ? 'Superadmin' : 'Guru');
    const effectiveUserId = user_id || req.headers.get('x-user-id') || null;

    const dbClient = getTenantSupabaseClient(
      effectiveSekolahId,
      effectiveRole,
      effectiveUserId,
      sessionToken
    );

    let { data, error } = await dbClient
      .from('presensi_guru')
      .insert([presensiRecord])
      .select()
      .single();

    if (error && (error.message.includes('schema cache') || error.message.includes('column'))) {
      const baseCleanRecord = {
        id: presensiRecord.id,
        timestamp: presensiRecord.timestamp,
        nama_guru: presensiRecord.nama_guru,
        user_id: presensiRecord.user_id,
        tipe_absen: presensiRecord.tipe_absen,
        jenis_presensi: presensiRecord.jenis_presensi,
        detail_izin: presensiRecord.detail_izin,
        lokasi: presensiRecord.lokasi,
        jarak: presensiRecord.jarak,
        link_bukti: presensiRecord.link_bukti,
        status_verifikasi: presensiRecord.status_verifikasi,
        keterlambatan_detik: presensiRecord.keterlambatan_detik,
        latitude: presensiRecord.latitude,
        longitude: presensiRecord.longitude,
        ...(presensiRecord.sekolah_id ? { sekolah_id: presensiRecord.sekolah_id } : {})
      };
      const retry = await dbClient.from('presensi_guru').insert([baseCleanRecord]).select().single();
      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) {
      console.error('[API /api/attendance] POST Supabase error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: data || presensiRecord,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API /api/attendance] POST unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');
    const namaGuru = searchParams.get('nama_guru');
    const jenisPresensi = searchParams.get('jenis_presensi') || searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const sessionToken = await resolveSessionToken(req, {});
    const effectiveSekolahId = searchParams.get('sekolah_id') || req.headers.get('x-sekolah-id') || null;
    const effectiveRole = req.headers.get('x-user-role') || (sessionToken === cachedSuperadminToken ? 'Superadmin' : 'Guru');

    const dbClient = getTenantSupabaseClient(
      effectiveSekolahId,
      effectiveRole,
      userId,
      sessionToken
    );

    let query = dbClient
      .from('presensi_guru')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (namaGuru) {
      query = query.ilike('nama_guru', `%${namaGuru}%`);
    }
    if (jenisPresensi) {
      query = query.eq('jenis_presensi', jenisPresensi);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API /api/attendance] GET error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Attendance endpoint active',
      data: data || [],
    });
  } catch (err: any) {
    console.error('[API /api/attendance] GET unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
