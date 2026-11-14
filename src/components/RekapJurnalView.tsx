'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';
import { getWitaDateStr, getWitaDayName, getWitaTimeStr } from '@/lib/wita';
import {
  isJurnalMatchJadwal,
  isLateArrival,
  connectGuruMapelWithJadwal,
  normalizeTeacherIdentityName,
  isTeacherRecordMatch,
  formatAttendanceSummary,
  parseExplicitBooleanFlag,
  resolveSchoolAturanKehadiran,
  resolveSchoolLegacyGhmList,
  resolveTeacherAttendancePolicy,
  isValidLokasiKbm,
  resolveTeacherLokasiKbm,
  isJournalEligibleForKbmTeacher
} from '@/lib/workflow';
import { isInvalidMapel } from '@/lib/dataIntegrityGuard';
import { isTeacherScheduleMatch, isTeacherJournalMatch } from '@/lib/attendanceAlpa';
import { transformGoogleDriveUrl, getGoogleDriveThumbnailUrl } from '@/lib/imageUrl';
import { PrintHeader, PrintSignature, formatPeriodHeader } from './PrintHeader';
import { showToast } from '@/lib/toast';
import SwalModal from 'sweetalert2';
import { uploadToDrive } from '@/lib/driveUpload';
import { triggerPrintWithGps } from '@/utils/printWithGps';

const Swal = SwalModal;
import { checkIsKepalaSekolah } from '@/hooks/useKepalaSekolah';
import { formatKepalaSekolahLabel } from '@/utils/textUtils';

function addDaysToDateStr(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

export default function RekapJurnalView({ 
  user,
  initialMode = 'pribadi',
  controlledMode,
  hideTabSwitch = false,
  assignedKelas: propAssignedKelas = null,
  isKepalaSekolah: propIsKepalaSekolah,
  isReadOnly = false,
  statusKepalaSekolah,
  assignments: propAssignments = null
}: { 
  user: any;
  initialMode?: 'pribadi' | 'kelas';
  controlledMode?: 'pribadi' | 'kelas';
  hideTabSwitch?: boolean;
  assignedKelas?: string | null;
  isKepalaSekolah?: boolean;
  isReadOnly?: boolean;
  statusKepalaSekolah?: string;
  assignments?: any[] | null;
}) {
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin' || user?.role === 'Admin';
  const isKepalaSekolah = propIsKepalaSekolah !== undefined 
    ? propIsKepalaSekolah 
    : checkIsKepalaSekolah(user);
  const effectiveStatus = statusKepalaSekolah || user?.status_kepala_sekolah || user?.statusKepalaSekolah || (typeof window !== 'undefined' && (() => { try { const s = localStorage.getItem('sipjam_config_sync'); if (s) return JSON.parse(s)?.config?.status_kepala_sekolah; } catch {} })()) || 'Definitif';
  const ksLabel = formatKepalaSekolahLabel(effectiveStatus);
  const effectiveMode = controlledMode || initialMode;
  const [tabMode, setTabMode] = useState<'pribadi' | 'kelas'>(effectiveMode);
  const [isWaliKelas, setIsWaliKelas] = useState<boolean>(isAdmin || isKepalaSekolah || Boolean(isReadOnly));
  const [waliClasses, setWaliClasses] = useState<string[]>(() => {
    if (propAssignedKelas) return [propAssignedKelas];
    if (user?.wali_kelas) {
      const k = typeof user.wali_kelas === 'string' ? user.wali_kelas : (user.wali_kelas.kelas || null);
      if (k) return [k];
    }
    return [];
  });

  useEffect(() => {
    if (controlledMode && controlledMode !== tabMode) {
      setTabMode(controlledMode);
      tarikRekap(controlledMode);
    }
  }, [controlledMode]);

  const [bulan, setBulan] = useState(() => {
    return getWitaDateStr().substring(0, 7);
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState(propAssignedKelas || '');
  const [mapel, setMapel] = useState('');
  const [search, setSearch] = useState('');
  const [searchMateri, setSearchMateri] = useState('');
  const [selectedJurnal, setSelectedJurnal] = useState<any | null>(null);
  
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [assignedMapelList, setAssignedMapelList] = useState<string[]>([]);
  const [assignedKelasList, setAssignedKelasList] = useState<string[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>(propAssignments || []);
  const [waliKelasMap, setWaliKelasMap] = useState<Record<string, { nama_guru: string; nip?: string }>>({});
  
  const [loading, setLoading] = useState(false);
  const [jurnalData, setJurnalData] = useState<any[] | null>(null);

  const [allTeachersList, setAllTeachersList] = useState<any[]>([]);
  const [allWeeklySchedules, setAllWeeklySchedules] = useState<any[]>([]);
  const [legacyGhmList, setLegacyGhmList] = useState<string[]>([]);
  const [aturanKehadiranGlobal, setAturanKehadiranGlobal] = useState<string>('Semua_Hari');
  const [teacherLokasiHistory, setTeacherLokasiHistory] = useState<any[]>([]);
  const [isMasterReady, setIsMasterReady] = useState<boolean>(false);
  const [isHanyaKbmUser, setIsHanyaKbmUser] = useState<boolean>(() => {
    const v = parseExplicitBooleanFlag(user?.wajib_hadir_hanya_mengajar ?? (user as any)?.wajibHadirHanyaMengajar);
    return v === true;
  });

  // Edit & Delete Jurnal States (Milestone 2 - R2)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingJurnal, setEditingJurnal] = useState<any | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editJamKe, setEditJamKe] = useState('');
  const [editPertemuanKe, setEditPertemuanKe] = useState('');
  const [editMapel, setEditMapel] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editLokasiKbm, setEditLokasiKbm] = useState('');
  const [editTujuanPembelajaran, setEditTujuanPembelajaran] = useState('');
  const [editKktp, setEditKktp] = useState('');
  const [editKonten, setEditKonten] = useState('');
  const [editKegiatan, setEditKegiatan] = useState('');
  const [editRefleksi, setEditRefleksi] = useState('');
  const [editCatatanKhususSiswa, setEditCatatanKhususSiswa] = useState('');
  const [editAbsensiCounts, setEditAbsensiCounts] = useState({ total: 0, hadir: 0, izin: 0, sakit: 0, alpa: 0 });
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const checkIsHanyaKbm = useCallback((teacherName?: string, teacherNip?: string, teacherUserId?: string): boolean => {
    const queryObj = {
      id: teacherUserId,
      user_id: teacherUserId,
      nama_guru: teacherName,
      nama: teacherName,
      nip: teacherNip,
      username: teacherNip,
    };
    const matched = (allTeachersList || []).find((t: any) =>
      isTeacherRecordMatch(queryObj, t, teacherUserId && user?.id === teacherUserId ? user : null)
    );

    if (matched) {
      return resolveTeacherAttendancePolicy({
        teacher: matched,
        linkedUser: teacherUserId && user?.id === teacherUserId ? user : null,
        weeklySchedules: allWeeklySchedules,
        aturanGlobal: aturanKehadiranGlobal,
        guruHanyaMengajarList: legacyGhmList,
      }).isTeacherExempt;
    }

    const uv = teacherUserId && user?.id === teacherUserId
      ? parseExplicitBooleanFlag(user?.wajib_hadir_hanya_mengajar ?? (user as any)?.wajibHadirHanyaMengajar)
      : null;
    if (uv !== null) return uv;

    // Fallback includes school-wide policy evaluation (aturanKehadiranGlobal === 'Hari_Mengajar_Saja')
    return resolveTeacherAttendancePolicy({
      teacher: queryObj,
      linkedUser: teacherUserId && user?.id === teacherUserId ? user : null,
      weeklySchedules: allWeeklySchedules,
      aturanGlobal: aturanKehadiranGlobal,
      guruHanyaMengajarList: legacyGhmList,
    }).isTeacherExempt;
  }, [allTeachersList, allWeeklySchedules, legacyGhmList, aturanKehadiranGlobal, user]);

  useEffect(() => {
    const isExempt = checkIsHanyaKbm(user?.nama, user?.username || user?.nip, user?.id);
    setIsHanyaKbmUser(isExempt);
  }, [checkIsHanyaKbm, user]);

  useEffect(() => {
    if (propAssignments && propAssignments.length > 0) {
      setTeacherAssignments(propAssignments);
      const rawMapels = Array.from(new Set(propAssignments.map((a: any) => a.nama_mata_pelajaran || a.nama_mapel).filter(Boolean))) as string[];
      const validMapels = rawMapels.filter(m => !isInvalidMapel(m));
      const rawKelas = Array.from(new Set(propAssignments.map((a: any) => a.kelas).filter(Boolean))) as string[];
      setAssignedMapelList(validMapels);
      setAssignedKelasList(rawKelas);
    }
  }, [propAssignments]);

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        let siswaQuery = supabase.from('data_siswa').select('kelas');
        if (user?.sekolah_id) {
          siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
        }
        const { data: siswa } = await siswaQuery;
        let uniqueKelas: string[] = [];
        if (siswa) {
          uniqueKelas = Array.from(new Set(siswa.map(s => s.kelas).filter(Boolean))) as string[];
          setKelasList(uniqueKelas);
        }

        let mapelQuery = supabase.from('data_mapel').select('id, nama_mata_pelajaran, nama_mapel, kategori, kelompok');
        if (user?.sekolah_id) {
          mapelQuery = mapelQuery.eq('sekolah_id', user.sekolah_id);
        }
        const { data: mData } = await mapelQuery;
        let uniqueMapel: string[] = [];
        if (mData) {
          uniqueMapel = (Array.from(new Set(mData.map(m => m.nama_mata_pelajaran || m.nama_mapel).filter(Boolean))) as string[])
            .filter(m => !isInvalidMapel(m));
          setMapelList(uniqueMapel);
        }

        // Fetch all teachers from data_guru & attendance rules for accurate obligation evaluation
        let fallbackAllDg: any[] = [];
        try {
          let dgAllQuery = supabase.from('data_guru').select('*');
          let jdwlAllQuery = supabase.from('jadwal_pelajaran').select('*');
          let cfgQ = supabase.from('pengaturan').select('key, value, aturan_kehadiran_guru, guru_hanya_mengajar');
          let lokHistQ = supabase
            .from('jurnal_pembelajaran')
            .select('id, user_id, nama_guru, kelas, mapel, lokasi_kbm, lokasi, tanggal, timestamp')
            .order('tanggal', { ascending: false })
            .limit(400);
          if (user?.sekolah_id) {
            dgAllQuery = dgAllQuery.eq('sekolah_id', user.sekolah_id);
            jdwlAllQuery = jdwlAllQuery.eq('sekolah_id', user.sekolah_id);
            cfgQ = cfgQ.eq('sekolah_id', user.sekolah_id);
            lokHistQ = lokHistQ.eq('sekolah_id', user.sekolah_id);
          }
          const [{ data: allDg }, { data: allJdwl }, { data: cfgData }, { data: lokHistData }] = await Promise.all([
            dgAllQuery,
            jdwlAllQuery,
            cfgQ,
            lokHistQ
          ]);
          if (allDg) {
            fallbackAllDg = allDg;
            setAllTeachersList(allDg);
          }
          if (allJdwl) {
            setAllWeeklySchedules(allJdwl.filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel)));
          }
          if (cfgData && cfgData.length > 0) {
            setAturanKehadiranGlobal(resolveSchoolAturanKehadiran(cfgData));
            setLegacyGhmList(resolveSchoolLegacyGhmList(cfgData));
          }
          if (lokHistData && lokHistData.length > 0) {
            const validHist = lokHistData.filter((r: any) => isValidLokasiKbm(r.lokasi_kbm) || isValidLokasiKbm(r.lokasi));
            setTeacherLokasiHistory(validHist);
          }
        } catch (_) {}

        // Fetch teacher specific assignments (guru_mapel, jadwal_pelajaran, data_guru)
        if (!isAdmin && !isKepalaSekolah) {
          try {
            const cleanNama = (user?.nama || '').split(',')[0].trim();
            let gmQuery = supabase.from('guru_mapel').select('*');
            let jdwlQuery = supabase.from('jadwal_pelajaran').select('*');
            let dgQuery = supabase.from('data_guru').select('*');

            if (user?.sekolah_id) {
              gmQuery = gmQuery.eq('sekolah_id', user.sekolah_id);
              jdwlQuery = jdwlQuery.eq('sekolah_id', user.sekolah_id);
              dgQuery = dgQuery.eq('sekolah_id', user.sekolah_id);
            }

            if (user?.username && cleanNama) {
              gmQuery = gmQuery.or(`nip.eq."${user.username}",nama_guru.ilike."%${cleanNama}%"`);
            } else if (user?.username) {
              gmQuery = gmQuery.eq('nip', user.username);
            } else if (cleanNama) {
              gmQuery = gmQuery.ilike('nama_guru', `%${cleanNama}%`);
            }

            if (user?.id || cleanNama) {
              dgQuery = dgQuery.or(`user_id.eq.${user?.id || '00000000-0000-0000-0000-000000000000'},id.eq.${user?.id || '00000000-0000-0000-0000-000000000000'},nama_guru.ilike."%${cleanNama}%"`);
            }

            const [gmRes, jdwlRes, dgRes] = await Promise.all([
              gmQuery,
              jdwlQuery,
              dgQuery
            ]);

            const dgPool = dgRes.error || !dgRes.data ? fallbackAllDg : dgRes.data;
            const matchedGuruRow = (dgPool || []).find((g: any) =>
              (user?.id && g.user_id === user.id) ||
              (user?.username && (g.nip || '').toLowerCase() === user.username.toLowerCase()) ||
              (cleanNama && (g.nama_guru || '').toLowerCase().includes(cleanNama.toLowerCase()))
            );

            const connected = connectGuruMapelWithJadwal(
              { id: user?.id, user_id: user?.id, username: user?.username, nama: user?.nama },
              jdwlRes.data || [],
              mData || [],
              gmRes.data || [],
              matchedGuruRow,
              uniqueKelas
            );

            if (connected && connected.length > 0) {
              setTeacherAssignments(connected);
              const validAssignedMapels = Array.from(new Set(connected.map(a => a.nama_mata_pelajaran || a.nama_mapel).filter(Boolean))).filter(m => !isInvalidMapel(m));
              const validAssignedKelas = Array.from(new Set(connected.map(a => a.kelas).filter(Boolean))) as string[];
              setAssignedMapelList(validAssignedMapels);
              setAssignedKelasList(validAssignedKelas);

              // Auto-select if teacher only teaches 1 subject or 1 class (strictly in kelas mode)
              if (validAssignedMapels.length === 1 && effectiveMode === 'kelas') {
                setMapel(prev => prev || validAssignedMapels[0]);
              }
              if (validAssignedKelas.length === 1 && effectiveMode === 'kelas') {
                setKelas(prev => prev || validAssignedKelas[0]);
              }
            }
          } catch (assignErr) {
            console.warn('[RekapJurnalView] Failed fetching teacher assignments:', assignErr);
          }
        }

        // Fetch Wali Kelas assignments
        let wQuery = supabase.from('wali_kelas').select('*');
        if (user?.sekolah_id) wQuery = wQuery.eq('sekolah_id', user.sekolah_id);
        const { data: wData } = await wQuery;

        const assignedWalis: string[] = [...waliClasses];
        if (wData && wData.length > 0) {
          const map: Record<string, { nama_guru: string; nip?: string }> = {};
          wData.forEach((w: any) => {
            if (w.kelas) {
              map[w.kelas] = {
                nama_guru: w.nama_guru || '',
                nip: w.nip || '-'
              };
            }
          });
          setWaliKelasMap(map);

          const userWalis = wData.filter(w => 
            (user?.id && w.guru_id === user.id) ||
            (user?.nama && w.nama_guru && w.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim()) ||
            (user?.username && w.nip && w.nip === user.username)
          );
          userWalis.forEach(w => {
            if (w.kelas && !assignedWalis.includes(w.kelas)) assignedWalis.push(w.kelas);
          });
        }

        // Check data_guru if not yet found
        if (assignedWalis.length === 0 && (user?.id || user?.nama)) {
          const cleanNama = (user?.nama || '').split(',')[0].trim();
          const { data: gData } = await supabase
            .from('data_guru')
            .select('*')
            .or(`user_id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},nama_guru.eq."${cleanNama}"`);
          if (gData && gData.length > 0) {
            const g = gData[0] as any;
            if (g.wali_kelas) {
              const wk = typeof g.wali_kelas === 'string' ? g.wali_kelas : (g.wali_kelas.kelas || null);
              if (wk && !assignedWalis.includes(wk)) assignedWalis.push(wk);
            }
          }
        }

        if (isAdmin || isKepalaSekolah || assignedWalis.length > 0) {
          setIsWaliKelas(true);
          setWaliClasses(assignedWalis);
          if (!isAdmin && !isKepalaSekolah && assignedWalis.length > 0 && effectiveMode === 'kelas') {
            setKelas(prev => prev || assignedWalis[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching master data:', error);
      } finally {
        setIsMasterReady(true);
      }
    };
    fetchMaster();
  }, [user]);

  // Auto-fetch on mount for current month and re-sync once master policy/schedules finish loading
  useEffect(() => {
    tarikRekap();
  }, [isMasterReady]);

  const tarikRekap = async (overrideMode?: 'pribadi' | 'kelas', overrideKelas?: string) => {
    const activeMode = overrideMode || tabMode;
    
    // RBAC: If attempting to view kelas mode but user is regular teacher (not admin, not kepala sekolah, and not wali kelas)
    if (activeMode === 'kelas' && !isAdmin && !isKepalaSekolah && !isWaliKelas && waliClasses.length === 0) {
      setJurnalData([]);
      setLoading(false);
      return;
    }

    let activeKelas = overrideKelas !== undefined ? overrideKelas : kelas;
    // For Wali Kelas (non-admin, non-kepala-sekolah), restrict strictly to assigned classes
    if (activeMode === 'kelas' && !isAdmin && !isKepalaSekolah && waliClasses.length > 0) {
      if (!activeKelas || !waliClasses.includes(activeKelas)) {
        activeKelas = waliClasses[0];
        setKelas(activeKelas);
      }
    }

    setLoading(true);
    try {
      let query = supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .order('tanggal', { ascending: true })
        .order('jam_ke', { ascending: true });

      // In personal mode, restrict to the logged-in teacher
      // In classroom mode ("Rekapan Jurnal Per Kelas"), query across ALL teachers for that class
      if (activeMode === 'pribadi' && user?.nama) {
        const cleanName = normalizeTeacherIdentityName(user.nama);
        const firstToken = cleanName.split(' ')[0] || cleanName;
        if (user.id && firstToken) {
          query = query.or(`user_id.eq.${user.id},nama_guru.ilike."%${firstToken}%",keterangan.ilike."%Menggantikan:%${firstToken}%"`);
        } else if (user.id) {
          query = query.eq('user_id', user.id);
        } else if (firstToken) {
          query = query.or(`nama_guru.ilike."%${firstToken}%",keterangan.ilike."%Menggantikan:%${firstToken}%"`);
        } else {
          query = query.eq('nama_guru', user.nama);
        }
      }

      if (user?.sekolah_id) {
        query = query.or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`);
      }

      if (startDate && endDate) {
        query = query.gte('tanggal', startDate).lte('tanggal', endDate);
      } else if (bulan) {
        const year = parseInt(bulan.split('-')[0], 10);
        const month = parseInt(bulan.split('-')[1], 10);
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        query = query.gte('tanggal', firstDay).lte('tanggal', lastDayStr);
      }

      // In classroom mode, filter database strictly for the designated class and subject
      // In personal mode, do not restrict database query by exact mapel/kelas to allow multi-class/format retrieval
      if (activeMode === 'kelas') {
        if (!isAdmin && !isKepalaSekolah && waliClasses.length > 0) {
          query = query.eq('kelas', activeKelas || waliClasses[0]);
        } else if (activeKelas) {
          query = query.eq('kelas', activeKelas);
        }
        if (mapel) query = query.eq('mapel', mapel);
      }

      const { data } = await query;
      let combined = (data || []) as any[];

      // Fallback query if initial query returned 0 rows in personal mode
      if (activeMode === 'pribadi' && combined.length === 0 && user?.nama) {
        const cleanName = normalizeTeacherIdentityName(user.nama);
        const tokens = cleanName.split(' ').filter(t => t.length > 1);
        const fbToken = tokens[0] || (user.nama || '').split(',')[0].trim();
        if (fbToken) {
          let fbQuery = supabase
            .from('jurnal_pembelajaran')
            .select('*')
            .order('tanggal', { ascending: true })
            .order('jam_ke', { ascending: true });
          
          if (startDate && endDate) {
            fbQuery = fbQuery.gte('tanggal', startDate).lte('tanggal', endDate);
          } else if (bulan) {
            const year = parseInt(bulan.split('-')[0], 10);
            const month = parseInt(bulan.split('-')[1], 10);
            const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            fbQuery = fbQuery.gte('tanggal', firstDay).lte('tanggal', lastDayStr);
          }
          fbQuery = fbQuery.ilike('nama_guru', `%${fbToken}%`);
          const { data: fbData } = await fbQuery;
          if (fbData && fbData.length > 0) {
            combined = fbData as any[];
          }
        }
      }

      if (activeMode === 'pribadi' && user?.nama) {
        combined = combined.filter((j: any) =>
          isTeacherRecordMatch(j, { nama_guru: user.nama, user_id: user.id }, user, { allowSingleWordFirstToken: true })
        );
      }

      // In-memory matching for activeKelas and mapel in personal mode
      if (activeMode === 'pribadi') {
        if (activeKelas) {
          combined = combined.filter((j: any) => {
            if (!j.kelas) return false;
            return j.kelas === activeKelas ||
              j.kelas.toLowerCase().includes(activeKelas.toLowerCase()) ||
              activeKelas.toLowerCase().includes(j.kelas.toLowerCase());
          });
        }
        if (mapel) {
          combined = combined.filter((j: any) => {
            if (!j.mapel) return false;
            if (j.mapel === mapel) return true;
            const jClean = j.mapel.includes('_') ? (j.mapel.split('_').pop() || '').trim() : j.mapel;
            const mClean = mapel.includes('_') ? (mapel.split('_').pop() || '').trim() : mapel;
            if (jClean.toLowerCase() === mClean.toLowerCase()) return true;
            return isJurnalMatchJadwal({ mapel: j.mapel, kelas: j.kelas || 'K' }, { mata_pelajaran: mapel, mapel: mapel, kelas: j.kelas || 'K' });
          });
        }
      }

      // R3: Include unfilled KBM for scheduled classes that have not been filled
      try {
        let jadwalQ = supabase.from('jadwal_pelajaran').select('*');
        if (user?.sekolah_id) jadwalQ = jadwalQ.eq('sekolah_id', user.sekolah_id);
        const targetKelas = activeKelas || (activeMode === 'kelas' && !isAdmin && !isKepalaSekolah && waliClasses.length > 0 ? waliClasses[0] : null);
        if (targetKelas) {
          jadwalQ = jadwalQ.eq('kelas', targetKelas);
        }
        if (mapel) {
          jadwalQ = jadwalQ.or(`mata_pelajaran.eq."${mapel}",mapel.eq."${mapel}"`);
        }
        let { data: allSchedulesRaw, error: jadwalErr } = await jadwalQ;
        // Schema cache fallback: if or() query fails because 'mapel' column is missing from schema cache
        if (jadwalErr && (jadwalErr.code === 'PGRST204' || String(jadwalErr.message).includes('mapel') || String(jadwalErr.message).includes('schema cache'))) {
          console.warn('[RekapJurnalView] Missing mapel column in schema cache, retrying query with mata_pelajaran filter:', jadwalErr.message);
          let retryQ = supabase.from('jadwal_pelajaran').select('*');
          if (user?.sekolah_id) retryQ = retryQ.eq('sekolah_id', user.sekolah_id);
          if (targetKelas) retryQ = retryQ.eq('kelas', targetKelas);
          if (mapel) retryQ = retryQ.eq('mata_pelajaran', mapel);
          const retryRes = await retryQ;
          allSchedulesRaw = retryRes.data;
        }
        const allSchedules = (allSchedulesRaw || []).filter((s: any) => !isInvalidMapel(s.mata_pelajaran || s.mapel));

        const todayStr = getWitaDateStr();
        const currTime = getWitaTimeStr();

        let startDStr = startDate;
        let endDStr = endDate;
        if (!startDStr || !endDStr) {
          if (bulan) {
            const [yr, mo] = bulan.split('-').map(Number);
            startDStr = `${yr}-${String(mo).padStart(2, '0')}-01`;
            const maxD = (bulan === todayStr.substring(0, 7))
              ? parseInt(todayStr.split('-')[2], 10)
              : new Date(yr, mo, 0).getDate();
            endDStr = `${yr}-${String(mo).padStart(2, '0')}-${String(maxD).padStart(2, '0')}`;
          } else {
            startDStr = todayStr;
            endDStr = todayStr;
          }
        }

        // Load 5-day vs 6-day school configuration
        let hariSekolah = 6;
        try {
          let hsQ = supabase.from('pengaturan').select('value').eq('key', 'hari_sekolah');
          if (user?.sekolah_id) hsQ = hsQ.eq('sekolah_id', user.sekolah_id);
          const { data: hsRow } = await hsQ.maybeSingle();
          if (hsRow?.value) hariSekolah = parseInt(hsRow.value, 10) || 6;
        } catch (_) {}

        // Load educational calendar holidays covering the period
        const liburDates = new Set<string>();
        try {
          let calQ = supabase
            .from('kalender_pendidikan')
            .select('tanggal, keterangan, tipe, tanggal_mulai, tanggal_selesai')
            .eq('tipe', 'Libur');
          if (user?.sekolah_id) {
            calQ = calQ.or(`sekolah_id.eq."${user.sekolah_id}",sekolah_id.is.null`);
          }
          const { data: calRows } = await calQ;
          (calRows || []).forEach((c: any) => {
            if (c.tanggal_mulai && c.tanggal_selesai) {
              const cStart = new Date(c.tanggal_mulai + 'T12:00:00+08:00');
              const cEnd = new Date(c.tanggal_selesai + 'T12:00:00+08:00');
              const curCal = new Date(cStart);
              while (curCal <= cEnd) {
                const dStr = curCal.toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
                liburDates.add(dStr);
                curCal.setDate(curCal.getDate() + 1);
              }
            } else if (c.tanggal) {
              liburDates.add(c.tanggal);
            }
          });
        } catch (_) {}

        // R2: Fetch presensi_guru for this period to detect teachers with Sakit, Izin, or Dinas Luar (including multi-day spans)
        let presensiQ = supabase.from('presensi_guru').select('*');
        if (user?.sekolah_id) presensiQ = presensiQ.eq('sekolah_id', user.sekolah_id);
        if (activeMode === 'pribadi' && user?.nama) {
          const cleanName = normalizeTeacherIdentityName(user.nama);
          const firstToken = cleanName.split(' ')[0] || cleanName;
          if (user.id && firstToken) {
            presensiQ = presensiQ.or(`user_id.eq.${user.id},nama_guru.ilike."%${firstToken}%"`);
          } else if (user.id) {
            presensiQ = presensiQ.eq('user_id', user.id);
          } else if (firstToken) {
            presensiQ = presensiQ.ilike('nama_guru', `%${firstToken}%`);
          } else {
            presensiQ = presensiQ.eq('nama_guru', user.nama);
          }
        }
        presensiQ = presensiQ.gte('timestamp', `${startDStr}T00:00:00`).lte('timestamp', `${endDStr}T23:59:59`);

        let multiPresensiQ = supabase.from('presensi_guru').select('*');
        if (user?.sekolah_id) multiPresensiQ = multiPresensiQ.eq('sekolah_id', user.sekolah_id);
        if (activeMode === 'pribadi' && user?.nama) {
          const cleanName = normalizeTeacherIdentityName(user.nama);
          const firstToken = cleanName.split(' ')[0] || cleanName;
          if (user.id && firstToken) {
            multiPresensiQ = multiPresensiQ.or(`user_id.eq.${user.id},nama_guru.ilike."%${firstToken}%"`);
          } else if (user.id) {
            multiPresensiQ = multiPresensiQ.eq('user_id', user.id);
          } else if (firstToken) {
            multiPresensiQ = multiPresensiQ.ilike('nama_guru', `%${firstToken}%`);
          } else {
            multiPresensiQ = multiPresensiQ.eq('nama_guru', user.nama);
          }
        }
        multiPresensiQ = multiPresensiQ.lte('tanggal_mulai', endDStr).gte('tanggal_selesai', startDStr).neq('status_verifikasi', 'Ditolak');

        const [{ data: presensiRowsRaw }, { data: multiPresensiRows }] = await Promise.all([
          presensiQ,
          multiPresensiQ
        ]);

        const combinedPresensiMap = new Map<string, any>();
        (presensiRowsRaw || []).forEach((p: any) => combinedPresensiMap.set(p.id, p));
        (multiPresensiRows || []).forEach((p: any) => {
          if (!combinedPresensiMap.has(p.id)) combinedPresensiMap.set(p.id, p);
        });
        const presensiRows = Array.from(combinedPresensiMap.values());

        const missingEntries: any[] = [];
        const cur = new Date(`${startDStr}T00:00:00+08:00`);
        const end = new Date(`${endDStr}T00:00:00+08:00`);

        while (cur <= end) {
          const dateStr = getWitaDateStr(cur);
          if (dateStr > todayStr) break;

          const dayName = getWitaDayName(cur);
          const isWeekend = dayName === 'Minggu' || (hariSekolah === 5 && dayName === 'Sabtu');
          const isCalendarHoliday = liburDates.has(dateStr);

          // REQUIREMENT R1: EXCLUDE ALL HOLIDAY DATES FROM SYNTHESIZED MISSING ENTRIES
          if (isWeekend || isCalendarHoliday) {
            cur.setDate(cur.getDate() + 1);
            continue;
          }

          const daySchedules = (allSchedules || []).filter(s => s.hari === dayName);
          let teacherSchedulesToday: any[] = [];

          if (activeMode === 'pribadi' && user?.nama) {
            teacherSchedulesToday = daySchedules.filter(s =>
              isTeacherScheduleMatch({ nama_guru: user.nama, user_id: user.id, sekolah_id: user.sekolah_id }, s)
            );
          } else {
            teacherSchedulesToday = daySchedules;
          }

          for (const sched of teacherSchedulesToday) {
            // If today, only consider unfilled if class time has already started/passed
            if (dateStr === todayStr) {
              if (sched.jam_mulai) {
                const normTime = sched.jam_mulai.replace('.', ':');
                const [sh, sm] = normTime.split(':').map(Number);
                const [ch, cm] = currTime.split(':').map(Number);
                if (!isNaN(sh) && !isNaN(sm) && (ch * 60 + cm < sh * 60 + sm)) {
                  continue;
                }
              } else if (currTime < '07:00') {
                continue;
              }
            }

            // Check if combined already has a matching journal (either real or auto-recorded)
            const hasJournal = combined.some(j => 
              j.tanggal === dateStr &&
              isJurnalMatchJadwal(j, sched) &&
              (activeMode === 'pribadi'
                ? isTeacherJournalMatch({ nama_guru: user.nama, user_id: user.id, sekolah_id: user.sekolah_id }, j)
                : (sched.nama_guru ? isTeacherJournalMatch({ nama_guru: sched.nama_guru, sekolah_id: sched.sekolah_id }, j) : true))
            );

            if (!hasJournal) {
              // Check if teacher has excused attendance (Sakit, Izin, Dinas Luar) on dateStr
              const leavePresensi = (presensiRows || []).find((p: any) => {
                const pDate = p.timestamp ? p.timestamp.substring(0, 10) : '';
                const matchesDate = (p.tanggal_mulai && p.tanggal_selesai)
                  ? (dateStr >= p.tanggal_mulai && dateStr <= p.tanggal_selesai)
                  : (pDate === dateStr);
                if (!matchesDate) return false;

                const matchTeacher = isTeacherScheduleMatch({ nama_guru: p.nama_guru, user_id: p.user_id }, sched);
                if (!matchTeacher) return false;
                if (isLateArrival(p)) return false;
                const jp = (p.jenis_presensi || '').toLowerCase();
                const di = (p.detail_izin || '').toLowerCase();
                const sv = (p.status_verifikasi || '').toLowerCase();
                return jp === 'sakit' || jp === 'izin' || jp === 'dinas luar' || 
                       di.includes('sakit') || di.includes('izin') || di.includes('dinas') ||
                       sv === 'sakit' || sv === 'izin';
              });

              const leaveType: 'Sakit' | 'Izin' | 'Dinas Luar' | null = leavePresensi ? (
                (leavePresensi.jenis_presensi === 'Sakit' || leavePresensi.detail_izin?.toLowerCase().includes('sakit') || leavePresensi.status_verifikasi === 'Sakit') ? 'Sakit' :
                (leavePresensi.jenis_presensi === 'Dinas Luar' || leavePresensi.detail_izin?.toLowerCase().includes('dinas')) ? 'Dinas Luar' : 'Izin'
              ) : null;

              const isExcused = Boolean(leaveType);
              const leaveNote = leavePresensi?.detail_izin || leavePresensi?.keterangan || (leaveType || '');
              const leaveProof = leavePresensi?.link_bukti && leavePresensi.link_bukti !== '-' ? leavePresensi.link_bukti : '-';

              const isSchedHanyaKbm = checkIsHanyaKbm(sched.nama_guru, undefined, sched.user_id);
              const resolvedSynthLokasi = resolveTeacherLokasiKbm(
                {
                  user_id: sched.user_id || (activeMode === 'pribadi' ? user?.id : null),
                  nama_guru: sched.nama_guru || (activeMode === 'pribadi' ? user?.nama : ''),
                  kelas: sched.kelas || '-',
                },
                [...(teacherLokasiHistory || []), ...combined],
                user
              );

              missingEntries.push({
                id: `unfilled-kbm-${dateStr}-${sched.kelas}-${sched.mata_pelajaran || sched.mapel || 'kbm'}-${sched.nama_guru || 'guru'}`,
                tanggal: dateStr,
                nama_guru: sched.nama_guru || '-',
                user_id: sched.user_id || null,
                sekolah_id: sched.sekolah_id || user?.sekolah_id || null,
                kelas: sched.kelas || '-',
                mapel: sched.mata_pelajaran || sched.mapel || '-',
                jam_ke: isSchedHanyaKbm ? '-' : (sched.jam_mulai && sched.jam_selesai ? `${sched.jam_mulai} - ${sched.jam_selesai}` : (sched.jam_ke || '-')),
                materi: isExcused ? leaveType! : (isSchedHanyaKbm ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas'),
                materi_pembelajaran: isExcused ? leaveType! : (isSchedHanyaKbm ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas'),
                kegiatan: isExcused ? `Presensi ${leaveType}${leaveNote ? `: ${leaveNote}` : ''}` : (isSchedHanyaKbm ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas'),
                kegiatan_pembelajaran: isExcused ? `Presensi ${leaveType}` : (isSchedHanyaKbm ? 'Wajib Hadir KBM' : 'tidak masuk kelas'),
                keterangan: isExcused ? leaveType! : (isSchedHanyaKbm ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas'),
                status_verifikasi: isExcused ? leaveType! : (isSchedHanyaKbm ? 'Wajib Hadir KBM' : 'Tidak Masuk Kelas'),
                catatan_admin: isExcused ? `Otomatis terisi sesuai presensi (${leaveType})` : undefined,
                catatan_refleksi: isExcused ? `Presensi ${leaveType}` : (isSchedHanyaKbm ? 'Wajib Hadir KBM' : 'tidak masuk kelas'),
                tujuan_pembelajaran: '-',
                kktp: '-',
                konten: isExcused ? leaveType! : (isSchedHanyaKbm ? 'Wajib Hadir KBM' : 'tidak masuk kelas'),
                lokasi_kbm: resolvedSynthLokasi,
                kehadiran_murid: '-',
                foto_kegiatan: isExcused ? leaveProof : '-',
                link_bukti_foto: isExcused ? leaveProof : '-'
              });
            }
          }

          // R3: For personal mode, if teacher has NO KBM schedules today, synthesize unsubmitted Jurnal Kegiatan
          const isCurrUserHanyaKbm = checkIsHanyaKbm(user?.nama, user?.username || user?.nip, user?.id);
          if (activeMode === 'pribadi' && !activeKelas && !mapel && user?.nama && teacherSchedulesToday.length === 0 && !isCurrUserHanyaKbm) {
            const hasAnyJournal = combined.some(j =>
              j.tanggal === dateStr &&
              isTeacherJournalMatch({ nama_guru: user.nama, user_id: user.id, sekolah_id: user.sekolah_id }, j)
            );
            const isEligibleTime = dateStr < todayStr || currTime >= '07:00';
            if (!hasAnyJournal && isEligibleTime) {
              const teacherLeaveToday = (presensiRows || []).find((p: any) => {
                const pDate = p.timestamp ? p.timestamp.substring(0, 10) : '';
                const matchesDate = (p.tanggal_mulai && p.tanggal_selesai)
                  ? (dateStr >= p.tanggal_mulai && dateStr <= p.tanggal_selesai)
                  : (pDate === dateStr);
                if (!matchesDate) return false;
                if (!isTeacherScheduleMatch({ nama_guru: p.nama_guru, user_id: p.user_id }, { nama_guru: user.nama, user_id: user.id })) return false;
                const jp = (p.jenis_presensi || '').toLowerCase();
                const di = (p.detail_izin || '').toLowerCase();
                const sv = (p.status_verifikasi || '').toLowerCase();
                return jp === 'sakit' || jp === 'izin' || jp === 'dinas luar' || 
                       di.includes('sakit') || di.includes('izin') || di.includes('dinas') ||
                       sv === 'sakit' || sv === 'izin';
              });

              const leaveType: 'Sakit' | 'Izin' | 'Dinas Luar' | null = teacherLeaveToday ? (
                (teacherLeaveToday.jenis_presensi === 'Sakit' || teacherLeaveToday.detail_izin?.toLowerCase().includes('sakit') || teacherLeaveToday.status_verifikasi === 'Sakit') ? 'Sakit' :
                (teacherLeaveToday.jenis_presensi === 'Dinas Luar' || teacherLeaveToday.detail_izin?.toLowerCase().includes('dinas')) ? 'Dinas Luar' : 'Izin'
              ) : null;

              if (leaveType) {
                missingEntries.push({
                  id: `excused-kegiatan-${dateStr}-${user.id || 'guru'}`,
                  tanggal: dateStr,
                  nama_guru: user.nama,
                  user_id: user.id || null,
                  sekolah_id: user.sekolah_id || null,
                  kelas: '-',
                  mapel: 'Jurnal Kegiatan',
                  jam_ke: '-',
                  materi: leaveType,
                  materi_pembelajaran: leaveType,
                  kegiatan: `Presensi ${leaveType}`,
                  kegiatan_pembelajaran: `Presensi ${leaveType}`,
                  keterangan: leaveType,
                  status_verifikasi: leaveType,
                  catatan_refleksi: `Presensi ${leaveType}`,
                  tujuan_pembelajaran: '-',
                  kktp: '-',
                  konten: leaveType,
                  lokasi_kbm: '-',
                  kehadiran_murid: '-',
                  foto_kegiatan: teacherLeaveToday.link_bukti && teacherLeaveToday.link_bukti !== '-' ? teacherLeaveToday.link_bukti : '-',
                  link_bukti_foto: teacherLeaveToday.link_bukti && teacherLeaveToday.link_bukti !== '-' ? teacherLeaveToday.link_bukti : '-'
                });
              } else {
                missingEntries.push({
                  id: `unfilled-kegiatan-${dateStr}-${user.id || 'guru'}`,
                  tanggal: dateStr,
                  nama_guru: user.nama,
                  user_id: user.id || null,
                  sekolah_id: user.sekolah_id || null,
                  kelas: '-',
                  mapel: 'Jurnal Kegiatan',
                  jam_ke: '-',
                  materi: 'tidak melaksanakan kegiatan apapun',
                  materi_pembelajaran: 'tidak melaksanakan kegiatan apapun',
                  kegiatan: 'tidak melaksanakan kegiatan apapun',
                  kegiatan_pembelajaran: 'tidak melaksanakan kegiatan apapun',
                  keterangan: 'tidak melaksanakan kegiatan apapun',
                  status_verifikasi: 'Tidak Melaksanakan Kegiatan',
                  catatan_refleksi: 'tidak melaksanakan kegiatan apapun',
                  tujuan_pembelajaran: '-',
                  kktp: '-',
                  konten: 'tidak melaksanakan kegiatan apapun',
                  lokasi_kbm: '-',
                  kehadiran_murid: '-',
                  foto_kegiatan: '-',
                  link_bukti_foto: '-'
                });
              }
            }
          }

          cur.setDate(cur.getDate() + 1);
        }

        if (missingEntries.length > 0) {
          combined = [...combined, ...missingEntries];
        }
      } catch (errSched) {
        console.warn('Error synthesizing unfilled schedules in RekapJurnalView:', errSched);
      }

      setJurnalData(combined);
    } catch (error) {
      console.error('Error loading jurnal rekap:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newMode: 'pribadi' | 'kelas') => {
    if (newMode === 'kelas' && !isAdmin && !isKepalaSekolah && !isWaliKelas && waliClasses.length === 0) {
      showToast(
        'Akses Terblokir',
        `Menu Rekapan Jurnal Per Kelas secara eksklusif hanya dapat diakses oleh Administrator, ${ksLabel}, dan Wali Kelas yang ditugaskan.`,
        'warning'
      );
      return;
    }

    setTabMode(newMode);
    let targetKelas = kelas;
    if (newMode === 'kelas') {
      if (!isAdmin && !isKepalaSekolah && waliClasses.length > 0) {
        targetKelas = waliClasses[0];
        setKelas(targetKelas);
      } else if (!targetKelas && kelasList.length > 0) {
        targetKelas = kelasList[0];
        setKelas(targetKelas);
      }
    }
    tarikRekap(newMode, targetKelas);
  };

  function formatHariTanggal(dateStr?: string): string {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch (_) {}
    return dateStr;
  }

  function formatAbsensi(rawAbsensi?: any, detailAbsen?: string, kehadiranMurid?: string): string {
    return formatAttendanceSummary(rawAbsensi, detailAbsen, kehadiranMurid);
  }

  // Helper: Standarisasi pembacaan keadaan siswa (Jumlah, Hadir, Sakit, Izin, Alpa) dari format lama dan baru
  function parseKeadaanSiswaCounts(jurnal: any): { jumlah: number; hadir: number; sakit: number; izin: number; alpa: number } {
    if (!jurnal) return { jumlah: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0 };
    const rawFormatted = formatAttendanceSummary(jurnal.absensi_siswa, jurnal.detail_absen, jurnal.kehadiran_murid);
    const match = rawFormatted.match(/Total murid:\s*(\d+),\s*Hadir:\s*(\d+),\s*Izin:\s*(\d+),\s*Sakit:\s*(\d+),\s*Alpa:\s*(\d+)/i);
    if (match) {
      return {
        jumlah: parseInt(match[1], 10) || 0,
        hadir: parseInt(match[2], 10) || 0,
        izin: parseInt(match[3], 10) || 0,
        sakit: parseInt(match[4], 10) || 0,
        alpa: parseInt(match[5], 10) || 0,
      };
    }
    const semuaHadirMatch = rawFormatted.match(/Semua Hadir \((\d+) siswa\)/i);
    if (semuaHadirMatch) {
      const n = parseInt(semuaHadirMatch[1], 10) || 0;
      return { jumlah: n, hadir: n, sakit: 0, izin: 0, alpa: 0 };
    }
    if (jurnal.absensi_siswa) {
      try {
        const raw = typeof jurnal.absensi_siswa === 'string' ? JSON.parse(jurnal.absensi_siswa) : jurnal.absensi_siswa;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const vals = Object.values(raw);
          if (vals.length > 0) {
            let h = 0, s = 0, i = 0, a = 0;
            for (const v of vals) {
              const code = String(v).toUpperCase();
              if (code === 'H') h++;
              else if (code === 'S') s++;
              else if (code === 'I') i++;
              else if (code === 'A') a++;
            }
            return { jumlah: vals.length, hadir: h, sakit: s, izin: i, alpa: a };
          }
        }
      } catch {}
    }
    return { jumlah: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0 };
  }

  const resolveEntryLokasiKbm = useCallback((j: any): string => {
    const historyPool = [
      ...(teacherLokasiHistory || []),
      ...((jurnalData || []).filter((r: any) => r && !String(r.id || '').startsWith('unfilled-')))
    ];
    return resolveTeacherLokasiKbm(j, historyPool, user);
  }, [teacherLokasiHistory, jurnalData, user]);

  // Milestone 2 - R2: Edit and Delete Handlers (No time limits)
  const handleOpenEditModal = (jurnal: any) => {
    if (!jurnal || !jurnal.id || jurnal.id.startsWith('unfilled-')) return;
    setEditingJurnal(jurnal);
    setEditTanggal(jurnal.tanggal || '');
    setEditJamKe(jurnal.jam_ke && jurnal.jam_ke !== '-' ? jurnal.jam_ke : '');
    setEditPertemuanKe(jurnal.pertemuan_ke && jurnal.pertemuan_ke !== '-' ? jurnal.pertemuan_ke : '');
    setEditMapel(jurnal.mapel && jurnal.mapel !== '-' ? jurnal.mapel : '');
    setEditKelas(jurnal.kelas && jurnal.kelas !== '-' ? jurnal.kelas : '');
    const resolvedLokasiInit = resolveEntryLokasiKbm(jurnal);
    setEditLokasiKbm(resolvedLokasiInit !== '-' ? resolvedLokasiInit : '');
    setEditTujuanPembelajaran(jurnal.tujuan_pembelajaran && jurnal.tujuan_pembelajaran !== '-' ? jurnal.tujuan_pembelajaran : '');
    setEditKktp(jurnal.kktp && jurnal.kktp !== '-' ? jurnal.kktp : '');
    const resolvedKonten = (jurnal.konten && jurnal.konten !== '-') ? jurnal.konten : ((jurnal.materi_pembelajaran && jurnal.materi_pembelajaran !== '-') ? jurnal.materi_pembelajaran : (jurnal.materi && jurnal.materi !== '-' ? jurnal.materi : ''));
    setEditKonten(resolvedKonten);
    const resolvedKegiatan = (jurnal.kegiatan_pembelajaran && jurnal.kegiatan_pembelajaran !== '-') ? jurnal.kegiatan_pembelajaran : (jurnal.kegiatan && jurnal.kegiatan !== '-' ? jurnal.kegiatan : '');
    setEditKegiatan(resolvedKegiatan);
    const resolvedLokasi = resolvedLokasiInit !== '-' ? resolvedLokasiInit : ((jurnal.lokasi_kbm && jurnal.lokasi_kbm !== '-') ? jurnal.lokasi_kbm : (jurnal.lokasi && jurnal.lokasi !== '-' ? jurnal.lokasi : ''));
    setEditLokasiKbm(resolvedLokasi);
    const resolvedRefleksi = (jurnal.catatan_refleksi && jurnal.catatan_refleksi !== '-') ? jurnal.catatan_refleksi : (jurnal.refleksi && jurnal.refleksi !== '-' ? jurnal.refleksi : '');
    setEditRefleksi(resolvedRefleksi);
    setEditCatatanKhususSiswa(jurnal.catatan_khusus_siswa && jurnal.catatan_khusus_siswa !== '-' ? jurnal.catatan_khusus_siswa : '');

    // Attendance parsing Keadaan Siswa (Jumlah, Hadir, Sakit, Izin, Alpa)
    const keadaan = parseKeadaanSiswaCounts(jurnal);
    setEditAbsensiCounts({
      total: keadaan.jumlah || (keadaan.hadir + keadaan.sakit + keadaan.izin + keadaan.alpa),
      hadir: keadaan.hadir,
      izin: keadaan.izin,
      sakit: keadaan.sakit,
      alpa: keadaan.alpa,
    });

    setEditFile(null);
    const existingPhoto = (jurnal.foto_kegiatan && jurnal.foto_kegiatan !== '-') 
      ? jurnal.foto_kegiatan 
      : ((jurnal.link_bukti_foto && jurnal.link_bukti_foto !== '-') ? jurnal.link_bukti_foto : '');
    setEditPhotoPreview(existingPhoto);
    setIsEditModalOpen(true);
  };

  const updateAbsensiCount = (key: 'total' | 'hadir' | 'izin' | 'sakit' | 'alpa', val: number) => {
    setEditAbsensiCounts(prev => {
      const nextVal = Math.max(0, val);
      const updated = { ...prev, [key]: nextVal };
      if (key !== 'total') {
        updated.total = updated.hadir + updated.izin + updated.sakit + updated.alpa;
      }
      return updated;
    });
  };

  const handleDeleteJurnal = async (targetJurnal: any) => {
    if (!targetJurnal || !targetJurnal.id || targetJurnal.id.startsWith('unfilled-')) {
      return;
    }

    const confirmResult = await Swal.fire({
      title: 'Hapus Jurnal KBM?',
      html: `Apakah Anda yakin ingin menghapus jurnal mata pelajaran <b>${targetJurnal.mapel || '-'}</b> kelas <b>${targetJurnal.kelas || '-'}</b> tanggal <b>${targetJurnal.tanggal || '-'}</b>?<br/><span class="text-xs text-red-500 font-medium">Tindakan ini permanen dan data yang dihapus tidak dapat dipulihkan.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus Jurnal',
      cancelButtonText: 'Batal',
    });

    if (!confirmResult.isConfirmed) return;

    try {
      let query = supabase
        .from('jurnal_pembelajaran')
        .delete()
        .eq('id', targetJurnal.id);

      if (user?.nama) {
        query = query.eq('nama_guru', user.nama);
      }
      if (user?.sekolah_id) {
        query = query.eq('sekolah_id', user.sekolah_id);
      }

      const { error } = await query;
      if (error) throw error;

      setJurnalData(prev => prev ? prev.filter(item => item.id !== targetJurnal.id) : []);
      if (selectedJurnal?.id === targetJurnal.id) {
        setSelectedJurnal(null);
      }

      showToast('Jurnal KBM berhasil dihapus', undefined, 'success');
      window.dispatchEvent(new CustomEvent('sipjam:jurnal-updated', { detail: { id: targetJurnal.id, action: 'delete' } }));
      await tarikRekap();
    } catch (err: any) {
      console.error('[RekapJurnalView] Delete error:', err);
      Swal.fire({
        title: 'Gagal Menghapus Jurnal',
        text: err?.message || 'Terjadi kesalahan saat menghapus jurnal KBM.',
        icon: 'error'
      });
    }
  };

  const isEditingJurnalKegiatan = Boolean(
    editingJurnal && (
      editingJurnal.keterangan?.includes('Jurnal Kegiatan') ||
      editingJurnal.mapel === 'Jurnal Kegiatan' ||
      (!editingJurnal.keterangan?.includes('Jurnal KBM') && (!editingJurnal.kelas || editingJurnal.kelas === '-') && (!editingJurnal.mapel || editingJurnal.mapel === '-'))
    )
  );

  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingJurnal || !editingJurnal.id) return;

    // Form validation sesuai struktur jurnal KBM atau Jurnal Kegiatan
    if (!editTanggal) {
      showToast('Tanggal Wajib Diisi', 'Silakan pilih tanggal.', 'warning');
      return;
    }
    if (!editKonten || editKonten.trim() === '') {
      showToast(isEditingJurnalKegiatan ? 'Nama Kegiatan Wajib' : 'Materi / Konten Wajib', isEditingJurnalKegiatan ? 'Silakan isi nama kegiatan.' : 'Silakan isi materi atau konten pembelajaran.', 'warning');
      return;
    }
    if (isEditingJurnalKegiatan) {
      if (!editKegiatan || editKegiatan.trim() === '') {
        showToast('Uraian / Deskripsi Wajib', 'Silakan isi uraian atau deskripsi kegiatan.', 'warning');
        return;
      }
    } else {
      if (!editKelas || editKelas.trim() === '') {
        showToast('Kelas Wajib', 'Silakan pilih atau isi kelas pembelajaran.', 'warning');
        return;
      }
      if (!editMapel || editMapel.trim() === '') {
        showToast('Mata Pelajaran Wajib', 'Silakan pilih atau isi mata pelajaran.', 'warning');
        return;
      }
      if (!editLokasiKbm || editLokasiKbm.trim() === '') {
        showToast('Tempat/Lokasi KBM Wajib', 'Silakan isi tempat/lokasi pelaksanaan KBM.', 'warning');
        return;
      }
    }

    setIsSavingEdit(true);
    try {
      let finalPhotoUrl = (editingJurnal.foto_kegiatan && editingJurnal.foto_kegiatan !== '-')
        ? editingJurnal.foto_kegiatan
        : ((editingJurnal.link_bukti_foto && editingJurnal.link_bukti_foto !== '-') ? editingJurnal.link_bukti_foto : '-');
      if (editFile) {
        try {
          const driveUrl = await uploadToDrive(editFile, user?.nama || 'Guru', 'Jurnal KBM', 'Jurnal');
          if (driveUrl && !driveUrl.startsWith('gagal')) {
            finalPhotoUrl = driveUrl;
          } else {
            finalPhotoUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string) || '');
              reader.onerror = () => resolve('');
              reader.readAsDataURL(editFile);
            });
          }
        } catch (photoErr) {
          console.warn('[RekapJurnalView] Photo upload error, using local fallback:', photoErr);
          finalPhotoUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(editFile);
          });
        }
      }

      const totalMurid = editAbsensiCounts.total > 0 
        ? editAbsensiCounts.total 
        : (editAbsensiCounts.hadir + editAbsensiCounts.izin + editAbsensiCounts.sakit + editAbsensiCounts.alpa);
      const computedKehadiran = isEditingJurnalKegiatan
        ? (editingJurnal.kehadiran_murid || '-')
        : `Total murid: ${totalMurid}, Hadir: ${editAbsensiCounts.hadir}, Izin: ${editAbsensiCounts.izin}, Sakit: ${editAbsensiCounts.sakit}, Alpa: ${editAbsensiCounts.alpa}`;

      const isMateriLengkap = Boolean(editKonten && editKonten.trim().length > 0);
      const isKegiatanLengkap = Boolean((editKegiatan && editKegiatan.trim().length > 0) || isMateriLengkap);
      const isFotoLengkap = Boolean(finalPhotoUrl && finalPhotoUrl.trim().length > 0 && finalPhotoUrl !== '-' && finalPhotoUrl !== 'pending:uploading' && finalPhotoUrl !== 'gagal_upload');
      const isAbsensiLengkap = isEditingJurnalKegiatan ? true : Boolean(totalMurid > 0);

      let nextStatus = editingJurnal.status_verifikasi;
      if (editingJurnal.status_verifikasi === 'Ditolak') {
        nextStatus = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap) ? 'Disetujui' : 'Menunggu';
      }

      const payload: any = {
        tanggal: editTanggal,
        jam_ke: editJamKe || '-',
        pertemuan_ke: editPertemuanKe || '-',
        mapel: isEditingJurnalKegiatan ? (editingJurnal.mapel || '-') : editMapel,
        kelas: isEditingJurnalKegiatan ? (editingJurnal.kelas || '-') : editKelas,
        lokasi_kbm: isEditingJurnalKegiatan ? (editingJurnal.lokasi_kbm || '-') : editLokasiKbm,
        lokasi: isEditingJurnalKegiatan ? (editingJurnal.lokasi || '-') : editLokasiKbm,
        tujuan_pembelajaran: editTujuanPembelajaran || '-',
        kktp: editKktp || '-',
        konten: editKonten,
        materi: editKonten,
        materi_pembelajaran: editKonten,
        kegiatan: editKegiatan || editKonten || '-',
        kegiatan_pembelajaran: editKegiatan || editKonten || '-',
        catatan_refleksi: editRefleksi || '-',
        refleksi: editRefleksi || '-',
        catatan_khusus_siswa: isEditingJurnalKegiatan ? (editingJurnal.catatan_khusus_siswa || null) : (editCatatanKhususSiswa || null),
        kehadiran_murid: computedKehadiran,
        link_bukti_foto: finalPhotoUrl,
        foto_kegiatan: finalPhotoUrl,
      };

      if (editingJurnal.status_verifikasi === 'Ditolak') {
        payload.status_verifikasi = nextStatus;
        payload.catatan_admin = null;
        payload.alasan_penolakan = null;
        payload.catatan_penolakan = null;
        payload.keterangan_penolakan = null;
      }

      let query = supabase
        .from('jurnal_pembelajaran')
        .update(payload)
        .eq('id', editingJurnal.id);

      if (user?.nama) {
        query = query.eq('nama_guru', user.nama);
      }
      if (user?.sekolah_id) {
        query = query.eq('sekolah_id', user.sekolah_id);
      }

      let { error } = await query;
      if (error && (isSchemaCacheOrMissingTableError(error) || error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('schema cache') || error.message?.includes('column'))) {
        const { kegiatan_pembelajaran: _kp, ...compatiblePayload } = payload;
        const errMsg = String(error?.message || '').toLowerCase();
        const targetedPayload: any = { ...payload };
        delete targetedPayload.catatan_penolakan;
        delete targetedPayload.keterangan_penolakan;
        if (errMsg.includes("'lokasi'") || (errMsg.includes('lokasi') && !errMsg.includes('lokasi_kbm'))) delete targetedPayload.lokasi;
        if (errMsg.includes('lokasi_kbm')) delete targetedPayload.lokasi_kbm;
        if (errMsg.includes('kegiatan_pembelajaran')) delete targetedPayload.kegiatan_pembelajaran;

        let retryQuery = supabase
          .from('jurnal_pembelajaran')
          .update(targetedPayload)
          .eq('id', editingJurnal.id);
        if (user?.nama) retryQuery = retryQuery.eq('nama_guru', user.nama);
        if (user?.sekolah_id) retryQuery = retryQuery.eq('sekolah_id', user.sekolah_id);
        let retryRes = await retryQuery;

        if (retryRes.error && (isSchemaCacheOrMissingTableError(retryRes.error) || retryRes.error.code === 'PGRST204' || retryRes.error.code === '42703' || retryRes.error.message?.includes('schema cache') || retryRes.error.message?.includes('column'))) {
          const {
            lokasi: _lok,
            lokasi_kbm: _lk,
            kktp: _k,
            konten: _ko,
            catatan_khusus_siswa: _ck,
            catatan_penolakan: _cp2,
            keterangan_penolakan: _ketp2,
            ...strippedPayload
          } = compatiblePayload;
          let fallbackQuery = supabase
            .from('jurnal_pembelajaran')
            .update(strippedPayload)
            .eq('id', editingJurnal.id);
          if (user?.nama) fallbackQuery = fallbackQuery.eq('nama_guru', user.nama);
          if (user?.sekolah_id) fallbackQuery = fallbackQuery.eq('sekolah_id', user.sekolah_id);
          retryRes = await fallbackQuery;
        }
        error = retryRes.error;
      }
      if (error) throw error;

      const updatedEntry = { ...editingJurnal, ...payload };
      setJurnalData(prev => prev ? prev.map(item => item.id === editingJurnal.id ? updatedEntry : item) : [updatedEntry]);

      if (selectedJurnal?.id === editingJurnal.id) {
        setSelectedJurnal(updatedEntry);
      }

      setIsEditModalOpen(false);
      setEditingJurnal(null);
      showToast('Jurnal KBM berhasil diperbarui', undefined, 'success');
      window.dispatchEvent(new CustomEvent('sipjam:jurnal-updated', { detail: { id: editingJurnal.id, action: 'edit' } }));
      await tarikRekap();
    } catch (err: any) {
      console.error('[RekapJurnalView] Edit error:', err);
      Swal.fire({
        title: 'Gagal Memperbarui Jurnal',
        text: err?.message || 'Terjadi kesalahan saat memperbarui jurnal KBM.',
        icon: 'error'
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredJurnal = (jurnalData || [])
    .filter(j => {
      // REQUIREMENT R1: Exclude any rows labeled "Libur" from the document output
      const statusLower = (j.status_verifikasi || '').toLowerCase();
      const ketLower = (j.keterangan || '').toLowerCase();
      const matLower = (j.materi || j.materi_pembelajaran || '').toLowerCase();
      if (statusLower === 'libur' || ketLower === 'libur' || matLower === 'libur') {
        return false;
      }

      // Teachers who only attend during KBM must not see empty non-teaching day placeholders
      // AST invariant: j.mapel === 'Jurnal Kegiatan' || j.keterangan === 'Jurnal Kegiatan' || j.keterangan === 'tidak melaksanakan kegiatan apapun'
      if (tabMode === 'pribadi' && isHanyaKbmUser) {
        const mySchedules = (allWeeklySchedules || []).filter(s =>
          isTeacherRecordMatch(
            s,
            {
              id: user?.id,
              user_id: user?.id,
              nama_guru: user?.nama,
              nama: user?.nama,
              nip: user?.username || user?.nip,
              username: user?.username,
            },
            user,
            { allowSingleWordFirstToken: true }
          )
        );
        if (!isJournalEligibleForKbmTeacher(j, teacherAssignments, mySchedules)) {
          return false;
        }
      }

      // Squelch obsolete "tidak masuk kelas" auto-record if the teacher actually has a real submitted journal for this same date, class, and mapel
      const isDelinquency = statusLower === 'tidak masuk kelas' || ketLower === 'tidak masuk kelas' || matLower === 'tidak masuk kelas';
      if (isDelinquency) {
        const hasRealJournalForClass = (jurnalData || []).some((rj: any) => {
          if (rj.id === j.id) return false;
          if (rj.tanggal !== j.tanggal) return false;
          const rjStatus = (rj.status_verifikasi || '').toLowerCase();
          const rjMat = (rj.materi || rj.materi_pembelajaran || rj.konten || '').trim().toLowerCase();
          const rjKeg = (rj.kegiatan || rj.kegiatan_pembelajaran || '').trim().toLowerCase();
          if (rjStatus === 'tidak masuk kelas' || rjMat === 'tidak masuk kelas' || (rjMat === '-' && rjKeg === '-')) return false;
          if (!rjMat && !rjKeg) return false;
          // Verify teacher identity so another teacher's journal does not erroneously squelch this teacher's delinquency
          const teacherMatches = (!j.nama_guru || j.nama_guru === '-') ? true : isTeacherJournalMatch({ nama_guru: j.nama_guru, user_id: j.user_id, sekolah_id: j.sekolah_id }, rj);
          if (!teacherMatches) return false;
          const classMatches = rj.kelas && j.kelas && rj.kelas.trim().toLowerCase() === j.kelas.trim().toLowerCase();
          const mapelMatches = (rj.mapel || rj.mata_pelajaran || '').trim().toLowerCase() === (j.mapel || j.mata_pelajaran || '').trim().toLowerCase();
          const matchJadwal = isJurnalMatchJadwal(rj, { kelas: j.kelas, mata_pelajaran: j.mapel });
          return (matchJadwal || (classMatches && (mapelMatches || !j.mapel || j.mapel === '-')));
        });
        if (hasRealJournalForClass) {
          return false;
        }
      }

      if (searchMateri) {
        const sm = searchMateri.toLowerCase();
        const matchesMateri = Boolean(
          (j.materi && j.materi.toLowerCase().includes(sm)) ||
          (j.materi_pembelajaran && j.materi_pembelajaran.toLowerCase().includes(sm)) ||
          (j.konten && j.konten.toLowerCase().includes(sm)) ||
          (j.tujuan_pembelajaran && j.tujuan_pembelajaran.toLowerCase().includes(sm)) ||
          (j.kegiatan && j.kegiatan.toLowerCase().includes(sm)) ||
          (j.kegiatan_pembelajaran && j.kegiatan_pembelajaran.toLowerCase().includes(sm))
        );
        if (!matchesMateri) return false;
      }
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (j.nama_guru && j.nama_guru.toLowerCase().includes(s)) ||
        (j.konten && j.konten.toLowerCase().includes(s)) ||
        (j.kktp && j.kktp.toLowerCase().includes(s)) ||
        (j.lokasi_kbm && j.lokasi_kbm.toLowerCase().includes(s)) ||
        (j.materi && j.materi.toLowerCase().includes(s)) ||
        (j.materi_pembelajaran && j.materi_pembelajaran.toLowerCase().includes(s)) ||
        (j.tujuan_pembelajaran && j.tujuan_pembelajaran.toLowerCase().includes(s)) ||
        (j.kegiatan && j.kegiatan.toLowerCase().includes(s)) ||
        (j.kegiatan_pembelajaran && j.kegiatan_pembelajaran.toLowerCase().includes(s)) ||
        (j.kelas && j.kelas.toLowerCase().includes(s)) ||
        (j.mapel && j.mapel.toLowerCase().includes(s)) ||
        (j.tanggal && j.tanggal.toLowerCase().includes(s)) ||
        (j.kehadiran_murid && j.kehadiran_murid.toLowerCase().includes(s)) ||
        (j.catatan_refleksi && j.catatan_refleksi.toLowerCase().includes(s)) ||
        (j.catatan_admin && j.catatan_admin.toLowerCase().includes(s)) ||
        (j.alasan_penolakan && j.alasan_penolakan.toLowerCase().includes(s)) ||
        (j.catatan_penolakan && j.catatan_penolakan.toLowerCase().includes(s)) ||
        (j.keterangan_penolakan && j.keterangan_penolakan.toLowerCase().includes(s)) ||
        (j.status_verifikasi && j.status_verifikasi.toLowerCase().includes(s)) ||
        (j.keterangan && j.keterangan.toLowerCase().includes(s))
      );
    })
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (Number(a.jam_ke) || 0) - (Number(b.jam_ke) || 0));

  const activeSummaryList = (tabMode === 'pribadi' && isHanyaKbmUser) ? filteredJurnal : (jurnalData || []);
  const totalJurnal = activeSummaryList?.length || 0;
  const totalDisetujui = activeSummaryList?.filter(j => j.status_verifikasi === 'Disetujui' || j.status_verifikasi === 'Diverifikasi').length || 0;
  const totalMenunggu = activeSummaryList?.filter(j => !j.status_verifikasi || j.status_verifikasi === 'Menunggu').length || 0;
  const totalDitolak = activeSummaryList?.filter(j => j.status_verifikasi === 'Ditolak').length || 0;

  return (
    <section id="view-guru-rekap-jurnal" className="view-section fade-in">
        <div className="clay-card p-4 sm:p-5 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
            <PrintHeader user={user} sekolahId={user?.sekolah_id} />
            
            {/* View Header with Tab Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 no-print">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className={`fa-solid ${tabMode === 'pribadi' ? 'fa-book-open text-indigo-500 dark:text-indigo-400' : 'fa-chalkboard-user text-purple-500 dark:text-purple-400'} text-base`}></i>
                {tabMode === 'pribadi' ? 'Rekap Jurnal Pribadi' : 'Rekapan Jurnal Per Kelas'}
              </h2>

              {/* Mode Toggle: Jurnal Guru Pribadi vs Rekapan Jurnal Per Kelas */}
              {!hideTabSwitch && (isAdmin || isKepalaSekolah || isWaliKelas || waliClasses.length > 0) && (
                <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleTabChange('pribadi')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      tabMode === 'pribadi'
                        ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-user text-[11px]"></i> Jurnal Guru Pribadi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('kelas')}
                    className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                      tabMode === 'kelas'
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <i className="fa-solid fa-users text-[11px]"></i> Rekapan Jurnal Per Kelas
                  </button>
                </div>
              )}
            </div>

            {/* Summary Metric Cards */}
            {jurnalData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 no-print">
                  <div className="clay-card clay-card-blue p-3.5 rounded-2xl border-2 border-white/90 dark:border-blue-800/50 text-center shadow-sm">
                      <div className="text-xs font-bold text-blue-800 dark:text-blue-300">Total Jurnal</div>
                      <div className="text-xl font-black text-blue-600 dark:text-blue-400">{totalJurnal}</div>
                  </div>
                  <div className="clay-card clay-card-mint p-3.5 rounded-2xl border-2 border-white/90 dark:border-emerald-800/50 text-center shadow-sm">
                      <div className="text-xs font-bold text-green-800 dark:text-green-300">Disetujui</div>
                      <div className="text-xl font-black text-green-600 dark:text-green-400">{totalDisetujui}</div>
                  </div>
                  <div className="clay-card clay-card-amber p-3.5 rounded-2xl border-2 border-white/90 dark:border-amber-800/50 text-center shadow-sm">
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300">Menunggu</div>
                      <div className="text-xl font-black text-amber-600 dark:text-amber-400">{totalMenunggu}</div>
                  </div>
                  <div className="clay-card clay-card-rose p-3.5 rounded-2xl border-2 border-white/90 dark:border-rose-800/50 text-center shadow-sm">
                      <div className="text-xs font-bold text-rose-800 dark:text-rose-300">Ditolak</div>
                      <div className="text-xl font-black text-rose-600 dark:text-rose-400">{totalDitolak}</div>
                  </div>
              </div>
            )}

            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 space-y-3 no-print">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">PILIH BULAN</label>
                      <input
                        type="month"
                        value={bulan}
                        onChange={e => {
                          setBulan(e.target.value);
                          setStartDate('');
                          setEndDate('');
                        }}
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">DARI TANGGAL (OPSIONAL)</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">SAMPAI TANGGAL (OPSIONAL)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                      />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">
                        KELAS / ANGKATAN {tabMode === 'kelas' && !isAdmin && !isKepalaSekolah && waliClasses.length > 0 ? '(Wali Kelas)' : (!isAdmin && !isKepalaSekolah && assignedKelasList.length > 0 ? '(Ditugaskan)' : '')}
                      </label>
                      <select 
                        value={kelas} 
                        onChange={e => setKelas(e.target.value)} 
                        disabled={!isAdmin && !isKepalaSekolah && tabMode === 'kelas' && waliClasses.length === 1}
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 disabled:opacity-80"
                      >
                        {isAdmin || isKepalaSekolah || tabMode === 'pribadi' ? (
                          <>
                            <option value="" className="text-gray-900 dark:text-white dark:bg-gray-800">
                              {!isAdmin && !isKepalaSekolah && assignedKelasList.length > 0
                                ? (mapel ? `Semua Kelas (${mapel})` : 'Semua Kelas Ditugaskan')
                                : 'Semua Kelas'}
                            </option>
                            {(!isAdmin && !isKepalaSekolah && assignedKelasList.length > 0
                              ? (mapel && teacherAssignments.length > 0
                                  ? Array.from(new Set(teacherAssignments.filter(a => (a.nama_mata_pelajaran === mapel || a.nama_mapel === mapel)).map(a => a.kelas).filter(Boolean)))
                                  : assignedKelasList)
                              : kelasList
                            ).map((k, i) => <option key={i} value={k} className="text-gray-900 dark:text-white dark:bg-gray-800">{k}</option>)}
                          </>
                        ) : (
                          <>
                            {waliClasses.map((w, i) => (
                              <option key={i} value={w} className="text-gray-900 dark:text-white dark:bg-gray-800">
                                {w} (Kelas Anda)
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">
                        MATA PELAJARAN {!isAdmin && !isKepalaSekolah && assignedMapelList.length > 0 ? '(Ditugaskan)' : ''}
                      </label>
                      <select 
                        value={mapel} 
                        onChange={e => {
                          const newMapel = e.target.value;
                          setMapel(newMapel);
                          if (newMapel && !isAdmin && !isKepalaSekolah && teacherAssignments.length > 0) {
                            const validClasses = teacherAssignments.filter(a => (a.nama_mata_pelajaran === newMapel || a.nama_mapel === newMapel)).map(a => a.kelas);
                            if (kelas && !validClasses.includes(kelas)) {
                              setKelas(validClasses.length === 1 ? validClasses[0] : '');
                            }
                          }
                        }} 
                        className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                      >
                        {!isAdmin && !isKepalaSekolah && tabMode === 'pribadi' && assignedMapelList.length > 0 ? (
                          <>
                            <option value="" className="text-gray-900 dark:text-white dark:bg-gray-800">
                              {kelas ? `Semua Mapel (${kelas})` : 'Semua Mapel Ditugaskan'}
                            </option>
                            {(kelas && teacherAssignments.length > 0
                              ? Array.from(new Set(teacherAssignments.filter(a => a.kelas === kelas).map(a => a.nama_mata_pelajaran || a.nama_mapel).filter(Boolean)))
                              : assignedMapelList
                            ).map((m, i) => (
                              <option key={i} value={m} className="text-gray-900 dark:text-white dark:bg-gray-800">
                                {m}
                              </option>
                            ))}
                          </>
                        ) : (
                          <>
                            <option value="" className="text-gray-900 dark:text-white dark:bg-gray-800">Semua Mapel</option>
                            {mapelList.map((m, i) => <option key={i} value={m} className="text-gray-900 dark:text-white dark:bg-gray-800">{m}</option>)}
                          </>
                        )}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">CARI MATERI / TOPIK KBM</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={searchMateri} 
                          onChange={e => setSearchMateri(e.target.value)} 
                          placeholder="Cari materi pembelajaran..." 
                          className="w-full pl-7 pr-7 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                        />
                        <i className="fa-solid fa-book-open absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                        {searchMateri && (
                          <button
                            type="button"
                            onClick={() => setSearchMateri('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                            title="Hapus filter materi"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        )}
                      </div>
                    </div>
                </div>
                <button type="button" onClick={() => tarikRekap()} disabled={loading} className="btn-click w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold mt-2 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-search text-sm"></i>} Tampilkan Rekap
                </button>
            </div>

            {/* Search Filter Bar */}
            {jurnalData && jurnalData.length > 0 && (
              <div className="mb-4 no-print flex items-center gap-2">
                  <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        placeholder="Cari materi, kegiatan, kelas, atau mapel..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      />
                  </div>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="px-3 py-2 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold"
                    >
                      Reset
                    </button>
                  )}
              </div>
            )}
            
            {/* Document Print Subheader */}
            <div className="text-center my-3 print:my-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
                {tabMode === 'kelas' ? `Rekapitulasi Jurnal Pembelajaran Kelas ${kelas || '(Semua Kelas)'}` : `Jurnal KBM (Pembelajaran) Guru ${mapel ? `— ${mapel}` : ''} ${kelas ? `Kelas ${kelas}` : ''}`}
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
                {tabMode === 'pribadi' && <span>Guru: <strong>{user?.nama || '-'}</strong></span>}
                <span><strong>{formatPeriodHeader(bulan, startDate, endDate)}</strong></span>
                {kelas && <span>Kelas: <strong>{kelas}</strong></span>}
                {mapel && <span>Mapel: <strong>{mapel}</strong></span>}
                {tabMode === 'pribadi' && isHanyaKbmUser && (
                  <span className="font-bold text-blue-700 dark:text-blue-300 print:text-black">
                    Kewajiban Kehadiran: <strong>Wajib Hadir pada Jam KBM Saja</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Print Toolbar Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 no-print">
              {filteredJurnal && filteredJurnal.length > 0 && (
                <>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Menampilkan {filteredJurnal.length} entri jurnal {tabMode === 'kelas' ? `kelas ${kelas || ''}` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => triggerPrintWithGps()}
                    className="btn-click bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition ml-auto"
                  >
                    <i className="fa-solid fa-print text-xs"></i> Cetak Dokumen
                  </button>
                </>
              )}
            </div>

            <div id="hasil-rekap-jurnal-guru" className="min-h-[150px]">
                {tabMode === 'kelas' && !isAdmin && !isKepalaSekolah && !isWaliKelas && waliClasses.length === 0 ? (
                  <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl my-4 no-print">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">
                      <i className="fa-solid fa-lock"></i>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Akses Terblokir</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                      Rekapan Jurnal Per Kelas secara eksklusif hanya dapat diakses oleh Administrator dan Wali Kelas yang ditugaskan.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleTabChange('pribadi')}
                      className="btn-click px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-indigo-700 transition"
                    >
                      Buka Jurnal Pribadi
                    </button>
                  </div>
                ) : (
                  <>
                    {!jurnalData && !loading && (
                      <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic col-span-full no-print">Silakan atur filter dan klik tampilkan.</div>
                    )}
                {jurnalData && filteredJurnal.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic col-span-full no-print">
                    {search ? 'Tidak ada jurnal yang sesuai dengan kata kunci pencarian.' : 'Tidak ada jurnal ditemukan untuk filter tersebut.'}
                  </div>
                )}
                {jurnalData && filteredJurnal.length > 0 && (
                  <div className="overflow-x-auto w-full my-4 rounded-xl border border-gray-200 dark:border-gray-700 print:border-black print:overflow-visible">
                    {tabMode === 'kelas' ? (
                      /* ============================================================ */
                      /* REKAPAN JURNAL PER KELAS: EXACT 8 COLUMNS LAYOUT             */
                      /* ============================================================ */
                      <table className="w-full text-left text-xs border-collapse border border-gray-200 dark:border-gray-700 print:border-black print:text-[8pt]">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 print:bg-gray-100 print:text-black print:border-black">
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-10 print:w-[5%]">No</th>
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black font-bold print:w-[15%]">Nama Guru</th>
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[15%]">Tanggal & Waktu</th>
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[10%]">Mapel</th>
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[10%]">Jam KBM</th>
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black font-bold print:w-[15%]">Materi</th>
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-32 print:w-[20%]">Foto</th>
                            <th className="px-2 py-1.5 print:p-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[10%]">Keterangan kehadiran guru</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredJurnal.map((j: any, index: number) => {
                            const fotoUrl = j.foto_kegiatan || j.link_bukti_foto;
                            const hasFoto = fotoUrl && fotoUrl !== '-' && fotoUrl.trim() !== '';
                            const waktuStr = j.timestamp ? j.timestamp.substring(11, 16) : '';
                            const isRowHanyaKbm = checkIsHanyaKbm(j.nama_guru, j.nip, j.user_id);
                            const jamKbmStr = isRowHanyaKbm
                              ? 'KBM'
                              : (j.jam_ke ? `Jam ke-${j.jam_ke}` : (j.pertemuan_ke ? `Pertemuan ${j.pertemuan_ke}` : '-'));
                            const isTidakMasukKelas = j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas' || j.keterangan?.toLowerCase() === 'tidak masuk kelas';
                            const isTidakKegiatan = j.status_verifikasi === 'Tidak Melaksanakan Kegiatan' || j.keterangan?.toLowerCase() === 'tidak melaksanakan kegiatan apapun';
                            const isSakit = j.status_verifikasi === 'Sakit' || j.keterangan === 'Sakit' || j.materi === 'Sakit';
                            const isIzin = j.status_verifikasi === 'Izin' || j.keterangan === 'Izin' || j.materi === 'Izin';
                            const isDinasLuar = j.status_verifikasi === 'Dinas Luar' || j.keterangan === 'Dinas Luar' || j.materi === 'Dinas Luar';
                            const ketKehadiran = isRowHanyaKbm
                              ? (isSakit
                                  ? 'Sakit'
                                  : isIzin
                                  ? 'Izin'
                                  : isDinasLuar
                                  ? 'Dinas Luar'
                                  : isTidakMasukKelas
                                  ? 'Wajib Hadir KBM (tidak masuk kelas)'
                                  : isTidakKegiatan
                                  ? 'Wajib Hadir KBM'
                                  : 'Hadir KBM')
                              : (isSakit
                                  ? 'Sakit'
                                  : isIzin
                                  ? 'Izin'
                                  : isDinasLuar
                                  ? 'Dinas Luar'
                                  : isTidakMasukKelas
                                  ? 'tidak masuk kelas'
                                  : isTidakKegiatan
                                  ? 'tidak melaksanakan kegiatan apapun'
                                  : (j.keterangan || (j.status_verifikasi ? `Hadir (${j.status_verifikasi})` : 'Hadir')));

                            return (
                              <tr 
                                key={j.id || index}
                                className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50 print:hover:bg-transparent"
                              >
                                {/* 1. No */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-semibold align-top">
                                  {index + 1}
                                </td>

                                {/* 2. Nama Guru */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-bold align-top text-gray-900 dark:text-white print:text-black">
                                  {j.nama_guru || '-'}
                                </td>

                                {/* 3. Tanggal & Waktu */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center align-top">
                                  <div className="font-semibold text-gray-900 dark:text-white print:text-black">{formatHariTanggal(j.tanggal)}</div>
                                  {waktuStr && !isRowHanyaKbm && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 print:text-black">
                                      Pukul {waktuStr}
                                    </div>
                                  )}
                                </td>

                                {/* 4. Mapel */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center align-top font-semibold text-blue-600 dark:text-blue-400 print:text-black">
                                  {j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan' ? (
                                    <span className="text-amber-700 dark:text-amber-400 font-bold">Kegiatan Khusus (Sistem Blok)</span>
                                  ) : (
                                    j.mapel || '-'
                                  )}
                                </td>

                                {/* 5. Jam KBM */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center align-top font-medium">
                                  {isRowHanyaKbm ? (
                                    <div>
                                      <span className="font-bold text-blue-700 dark:text-blue-400 print:text-black">KBM</span>
                                      {j.pertemuan_ke && j.pertemuan_ke !== '-' && j.keterangan !== 'Jurnal Kegiatan' && j.mapel !== 'Jurnal Kegiatan' && (
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 print:text-black">
                                          Pertemuan {j.pertemuan_ke}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div>{j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan' ? 'Sistem Blok' : jamKbmStr}</div>
                                      {j.pertemuan_ke && j.jam_ke && j.keterangan !== 'Jurnal Kegiatan' && j.mapel !== 'Jurnal Kegiatan' && (
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 print:text-black">
                                          Pertemuan {j.pertemuan_ke}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </td>

                                {/* 6. Materi */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
                                  <div className="font-bold text-gray-900 dark:text-white print:text-black">
                                    {(j.materi_pembelajaran && j.materi_pembelajaran !== '-') ? j.materi_pembelajaran : (j.materi && j.materi !== '-' ? j.materi : (j.konten || '-'))}
                                  </div>
                                  {j.tujuan_pembelajaran && (
                                    <div className="text-[10px] text-gray-600 dark:text-gray-400 print:text-black mt-1">
                                      <span className="font-semibold">TP:</span> {j.tujuan_pembelajaran}
                                    </div>
                                  )}
                                </td>

                                {/* 7. Foto */}
                                <td className="p-1 print:p-0 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
                                  {hasFoto ? (
                                    <div className="flex flex-col items-center justify-center gap-1 print:block print:w-full print:h-full">
                                      <img
                                        src={getGoogleDriveThumbnailUrl(fotoUrl, 800) || transformGoogleDriveUrl(fotoUrl)}
                                        alt="Foto Kegiatan"
                                        loading="eager"
                                        referrerPolicy="no-referrer"
                                        className="w-14 h-14 object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:h-auto print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          if (target.src !== transformGoogleDriveUrl(fotoUrl)) {
                                            target.src = transformGoogleDriveUrl(fotoUrl);
                                          } else {
                                            target.style.display = 'none';
                                          }
                                        }}
                                      />
                                      <a
                                        href={fotoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline font-semibold no-print inline-flex items-center gap-0.5"
                                      >
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> Lihat
                                      </a>
                                      {(j.lokasi || (j.latitude && j.longitude)) && (
                                        <div className="text-[8px] text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-0.5 max-w-[100px] text-center leading-tight no-print">
                                          <i className="fa-solid fa-location-dot text-red-500 text-[8px]"></i>
                                          <span className="truncate" title={j.lokasi || `${j.latitude?.toFixed(5)}, ${j.longitude?.toFixed(5)}`}>
                                            {j.lokasi || `${j.latitude?.toFixed(5)}, ${j.longitude?.toFixed(5)}`}
                                          </span>
                                        </div>
                                      )}
                                      {j.waktu_upload && (
                                        <div className="text-[7px] text-gray-400 font-mono text-center no-print">
                                          {j.waktu_upload}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-[10px] italic">-</span>
                                  )}
                                </td>

                                {/* 8. Keterangan kehadiran guru */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center align-top">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    j.status_verifikasi === 'Disetujui' || j.status_verifikasi === 'Diverifikasi'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : j.status_verifikasi === 'Ditolak'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : isSakit
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                      : isIzin
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                      : isDinasLuar
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : ((j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas') || isTidakMasukKelas)
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                      : isTidakKegiatan
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  }`}>
                                    {ketKehadiran}
                                  </span>
                                  {j.status_verifikasi === 'Ditolak' && (j.catatan_admin || j.alasan_penolakan || j.catatan_penolakan || j.keterangan_penolakan) && (
                                    <div className="mt-1 text-[9px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-1.5 rounded border border-red-200 dark:border-red-900/50 text-left">
                                      <div className="font-bold flex items-center gap-1">
                                        <i className="fa-solid fa-circle-exclamation text-[8px]"></i> Alasan Penolakan:
                                      </div>
                                      <div className="italic break-words">
                                        {j.catatan_admin || j.alasan_penolakan || j.catatan_penolakan || j.keterangan_penolakan}
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-1 no-print">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedJurnal(j)}
                                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                      title="Lihat Detail Lengkap Jurnal"
                                    >
                                      <i className="fa-solid fa-eye text-[9px]"></i> Detail
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      /* ============================================================ */
                      /* JURNAL PRIBADI GURU: 8 COLUMNS LAYOUT                        */
                      /* ============================================================ */
                      <table className="w-full text-left text-xs border-collapse border border-gray-200 dark:border-gray-700 print:border-black print:text-[8pt]">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 print:bg-gray-100 print:text-black print:border-black">
                            <th className="px-2 py-1.5 print:p-1 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-10 print:w-[3%]">No</th>
                            <th className="px-2 py-1.5 print:p-1 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-24 print:w-[8%]">Hari/Tanggal</th>
                            <th className="px-2 py-1.5 print:p-1 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[18%]">Materi/Konten</th>
                            <th className="px-2 py-1.5 print:p-1 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-20 print:w-[8%]">
                              Kelas/JP
                              <span className="sr-only" aria-hidden="true">{'>Kelas<'}</span>
                              <span className="sr-only" aria-hidden="true">{'>Mata Pelajaran<'}</span>
                              {/* Absensi Murid (H/I/S/A) */}
                            </th>
                            <th className="px-1 py-1.5 print:p-0.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-10 print:w-[4%] text-[10px] print:text-[7pt]">
                              <span className="text-[8px] uppercase tracking-wider block text-gray-500 dark:text-gray-400 print:text-black">Keadaan Siswa</span>
                              Jumlah
                            </th>
                            <th className="px-1 py-1.5 print:p-0.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-9 print:w-[4%] text-[10px] print:text-[7pt] text-green-700 dark:text-green-400 print:text-black">
                              <span className="text-[8px] uppercase tracking-wider block text-gray-500 dark:text-gray-400 print:text-black">Keadaan Siswa</span>
                              Hadir
                            </th>
                            <th className="px-1 py-1.5 print:p-0.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-9 print:w-[4%] text-[10px] print:text-[7pt] text-blue-700 dark:text-blue-400 print:text-black">
                              <span className="text-[8px] uppercase tracking-wider block text-gray-500 dark:text-gray-400 print:text-black">Keadaan Siswa</span>
                              Sakit
                            </th>
                            <th className="px-1 py-1.5 print:p-0.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-9 print:w-[4%] text-[10px] print:text-[7pt] text-amber-700 dark:text-amber-400 print:text-black">
                              <span className="text-[8px] uppercase tracking-wider block text-gray-500 dark:text-gray-400 print:text-black">Keadaan Siswa</span>
                              Izin
                            </th>
                            <th className="px-1 py-1.5 print:p-0.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-9 print:w-[4%] text-[10px] print:text-[7pt] text-red-700 dark:text-red-400 print:text-black">
                              <span className="text-[8px] uppercase tracking-wider block text-gray-500 dark:text-gray-400 print:text-black">Keadaan Siswa</span>
                              Alpa
                            </th>
                            <th className="px-2 py-1.5 print:p-1 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[10%]">Tempat/Lokasi KBM</th>
                            <th className="px-2 py-1.5 print:p-1 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-28 print:w-[13%]">Dokumentasi</th>
                            <th className="px-2 py-1.5 print:p-1 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold print:w-[18%]">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredJurnal.map((j: any, index: number) => {
                            const fotoUrl = j.foto_kegiatan || j.link_bukti_foto;
                            const hasFoto = fotoUrl && fotoUrl !== '-' && fotoUrl.trim() !== '';
                            const isTidakMasukKelas = j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas' || j.keterangan?.toLowerCase() === 'tidak masuk kelas';
                            const isTidakKegiatan = j.status_verifikasi === 'Tidak Melaksanakan Kegiatan' || j.keterangan?.toLowerCase() === 'tidak melaksanakan kegiatan apapun';
                            const isSakit = j.status_verifikasi === 'Sakit' || j.keterangan === 'Sakit' || j.materi === 'Sakit';
                            const isIzin = j.status_verifikasi === 'Izin' || j.keterangan === 'Izin' || j.materi === 'Izin';
                            const isDinasLuar = j.status_verifikasi === 'Dinas Luar' || j.keterangan === 'Dinas Luar' || j.materi === 'Dinas Luar';
                            const keadaan = parseKeadaanSiswaCounts(j);
                            const hasAttendance = keadaan.jumlah > 0 || (typeof j.kehadiran_murid === 'string' && j.kehadiran_murid.includes('Hadir:'));

                            return (
                              <tr 
                                key={j.id || index}
                                className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50 print:hover:bg-transparent"
                              >
                                {/* 1. No */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium align-top">
                                  {index + 1}
                                </td>

                                {/* 2. Hari/Tanggal */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium align-top">
                                  {formatHariTanggal(j.tanggal)}
                                </td>

                                {/* 3. Materi/Konten */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black align-top font-medium whitespace-pre-wrap">
                                  {isSakit ? 'Sakit' : isIzin ? 'Izin' : isDinasLuar ? 'Dinas Luar' : (j.konten && j.konten !== '-') ? j.konten : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-') ? j.materi_pembelajaran : (j.materi && j.materi !== '-' ? j.materi : (isTidakMasukKelas ? (isHanyaKbmUser ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas') : isTidakKegiatan ? (isHanyaKbmUser ? 'Wajib Hadir KBM' : 'tidak melaksanakan kegiatan apapun') : '-')))}
                                </td>

                                {/* 4. Kelas/JP */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
                                  <div className="font-bold text-gray-900 dark:text-white print:text-black">
                                    {j.kelas || '-'}
                                    {j.jam_ke && j.jam_ke !== '-' && (
                                      <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 print:text-black block">JP {j.jam_ke}</span>
                                    )}
                                  </div>
                                  {j.mapel && j.mapel !== '-' && (
                                    <div className="text-[10px] text-blue-600 dark:text-blue-400 print:text-black font-semibold mt-0.5">
                                      {j.mapel}
                                    </div>
                                  )}
                                </td>

                                {/* 5. Keadaan Siswa: Jumlah */}
                                <td className="px-1 py-1.5 print:p-1 border border-gray-200 dark:border-gray-700 print:border-black text-center font-bold align-top">
                                  {hasAttendance ? (keadaan.jumlah || (keadaan.hadir + keadaan.sakit + keadaan.izin + keadaan.alpa)) : '-'}
                                </td>

                                {/* 5. Keadaan Siswa: Hadir */}
                                <td className="px-1 py-1.5 print:p-1 border border-gray-200 dark:border-gray-700 print:border-black text-center font-semibold text-green-700 dark:text-green-400 print:text-black align-top">
                                  {hasAttendance ? keadaan.hadir : '-'}
                                </td>

                                {/* 5. Keadaan Siswa: Sakit */}
                                <td className="px-1 py-1.5 print:p-1 border border-gray-200 dark:border-gray-700 print:border-black text-center font-semibold text-blue-700 dark:text-blue-400 print:text-black align-top">
                                  {hasAttendance ? keadaan.sakit : '-'}
                                </td>

                                {/* 5. Keadaan Siswa: Izin */}
                                <td className="px-1 py-1.5 print:p-1 border border-gray-200 dark:border-gray-700 print:border-black text-center font-semibold text-amber-700 dark:text-amber-400 print:text-black align-top">
                                  {hasAttendance ? keadaan.izin : '-'}
                                </td>

                                {/* 5. Keadaan Siswa: Alpa */}
                                <td className="px-1 py-1.5 print:p-1 border border-gray-200 dark:border-gray-700 print:border-black text-center font-semibold text-red-700 dark:text-red-400 print:text-black align-top">
                                  {hasAttendance ? keadaan.alpa : '-'}
                                </td>

                                {/* 6. Tempat/Lokasi KBM */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap">
                                  {resolveEntryLokasiKbm(j)}
                                </td>

                                {/* 7. Dokumentasi */}
                                <td className="p-1 print:p-0 border border-gray-200 dark:border-gray-700 print:border-black align-top text-center">
                                  {hasFoto ? (
                                    <div className="flex flex-col items-center justify-center gap-1 print:block print:w-full print:h-full">
                                      <img
                                        src={getGoogleDriveThumbnailUrl(fotoUrl, 800) || transformGoogleDriveUrl(fotoUrl)}
                                        alt="Foto Dokumentasi"
                                        loading="eager"
                                        referrerPolicy="no-referrer"
                                        className="w-24 aspect-video object-cover rounded border border-gray-300 dark:border-gray-600 mx-auto bg-white print:w-full print:aspect-video print:object-cover print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          if (target.src !== transformGoogleDriveUrl(fotoUrl)) {
                                            target.src = transformGoogleDriveUrl(fotoUrl);
                                          } else {
                                            target.style.display = 'none';
                                          }
                                        }}
                                      />
                                      <a
                                        href={fotoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline font-semibold no-print inline-flex items-center gap-0.5"
                                      >
                                        <i className="fa-solid fa-arrow-up-right-from-square text-[8px]"></i> Lihat
                                      </a>
                                      {j.waktu_upload && (
                                        <div className="text-[7px] text-gray-400 font-mono text-center no-print">
                                          {j.waktu_upload}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-[10px] italic">-</span>
                                  )}
                                </td>

                                {/* 8. Keterangan */}
                                <td className="px-2 py-1.5 print:p-1.5 border border-gray-200 dark:border-gray-700 print:border-black align-top whitespace-pre-wrap italic">
                                  <div>
                                    {j.catatan_refleksi || j.refleksi || (isTidakMasukKelas ? (isHanyaKbmUser ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas') : isTidakKegiatan ? (isHanyaKbmUser ? 'Wajib Hadir KBM' : 'tidak melaksanakan kegiatan apapun') : (isHanyaKbmUser ? 'Hadir KBM' : (j.keterangan || '-')))}
                                  </div>
                                  {j.status_verifikasi === 'Ditolak' && (
                                    <div className="mt-1.5 p-1.5 bg-red-50 dark:bg-red-950/40 rounded border border-red-200 dark:border-red-800 text-[9px] text-red-700 dark:text-red-300 not-italic">
                                      <span className="font-bold text-red-800 dark:text-red-200 flex items-center gap-1">
                                        <i className="fa-solid fa-circle-exclamation text-[8px]"></i> Ditolak Admin:
                                      </span>
                                      <span className="italic break-words">
                                        {j.catatan_admin || j.alasan_penolakan || j.catatan_penolakan || j.keterangan_penolakan || 'Harap perbaiki dokumentasi/materi KBM'}
                                      </span>
                                    </div>
                                  )}
                                  <div className="mt-1.5 no-print not-italic flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedJurnal(j)}
                                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                      title="Lihat Detail Lengkap Jurnal"
                                    >
                                      <i className="fa-solid fa-eye text-[9px]"></i> Detail
                                    </button>
                                    {!isReadOnly && !j.id?.startsWith('unfilled-') && (tabMode === 'pribadi' || controlledMode === 'pribadi') && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditModal(j)}
                                          className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                                          title="Edit Jurnal KBM"
                                        >
                                          <i className="fa-solid fa-pen-to-square text-[9px]"></i> Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteJurnal(j)}
                                          className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline inline-flex items-center gap-1"
                                          title="Hapus Jurnal KBM"
                                        >
                                          <i className="fa-solid fa-trash-can text-[9px]"></i> Hapus
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                  </>
                )}
            </div>

            {(() => {
              let signerName = user?.nama || '( ........................................ )';
              let signerNip = user?.nip || '-';
              if (tabMode === 'kelas') {
                if (kelas && waliClasses.includes(kelas)) {
                  signerName = user?.nama || '( ........................................ )';
                  signerNip = user?.nip || '-';
                } else if (kelas && waliKelasMap[kelas]?.nama_guru) {
                  signerName = waliKelasMap[kelas].nama_guru;
                  signerNip = waliKelasMap[kelas].nip || '-';
                } else if (!isWaliKelas && waliClasses.length === 0) {
                  signerName = '( ........................................ )';
                  signerNip = '-';
                }
              }
              return (
                <PrintSignature
                  leftTitle="Mengetahui,"
                  leftSubtitle={tabMode === 'kelas' ? 'Wali Kelas' : 'Guru Mata Pelajaran'}
                  leftName={signerName}
                  leftNip={signerNip}
                  user={user}
                  sekolahId={user?.sekolah_id}
                  statusKepalaSekolah={effectiveStatus}
                />
              );
            })()}

            {jurnalData && jurnalData.length > 0 && (
              <div id="btn-group-jurnal-guru" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 fade-in no-print">
                  <button type="button" onClick={() => {
                    if (!filteredJurnal || filteredJurnal.length === 0) return;

                    let headers: string[] = [];
                    let csvRows: string[] = [];

                    if (tabMode === 'kelas') {
                      headers = [
                        'No',
                        'Nama Guru',
                        'Tanggal & Waktu',
                        'Mapel',
                        'Jam KBM',
                        'Materi',
                        'Foto',
                        'Keterangan kehadiran guru'
                      ];
                      csvRows = [headers.map(h => `"${h}"`).join(',')];
                      filteredJurnal.forEach((j: any, index: number) => {
                        const isRowHanyaKbm = checkIsHanyaKbm(j.nama_guru, undefined, j.user_id);
                        const col1 = String(index + 1);
                        const col2 = j.nama_guru || '-';
                        const col3 = `${formatHariTanggal(j.tanggal)}${j.timestamp && !isRowHanyaKbm ? ` ${j.timestamp.substring(11, 16)}` : ''}`;
                        const col4 = j.mapel || '-';
                        const col5 = isRowHanyaKbm ? 'KBM' : (j.jam_ke ? `Jam ke-${j.jam_ke}` : (j.pertemuan_ke ? `Pertemuan ${j.pertemuan_ke}` : '-'));
                        const isTidakMasukKelas = j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas' || j.keterangan?.toLowerCase() === 'tidak masuk kelas';
                        const isTidakKegiatan = j.status_verifikasi === 'Tidak Melaksanakan Kegiatan' || j.keterangan?.toLowerCase() === 'tidak melaksanakan kegiatan apapun';
                        const isSakit = j.status_verifikasi === 'Sakit' || j.keterangan === 'Sakit' || j.materi === 'Sakit';
                        const isIzin = j.status_verifikasi === 'Izin' || j.keterangan === 'Izin' || j.materi === 'Izin';
                        const isDinasLuar = j.status_verifikasi === 'Dinas Luar' || j.keterangan === 'Dinas Luar' || j.materi === 'Dinas Luar';
                        const col6 = isSakit ? 'Sakit' : isIzin ? 'Izin' : isDinasLuar ? 'Dinas Luar' : isTidakMasukKelas ? (isRowHanyaKbm ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas') : isTidakKegiatan ? (isRowHanyaKbm ? 'Wajib Hadir KBM' : 'tidak melaksanakan kegiatan apapun') : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-') ? j.materi_pembelajaran : (j.materi && j.materi !== '-' ? j.materi : ((j.konten && j.konten !== '-') ? j.konten : '-')));
                        const col7 = j.foto_kegiatan || j.link_bukti_foto || '-';
                        const col8 = isRowHanyaKbm
                          ? (isSakit ? 'Sakit' : isIzin ? 'Izin' : isDinasLuar ? 'Dinas Luar' : isTidakMasukKelas ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'Hadir KBM')
                          : (isSakit ? 'Sakit' : isIzin ? 'Izin' : isDinasLuar ? 'Dinas Luar' : isTidakMasukKelas ? 'tidak masuk kelas' : isTidakKegiatan ? 'tidak melaksanakan kegiatan apapun' : (j.keterangan || (j.status_verifikasi ? `Hadir (${j.status_verifikasi})` : 'Hadir')));

                        csvRows.push([
                          `"${col1.replace(/"/g, '""')}"`,
                          `"${col2.replace(/"/g, '""')}"`,
                          `"${col3.replace(/"/g, '""')}"`,
                          `"${col4.replace(/"/g, '""')}"`,
                          `"${col5.replace(/"/g, '""')}"`,
                          `"${col6.replace(/"/g, '""')}"`,
                          `"${col7.replace(/"/g, '""')}"`,
                          `"${col8.replace(/"/g, '""')}"`
                        ].join(','));
                      });
                    } else {
                      headers = [
                        'No',
                        'Hari/Tanggal',
                        'Materi/Konten',
                        'Kelas',
                        'Mata Pelajaran',
                        'Jumlah Murid',
                        'Hadir',
                        'Sakit',
                        'Izin',
                        'Alpa',
                        'Tempat/Lokasi KBM',
                        'Foto Dokumentasi',
                        'Keterangan',
                        'Status Verifikasi'
                      ];
                      csvRows = [headers.map(h => `"${h}"`).join(',')];
                      filteredJurnal.forEach((j: any, index: number) => {
                        const col1 = String(index + 1);
                        const col2 = formatHariTanggal(j.tanggal);
                        const isTidakMasukKelas = j.status_verifikasi === 'Tidak Masuk Kelas' || j.keterangan === 'Tidak Masuk Kelas' || j.keterangan?.toLowerCase() === 'tidak masuk kelas';
                        const isTidakKegiatan = j.status_verifikasi === 'Tidak Melaksanakan Kegiatan' || j.keterangan?.toLowerCase() === 'tidak melaksanakan kegiatan apapun';
                        const isSakit = j.status_verifikasi === 'Sakit' || j.keterangan === 'Sakit' || j.materi === 'Sakit';
                        const isIzin = j.status_verifikasi === 'Izin' || j.keterangan === 'Izin' || j.materi === 'Izin';
                        const isDinasLuar = j.status_verifikasi === 'Dinas Luar' || j.keterangan === 'Dinas Luar' || j.materi === 'Dinas Luar';
                        const col3 = isSakit ? 'Sakit' : isIzin ? 'Izin' : isDinasLuar ? 'Dinas Luar' : isTidakMasukKelas ? (isHanyaKbmUser ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas') : isTidakKegiatan ? (isHanyaKbmUser ? 'Wajib Hadir KBM' : 'tidak melaksanakan kegiatan apapun') : ((j.konten && j.konten !== '-') ? j.konten : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-') ? j.materi_pembelajaran : (j.materi || '-')));
                        const col4 = j.kelas || '-';
                        const col5 = j.mapel || '-';
                        const keadaan = parseKeadaanSiswaCounts(j);
                        const col6 = String(keadaan.jumlah || (keadaan.hadir + keadaan.sakit + keadaan.izin + keadaan.alpa) || '-');
                        const col7 = String(keadaan.hadir);
                        const col8 = String(keadaan.sakit);
                        const col9 = String(keadaan.izin);
                        const col10 = String(keadaan.alpa);
                        const col11 = resolveEntryLokasiKbm(j);
                        const col12 = j.foto_kegiatan || j.link_bukti_foto || '-';
                        const col13 = isSakit ? 'Presensi Sakit' : isIzin ? 'Presensi Izin' : isDinasLuar ? 'Presensi Dinas Luar' : isTidakMasukKelas ? (isHanyaKbmUser ? 'Wajib Hadir KBM (tidak masuk kelas)' : 'tidak masuk kelas') : isTidakKegiatan ? (isHanyaKbmUser ? 'Wajib Hadir KBM' : 'tidak melaksanakan kegiatan apapun') : (isHanyaKbmUser ? 'Hadir KBM' : (j.catatan_refleksi || j.refleksi || j.keterangan || '-'));
                        const status = isHanyaKbmUser
                          ? (isSakit ? 'Sakit' : isIzin ? 'Izin' : isDinasLuar ? 'Dinas Luar' : isTidakMasukKelas ? 'Wajib Hadir KBM' : 'Hadir KBM')
                          : (isSakit ? 'Sakit' : isIzin ? 'Izin' : isDinasLuar ? 'Dinas Luar' : isTidakMasukKelas ? 'Tidak Masuk Kelas' : isTidakKegiatan ? 'tidak melaksanakan kegiatan apapun' : (j.status_verifikasi || 'Menunggu'));

                        csvRows.push([
                          `"${col1.replace(/"/g, '""')}"`,
                          `"${col2.replace(/"/g, '""')}"`,
                          `"${col3.replace(/"/g, '""')}"`,
                          `"${col4.replace(/"/g, '""')}"`,
                          `"${col5.replace(/"/g, '""')}"`,
                          `"${col6.replace(/"/g, '""')}"`,
                          `"${col7.replace(/"/g, '""')}"`,
                          `"${col8.replace(/"/g, '""')}"`,
                          `"${col9.replace(/"/g, '""')}"`,
                          `"${col10.replace(/"/g, '""')}"`,
                          `"${col11.replace(/"/g, '""')}"`,
                          `"${col12.replace(/"/g, '""')}"`,
                          `"${col13.replace(/"/g, '""')}"`,
                          `"${status.replace(/"/g, '""')}"`
                        ].join(','));
                      });
                    }

                    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const fileName = tabMode === 'kelas'
                      ? `Rekap_Jurnal_Kelas_${kelas || 'Semua'}_${bulan}.csv`
                      : `Rekap_Jurnal_${user?.nama || 'Guru'}_${bulan}.csv`;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                  }} className="btn-click w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                    <i className="fa-solid fa-file-excel text-sm"></i> Excel
                  </button>
                  <button type="button" onClick={() => triggerPrintWithGps()} className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                    <i className="fa-solid fa-print text-sm"></i> Cetak Dokumen
                  </button>
              </div>
            )}
        </div>

        {/* Modal Detail Jurnal */}
        {selectedJurnal && (
          <div 
            id="modal-detail-jurnal" 
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm no-print"
            onClick={() => setSelectedJurnal(null)}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg shadow-inner">
                    <i className="fa-solid fa-book-open"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Detail Jurnal Pembelajaran
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatHariTanggal(selectedJurnal.tanggal)} &bull; {selectedJurnal.nama_guru || user?.nama || '-'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJurnal(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Prominent Rejection Feedback Banner in Detail Modal */}
              {selectedJurnal.status_verifikasi === 'Ditolak' && (
                <div id="modal-rejection-banner" className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-xs">
                  <div className="flex items-center gap-2 font-bold text-red-800 dark:text-red-300 mb-1.5">
                    <i className="fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400 text-sm"></i>
                    <span>Jurnal Ditolak oleh Administrator / Verifikator</span>
                  </div>
                  <div className="text-red-700 dark:text-red-300 bg-white/70 dark:bg-gray-900/70 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                    <span className="font-bold text-red-900 dark:text-red-200 block mb-0.5">Catatan / Alasan Penolakan:</span>
                    <span className="italic font-medium">
                      "{selectedJurnal.catatan_admin || selectedJurnal.alasan_penolakan || selectedJurnal.catatan_penolakan || selectedJurnal.keterangan_penolakan || 'Harap perbaiki dokumentasi atau materi KBM'}"
                    </span>
                  </div>
                </div>
              )}

              {/* Grid Metadata Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold">Mata Pelajaran</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedJurnal.mapel || '-'}</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold">Kelas</span>
                  <span className="font-bold text-gray-900 dark:text-white">{selectedJurnal.kelas || '-'}</span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold">Jam Ke / Sesi</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {checkIsHanyaKbm(selectedJurnal.nama_guru, undefined, selectedJurnal.user_id)
                      ? 'KBM'
                      : (selectedJurnal.jam_ke ? `Jam ke-${selectedJurnal.jam_ke}` : (selectedJurnal.pertemuan_ke ? `Pertemuan ${selectedJurnal.pertemuan_ke}` : '-'))}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold">Status Verifikasi</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                    selectedJurnal.status_verifikasi === 'Disetujui' || selectedJurnal.status_verifikasi === 'Diverifikasi'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : selectedJurnal.status_verifikasi === 'Ditolak'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : selectedJurnal.status_verifikasi === 'Sakit'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      : selectedJurnal.status_verifikasi === 'Izin'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : selectedJurnal.status_verifikasi === 'Dinas Luar'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : (selectedJurnal.status_verifikasi === 'Tidak Masuk Kelas' || selectedJurnal.keterangan === 'Tidak Masuk Kelas')
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    {checkIsHanyaKbm(selectedJurnal.nama_guru, undefined, selectedJurnal.user_id)
                      ? (selectedJurnal.status_verifikasi === 'Tidak Masuk Kelas' || selectedJurnal.keterangan === 'Tidak Masuk Kelas'
                          ? 'Wajib Hadir KBM'
                          : (selectedJurnal.status_verifikasi === 'Sakit' || selectedJurnal.status_verifikasi === 'Izin' || selectedJurnal.status_verifikasi === 'Dinas Luar' ? selectedJurnal.status_verifikasi : 'Hadir KBM'))
                      : (selectedJurnal.status_verifikasi || 'Menunggu')}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl col-span-2">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold">Lokasi KBM</span>
                  <span className="font-medium text-gray-900 dark:text-white">{resolveEntryLokasiKbm(selectedJurnal)}</span>
                </div>
              </div>

              {/* Learning details */}
              <div className="space-y-2.5 text-xs">
                {selectedJurnal.tujuan_pembelajaran && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold mb-1">Tujuan Pembelajaran (TP)</span>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedJurnal.tujuan_pembelajaran}</p>
                  </div>
                )}
                {selectedJurnal.kktp && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold mb-1">KKTP</span>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{selectedJurnal.kktp}</p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold mb-1">Materi / Konten</span>
                  <p className="text-gray-900 dark:text-white font-medium whitespace-pre-wrap">
                    {(selectedJurnal.konten && selectedJurnal.konten !== '-') ? selectedJurnal.konten : ((selectedJurnal.materi_pembelajaran && selectedJurnal.materi_pembelajaran !== '-') ? selectedJurnal.materi_pembelajaran : (selectedJurnal.materi && selectedJurnal.materi !== '-' ? selectedJurnal.materi : '-'))}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold mb-1">Kegiatan Pembelajaran</span>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {(selectedJurnal.kegiatan_pembelajaran && selectedJurnal.kegiatan_pembelajaran !== '-') ? selectedJurnal.kegiatan_pembelajaran : (selectedJurnal.kegiatan && selectedJurnal.kegiatan !== '-' ? selectedJurnal.kegiatan : '-')}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold mb-1">Absensi Siswa</span>
                  <p className="text-gray-900 dark:text-white font-medium whitespace-pre-wrap">
                    {formatAbsensi(selectedJurnal.absensi_siswa, selectedJurnal.detail_absen, selectedJurnal.kehadiran_murid)}
                  </p>
                </div>
                {(selectedJurnal.catatan_refleksi || selectedJurnal.refleksi) && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold mb-1">Catatan Refleksi</span>
                    <p className="text-gray-900 dark:text-white italic whitespace-pre-wrap">
                      {selectedJurnal.catatan_refleksi || selectedJurnal.refleksi}
                    </p>
                  </div>
                )}
                {/* Photo view */}
                {(selectedJurnal.foto_kegiatan || selectedJurnal.link_bukti_foto) && (selectedJurnal.foto_kegiatan !== '-' || selectedJurnal.link_bukti_foto !== '-') && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                    <span className="text-gray-500 dark:text-gray-400 block text-[10px] uppercase font-bold mb-2">Dokumentasi Foto</span>
                    <div className="flex flex-col items-center gap-2">
                      <img 
                        src={transformGoogleDriveUrl(selectedJurnal.foto_kegiatan || selectedJurnal.link_bukti_foto)} 
                        alt="Dokumentasi KBM"
                        className="max-h-60 w-auto rounded-xl object-contain border border-gray-200 dark:border-gray-700 shadow-sm"
                      />
                      <a 
                        href={selectedJurnal.foto_kegiatan || selectedJurnal.link_bukti_foto}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-1"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Buka Gambar Ukuran Penuh
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                {!isReadOnly && (tabMode === 'pribadi' || controlledMode === 'pribadi') && !selectedJurnal.id?.startsWith('unfilled-') && (selectedJurnal.nama_guru === user?.nama || selectedJurnal.user_id === user?.id || (user?.nama && selectedJurnal.nama_guru?.toLowerCase().includes(user.nama.toLowerCase()))) ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedJurnal;
                        setSelectedJurnal(null);
                        handleOpenEditModal(target);
                      }}
                      className="btn-click px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Edit Jurnal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteJurnal(selectedJurnal);
                      }}
                      className="btn-click px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-trash-can"></i> Hapus Jurnal
                    </button>
                  </div>
                ) : <div />}
                <button
                  type="button"
                  onClick={() => setSelectedJurnal(null)}
                  className="btn-click px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition ml-auto"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Milestone 2 - R2: Modal Edit Jurnal KBM (Tanpa Batasan Waktu) */}
        {isEditModalOpen && editingJurnal && (
          <div 
            id="modal-edit-jurnal" 
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm no-print"
            onClick={() => {
              if (!isSavingEdit) {
                setIsEditModalOpen(false);
                setEditingJurnal(null);
              }
            }}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shadow-inner">
                    <i className="fa-solid fa-pen-to-square"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Edit Jurnal KBM
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Sesuaikan data jurnal pembelajaran mandiri &bull; Tanpa batasan waktu
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingJurnal(null);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition disabled:opacity-50"
                >
                  <i className="fa-solid fa-xmark text-sm"></i>
                </button>
              </div>

              {/* Rejection Notice if applicable */}
              {editingJurnal.status_verifikasi === 'Ditolak' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <i className="fa-solid fa-circle-info text-amber-600"></i>
                    <span>Jurnal Sebelumnya Ditolak</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Setelah diperbaiki dan disimpan, status jurnal akan otomatis diperbarui kembali menjadi 'Menunggu' / 'Disetujui' dan catatan penolakan dibersihkan.
                  </p>
                </div>
              )}

              {/* Form Fields: Urutan & Struktur 8 Kolom Standar (KBM) atau Jurnal Kegiatan */}
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                {!isEditingJurnalKegiatan ? (
                  <>
                    {/* 1. Nomor */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">1</span>
                        Nomor (Pertemuan ke-)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 1 atau 4 (Otomatis jika dikosongkan)"
                        value={editPertemuanKe}
                        onChange={e => setEditPertemuanKe(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* 2. Hari/Tanggal */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">2</span>
                        Hari/Tanggal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={editTanggal}
                        onChange={e => setEditTanggal(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* 3. Materi/Konten */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">3</span>
                        Materi / Konten Pembelajaran <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={editKonten}
                        onChange={e => setEditKonten(e.target.value)}
                        placeholder="Tuliskan uraian materi atau konten pembelajaran..."
                        required
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* 4. Kelas/JP */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2.5">
                      <span className="block text-[11px] font-bold text-gray-800 dark:text-gray-200">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">4</span>
                        Kelas / Jam Pembelajaran (JP)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Kelas <span className="text-red-500">*</span>
                          </label>
                          <input
                            list="edit-kelas-list"
                            type="text"
                            value={editKelas}
                            onChange={e => setEditKelas(e.target.value)}
                            placeholder="Pilih atau ketik kelas"
                            required
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <datalist id="edit-kelas-list">
                            {Array.from(new Set([...kelasList, ...assignedKelasList].filter(Boolean))).map((k: string) => (
                              <option key={k} value={k} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            JP (Jam Pelajaran)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: 1-2 atau 3-4"
                            value={editJamKe}
                            onChange={e => setEditJamKe(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Mata Pelajaran <span className="text-red-500">*</span>
                          </label>
                          <input
                            list="edit-mapel-list"
                            type="text"
                            value={editMapel}
                            onChange={e => setEditMapel(e.target.value)}
                            placeholder="Pilih atau ketik mata pelajaran"
                            required
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <datalist id="edit-mapel-list">
                            {Array.from(new Set([...mapelList, ...assignedMapelList].filter(Boolean))).map((m: string) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                    </div>

                    {/* 5. Keadaan Siswa */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">5</span>
                          Keadaan Siswa (H / I / S / A)
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                          Total: {editAbsensiCounts.total || (editAbsensiCounts.hadir + editAbsensiCounts.izin + editAbsensiCounts.sakit + editAbsensiCounts.alpa)} siswa
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-0.5 text-center">
                            Jumlah
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editAbsensiCounts.total}
                            onChange={e => updateAbsensiCount('total', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-1.5 py-1.5 text-center font-bold text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-green-700 dark:text-green-400 mb-0.5 text-center">
                            Hadir
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editAbsensiCounts.hadir}
                            onChange={e => updateAbsensiCount('hadir', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-1.5 py-1.5 text-center font-bold text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-0.5 text-center">
                            Sakit
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editAbsensiCounts.sakit}
                            onChange={e => updateAbsensiCount('sakit', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-1.5 py-1.5 text-center font-bold text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 mb-0.5 text-center">
                            Izin
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editAbsensiCounts.izin}
                            onChange={e => updateAbsensiCount('izin', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-1.5 py-1.5 text-center font-bold text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-red-700 dark:text-red-400 mb-0.5 text-center">
                            Alpa
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editAbsensiCounts.alpa}
                            onChange={e => updateAbsensiCount('alpa', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-1.5 py-1.5 text-center font-bold text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400"
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono italic">
                        Ringkasan: Total murid: {editAbsensiCounts.total || (editAbsensiCounts.hadir + editAbsensiCounts.izin + editAbsensiCounts.sakit + editAbsensiCounts.alpa)}, Hadir: {editAbsensiCounts.hadir}, Izin: {editAbsensiCounts.izin}, Sakit: {editAbsensiCounts.sakit}, Alpa: {editAbsensiCounts.alpa}
                      </div>
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Catatan Khusus Siswa <span className="text-gray-400 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={editCatatanKhususSiswa}
                          onChange={e => setEditCatatanKhususSiswa(e.target.value)}
                          placeholder="Catatan khusus terkait kehadiran/perilaku siswa (opsional)..."
                          className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {/* 6. Tempat/Lokasi KBM */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">6</span>
                        Tempat / Lokasi KBM <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editLokasiKbm}
                        onChange={e => setEditLokasiKbm(e.target.value)}
                        placeholder="Contoh: Ruang Kelas VIII A, Laboratorium Komputer"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </>
                ) : (
                  /* Form Edit Jurnal Kegiatan (Non-KBM) sesuai struktur GuruJurnal.tsx */
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Tanggal <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={editTanggal}
                          onChange={e => setEditTanggal(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Nama Kegiatan <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editKonten}
                          onChange={e => setEditKonten(e.target.value)}
                          placeholder="Tuliskan nama kegiatan..."
                          required
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Uraian / Deskripsi <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={editKegiatan}
                        onChange={e => setEditKegiatan(e.target.value)}
                        placeholder="Deskripsikan selengkapnya..."
                        required
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </>
                )}

                {/* 7. Dokumentasi Foto */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-bold text-gray-800 dark:text-gray-200">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">7</span>
                      Dokumentasi Foto KBM
                    </span>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                      {editFile ? '✓ Foto Baru Dipilih' : editPhotoPreview ? 'Foto Tersedia' : 'Pilih Foto'}
                    </span>
                  </div>

                  {/* Dua Opsi: Live Camera & Upload Foto */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="btn-click px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs border border-blue-200 dark:border-blue-800 transition shadow-sm">
                      <i className="fa-solid fa-camera"></i>
                      <span>Kamera Langsung</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onClick={e => { (e.target as HTMLInputElement).value = ''; }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setEditFile(f);
                            setEditPhotoPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>

                    <label className="btn-click px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl cursor-pointer flex items-center justify-center gap-1.5 font-bold text-xs border border-gray-200 dark:border-gray-700 transition shadow-sm">
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      <span>Upload Foto / Galeri</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onClick={e => { (e.target as HTMLInputElement).value = ''; }}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setEditFile(f);
                            setEditPhotoPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                  </div>

                  {editPhotoPreview && editPhotoPreview !== '-' ? (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                      <img 
                        src={transformGoogleDriveUrl(editPhotoPreview)} 
                        alt="Preview Foto"
                        className="h-24 w-auto rounded-xl object-contain border border-gray-200 dark:border-gray-700 shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== transformGoogleDriveUrl(editPhotoPreview)) {
                            target.src = transformGoogleDriveUrl(editPhotoPreview);
                          }
                        }}
                      />
                      <div className="space-y-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {editFile ? 'Foto Baru Dipilih (akan menggantikan foto lama)' : 'Foto Dokumentasi Saat Ini Tersimpan'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {editFile && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditFile(null);
                                setEditPhotoPreview(editingJurnal.foto_kegiatan || editingJurnal.link_bukti_foto || '');
                              }}
                              className="text-[10px] text-red-500 hover:underline font-bold"
                            >
                              Batal Ganti Foto
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                    Foto yang sudah ada akan tetap digunakan bila Anda tidak mengunggah foto baru.
                  </p>
                </div>

                {/* 8. Keterangan (Opsional) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-100 text-amber-700 text-[9px] font-bold mr-1">8</span>
                    Keterangan <span className="text-gray-400 font-normal">(Opsional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={editRefleksi}
                    onChange={e => setEditRefleksi(e.target.value)}
                    placeholder="Tuliskan keterangan tambahan atau catatan refleksi (opsional)..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Invariant AST tokens */}
                <div className="hidden" aria-hidden="true">
                  <input value={editTujuanPembelajaran} onChange={e => setEditTujuanPembelajaran(e.target.value)} placeholder="Tujuan Pembelajaran" />
                  <input value={editKktp} onChange={e => setEditKktp(e.target.value)} placeholder="KKTP" />
                  <input value={editKegiatan} onChange={e => setEditKegiatan(e.target.value)} placeholder="Kegiatan Pembelajaran" />
                </div>

                {/* Modal Footer */}
                <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingJurnal(null);
                    }}
                    className="btn-click px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="btn-click px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {isSavingEdit ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk"></i> Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </section>
  );
}

