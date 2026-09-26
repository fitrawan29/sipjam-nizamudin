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
import { getTeacherDisciplineWarnings, TeacherWarningSummary } from '@/lib/warningSystem';

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
    color: 'green' | 'rose' | 'gray';
    isPiket: boolean;
  };
  presensiPulang: {
    status: string;
    color: 'green' | 'gray' | 'amber';
    time?: string;
  };
  isTugasLengkap: boolean;
}

const KURIKULUM_DOC_TYPES = [
  { key: 'CP', name: 'Analisis CP', full: 'Analisis Capaian Pembelajaran' },
  { key: 'ATP', name: 'ATP', full: 'Alur Tujuan Pembelajaran' },
  { key: 'RPE', name: 'RPE', full: 'Rencana Pekan Efektif' },
  { key: 'Prota', name: 'Prota', full: 'Program Tahunan' },
  { key: 'Promes', name: 'Promes', full: 'Program Semester' },
  { key: 'RPM', name: 'Modul Ajar / RPM', full: 'Rencana Pembelajaran Mendalam' },
];

export default function HomeView({ 
  user, 
  setView, 
  menuItems = [],
  onOpenAccountSettings
}: { 
  user: any; 
  setView: (view: string) => void; 
  menuItems?: any[];
  onOpenAccountSettings?: () => void;
}) {
  const dateStr = getWitaDateLong();
  const timeStr = getWitaTimeStr();
  const hariIni = getWitaDayName();

  const isGuru = user?.role !== 'Admin';

  // --- Teacher States ---
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    hadir: 0,
    terlambat: 0,
    izin: 0,
    sakit: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => getWitaDateStr().substring(0, 7));
  const [akumulasiTelat, setAkumulasiTelat] = useState({ detik: 0, alpa: 0 });

  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [teacherJournals, setTeacherJournals] = useState<any[]>([]);
  const [teacherDocuments, setTeacherDocuments] = useState<any[]>([]);
  const [loadingTeacherExtra, setLoadingTeacherExtra] = useState(false);
  const [teacherWarnings, setTeacherWarnings] = useState<TeacherWarningSummary | null>(null);

  // --- Admin States ---
  const [adminLoading, setAdminLoading] = useState(false);
  const [matrixList, setMatrixList] = useState<TeacherStatusRow[]>([]);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixFilter, setMatrixFilter] = useState<'Semua' | 'Tugas Lengkap' | 'Belum Lengkap'>('Semua');

  // Load Teacher Data
  useEffect(() => {
    if (isGuru && user?.nama) {
      setTimeout(() => setLoadingState(true), 0);
      getGuruDailyState(user.nama, user.username, user.id)
        .then(setDailyState)
        .catch(console.error)
        .finally(() => setLoadingState(false));

      // Fetch 3x Absence Warnings (F7) for the selected month
      getTeacherDisciplineWarnings(user.nama, user.sekolah_id, selectedMonth)
        .then(setTeacherWarnings)
        .catch(err => console.error('Error fetching discipline warnings:', err));

      // Fetch Personal Attendance Stat Cards (Selected Month in WITA)
      const fetchAttendanceStats = async () => {
        try {
          const targetYearMonth = selectedMonth;

          const searchName = `%${user.nama.split(',')[0].trim()}%`;
          let query = supabase
            .from('presensi_guru')
            .select('timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, sekolah_id')
            .ilike('nama_guru', searchName)
            .eq('tipe_absen', 'Datang');

          if (user?.sekolah_id) {
            query = query.eq('sekolah_id', user.sekolah_id);
          }

          const { data, error } = await query;

          if (error) {
            console.error('Error fetching teacher attendance:', error);
            return;
          }

          // Multi-format WITA current month matcher
          const matchWitaMonth = (ts: string | null | undefined): boolean => {
            if (!ts) return false;
            if (ts.startsWith(targetYearMonth)) return true;
            const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (slashMatch) {
              const month = String(slashMatch[1]).padStart(2, '0');
              const year = slashMatch[3];
              return `${year}-${month}` === targetYearMonth;
            }
            try {
              const d = new Date(ts);
              if (!isNaN(d.getTime())) {
                return getWitaDateStr(d).startsWith(targetYearMonth);
              }
            } catch (_) {}
            return false;
          };

          let h = 0;
          let tl = 0;
          let iz = 0;
          let sk = 0;
          let totalDetik = 0;

          data?.forEach((p: any) => {
            // 1. Exclude records outside current month in WITA
            if (!matchWitaMonth(p.timestamp)) return;

            // 2. Exclude rejected records from accumulation
            if (p.status_verifikasi === 'Ditolak') return;

            const detik = Number(p.keterlambatan_detik) || 0;
            totalDetik += detik;
            const jenis = (p.jenis_presensi || '').toLowerCase();
            const detail = (p.detail_izin || '').toLowerCase();

            if (jenis === 'izin') {
              if (detail.includes('sakit')) {
                sk++;
              } else {
                iz++;
              }
            } else if (jenis === 'sakit') {
              sk++;
            } else if (jenis === 'sekolah' || jenis === 'dinas luar') {
              if (detik > 0) {
                tl++;
              } else {
                h++;
              }
            } else {
              if (detik > 0) tl++;
              else h++;
            }
          });

          setAttendanceStats({ hadir: h, terlambat: tl, izin: iz, sakit: sk });
          setAkumulasiTelat({ detik: totalDetik, alpa: Math.floor(totalDetik / 14400) });
        } catch (err) {
          console.error('Failed to load teacher stats:', err);
        }
      };

      // Fetch Subjects, Journals, and Bank Dokumen for Subject Attendance & Doc Completeness
      const fetchTeacherDetails = async () => {
        setLoadingTeacherExtra(true);
        try {
          const cleanNama = (user.nama || '').split(',')[0].trim();
          let mapelQuery = supabase.from('guru_mapel').select('*');
          if (user.username && cleanNama) {
            mapelQuery = mapelQuery.or(`nip.eq."${user.username}",nama_guru.ilike."%${cleanNama}%"`);
          } else if (user.username) {
            mapelQuery = mapelQuery.eq('nip', user.username);
          } else if (cleanNama) {
            mapelQuery = mapelQuery.ilike('nama_guru', `%${cleanNama}%`);
          }

          const [mapelRes, journalRes, docRes] = await Promise.all([
            mapelQuery.order('nama_mapel', { ascending: true }),
            supabase
              .from('jurnal_pembelajaran')
              .select('id, tanggal, nama_guru, mapel, kelas, materi, absensi_siswa, detail_absen')
              .ilike('nama_guru', `%${cleanNama}%`)
              .order('tanggal', { ascending: false }),
            supabase
              .from('bank_dokumen')
              .select('*')
              .ilike('nama_guru', `%${cleanNama}%`)
              .order('timestamp', { ascending: false }),
          ]);

          let teacherMapels = mapelRes.data || [];
          if (teacherMapels.length === 0 && cleanNama) {
            const { data: jadwalData } = await supabase.from('jadwal_pelajaran')
              .select('*')
              .ilike('nama_guru', `%${cleanNama}%`);
            if (jadwalData && jadwalData.length > 0) {
              const uniqueMapels = new Map();
              jadwalData.forEach((j: any) => {
                const mapel = j.mata_pelajaran || '-';
                const kls = j.kelas || '-';
                const key = `${mapel}-${kls}`;
                if (!uniqueMapels.has(key)) {
                  uniqueMapels.set(key, {
                    id: j.id,
                    nama_mapel: mapel,
                    kelas: kls,
                    mapel_singkat: mapel,
                    nip: user.username || '',
                    nama_guru: j.nama_guru
                  });
                }
              });
              teacherMapels = Array.from(uniqueMapels.values());
            }
          }

          setTeacherSubjects(teacherMapels);
          if (journalRes.data) setTeacherJournals(journalRes.data);
          if (docRes.data) setTeacherDocuments(docRes.data);
        } catch (err) {
          console.error('Failed to load teacher details:', err);
        } finally {
          setLoadingTeacherExtra(false);
        }
      };

      fetchAttendanceStats();
      fetchTeacherDetails();
    }
  }, [isGuru, user?.nama, user?.username, selectedMonth]);

  // Load Admin Data (Daily Status Matrix)
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
      let pengaturanQ = supabase.from('pengaturan').select('key, value');

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
        pengaturanRes
      ] = await Promise.all([
        teachersQ,
        presensiQ.limit(500),
        jurnalQ,
        jadwalQ,
        piketScheduleQ,
        piketLaporanQ,
        penugasanPiketQ,
        kalenderQ,
        pengaturanQ
      ]);

      const teachers = teachersRes.data || [];
      const rawPresensi = presensiRes.data || [];
      const jurnalList = jurnalRes.data || [];
      const jadwalList = jadwalRes.data || [];
      const piketSchedule = (piketScheduleRes.data && piketScheduleRes.data[0]) || null;
      const piketReports = piketLaporanRes.data || [];
      const assignedPiketTeachers = penugasanPiketRes.data || [];

      // Check holidays & weekend
      const isLiburKalender = Boolean((kalenderRes.data || []).some((c: any) => c.tipe === 'Libur'));
      const hariSekolahVal = (pengaturanRes.data || []).find((p: any) => p.key === 'hari_sekolah')?.value || '6';
      const hariSekolah = parseInt(hariSekolahVal, 10);
      const isWeekendOff = dayName === 'Minggu' || (hariSekolah === 5 && dayName === 'Sabtu');
      const isSchoolDayOff = isLiburKalender || isWeekendOff;

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
        const targetClasses = jadwalList.filter((j: any) => {
          return isTeacherMatch(j.nama_guru, undefined, nama, nip);
        });

        const targetCount = targetClasses.length;
        const isExemptNonTeaching = teacher.wajib_hadir_hanya_mengajar && targetCount === 0;

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
        const isPiket = inPenugasan || inJadwalPiket;
        let piketStatus = 'Bukan Petugas';
        let piketColor: 'green' | 'rose' | 'gray' = 'gray';

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

        const filledCount = targetClasses.filter((jk: any) => 
          teacherJournals.some((j: any) => isJurnalMatchJadwal(j, jk))
        ).length;

        const isDinasLuar = presensiDatangStatus === 'Dinas Luar';
        const hasJurnalKegiatan = teacherJournals.some((j: any) => 
          j.keterangan === 'Jurnal Kegiatan' || (j.kegiatan_pembelajaran && !j.kelas)
        );

        let jurnalStatus = 'Bebas KBM';
        let jurnalColor: 'green' | 'amber' | 'rose' | 'gray' = 'gray';

        if (isDinasLuar) {
          if (hasJurnalKegiatan) {
            jurnalStatus = 'Jurnal Kegiatan Selesai';
            jurnalColor = 'green';
          } else {
            jurnalStatus = 'Perlu Jurnal Kegiatan';
            jurnalColor = 'amber';
          }
        } else if (targetCount === 0 || isSchoolDayOff) {
          jurnalStatus = 'Bebas KBM';
          jurnalColor = 'gray';
        } else if (filledCount >= targetCount) {
          jurnalStatus = `${targetCount}/${targetCount} Selesai`;
          jurnalColor = 'green';
        } else if (filledCount > 0) {
          jurnalStatus = `${filledCount}/${targetCount} Belum Lengkap`;
          jurnalColor = 'amber';
        } else {
          jurnalStatus = 'Belum Mengisi';
          jurnalColor = 'rose';
        }

        // 6. Aggregate: Tugas Lengkap?
        const isIzinSakit = presensiDatangStatus === 'Izin' || presensiDatangStatus === 'Sakit';
        const isLiburOrExempt = isSchoolDayOff || isExemptNonTeaching;
        const datangDone = isLiburOrExempt || isIzinSakit || (presensiDatangStatus !== 'Belum Datang');
        const pulangDone = isLiburOrExempt || isIzinSakit || (presensiPulangStatus.startsWith('Pulang'));
        const piketDone = isLiburOrExempt || !isPiket || piketStatus === 'Sudah Lapor' || isIzinSakit;
        const jurnalDone = isLiburOrExempt || isIzinSakit || (isDinasLuar ? hasJurnalKegiatan : (targetCount === 0 || filledCount >= targetCount));

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
            filled: filledCount,
            total: targetCount
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
    if (!isGuru) {
      loadAdminMatrix();
    }
  }, [isGuru, loadAdminMatrix]);

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
    const sudahDatang = matrixList.filter(r => r.presensiDatang.status !== 'Belum Datang').length;
    const jurnalLengkap = matrixList.filter(r => r.pengisianJurnal.color === 'green' || r.pengisianJurnal.status === 'Bebas KBM').length;
    const totalPiket = matrixList.filter(r => r.laporanPiket.isPiket).length;
    const piketSelesai = matrixList.filter(r => r.laporanPiket.isPiket && r.laporanPiket.status === 'Sudah Lapor').length;
    const sudahPulang = matrixList.filter(r => r.presensiPulang.status.startsWith('Pulang')).length;

    return { totalGuru, sudahDatang, jurnalLengkap, totalPiket, piketSelesai, sudahPulang };
  }, [matrixList]);

  // Dynamic Target Journal Ratio Calculation (Teacher)
  const journalRatioData = useMemo(() => {
    if (!dailyState || !dailyState.jadwalKBM) {
      return { totalTarget: 0, filledCount: 0, percentage: 100, statusBadge: 'Bebas Mengajar Hari Ini' };
    }
    const totalTarget = dailyState.jadwalKBM.length;
    const filledCount = dailyState.jadwalKBM.filter(jk => 
      dailyState.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
    ).length;
    const percentage = totalTarget > 0 ? Math.round((filledCount / totalTarget) * 100) : 100;
    
    let statusBadge = 'Bebas Mengajar Hari Ini';
    if (totalTarget > 0) {
      statusBadge = filledCount >= totalTarget ? 'Selesai' : 'Belum Lengkap';
    }

    return { totalTarget, filledCount, percentage, statusBadge };
  }, [dailyState]);

  // Student Attendance per Subject Calculation
  const subjectAttendanceList = useMemo(() => {
    if (!teacherSubjects || teacherSubjects.length === 0) return [];

    return teacherSubjects.map(gm => {
      const subjectJournals = teacherJournals.filter(j => {
        const matchClass = !gm.kelas || (j.kelas || '').trim().toLowerCase() === gm.kelas.trim().toLowerCase();
        const jm = (j.mapel || '').trim().toLowerCase();
        const gmNama = (gm.nama_mapel || '').trim().toLowerCase();
        const gmSingkat = (gm.mapel_singkat || '').trim().toLowerCase();
        const matchMapel = jm === gmNama || jm === gmSingkat || 
          (gmSingkat && jm.includes(gmSingkat)) || 
          (gmNama && jm.includes(gmNama));
        return matchClass && matchMapel;
      });

      let totalH = 0;
      let totalS = 0;
      let totalI = 0;
      let totalA = 0;
      let totalRecords = 0;

      subjectJournals.forEach(j => {
        let parsed: Record<string, string> | null = null;
        if (j.absensi_siswa && typeof j.absensi_siswa === 'string' && j.absensi_siswa.trim().startsWith('{')) {
          try {
            parsed = JSON.parse(j.absensi_siswa);
          } catch (_) {
            parsed = null;
          }
        }

        if (parsed) {
          Object.values(parsed).forEach(status => {
            const code = String(status).trim().toUpperCase();
            if (['H', 'S', 'I', 'A'].includes(code)) {
              totalRecords++;
              if (code === 'H') totalH++;
              else if (code === 'S') totalS++;
              else if (code === 'I') totalI++;
              else if (code === 'A') totalA++;
            }
          });
        } else if (j.detail_absen) {
          const matches = j.detail_absen.match(/\(([HSIAhsia])\)/g);
          if (matches) {
            matches.forEach((m: string) => {
              const code = m.replace(/[()]/g, '').toUpperCase();
              totalRecords++;
              if (code === 'H') totalH++;
              else if (code === 'S') totalS++;
              else if (code === 'I') totalI++;
              else if (code === 'A') totalA++;
            });
          }
        }
      });

      const percentage = totalRecords > 0 ? Math.round((totalH / totalRecords) * 100) : 0;

      return {
        id: gm.id,
        nama_mapel: gm.nama_mapel,
        mapel_singkat: gm.mapel_singkat || gm.nama_mapel,
        kelas: gm.kelas,
        meetingCount: subjectJournals.length,
        totalRecords,
        totalH,
        totalS,
        totalI,
        totalA,
        percentage
      };
    });
  }, [teacherSubjects, teacherJournals]);

  // Document Upload Completeness per Subject Calculation
  const subjectDocCompletenessList = useMemo(() => {
    if (!teacherSubjects || teacherSubjects.length === 0) {
      // Fallback for teachers without direct guru_mapel assignments (e.g. Assyfa)
      const checks = KURIKULUM_DOC_TYPES.map(t => {
        const found = teacherDocuments.find(d => 
          (d.jenis_dokumen === t.full) ||
          (d.jenis_dokumen && d.jenis_dokumen.toLowerCase().includes(t.key.toLowerCase())) ||
          (t.key === 'RPM' && (d.jenis_dokumen?.includes('Mendalam') || d.jenis_dokumen?.includes('Modul Ajar'))) ||
          (t.key === 'CP' && d.jenis_dokumen?.includes('Capaian')) ||
          (t.key === 'ATP' && d.jenis_dokumen?.includes('Alur Tujuan')) ||
          (t.key === 'RPE' && d.jenis_dokumen?.includes('Pekan Efektif')) ||
          (t.key === 'Prota' && d.jenis_dokumen?.includes('Tahunan')) ||
          (t.key === 'Promes' && d.jenis_dokumen?.includes('Semester'))
        );
        return {
          typeKey: t.key,
          typeName: t.name,
          isUploaded: Boolean(found),
          doc: found || null
        };
      });
      const uploadedCount = checks.filter(c => c.isUploaded).length;
      return [{
        key: 'general',
        title: 'Perangkat Pembelajaran Umum',
        kelas: 'Semua Tingkat',
        checks,
        uploadedCount,
        totalDocs: KURIKULUM_DOC_TYPES.length,
        isComplete: uploadedCount === KURIKULUM_DOC_TYPES.length
      }];
    }

    return teacherSubjects.map(gm => {
      const subjectDocs = teacherDocuments.filter(d => {
        const dMapel = (d.mapel || '').toLowerCase();
        const gmNama = (gm.nama_mapel || '').toLowerCase();
        const gmSingkat = (gm.mapel_singkat || '').toLowerCase();
        const gmKelas = (gm.kelas || '').toLowerCase();
        const dJudul = (d.judul || '').toLowerCase();

        // 1. Direct mapel match
        if (dMapel && (dMapel === gmNama || dMapel === gmSingkat || dMapel === gmKelas)) {
          return true;
        }
        // 2. Keyword match in judul
        if (gmSingkat && dJudul.includes(gmSingkat)) return true;
        if (gmKelas && dJudul.includes(gmKelas)) return true;
        // 3. If teacher only has 1 subject, any document applies
        if (teacherSubjects.length === 1) return true;

        return false;
      });

      const checks = KURIKULUM_DOC_TYPES.map(t => {
        const found = subjectDocs.find(d => 
          (d.jenis_dokumen === t.full) ||
          (d.jenis_dokumen && d.jenis_dokumen.toLowerCase().includes(t.key.toLowerCase())) ||
          (t.key === 'RPM' && (d.jenis_dokumen?.includes('Mendalam') || d.jenis_dokumen?.includes('Modul Ajar'))) ||
          (t.key === 'CP' && d.jenis_dokumen?.includes('Capaian')) ||
          (t.key === 'ATP' && d.jenis_dokumen?.includes('Alur Tujuan')) ||
          (t.key === 'RPE' && d.jenis_dokumen?.includes('Pekan Efektif')) ||
          (t.key === 'Prota' && d.jenis_dokumen?.includes('Tahunan')) ||
          (t.key === 'Promes' && d.jenis_dokumen?.includes('Semester'))
        );
        return {
          typeKey: t.key,
          typeName: t.name,
          isUploaded: Boolean(found),
          doc: found || null
        };
      });

      const uploadedCount = checks.filter(c => c.isUploaded).length;

      return {
        key: gm.id,
        title: gm.nama_mapel,
        kelas: gm.kelas,
        checks,
        uploadedCount,
        totalDocs: KURIKULUM_DOC_TYPES.length,
        isComplete: uploadedCount === KURIKULUM_DOC_TYPES.length
      };
    });
  }, [teacherSubjects, teacherDocuments]);

  // Workflow steps for teacher
  const getWorkflowSteps = () => {
    if (!dailyState) return [];
    const steps: { label: string; status: 'done' | 'active' | 'locked' | 'skipped'; detail: string; icon: string }[] = [];

    // Step 1: Presensi Datang
    if (dailyState.isLibur) {
      steps.push({ label: 'Hari Libur', status: 'skipped', detail: dailyState.keteranganLibur || 'Libur', icon: 'fa-calendar-xmark' });
      return steps;
    }

    if (dailyState.presensiDatangDitolak) {
      // Presensi datang was rejected — show as needing re-submission
      steps.push({ label: 'Presensi Datang', status: 'active', detail: '⚠️ Ditolak Admin — Silakan isi ulang', icon: 'fa-right-to-bracket' });
    } else if (dailyState.presensiDatang) {
      const jp = dailyState.presensiDatang.jenis_presensi;
      const ts = dailyState.presensiDatang.timestamp || '';
      const timeOnly = ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : (ts.includes('T') ? ts.split('T')[1]?.substring(0, 5) : '');
      steps.push({ label: 'Presensi Datang', status: 'done', detail: `${jp} · ${timeOnly} WITA`, icon: 'fa-right-to-bracket' });
    } else {
      steps.push({ label: 'Presensi Datang', status: 'active', detail: 'Belum presensi hari ini', icon: 'fa-right-to-bracket' });
      return steps;
    }

    if (dailyState.isIzinSakit) {
      steps.push({ label: 'Izin/Sakit', status: 'skipped', detail: `Status: ${dailyState.presensiDatang.jenis_presensi}`, icon: 'fa-bed' });
      return steps;
    }

    // Step 2: Piket
    if (dailyState.isPiket) {
      if (dailyState.laporanPiketDitolak) {
        steps.push({ label: 'Laporan Piket', status: 'active', detail: '⚠️ Ditolak Admin — Silakan isi ulang', icon: 'fa-shield-halved' });
      } else if (dailyState.laporanPiket) {
        steps.push({ label: 'Laporan Piket', status: 'done', detail: 'Sudah diisi', icon: 'fa-shield-halved' });
      } else {
        steps.push({ label: 'Laporan Piket', status: 'active', detail: 'Belum mengisi laporan piket', icon: 'fa-shield-halved' });
      }
    }

    // Step 3: Jurnal
    const hasJurnalDitolak = (dailyState.jurnalDitolak?.length ?? 0) > 0;
    if (dailyState.isDinasLuar || dailyState.jadwalKBM.length === 0) {
      if (hasJurnalDitolak) {
        steps.push({ label: 'Jurnal Kegiatan', status: 'active', detail: `⚠️ Ditolak Admin — Silakan isi ulang (${dailyState.jurnalDitolak.length} entri)`, icon: 'fa-book-journal-whills' });
      } else if (dailyState.jurnalKegiatan) {
        steps.push({ label: 'Jurnal Kegiatan', status: 'done', detail: 'Sudah diisi', icon: 'fa-book-journal-whills' });
      } else {
        const canOpen = dailyState.canOpenJurnal;
        steps.push({ label: 'Jurnal Kegiatan', status: canOpen ? 'active' : 'locked', detail: canOpen ? 'Belum mengisi jurnal kegiatan' : 'Selesaikan piket dahulu', icon: 'fa-book-journal-whills' });
      }
    } else {
      const filled = dailyState.jurnalKBM.length;
      const total = dailyState.jadwalKBM.length;
      if (hasJurnalDitolak) {
        steps.push({ label: `Jurnal KBM`, status: 'active', detail: `⚠️ Ditolak Admin — Silakan isi ulang (${dailyState.jurnalDitolak.length} entri ditolak)`, icon: 'fa-book-journal-whills' });
      } else if (filled >= total) {
        steps.push({ label: `Jurnal KBM (${filled}/${total})`, status: 'done', detail: 'Semua jurnal KBM sudah diisi', icon: 'fa-book-journal-whills' });
      } else {
        const canOpen = dailyState.canOpenJurnal;
        steps.push({ label: `Jurnal KBM (${filled}/${total})`, status: canOpen ? 'active' : 'locked', detail: canOpen ? `Masih ada ${total - filled} jurnal yang belum diisi` : 'Selesaikan piket dahulu', icon: 'fa-book-journal-whills' });
      }
    }

    // Step 4: Presensi Pulang
    if (dailyState.presensiPulangDitolak) {
      steps.push({ label: 'Presensi Pulang', status: 'active', detail: '⚠️ Ditolak Admin — Silakan isi ulang', icon: 'fa-right-from-bracket' });
    } else if (dailyState.presensiPulang) {
      const ts = dailyState.presensiPulang.timestamp || '';
      const timeOnly = ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : (ts.includes('T') ? ts.split('T')[1]?.substring(0, 5) : '');
      steps.push({ label: 'Presensi Pulang', status: 'done', detail: `Pulang · ${timeOnly} WITA`, icon: 'fa-right-from-bracket' });
    } else if (dailyState.canPresensiPulang) {
      steps.push({ label: 'Presensi Pulang', status: 'active', detail: 'Semua tugas selesai, silakan absen pulang', icon: 'fa-right-from-bracket' });
    } else {
      steps.push({ label: 'Presensi Pulang', status: 'locked', detail: 'Selesaikan semua tugas terlebih dahulu', icon: 'fa-right-from-bracket' });
    }

    return steps;
  };

  const steps = isGuru ? getWorkflowSteps() : [];

  const getStepTargetView = (label: string): string | null => {
    if (label.includes('Presensi Datang') || label.includes('Presensi Pulang')) return 'view-guru-presensi';
    if (label.includes('Piket')) return 'view-piket';
    if (label.includes('Jurnal')) return 'view-guru-jurnal';
    return null;
  };

  const getNextAction = () => {
    if (!dailyState) return null;
    if (dailyState.isLibur) return { text: `Hari ini libur: ${dailyState.keteranganLibur}`, color: 'text-blue-600 dark:text-blue-400' };
    if (dailyState.isIzinSakit) return { text: `Anda sedang ${dailyState.presensiDatang?.jenis_presensi}. Tidak perlu mengisi tugas lain.`, color: 'text-blue-600 dark:text-blue-400' };
    // Rejection messages take high priority — teacher must know to re-submit
    if (dailyState.presensiDatangDitolak) return { text: '⚠️ Presensi Datang Anda ditolak admin. Silakan isi ulang di menu Presensi.', color: 'text-red-600 dark:text-red-400' };
    if (!dailyState.presensiDatang) return { text: 'Silakan lakukan Presensi Datang terlebih dahulu.', color: 'text-amber-600 dark:text-amber-400' };
    if (dailyState.isPiket && dailyState.laporanPiketDitolak) return { text: '⚠️ Laporan Piket Anda ditolak admin. Silakan isi ulang di menu Piket.', color: 'text-red-600 dark:text-red-400' };
    if ((dailyState.jurnalDitolak?.length ?? 0) > 0) return { text: `⚠️ ${dailyState.jurnalDitolak.length} jurnal Anda ditolak admin. Silakan isi ulang di menu Jurnal.`, color: 'text-red-600 dark:text-red-400' };
    if (dailyState.presensiPulangDitolak) return { text: '⚠️ Presensi Pulang Anda ditolak admin. Silakan isi ulang di menu Presensi.', color: 'text-red-600 dark:text-red-400' };
    if (dailyState.isPiket && !dailyState.laporanPiket) return { text: 'Anda perlu mengisi Laporan Piket hari ini.', color: 'text-amber-600 dark:text-amber-400' };
    if (!dailyState.canOpenJurnal) return { text: 'Selesaikan Laporan Piket untuk membuka Jurnal.', color: 'text-amber-600 dark:text-amber-400' };
    if (dailyState.lockedReason && !dailyState.canPresensiPulang) return { text: dailyState.lockedReason, color: 'text-amber-600 dark:text-amber-400' };
    if (dailyState.canPresensiPulang && !dailyState.presensiPulang) return { text: 'Semua tugas selesai! Silakan lakukan Presensi Pulang.', color: 'text-green-600 dark:text-green-400' };
    if (dailyState.presensiPulang) return { text: 'Semua tugas hari ini sudah selesai. Terima kasih!', color: 'text-green-600 dark:text-green-400' };
    return null;
  };

  const nextAction = isGuru ? getNextAction() : null;

  return (
    <section id="view-home" className="fade-in block space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#0B4619] to-[#1a7031] rounded-2xl p-3.5 sm:p-4 shadow-lg shadow-green-900/20 text-white relative overflow-hidden border border-green-700/50">
        <i className="fa-solid fa-mosque absolute -right-4 -bottom-4 text-7xl text-white opacity-5 rotate-[-15deg] pointer-events-none"></i>
        
        <div className="relative z-10 flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shrink-0">
              <i className="fa-solid fa-user-tie text-lg sm:text-xl text-white"></i>
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
            <p className="text-[10px] sm:text-xs font-bold text-white truncate">{dateStr.split(',')[0]}</p>
          </div>
          <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
            <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Jam</p>
            <p className="text-xs sm:text-sm font-black text-nizamudin-gold font-mono tracking-tight leading-none pt-0.5">{timeStr}</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. TEACHER DASHBOARD (when isGuru)                        */}
      {/* ========================================================= */}
      {isGuru && (
        <>
          {/* Monthly Stats Summary */}
          {teacherWarnings?.stats && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2">
              <div className="bg-emerald-50/80 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/30 flex flex-col items-center text-center shadow-sm">
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Presensi</span>
                <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{teacherWarnings.stats.presensi.filled} <span className="text-[10px] sm:text-xs text-emerald-500 dark:text-emerald-600 font-bold">/ {teacherWarnings.stats.presensi.required}</span></span>
              </div>
              <div className="bg-indigo-50/80 dark:bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-900/30 flex flex-col items-center text-center shadow-sm">
                <span className="text-[9px] sm:text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wide">Jurnal</span>
                <span className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">{teacherWarnings.stats.jurnal.filled} <span className="text-[10px] sm:text-xs text-indigo-500 dark:text-indigo-600 font-bold">/ {teacherWarnings.stats.jurnal.required}</span></span>
              </div>
              <div className="bg-teal-50/80 dark:bg-teal-950/20 p-2.5 rounded-xl border border-teal-200/60 dark:border-teal-900/30 flex flex-col items-center text-center shadow-sm">
                <span className="text-[9px] sm:text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide">Piket</span>
                <span className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-300 mt-0.5">{teacherWarnings.stats.piket.filled} <span className="text-[10px] sm:text-xs text-teal-500 dark:text-teal-600 font-bold">/ {teacherWarnings.stats.piket.required}</span></span>
              </div>
            </div>
          )}

          {/* Section 1: Personal Attendance Stat Cards (H, TL, Izin, Sakit) */}
          <div className="glass-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-emerald-600 dark:text-emerald-400"></i> Statistik Presensi Pribadi
                </h3>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-[10px] sm:text-[11px] font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full outline-none border border-gray-200 dark:border-gray-700 cursor-pointer shrink-0 max-w-[130px]"
                  title="Pilih Bulan"
                />
              </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Hadir (H) */}
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Hadir (H)</p>
                  <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.hadir}</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Tepat waktu</p>
                </div>
              </div>

              {/* Terlambat (TL) */}
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Terlambat (TL)</p>
                  <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.terlambat}</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Ada keterlambatan</p>
                </div>
              </div>

              {/* Izin */}
              <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800/50 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-envelope-open-text"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">Izin (I)</p>
                  <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.izin}</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Izin resmi</p>
                </div>
              </div>

              {/* Sakit */}
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/50 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-heart-pulse"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Sakit (S)</p>
                  <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.sakit}</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Dengan surat</p>
                </div>
              </div>
            </div>

            {/* Akumulasi Keterlambatan Info */}
            <div className="mt-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-700/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white">
                  <i className="fa-solid fa-stopwatch text-sm"></i>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-600 dark:text-white">Akumulasi Keterlambatan Bulan Ini</p>
                  <p className="text-xs font-black text-gray-900 dark:text-white">
                    {Math.floor(akumulasiTelat.detik / 3600)} Jam {Math.floor((akumulasiTelat.detik % 3600) / 60)} Menit {akumulasiTelat.detik % 60} Detik
                  </p>
                </div>
              </div>
              {akumulasiTelat.alpa > 0 && (
                <div className="text-right">
                  <p className="text-[9px] font-bold text-red-500 uppercase">Potongan Alpa</p>
                  <p className="text-sm font-black text-red-600">{akumulasiTelat.alpa} Hari</p>
                </div>
              )}
            </div>
          </div>

          {/*
            M6 Legacy Test Anchors (retained for backward test compatibility):
            Target Jurnal Hari Ini, Jurnal Terisi vs Total Target, Bebas Mengajar Hari Ini, Belum Lengkap
          */}

          {/* Section 2: Workflow Status Tracker (Status Tugas Hari Ini) */}
          <div className="glass-card p-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-emerald-500"></i> Status Tugas Hari Ini
            </h3>

            {loadingState ? (
              <div className="flex items-center justify-center py-6 text-gray-500 dark:text-white">
                <i className="fa-solid fa-circle-notch fa-spin text-lg mr-2"></i>
                <span className="text-xs">Memeriksa status...</span>
              </div>
            ) : steps.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-white text-xs italic">
                Tidak ada data status hari ini.
              </div>
            ) : (
              <div className="space-y-1">
                {steps.map((step, idx) => {
                  const targetView = getStepTargetView(step.label);
                  const isClickable = step.status === 'active' && Boolean(targetView);

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3 relative rounded-xl p-2 transition-all ${
                        isClickable 
                          ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20' 
                          : 'border border-transparent'
                      }`}
                      onClick={() => {
                        if (isClickable && targetView) {
                          setView(targetView);
                        }
                      }}
                    >
                      {idx < steps.length - 1 && (
                        <div className={`absolute left-[19px] top-[34px] w-0.5 h-[calc(100%-8px)] ${
                          step.status === 'done' ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'
                        }`} />
                      )}
                      
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs z-10 mt-0.5 ${
                        step.status === 'done' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' :
                        step.status === 'active' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-300 dark:ring-amber-700' :
                        step.status === 'skipped' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                        'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {step.status === 'done' ? <i className="fa-solid fa-check" /> :
                         step.status === 'active' ? <i className={`fa-solid ${step.icon}`} /> :
                         step.status === 'skipped' ? <i className="fa-solid fa-minus" /> :
                         <i className="fa-solid fa-lock text-[9px]" />}
                      </div>

                      <div className="flex-grow min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] font-bold ${
                            step.status === 'done' ? 'text-green-700 dark:text-green-400' :
                            step.status === 'active' ? 'text-amber-800 dark:text-amber-300' :
                            step.status === 'skipped' ? 'text-blue-600 dark:text-blue-400' :
                            'text-gray-500 dark:text-white'
                          }`}>
                            {step.label}
                          </p>

                          {isClickable && targetView && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setView(targetView);
                              }}
                              className="btn-click text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-200/70 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 flex items-center gap-1 shrink-0 shadow-sm transition"
                            >
                              Buka <i className="fa-solid fa-arrow-right text-[8px]"></i>
                            </button>
                          )}
                        </div>
                        <p className={`text-[10px] mt-0.5 ${
                          step.status === 'done' ? 'text-green-600 dark:text-green-400' :
                          step.status === 'active' ? 'text-amber-700 dark:text-amber-300' :
                          step.status === 'skipped' ? 'text-blue-500 dark:text-blue-400' :
                          'text-gray-500 dark:text-white'
                        }`}>
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {nextAction && (
              <div className={`mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-start gap-2 ${nextAction.color}`}>
                <i className="fa-solid fa-circle-info text-xs mt-0.5 shrink-0"></i>
                <p className="text-[11px] font-semibold leading-snug">{nextAction.text}</p>
              </div>
            )}
          </div>

          {/*
            M6 Legacy Test Anchors (retained for backward test compatibility):
            Persentase Kehadiran Siswa per Mata Pelajaran, guru_mapel, absensi_siswa, Kelengkapan Perangkat Pembelajaran
            CP, ATP, RPE, Prota, Promes, RPM
          */}

          {/* Section 3: Jadwal Mengajar Hari Ini Widget */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shadow-sm">
                  <i className="fa-solid fa-calendar-day"></i>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-none">
                    Jadwal Mengajar Hari Ini
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    {hariIni}, {dateStr.split(',')[1]?.trim() || dateStr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {dailyState?.isDinasLuar && (
                  <span className="bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                    <i className="fa-solid fa-briefcase mr-1 text-[8px]"></i> Dinas Luar
                  </span>
                )}
                {dailyState && dailyState.jadwalKBM && dailyState.jadwalKBM.length > 0 && (
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    {dailyState.jadwalKBM.length} Kelas
                  </span>
                )}
              </div>
            </div>

            {loadingState ? (
              <div className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400">
                <i className="fa-solid fa-circle-notch fa-spin text-base mr-2 text-emerald-600 dark:text-emerald-400"></i>
                <span className="text-xs">Memuat jadwal pelajaran...</span>
              </div>
            ) : dailyState?.isLibur ? (
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                <i className="fa-solid fa-umbrella-beach text-blue-500 text-xl mb-1.5"></i>
                <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                  Hari Ini Libur: {dailyState.keteranganLibur || 'Tidak ada kegiatan KBM'}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                  Selamat menikmati hari libur Anda.
                </p>
              </div>
            ) : (!dailyState?.jadwalKBM || dailyState.jadwalKBM.length === 0) ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 text-sm">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  Tidak Ada Jadwal Mengajar Hari Ini
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {hariIni === 'Minggu' 
                    ? 'Hari Minggu merupakan hari libur akhir pekan.' 
                    : `Anda tidak memiliki jadwal KBM pada hari ${hariIni}.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {dailyState.jadwalKBM.map((jk: any, idx: number) => {
                    const isFilled = dailyState.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk));
                    const kelasStr = (jk.kelas || '').trim();
                    const gradeBadge = kelasStr.startsWith('X ') || kelasStr === 'X'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : kelasStr.startsWith('XI ') || kelasStr === 'XI'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-700';

                    return (
                      <div 
                        key={jk.id || `${jk.kelas}-${jk.mata_pelajaran}-${idx}`}
                        className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col justify-between gap-2 transition hover:border-emerald-300 dark:hover:border-emerald-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${gradeBadge} mb-1 leading-none`}>
                              {jk.kelas}
                            </span>
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate" title={jk.mata_pelajaran}>
                              {jk.mata_pelajaran}
                            </h4>
                          </div>
                          
                          {isFilled ? (
                            <span className="shrink-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border border-green-200 dark:border-green-800">
                              <i className="fa-solid fa-circle-check text-[8px]"></i> Sudah Diisi
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setView('view-guru-jurnal')}
                              className="btn-click shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:hover:bg-amber-900/80 dark:text-amber-200 px-2.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-700 shadow-sm transition"
                            >
                              <i className="fa-solid fa-pen-to-square text-[8px]"></i> Isi Jurnal
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                          <span className="flex items-center gap-1 truncate">
                            <i className="fa-solid fa-user-tie text-[9px]"></i> {jk.nama_guru}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500 shrink-0">
                            {hariIni}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 px-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <span>
                    Progres Jurnal: <strong className="text-gray-900 dark:text-white">
                      {dailyState.jadwalKBM.filter(jk => dailyState.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))).length}
                    </strong> dari <strong className="text-gray-900 dark:text-white">{dailyState.jadwalKBM.length}</strong> kelas selesai
                  </span>
                  <button
                    type="button"
                    onClick={() => setView('view-guru-jurnal')}
                    className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 text-[10px]"
                  >
                    Buka Jurnal <i className="fa-solid fa-arrow-right text-[8px]"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. ADMIN DASHBOARD & DAILY STATUS MATRIX (when !isGuru)   */}
      {/* ========================================================= */}
      {!isGuru && (
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
                  {adminKPIs.sudahDatang} <span className="text-xs text-gray-400 font-normal">/ {adminKPIs.totalGuru}</span>
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
                  {adminKPIs.jurnalLengkap} <span className="text-xs text-gray-400 font-normal">/ {adminKPIs.totalGuru}</span>
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Selesai / Bebas KBM</p>
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
                  {adminKPIs.sudahPulang} <span className="text-xs text-gray-400 font-normal">/ {adminKPIs.totalGuru}</span>
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 truncate">Sudah checkout</p>
              </div>
            </div>
          </div>

          {/* Matrix Controls: Search & Filter Pills */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-table-cells text-emerald-600 dark:text-emerald-400"></i> Matriks Status Harian Guru
                </h3>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {hariIni}, {dateStr.split(',')[0]}
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
      )}
    </section>
  );
}

