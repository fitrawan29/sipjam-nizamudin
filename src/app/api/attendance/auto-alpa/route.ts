import { NextRequest, NextResponse } from 'next/server';
import { evaluateAndApplyAutoAlpa } from '@/lib/attendanceAlpa';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || undefined;
    const sekolahParam = searchParams.get('sekolah_id') || undefined;
    const forceParam = searchParams.get('force') === 'true';

    const result = await evaluateAndApplyAutoAlpa(dateParam, sekolahParam, { force: forceParam });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[API /api/attendance/auto-alpa] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, sekolah_id, force } = body;

    const result = await evaluateAndApplyAutoAlpa(date, sekolah_id, { force: Boolean(force) });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[API /api/attendance/auto-alpa] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
