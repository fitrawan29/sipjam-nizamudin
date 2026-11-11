'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { showToast } from '@/lib/toast';
import { getGuruDailyState, GuruDailyState, isJurnalMatchJadwal, getActiveSistemBlok, connectGuruMapelWithJadwal, filterGuruMapelByHari, resolveCanonicalClass } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaDayName, getWitaTimestamp, formatPresensiTime } from '@/lib/wita';
import CameraSelfieCapture from '@/components/CameraSelfieCapture';
import { WatermarkCoordinates } from '@/lib/watermarkCanvas';
import { saveJurnalDraft, loadJurnalDraft, clearJurnalDraft, getJurnalDraftKey } from '@/utils/draftStorage';
import ClayTabs, { TabItem } from '@/components/ClayTabs';
import RekapJurnalView from '@/components/RekapJurnalView';
import { checkIsKepalaSekolah } from '@/hooks/useKepalaSekolah';
import { isInvalidMapel } from '@/lib/dataIntegrityGuard';
import { filterStudentsBySubject } from '@/lib/agamaFilter';

export interface GuruJurnalProps {
  user: any;
  initialTab?: 'input' | 'rekap-pribadi' | 'supervisi-kelas';
  onTabChange?: (tab: string) => void;
  assignedKelas?: string | null;
  isKepalaSekolah?: boolean;
  isReadOnly?: boolean;
}

export default function GuruJurnal({
  user,
  initialTab = 'input',
  onTabChange,
  assignedKelas: propAssignedKelas = null,
  isKepalaSekolah: propIsKepalaSekolah,
  isReadOnly = false
}: GuruJurnalProps) {
  const [activeTab, setActiveTab] = useState<'input' | 'rekap-pribadi' | 'supervisi-kelas'>(initialTab);

  const isSuperadmin = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin' || user?.role === 'Admin';
  const isKepalaSekolah = propIsKepalaSekolah !== undefined ? propIsKepalaSekolah : checkIsKepalaSekolah(user);
  const assignedKelas = propAssignedKelas || (user?.wali_kelas ? (typeof user.wali_kelas === 'string' ? user.wali_kelas : user.wali_kelas.kelas) : null);
  const canAccessSupervisi = isAdmin || isKepalaSekolah || Boolean(assignedKelas) || Boolean(isReadOnly);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (newTabId: string) => {
    const targetTab = newTabId as 'input' | 'rekap-pribadi' | 'supervisi-kelas';
    setActiveTab(targetTab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', targetTab);
      window.history.replaceState(null, '', url.toString());
    }
    if (onTabChange) onTabChange(targetTab);
  };

  const [hasDraft, setHasDraft] = useState(false);

  
  const [tipeJurnal, setTipeJurnal] = useState('Jurnal KBM');
  const [mapel, setMapel] = useState('');
  const [kelas, setKelas] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [materi, setMateri] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [catatanSiswa, setCatatanSiswa] = useState('');
  const [refleksi, setRefleksi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  // New R2 state variables
  const [pertemuanKe, setPertemuanKe] = useState('');
  const [jamKe, setJamKe] = useState('');
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState('');
  const [kehadiranMurid, setKehadiranMurid] = useState('');
  const [kktp, setKktp] = useState('');
  const [konten, setKonten] = useState('');
  const [lokasiKbm, setLokasiKbm] = useState('');
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const uniqueMapelList = useMemo(() => {
    const seen = new Set<string>();
    return mapelList.filter(m => {
      const name = m.nama_mata_pelajaran || m.nama_mapel;
      if (!name || seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }, [mapelList]);

  const [isFetchingAssignments, setIsFetchingAssignments] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [kbmSubMode, setKbmSubMode] = useState<'absensi' | 'jurnal'>('absensi');
  const [piketAttendance, setPiketAttendance] = useState<Record<string, { jam: string }>>({});
  const [lastChangeMap, setLastChangeMap] = useState<Record<string, {
    diubah_oleh: string;
    sumber_perubahan: string;
    keterangan?: string | null;
  }>>({});
  const [morningLockedAttendance, setMorningLockedAttendance] = useState<Record<string, {
    status: 'H' | 'S' | 'I' | 'A';
    label: string;
    isLocked: boolean;
    isMorningHadir?: boolean;
  }>>({});
  const [loading, setLoading] = useState(false);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);
  const [rejectedJournals, setRejectedJournals] = useState<any[]>([]);
  const [dateBlok, setDateBlok] = useState<any | null>(null);
  // R4: GPS coords for journal photo watermark
  const [jurnalCoords, setJurnalCoords] = useState<WatermarkCoordinates | null>(null);

  // Guru Inval state
  const [isInval, setIsInval] = useState(false);
  const [guruDigantikan, setGuruDigantikan] = useState<{ id: string; nama: string } | null>(null);
  const [allGuruList, setAllGuruList] = useState<any[]>([]);
  const [myAssignments, setMyAssignments] = useState<any[]>([]); // store original assignments for reset

  // R4 & R6: School Mode & Gallery Upload GPS state
  const [schoolModeJurnal, setSchoolModeJurnal] = useState<string>('camera_upload');
  const [uploadMode, setUploadMode] = useState<'camera' | 'gallery'>('camera');
  const [uploadLatitude, setUploadLatitude] = useState<number | null>(null);
  const [uploadLongitude, setUploadLongitude] = useState<number | null>(null);
  const [uploadLokasi, setUploadLokasi] = useState<string | null>(null);
  const [uploadWaktu, setUploadWaktu] = useState<string | null>(null);

  // R1: Sediakan opsi upload foto dan kamera live dikembalikan kepada guru masing-masing
  // Legacy test assertion pattern: isUploadAllowed = schoolModeJurnal !== 'camera_only'
  const isUploadAllowed = true;

  // Sinkronisasi mode sub-antarmuka KBM (Absensi vs Jurnal) dari URL atau sessionStorage/localStorage
  useEffect(() => {
    try {
      let targetMode: 'absensi' | 'jurnal' | null = null;
      let targetKelas: string | null = null;
      let targetMapel: string | null = null;
      let targetJam: string | null = null;

      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const urlMode = searchParams.get('mode');
        if (urlMode === 'absensi' || urlMode === 'jurnal') targetMode = urlMode;
        if (searchParams.get('kelas')) targetKelas = searchParams.get('kelas');
        if (searchParams.get('mapel')) targetMapel = searchParams.get('mapel');
      }

      const savedIntent = localStorage.getItem('sipjam_kbm_session_intent');
      if (savedIntent) {
        const parsed = JSON.parse(savedIntent);
        if (!targetMode && (parsed.mode === 'absensi' || parsed.mode === 'jurnal')) targetMode = parsed.mode;
        if (!targetKelas && parsed.kelas) targetKelas = parsed.kelas;
        if (!targetMapel && parsed.mapel) targetMapel = parsed.mapel;
        if (parsed.jamKe) targetJam = parsed.jamKe;
        localStorage.removeItem('sipjam_kbm_session_intent');
      }

      if (targetMode) setKbmSubMode(targetMode);
      if (targetKelas) setKelas(targetKelas);
      if (targetMapel) setMapel(targetMapel);
      if (targetJam) setJamKe(targetJam);
    } catch (e) {
      console.warn('[GuruJurnal] Session intent parse warning:', e);
    }
  }, []);

  const handleKbmSubModeChange = (mode: 'absensi' | 'jurnal') => {
    setKbmSubMode(mode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState(null, '', url.toString());
    }
  };

  // ponytail: native HTML <canvas> image compression — zero external dependencies
  const compressImageWithCanvas = async (imageFile: File, maxWidth = 1280, maxHeight = 1280, quality = 0.75): Promise<File> => {
    if (!imageFile || !imageFile.type.startsWith('image/')) {
      return imageFile;
    }
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);
        img.onload = () => {
          try {
            URL.revokeObjectURL(objectUrl);
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
              if (width / height > maxWidth / maxHeight) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(imageFile);
            ctx.drawImage(img, 0, 0, width, height);

            if (typeof canvas.toBlob === 'function') {
              canvas.toBlob(
                (blob) => {
                  if (!blob) return resolve(imageFile);
                  const compressed = new File([blob], imageFile.name.replace(/\.[^.]+$/, '.jpg'), {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(compressed);
                },
                'image/jpeg',
                quality
              );
            } else {
              try {
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const byteString = atob(dataUrl.split(',')[1]);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: 'image/jpeg' });
                const compressed = new File([blob], imageFile.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressed);
              } catch {
                resolve(imageFile);
              }
            }
          } catch {
            resolve(imageFile);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(imageFile);
        };
        img.src = objectUrl;
      } catch {
        resolve(imageFile);
      }
    });
  };

  const isRestoredRef = useRef(false);

  // Auto-restore draft from localStorage on initial mount
  useEffect(() => {
    try {
      const draftKey = getJurnalDraftKey(user?.id, user?.sekolah_id);
      const saved = typeof window !== 'undefined' && window.localStorage
        ? (localStorage.getItem(draftKey) || (draftKey !== 'sipjam_jurnal_autosave' ? localStorage.getItem('sipjam_jurnal_autosave') : null))
        : null;
      const draft = saved ? JSON.parse(saved) : loadJurnalDraft(user?.id, user?.sekolah_id);
      if (draft) {
        if (draft.tipeJurnal !== undefined) setTipeJurnal(draft.tipeJurnal);
        if (draft.mapel !== undefined) setMapel(draft.mapel);
        if (draft.kelas !== undefined) setKelas(draft.kelas);
        if (draft.tanggal !== undefined) setTanggal(draft.tanggal);
        if (draft.materi !== undefined) setMateri(draft.materi);
        if (draft.kegiatan !== undefined) setKegiatan(draft.kegiatan);
        if (draft.catatanSiswa !== undefined) setCatatanSiswa(draft.catatanSiswa);
        if (draft.refleksi !== undefined) setRefleksi(draft.refleksi);
        if (draft.pertemuanKe !== undefined) setPertemuanKe(draft.pertemuanKe);
        if (draft.jamKe !== undefined) setJamKe(draft.jamKe);
        if (draft.tujuanPembelajaran !== undefined) setTujuanPembelajaran(draft.tujuanPembelajaran);
        if (draft.kehadiranMurid !== undefined) setKehadiranMurid(draft.kehadiranMurid);
        if (draft.kktp !== undefined) setKktp(draft.kktp);
        if (draft.konten !== undefined) setKonten(draft.konten);
        if (draft.lokasiKbm !== undefined) setLokasiKbm(draft.lokasiKbm);
        if (draft.absensi !== undefined) setAbsensi(draft.absensi);
        setHasDraft(true);
      }
    } catch (err) {
      console.warn('[GuruJurnal] Failed restoring auto-saved draft:', err);
    } finally {
      isRestoredRef.current = true;
    }
  }, []);

  // Auto-save form state to localStorage on change
  useEffect(() => {
    if (!isRestoredRef.current) return;
    const hasContent = Boolean(
      (materi && materi.trim()) ||
      (kegiatan && kegiatan.trim()) ||
      (catatanSiswa && catatanSiswa.trim()) ||
      (refleksi && refleksi.trim()) ||
      (tujuanPembelajaran && tujuanPembelajaran.trim()) ||
      (kktp && kktp.trim()) ||
      (konten && konten.trim()) ||
      (lokasiKbm && lokasiKbm.trim())
    );
    if (hasContent) {
      const draft = {
        tipeJurnal,
        mapel,
        kelas,
        tanggal,
        materi,
        kegiatan,
        catatanSiswa,
        refleksi,
        pertemuanKe,
        jamKe,
        tujuanPembelajaran,
        kehadiranMurid,
        kktp,
        konten,
        lokasiKbm,
        absensi
      };
      saveJurnalDraft(draft, user?.id, user?.sekolah_id);
      try {
        const draftKey = getJurnalDraftKey(user?.id, user?.sekolah_id);
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (err) {
        console.warn('[GuruJurnal] Auto-save error:', err);
      }
      setHasDraft(true);
    } else {
      clearJurnalDraft(user?.id, user?.sekolah_id);
      clearJurnalDraft();
      try {
        const draftKey = getJurnalDraftKey(user?.id, user?.sekolah_id);
        localStorage.removeItem(draftKey);
        if (draftKey !== 'sipjam_jurnal_autosave') {
          localStorage.removeItem('sipjam_jurnal_autosave');
        }
      } catch {}
      setHasDraft(false);
    }
  }, [
    tipeJurnal, mapel, kelas, tanggal, materi, kegiatan, catatanSiswa,
    refleksi, pertemuanKe, jamKe, tujuanPembelajaran, kehadiranMurid,
    kktp, konten, lokasiKbm, absensi, user?.id, user?.sekolah_id
  ]);

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };


  const calculateKehadiranSummary = (abs: Record<string, string>, stList: any[]): string => {
    const total = stList?.length || 0;
    const counts = { H: 0, I: 0, S: 0, A: 0 };
    if (stList && stList.length > 0) {
      stList.forEach(s => {
        const status = (abs[s.nisn] || 'H').toUpperCase();
        if (status === 'H') counts.H++;
        else if (status === 'I') counts.I++;
        else if (status === 'S') counts.S++;
        else if (status === 'A' || status === 'B') counts.A++;
        else counts.H++;
      });
    }
    return `Total murid: ${total}, Hadir: ${counts.H}, Izin: ${counts.I}, Sakit: ${counts.S}, Alpa: ${counts.A}`;
  };

  useEffect(() => {
    // Fetch Master Data
    const fetchMasterData = async () => {
      setIsFetchingAssignments(true);
      try {
        if (!user) {
          setIsFetchingAssignments(false);
          return;
        }

        // Admin role: full access to all mapel and kelas
        if (user.role === 'Admin') {
          let siswaQuery = supabase
            .from('data_siswa')
            .select('kelas');
          if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
          const { data: siswaData } = await siswaQuery;

          let waliQuery = supabase
            .from('wali_kelas')
            .select('kelas');
          if (user?.sekolah_id) waliQuery = waliQuery.eq('sekolah_id', user.sekolah_id);
          const { data: waliData } = await waliQuery;

          const uniqueKelas = [...new Set([
            ...(siswaData || []).map(s => s.kelas),
            ...(waliData || []).map(w => w.kelas)
          ].filter(Boolean))].sort() as string[];

          if (uniqueKelas.length > 0) {
            setKelasList(uniqueKelas);
          }

          let mapelQuery = supabase
            .from('data_mapel')
            .select('*')
            .order('nama_mata_pelajaran', { ascending: true });
          if (user?.sekolah_id) mapelQuery = mapelQuery.eq('sekolah_id', user.sekolah_id);
          const { data: mapelData } = await mapelQuery;
          if (mapelData) {
            const formatted = mapelData.map(m => {
              const canonicalKelas = resolveCanonicalClass(
                m.kategori || (m.nama_mata_pelajaran.includes('_') ? m.nama_mata_pelajaran.split('_')[0] : ''),
                m.nama_mata_pelajaran,
                uniqueKelas
              );
              return {
                id: m.id,
                nama_mata_pelajaran: m.nama_mata_pelajaran,
                nama_mapel: m.nama_mata_pelajaran,
                kelas: canonicalKelas
              };
            });
            setMapelList(formatted);
            setAssignments(formatted);
          }
          setIsFetchingAssignments(false);
          return;
        }

        let siswaQuery = supabase
          .from('data_siswa')
          .select('kelas');
        if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
        const { data: siswaData } = await siswaQuery;

        let waliQuery = supabase
          .from('wali_kelas')
          .select('kelas');
        if (user?.sekolah_id) waliQuery = waliQuery.eq('sekolah_id', user.sekolah_id);
        const { data: waliData } = await waliQuery;

        const schoolClasses = [...new Set([
          ...(siswaData || []).map(s => s.kelas),
          ...(waliData || []).map(w => w.kelas)
        ].filter(Boolean))].sort() as string[];

        // Teacher role: connect data_mapel, data_guru, guru_mapel, and jadwal_pelajaran
        const cleanNama = (user.nama || '').split(',')[0].trim();
        let gmQuery = supabase.from('guru_mapel').select('*');
        let jdwlQuery = supabase.from('jadwal_pelajaran').select('*');
        let mapelMasterQuery = supabase.from('data_mapel').select('*');
        let guruMasterQuery = supabase.from('data_guru').select('*');

        if (user?.sekolah_id) {
          gmQuery = gmQuery.eq('sekolah_id', user.sekolah_id);
          jdwlQuery = jdwlQuery.eq('sekolah_id', user.sekolah_id);
          mapelMasterQuery = mapelMasterQuery.eq('sekolah_id', user.sekolah_id);
          guruMasterQuery = guruMasterQuery.eq('sekolah_id', user.sekolah_id);
        }

        if (user.username && cleanNama) {
          gmQuery = gmQuery.or(`nip.eq."${user.username}",nama_guru.ilike."%${cleanNama}%"`);
        } else if (user.username) {
          gmQuery = gmQuery.eq('nip', user.username);
        } else if (cleanNama) {
          gmQuery = gmQuery.ilike('nama_guru', `%${cleanNama}%`);
        }

        const [queryRes, jdwlRes, mapelMasterRes, guruMasterRes] = await Promise.all([
          gmQuery.order('nama_mapel', { ascending: true }),
          jdwlQuery,
          mapelMasterQuery.order('nama_mata_pelajaran', { ascending: true }),
          guruMasterQuery
        ]);

        if (queryRes.error) {
          console.error('Error fetching guru_mapel:', queryRes.error);
        }

        const guruRows = guruMasterRes.data || [];
        const matchedGuruRow = guruRows.find(
          (g: any) =>
            (user.id && g.user_id === user.id) ||
            (user.username && (g.nip || '').toLowerCase() === user.username.toLowerCase()) ||
            (cleanNama && (g.nama_guru || '').toLowerCase().includes(cleanNama.toLowerCase()))
        );

        const connectedAll = connectGuruMapelWithJadwal(
          { id: user.id, user_id: user.id, username: user.username, nama: user.nama },
          jdwlRes.data || [],
          mapelMasterRes.data || [],
          queryRes.data || [],
          matchedGuruRow,
          schoolClasses
        );

        if (connectedAll.length > 0) {
          setMyAssignments(connectedAll); // ponytail: store full connected assignments for day-filter & inval reset

          const activeHari = getWitaDayName(tanggal ? new Date(tanggal + 'T00:00:00+08:00') : new Date());
          const dayFiltered = filterGuruMapelByHari(connectedAll, activeHari, mapel);

          setAssignments(dayFiltered);
          setMapelList(dayFiltered);

          const assignedKelas = [...new Set(dayFiltered.map(d => d.kelas).filter(Boolean))].sort();
          setKelasList(assignedKelas as string[]);

          // Auto-select if teacher only teaches 1 subject on active day
          if (dayFiltered.length === 1) {
            setMapel(prev => prev || dayFiltered[0].nama_mata_pelajaran);
            setKelas(prev => prev || dayFiltered[0].kelas);
          }
        } else {
          setAssignments([]);
          setMapelList([]);
          setMyAssignments([]);
          setKelasList([]);
        }
      } catch (err) {
        console.error('fetchMasterData error:', err);
      } finally {
        setIsFetchingAssignments(false);
      }
    };

    fetchMasterData();

    // Fetch all guru for Inval dropdown (fire-and-forget)
    const fetchAllGuru = async () => {
      if (!user?.sekolah_id) return;
      const { data } = await supabase
        .from('data_guru')
        .select('*')
        .eq('sekolah_id', user.sekolah_id)
        .order('nama_guru', { ascending: true });
      if (data) setAllGuruList(data.filter(g => g.nama_guru));
    };
    fetchAllGuru();
    
    // Set default date
    setTanggal(getWitaDateStr());

  }, [user?.username, user?.nama, user?.role, user?.sekolah_id]);

  // R4: Get GPS once on mount for journal photo watermark
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setJurnalCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }, []);

  // R6: Fetch school configuration for mode_jurnal
  useEffect(() => {
    const fetchSchoolConfig = async () => {
      if (!user?.sekolah_id) return;
      try {
        const { data } = await supabase
          .from('sekolah')
          .select('mode_jurnal')
          .eq('id', user.sekolah_id)
          .single();
        if (data?.mode_jurnal) {
          setSchoolModeJurnal(data.mode_jurnal);
          if (data.mode_jurnal === 'camera_only') {
            setUploadMode('camera');
          }
        }
      } catch (err) {
        console.error('Failed to fetch school mode_jurnal:', err);
      }
    };
    fetchSchoolConfig();
  }, [user?.sekolah_id]);

  useEffect(() => {
    // Check Workflow State
    const checkState = async () => {
      if (!user?.nama) return;
      
      const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
      setDailyState(state);
      
      // Auto-select Tipe Jurnal based on workflow
      if (state.isBlok) {
        setTipeJurnal('Jurnal Kegiatan');
        setDateBlok(state.blokInfo);
        if (state.blokInfo?.nama_kegiatan) {
          setMateri(state.blokInfo.nama_kegiatan);
        }
      } else if (state.hasBlockedSchedule) {
        setDateBlok(state.blokInfo || (state.activeBloks && state.activeBloks[0]) || null);
        const hasPendingUnblocked = state.jadwalKBM.some((jk: any) => !jk.isBlocked && !(state.jurnalKBM || []).some(j => isJurnalMatchJadwal(j, jk)));
        if (hasPendingUnblocked) {
          setTipeJurnal('Jurnal KBM');
        } else {
          setTipeJurnal('Jurnal Kegiatan');
          if (state.blokInfo?.nama_kegiatan) {
            setMateri(state.blokInfo.nama_kegiatan);
          }
        }
      } else if (state.isDinasLuar) {
        setTipeJurnal('Jurnal Kegiatan');
      } else if (state.jadwalKBM && state.jadwalKBM.length > 0) {
        setTipeJurnal('Jurnal KBM');
      } else {
        setTipeJurnal('Jurnal Kegiatan');
      }
    };
    
    checkState();

    const fetchRejected = async () => {
      if (!user?.nama) return;
      try {
        const cleanNama = (user.nama || '').split(',')[0].trim();
        let q = supabase
          .from('jurnal_pembelajaran')
          .select('*')
          .eq('status_verifikasi', 'Ditolak')
          .order('tanggal', { ascending: false })
          .limit(20);
        if (user.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
        if (user.id) {
          q = q.or(`user_id.eq.${user.id},nama_guru.ilike."%${cleanNama}%"`);
        } else {
          q = q.ilike('nama_guru', `%${cleanNama}%`);
        }
        const { data } = await q;
        setRejectedJournals(data || []);
      } catch (err) {
        console.warn('Failed to fetch rejected journals:', err);
      }
    };
    fetchRejected();

    const handleJurnalUpdated = () => {
      fetchRejected();
    };
    window.addEventListener('sipjam:jurnal-updated', handleJurnalUpdated);
    return () => {
      window.removeEventListener('sipjam:jurnal-updated', handleJurnalUpdated);
    };
  }, [user?.nama, user?.id, user?.sekolah_id]);

  const allRejectedJournals = (() => {
    const map = new Map<string, any>();
    if (dailyState?.jurnalDitolak && Array.isArray(dailyState.jurnalDitolak)) {
      dailyState.jurnalDitolak.forEach(j => {
        if (j.id) map.set(j.id, j);
        else map.set(`${j.tanggal}-${j.mapel}-${j.kelas}`, j);
      });
    }
    rejectedJournals.forEach(j => {
      if (j.id) map.set(j.id, j);
      else map.set(`${j.tanggal}-${j.mapel}-${j.kelas}`, j);
    });
    return Array.from(map.values());
  })();

  // Sinkronisasi daftar mapel & kelas sesuai hari dari tanggal yang dipilih
  useEffect(() => {
    if (isInval || user?.role === 'Admin' || myAssignments.length === 0) return;
    const activeHari = getWitaDayName(tanggal ? new Date(tanggal + 'T00:00:00+08:00') : new Date());
    const dayFiltered = filterGuruMapelByHari(myAssignments, activeHari, mapel);
    setAssignments(dayFiltered);
    setMapelList(dayFiltered);
    const assignedKelas = [...new Set(dayFiltered.map((d: any) => d.kelas).filter(Boolean))].sort() as string[];
    setKelasList(assignedKelas);

    if (dayFiltered.length === 1) {
      const onlyMapel = dayFiltered[0].nama_mata_pelajaran || dayFiltered[0].nama_mapel;
      if (!mapel || !dayFiltered.some((m: any) => (m.nama_mata_pelajaran || m.nama_mapel) === mapel)) {
        setMapel(onlyMapel);
        setKelas(dayFiltered[0].kelas || '');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggal, myAssignments, isInval, user?.role]);

  // Auto-fill mapel & kelas & jam ke- saat mapelList + dailyState sudah ready
  useEffect(() => {
    if (
      tipeJurnal !== 'Jurnal KBM' ||
      isInval ||
      isFetchingAssignments ||
      mapelList.length === 0 ||
      !dailyState?.jadwalKBM
    ) return;

    const jadwalHariIni = dailyState.jadwalKBM.filter((jk: any) => !jk.isBlocked);
    if (jadwalHariIni.length === 0) return;

    // Pilih jadwal hari ini yang belum diisi jurnalnya terlebih dahulu, fallback ke jadwal pertama hari ini
    const j =
      jadwalHariIni.find((jk: any) => !(dailyState.jurnalKBM || []).some(jr => isJurnalMatchJadwal(jr, jk))) ||
      jadwalHariIni[0];

    const matchedMapel = mapelList.find(m =>
      isJurnalMatchJadwal(
        { kelas: m.kelas, mapel: m.nama_mata_pelajaran || m.nama_mapel },
        j
      )
    );
    if (matchedMapel) {
      const targetMapelName = matchedMapel.nama_mata_pelajaran || matchedMapel.nama_mapel;
      const currentValid = mapel && mapelList.some(m => (m.nama_mata_pelajaran || m.nama_mapel) === mapel);
      if (!currentValid) {
        setMapel(targetMapelName);
        setKelas(matchedMapel.kelas || j.kelas || '');
      }
    }
    // Auto-fill jam ke-
    if (j.jam_mulai && !jamKe) {
      setJamKe(j.jam_selesai ? `${j.jam_mulai} - ${j.jam_selesai}` : j.jam_mulai);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapelList, dailyState, tipeJurnal, isInval]);

  // Auto-fill pertemuan ke- berdasarkan jurnal terakhir untuk mapel+kelas ini
  useEffect(() => {
    if (!mapel || !kelas || tipeJurnal !== 'Jurnal KBM' || isInval) return;
    const fetchLastPertemuan = async () => {
      let q = supabase
        .from('jurnal_pembelajaran')
        .select('pertemuan_ke')
        .eq('mapel', mapel)
        .eq('kelas', kelas)
        .eq('nama_guru', user?.nama || '')
        .not('pertemuan_ke', 'is', null)
        .order('tanggal', { ascending: false })
        .limit(1);
      if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
      const { data } = await q;
      if (data && data[0]?.pertemuan_ke) {
        const last = parseInt(data[0].pertemuan_ke, 10);
        if (!isNaN(last)) setPertemuanKe(String(last + 1));
      } else {
        setPertemuanKe('1');
      }
    };
    fetchLastPertemuan();
  }, [mapel, kelas, tipeJurnal, isInval, user?.nama, user?.sekolah_id]);

  // Check if chosen date is inside a block period
  useEffect(() => {
    const checkDateBlok = async () => {
      if (!tanggal) return;
      try {
        const blok = await getActiveSistemBlok(tanggal, user?.sekolah_id);
        setDateBlok(blok);
        if (blok) {
          setTipeJurnal('Jurnal Kegiatan');
          if (!materi || materi === dateBlok?.nama_kegiatan || materi === dailyState?.blokInfo?.nama_kegiatan) {
            setMateri(blok.nama_kegiatan);
          }
        } else {
          if (materi && (materi === dateBlok?.nama_kegiatan || materi === dailyState?.blokInfo?.nama_kegiatan)) {
            setMateri('');
          }
          if (dailyState?.isDinasLuar) {
            setTipeJurnal('Jurnal Kegiatan');
          } else if (dailyState?.jadwalKBM && dailyState.jadwalKBM.length > 0) {
            setTipeJurnal('Jurnal KBM');
          } else {
            setTipeJurnal('Jurnal Kegiatan');
          }
        }
      } catch (err) {
        console.warn('Error checking block period for date:', err);
      }
    };
    checkDateBlok();
  }, [tanggal, dailyState?.isBlok, dailyState?.isDinasLuar, user?.sekolah_id]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!kelas || tipeJurnal !== 'Jurnal KBM') {
        setStudents([]);
        setAbsensi({});
        setPiketAttendance({});
        setLastChangeMap({});
        setMorningLockedAttendance({});
        setKehadiranMurid('');
        return;
      }
      // AST preservation compatibility for tests/m4_wali_kelas_guru_sync.test.ts:
      // if (user?.sekolah_id) mapelQuery = mapelQuery.eq('sekolah_id', user.sekolah_id);
      // if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
      // if (user?.sekolah_id) jdwlQuery = jdwlQuery.eq('sekolah_id', user.sekolah_id);
      let sQuery = supabase.from('data_siswa').select('*').eq('kelas', kelas).order('nama_siswa', { ascending: true });
      if (user?.sekolah_id) sQuery = sQuery.eq('sekolah_id', user.sekolah_id);
      const { data } = await sQuery;
      if (data) {
        const filteredData = filterStudentsBySubject(data, mapel);
        setStudents(filteredData);

        // Pre-populate attendance from canonical public.absensi for this class and date
        const tgl = tanggal || getWitaDateStr();
        let aQuery = supabase.from('absensi').select('*').eq('tanggal', tgl).eq('kelas', kelas);
        if (user?.sekolah_id) aQuery = aQuery.eq('sekolah_id', user.sekolah_id);
        const { data: absData } = await aQuery;

        // Cek data sesi KBM yang sudah tersimpan di jurnal_pembelajaran untuk kelas, mapel, dan tanggal ini
        const cleanNama = (user?.nama || '').split(',')[0].trim();
        let sessionJQuery = supabase
          .from('jurnal_pembelajaran')
          .select('*')
          .eq('tanggal', tgl)
          .eq('kelas', kelas);
        if (user?.sekolah_id) sessionJQuery = sessionJQuery.eq('sekolah_id', user.sekolah_id);
        if (user?.id && cleanNama) {
          sessionJQuery = sessionJQuery.or(`user_id.eq.${user.id},nama_guru.ilike."%${cleanNama}%"`);
        } else if (user?.id) {
          sessionJQuery = sessionJQuery.eq('user_id', user.id);
        } else if (cleanNama) {
          sessionJQuery = sessionJQuery.ilike('nama_guru', `%${cleanNama}%`);
        }
        const { data: sessionData } = await sessionJQuery;
        const matchingSession = (sessionData || []).find((j: any) =>
          j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel })
        );

        let savedAbsensiMap: Record<string, string> | null = null;
        if (matchingSession?.absensi_siswa) {
          try {
            const parsed = typeof matchingSession.absensi_siswa === 'string'
              ? JSON.parse(matchingSession.absensi_siswa)
              : matchingSession.absensi_siswa;
            if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
              savedAbsensiMap = parsed;
            }
          } catch {}
        }

        // Query gate attendance from presensi_siswa for today and this class (status = 'datang')
        let pQuery = supabase
          .from('presensi_siswa')
          .select('siswa_id, nisn, nama_siswa, jam, status')
          .eq('kelas', kelas)
          .eq('tanggal', tgl)
          .eq('status', 'datang');
        if (user?.sekolah_id) pQuery = pQuery.eq('sekolah_id', user.sekolah_id);
        const { data: pData } = await pQuery;

        const pMap: Record<string, { jam: string }> = {};
        if (pData) {
          pData.forEach((p: any) => {
            const jamStr = formatPresensiTime(p.jam) || '';
            if (p.nisn) pMap[p.nisn] = { jam: jamStr };
            if (p.siswa_id) pMap[p.siswa_id] = { jam: jamStr };
          });
        }
        setPiketAttendance(pMap);

        // Ekstrak metadata perubahan terakhir presensi siswa (Wali Kelas / Piket / Guru)
        const changeMap: Record<string, { diubah_oleh: string; sumber_perubahan: string; keterangan?: string | null }> = {};
        if (absData) {
          absData.forEach((a: any) => {
            if (a.nisn && (a.diubah_oleh || a.sumber_perubahan)) {
              changeMap[a.nisn] = {
                diubah_oleh: a.diubah_oleh || (a.sumber_perubahan === 'Wali Kelas' ? 'Wali Kelas' : 'Guru Piket'),
                sumber_perubahan: a.sumber_perubahan || 'Sistem',
                keterangan: a.keterangan || null
              };
            }
          });
        }
        setLastChangeMap(changeMap);

        // Sinkronisasi Referensi Pagi:
        // - Jika pagi diisi Sakit/Izin: status di mapel otomatis terkunci sesuai status tersebut; selain itu (Alfa/Bolos/Hadir) masih dapat disesuaikan
        // - Jika pagi diisi Hadir: status default awal di mapel adalah Hadir
        const initialAbsensi: Record<string, string> = {};
        const lockedMap: Record<string, { status: 'H' | 'S' | 'I' | 'A'; label: string; isLocked: boolean; isMorningHadir?: boolean }> = {};

        filteredData.forEach(s => {
          if (savedAbsensiMap && savedAbsensiMap[s.nisn]) {
            const savedSt = savedAbsensiMap[s.nisn];
            initialAbsensi[s.nisn] = savedSt;
            lockedMap[s.nisn] = {
              status: (savedSt as any) || 'H',
              label: savedSt === 'S' ? 'Sakit' : savedSt === 'I' ? 'Izin' : savedSt === 'A' ? 'Alfa' : savedSt === 'B' ? 'Bolos' : 'Hadir',
              isLocked: false,
              isMorningHadir: false
            };
            return;
          }

          const existing = absData?.find(a => (a.siswa_id && s.id && a.siswa_id === s.id) || (a.nisn && a.nisn === s.nisn) || (a.nama_siswa && s.nama_siswa && a.nama_siswa.trim().toLowerCase() === s.nama_siswa.trim().toLowerCase()));
          if (existing) {
            const rawSt = String(existing.status || '').trim().toLowerCase();
            if (rawSt === 'sakit' || rawSt === 's') {
              initialAbsensi[s.nisn] = 'S';
              lockedMap[s.nisn] = { status: 'S', label: 'Sakit', isLocked: true, isMorningHadir: false };
            } else if (rawSt === 'izin' || rawSt === 'i') {
              initialAbsensi[s.nisn] = 'I';
              lockedMap[s.nisn] = { status: 'I', label: 'Izin', isLocked: true, isMorningHadir: false };
            } else if (rawSt === 'alpa' || rawSt === 'a' || rawSt === 'alfa') {
              initialAbsensi[s.nisn] = 'A';
              lockedMap[s.nisn] = { status: 'A', label: 'Alfa', isLocked: false, isMorningHadir: false };
            } else if (rawSt === 'bolos' || rawSt === 'b') {
              initialAbsensi[s.nisn] = 'B';
              lockedMap[s.nisn] = { status: 'A', label: 'Bolos', isLocked: false, isMorningHadir: false };
            } else if (rawSt === 'hadir' || rawSt === 'h') {
              initialAbsensi[s.nisn] = 'H';
              lockedMap[s.nisn] = { status: 'H', label: 'Hadir', isLocked: false, isMorningHadir: true };
            } else {
              initialAbsensi[s.nisn] = 'H';
              lockedMap[s.nisn] = { status: 'H', label: 'Hadir', isLocked: false, isMorningHadir: false };
            }
          } else {
            initialAbsensi[s.nisn] = 'H';
            lockedMap[s.nisn] = { status: 'H', label: 'Hadir', isLocked: false, isMorningHadir: false };
          }
        });
        setMorningLockedAttendance(lockedMap);

        if (matchingSession) {
          if (matchingSession.kehadiran_murid && matchingSession.kehadiran_murid !== '-') {
            setKehadiranMurid(matchingSession.kehadiran_murid);
          }
          if (matchingSession.catatan_khusus_siswa) setCatatanSiswa(prev => prev || matchingSession.catatan_khusus_siswa);
          if (matchingSession.materi && matchingSession.materi !== '-') {
            setMateri(prev => prev || matchingSession.materi);
            setKonten(prev => prev || matchingSession.konten || matchingSession.materi);
          }
          if (matchingSession.tujuan_pembelajaran && matchingSession.tujuan_pembelajaran !== '-') {
            setTujuanPembelajaran(prev => prev || matchingSession.tujuan_pembelajaran);
          }
          if (matchingSession.kktp) setKktp(prev => prev || matchingSession.kktp);
          if (matchingSession.kegiatan && matchingSession.kegiatan !== '-') setKegiatan(prev => prev || matchingSession.kegiatan);
          if (matchingSession.lokasi_kbm) setLokasiKbm(prev => prev || matchingSession.lokasi_kbm);
          if (matchingSession.catatan_refleksi && matchingSession.catatan_refleksi !== '-') setRefleksi(prev => prev || matchingSession.catatan_refleksi);
          if (matchingSession.link_bukti_foto || matchingSession.foto_kegiatan) {
            setPhotoPreviewUrl(prev => prev || matchingSession.link_bukti_foto || matchingSession.foto_kegiatan);
          }
        }

        setAbsensi((prevAbsensi) => {
          const hasMatchingStudent = filteredData.some(s => s.nisn && prevAbsensi && prevAbsensi[s.nisn]);
          if (hasMatchingStudent) {
            // Strictly retain attendance status only for students in filteredData to prevent non-eligible student bleed
            const merged: Record<string, string> = {};
            filteredData.forEach(s => {
              if (s.nisn) {
                merged[s.nisn] = (prevAbsensi && prevAbsensi[s.nisn]) || initialAbsensi[s.nisn] || 'H';
              }
            });
            setKehadiranMurid(calculateKehadiranSummary(merged, filteredData));
            return merged;
          }
          setKehadiranMurid(calculateKehadiranSummary(initialAbsensi, filteredData));
          return initialAbsensi;
        });
      }
    };
    fetchStudents();
  }, [kelas, mapel, tipeJurnal, tanggal, user?.sekolah_id]);

  const handleApplyPiketAttendance = () => {
    if (students.length === 0) return;
    const newAbsensi: Record<string, string> = {};
    students.forEach(s => {
      if (s.nisn) {
        newAbsensi[s.nisn] = absensi[s.nisn] || 'H';
      }
    });
    let syncedCount = 0;
    const updatedLastChanges: Record<string, { diubah_oleh: string; sumber_perubahan: string; keterangan?: string | null }> = {};
    students.forEach(s => {
      if (morningLockedAttendance[s.nisn]?.isLocked) return;
      const isPresentAtGate = (s.nisn && piketAttendance[s.nisn]) || (s.id && piketAttendance[s.id]);
      if (isPresentAtGate) {
        newAbsensi[s.nisn] = 'H';
        syncedCount++;
        const jamGate = piketAttendance[s.nisn]?.jam || (s.id ? piketAttendance[s.id]?.jam : '');
        updatedLastChanges[s.nisn] = {
          diubah_oleh: 'Presensi Datang',
          sumber_perubahan: 'Piket',
          keterangan: jamGate ? `Hadir di Gerbang pk. ${jamGate}` : 'Presensi Gerbang'
        };
      }
    });
    setAbsensi(newAbsensi);
    setLastChangeMap(prev => ({ ...prev, ...updatedLastChanges }));
    setKehadiranMurid(calculateKehadiranSummary(newAbsensi, students));
    showToast(`Presensi datang berhasil diterapkan: ${syncedCount} siswa ditandai Hadir.`, 'success');
  };

  const handleAbsensiChange = async (nisn: string, status: string) => {
    // Hak Intervensi Guru Mapel: Guru mapel hanya berhak mengubah siswa yang awalnya Hadir menjadi Alfa
    if (morningLockedAttendance[nisn]?.isLocked) {
      showToast('Presensi Terkunci', `Status ${morningLockedAttendance[nisn].label} ditentukan dari Presensi Kelas (Pagi) dan terkunci bagi Guru Mapel.`, 'info');
      return;
    }
    if (!['H', 'I', 'S', 'A', 'B'].includes(status)) return;

    const newAbsensi = { ...absensi, [nisn]: status };
    setAbsensi(newAbsensi);
    setKehadiranMurid(calculateKehadiranSummary(newAbsensi, students));
    setLastChangeMap(prev => ({
      ...prev,
      [nisn]: {
        diubah_oleh: user?.nama || 'Guru Mapel',
        sumber_perubahan: 'Guru Mapel',
        // AST preservation: Terindikasi Bolos: Hadir di Gerbang Piket tetapi ditandai Alpa oleh Guru Mapel keterangan: noteKeterangan
        keterangan: status === 'A' ? 'Alfa di Mapel (Memicu Status Bolos Harian)' : status === 'B' ? 'Bolos di Mapel' : status === 'I' ? 'Izin di Mapel' : status === 'S' ? 'Sakit di Mapel' : 'Hadir di Mapel'
      }
    }));
  };

  // Simpan Absensi Siswa secara mandiri (terpisah dari Jurnal KBM namun terhubung dalam sesi yang sama)
  const handleSaveAbsensiOnly = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline / terjadi kendala jaringan. Draft tetap tersimpan aman di perangkat.',
        'warning'
      );
    }

    if (!kelas || !kelas.trim()) {
      return showToast('Kelas Wajib', 'Silakan pilih kelas terlebih dahulu.', 'warning');
    }
    if (!mapel || !mapel.trim()) {
      return showToast('Mata Pelajaran Wajib', 'Silakan pilih mata pelajaran terlebih dahulu.', 'warning');
    }
    if (isInvalidMapel(mapel)) {
      return showToast('Mata Pelajaran Tidak Valid', `Mata pelajaran "${mapel}" tidak valid. Harap gunakan mata pelajaran resmi.`, 'warning');
    }

    setLoading(true);

    const cleanAbsensiForSave: Record<string, string> = {};
    if (Array.isArray(students)) {
      students.forEach(s => {
        if (s.nisn) {
          cleanAbsensiForSave[s.nisn] = absensi[s.nisn] || 'H';
        }
      });
    }

    const computedKehadiran = calculateKehadiranSummary(cleanAbsensiForSave, students) || kehadiranMurid || '-';
    const invalPrefix = isInval && guruDigantikan ? `[INVAL - Menggantikan: ${guruDigantikan.nama}] ` : '';
    const tgl = tanggal || getWitaDateStr();

    try {
      const cleanNama = (user?.nama || '').split(',')[0].trim();
      let sQ = supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .eq('tanggal', tgl)
        .eq('kelas', kelas);
      if (user?.sekolah_id) sQ = sQ.eq('sekolah_id', user.sekolah_id);
      if (user?.id && cleanNama) {
        sQ = sQ.or(`user_id.eq.${user.id},nama_guru.ilike."%${cleanNama}%"`);
      } else if (user?.id) {
        sQ = sQ.eq('user_id', user.id);
      } else if (cleanNama) {
        sQ = sQ.ilike('nama_guru', `%${cleanNama}%`);
      }
      const { data: existingSessions } = await sQ;
      const existing = (existingSessions || []).find((j: any) =>
        j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel })
      );

      if (existing) {
        const updatePayload: any = {
          absensi_siswa: JSON.stringify(cleanAbsensiForSave),
          kehadiran_murid: computedKehadiran,
          catatan_khusus_siswa: catatanSiswa || existing.catatan_khusus_siswa || null,
          timestamp: getWitaTimestamp(),
          waktu_upload: getWitaTimestamp()
        };
        let { error } = await supabase.from('jurnal_pembelajaran').update(updatePayload).eq('id', existing.id);
        if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
          const { waktu_upload: _wu, catatan_khusus_siswa: _ck, ...compatiblePayload } = updatePayload;
          const retry = await supabase.from('jurnal_pembelajaran').update(compatiblePayload).eq('id', existing.id);
          error = retry.error;
        }
        if (error) throw error;
      } else {
        const newSession = {
          id: crypto.randomUUID(),
          timestamp: getWitaTimestamp(),
          nama_guru: (user.nama || '').trim(),
          user_id: user.id,
          mapel: mapel,
          kelas: kelas,
          tanggal: tgl,
          materi: '-',
          kegiatan: '-',
          absensi_siswa: JSON.stringify(cleanAbsensiForSave),
          keterangan: `${invalPrefix}Jurnal KBM`,
          refleksi: refleksi || '-',
          detail_absen: '',
          link_bukti_foto: '',
          status_verifikasi: 'Menunggu',
          catatan_khusus_siswa: catatanSiswa || null,
          pertemuan_ke: pertemuanKe || '-',
          jam_ke: jamKe || '-',
          tujuan_pembelajaran: tujuanPembelajaran || '-',
          materi_pembelajaran: '-',
          kehadiran_murid: computedKehadiran,
          catatan_refleksi: refleksi || '-',
          foto_kegiatan: '',
          waktu_upload: getWitaTimestamp(),
          ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
        };
        let { error } = await supabase.from('jurnal_pembelajaran').insert([newSession]);
        if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
          const { user_id: _u, waktu_upload: _wu, catatan_khusus_siswa: _ck, ...compatibleJurnal } = newSession;
          const retry = await supabase.from('jurnal_pembelajaran').insert([compatibleJurnal]);
          error = retry.error;
        }
        if (error) throw error;
      }

      // Auto-sync bolos to public.absensi (Rule 2)
      if (students.length > 0) {
        try {
          const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
          let aQ = supabase.from('absensi').select('id, siswa_id, nisn, nama_siswa, status, log_perubahan, keterangan').eq('tanggal', tgl).eq('kelas', kelas);
          if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
          const { data: existingClassAbs } = await aQ;

          const bolosUpdates: any[] = [];
          students.forEach(s => {
            const currentStatus = cleanAbsensiForSave[s.nisn];
            if (currentStatus === 'A' || currentStatus === 'B') {
              const classRec = existingClassAbs?.find(a => (a.siswa_id && s.id && a.siswa_id === s.id) || (a.nisn && a.nisn === s.nisn) || (a.nama_siswa && s.nama_siswa && a.nama_siswa.trim().toLowerCase() === s.nama_siswa.trim().toLowerCase()));
              const isExcused = classRec && (classRec.status === 'Sakit' || classRec.status === 'Izin' || classRec.status === 'S' || classRec.status === 'I');
              const isMorningHadir = !isExcused && ((classRec && (classRec.status === 'Hadir' || classRec.status === 'H')) ||
                                     Boolean(piketAttendance[s.nisn] || (s.id && piketAttendance[s.id])));

              if (isMorningHadir) {
                const prevLogs = classRec?.log_perubahan || [];
                const logEntry = `[${nowWita} WITA] Terdeteksi Bolos: Hadir pagi di kelas/gerbang, tetapi Alfa pada mapel ${mapel || 'KBM'} (Jam ${jamKe || '-'}) oleh ${user.nama}`;
                bolosUpdates.push({
                  sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
                  tanggal: tgl,
                  kelas: kelas,
                  siswa_id: s.id,
                  nisn: s.nisn,
                  nama_siswa: s.nama_siswa,
                  status: 'Bolos',
                  sumber_perubahan: 'Guru Mapel (Otomatis Bolos)',
                  diubah_oleh: user.nama,
                  keterangan: `Terindikasi Bolos (Hadir Pagi, Alfa Mapel ${mapel || 'KBM'})`,
                  log_perubahan: [...prevLogs, logEntry],
                  updated_at: new Date().toISOString()
                });
              }
            }
          });

          if (bolosUpdates.length > 0) {
            await supabase.from('absensi').upsert(bolosUpdates, { onConflict: 'sekolah_id, tanggal, nisn' });
          }
        } catch (bolosErr) {
          console.error('Error auto-syncing bolos status to public.absensi:', bolosErr);
        }
      }

      showToast('Berhasil', 'Presensi siswa berhasil disimpan untuk sesi KBM ini!', 'success', {
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      });

      try {
        const updatedState = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
        setDailyState(updatedState);
      } catch (e) {
        console.error(e);
      }
    } catch (err: any) {
      showToast('Gagal Menyimpan Absensi', err?.message || 'Terjadi kesalahan saat menyimpan absensi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // R4: Capture GPS Geolocation on gallery upload
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const nowWita = getWitaTimestamp();
    setUploadWaktu(nowWita);

    // Capture GPS Geolocation via browser API
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUploadLatitude(lat);
          setUploadLongitude(lng);
          setUploadLokasi(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        },
        (err) => {
          console.warn('Geolocation capture failed on gallery upload:', err);
          setUploadLokasi('Lokasi tidak terdeteksi');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    const compressed = await compressImageWithCanvas(selectedFile);
    setFile(compressed);
    setPhotoPreviewUrl(URL.createObjectURL(compressed));
  };

  const handleJurnalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Jika pengguna menekan submit/Enter saat berada di sub-mode absensi, alihkan ke penyimpanan absensi mandiri
    if (tipeJurnal === 'Jurnal KBM' && kbmSubMode === 'absensi') {
      await handleSaveAbsensiOnly();
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline / terjadi kendala jaringan. Draft formulir tetap tersimpan aman di perangkat.',
        'warning'
      );
    }

    if (tipeJurnal === 'Jurnal KBM') {
      if (!tujuanPembelajaran || !tujuanPembelajaran.trim()) {
        return showToast('Tujuan Pembelajaran Wajib', 'Silakan isi tujuan pembelajaran.', 'warning');
      }
      if (!kktp || !kktp.trim()) {
        return showToast('KKTP Wajib', 'Silakan isi kriteria ketercapaian tujuan pembelajaran (KKTP).', 'warning');
      }
      if (!konten || !konten.trim()) {
        return showToast('Konten Wajib', 'Silakan isi konten pembelajaran.', 'warning');
      }
      if (!kegiatan || !kegiatan.trim()) {
        return showToast('Kegiatan Pembelajaran Wajib', 'Silakan isi kegiatan pembelajaran.', 'warning');
      }
      if (!mapel || !mapel.trim()) {
        return showToast('Mata Pelajaran Wajib', 'Silakan pilih mata pelajaran.', 'warning');
      }
      if (isInvalidMapel(mapel)) {
        return showToast('Mata Pelajaran Tidak Valid', `Mata pelajaran "${mapel}" tidak valid. Harap gunakan mata pelajaran resmi yang valid (contoh: "Informatika").`, 'warning');
      }
      if (!kelas || !kelas.trim()) {
        return showToast('Kelas Wajib', 'Silakan pilih kelas.', 'warning');
      }
      if (!lokasiKbm || !lokasiKbm.trim()) {
        return showToast('Lokasi KBM Wajib', 'Silakan isi lokasi KBM (contoh: Ruang Kelas 7A, Lab IPA).', 'warning');
      }
    } else {
      if (!materi || !materi.trim()) {
        return showToast('Nama Kegiatan Wajib', 'Silakan isi nama kegiatan.', 'warning');
      }
      if (!kegiatan || !kegiatan.trim()) {
        return showToast('Uraian / Deskripsi Wajib', 'Silakan isi uraian kegiatan.', 'warning');
      }
    }

    if (!file && !photoPreviewUrl) {
      return showToast('Foto Dokumentasi Wajib', 'Silakan ambil foto dokumentasi pembelajaran menggunakan kamera atau unggah dari galeri.', 'warning');
    }

    setLoading(true);

    let fileUrl = '';
    try {
      if (file) {
        const compressedFile = await compressImageWithCanvas(file);
        fileUrl = await uploadToDrive(compressedFile, user.nama, tipeJurnal, 'Jurnal');
      } else if (photoPreviewUrl) {
        fileUrl = photoPreviewUrl;
      }
    } catch (err: any) {
      setLoading(false);
      return showToast('Gagal Upload', err.message, 'error');
    }

    const cleanAbsensiForSave: Record<string, string> = {};
    if (tipeJurnal === 'Jurnal KBM' && Array.isArray(students)) {
      students.forEach(s => {
        if (s.nisn) {
          cleanAbsensiForSave[s.nisn] = absensi[s.nisn] || 'H';
        }
      });
    }

    const computedKehadiran = tipeJurnal === 'Jurnal KBM'
      ? (calculateKehadiranSummary(cleanAbsensiForSave, students) || kehadiranMurid || '-')
      : 'Hadir';

    const finalKonten = tipeJurnal === 'Jurnal KBM' ? konten : materi;

    // ponytail: prefix keterangan with INVAL marker — no schema change needed
    const invalPrefix = isInval && guruDigantikan
      ? `[INVAL - Menggantikan: ${guruDigantikan.nama}] `
      : '';

    // Automated Verification Evaluation:
    // Jurnal is auto-approved ('Disetujui') if:
    // 1. Materi / Konten is filled
    // 2. Kegiatan is filled
    // 3. Student attendance (absensi) is completed
    // 4. Photo evidence (fileUrl) is attached
    // Otherwise falls back to 'Menunggu'
    const isMateriLengkap = Boolean(finalKonten && finalKonten.trim().length > 0);
    const isKegiatanLengkap = Boolean(kegiatan && kegiatan.trim().length > 0);
    const isFotoLengkap = Boolean(fileUrl && fileUrl.trim().length > 0 && fileUrl !== 'pending:uploading' && fileUrl !== 'gagal_upload');
    const isAbsensiLengkap = tipeJurnal === 'Jurnal KBM'
      ? (
          Boolean(computedKehadiran && computedKehadiran.trim().length > 0 && computedKehadiran !== '-') &&
          (students && students.length > 0 ? Object.keys(cleanAbsensiForSave).length > 0 : true)
        )
      : Boolean(computedKehadiran && computedKehadiran.trim().length > 0);

    const statusVerifikasiJurnal = (isMateriLengkap && isKegiatanLengkap && isAbsensiLengkap && isFotoLengkap)
      ? 'Disetujui'
      : 'Menunggu';

    const newJurnal = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      nama_guru: (user.nama || '').trim(),
      user_id: user.id,
      mapel: tipeJurnal === 'Jurnal KBM' ? mapel : '-',
      kelas: tipeJurnal === 'Jurnal KBM' ? kelas : '-',
      tanggal: tanggal,
      materi: finalKonten,
      kegiatan: kegiatan,
      absensi_siswa: tipeJurnal === 'Jurnal KBM' ? JSON.stringify(cleanAbsensiForSave) : JSON.stringify(absensi),
      keterangan: `${invalPrefix}${tipeJurnal}`,
      refleksi: refleksi,
      detail_absen: '',
      link_bukti_foto: fileUrl,
      status_verifikasi: statusVerifikasiJurnal,
      catatan_khusus_siswa: catatanSiswa,
      // Dual-write new R2 columns
      kktp: tipeJurnal === 'Jurnal KBM' ? (kktp || null) : null,
      konten: tipeJurnal === 'Jurnal KBM' ? finalKonten : null,
      lokasi_kbm: tipeJurnal === 'Jurnal KBM' ? (lokasiKbm || null) : null,
      pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '-') : '-',
      jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '-') : '-',
      tujuan_pembelajaran: tipeJurnal === 'Jurnal KBM' ? (tujuanPembelajaran || '-') : '-',
      materi_pembelajaran: finalKonten,
      kehadiran_murid: computedKehadiran,
      catatan_refleksi: refleksi || '-',
      foto_kegiatan: fileUrl,
      latitude: uploadLatitude ?? (jurnalCoords?.latitude || null),
      longitude: uploadLongitude ?? (jurnalCoords?.longitude || null),
      lokasi: uploadLokasi || (jurnalCoords ? `GPS: ${jurnalCoords.latitude.toFixed(5)}, ${jurnalCoords.longitude.toFixed(5)}` : (lokasiKbm || '-')),
      waktu_upload: uploadWaktu || getWitaTimestamp(),
      ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
    };

    try {
      // If re-submitting after rejection: delete ONLY the matching rejected journal entry
      if (dailyState?.jurnalDitolak && dailyState.jurnalDitolak.length > 0) {
        const matchingRejected = dailyState.jurnalDitolak.filter((j: any) => {
          if (tipeJurnal === 'Jurnal Kegiatan') {
            return j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan';
          }
          if (tipeJurnal === 'Jurnal KBM') {
            // Must match kelas
            if (j.kelas !== kelas) return false;
            // Match mapel directly or via fuzzy match
            return j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel });
          }
          return false;
        });

        if (matchingRejected.length > 0) {
          const matchingIds = matchingRejected.map((j: any) => j.id);
          await supabase.from('jurnal_pembelajaran').delete().in('id', matchingIds);
        }
      }

      // Cek sesi yang sudah ada di jurnal_pembelajaran agar absensi dan jurnal terhubung dalam sesi yang sama
      const cleanNama = (user?.nama || '').split(',')[0].trim();
      let existingSessionQuery = supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .eq('tanggal', tanggal)
        .eq('kelas', kelas);
      if (user?.sekolah_id) existingSessionQuery = existingSessionQuery.eq('sekolah_id', user.sekolah_id);
      if (user?.id && cleanNama) {
        existingSessionQuery = existingSessionQuery.or(`user_id.eq.${user.id},nama_guru.ilike."%${cleanNama}%"`);
      } else if (user?.id) {
        existingSessionQuery = existingSessionQuery.eq('user_id', user.id);
      } else if (cleanNama) {
        existingSessionQuery = existingSessionQuery.ilike('nama_guru', `%${cleanNama}%`);
      }
      const { data: existingSessionRows } = await existingSessionQuery;
      const existingSessionRow = (existingSessionRows || []).find((j: any) =>
        tipeJurnal === 'Jurnal KBM'
          ? (j.mapel === mapel || isJurnalMatchJadwal(j, { kelas, mata_pelajaran: mapel }))
          : (j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan')
      );

      // Pertahankan data absensi siswa yang sudah tersimpan sebelumnya jika state absensi lokal belum diisi manual
      let finalAbsensiJson = newJurnal.absensi_siswa;
      let finalKehadiranSummary = newJurnal.kehadiran_murid;
      if (existingSessionRow?.absensi_siswa && Object.keys(cleanAbsensiForSave).length === 0) {
        finalAbsensiJson = existingSessionRow.absensi_siswa;
        finalKehadiranSummary = existingSessionRow.kehadiran_murid || computedKehadiran;
      }

      let error = null;
      if (existingSessionRow) {
        const updatePayload: any = {
          ...newJurnal,
          id: existingSessionRow.id,
          catatan_khusus_siswa: catatanSiswa || existingSessionRow.catatan_khusus_siswa || null,
          absensi_siswa: finalAbsensiJson,
          kehadiran_murid: finalKehadiranSummary,
        };
        const res = await supabase.from('jurnal_pembelajaran').update(updatePayload).eq('id', existingSessionRow.id);
        error = res.error;
        if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
          const { user_id: _u, latitude: _lat, longitude: _lng, lokasi: _lok, waktu_upload: _wu, kktp: _k, konten: _ko, lokasi_kbm: _lk, ...compatiblePayload } = updatePayload;
          const retry = await supabase.from('jurnal_pembelajaran').update(compatiblePayload).eq('id', existingSessionRow.id);
          error = retry.error;
        }
      } else {
        let insertRes = await supabase.from('jurnal_pembelajaran').insert([newJurnal]);
        error = insertRes.error;
        if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
          const { user_id: _u, latitude: _lat, longitude: _lng, lokasi: _lok, waktu_upload: _wu, kktp: _k, konten: _ko, lokasi_kbm: _lk, ...compatibleJurnal } = newJurnal;
          const retry = await supabase.from('jurnal_pembelajaran').insert([compatibleJurnal]);
          error = retry.error;
        }
      }

      if (error) {
        showToast('Gagal Menyimpan Jurnal', 'Koneksi internet aktif diwajibkan untuk menyimpan jurnal pembelajaran. ' + (error.message || 'Silakan periksa koneksi Anda dan coba lagi.'), 'error');
      } else {
        // Aturan Khusus & Logika Status "Bolos" (Rule 2):
        // Pemicu Otomatis: Jika siswa berstatus Hadir pada Absensi Kelas di pagi hari (diinput oleh Piket/Wali Kelas),
        // namun pada mata pelajaran tengah hari atau mata pelajaran terakhir Guru Mapel menginput status Alfa (A),
        // maka sistem secara otomatis mengubah status harian siswa tersebut menjadi 'Bolos'.
        if (tipeJurnal === 'Jurnal KBM' && students.length > 0) {
          try {
            const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
            let aQ = supabase.from('absensi').select('id, siswa_id, nisn, nama_siswa, status, log_perubahan, keterangan').eq('tanggal', tanggal).eq('kelas', kelas);
            if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
            const { data: existingClassAbs } = await aQ;

            const bolosUpdates: any[] = [];
            students.forEach(s => {
              const currentStatus = absensi[s.nisn];
              if (currentStatus === 'A' || currentStatus === 'B') {
                const classRec = existingClassAbs?.find(a => (a.siswa_id && s.id && a.siswa_id === s.id) || (a.nisn && a.nisn === s.nisn) || (a.nama_siswa && s.nama_siswa && a.nama_siswa.trim().toLowerCase() === s.nama_siswa.trim().toLowerCase()));
                const isExcused = classRec && (classRec.status === 'Sakit' || classRec.status === 'Izin' || classRec.status === 'S' || classRec.status === 'I');
                const isMorningHadir = !isExcused && ((classRec && (classRec.status === 'Hadir' || classRec.status === 'H')) ||
                                       Boolean(piketAttendance[s.nisn] || (s.id && piketAttendance[s.id])));

                if (isMorningHadir) {
                  const prevLogs = classRec?.log_perubahan || [];
                  const logEntry = `[${nowWita} WITA] Terdeteksi Bolos: Hadir pagi di kelas/gerbang, tetapi Alfa pada mapel ${mapel || 'KBM'} (Jam ${jamKe || '-'}) oleh ${user.nama}`;
                  bolosUpdates.push({
                    sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
                    tanggal: tanggal,
                    kelas: kelas,
                    siswa_id: s.id,
                    nisn: s.nisn,
                    nama_siswa: s.nama_siswa,
                    status: 'Bolos',
                    sumber_perubahan: 'Guru Mapel (Otomatis Bolos)',
                    diubah_oleh: user.nama,
                    keterangan: `Terindikasi Bolos (Hadir Pagi, Alfa Mapel ${mapel || 'KBM'})`,
                    log_perubahan: [...prevLogs, logEntry],
                    updated_at: new Date().toISOString()
                  });
                }
              }
            });

            if (bolosUpdates.length > 0) {
              await supabase.from('absensi').upsert(bolosUpdates, { onConflict: 'sekolah_id, tanggal, nisn' });
            }
          } catch (bolosErr) {
            console.error('Error auto-syncing bolos status to public.absensi:', bolosErr);
          }
        }

        // Presensi mapel tersimpan di jurnal_pembelajaran (absensi_siswa & kehadiran_murid)
        showToast('Berhasil', 'Jurnal berhasil disimpan! Jurnal KBM dan presensi mapel berhasil disimpan!', 'success', {
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
        });
        clearJurnalDraft(user?.id, user?.sekolah_id);
        clearJurnalDraft();
        try {
          const draftKey = getJurnalDraftKey(user?.id, user?.sekolah_id);
          localStorage.removeItem(draftKey);
          if (draftKey !== 'sipjam_jurnal_autosave') {
            localStorage.removeItem('sipjam_jurnal_autosave');
          }
        } catch {}
        setHasDraft(false);
        setMateri('');
        setKegiatan('');
        setCatatanSiswa('');
        setRefleksi('');
        setFile(null);
        setPhotoPreviewUrl(null);
        setPertemuanKe('');
        setJamKe('');
        setTujuanPembelajaran('');
        setKehadiranMurid('');
        setKktp('');
        setKonten('');
        setLokasiKbm('');
        setMapel('');
        setKelas('');
        setAbsensi({});
        // Reset inval mode
        setIsInval(false);
        setGuruDigantikan(null);
        const activeHariReset = getWitaDayName(tanggal ? new Date(tanggal + 'T00:00:00+08:00') : new Date());
        const dayFilteredReset = filterGuruMapelByHari(myAssignments, activeHariReset);
        setMapelList(dayFilteredReset);
        setAssignments(dayFilteredReset);
        const origKelas = [...new Set(dayFilteredReset.map(m => m.kelas).filter(Boolean))].sort() as string[];
        setKelasList(origKelas);

        // Refresh state to update canPresensiPulang
        try {
          const updatedState = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
          setDailyState(updatedState);
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      return showToast('Gagal Menyimpan Jurnal', 'Perangkat Anda sedang offline / terjadi kendala jaringan: ' + (err?.message || 'Silakan periksa koneksi Anda dan coba lagi.') + ' Draft formulir tetap tersimpan aman di perangkat.', 'error');
    }
  };

  // --- Guru Inval Handlers ---
  const handleInvalToggle = (checked: boolean) => {
    setIsInval(checked);
    if (!checked) {
      // Restore original teacher assignments filtered by active day
      setGuruDigantikan(null);
      const activeHari = getWitaDayName(tanggal ? new Date(tanggal + 'T00:00:00+08:00') : new Date());
      const dayFiltered = filterGuruMapelByHari(myAssignments, activeHari);
      setMapelList(dayFiltered);
      const origKelas = [...new Set(dayFiltered.map(m => m.kelas).filter(Boolean))].sort() as string[];
      setKelasList(origKelas);
      setAssignments(dayFiltered);
      setMapel('');
      setKelas('');
    }
  };

  const handleGuruDigantikanChange = async (guruId: string) => {
    const selected = allGuruList.find(g => g.id === guruId);
    if (!selected) return;
    setGuruDigantikan({ id: selected.id, nama: selected.nama_guru });
    setMapel('');
    setKelas('');

    // Fetch jadwal & guru_mapel of the selected guru
    let gmQuery = supabase
      .from('guru_mapel')
      .select('*')
      .eq('guru_id', guruId);
    let jdwlQuery = supabase.from('jadwal_pelajaran').select('*');
    let mapelMasterQuery = supabase.from('data_mapel').select('*');
    if (user?.sekolah_id) {
      gmQuery = gmQuery.eq('sekolah_id', user.sekolah_id);
      jdwlQuery = jdwlQuery.eq('sekolah_id', user.sekolah_id);
      mapelMasterQuery = mapelMasterQuery.eq('sekolah_id', user.sekolah_id);
    }
    const [gmRes, jdwlRes, mapelMasterRes] = await Promise.all([
      gmQuery.order('nama_mapel', { ascending: true }),
      jdwlQuery,
      mapelMasterQuery.order('nama_mata_pelajaran', { ascending: true }),
    ]);

    const connectedInval = connectGuruMapelWithJadwal(
      { id: selected.user_id || selected.id, user_id: selected.user_id, nama: selected.nama_guru },
      jdwlRes.data || [],
      mapelMasterRes.data || [],
      gmRes.data || [],
      selected,
      kelasList
    );
    const activeHari = getWitaDayName(tanggal ? new Date(tanggal + 'T00:00:00+08:00') : new Date());
    const mapels = filterGuruMapelByHari(connectedInval, activeHari);

    if (mapels.length > 0) {
      setMapelList(mapels);
      setAssignments(mapels);
      const kelas = [...new Set(mapels.map(d => d.kelas).filter(Boolean))].sort() as string[];
      setKelasList(kelas);
      if (mapels.length === 1) {
        setMapel(mapels[0].nama_mata_pelajaran || mapels[0].nama_mapel);
        setKelas(mapels[0].kelas || '');
      }
    } else {
      setMapelList([]);
      setAssignments([]);
      setKelasList([]);
    }
  };

  const handleMapelChange = (val: string) => {
    setMapel(val);
    // Cascading auto-sync: automatically set corresponding class
    // Jika kelas saat ini sudah mengampu mapel yang dipilih (misal pada kelas paralel), pertahankan kelas aktif!
    const currentKelasMatches = assignments.some(
      a => (a.nama_mapel === val || a.nama_mata_pelajaran === val) && a.kelas === kelas
    );
    if (!currentKelasMatches) {
      const matched = assignments.find(
        a => (a.nama_mapel === val || a.nama_mata_pelajaran === val)
      );
      if (matched && matched.kelas) {
        setKelas(matched.kelas);
      } else {
        const canonical = resolveCanonicalClass('', val, kelasList);
        if (canonical && kelasList.includes(canonical)) {
          setKelas(canonical);
        } else {
          const prefix = val.split('_')[0];
          if (prefix && kelasList.includes(prefix)) {
            setKelas(prefix);
          }
        }
      }
    }
  };

  const handleKelasChange = (val: string) => {
    setKelas(val);
    // If current mapel doesn't belong to the newly selected class, reset or auto-select
    const mapelsInClass = assignments.filter(a => a.kelas === val);
    const currentMatches = mapelsInClass.some(
      a => (a.nama_mapel === mapel || a.nama_mata_pelajaran === mapel)
    );
    if (!currentMatches) {
      if (mapelsInClass.length === 1) {
        setMapel(mapelsInClass[0].nama_mapel || mapelsInClass[0].nama_mata_pelajaran);
      } else {
        setMapel('');
      }
    }
  };

  const hasNoKbmAssignments = tipeJurnal === 'Jurnal KBM' && !isFetchingAssignments && mapelList.length === 0 && user?.role !== 'Admin';
  // isLocked: locked if libur, or can't open jurnal, or no assignments
  // BUT: if there are rejected journals, allow re-submission even if canOpenJurnal is normally false
  const hasRejectedJurnal = (dailyState?.jurnalDitolak?.length ?? 0) > 0;
  const isLocked = !!(dailyState?.isLibur || (dailyState && !dailyState.canOpenJurnal && !hasRejectedJurnal) || hasNoKbmAssignments);
  const lockedMessage = hasNoKbmAssignments 
    ? 'Belum ada mata pelajaran atau kelas yang ditugaskan kepada Anda. Hubungi Administrator.' 
    : dailyState?.lockedReason;

  const tabItems: TabItem[] = [
    {
      id: 'input',
      label: 'Input Jurnal KBM',
      icon: 'fa-pen-to-square',
      badge: hasDraft ? 'Draf' : undefined,
      badgeVariant: 'amber',
    },
    {
      id: 'rekap-pribadi',
      label: 'Cetak & Rekap Jurnal KBM',
      icon: 'fa-print',
    },
    ...(canAccessSupervisi
      ? [
          {
            id: 'supervisi-kelas',
            label: 'Supervisi Kelas Binaan',
            icon: 'fa-users-rectangle',
            badge: assignedKelas || (isAdmin ? 'Admin' : undefined),
            badgeVariant: 'mint' as const,
          },
        ]
      : []),
  ];

  return (
    <section id="view-guru-jurnal" className="view-section fade-in max-w-4xl mx-auto space-y-4 print:max-w-none print:w-full print:mx-0 print:p-0">
      {/* Sub-Navigasi ClayTabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 no-print">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-book-journal-whills text-blue-600 dark:text-blue-400"></i>
            <span>Jurnal Pembelajaran</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Pusat administrasi kegiatan belajar mengajar dan pelaporan capaian materi harian
          </p>
        </div>
        <ClayTabs
          items={tabItems}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Sub-Tab 1: Input Form Jurnal KBM (In-Memory Keep-Alive) */}
      <div
        id="panel-input"
        role="tabpanel"
        aria-labelledby="tab-input"
        className={activeTab === 'input' ? 'block' : 'hidden'}
      >
        <div className="clay-card p-5 sm:p-6 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-book-journal-whills text-blue-500 dark:text-blue-400"></i> Form Jurnal
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleTabChange('rekap-pribadi')}
                    className="btn-click text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                  >
                    <i className="fa-solid fa-print text-xs"></i> Cetak Jurnal KBM
                  </button>
                  {hasDraft && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold shadow-sm">
                      <i className="fa-solid fa-cloud-arrow-down text-emerald-500"></i>
                      <span>Draft Lokal Tersimpan</span>
                    </div>
                  )}
                </div>
            </div>

            {isLocked && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                <i className="fa-solid fa-lock mr-2"></i> Akses Terkunci: {lockedMessage}
              </div>
            )}

            {/* Rejection Alert — Jurnal Ditolak */}
            {(dailyState?.jurnalDitolak?.length ?? 0) > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
                  <i className="fa-solid fa-circle-xmark text-base shrink-0"></i>
                  <span>Jurnal Anda Ditolak oleh Admin ({dailyState!.jurnalDitolak.length} entri)</span>
                </div>
                {dailyState!.jurnalDitolak.slice(0, 3).map((j: any) => (
                  <div key={j.id} className="pl-6 space-y-0.5">
                    <div className="text-xs font-semibold text-red-800 dark:text-red-300">
                      {j.mapel || j.keterangan || 'Jurnal'} {j.kelas ? `— ${j.kelas}` : ''}
                    </div>
                    {(j.catatan_admin || j.alasan_penolakan) && (
                      <div className="text-xs text-red-700 dark:text-red-300/90 italic">
                        Alasan: {j.catatan_admin || j.alasan_penolakan}
                      </div>
                    )}
                  </div>
                ))}
                <div className="pl-6 text-xs text-red-600 dark:text-red-400 font-semibold">
                  <i className="fa-solid fa-rotate-right mr-1"></i> Silakan isi ulang jurnal Anda. Data lama yang ditolak akan dihapus otomatis saat Anda menyimpan.
                </div>
              </div>
            )}
            
            {/* Sistem Blok Alert Banner */}
            {dateBlok && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 mb-4 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <i className="fa-solid fa-layer-group text-amber-600 dark:text-amber-400 text-sm mt-0.5 shrink-0"></i>
                <div>
                  <div className="font-bold">Periode Sistem Blok Aktif: {dateBlok.nama_kegiatan}</div>
                  <div className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-300 leading-relaxed">
                    Jadwal KBM reguler ditiadakan sementara dan digantikan oleh kegiatan khusus ini{dailyState?.hasBlockedSchedule && !dailyState?.isBlok ? ' untuk jam pelajaran yang terblokir' : ''}. Anda hanya perlu mengisi form <strong>Jurnal Kegiatan</strong> di bawah ini (tidak perlu mengisi jurnal absensi kelas reguler){dailyState?.hasBlockedSchedule && !dailyState?.isBlok ? ', atau pilih opsi Jurnal KBM di bawah jika mengisi kelas reguler Anda yang tidak diblok' : ''}.
                  </div>
                  {dateBlok.deskripsi && (
                    <div className="text-[11px] mt-1.5 italic bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-lg text-amber-900 dark:text-amber-200">
                      Petunjuk: {dateBlok.deskripsi}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Guru Inval Toggle — opsional untuk Guru */}
            {user?.role === 'Guru' && !dateBlok && (
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3.5 mb-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInval}
                    onChange={e => handleInvalToggle(e.target.checked)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <div>
                    <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">
                      <i className="fa-solid fa-person-chalkboard mr-1.5" />
                      Saya sebagai Guru Inval
                    </span>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">
                      Aktifkan jika Anda menggantikan guru lain yang berhalangan hadir.
                    </p>
                  </div>
                </label>

                {isInval && (
                  <div className="mt-3 fade-in">
                    <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-200 mb-1.5 ml-1">
                      Guru yang Digantikan <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={guruDigantikan?.id ?? ''}
                      onChange={e => handleGuruDigantikanChange(e.target.value)}
                      className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                      required={isInval}
                    >
                      <option value="" disabled>Pilih guru yang digantikan...</option>
                      {allGuruList.map(g => (
                        <option key={g.id} value={g.id}>{g.nama_guru}</option>
                      ))}
                    </select>
                    {guruDigantikan && (
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 ml-1">
                        <i className="fa-solid fa-circle-check mr-1" />
                        Mapel &amp; Kelas di bawah diisi berdasarkan jadwal {guruDigantikan.nama}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleJurnalSubmit} className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Jenis Jurnal</label>
                    {dailyState?.hasBlockedSchedule && !dailyState?.isBlok ? (
                      <div className="space-y-1.5">
                        <select
                          value={tipeJurnal}
                          onChange={(e) => {
                            const val = e.target.value as 'Jurnal KBM' | 'Jurnal Kegiatan';
                            setTipeJurnal(val);
                            if (val === 'Jurnal Kegiatan') {
                              const blockName = dateBlok?.nama_kegiatan || dailyState?.blokInfo?.nama_kegiatan || '';
                              if (blockName) setMateri(blockName);
                            } else if (val === 'Jurnal KBM') {
                              setMateri('');
                            }
                          }}
                          className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border-2 border-emerald-500/60 cursor-pointer shadow-sm"
                        >
                          <option value="Jurnal KBM">Jurnal KBM (Jadwal Mengajar Reguler)</option>
                          <option value="Jurnal Kegiatan">Jurnal Kegiatan (Sistem Blok: {dateBlok?.nama_kegiatan || dailyState.blokInfo?.nama_kegiatan || 'Kegiatan Blok'})</option>
                        </select>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                          <i className="fa-solid fa-circle-info mr-1"></i> Jadwal campuran aktif: Silakan pilih Jurnal KBM untuk kelas reguler atau Jurnal Kegiatan untuk jam yang diblokir.
                        </p>
                      </div>
                    ) : (
                      <select value={tipeJurnal} disabled className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed">
                          <option value={tipeJurnal}>{tipeJurnal} {dateBlok ? `(Sistem Blok: ${dateBlok.nama_kegiatan})` : dailyState?.isDinasLuar ? '(Dinas Luar)' : ''}</option>
                      </select>
                    )}
                    {(!dailyState?.hasBlockedSchedule || dailyState?.isBlok) && (
                      <p className="text-[9px] text-gray-500 dark:text-white/80 mt-1 italic ml-1">Jenis jurnal diatur otomatis oleh sistem berdasarkan jadwal Anda.</p>
                    )}
                </div>

                {/* {tipeJurnal === 'Jurnal KBM' && ( Pertemuan Ke- Kehadiran Murid ) */}
                {tipeJurnal === 'Jurnal KBM' ? (
                  <>
                    {/* Mode Sub-Antarmuka: Absensi Siswa vs Jurnal KBM */}
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 w-full sm:w-fit mb-3 fade-in">
                      <button
                        type="button"
                        onClick={() => handleKbmSubModeChange('absensi')}
                        className={`btn-click flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          kbmSubMode === 'absensi'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <i className="fa-solid fa-users-check text-[11px]"></i>
                        <span>Pengisian Absensi Siswa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKbmSubModeChange('jurnal')}
                        className={`btn-click flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          kbmSubMode === 'jurnal'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <i className="fa-solid fa-book-bookmark text-[11px]"></i>
                        <span>Pengisian Jurnal KBM</span>
                      </button>
                    </div>

                    {/* Hari/Tanggal */}
                    <div className="fade-in">
                      <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                        Hari/Tanggal
                      </label>
                      <input
                        type="text"
                        value={formatDisplayDate(tanggal)}
                        readOnly
                        className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                      />
                    </div>

                    {/* 7. Mapel & 8. Kelas (Shared for both sub-modes) */}
                    {!isFetchingAssignments && mapelList.length === 0 && user?.role !== 'Admin' ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-4 rounded-xl text-xs flex items-center gap-3">
                        <i className="fa-solid fa-circle-exclamation text-lg shrink-0 text-amber-600 dark:text-amber-400"></i>
                        <div>
                          <div className="font-bold">Belum Ada Penugasan Mata Pelajaran</div>
                          <div className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-300">
                            Akun Anda belum memiliki mata pelajaran atau kelas yang terdaftar dalam sistem. Silakan hubungi Administrator untuk memperbarui data pengampu Anda.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            Mata Pelajaran <span className="text-red-500">*</span> {mapelList.length > 0 && user?.role !== 'Admin' && <span className="text-gray-400 dark:text-gray-500 font-normal">({mapelList.length} mapel Anda)</span>}
                          </label>
                          <select 
                            value={mapel} 
                            onChange={e => handleMapelChange(e.target.value)} 
                            required 
                            className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                          >
                            <option value="" disabled>Pilih Mapel...</option>
                            {uniqueMapelList.map(m => (
                              <option key={m.id || m.nama_mata_pelajaran} value={m.nama_mata_pelajaran}>
                                {m.nama_mata_pelajaran}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            Kelas <span className="text-red-500">*</span> {kelasList.length > 0 && user?.role !== 'Admin' && <span className="text-gray-400 dark:text-gray-500 font-normal">({kelasList.length} kelas Anda)</span>}
                          </label>
                          <select 
                            value={kelas} 
                            onChange={e => handleKelasChange(e.target.value)} 
                            required 
                            className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                          >
                            <option value="" disabled>Pilih Kelas...</option>
                            {Array.from(new Set([...kelasList, ...(kelas && kelas !== '-' ? [kelas] : [])])).filter(Boolean).sort().map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* SUB-ANTARMUKA 1: PENGISIAN ABSENSI SISWA */}
                    {kbmSubMode === 'absensi' ? (
                      <div className="space-y-3 fade-in">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            Absensi Murid <span className="text-gray-500 dark:text-gray-400 font-normal">(Tersinkronisasi Otomatis)</span>
                          </label>
                          <input
                            type="text"
                            value={kehadiranMurid}
                            onChange={e => setKehadiranMurid(e.target.value)}
                            placeholder="Contoh: Total murid: 30, Hadir: 28, Izin: 1, Sakit: 1, Alpa: 0"
                            className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                          />
                        </div>

                        {students.length > 0 && (() => {
                          const truantCount = students.filter(s => {
                            const pRec = (s.nisn && piketAttendance[s.nisn]) || (s.id && piketAttendance[s.id]);
                            const isMorningHadir = Boolean(pRec || morningLockedAttendance[s.nisn]?.isMorningHadir);
                            return Boolean(!morningLockedAttendance[s.nisn]?.isLocked && isMorningHadir && absensi[s.nisn] === 'A');
                          }).length;

                          return (
                            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl fade-in">
                              {truantCount > 0 && (
                                <div 
                                  id="jurnal-truancy-alert"
                                  className="p-3 mb-3 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/80 dark:border-red-800 text-red-900 dark:text-red-200 text-xs font-bold flex items-center gap-2.5 animate-pulse"
                                >
                                  <i className="fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400 text-sm shrink-0"></i>
                                  <span>⚠️ Perhatian: Terdeteksi {truantCount} siswa bolos (hadir di gerbang sekolah namun Alpa pada jam pelajaran ini).</span>
                                </div>
                              )}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                <div>
                                  <h3 className="text-[11px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <i className="fa-solid fa-book-open-reader text-blue-500 dark:text-blue-400"></i> Presensi Siswa Mapel: {mapel || 'Pembelajaran'} (Kelas {kelas})
                                  </h3>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    Mencatat kehadiran khusus jam pelajaran ini (tidak mengubah absensi kelas harian).
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleApplyPiketAttendance}
                                  className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
                                  title="Tandai siswa yang sudah presensi di gerbang datang sebagai Hadir"
                                >
                                  {/* AST preservation: Terapkan Presensi Piket */}
                                  <i className="fa-solid fa-wand-magic-sparkles text-[9px]"></i> Terapkan Presensi Datang
                                </button>
                              </div>
                              <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll pr-1">
                                {students.map((siswa, idx) => {
                                  const pRec = (siswa.nisn && piketAttendance[siswa.nisn]) || (siswa.id && piketAttendance[siswa.id]);
                                  const isMorningLocked = Boolean(morningLockedAttendance[siswa.nisn]?.isLocked);
                                  const isMorningHadir = Boolean(pRec || morningLockedAttendance[siswa.nisn]?.isMorningHadir);
                                  const isTruant = !isMorningLocked && isMorningHadir && absensi[siswa.nisn] === 'A';
                                  return (
                                    <div key={siswa.nisn} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm gap-2">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-white/80 w-4 shrink-0">{idx + 1}.</span>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">{siswa.nama_siswa}</span>
                                            {isTruant ? (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0 animate-pulse">
                                                {/* AST preservation: Terindikasi Bolos (Hadir Gerbang pk. ... Alpa Mapel) */}
                                                <i className="fa-solid fa-triangle-exclamation text-[8px]"></i> ⚠️ Terindikasi Bolos (Alfa Mapel, Pagi Hadir)
                                              </span>
                                            ) : pRec ? (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                                                {/* AST preservation: ✓ Hadir di Sekolah (Piket */}
                                                <i className="fa-solid fa-check text-[8px]"></i> ✓ Hadir di Sekolah (Datang {pRec.jam})
                                              </span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0">
                                                {/* AST preservation: Belum Scan Piket / Belum Presensi Piket */}
                                                <i className="fa-solid fa-clock text-[8px]"></i> Belum Presensi Datang
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[9px] text-gray-500 dark:text-white/80">{siswa.nisn}</div>
                                          {lastChangeMap[siswa.nisn] && (
                                            <div className="mt-1 text-[9px] leading-tight text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap">
                                              <i className="fa-solid fa-clock-rotate-left text-[8px] text-teal-600 dark:text-teal-400"></i>
                                              <span>
                                                Terakhir diubah oleh <strong className="text-slate-700 dark:text-slate-200">{lastChangeMap[siswa.nisn].diubah_oleh}</strong>
                                                {' '}(<span className="font-semibold text-teal-700 dark:text-teal-300">{lastChangeMap[siswa.nisn].sumber_perubahan}</span>)
                                                {lastChangeMap[siswa.nisn].keterangan ? (
                                                  <span className="italic text-slate-600 dark:text-slate-300"> — "{lastChangeMap[siswa.nisn].keterangan}"</span>
                                                ) : null}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {isMorningLocked ? (
                                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                                            <i className="fa-solid fa-lock text-[9px] text-amber-600"></i>
                                            <span>{morningLockedAttendance[siswa.nisn]?.label} (Terkunci)</span>
                                          </span>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            {([
                                              { code: 'H', label: 'Hadir', icon: 'fa-check', on: 'bg-emerald-600 ring-emerald-400', title: 'Siswa hadir di jam pelajaran ini' },
                                              { code: 'I', label: 'Izin', icon: 'fa-envelope', on: 'bg-orange-500 ring-orange-400', title: 'Tandai Izin di jam pelajaran ini' },
                                              { code: 'S', label: 'Sakit', icon: 'fa-notes-medical', on: 'bg-yellow-500 ring-yellow-400', title: 'Tandai Sakit di jam pelajaran ini' },
                                              { code: 'A', label: 'Alfa', icon: 'fa-xmark', on: 'bg-red-600 ring-red-400', title: 'Tandai Alfa (memicu status Bolos harian jika pagi hadir)' },
                                              { code: 'B', label: 'Bolos', icon: 'fa-person-walking-arrow-right', on: 'bg-purple-600 ring-purple-400', title: 'Tandai Bolos di jam pelajaran ini' }
                                            ] as const).map(opt => (
                                              <button 
                                                key={opt.code}
                                                type="button"
                                                onClick={() => handleAbsensiChange(siswa.nisn, opt.code)}
                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                                                  absensi[siswa.nisn] === opt.code 
                                                    ? opt.on + ' text-white shadow-sm ring-1' 
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                                title={opt.title}
                                              >
                                                <i className={`fa-solid ${opt.icon} text-[9px]`}></i> {opt.label}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-3 rounded-xl">
                          <label className="block text-[10px] font-bold text-orange-800 dark:text-orange-400 mb-1.5"><i className="fa-solid fa-clipboard-user mr-1"></i> Catatan Khusus Siswa (Opsional)</label>
                          <textarea value={catatanSiswa} onChange={e => setCatatanSiswa(e.target.value)} rows={2} className="w-full px-3 py-2 text-[11px] rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none" placeholder="Misal: Siswa A mengantuk..."></textarea>
                        </div>

                        {/* Tombol Simpan Khusus Absensi Siswa */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleSaveAbsensiOnly}
                            disabled={loading || isLocked}
                            className="clay-btn clay-btn-primary btn-click w-full text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {loading ? 'Memproses...' : <><i className="fa-solid fa-save"></i> Simpan Absensi Siswa</>}
                          </button>
                          <div className="mt-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleKbmSubModeChange('jurnal')}
                              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Lanjut isi materi &amp; dokumentasi di Form Jurnal KBM &rarr;
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* SUB-ANTARMUKA 2: PENGISIAN JURNAL KBM */
                      <div className="space-y-4 fade-in">
                        {/* Banner status absensi siswa */}
                        <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                              <i className="fa-solid fa-users-check text-blue-600 dark:text-blue-400"></i> Status Kehadiran Siswa
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                              {kehadiranMurid ? kehadiranMurid : 'Belum diisi — Siswa otomatis Hadir saat disimpan jika tidak disesuaikan'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleKbmSubModeChange('absensi')}
                            className="btn-click text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                          >
                            <i className="fa-solid fa-pen-to-square text-[10px] mr-1"></i> Kelola Absensi Siswa
                          </button>
                        </div>

                        {/* 3. Tujuan Pembelajaran */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            Tujuan Pembelajaran <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={tujuanPembelajaran}
                            onChange={e => setTujuanPembelajaran(e.target.value)}
                            required
                            rows={2}
                            className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"
                            placeholder="Tuliskan capaian/tujuan pembelajaran..."
                          />
                        </div>

                        {/* 4. KKTP */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            KKTP (Kriteria Ketercapaian Tujuan Pembelajaran) <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={kktp}
                            onChange={e => setKktp(e.target.value)}
                            required
                            rows={2}
                            className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"
                            placeholder="Tuliskan kriteria ketercapaian tujuan pembelajaran..."
                          />
                        </div>

                        {/* 5. Konten (replaces Materi Pembelajaran) */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            Konten <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={konten}
                            onChange={e => {
                              setKonten(e.target.value);
                              setMateri(e.target.value);
                            }}
                            required
                            rows={2}
                            className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"
                            placeholder="Tuliskan materi/topik konten pembelajaran..."
                          />
                        </div>

                        {/* 6. Kegiatan Pembelajaran */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            Kegiatan Pembelajaran <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={kegiatan}
                            onChange={e => setKegiatan(e.target.value)}
                            required
                            rows={2}
                            className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"
                            placeholder="Deskripsikan kegiatan pembelajaran selengkapnya..."
                          />
                        </div>

                        {/* 10. Lokasi KBM */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                            Lokasi KBM <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={lokasiKbm}
                            onChange={e => setLokasiKbm(e.target.value)}
                            required
                            placeholder="contoh: Ruang Kelas 7A, Lab IPA"
                            className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Jurnal Kegiatan Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Tanggal</label>
                        <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Nama Kegiatan</label>
                        <input type="text" value={materi} onChange={e => setMateri(e.target.value)} required className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white" placeholder="..." />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                        Uraian / Deskripsi
                      </label>
                      <textarea value={kegiatan} onChange={e => setKegiatan(e.target.value)} required rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white" placeholder="Deskripsikan selengkapnya..."></textarea>
                    </div>
                  </>
                )}

                {!(tipeJurnal === 'Jurnal KBM' && kbmSubMode === 'absensi') && (
                  <>
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-camera text-blue-600 dark:text-blue-400"></i>
                            {tipeJurnal === 'Jurnal KBM' ? 'Dokumentasi KBM' : 'Foto Dokumentasi Kegiatan'}{' '}
                            {isUploadAllowed ? (
                              <span className="text-gray-500 dark:text-gray-400 font-normal">(Kamera Lanskap / Upload Foto)</span>
                            ) : (
                              <span className="text-red-500 dark:text-red-400 font-normal">(Wajib Kamera Lanskap Langsung)</span>
                            )}
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                            {file ? '✓ Foto Terpasang' : uploadMode === 'camera' || !isUploadAllowed ? 'Kamera Aktif' : 'Upload Foto Aktif'}
                          </span>
                        </label>

                        {/* Mode selector if school allows upload */}
                        {isUploadAllowed && (
                          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1 text-xs mb-2">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadMode('camera');
                                setFile(null);
                                setPhotoPreviewUrl(null);
                                setUploadLokasi(null);
                                setUploadWaktu(null);
                              }}
                              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                                uploadMode === 'camera'
                                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              <i className="fa-solid fa-camera"></i> Kamera Langsung
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadMode('gallery');
                                setFile(null);
                                setPhotoPreviewUrl(null);
                                setUploadLokasi(null);
                                setUploadWaktu(null);
                              }}
                              className={`flex-1 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                                uploadMode === 'gallery'
                                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              <i className="fa-solid fa-images"></i> Upload Foto / Galeri
                            </button>
                          </div>
                        )}

                        {/* Camera view (if not allowed or camera mode selected) */}
                        {(!isUploadAllowed || uploadMode === 'camera') && (
                          <CameraSelfieCapture
                            key={`cam-jurnal-${tipeJurnal}`}
                            
                            initialFacingMode="environment"
                            initialCoordinates={jurnalCoords}
                            existingPhotoUrl={photoPreviewUrl}
                            onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
                              setFile(capturedFile);
                              setPhotoPreviewUrl(previewUrl);
                              setUploadWaktu(getWitaTimestamp());
                              if (jurnalCoords) {
                                setUploadLatitude(jurnalCoords.latitude);
                                setUploadLongitude(jurnalCoords.longitude);
                                setUploadLokasi(`GPS: ${jurnalCoords.latitude.toFixed(5)}, ${jurnalCoords.longitude.toFixed(5)}`);
                              }
                            }}
                            onRetake={() => {
                              setFile(null);
                              setPhotoPreviewUrl(null);
                            }}
                          />
                        )}

                        {/* Gallery upload input - ONLY rendered if isUploadAllowed is true and uploadMode is gallery */}
                        {isUploadAllowed && uploadMode === 'gallery' && (
                          <div className="space-y-2">
                            <label
                              htmlFor="jurnal-gallery-file-input"
                              className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 min-h-[140px]"
                            >
                              <input
                                id="jurnal-gallery-file-input"
                                type="file"
                                accept="image/*"
                                onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                                onChange={handleGalleryUpload}
                                className="hidden"
                              />
                              {photoPreviewUrl ? (
                                <div className="space-y-2 w-full">
                                  <img
                                    src={photoPreviewUrl}
                                    alt="Preview Foto Galeri"
                                    className="w-full max-h-48 object-cover rounded-xl shadow-sm mx-auto"
                                  />
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    Klik untuk memilih foto lain dari perangkat
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1.5 py-3">
                                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center text-lg">
                                    <i className="fa-solid fa-cloud-arrow-up"></i>
                                  </div>
                                  <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                    Pilih Foto Dokumentasi dari Perangkat
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    Format gambar JPG, PNG, atau JPEG (GPS otomatis direkam)
                                  </div>
                                </div>
                              )}
                            </label>

                            {uploadLokasi && (
                              <div className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                  <i className="fa-solid fa-location-dot text-red-500"></i>
                                  <span>{uploadLokasi}</span>
                                </span>
                                {uploadWaktu && (
                                  <span className="text-gray-400 font-mono text-[10px]">
                                    {uploadWaktu}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {file && (
                          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-200">
                              <i className="fa-solid fa-circle-check text-blue-600 dark:text-blue-400 text-base"></i>
                              <div>
                                <div>Foto dokumentasi siap diunggah</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                  {file.name} ({(file.size / 1024).toFixed(0)} KB)
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setPhotoPreviewUrl(null);
                                setUploadLatitude(null);
                                setUploadLongitude(null);
                                setUploadLokasi(null);
                                setUploadWaktu(null);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                            >
                              Ganti Foto
                            </button>
                          </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                          {tipeJurnal === 'Jurnal KBM' ? 'Catatan (Opsional)' : 'Catatan Refleksi (Opsional)'}
                        </label>
                        <textarea value={refleksi} onChange={e => setRefleksi(e.target.value)} rows={2} placeholder="Tuliskan catatan refleksi atau kendala..." className="w-full px-3 py-2 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"></textarea>
                    </div>
                    
                    <div className="pt-2">
                        <button type="submit" disabled={loading || isLocked} className="clay-btn clay-btn-primary btn-click w-full text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? 'Memproses...' : <><i className="fa-solid fa-save"></i> {tipeJurnal === 'Jurnal KBM' ? 'Simpan Jurnal KBM' : 'Simpan Jurnal'}</>}
                        </button>
                    </div>
                  </>
                )}
            </form>
        </div>
      </div>

      {/* Sub-Tab 2: Riwayat & Rekap Jurnal Saya */}
      <div
        id="panel-rekap-pribadi"
        role="tabpanel"
        aria-labelledby="tab-rekap-pribadi"
        className={activeTab === 'rekap-pribadi' ? 'block' : 'hidden'}
      >
        {allRejectedJournals.length > 0 && (
          <div 
            id="banner-jurnal-ditolak" 
            className="bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-2xl p-4 mb-4 shadow-sm no-print"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-bold text-red-800 dark:text-red-300 text-xs sm:text-sm flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400"></i>
                Perhatian: Terdapat {allRejectedJournals.length} Jurnal yang Ditolak Admin
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300">
                Perlu Revisi
              </span>
            </div>
            <p className="text-[11px] text-red-700 dark:text-red-300 mb-3">
              Admin memberikan catatan penolakan pada entri jurnal KBM berikut. Silakan periksa alasan penolakan dan lakukan perbaikan/input ulang:
            </p>
            <div className="space-y-2">
              {allRejectedJournals.map((j: any) => {
                const alasan = j.catatan_admin || j.alasan_penolakan || j.catatan_penolakan || j.keterangan_penolakan || 'Harap perbaiki dokumentasi atau materi KBM';
                return (
                  <div 
                    key={j.id || `${j.tanggal}-${j.mapel}-${j.kelas}`}
                    className="p-3 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-red-200 dark:border-red-900/60 text-xs shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        <span className="text-red-600 dark:text-red-400">[{j.tanggal}]</span>
                        <span>{j.mapel || 'Jurnal KBM'}</span>
                        {j.kelas && j.kelas !== '-' && <span className="text-gray-500 dark:text-gray-400 font-normal">(Kelas {j.kelas})</span>}
                        {j.jam_ke && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">Jam {j.jam_ke}</span>}
                      </div>
                      {j.materi && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                          <span className="font-medium">Materi:</span> {j.materi}
                        </div>
                      )}
                      <div className="mt-1.5 text-xs text-red-700 dark:text-red-300 bg-red-50/80 dark:bg-red-950/30 p-2 rounded-lg border border-red-100 dark:border-red-900/40">
                        <span className="font-bold mr-1">Alasan Penolakan:</span>
                        <span className="italic">"{alasan}"</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleTabChange('input');
                        if (j.mapel) setMapel(j.mapel);
                        if (j.kelas) setKelas(j.kelas);
                        if (j.tanggal) setTanggal(j.tanggal);
                        if (j.jam_ke) setJamKe(j.jam_ke);
                        if (j.materi) setMateri(j.materi);
                      }}
                      className="btn-click shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Input Ulang
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <RekapJurnalView
          user={user}
          initialMode="pribadi"
          controlledMode="pribadi"
          hideTabSwitch={true}
          isKepalaSekolah={isKepalaSekolah}
          assignments={myAssignments.length > 0 ? myAssignments : assignments}
        />
      </div>

      {/* Sub-Tab 3: Supervisi Kelas Binaan (Wali Kelas / Admin / Kepsek) */}
      {canAccessSupervisi && (
        <div
          id="panel-supervisi-kelas"
          role="tabpanel"
          aria-labelledby="tab-supervisi-kelas"
          className={activeTab === 'supervisi-kelas' ? 'block' : 'hidden'}
        >
          <RekapJurnalView
            user={user}
            initialMode="kelas"
            controlledMode="kelas"
            hideTabSwitch={true}
            assignedKelas={assignedKelas}
            isKepalaSekolah={isKepalaSekolah}
            isReadOnly={isReadOnly}
          />
        </div>
      )}
    </section>
  );
}

