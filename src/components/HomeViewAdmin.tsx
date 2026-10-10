'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  getWitaDateLong, 
  getWitaTimeStr, 
  getWitaDayName, 
  getWitaDateStr, 
  getWitaStartOfDay, 
  getWitaEndOfDay 
} from '@/lib/wita';
import { 
  getGuruDailyState, 
  GuruDailyState, 
  isJurnalMatchJadwal, 
  isGuruDiPiket 
} from '@/lib/workflow';
import { supabase } from '@/lib/supabaseClient';
import { renderUserAvatar } from '@/lib/avatars';
import { AppUser } from '@/types/user';

interface TeacherStatusRow {
  id: string;
  nip: string;
  nama_guru: string;
  mata_pelajaran: string;
  presensiDatang: {
    status: string;
    color: 'green' | 'amber' | 'blue' | 'rose' | 'gray';
    time?: string;
  };
  pengisianJurnal: {
    status: string;
    color: 'green' | 'amber' | 'rose' | 'gray';
    filled: number;
    total: number;
  };
  laporanPiket: {
    status: string;
    color: 'green' | 'rose' | 'gray' | 'blue';
    isPiket: boolean;
  };
  presensiPulang: {
    status: string;
    color: 'green' | 'gray' | 'amber' | 'blue';
    time?: string;
  };
  isTugasLengkap: boolean;
}

export interface HomeViewAdminProps {
  user: AppUser;
  setView: (view: string) => void;
  menuItems?: any[];
  onOpenAccountSettings?: () => void;
}

export default function HomeViewAdmin({
  user,
  setView,
  menuItems = [],
  onOpenAccountSettings,
}: HomeViewAdminProps) {
  const dateStr = getWitaDateLong();
  const timeStr = getWitaTimeStr();
  const hariIni = getWitaDayName();
  
  const dateParts = getWitaDateStr().split('-'); // [YYYY, MM, DD]
  const dashboardDateStr = `${hariIni}, ${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    const [adminLoading, setAdminLoading] = useState(false);
  const [matrixList, setMatrixList] = useState<TeacherStatusRow[]>([]);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixFilter, setMatrixFilter] = useState<'Semua' | 'Tugas Lengkap' | 'Belum Lengkap'>('Semua');
  const [activeBlokToday, setActiveBlokToday] = useState<any | null>(null);


    const loadAdminMatrix = useCallback(async () => {
    setAdminLoading(true);
    try {
      const todayStr = getWitaDateStr();
      const dayName = getWitaDayName();

      // Multi-tenant scoped queries
      let teachersQ = supabase.from('data_guru').select('*').order('nama_guru', { ascending: true });
      let presensiQ = supabase.from('presensi_guru').select('*').order('timestamp', { ascending: false });
      let jurnalQ = supabase.from('jurnal_pembelajaran').select('*').eq('tanggal', todayStr);
      let jadwalQ = supabase.from('jadwal_pelajaran').select('*').eq('hari', dayName);
      let piketScheduleQ = supabase.from('jadwal_piket').select('*').eq('hari', dayName);
      let piketLaporanQ = supabase.from('laporan_piket').select('*').eq('tanggal', todayStr);
      let penugasanPiketQ = supabase.from('penugasan_piket').select('*').eq('hari', dayName).eq('tipe_petugas', 'Guru');
      let kalenderQ = supabase.from('kalender_pendidikan').select('*').eq('tanggal', todayStr);
      let pengaturanQ = supabase.from('pengaturan').select('key, value, aturan_kehadiran_guru');
      let blokQ = supabase.from('sistem_blok').select('*').lte('tanggal_mulai', todayStr).gte('tanggal_selesai', todayStr).order('created_at', { ascending: false });

      if (user?.sekolah_id) {
        teachersQ = teachersQ.eq('sekolah_id', user.sekolah_id);
        presensiQ = presensiQ.eq('sekolah_id', user.sekolah_id);
        jurnalQ = jurnalQ.eq('sekolah_id', user.sekolah_id);
        jadwalQ = jadwalQ.eq('sekolah_id', user.sekolah_id);
        piketScheduleQ = piketScheduleQ.eq('sekolah_id', user.sekolah_id);
        piketLaporanQ = piketLaporanQ.eq('sekolah_id', user.sekolah_id);
        penugasanPiketQ = penugasanPiketQ.eq('sekolah_id', user.sekolah_id);
        kalenderQ = kalenderQ.eq('sekolah_id', user.sekolah_id);
        pengaturanQ = pengaturanQ.eq('sekolah_id', user.sekolah_id);
        blokQ = blokQ.eq('sekolah_id', user.sekolah_id);
      }

      const [
        teachersRes, 
        presensiRes, 
        jurnalRes, 
        jadwalRes, 
        piketScheduleRes, 
        piketLaporanRes,
        penugasanPiketRes,
        kalenderRes,
        pengaturanRes,
        blokRes
      ] = await Promise.all([
        teachersQ,
        presensiQ.limit(500),
        jurnalQ,
        jadwalQ,
        piketScheduleQ,
        piketLaporanQ,
        penugasanPiketQ,
        kalenderQ,
        pengaturanQ,
        blokQ
      ]);

      const teachers = teachersRes.data || [];
      const rawPresensi = presensiRes.data || [];
      const jurnalList = jurnalRes.data || [];
      const jadwalList = jadwalRes.data || [];
      const piketSchedule = (piketScheduleRes.data && piketScheduleRes.data[0]) || null;
      const piketReports = piketLaporanRes.data || [];
      const assignedPiketTeachers = penugasanPiketRes.data || [];
      const activeBlok = (blokRes.data && blokRes.data[0]) || null;
      setActiveBlokToday(activeBlok);
      const isBlokToday = Boolean(activeBlok);

      // Check holidays & weekend
      const isLiburKalender = Boolean((kalenderRes.data || []).some((c: any) => c.tipe === 'Libur'));
      const hariSekolahVal = (pengaturanRes.data || []).find((p: any) => p.key === 'hari_sekolah')?.value || '6';
      const hariSekolah = parseInt(hariSekolahVal, 10);
      const isWeekendOff = dayName === 'Minggu' || (hariSekolah === 5 && dayName === 'Sabtu');
      const isSchoolDayOff = isLiburKalender || isWeekendOff;

      const aturanGlobal = (pengaturanRes.data || []).find((p: any) => p.key === 'aturan_kehadiran_guru')?.value || 
                           (pengaturanRes.data || []).find((p: any) => p.aturan_kehadiran_guru)?.aturan_kehadiran_guru;
      const ghmRow = (pengaturanRes.data || []).find((p: any) => p.key === 'guru_hanya_mengajar');
      let guruHanyaMengajarList: string[] = [];
      if (ghmRow && ghmRow.value) {
        try {
          const parsed = JSON.parse(ghmRow.value);
          if (Array.isArray(parsed)) guruHanyaMengajarList = parsed;
          else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.ids)) guruHanyaMengajarList.push(...parsed.ids);
            if (Array.isArray(parsed.names)) guruHanyaMengajarList.push(...parsed.names);
          }
        } catch {
          guruHanyaMengajarList = [ghmRow.value];
        }
      }

      // Robust multi-format date filtering for presensi
      const presensiList = rawPresensi.filter((p: any) => {
        const ts = (p.timestamp || '').trim();
        if (!ts) return false;
        if (ts.startsWith(todayStr)) return true;
        if (ts.includes('T') && ts.substring(0, 10) === todayStr) return true;
        const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          const month = slashMatch[1].padStart(2, '0');
          const day = slashMatch[2].padStart(2, '0');
          const year = slashMatch[3];
          if (`${year}-${month}-${day}` === todayStr) return true;
        }
        return false;
      });

      // Helper function for bidirectional normalized teacher name & NIP matching
      const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      const isTeacherMatch = (recordName?: string, recordNip?: string, targetName?: string, targetNip?: string): boolean => {
        if (recordNip && targetNip && recordNip.trim() === targetNip.trim()) return true;
        if (!recordName || !targetName) return false;
        const c1 = cleanStr(recordName);
        const c2 = cleanStr(targetName);
        if (c1 === c2) return true;
        if (c1.includes(c2) || c2.includes(c1)) return true;
        const t1 = c1.split(/\s+/).filter(w => w.length > 2);
        const t2 = c2.split(/\s+/).filter(w => w.length > 2);
        if (t1.length > 0 && t2.length > 0 && t1[0] === t2[0]) return true;
        return false;
      };

      const rows: TeacherStatusRow[] = teachers.map((teacher: any) => {
        const nama = (teacher.nama_guru || '').trim();
        const nip = (teacher.nip || '-').trim();
        const mapel = teacher.mata_pelajaran || '-';

        // 1. Target Classes & Jurnal KBM
        let targetClasses = jadwalList.filter((j: any) => {
          return isTeacherMatch(j.nama_guru, undefined, nama, nip);
        });
        
        // Dedup to find real target count
        const uniqueTargetsMap = new Map();
        targetClasses.forEach((j: any) => {
          uniqueTargetsMap.set(`${j.kelas}_${j.mata_pelajaran}`, j);
        });
        targetClasses = Array.from(uniqueTargetsMap.values());
        
        const targetCount = targetClasses.length;
        const isTeacherExempt = Boolean(teacher.wajib_hadir_hanya_mengajar) ||
          aturanGlobal === 'Hari_Mengajar_Saja' ||
          guruHanyaMengajarList.includes(teacher.id) ||
          guruHanyaMengajarList.includes(nama) ||
          (teacher.nip && guruHanyaMengajarList.includes(teacher.nip));
        const isExemptNonTeaching = isTeacherExempt && targetCount === 0;

        // 2. Presensi Datang
        const pDatang = presensiList.find((p: any) => 
          isTeacherMatch(p.nama_guru, p.nip, nama, nip) && p.tipe_absen === 'Datang'
        );
        let presensiDatangStatus = isSchoolDayOff ? 'Libur' : isExemptNonTeaching ? 'Bebas Hadir' : 'Belum Datang';
        let presensiDatangColor: 'green' | 'amber' | 'blue' | 'rose' | 'gray' = (isSchoolDayOff || isExemptNonTeaching) ? 'blue' : 'gray';
        let datangTime = '';

        if (pDatang) {
          const ts = pDatang.timestamp || '';
          datangTime = ts.includes(' ') 
            ? ts.split(' ')[1].substring(0, 5) 
            : (ts.includes('T') ? ts.split('T')[1].substring(0, 5) : '');
          const jp = pDatang.jenis_presensi || 'Sekolah';
          if (jp === 'Izin') {
            const isSakit = (pDatang.detail_izin || '').toLowerCase().includes('sakit');
            presensiDatangStatus = isSakit ? 'Sakit' : 'Izin';
            presensiDatangColor = 'blue';
          } else if (jp === 'Sakit') {
            presensiDatangStatus = 'Sakit';
            presensiDatangColor = 'rose';
          } else if (jp === 'Dinas Luar') {
            presensiDatangStatus = 'Dinas Luar';
            presensiDatangColor = 'blue';
          } else if (jp === 'Izin Terlambat' || jp === 'Terlambat') {
            const stVerif = pDatang.status_verifikasi;
            if (stVerif === 'Disetujui' || stVerif === 'Diverifikasi') {
              const telatDetik = pDatang.keterlambatan_detik || 0;
              if (telatDetik > 0) {
                const menit = Math.ceil(telatDetik / 60);
                presensiDatangStatus = `Terlambat ${menit}m (${datangTime})`;
                presensiDatangColor = 'amber';
              } else {
                presensiDatangStatus = `Hadir [${datangTime}]`;
                presensiDatangColor = 'green';
              }
            } else if (stVerif === 'Ditolak') {
              presensiDatangStatus = 'Ditolak';
              presensiDatangColor = 'rose';
            } else {
              // Izin Terlambat belum diverifikasi: tidak langsung disahkan sebagai Hadir
              presensiDatangStatus = 'Izin Terlambat (Menunggu Verifikasi)';
              presensiDatangColor = 'amber';
            }
          } else {
            const telatDetik = pDatang.keterlambatan_detik || 0;
            if (telatDetik > 0) {
              const menit = Math.ceil(telatDetik / 60);
              presensiDatangStatus = `Terlambat ${menit}m (${datangTime})`;
              presensiDatangColor = 'amber';
            } else {
              presensiDatangStatus = `Hadir [${datangTime}]`;
              presensiDatangColor = 'green';
            }
          }
        }

        // 3. Presensi Pulang
        const pPulang = presensiList.find((p: any) => 
          isTeacherMatch(p.nama_guru, p.nip, nama, nip) && p.tipe_absen === 'Pulang'
        );
        let presensiPulangStatus = isSchoolDayOff ? 'Libur' : isExemptNonTeaching ? 'Bebas Hadir' : 'Belum Pulang';
        let presensiPulangColor: 'green' | 'gray' | 'amber' | 'blue' = (isSchoolDayOff || isExemptNonTeaching) ? 'blue' : 'gray';
        let pulangTime = '';

        if (pPulang) {
          const ts = pPulang.timestamp || '';
          pulangTime = ts.includes(' ') 
            ? ts.split(' ')[1].substring(0, 5) 
            : (ts.includes('T') ? ts.split('T')[1].substring(0, 5) : '');
          presensiPulangStatus = `Pulang [${pulangTime}]`;
          presensiPulangColor = 'green';
        }

        // 4. Laporan Piket (Check penugasan_piket directly + jadwal_piket fallback)
        const inPenugasan = assignedPiketTeachers.some((p: any) =>
          isTeacherMatch(p.guru_nama, p.guru_nip, nama, nip)
        );
        const inJadwalPiket = piketSchedule ? isGuruDiPiket(piketSchedule.daftar_guru, nama) : false;
        const isAssignedPiket = inPenugasan || inJadwalPiket;
        const isPiket = isAssignedPiket && (!isBlokToday || !isExemptNonTeaching);
        let piketStatus = isExemptNonTeaching && isAssignedPiket ? 'Bebas Piket' : 'Bukan Petugas';
        let piketColor: 'green' | 'rose' | 'gray' | 'blue' = isExemptNonTeaching && isAssignedPiket ? 'blue' : 'gray';

        if (isPiket) {
          const hasReport = piketReports.some((lp: any) => 
            isTeacherMatch(lp.guru_pelapor, undefined, nama, nip)
          );
          if (hasReport) {
            piketStatus = 'Sudah Lapor';
            piketColor = 'green';
          } else {
            piketStatus = 'Belum Lapor';
            piketColor = 'rose';
          }
        }

        // 5. Pengisian Jurnal (Handling regular KBM and Dinas Luar / Jurnal Kegiatan)
        const teacherJournals = jurnalList.filter((j: any) => 
          isTeacherMatch(j.nama_guru, undefined, nama, nip)
        );

        const acceptedTeacherJournals = teacherJournals.filter((j: any) => j.status_verifikasi !== 'Ditolak');
        const hasRejectedJournal = teacherJournals.some((j: any) => j.status_verifikasi === 'Ditolak');

        const filledCount = targetClasses.filter((jk: any) => 
          acceptedTeacherJournals.some((j: any) => isJurnalMatchJadwal(j, jk))
        ).length;

        const isDinasLuar = presensiDatangStatus === 'Dinas Luar';
        const hasJurnalKegiatan = acceptedTeacherJournals.some((j: any) => 
          j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan' || (j.kegiatan_pembelajaran && (!j.kelas || j.kelas === '-'))
        );

        let jurnalStatus = 'Bebas KBM';
        let jurnalColor: 'green' | 'amber' | 'rose' | 'gray' = 'gray';

        if (isBlokToday) {
          if (isExemptNonTeaching) {
            jurnalStatus = 'Bebas KBM';
            jurnalColor = 'gray';
          } else if (hasJurnalKegiatan) {
            jurnalStatus = 'Jurnal Kegiatan Selesai';
            jurnalColor = 'green';
          } else if (hasRejectedJournal) {
            jurnalStatus = 'Ditolak (Perlu Revisi)';
            jurnalColor = 'rose';
          } else {
            jurnalStatus = 'Perlu Jurnal Kegiatan';
            jurnalColor = 'amber';
          }
        } else if (isDinasLuar) {
          if (hasJurnalKegiatan) {
            jurnalStatus = 'Jurnal Kegiatan Selesai';
            jurnalColor = 'green';
          } else if (hasRejectedJournal) {
            jurnalStatus = 'Ditolak (Perlu Revisi)';
            jurnalColor = 'rose';
          } else {
            jurnalStatus = 'Perlu Jurnal Kegiatan';
            jurnalColor = 'amber';
          }
        } else if (isExemptNonTeaching || targetCount === 0 || isSchoolDayOff) {
          if (hasJurnalKegiatan) {
            jurnalStatus = 'Jurnal Kegiatan Selesai';
            jurnalColor = 'green';
          } else {
            jurnalStatus = 'Bebas KBM';
            jurnalColor = 'gray';
          }
        } else if (filledCount >= targetCount) {
          jurnalStatus = `${targetCount}/${targetCount} Selesai`;
          jurnalColor = 'green';
        } else if (filledCount > 0) {
          jurnalStatus = `${filledCount}/${targetCount} Belum Lengkap`;
          jurnalColor = 'amber';
        } else if (hasRejectedJournal) {
          jurnalStatus = 'Ditolak (Perlu Revisi)';
          jurnalColor = 'rose';
        } else {
          jurnalStatus = 'Belum Mengisi';
          jurnalColor = 'rose';
        }

        // 6. Aggregate: Tugas Lengkap?
        const isIzinSakit = presensiDatangStatus === 'Izin' || presensiDatangStatus === 'Sakit';
        const isLiburOrExempt = isSchoolDayOff || isExemptNonTeaching;
        const datangDone = isLiburOrExempt || isIzinSakit || (presensiDatangStatus !== 'Belum Datang' && presensiDatangStatus !== 'Ditolak');
        const pulangDone = isLiburOrExempt || isIzinSakit || (presensiPulangStatus.startsWith('Pulang'));
        const piketDone = isLiburOrExempt || !isPiket || piketStatus === 'Sudah Lapor' || isIzinSakit;
        const jurnalDone = isLiburOrExempt || isIzinSakit || (isBlokToday ? (isExemptNonTeaching || hasJurnalKegiatan) : isDinasLuar ? hasJurnalKegiatan : (targetCount === 0 || isExemptNonTeaching ? true : filledCount >= targetCount));

        const isTugasLengkap = isLiburOrExempt
          ? true
          : isIzinSakit 
          ? datangDone 
          : (datangDone && pulangDone && piketDone && jurnalDone);

        return {
          id: teacher.id,
          nip,
          nama_guru: nama,
          mata_pelajaran: mapel,
          presensiDatang: {
            status: presensiDatangStatus,
            color: presensiDatangColor as any,
            time: datangTime
          },
          pengisianJurnal: {
            status: jurnalStatus,
            color: jurnalColor,
            filled: isBlokToday ? (isExemptNonTeaching ? 0 : (hasJurnalKegiatan ? 1 : 0)) : isDinasLuar ? (hasJurnalKegiatan ? 1 : 0) : filledCount,
            total: isBlokToday ? 1 : isDinasLuar ? (hasJurnalKegiatan ? 1 : 0) : targetCount
          },
          laporanPiket: {
            status: piketStatus,
            color: piketColor,
            isPiket
          },
          presensiPulang: {
            status: presensiPulangStatus,
            color: presensiPulangColor as any,
            time: pulangTime
          },
          isTugasLengkap
        };
      });

      setMatrixList(rows);
    } catch (err) {
      console.error('Error fetching admin matrix:', err);
    } finally {
      setAdminLoading(false);
    }
  }, [user?.sekolah_id]);

  useEffect(() => {
    loadAdminMatrix();
  }, [loadAdminMatrix]);


    // Filtered Admin Matrix
  const filteredMatrix = useMemo(() => {
    return matrixList.filter(row => {
      // 1. Search filter
      const q = matrixSearch.toLowerCase();
      const matchSearch = !q || 
        row.nama_guru.toLowerCase().includes(q) ||
        row.nip.toLowerCase().includes(q) ||
        row.mata_pelajaran.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // 2. Pill filter
      if (matrixFilter === 'Tugas Lengkap') return row.isTugasLengkap;
      if (matrixFilter === 'Belum Lengkap') return !row.isTugasLengkap;
      return true;
    });
  }, [matrixList, matrixSearch, matrixFilter]);

  // Admin KPI metrics
  const adminKPIs = useMemo(() => {
    const totalGuru = matrixList.length;
    
    // Wajib Datang = Yang tidak Libur dan tidak Bebas Hadir
    const wajibDatang = matrixList.filter(r => r.presensiDatang.status !== 'Libur' && r.presensiDatang.status !== 'Bebas Hadir').length;
    const sudahDatang = matrixList.filter(r => r.presensiDatang.status !== 'Libur' && r.presensiDatang.status !== 'Bebas Hadir' && r.presensiDatang.status !== 'Belum Datang' && r.presensiDatang.status !== 'Ditolak').length;
    
    // Wajib Jurnal = Yang tidak Bebas KBM
    const wajibJurnal = matrixList.filter(r => r.pengisianJurnal.status !== 'Bebas KBM' && r.pengisianJurnal.status !== 'Libur').length;
    const jurnalLengkap = matrixList.filter(r => r.pengisianJurnal.color === 'green').length;
    
    const totalPiket = matrixList.filter(r => r.laporanPiket.isPiket).length;
    const piketSelesai = matrixList.filter(r => r.laporanPiket.isPiket && r.laporanPiket.status === 'Sudah Lapor').length;
    
    const wajibPulang = wajibDatang;
    const sudahPulang = matrixList.filter(r => r.presensiPulang.status.startsWith('Pulang')).length;

    return { totalGuru, wajibDatang, sudahDatang, wajibJurnal, jurnalLengkap, totalPiket, piketSelesai, wajibPulang, sudahPulang };
  }, [matrixList]);


  return (
    <section id="view-home" className="fade-in block space-y-4">
            {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#0B4619] to-[#1a7031] rounded-2xl p-3.5 sm:p-4 shadow-lg shadow-green-900/20 text-white relative overflow-hidden border border-green-700/50">
        <i className="fa-solid fa-mosque absolute -right-4 -bottom-4 text-7xl text-white opacity-5 rotate-[-15deg] pointer-events-none"></i>
        
        <div className="relative z-10 flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
              {renderUserAvatar(user?.avatar, 'w-10 h-10 sm:w-11 sm:h-11')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base leading-tight truncate">{user.nama}</h2>
                <span className="bg-nizamudin-gold/90 text-green-900 px-2 py-0.5 rounded-full font-bold text-[8px] sm:text-[9px] uppercase shadow-sm shrink-0">
                  {user.role}
                </span>
              </div>
              <p className="text-[10px] text-green-100/80 font-mono mt-0.5 tracking-wider truncate flex items-center gap-1.5">
                <span>{user.username}</span>
                <span className="truncate font-sans font-medium">SMA NIZAMUDIN</span>
              </p>
            </div>
          </div>

          {onOpenAccountSettings && (
            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xs border border-white/20 flex items-center gap-1.5 transition ml-auto shrink-0 shadow-sm cursor-pointer"
              title="Ubah Username & Password"
            >
              <i className="fa-solid fa-gear text-xs"></i>
              <span className="hidden sm:inline">Edit Akun</span>
            </button>
          )}
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/10">
          <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
            <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Status</p>
            <p className="text-[10px] sm:text-xs font-bold text-white truncate">Aktif</p>
          </div>
          <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
            <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Tanggal</p>
            <p className="text-[10px] sm:text-xs font-bold text-white leading-tight break-words whitespace-normal">{dashboardDateStr}</p>
          </div>
          <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
            <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Jam</p>
            <p className="text-xs sm:text-sm font-black text-nizamudin-gold font-mono tracking-tight leading-none pt-0.5">{timeStr}</p>
          </div>
        </div>
      </div>

              <div className="space-y-4">
          {/* Summary KPI Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            {/* Total Guru */}
            <div className="glass-card p-3 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-users"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Guru</p>
                <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{adminKPIs.totalGuru}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Terdaftar</p>
              </div>
            </div>

            {/* Presensi Datang */}
            <div className="glass-card p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-right-to-bracket"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Presensi Datang</p>
                <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                  {adminKPIs.sudahDatang} <span className="text-xs text-gray-400 font-normal">/ {adminKPIs.wajibDatang}</span>
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Hadir / Izin / TL</p>
              </div>
            </div>

            {/* Jurnal Lengkap */}
            <div className="glass-card p-3 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-book-journal-whills"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Jurnal Lengkap</p>
                <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                  {adminKPIs.jurnalLengkap} <span className="text-xs text-gray-400 font-normal">/ {adminKPIs.wajibJurnal}</span>
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Selesai / Mengisi Penuh</p>
              </div>
            </div>

            {/* Piket Selesai */}
            <div className="glass-card p-3 rounded-xl border border-teal-200/80 dark:border-teal-800/50 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Piket Selesai</p>
                <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                  {adminKPIs.piketSelesai} <span className="text-xs text-gray-400 font-normal">/ {adminKPIs.totalPiket || 0}</span>
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Laporan masuk</p>
              </div>
            </div>

            {/* Presensi Pulang */}
            <div className="glass-card p-3 rounded-xl border border-amber-200/80 dark:border-amber-800/50 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-right-from-bracket"></i>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Presensi Pulang</p>
                <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                  {adminKPIs.sudahPulang} <span className="text-xs text-gray-400 font-normal">/ {adminKPIs.wajibPulang}</span>
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Sudah checkout</p>
              </div>
            </div>
          </div>

          {/* Active Blok Alert for Admin */}
          {activeBlokToday && (
            <div className="glass-card p-4 border-l-4 border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm shrink-0">
                  <i className="fa-solid fa-layer-group"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                      Sistem Blok Aktif
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {activeBlokToday.tanggal_mulai} s/d {activeBlokToday.tanggal_selesai}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {activeBlokToday.nama_kegiatan}
                  </h4>
                  {activeBlokToday.deskripsi && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      {activeBlokToday.deskripsi}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setView('view-sistem-blok')}
                className="btn-click self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center gap-1.5 transition"
              >
                <i className="fa-solid fa-gear text-[11px]"></i> Kelola Sistem Blok
              </button>
            </div>
          )}

          {/* Matrix Controls: Search & Filter Pills */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-table-cells text-emerald-600 dark:text-emerald-400"></i> Matriks Status Harian Guru
                </h3>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full whitespace-normal break-words">
                  {dashboardDateStr}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadAdminMatrix}
                  disabled={adminLoading}
                  className="btn-click px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-white rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 transition"
                >
                  <i className={`fa-solid fa-rotate-right ${adminLoading ? 'animate-spin' : ''}`}></i>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              {/* Search Box */}
              <div className="relative flex-1">
                <i className="fa-solid fa-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
                <input 
                  type="text"
                  value={matrixSearch}
                  onChange={e => setMatrixSearch(e.target.value)}
                  placeholder="Cari nama guru, NIP, atau mata pelajaran..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                />
                {matrixSearch && (
                  <button 
                    onClick={() => setMatrixSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scroll pb-1 sm:pb-0 shrink-0">
                {(['Semua', 'Tugas Lengkap', 'Belum Lengkap'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setMatrixFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                      matrixFilter === f
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Table / List */}
            {adminLoading && matrixList.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500 dark:text-gray-400">
                <i className="fa-solid fa-circle-notch fa-spin mr-2 text-base text-emerald-600"></i>
                Memuat data matriks status guru...
              </div>
            ) : filteredMatrix.length === 0 ? (
              <div className="text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 my-2">
                <i className="fa-solid fa-clipboard-user text-2xl text-gray-400 mb-2"></i>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {matrixSearch ? `Tidak ada guru yang cocok dengan pencarian "${matrixSearch}".` : 'Tidak ada data matriks.'}
                </p>
                {matrixSearch && (
                  <button
                    type="button"
                    onClick={() => setMatrixSearch('')}
                    className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto custom-scroll -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 text-[10px] uppercase font-extrabold tracking-wider">
                        <th scope="col" className="py-2.5 px-3 text-left rounded-l-lg">Guru & Mapel</th>
                        <th scope="col" className="py-2.5 px-3 text-center">1. Presensi Datang</th>
                        <th scope="col" className="py-2.5 px-3 text-center">2. Pengisian Jurnal</th>
                        <th scope="col" className="py-2.5 px-3 text-center">3. Laporan Piket</th>
                        <th scope="col" className="py-2.5 px-3 text-center">4. Presensi Pulang</th>
                        <th scope="col" className="py-2.5 px-3 text-center rounded-r-lg">Status Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-800/40">
                      {filteredMatrix.map((row) => {
                        // Badge color helpers
                        const getBadgeClass = (color: string) => {
                          if (color === 'green') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800';
                          if (color === 'amber') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                          if (color === 'blue') return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800';
                          if (color === 'rose') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                          return 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-400 border-gray-200 dark:border-gray-700';
                        };

                        return (
                          <tr key={row.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition">
                            {/* Guru Info */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                                  {row.nama_guru.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white leading-tight truncate">
                                    {row.nama_guru}
                                  </p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                    {row.nip !== '-' ? row.nip : row.mata_pelajaran}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* 1. Presensi Datang */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(row.presensiDatang.color)}`}>
                                {row.presensiDatang.status}
                              </span>
                            </td>

                            {/* 2. Pengisian Jurnal */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(row.pengisianJurnal.color)}`}>
                                {row.pengisianJurnal.status}
                              </span>
                            </td>

                            {/* 3. Laporan Piket */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(row.laporanPiket.color)}`}>
                                {row.laporanPiket.status}
                              </span>
                            </td>

                            {/* 4. Presensi Pulang */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeClass(row.presensiPulang.color)}`}>
                                {row.presensiPulang.status}
                              </span>
                            </td>

                            {/* Overall Status */}
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-sm ${
                                row.isTugasLengkap
                                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                              }`}>
                                {row.isTugasLengkap ? (
                                  <><i className="fa-solid fa-check mr-1"></i> Lengkap</>
                                ) : (
                                  <><i className="fa-solid fa-clock mr-1"></i> Belum Lengkap</>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Matrix Summary Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Menampilkan <strong>{filteredMatrix.length}</strong> dari <strong>{matrixList.length}</strong> guru</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setView('view-admin-verif')}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Buka Menu Verifikasi <i className="fa-solid fa-arrow-right text-[9px]"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
    </section>
  );
}
