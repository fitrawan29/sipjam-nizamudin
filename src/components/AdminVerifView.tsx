'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { 
  getWitaStartOfDay, 
  getWitaEndOfDay, 
  formatTimestampWita, 
  getWitaDateStr, 
  getWitaDayName,
  extractWitaDateStr
} from '@/lib/wita';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
import {
  isGuruDiPiket,
  isBkAccount,
  normalizeTeacherIdentityName,
  isTeacherNameEquivalent,
  resolveLinkedUserForTeacher,
  isTeacherRecordMatch
} from '@/lib/workflow';
import { isInvalidMapel, normalizeScheduleMapel } from '@/lib/dataIntegrityGuard';
import DokumenView from './DokumenView';

export interface AdminVerifViewProps {
  user: any;
  isReadOnly?: boolean;
  initialTab?: string;
}

// Helper: Memastikan jurnal bukan auto-record delinquency (Tidak Masuk Kelas / Tidak Melaksanakan Kegiatan)
export function isDelinquencyJournal(j: any): boolean {
  if (!j) return false;
  const sv = j.status_verifikasi;
  if (sv === 'Tidak Masuk Kelas' || sv === 'Tidak Melaksanakan Kegiatan') return true;
  const ket = (j.keterangan || '').trim().toLowerCase();
  if (ket === 'tidak masuk kelas' || ket === 'tidak melaksanakan kegiatan apapun') return true;
  const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
  if (mat === 'tidak masuk kelas' || mat === 'tidak melaksanakan kegiatan apapun') return true;
  return false;
}

// Helper: Memastikan jurnal benar-benar diisi oleh guru dengan materi pembelajaran riil (bukan auto-record delinquency / auto-fill berhalangan / placeholder absensi mandiri)
export function isRealSubmittedJournal(j: any): boolean {
  if (!j) return false;
  if (j._sourceTable === 'jurnal_bk' || j.isJurnalBk || j.bidang_bimbingan || j.jenis_layanan) return true;
  if (isDelinquencyJournal(j)) return false;
  const sv = j.status_verifikasi;
  if (sv === 'Sakit' || sv === 'Izin') return false;
  const ket = (j.keterangan || '').trim().toLowerCase();
  if (ket === 'auto-fill sistem karena guru berhalangan hadir') return false;
  const mat = (j.materi || j.materi_pembelajaran || '').trim().toLowerCase();
  if (mat.startsWith('guru tidak dapat mengisi jurnal karena')) return false;
  // Sesi yang baru diisi absensi siswa saja (materi dan kegiatan masih "-") bukan merupakan jurnal yang telah diserahkan
  if (j.materi === '-' && j.kegiatan === '-') return false;
  return true;
}

// Helper: Normalisasi nama guru & pencocokan via helper terpusat (menjaga kompatibilitas internal)
function normalizeTeacherName(name?: string | null): string {
  return normalizeTeacherIdentityName(name);
}

function isTeacherMatch(teacherName?: string | null, candidateName?: string | null, nip?: string | null): boolean {
  if (!teacherName || !candidateName) return false;
  if (isTeacherNameEquivalent(teacherName, candidateName)) return true;

  if (nip) {
    const normNip = normalizeTeacherName(nip);
    const normTeacher = normalizeTeacherName(teacherName);
    const normCandidate = normalizeTeacherName(candidateName);
    if (normNip && (normNip === normTeacher || normNip === normCandidate)) return true;
  }

  return false;
}

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

export default function AdminVerifView({ 
  user, 
  isReadOnly: propReadOnly,
  initialTab 
}: AdminVerifViewProps) {
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin';
  const isReadOnly = propReadOnly !== undefined ? propReadOnly : (!isAdmin && !isSuperadmin);

  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Presensi' | 'Jurnal' | 'Piket' | 'Dokumen'>(() => {
    if (initialTab) {
      const lower = initialTab.toLowerCase();
      if (lower === 'dokumen' || lower === 'perangkat') return 'Dokumen';
      if (lower === 'jurnal') return 'Jurnal';
      if (lower === 'piket') return 'Piket';
      if (lower === 'presensi') return 'Presensi';
    }
    return 'Presensi';
  });

  useEffect(() => {
    if (initialTab) {
      const lower = initialTab.toLowerCase();
      if (lower === 'dokumen' || lower === 'perangkat') setActiveTab('Dokumen');
      else if (lower === 'jurnal') setActiveTab('Jurnal');
      else if (lower === 'piket') setActiveTab('Piket');
      else if (lower === 'presensi') setActiveTab('Presensi');
    }
  }, [initialTab]);
  
  // Reactive Dropdown Filters
  const [taskFilter, setTaskFilter] = useState<'Semua' | 'Sudah' | 'Belum'>('Semua');
  const [verifFilter, setVerifFilter] = useState<'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak'>('Semua');

  // Master & Schedule Data for Cross-Referencing
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allPiketSchedule, setAllPiketSchedule] = useState<any[]>([]);
  const [allPenugasanPiket, setAllPenugasanPiket] = useState<any[]>([]);
  const [allJadwalPelajaran, setAllJadwalPelajaran] = useState<any[]>([]);
  const [aturanGlobal, setAturanGlobal] = useState<string>('Semua_Hari');
  const [guruHanyaMengajarList, setGuruHanyaMengajarList] = useState<string[]>([]);
  const [kalenderEvents, setKalenderEvents] = useState<any[]>([]);
  const [hariSekolah, setHariSekolah] = useState<number>(6);

  // Submissions Data
  const [presensiList, setPresensiList] = useState<any[]>([]);
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [piketList, setPiketList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  // Load Auxiliary Master Data
  const loadAuxData = useCallback(async () => {
    try {
      let kalenderQ = supabase.from('kalender_pendidikan').select('*');
      if (user?.sekolah_id) {
        kalenderQ = kalenderQ.or(`sekolah_id.eq.${user.sekolah_id},sekolah_id.is.null,sekolah_id.eq.00000000-0000-0000-0000-000000000000`);
      }

      let usersQ = supabase.from('users').select('id, nama, username, role');
      let teachersQ = supabase.from('data_guru').select('*').order('nama_guru', { ascending: true });
      let piketQ = supabase.from('jadwal_piket').select('*');
      let jadwalQ = supabase.from('jadwal_pelajaran').select('*');
      let penugasanQ = supabase.from('penugasan_piket').select('*');
      let pengaturanQ = supabase.from('pengaturan').select('*');

      if (user?.sekolah_id) {
        usersQ = usersQ.eq('sekolah_id', user.sekolah_id);
        teachersQ = teachersQ.eq('sekolah_id', user.sekolah_id);
        piketQ = piketQ.eq('sekolah_id', user.sekolah_id);
        jadwalQ = jadwalQ.eq('sekolah_id', user.sekolah_id);
        penugasanQ = penugasanQ.eq('sekolah_id', user.sekolah_id);
        pengaturanQ = pengaturanQ.eq('sekolah_id', user.sekolah_id);
      }
      const safeUsersPromise = Promise.resolve(usersQ).then(
        (res: any) => (res?.error ? { data: [] } : res),
        () => ({ data: [] })
      );

      const [teachersRes, piketRes, jadwalRes, penugasanRes, pengaturanRes, kalenderRes, usersRes] = await Promise.all([
        teachersQ,
        piketQ,
        jadwalQ,
        penugasanQ,
        pengaturanQ,
        kalenderQ,
        safeUsersPromise
      ]);

      const baseTeachers = teachersRes.data || [];
      const usersList = (usersRes as any)?.data || [];
      if ((usersRes as any)?.data) setAllUsers(usersList);

      const linkedUserIds = new Set(
        baseTeachers
          .map((t: any) => resolveLinkedUserForTeacher(t, usersList)?.id)
          .filter(Boolean)
          .map((id: any) => String(id))
      );
      const missingBkTeachers = usersList
        .filter((u: any) => isBkAccount(u.role) && !linkedUserIds.has(String(u.id)))
        .map((u: any) => ({
          id: `bk-user-${u.id}`,
          user_id: u.id,
          username: u.username,
          nip: u.username || '-',
          nama_guru: (u.nama || u.username || 'Guru BK').trim(),
          mata_pelajaran: 'BK',
          wajib_hadir_hanya_mengajar: false
        }));

      if (teachersRes.data || missingBkTeachers.length > 0) {
        setAllTeachers([...baseTeachers, ...missingBkTeachers]);
      }
      if (piketRes.data) setAllPiketSchedule(piketRes.data);
      if (penugasanRes.data) setAllPenugasanPiket(penugasanRes.data);
      if (jadwalRes.data) {
        const cleanJadwal = jadwalRes.data.filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel));
        setAllJadwalPelajaran(cleanJadwal);
      }
      if (kalenderRes.data) {
        setKalenderEvents(kalenderRes.data);
      }
      if (pengaturanRes.data) {
        const aturanRow = pengaturanRes.data.find(
          (p: any) => (p.key === 'aturan_kehadiran_guru' && p.value === 'Hari_Mengajar_Saja') || p.aturan_kehadiran_guru === 'Hari_Mengajar_Saja'
        );
        if (aturanRow) setAturanGlobal('Hari_Mengajar_Saja');

        const hsRow = pengaturanRes.data.find((p: any) => p.key === 'hari_sekolah' || p.hari_sekolah);
        if (hsRow) {
          const hsVal = parseInt(hsRow.value || hsRow.hari_sekolah, 10);
          if (!isNaN(hsVal)) setHariSekolah(hsVal);
        }

        const ghmRow = pengaturanRes.data.find((p: any) => p.key === 'guru_hanya_mengajar');
        if (ghmRow && ghmRow.value) {
          try {
            const parsed = JSON.parse(ghmRow.value);
            if (Array.isArray(parsed)) setGuruHanyaMengajarList(parsed);
            else if (parsed && typeof parsed === 'object') {
              const list: string[] = [];
              if (Array.isArray(parsed.ids)) list.push(...parsed.ids);
              if (Array.isArray(parsed.names)) list.push(...parsed.names);
              setGuruHanyaMengajarList(list);
            }
          } catch {
            // ignore json parse error
          }
        }
      }
    } catch (err) {
      console.error('Error loading master data for verification:', err);
    }
  }, [user?.sekolah_id]);

  useEffect(() => {
    loadAuxData();
    const handleConfigSync = () => {
      loadAuxData();
      loadData();
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sipjam_config_sync' && e.newValue) {
        handleConfigSync();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('sipjam:config_updated', handleConfigSync);
      window.addEventListener('sipjam:guru_updated', handleConfigSync);
      window.addEventListener('storage', handleStorageChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('sipjam:config_updated', handleConfigSync);
        window.removeEventListener('sipjam:guru_updated', handleConfigSync);
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [loadAuxData]);

  // Load Submissions Data & Subscribe to Realtime Updates
  useEffect(() => {
    loadData();

    const channelPresensi = supabase
      .channel(`verif-presensi-${user?.sekolah_id || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, () => {
        if (activeTab === 'Presensi') loadData();
      })
      .subscribe();

    const channelJurnal = supabase
      .channel(`verif-jurnal-${user?.sekolah_id || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran' }, () => {
        if (activeTab === 'Jurnal') loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_bk' }, () => {
        if (activeTab === 'Jurnal') loadData();
      })
      .subscribe();

    const handleBkUpdated = () => {
      if (activeTab === 'Jurnal') loadData();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('sipjam:jurnal_bk_updated', handleBkUpdated);
    }

    const channelPiket = supabase
      .channel(`verif-piket-${user?.sekolah_id || 'global'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket' }, () => {
        if (activeTab === 'Piket') loadData();
      })
      .subscribe();

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('sipjam:jurnal_bk_updated', handleBkUpdated);
      }
      supabase.removeChannel(channelPresensi);
      supabase.removeChannel(channelJurnal);
      supabase.removeChannel(channelPiket);
    };
  }, [date, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Presensi') {
        let query = supabase.from('presensi_guru').select('*');
        if (date) {
          const startOfDay = getWitaStartOfDay(date);
          const endOfDay = getWitaEndOfDay(date);
          query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);
        }
        query = query.order('timestamp', { ascending: false }).limit(200);
        
        const { data, error } = await query;
        if (error) console.error('Error loading presensi:', error);

        // Also query active multi-day leave records spanning the evaluated date
        let combinedData = data || [];
        const targetD = date || getWitaDateStr();
        if (targetD) {
          try {
            let multiQ = supabase
              .from('presensi_guru')
              .select('*')
              .lte('tanggal_mulai', targetD)
              .not('tanggal_mulai', 'is', null)
              .neq('status_verifikasi', 'Ditolak');
            if (user?.sekolah_id) {
              multiQ = multiQ.eq('sekolah_id', user.sekolah_id);
            }
            const { data: multiDayData, error: multiDayErr } = await multiQ;
            if (multiDayErr) {
              console.error('Error loading multi-day presensi:', multiDayErr);
            } else if (multiDayData && multiDayData.length > 0) {
              const activeLeaves = multiDayData.filter((p: any) => {
                if (p.tanggal_mulai && p.tanggal_selesai) {
                  return targetD >= p.tanggal_mulai && targetD <= p.tanggal_selesai;
                }
                if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
                  const days = Number(p.durasi_hari || p.durasiHari) || 1;
                  const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
                  return targetD >= p.tanggal_mulai && targetD <= computedEnd;
                }
                return false;
              });
              const existingIds = new Set(combinedData.map((d: any) => d.id));
              const newMultiDay = activeLeaves.filter((d: any) => !existingIds.has(d.id));
              combinedData = [...combinedData, ...newMultiDay];
            }
          } catch (mErr) {
            console.error('Multi-day presensi query exception:', mErr);
          }
        }
        setPresensiList(combinedData);
      } else if (activeTab === 'Jurnal') {
        let query = supabase.from('jurnal_pembelajaran').select('*');
        if (date) {
          query = query.eq('tanggal', date);
        }
        query = query.order('timestamp', { ascending: false }).limit(200);

        let bkQuery = supabase.from('jurnal_bk').select('*');
        if (date) {
          bkQuery = bkQuery.eq('tanggal', date);
        }
        if (user?.sekolah_id) {
          bkQuery = bkQuery.eq('sekolah_id', user.sekolah_id);
        }
        bkQuery = bkQuery.order('created_at', { ascending: false }).limit(200);

        const safeBkPromise = Promise.resolve(bkQuery).then(
          (res: any) => (res?.error && isSchemaCacheOrMissingTableError(res.error) ? { data: [] } : res),
          () => ({ data: [] })
        );

        const [{ data, error }, bkRes] = await Promise.all([query, safeBkPromise]);
        if (error) console.error('Error loading jurnal:', error);

        const rawBkList: any[] = [...((bkRes as any)?.data || [])];
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const bkCacheRaw = window.localStorage.getItem(`sipjam_jurnal_bk_cache_${user?.sekolah_id || 'default'}`);
            if (bkCacheRaw) {
              const parsedBk = JSON.parse(bkCacheRaw);
              if (Array.isArray(parsedBk)) {
                const seenBkIds = new Set(rawBkList.map((b: any) => b.id));
                parsedBk.forEach((b: any) => {
                  if (!b || seenBkIds.has(b.id)) return;
                  if (date && b.tanggal !== date) return;
                  rawBkList.push(b);
                  seenBkIds.add(b.id);
                });
              }
            }
          } catch (_) {}
        }

        const normalizedBkList = rawBkList.map((b: any) => ({
          ...b,
          _sourceTable: 'jurnal_bk',
          isJurnalBk: true,
          status_verifikasi: b.status_verifikasi || 'Menunggu',
          timestamp:
            b.created_at ||
            b.updated_at ||
            (b.tanggal ? `${b.tanggal}T${b.waktu || '08:00'}:00+08:00` : new Date().toISOString()),
          mapel: `Jurnal BK (${b.bidang_bimbingan || 'Konseling'})`,
          kelas: b.kelas || '-',
          materi: b.catatan || b.tindak_lanjut || b.jenis_layanan || '-',
          link_bukti_foto: b.link_dokumen || '-'
        }));

        setJurnalList([...(data || []), ...normalizedBkList]);

        // Also fetch presensi records covering target date so unsubmittedJurnal accurately identifies excused leaves
        const targetD = date || getWitaDateStr();
        if (targetD) {
          try {
            const startOfDay = getWitaStartOfDay(targetD);
            const endOfDay = getWitaEndOfDay(targetD);
            let pSingleQ = supabase.from('presensi_guru').select('*').gte('timestamp', startOfDay).lte('timestamp', endOfDay);
            let pMultiQ = supabase.from('presensi_guru').select('*').lte('tanggal_mulai', targetD).not('tanggal_mulai', 'is', null).neq('status_verifikasi', 'Ditolak');
            if (user?.sekolah_id) {
              pSingleQ = pSingleQ.eq('sekolah_id', user.sekolah_id);
              pMultiQ = pMultiQ.eq('sekolah_id', user.sekolah_id);
            }
            const [presensiRes, multiDayRes] = await Promise.all([pSingleQ, pMultiQ]);
            const pList = presensiRes.data || [];
            const activeLeaves = (multiDayRes.data || []).filter((p: any) => {
              if (p.tanggal_mulai && p.tanggal_selesai) {
                return targetD >= p.tanggal_mulai && targetD <= p.tanggal_selesai;
              }
              if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
                const days = Number(p.durasi_hari || p.durasiHari) || 1;
                const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
                return targetD >= p.tanggal_mulai && targetD <= computedEnd;
              }
              return false;
            });
            const existingIds = new Set(pList.map((d: any) => d.id));
            setPresensiList([...pList, ...activeLeaves.filter((d: any) => !existingIds.has(d.id))]);
          } catch (pErr) {
            console.error('Error loading presensi for jurnal view:', pErr);
          }
        }
      } else if (activeTab === 'Piket') {
        let query = supabase.from('laporan_piket').select('*');
        if (date) {
          query = query.eq('tanggal', date);
        }
        query = query.order('timestamp', { ascending: false }).limit(200);

        const { data, error } = await query;
        if (error) console.error('Error loading piket:', error);
        if (data) setPiketList(data);
      }
    } catch (error) {
      console.error('Verif load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveConfig = () => {
    switch (activeTab) {
      case 'Presensi':
        return { table: 'presensi_guru', label: 'Presensi' };
      case 'Jurnal':
        return { table: 'jurnal_pembelajaran', label: 'Jurnal' };
      case 'Piket':
        return { table: 'laporan_piket', label: 'Laporan Piket' };
      default:
        return { table: 'presensi_guru', label: 'Presensi' };
    }
  };

  const verifyItem = async (id: number | string, status: 'Disetujui' | 'Ditolak' | 'Dispensasi') => {
    if (isReadOnly) {
      return showToast('Mode Peninjau', 'Aksi dinonaktifkan: Anda dalam mode peninjauan (read-only).', 'warning');
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk memverifikasi pengajuan.',
        'warning'
      );
    }

    const { table, label } = getActiveConfig();

    let rejectionReason: string | null = null;
    let baDispensasi: string | null = null;

    if (status === 'Ditolak') {
      const { value: reason, isConfirmed } = await Swal.fire({
        title: `Tolak ${label}?`,
        input: 'textarea',
        inputLabel: 'Alasan Penolakan (Wajib Diisi)',
        inputPlaceholder: 'Tuliskan alasan penolakan atau perbaikan yang harus dilakukan oleh guru...',
        showCancelButton: true,
        confirmButtonText: 'Tolak Pengajuan',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Batal',
        cancelButtonColor: '#6b7280',
        inputValidator: (val) => {
          if (!val || !val.trim()) {
            return 'Alasan penolakan wajib diisi';
          }
          return null;
        }
      });

      if (!isConfirmed || !reason || !reason.trim()) {
        return; // Admin cancelled or validation stopped
      }
      rejectionReason = reason.trim();
    } else if (status === 'Dispensasi') {
      const { value: baNum, isConfirmed } = await Swal.fire({
        title: 'Reset / Pulihkan Status via Dispensasi?',
        html: `
          <div class="text-left text-xs text-gray-600 dark:text-gray-300 space-y-1.5 mb-2">
            <p>Tindakan ini memulihkan data ${label} yang sebelumnya ditolak menjadi <strong>Disetujui</strong> berdasarkan rekomendasi resmi (Formulir F-SIPJAM-02).</p>
            <p class="text-[11px] text-gray-500">Seluruh hak jam mengajar atau presensi guru akan dipulihkan utuh.</p>
          </div>
        `,
        input: 'text',
        inputLabel: 'Nomor Berita Acara / Keterangan Dispensasi',
        inputPlaceholder: 'Contoh: BA-SIPJAM/012/X/2026 atau Alasan Sah',
        showCancelButton: true,
        confirmButtonText: 'Pulihkan Status',
        confirmButtonColor: '#059669',
        cancelButtonText: 'Batal',
        cancelButtonColor: '#6b7280'
      });

      if (!isConfirmed) {
        return;
      }
      baDispensasi = (baNum || '').trim();
    }

    const currentList = activeTab === 'Presensi' ? presensiList : activeTab === 'Jurnal' ? jurnalList : piketList;
    const targetItem = currentList.find(item => item.id === id);
    const isBkItem = activeTab === 'Jurnal' && Boolean(targetItem?._sourceTable === 'jurnal_bk' || targetItem?.isJurnalBk);
    const targetTable = isBkItem ? 'jurnal_bk' : table;
    const displayLabel = isBkItem ? 'Jurnal BK' : label;

    setProcessingId(id);

    try {
      const targetDbStatus = status === 'Dispensasi' ? 'Disetujui' : status;
      const updatePayload: any = { status_verifikasi: targetDbStatus };
      if (status === 'Ditolak' && rejectionReason) {
        updatePayload.catatan_admin = rejectionReason;
        updatePayload.alasan_penolakan = rejectionReason;
      } else if (status === 'Dispensasi') {
        updatePayload.catatan_admin = baDispensasi
          ? `Disetujui via Dispensasi Khusus (No BA: ${baDispensasi})`
          : 'Disetujui via Dispensasi Khusus';
        updatePayload.alasan_penolakan = null;
      }

      const { error } = await supabase
        .from(targetTable)
        .update(updatePayload)
        .eq('id', id);

      if (error) {
        const errCode = String(error.code || '');
        const errMsg = String(error.message || '').toLowerCase();
        const isMissingVerifCol =
          isBkItem &&
          (errCode === 'PGRST204' ||
            errCode === '42703' ||
            errMsg.includes('status_verifikasi') ||
            errMsg.includes('catatan_admin') ||
            errMsg.includes('alasan_penolakan'));
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memverifikasi',
          text: isMissingVerifCol
            ? 'Kolom verifikasi pada tabel jurnal_bk belum tersedia di database. Jalankan migrasi supabase/migrations/20261110_add_verifikasi_to_jurnal_bk.sql di Supabase SQL Editor.'
            : error.message,
          confirmButtonColor: '#0B4619'
        });
      } else {
        if (isBkItem && typeof window !== 'undefined' && window.localStorage) {
          try {
            const bkCacheKey = `sipjam_jurnal_bk_cache_${targetItem?.sekolah_id || user?.sekolah_id || 'default'}`;
            const rawCache = window.localStorage.getItem(bkCacheKey);
            if (rawCache) {
              const parsedCache = JSON.parse(rawCache);
              if (Array.isArray(parsedCache)) {
                const updatedCache = parsedCache.map((c: any) => (c?.id === id ? { ...c, ...updatePayload } : c));
                window.localStorage.setItem(bkCacheKey, JSON.stringify(updatedCache));
              }
            }
            window.dispatchEvent(new CustomEvent('sipjam:jurnal_bk_updated'));
          } catch (_) {}
        }

        // Dispatch rejection notification (Web Push & in-app chat)
        if (status === 'Ditolak' && rejectionReason && targetItem) {
          const teacherName = activeTab === 'Piket' 
            ? (targetItem.guru_pelapor || targetItem.kehadiran_guru_piket || targetItem.nama_guru || '')
            : (targetItem.nama_guru || '');
          const detailInfo = activeTab === 'Presensi'
            ? `Presensi ${targetItem.tipe_absen || 'Datang'}`
            : activeTab === 'Jurnal'
            ? (isBkItem
                ? `Jurnal BK (${targetItem.bidang_bimbingan || 'Konseling'}${targetItem.nama_siswa ? ` - ${targetItem.nama_siswa}` : ''})`
                : targetItem.keterangan === 'Jurnal Kegiatan' || targetItem.mapel === 'Jurnal Kegiatan'
                ? `Jurnal Kegiatan (${targetItem.materi || targetItem.kegiatan || 'Sistem Blok'})`
                : `Jurnal ${targetItem.kelas && targetItem.kelas !== '-' ? targetItem.kelas : ''} ${targetItem.mapel && targetItem.mapel !== '-' ? `(${targetItem.mapel})` : ''}`.trim())
            : `Laporan Piket ${targetItem.tanggal || ''}`.trim();

          if (teacherName) {
            fetch('/api/notifications/rejection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacherName,
                category: activeTab,
                detailInfo,
                rejectionReason,
                targetView: isBkItem ? 'view-jurnal-bk' : undefined,
                adminName: user?.nama_lengkap || user?.nama || user?.username || 'Admin',
                adminId: user?.id,
                sekolahId: targetItem.sekolah_id || user?.sekolah_id
              })
            }).catch(notifErr => console.error('Error dispatching rejection notification:', notifErr));
          }
        }

        // Optimistic update
        if (status === 'Ditolak') {
          // Immediately remove the rejected item from the active verification list
          if (activeTab === 'Presensi') {
            setPresensiList(prev => prev.filter(item => item.id !== id));
          } else if (activeTab === 'Jurnal') {
            setJurnalList(prev => prev.filter(item => item.id !== id));
          } else {
            setPiketList(prev => prev.filter(item => item.id !== id));
          }
        } else {
          if (activeTab === 'Presensi') {
            setPresensiList(prev => prev.map(item => item.id === id ? { ...item, ...updatePayload } : item));
          } else if (activeTab === 'Jurnal') {
            setJurnalList(prev => prev.map(item => item.id === id ? { ...item, ...updatePayload } : item));
          } else {
            setPiketList(prev => prev.map(item => item.id === id ? { ...item, ...updatePayload } : item));
          }
        }

        showToast(
          status === 'Dispensasi' ? `${displayLabel} Dipulihkan (Dispensasi)` : `${displayLabel} ${status}`,
          status === 'Ditolak' 
            ? `Alasan: ${rejectionReason}` 
            : status === 'Dispensasi'
            ? updatePayload.catatan_admin
            : undefined,
          status === 'Ditolak' ? 'info' : 'success'
        );
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const bulkVerifyCurrent = async () => {
    if (isReadOnly) {
      return showToast('Mode Peninjau', 'Aksi dinonaktifkan: Anda dalam mode peninjauan (read-only).', 'warning');
    }
    if (taskFilter === 'Belum') return;
    const { table, label } = getActiveConfig();
    const pendingItems = displayList.filter(item => !item.isUnsubmitted && (activeTab !== 'Jurnal' || isRealSubmittedJournal(item)) && item.status_verifikasi !== 'Disetujui' && item.status_verifikasi !== 'Diverifikasi' && item.status_verifikasi !== 'Ditolak');

    if (pendingItems.length === 0) {
      return showToast('Info', `Semua ${label} yang tampil sudah berstatus Disetujui.`, 'info');
    }

    const result = await Swal.fire({
      title: 'Setujui Semua Tampil?',
      text: `Anda akan menyetujui ${pendingItems.length} data ${label} sekaligus.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Setujui Semua',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const kbmPendingIds = pendingItems
        .filter(item => !(activeTab === 'Jurnal' && (item._sourceTable === 'jurnal_bk' || item.isJurnalBk)))
        .map(item => item.id);
      const bkPendingIds = pendingItems
        .filter(item => activeTab === 'Jurnal' && (item._sourceTable === 'jurnal_bk' || item.isJurnalBk))
        .map(item => item.id);
      let hasError = false;

      const updateBatches = async (targetTbl: string, ids: (string | number)[]) => {
        for (let i = 0; i < ids.length; i += 100) {
          const batchIds = ids.slice(i, i + 100);
          const { error } = await supabase
            .from(targetTbl)
            .update({ status_verifikasi: 'Disetujui' })
            .in('id', batchIds);

          if (error) {
            hasError = true;
            showToast('Gagal Sebagian', error.message, 'error');
            return false;
          }
        }
        return true;
      };

      const okPrimary = kbmPendingIds.length > 0 ? await updateBatches(table, kbmPendingIds) : true;
      if (okPrimary && bkPendingIds.length > 0) {
        const okBk = await updateBatches('jurnal_bk', bkPendingIds);
        if (okBk && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam:jurnal_bk_updated'));
        }
      }

      if (!hasError) {
        showToast('Berhasil Disetujui', `${pendingItems.length} data ${label} berhasil disetujui.`, 'success');
        loadData();
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Gagal memproses persetujuan massal', 'error');
    } finally {
      setLoading(false);
    }
  };


  // Target date for cross-referencing
  const effectiveDate = useMemo(() => {
    return date || getWitaDateStr();
  }, [date]);

  // Day name for the target date
  const effectiveDayName = useMemo(() => {
    const d = new Date(effectiveDate + 'T12:00:00+08:00');
    return getWitaDayName(d);
  }, [effectiveDate]);

  // Holiday evaluation for effectiveDate
  const holidayInfo = useMemo(() => {
    if (!effectiveDate) return null;

    // 1. Sunday is always a weekend holiday
    if (effectiveDayName === 'Minggu') {
      return { isHoliday: true, keterangan: 'Hari Minggu (Libur Akhir Pekan)' };
    }

    // 2. Saturday is a holiday if 5-day school week is configured
    if (effectiveDayName === 'Sabtu' && hariSekolah === 5) {
      return { isHoliday: true, keterangan: 'Hari Sabtu (Libur Sekolah 5 Hari)' };
    }

    // 3. Kalender Pendidikan events with tipe Libur
    const calMatch = kalenderEvents.find((evt: any) => {
      const tipe = (evt.tipe || '').toLowerCase();
      const isLibur = tipe === 'libur' || tipe.includes('libur');
      if (!isLibur) return false;

      // Exact single day
      if (evt.tanggal && evt.tanggal === effectiveDate) return true;

      // Date range [tanggal_mulai, tanggal_selesai]
      if (evt.tanggal_mulai && evt.tanggal_selesai) {
        return effectiveDate >= evt.tanggal_mulai && effectiveDate <= evt.tanggal_selesai;
      }
      if (evt.tanggal_mulai && !evt.tanggal_selesai && evt.tanggal_mulai === effectiveDate) {
        return true;
      }

      return false;
    });

    if (calMatch) {
      return {
        isHoliday: true,
        keterangan: calMatch.keterangan || 'Libur Kalender Pendidikan'
      };
    }

    return null;
  }, [effectiveDate, effectiveDayName, hariSekolah, kalenderEvents]);

  // Compute Unsubmitted Teachers per Tab
  const unsubmittedPresensi = useMemo(() => {
    if (allTeachers.length === 0) return [];
    if (holidayInfo?.isHoliday) return []; // Non-delinquency holiday handling: zero teachers marked unsubmitted
    
    // Always filter strictly by targetDate = date || effectiveDate
    const targetDate = date || effectiveDate;
    const submittedList = presensiList.filter(p => {
      // Check multi-day leave span (targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai)
      if (p.tanggal_mulai && p.tanggal_selesai && targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai) {
        if (p.status_verifikasi !== 'Ditolak') return true;
      }
      if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
        const days = Number(p.durasi_hari || p.durasiHari) || 1;
        const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
        if (targetDate >= p.tanggal_mulai && targetDate <= computedEnd) {
          if (p.status_verifikasi !== 'Ditolak') return true;
        }
      }
      if (!p.timestamp) return false;
      const witaStr = extractWitaDateStr(p.timestamp);
      if (witaStr) return witaStr === targetDate;
      try {
        return getWitaDateStr(new Date(p.timestamp)) === targetDate;
      } catch {
        return false;
      }
    });

    return allTeachers
      .filter(t => {
        const linkedUser = resolveLinkedUserForTeacher(t, allUsers);
        const hasSubmitted = submittedList.some(p =>
          isTeacherRecordMatch(p, t, linkedUser)
        );
        return !hasSubmitted;
      })
      .map(t => {
        const linkedUser = resolveLinkedUserForTeacher(t, allUsers);

        // Check scheduled classes today
        const targetDayLower = (effectiveDayName || '').trim().toLowerCase();
        const scheduledClasses = allJadwalPelajaran.filter((j: any) => {
          if ((j.hari || '').trim().toLowerCase() !== targetDayLower) return false;
          if (isInvalidMapel(j.mata_pelajaran || j.mapel)) return false;
          return isTeacherRecordMatch(j, t, linkedUser, { allowSingleWordFirstToken: true });
        });

        // Check piket today (jadwal_piket & penugasan_piket)
        const inJadwalPiket = allPiketSchedule.some((p: any) =>
          (p.hari || '').trim().toLowerCase() === targetDayLower &&
          [t.nama_guru, linkedUser?.nama].some(alias => alias && isGuruDiPiket(p.daftar_guru, alias))
        );
        const inPenugasanPiket = allPenugasanPiket.some((p: any) =>
          (p.hari || '').trim().toLowerCase() === targetDayLower && isTeacherRecordMatch(p, t, linkedUser)
        );
        const hasPiketToday = inJadwalPiket || inPenugasanPiket;

        // Check if teacher is TU staff or teacher without KBM hours across all timetable
        const isTu = (t.mata_pelajaran || '').toLowerCase().includes('tata usaha') ||
          (linkedUser?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
        const totalTeacherSchedules = isTu ? 0 : allJadwalPelajaran.filter((j: any) =>
          isTeacherRecordMatch(j, t, linkedUser, { allowSingleWordFirstToken: true })
        ).length;
        const isNonKbmOrTu = isTu || totalTeacherSchedules === 0;

        // Check if teacher is in category "wajib hadir pada jadwal KBM"
        const isExplicitExempt = t.wajib_hadir_hanya_mengajar === true || String(t.wajib_hadir_hanya_mengajar) === 'true' || t.wajib_hadir_hanya_mengajar === 1 || String(t.wajib_hadir_hanya_mengajar) === '1';
        const isExplicitNonExempt = t.wajib_hadir_hanya_mengajar === false || String(t.wajib_hadir_hanya_mengajar) === 'false' || t.wajib_hadir_hanya_mengajar === 0 || String(t.wajib_hadir_hanya_mengajar) === '0';
        const hasExplicitSetting = isExplicitExempt || isExplicitNonExempt;
        const isLegacyInList = guruHanyaMengajarList.some((item: string) => {
          const itemClean = item.trim().toLowerCase();
          return (
            item === t.id ||
            (t.user_id && item === t.user_id) ||
            (linkedUser?.id && item === linkedUser.id) ||
            (itemClean &&
              (itemClean === t.nama_guru?.toLowerCase().trim() ||
                (linkedUser?.nama && itemClean === linkedUser.nama.toLowerCase().trim()) ||
                (t.nip && itemClean === t.nip.toLowerCase().trim())))
          );
        });
        const isTeacherExempt = !isNonKbmOrTu && (isExplicitExempt || (!hasExplicitSetting && (isLegacyInList || aturanGlobal === 'Hari_Mengajar_Saja')));

        const isFreeFromPresence = isTeacherExempt && scheduledClasses.length === 0 && !hasPiketToday;

        return {
          id: `unsub-presensi-${t.id}`,
          nama_guru: t.nama_guru,
          nip: t.nip || '-',
          mata_pelajaran: t.mata_pelajaran || 'Guru',
          task_type: 'Presensi',
          pesan_belum: isFreeFromPresence ? 'Bebas Hadir' : 'Belum melakukan presensi datang maupun pulang',
          status_label: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
          status_verifikasi: isFreeFromPresence ? 'Bebas Hadir' : 'Alpa',
          isFreeFromPresence,
          isAlpa: !isFreeFromPresence,
          tanggal: targetDate,
          isUnsubmitted: true,
          search_aliases: [t.nama_guru, linkedUser?.nama, linkedUser?.username, t.nip].filter(Boolean).join(' ')
        };
      });
  }, [allTeachers, allUsers, presensiList, date, effectiveDate, effectiveDayName, allJadwalPelajaran, allPiketSchedule, allPenugasanPiket, aturanGlobal, guruHanyaMengajarList, holidayInfo]);

  const unsubmittedJurnal = useMemo(() => {
    if (allTeachers.length === 0) return [];
    if (holidayInfo?.isHoliday) return []; // Non-delinquency holiday handling: zero teachers marked unsubmitted

    // Always filter strictly by targetDate = date || effectiveDate
    const targetDate = date || effectiveDate;
    const submittedList = jurnalList.filter(j => j.tanggal === targetDate && j.status_verifikasi !== 'Tidak Masuk Kelas' && isRealSubmittedJournal(j));

    // R2: Teachers who have submitted attendance with status Sakit, Izin, or Dinas Luar must not be flagged as unsubmitted delinquency
    const isTeacherOnLeave = (teacher: any) => {
      const linkedUser = resolveLinkedUserForTeacher(teacher, allUsers);
      return presensiList.some(p => {
        if (!isTeacherRecordMatch(p, teacher, linkedUser)) return false;
        if (p.status_verifikasi === 'Ditolak') return false;
        const jp = (p.jenis_presensi || '').toLowerCase();
        const di = (p.detail_izin || '').toLowerCase();
        const isLeave = jp === 'sakit' || jp === 'izin' || jp === 'dinas luar' || di.includes('sakit') || di.includes('izin') || di.includes('dinas');
        if (!isLeave) return false;

        // Check active multi-day leave span
        if (p.tanggal_mulai && p.tanggal_selesai && targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai) {
          return true;
        }
        if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
          const days = Number(p.durasi_hari || p.durasiHari) || 1;
          const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
          if (targetDate >= p.tanggal_mulai && targetDate <= computedEnd) {
            return true;
          }
        }

        if (!p.timestamp) return false;
        const pDate = extractWitaDateStr(p.timestamp) || p.timestamp.substring(0, 10);
        return pDate === targetDate;
      });
    };

    return allTeachers
      .filter(t => {
        if (isTeacherOnLeave(t)) return false;

        const linkedUser = resolveLinkedUserForTeacher(t, allUsers);
        const hasSubmitted = submittedList.some(j =>
          isTeacherRecordMatch(j, t, linkedUser)
        );
        if (hasSubmitted) return false;

        const isTeacherBk = isBkAccount(t.mata_pelajaran, linkedUser?.role);
        if (isTeacherBk) return true;

        const targetDayLower = (effectiveDayName || '').trim().toLowerCase();
        const scheduledClasses = allJadwalPelajaran.filter((j: any) => {
          if ((j.hari || '').trim().toLowerCase() !== targetDayLower) return false;
          if (isInvalidMapel(j.mata_pelajaran || j.mapel)) return false;
          return isTeacherRecordMatch(j, t, linkedUser, { allowSingleWordFirstToken: true });
        });

        // Guru reguler yang tidak memiliki jadwal KBM hari ini tidak memiliki kewajiban jurnal KBM (Bebas KBM)
        if (scheduledClasses.length === 0) return false;

        return true;
      })
      .map(t => {
        const linkedUser = resolveLinkedUserForTeacher(t, allUsers);
        const isTeacherBk = isBkAccount(t.mata_pelajaran, linkedUser?.role);

        const targetDayLower = (effectiveDayName || '').trim().toLowerCase();
        const scheduledClasses = allJadwalPelajaran.filter((j: any) => {
          if ((j.hari || '').trim().toLowerCase() !== targetDayLower) return false;
          if (isInvalidMapel(j.mata_pelajaran || j.mapel)) return false;
          return isTeacherRecordMatch(j, t, linkedUser, { allowSingleWordFirstToken: true });
        });

        return {
          id: `unsub-jurnal-${t.id}`,
          nama_guru: t.nama_guru,
          nip: t.nip || '-',
          mata_pelajaran: isTeacherBk
            ? 'Bimbingan & Konseling (BK)'
            : isInvalidMapel(t.mata_pelajaran)
            ? normalizeScheduleMapel(t.mata_pelajaran)
            : (t.mata_pelajaran || 'Guru'),
          scheduledInfo: isTeacherBk
            ? `Layanan BK (${effectiveDayName})`
            : `${scheduledClasses.length} Kelas Terjadwal (${effectiveDayName})`,
          task_type: 'Jurnal',
          pesan_belum: isTeacherBk
            ? `Belum mengisi jurnal BK untuk tanggal ${targetDate}`
            : `Belum mengisi jurnal KBM untuk ${scheduledClasses.length} kelas terjadwal pada hari ${effectiveDayName}`,
          tanggal: targetDate,
          isUnsubmitted: true,
          search_aliases: [t.nama_guru, linkedUser?.nama, linkedUser?.username, t.nip].filter(Boolean).join(' ')
        };
      });
  }, [allTeachers, allUsers, jurnalList, presensiList, date, effectiveDate, effectiveDayName, allJadwalPelajaran, holidayInfo]);

  const unsubmittedPiket = useMemo(() => {
    if (allTeachers.length === 0) return [];
    if (holidayInfo?.isHoliday) return []; // Non-delinquency holiday handling: zero teachers marked unsubmitted

    const targetDayLower = (effectiveDayName || '').trim().toLowerCase();
    const piketToday = allPiketSchedule.find((p: any) => (p.hari || '').trim().toLowerCase() === targetDayLower);

    // Always filter strictly by targetDate = date || effectiveDate
    const targetDate = date || effectiveDate;
    const submittedList = piketList.filter(p => p.tanggal === targetDate);

    // Teachers assigned to picket today (from jadwal_piket or penugasan_piket)
    const assignedTeachers = allTeachers.filter(t => {
      const linkedUser = resolveLinkedUserForTeacher(t, allUsers);
      const inJadwal = piketToday
        ? [t.nama_guru, linkedUser?.nama].some(alias => alias && isGuruDiPiket(piketToday.daftar_guru, alias))
        : false;
      const inPenugasan = allPenugasanPiket.some((p: any) =>
        (p.hari || '').trim().toLowerCase() === targetDayLower && isTeacherRecordMatch(p, t, linkedUser)
      );
      return inJadwal || inPenugasan;
    });

    return assignedTeachers
      .filter(t => {
        const linkedUser = resolveLinkedUserForTeacher(t, allUsers);
        const hasSubmitted = submittedList.some(p =>
          isTeacherRecordMatch(p, t, linkedUser)
        );
        return !hasSubmitted;
      })
      .map(t => {
        const linkedUser = resolveLinkedUserForTeacher(t, allUsers);
        return {
          id: `unsub-piket-${t.id}`,
          guru_pelapor: t.nama_guru,
          nama_guru: t.nama_guru,
          nip: t.nip || '-',
          mata_pelajaran: t.mata_pelajaran || 'Petugas Piket',
          task_type: 'Piket',
          pesan_belum: 'tidak membuat laporan piket',
          status_verifikasi: 'tidak membuat laporan piket',
          status_label: 'tidak membuat laporan piket',
          catatan_apel: 'tidak membuat laporan piket',
          tanggal: targetDate,
          isUnsubmitted: true,
          search_aliases: [t.nama_guru, linkedUser?.nama, linkedUser?.username, t.nip].filter(Boolean).join(' ')
        };
      });
  }, [allTeachers, allUsers, allPiketSchedule, allPenugasanPiket, piketList, date, effectiveDate, effectiveDayName, holidayInfo]);

  // Reactive Instant Client-side Filter Calculation (Zero flicker, zero reload)
  const displayList = useMemo(() => {
    const unsubmittedList = activeTab === 'Presensi' 
      ? unsubmittedPresensi 
      : activeTab === 'Jurnal' 
      ? unsubmittedJurnal 
      : unsubmittedPiket;

    const rawSubmittedList = activeTab === 'Presensi' 
      ? presensiList 
      : activeTab === 'Jurnal' 
      ? jurnalList 
      : piketList;

    // Untuk tab Jurnal, jangan tampilkan auto-record delinquency (Tidak Masuk Kelas / Tidak Melaksanakan Kegiatan)
    // tetapi TETAP tampilkan pengajuan riil guru dan pengajuan izin/sakit yang dikecualikan
    const baseSubmitted = activeTab === 'Jurnal'
      ? rawSubmittedList.filter(j => !isDelinquencyJournal(j))
      : rawSubmittedList;

    // Untuk tab Jurnal: Pastikan guru yang berstatus izin/sakit pada presensi_guru tetap muncul sebagai kartu terverifikasi
    let synthesizedLeaveList: any[] = [];
    if (activeTab === 'Jurnal') {
      const targetDate = date || effectiveDate;
      presensiList.forEach((p: any) => {
        const jp = (p.jenis_presensi || '').toLowerCase();
        const di = (p.detail_izin || '').toLowerCase();
        const isLeave = jp === 'sakit' || jp === 'izin' || di.includes('sakit') || di.includes('izin');
        if (!isLeave) return;
        if (p.status_verifikasi === 'Ditolak') return;

        let inDateRange = false;
        if (p.tanggal_mulai && p.tanggal_selesai && targetDate >= p.tanggal_mulai && targetDate <= p.tanggal_selesai) {
          inDateRange = true;
        } else if (p.tanggal_mulai && (p.durasi_hari || p.durasiHari)) {
          const days = Number(p.durasi_hari || p.durasiHari) || 1;
          const computedEnd = addDaysToDateStr(p.tanggal_mulai, days - 1);
          if (targetDate >= p.tanggal_mulai && targetDate <= computedEnd) inDateRange = true;
        } else if (p.timestamp) {
          const pDate = extractWitaDateStr(p.timestamp) || p.timestamp.substring(0, 10);
          if (pDate === targetDate) inDateRange = true;
        }
        if (!inDateRange) return;

        const leaveProfile = { nama_guru: p.nama_guru, user_id: p.user_id, nip: p.nip };
        const leaveLinkedUser = resolveLinkedUserForTeacher(leaveProfile, allUsers);
        const alreadyInBase = baseSubmitted.some((j: any) =>
          isTeacherRecordMatch(j, leaveProfile, leaveLinkedUser)
        );
        if (!alreadyInBase) {
          const leaveLabel = (jp === 'sakit' || di.includes('sakit')) ? 'Sakit' : 'Izin';
          synthesizedLeaveList.push({
            id: `excused-jurnal-${p.id}`,
            nama_guru: p.nama_guru,
            nip: p.nip || '-',
            tanggal: targetDate,
            kelas: '-',
            mapel: 'Dikecualikan (Izin / Sakit)',
            materi: `Dikecualikan (${leaveLabel})`,
            keterangan: `Presensi ${leaveLabel}: ${p.detail_izin || p.keterangan || leaveLabel}`,
            status_verifikasi: leaveLabel,
            isExcusedLeave: true,
            leaveType: leaveLabel,
            link_bukti_foto: p.link_bukti || '-',
            timestamp: p.timestamp || `${targetDate}T07:00:00+08:00`
          });
        }
      });
    }

    const submittedList = activeTab === 'Jurnal'
      ? [...baseSubmitted, ...synthesizedLeaveList]
      : rawSubmittedList;

    const matchesLinkedTeacherSearch = (item: any, q: string) =>
      allTeachers.some((t: any) => {
        const linked = resolveLinkedUserForTeacher(t, allUsers);
        return (
          isTeacherRecordMatch(item, t, linked) &&
          `${t.nama_guru || ''} ${t.nip || ''} ${linked?.nama || ''} ${linked?.username || ''}`
            .toLowerCase()
            .includes(q)
        );
      });

    // Filter unsubmitted items by search
    const filteredUnsubmitted = unsubmittedList.filter((item: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (item.nama_guru || '').toLowerCase().includes(q) ||
        (item.guru_pelapor || '').toLowerCase().includes(q) ||
        (item.nip || '').toLowerCase().includes(q) ||
        (item.mata_pelajaran || '').toLowerCase().includes(q) ||
        (item.pesan_belum || '').toLowerCase().includes(q) ||
        (item.status_label || '').toLowerCase().includes(q) ||
        (item.status_verifikasi || '').toLowerCase().includes(q) ||
        (item.search_aliases || '').toLowerCase().includes(q)
      );
    });

    // Filter submitted items by verification status and search
    const filteredSubmitted = submittedList.filter((item: any) => {
      // Hide rejected items from active verification list unless explicitly filtered by 'Ditolak'
      if (verifFilter !== 'Ditolak' && item.status_verifikasi === 'Ditolak') {
        return false;
      }

      // Verification status filter
      if (verifFilter !== 'Semua') {
        const rawStatus = item.status_verifikasi || 'Menunggu';
        const isPending = rawStatus === 'Menunggu' || rawStatus === 'Menunggu Verifikasi';
        if (verifFilter === 'Menunggu') {
          if (!isPending) return false;
        } else if (verifFilter === 'Disetujui') {
          if (rawStatus !== 'Disetujui' && rawStatus !== 'Diverifikasi' && rawStatus !== 'Sakit' && rawStatus !== 'Izin') return false;
        } else if (rawStatus !== verifFilter) {
          return false;
        }
      }

      // Search filter
      if (!search) return true;
      const q = search.toLowerCase();
      if (matchesLinkedTeacherSearch(item, q)) return true;
      if (activeTab === 'Presensi') {
        return (
          (item.nama_guru || '').toLowerCase().includes(q) ||
          (item.tipe_absen || '').toLowerCase().includes(q) ||
          (item.jenis_presensi || '').toLowerCase().includes(q) ||
          (item.status_verifikasi || '').toLowerCase().includes(q)
        );
      } else if (activeTab === 'Jurnal') {
        return (
          (item.nama_guru || '').toLowerCase().includes(q) ||
          (item.mapel || '').toLowerCase().includes(q) ||
          (item.kelas || '').toLowerCase().includes(q) ||
          (item.materi || '').toLowerCase().includes(q) ||
          (item.nama_siswa || '').toLowerCase().includes(q) ||
          (item.bidang_bimbingan || '').toLowerCase().includes(q) ||
          (item.jenis_layanan || '').toLowerCase().includes(q) ||
          (item.catatan || '').toLowerCase().includes(q) ||
          (item.tindak_lanjut || '').toLowerCase().includes(q)
        );
      } else {
        return (
          (item.guru_pelapor || '').toLowerCase().includes(q) ||
          (item.catatan_apel || '').toLowerCase().includes(q)
        );
      }
    });

    // R2: Explicitly sort history list (filteredSubmitted) from newest to oldest
    const sortedSubmitted = filteredSubmitted.slice().sort((a: any, b: any) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    // 1. If filtering for Belum Menyelesaikan
    if (taskFilter === 'Belum') {
      return filteredUnsubmitted;
    }

    // 2. If filtering for Sudah Menyelesaikan
    if (taskFilter === 'Sudah') {
      return sortedSubmitted;
    }

    // 3. If filtering for Semua (Sudah & Belum): Combine submitted items with unsubmitted items
    if (verifFilter !== 'Semua') {
      return sortedSubmitted;
    }
    // return [...filteredSubmitted, ...filteredUnsubmitted];
    return [...sortedSubmitted, ...filteredUnsubmitted];
  }, [
    taskFilter, 
    verifFilter, 
    activeTab, 
    search, 
    allTeachers,
    allUsers,
    presensiList, 
    jurnalList, 
    piketList, 
    unsubmittedPresensi, 
    unsubmittedJurnal, 
    unsubmittedPiket
  ]);

  return (
    <section id="view-admin-verif" className="view-section fade-in">
      <div className="glass-card p-4">
        {/* View Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-clipboard-check text-green-600 dark:text-green-400"></i> Verifikasi Data
          </h2>
          <div className="flex items-center gap-2">
            {/* Eliminasi tampilan tombol Pedoman Kebijakan & SOP SIPJAM (SOP Disiplin, docs/KONSEKUENSI_PELANGGARAN.md) per spesifikasi R2 Pusat Verifikasi */}
            <button 
              type="button" 
              onClick={loadData} 
              className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
              title="Muat ulang data"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Read-Only Notice for Headmaster / Viewers */}
        {isReadOnly && (
          <div data-testid="readonly-notice" className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-eye text-xs"></i>
            </div>
            <div>
              <span className="font-bold block">Mode Peninjauan (Monitoring Read-Only)</span>
              <span className="text-[11px] opacity-90">Akses pemantauan verifikasi aktif. Aksi modifikasi data dan persetujuan verifikasi dinonaktifkan.</span>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1">
          <button 
            type="button" 
            onClick={() => setActiveTab('Presensi')} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
              activeTab === 'Presensi' 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' 
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            Presensi
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('Jurnal')} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
              activeTab === 'Jurnal' 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' 
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            Jurnal
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('Piket')} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
              activeTab === 'Piket' 
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800' 
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            <i className="fa-solid fa-shield-halved mr-1.5"></i> Piket
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('Dokumen')} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
              activeTab === 'Dokumen' 
                ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800' 
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            <i className="fa-solid fa-folder-open mr-1.5"></i> Perangkat
          </button>
        </div>

        {/* Tab 4: Dokumen / Perangkat Pembelajaran (Keep-Alive in memory) */}
        <div className={activeTab === 'Dokumen' ? 'block' : 'hidden'}>
          <DokumenView user={user} isReadOnly={isReadOnly} />
        </div>

        {/* Tabs 1-3: Presensi, Jurnal, Piket Content */}
        <div className={activeTab === 'Dokumen' ? 'hidden' : 'block'}>
          {/* Banner Hari Libur */}
          {holidayInfo?.isHoliday && (
            <div 
              data-testid="holiday-banner" 
              className="mb-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-3 shadow-xs"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-umbrella-beach text-sm"></i>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold block text-sm">Hari Libur: {holidayInfo.keterangan}</span>
                <span className="text-[11px] opacity-90 block">
                  Pada hari libur ({effectiveDayName}, {effectiveDate}), seluruh guru dibebaskan dari kewajiban presensi, jurnal KBM, dan tugas piket tanpa ditandai alpa atau belum menyelesaikan tugas.
                </span>
              </div>
            </div>
          )}

          {/* Filter Bar Controls */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 space-y-3">
          {/* Date Picker Row */}
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <i className="fa-regular fa-calendar absolute left-3 top-3.5 text-gray-400 dark:text-gray-400 text-xs"></i>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full pl-8 pr-3 py-2.5 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
              />
            </div>
            <button 
              type="button" 
              onClick={() => setDate(getWitaDateStr())} 
              className="btn-click px-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl shrink-0 border border-emerald-200 dark:border-emerald-800"
            >
              Hari Ini
            </button>
            <button 
              type="button" 
              onClick={() => setDate('')} 
              className="btn-click px-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-bold rounded-xl shrink-0 border border-gray-300 dark:border-gray-600"
            >
              Semua
            </button>
          </div>

          {/* Reactive Dropdown Filters (Sudah/Belum & Status Verifikasi) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Filter 1: Penyelesaian Tugas */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 ml-1">
                Filter Penyelesaian Tugas
              </label>
              <select
                value={taskFilter}
                onChange={e => setTaskFilter(e.target.value as 'Semua' | 'Sudah' | 'Belum')}
                className="w-full px-3 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 font-semibold"
              >
                <option value="Semua">Semua Guru (Sudah & Belum)</option>
                <option value="Sudah">Sudah Menyelesaikan (Ada Pengajuan)</option>
                <option value="Belum">Belum Menyelesaikan (Belum Ada Data)</option>
              </select>
            </div>

            {/* Filter 2: Status Verifikasi */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 ml-1">
                Filter Status Verifikasi
              </label>
              <select
                value={verifFilter}
                onChange={e => setVerifFilter(e.target.value as 'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak')}
                disabled={taskFilter === 'Belum'}
                className="w-full px-3 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Semua">Semua Status Verifikasi</option>
                <option value="Menunggu">Menunggu Verifikasi</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          {/* Bulk Action Button or Indicator */}
          {taskFilter !== 'Belum' ? (
            isReadOnly ? (
              <div className="w-full py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-semibold flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 cursor-not-allowed select-none">
                <i className="fa-solid fa-lock text-xs"></i> Setujui Semua (Dinonaktifkan - Mode Peninjau)
              </div>
            ) : (
              <button 
                type="button" 
                onClick={bulkVerifyCurrent} 
                className="btn-click w-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 py-2.5 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 flex justify-center items-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition"
              >
                <i className="fa-solid fa-check-double"></i> Setujui Semua Tampil
              </button>
            )
          ) : (
            <div className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
              <span>Menampilkan guru yang belum menyelesaikan tugas {activeTab} untuk tanggal {effectiveDate}.</span>
            </div>
          )}
        </div>

        {/* Text Search Bar */}
        <div className="relative mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-400 text-xs"></i>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={activeTab === 'Piket' ? 'Cari guru pelapor atau catatan apel...' : 'Cari nama guru, NIP, atau mapel...'} 
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" 
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="px-3 py-2.5 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        {/* Verification Items List Grid */}
        <div id="verif-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
          {loading && displayList.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-gray-400">
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data verifikasi...
            </div>
          ) : displayList.length === 0 ? (
            <div className="col-span-full text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 my-2">
              <i className={`text-2xl mb-2 ${taskFilter === 'Belum' ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-solid fa-clipboard-check text-gray-400'}`}></i>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {taskFilter === 'Belum' 
                  ? `Semua guru telah menyelesaikan tugas ${activeTab} untuk tanggal ini!` 
                  : search 
                  ? `Tidak ada data yang cocok dengan pencarian "${search}".` 
                  : 'Tidak ada data untuk diverifikasi.'}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                </button>
              )}
            </div>
          ) : displayList.map((item: any) => {
            // Render Unsubmitted Teacher Card
            if (item.isUnsubmitted) {
              const isBebasHadir = item.isFreeFromPresence || item.pesan_belum === 'Bebas Hadir';
              const isPiketUnsubmitted = item.task_type === 'Piket' || item.status_verifikasi === 'tidak membuat laporan piket';
              const isPresensiUnsubmitted = (item.task_type === 'Presensi' || item.isAlpa || item.status_label === 'Alpa' || item.status_verifikasi === 'Alpa') && !isBebasHadir;

              return (
                <div 
                  key={item.id} 
                  className={`bg-white dark:bg-gray-800 p-3.5 rounded-xl border shadow-sm flex flex-col justify-between gap-2.5 transition ${
                    isBebasHadir
                      ? 'border-blue-200/80 dark:border-blue-900/40 hover:border-blue-400'
                      : isPiketUnsubmitted
                      ? 'border-orange-200/80 dark:border-orange-900/40 hover:border-orange-400'
                      : isPresensiUnsubmitted
                      ? 'border-red-200/80 dark:border-red-900/40 hover:border-red-400'
                      : 'border-rose-200/80 dark:border-rose-900/40 hover:border-rose-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">
                          {item.nama_guru || item.guru_pelapor}
                        </h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate">
                          {item.nip !== '-' && item.nip ? `NIP: ${item.nip}` : item.mata_pelajaran}
                        </p>
                      </div>
                      {isBebasHadir ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                          Bebas Hadir
                        </span>
                      ) : isPiketUnsubmitted ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800 shrink-0">
                          tidak membuat laporan piket
                        </span>
                      ) : isPresensiUnsubmitted ? (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 shrink-0">
                          <i className="fa-solid fa-user-xmark mr-1 text-[8px]"></i> Alpa
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                          <i className="fa-solid fa-clock-rotate-left mr-1 text-[8px]"></i> Belum Selesai
                        </span>
                      )}
                    </div>

                    {isBebasHadir ? (
                      <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-900 dark:text-blue-200">
                        <p className="font-semibold text-center">Bebas Hadir</p>
                      </div>
                    ) : isPiketUnsubmitted ? (
                      <div className="p-2.5 rounded-lg bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 text-xs text-orange-900 dark:text-orange-200">
                        <p className="font-semibold text-center">tidak membuat laporan piket</p>
                      </div>
                    ) : isPresensiUnsubmitted ? (
                      <div className="p-2.5 rounded-lg bg-red-50/70 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs text-red-900 dark:text-red-200 space-y-1">
                        <p className="font-semibold leading-snug flex items-start gap-1.5">
                          <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-500 text-[10px] shrink-0"></i>
                          <span>{item.pesan_belum}</span>
                        </p>
                        {item.scheduledInfo && (
                          <p className="text-[10px] text-gray-600 dark:text-gray-300 pl-4 font-medium">
                            Status: {item.scheduledInfo}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                        <p className="font-semibold leading-snug flex items-start gap-1.5">
                          <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-500 text-[10px] shrink-0"></i>
                          <span>{item.pesan_belum}</span>
                        </p>
                        {item.scheduledInfo && (
                          <p className="text-[10px] text-gray-600 dark:text-gray-300 pl-4 font-medium">
                            Status: {item.scheduledInfo}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between pt-1">
                      <span>Tanggal: {item.tanggal}</span>
                      <span className={`font-semibold ${
                        isBebasHadir 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : isPiketUnsubmitted 
                          ? 'text-orange-600 dark:text-orange-400' 
                          : isPresensiUnsubmitted
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isBebasHadir ? 'Bebas Hadir' : isPiketUnsubmitted ? 'tidak membuat laporan piket' : isPresensiUnsubmitted ? 'Alpa' : 'Belum Ada Data'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className={`py-1 px-2 rounded-lg text-center text-[10px] font-bold ${
                      isBebasHadir
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                        : isPiketUnsubmitted
                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium'
                        : isPresensiUnsubmitted
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'bg-gray-50 dark:bg-gray-700/40 text-gray-500 dark:text-gray-400 italic font-medium'
                    }`}>
                      {isBebasHadir ? 'Bebas Hadir' : isPiketUnsubmitted ? 'tidak membuat laporan piket' : isPresensiUnsubmitted ? 'Alpa (Tidak Melakukan Presensi Datang & Pulang)' : 'Menunggu pengajuan dari guru'}
                    </div>
                  </div>
                </div>
              );
            }

            // Render Standard Submitted Verification Card
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {activeTab === 'Piket' ? item.guru_pelapor : item.nama_guru}
                  </h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      item.status_verifikasi === 'Sakit' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                      item.status_verifikasi === 'Izin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      item.status_verifikasi === 'Dinas Luar' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      (item.status_verifikasi === 'Alpa' || item.jenis_presensi === 'Alpa') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      (item.status_verifikasi === 'Pulang Cepat' || item.status_verifikasi === 'Tidak Masuk Kelas' || item.jenis_presensi === 'Pulang Cepat' || item.status_verifikasi === 'tidak membuat laporan piket') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>{item.status_verifikasi || 'Menunggu'}</span>
                </div>

                {activeTab === 'Presensi' ? (
                  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                    <p><span className="font-semibold">Waktu:</span> {formatTimestampWita(item.timestamp)}</p>
                    <p><span className="font-semibold">Tipe:</span> <span className="font-bold text-nizamudin-green dark:text-green-400">{item.tipe_absen}</span></p>
                    <div className="flex items-center gap-1.5 flex-wrap my-1">
                      <span className="font-semibold">Kategori:</span>
                      {(() => {
                        const jp = (item.jenis_presensi || '').toLowerCase();
                        const di = (item.detail_izin || '').toLowerCase();
                        const sv = (item.status_verifikasi || '').toLowerCase();
                        if (jp === 'alpa' || sv === 'alpa') {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 inline-flex items-center gap-1">
                              <i className="fa-solid fa-user-xmark text-[10px]"></i> Alpa
                            </span>
                          );
                        }
                        if (jp === 'sakit' || di === 'sakit') {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1">
                              <i className="fa-solid fa-notes-medical text-[10px]"></i> Sakit
                            </span>
                          );
                        }
                        if (jp === 'izin' || (di.includes('izin') && di !== 'sakit')) {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                              <i className="fa-solid fa-envelope-open-text text-[10px]"></i> Izin
                            </span>
                          );
                        }
                        if (jp === 'dinas luar' || di.includes('dinas')) {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800 inline-flex items-center gap-1">
                              <i className="fa-solid fa-briefcase text-[10px]"></i> Dinas Luar
                            </span>
                          );
                        }
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1">
                            <i className="fa-solid fa-school text-[10px]"></i> Hadir di Sekolah
                          </span>
                        );
                      })()}
                    </div>
                    <p><span className="font-semibold">Jenis:</span> {item.jenis_presensi} {item.detail_izin && `(${item.detail_izin})`}</p>
                    {item.keterlambatan_detik > 0 && (
                      <p><span className="font-semibold">Terlambat:</span> <span className="font-bold text-amber-600 dark:text-amber-400">{Math.ceil(item.keterlambatan_detik / 60)} menit</span></p>
                    )}
                    {((item.detail_izin === 'Sakit' || item.jenis_presensi === 'Sakit') && (item.durasi_hari >= 3 || item.memerlukan_persetujuan_admin)) && (
                      <div className="my-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                          Sakit &gt;= 3 Hari (Perlu Persetujuan)
                        </span>
                      </div>
                    )}
                    {((item.jenis_presensi === 'Izin' || item.detail_izin?.includes('Izin')) && item.detail_izin !== 'Sakit' && (item.durasi_hari > 3 || item.memerlukan_persetujuan_admin)) && (
                      <div className="my-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                          Izin &gt; 3 Hari (Perlu Persetujuan)
                        </span>
                      </div>
                    )}
                    {(item.is_auto_checkout || item.status_verifikasi === 'Pulang Cepat' || item.jenis_presensi === 'Pulang Cepat' || item.status_verifikasi === 'Lupa Checkout') && (
                      <div className="my-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 inline-flex items-center gap-1">
                          <i className="fa-solid fa-robot text-[10px]"></i>
                          {item.status_verifikasi === 'Pulang Cepat' || item.jenis_presensi === 'Pulang Cepat' ? 'Auto-Checkout (Pulang Cepat)' : 'Auto-Checkout (Lupa Checkout)'}
                        </span>
                      </div>
                    )}
                    {(item.durasi_hari || item.tanggal_mulai) && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">Periode:</span> {item.tanggal_mulai ? `${item.tanggal_mulai} s/d ${item.tanggal_selesai || item.tanggal_mulai}` : ''} ({item.durasi_hari || 1} Hari)
                      </p>
                    )}
                    {item.link_bukti && item.link_bukti !== '-' && (
                      <div className="mt-2 flex items-center gap-2">
                        {item.link_bukti === 'pending:uploading' ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                            <i className="fa-solid fa-cloud-arrow-up animate-pulse text-[10px]"></i> Sedang diunggah ke Drive...
                          </span>
                        ) : item.link_bukti === 'gagal_upload' ? (
                          <span className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800">
                            <i className="fa-solid fa-circle-exclamation text-[10px]"></i> Upload dokumen tertunda
                          </span>
                        ) : (
                          <>
                            <img 
                              src={transformGoogleDriveUrl(item.link_bukti)} 
                              alt="Bukti Presensi" 
                              className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                            <a href={item.link_bukti} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs block">
                              <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Bukti Lampiran
                            </a>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : activeTab === 'Jurnal' ? (
                  (item._sourceTable === 'jurnal_bk' || item.isJurnalBk) ? (
                    <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 inline-flex items-center gap-1">
                          <i className="fa-solid fa-heart-pulse text-[10px]"></i>
                          Jurnal BK ({item.bidang_bimbingan || 'Konseling'})
                        </span>
                        {item.status && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.status}
                          </span>
                        )}
                      </div>
                      <p>
                        <span className="font-semibold">Tanggal:</span> {item.tanggal}
                        {item.waktu ? ` · ${item.waktu} WITA` : ''}
                        {item.tempat_layanan ? ` (${item.tempat_layanan})` : ''}
                      </p>
                      <p>
                        <span className="font-semibold">Siswa / Kelas:</span> {item.nama_siswa || '-'}{item.kelas && item.kelas !== '-' ? ` (${item.kelas})` : ''}
                      </p>
                      {item.jenis_layanan && (
                        <p><span className="font-semibold">Jenis Layanan:</span> {item.jenis_layanan}</p>
                      )}
                      <p className="line-clamp-2"><span className="font-semibold">Catatan:</span> {item.catatan || '-'}</p>
                      {item.tindak_lanjut && (
                        <p className="line-clamp-2"><span className="font-semibold">Tindak Lanjut:</span> {item.tindak_lanjut}</p>
                      )}
                      {item.link_dokumen && item.link_dokumen !== '-' && (
                        <div className="mt-2 flex items-center gap-2">
                          <a href={item.link_dokumen} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs inline-flex items-center gap-1">
                            <i className="fa-solid fa-paperclip"></i> Dokumen Pendukung BK
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                      <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                      {item.keterangan === 'Jurnal Kegiatan' || item.mapel === 'Jurnal Kegiatan' ? (
                        <p><span className="font-semibold">Tipe:</span> <span className="text-amber-600 dark:text-amber-400 font-bold">Jurnal Kegiatan (Sistem Blok)</span></p>
                      ) : (
                        <p><span className="font-semibold">Kelas/Mapel:</span> {item.kelas} - {item.mapel}</p>
                      )}
                      {(item.status_verifikasi === 'Tidak Masuk Kelas' || item.keterangan === 'Tidak Masuk Kelas') && (
                        <div className="pt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800 inline-flex items-center gap-1">
                            <i className="fa-solid fa-robot text-[10px]"></i>
                            Otomatis (Tidak Masuk Kelas)
                          </span>
                        </div>
                      )}
                      {(item.isExcusedLeave || item.status_verifikasi === 'Sakit' || item.status_verifikasi === 'Izin' || item.status_verifikasi === 'Dinas Luar' || item.materi === 'Sakit' || item.materi === 'Izin' || item.materi === 'Dinas Luar' || item.is_auto_filled_leave) && (
                        <div className="pt-1">
                          <span 
                            data-testid="badge-excused-leave"
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${
                            (item.status_verifikasi === 'Sakit' || item.materi === 'Sakit' || item.leaveType === 'Sakit')
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : (item.status_verifikasi === 'Izin' || item.materi === 'Izin' || item.leaveType === 'Izin')
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          }`}>
                            <i className="fa-solid fa-calendar-check text-[10px]"></i>
                            Dikecualikan (Izin / Sakit)
                          </span>
                        </div>
                      )}
                      <p className="line-clamp-2"><span className="font-semibold">{item.keterangan === 'Jurnal Kegiatan' || item.mapel === 'Jurnal Kegiatan' ? 'Kegiatan / Materi:' : 'Materi:'}</span> {item.materi || item.kegiatan || '-'}</p>
                      {(item.link_bukti_foto || item.foto_kegiatan) && (item.link_bukti_foto !== '-' || item.foto_kegiatan !== '-') && (
                        <div className="mt-2 flex items-center gap-2">
                          <img 
                            src={transformGoogleDriveUrl(item.link_bukti_foto || item.foto_kegiatan)} 
                            alt="Bukti Jurnal" 
                            className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <a href={item.link_bukti_foto || item.foto_kegiatan} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs block">
                            <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Bukti Lampiran
                          </a>
                        </div>
                      )}
                      {(item.lokasi || (item.latitude && item.longitude) || item.waktu_upload) && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                          {(item.lokasi || (item.latitude && item.longitude)) && (
                            <span className="flex items-center gap-1">
                              <i className="fa-solid fa-location-dot text-red-500"></i>
                              <span>{item.lokasi || `GPS: ${item.latitude?.toFixed(5)}, ${item.longitude?.toFixed(5)}`}</span>
                            </span>
                          )}
                          {item.waktu_upload && (
                            <span>
                              {(item.lokasi || (item.latitude && item.longitude)) ? '• ' : ''}
                              {item.waktu_upload}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                    <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                    <p><span className="font-semibold">Guru Pelapor:</span> {item.guru_pelapor}</p>
                    {item.status_verifikasi === 'tidak membuat laporan piket' && (
                      <div className="pt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800 inline-flex items-center gap-1">
                          <i className="fa-solid fa-circle-exclamation text-[10px]"></i>
                          tidak membuat laporan piket
                        </span>
                      </div>
                    )}
                    <p className="line-clamp-2"><span className="font-semibold">Catatan Apel:</span> {item.catatan_apel || '-'}</p>
                    {item.link_foto && item.link_foto !== '-' && (
                      <div className="mt-2 flex items-center gap-2">
                        <img 
                          src={transformGoogleDriveUrl(item.link_foto)} 
                          alt="Foto Piket" 
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline text-xs block">
                          <i className="fa-solid fa-camera mr-1"></i> Foto Piket
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {(item.catatan_admin || item.alasan_penolakan) && (
                  <div className="mt-2.5 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-xs flex items-start gap-2">
                    <i className="fa-solid fa-circle-exclamation text-red-600 dark:text-red-400 mt-0.5 shrink-0 text-xs"></i>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-red-800 dark:text-red-300 block text-[11px]">Alasan Penolakan:</span>
                      <p className="text-red-700 dark:text-red-300/90 text-xs break-words italic">
                        {item.catatan_admin || item.alasan_penolakan}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  {item.status_verifikasi === 'tidak membuat laporan piket' ? (
                    <div className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                      Otomatis Tercatat: tidak membuat laporan piket
                    </div>
                  ) : (item.isExcusedLeave || item.status_verifikasi === 'Sakit' || item.status_verifikasi === 'Izin' || item.status_verifikasi === 'Dinas Luar') ? (
                    <div className="w-full text-center py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <i className="fa-solid fa-check-circle mr-1.5"></i>
                      Dikecualikan ({item.status_verifikasi || item.leaveType || 'Izin / Sakit'} - Sesuai Presensi)
                    </div>
                  ) : item.status_verifikasi === 'Ditolak' ? (
                    <button
                      type="button"
                      disabled={isReadOnly || processingId === item.id}
                      onClick={() => !isReadOnly && verifyItem(item.id, 'Dispensasi')}
                      title={isReadOnly ? 'Mode Peninjau (Read-Only): Tindakan dinonaktifkan' : 'Reset / Pulihkan Status via Dispensasi Khusus (F-SIPJAM-02)'}
                      aria-label="Pulihkan via Dispensasi"
                      className="flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50"
                    >
                      {processingId === item.id ? (
                        <i className="fa-solid fa-spinner animate-spin"></i>
                      ) : (
                        <>
                          <i className="fa-solid fa-rotate-left"></i>
                          <span>Pulihkan via Dispensasi (F-SIPJAM-02)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <>
                      {item.status_verifikasi !== 'Ditolak' && (
                        <button 
                          type="button"
                          disabled={isReadOnly || processingId === item.id || item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi'}
                          onClick={() => !isReadOnly && verifyItem(item.id, 'Disetujui')} 
                          title={isReadOnly ? 'Mode Peninjau (Read-Only): Tindakan verifikasi dinonaktifkan' : 'Terima / Setujui Pengajuan'}
                          aria-label="Terima / Setujui"
                          className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                            item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
                              : isReadOnly
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700'
                              : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                          }`}
                        >
                          {processingId === item.id ? (
                            <i className="fa-solid fa-spinner animate-spin"></i>
                          ) : (
                            <><i className="fa-solid fa-check"></i> Setujui</>
                          )}
                        </button>
                      )}
                      {item.status_verifikasi !== 'Ditolak' && (
                        <button 
                          type="button"
                          disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}
                          onClick={() => !isReadOnly && verifyItem(item.id, 'Ditolak')} 
                          title={isReadOnly ? 'Mode Peninjau (Read-Only): Tindakan penolakan dinonaktifkan' : 'Tolak Pengajuan'}
                          aria-label="Tolak"
                          className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                            isReadOnly
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed pointer-events-none border border-gray-200 dark:border-gray-700'
                              : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                          }`}
                        >
                          {processingId === item.id ? (
                            <i className="fa-solid fa-spinner animate-spin"></i>
                          ) : (
                            <><i className="fa-solid fa-xmark"></i> Tolak</>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Summary */}
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-600 dark:text-white/80 font-medium">
            {displayList.length} Data {taskFilter === 'Belum' ? 'Guru Belum Menyelesaikan' : taskFilter === 'Semua' ? 'Guru (Sudah & Belum)' : 'Diverifikasi'}
          </span>
        </div>
        </div>
      </div>
    </section>
  );
}
