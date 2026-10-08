'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { showToast, Toast } from '@/lib/toast';
import { getGuruDailyState, GuruDailyState, isJurnalMatchJadwal, getActiveSistemBlok } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaTimestamp } from '@/lib/wita';
import CameraSelfieCapture from '@/components/CameraSelfieCapture';
import { WatermarkCoordinates } from '@/lib/watermarkCanvas';

export default function GuruJurnal({ user }: { user: any }) {
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
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [piketAttendance, setPiketAttendance] = useState<Record<string, { jam: string }>>({});
  const [loading, setLoading] = useState(false);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);
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

  const isUploadAllowed = schoolModeJurnal !== 'camera_only';

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
      const saved = localStorage.getItem('sipjam_jurnal_autosave');
      if (saved) {
        const draft = JSON.parse(saved);
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
      try {
        localStorage.setItem('sipjam_jurnal_autosave', JSON.stringify(draft));
      } catch (err) {
        console.warn('[GuruJurnal] Auto-save error:', err);
      }
    } else {
      try {
        localStorage.removeItem('sipjam_jurnal_autosave');
      } catch {}
    }
  }, [
    tipeJurnal, mapel, kelas, tanggal, materi, kegiatan, catatanSiswa,
    refleksi, pertemuanKe, jamKe, tujuanPembelajaran, kehadiranMurid,
    kktp, konten, lokasiKbm, absensi
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
        else if (status === 'A') counts.A++;
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
          let mapelQuery = supabase
            .from('data_mapel')
            .select('*')
            .order('nama_mata_pelajaran', { ascending: true });
          if (user?.sekolah_id) mapelQuery = mapelQuery.eq('sekolah_id', user.sekolah_id);
          const { data: mapelData } = await mapelQuery;
          if (mapelData) {
            const formatted = mapelData.map(m => ({
              id: m.id,
              nama_mata_pelajaran: m.nama_mata_pelajaran,
              nama_mapel: m.nama_mata_pelajaran,
              kelas: m.kategori || m.nama_mata_pelajaran.split('_')[0]
            }));
            setMapelList(formatted);
            setAssignments(formatted);
          }

          let siswaQuery = supabase
            .from('data_siswa')
            .select('kelas');
          if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
          const { data: siswaData } = await siswaQuery;
          if (siswaData) {
            const uniqueKelas = [...new Set(siswaData.map(s => s.kelas).filter(Boolean))].sort();
            setKelasList(uniqueKelas as string[]);
          }
          setIsFetchingAssignments(false);
          return;
        }

        // Teacher role: query guru_mapel matching nip (user.username) or nama_guru (user.nama)
        const cleanNama = (user.nama || '').split(',')[0].trim();
        let query = supabase.from('guru_mapel').select('*');
        if (user?.sekolah_id) {
          query = query.eq('sekolah_id', user.sekolah_id);
        }
        if (user.username && cleanNama) {
          query = query.or(`nip.eq."${user.username}",nama_guru.ilike."%${cleanNama}%"`);
        } else if (user.username) {
          query = query.eq('nip', user.username);
        } else if (cleanNama) {
          query = query.ilike('nama_guru', `%${cleanNama}%`);
        }

        let { data, error } = await query.order('nama_mapel', { ascending: true });

        if (error) {
          console.error('Error fetching guru_mapel:', error);
        }
        
        // Fallback to jadwal_pelajaran if guru_mapel is empty
        if (!data || data.length === 0) {
          if (cleanNama) {
            let jdwlQuery = supabase.from('jadwal_pelajaran')
              .select('*')
              .ilike('nama_guru', `%${cleanNama}%`);
            if (user?.sekolah_id) jdwlQuery = jdwlQuery.eq('sekolah_id', user.sekolah_id);
            const { data: jadwalData } = await jdwlQuery;
              
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
              data = Array.from(uniqueMapels.values());
            }
          }
        }

        if (data && data.length > 0) {
          setAssignments(data);

          const assignedMapel = data.map(d => ({
            id: d.mapel_id || d.id,
            nama_mata_pelajaran: d.nama_mapel,
            nama_mapel: d.nama_mapel,
            kelas: d.kelas,
            mapel_singkat: d.mapel_singkat
          }));
          setMapelList(assignedMapel);
          setMyAssignments(assignedMapel); // ponytail: store for inval reset

          const assignedKelas = [...new Set(data.map(d => d.kelas).filter(Boolean))].sort();
          setKelasList(assignedKelas as string[]);

          // Auto-select if teacher only teaches 1 subject
          if (assignedMapel.length === 1) {
            setMapel(assignedMapel[0].nama_mata_pelajaran);
            setKelas(assignedMapel[0].kelas);
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
        .select('id, nama_guru, user_id')
        .eq('sekolah_id', user.sekolah_id)
        .order('nama_guru', { ascending: true });
      if (data) setAllGuruList(data.filter(g => g.nama_guru));
    };
    fetchAllGuru();
    
    // Set default date
    setTanggal(getWitaDateStr());

  }, [user?.username, user?.nama, user?.role]);

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
        const { data, error } = await supabase
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
      } else if (state.isDinasLuar) {
        setTipeJurnal('Jurnal Kegiatan');
      } else if (state.jadwalKBM && state.jadwalKBM.length > 0) {
        setTipeJurnal('Jurnal KBM');
      } else {
        setTipeJurnal('Jurnal Kegiatan');
      }
    };
    
    checkState();
  }, [user?.nama]);

  // Auto-fill mapel & kelas & jam ke- saat mapelList + dailyState sudah ready
  useEffect(() => {
    if (
      tipeJurnal !== 'Jurnal KBM' ||
      isInval ||
      isFetchingAssignments ||
      mapelList.length === 0 ||
      !dailyState?.jadwalKBM
    ) return;

    const jadwalHariIni = dailyState.jadwalKBM;
    if (jadwalHariIni.length !== 1) return; // hanya auto-fill jika tepat 1 jadwal hari ini

    const j = jadwalHariIni[0];
    const matchedMapel = mapelList.find(m => {
      const mName = (m.nama_mapel || m.nama_mata_pelajaran || '').toLowerCase();
      const jMapel = (j.mata_pelajaran || '').toLowerCase();
      return mName.includes(jMapel) || jMapel.includes(mName) || m.kelas === j.kelas;
    });
    if (matchedMapel) {
      setMapel(prev => prev || (matchedMapel.nama_mata_pelajaran || matchedMapel.nama_mapel));
      setKelas(prev => prev || (matchedMapel.kelas || j.kelas || ''));
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
        setKehadiranMurid('');
        return;
      }
      let sQuery = supabase.from('data_siswa').select('*').eq('kelas', kelas).order('nama_siswa', { ascending: true });
      if (user?.sekolah_id) sQuery = sQuery.eq('sekolah_id', user.sekolah_id);
      const { data } = await sQuery;
      if (data) {
        setStudents(data);

        // Pre-populate attendance from canonical public.absensi for this class and date
        const tgl = tanggal || getWitaDateStr();
        let aQuery = supabase.from('absensi').select('*').eq('tanggal', tgl).eq('kelas', kelas);
        if (user?.sekolah_id) aQuery = aQuery.eq('sekolah_id', user.sekolah_id);
        const { data: absData } = await aQuery;

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
            const rawJam = p.jam ? String(p.jam).trim() : '';
            const jamStr = rawJam.length > 5 ? rawJam.slice(0, 5) : rawJam;
            if (p.nisn) pMap[p.nisn] = { jam: jamStr };
            if (p.siswa_id) pMap[p.siswa_id] = { jam: jamStr };
          });
        }
        setPiketAttendance(pMap);

        const initialAbsensi: Record<string, string> = {};
        data.forEach(s => {
          const existing = absData?.find(a => a.nisn === s.nisn);
          if (existing) {
            const st = existing.status || 'Hadir';
            if (st === 'Sakit' || st === 'S') initialAbsensi[s.nisn] = 'S';
            else if (st === 'Izin' || st === 'I') initialAbsensi[s.nisn] = 'I';
            else if (st === 'Alpa' || st === 'A') initialAbsensi[s.nisn] = 'A';
            else initialAbsensi[s.nisn] = 'H';
          } else {
            initialAbsensi[s.nisn] = 'H';
          }
        });
        setAbsensi((prevAbsensi) => {
          const hasMatchingStudent = data.some(s => s.nisn && prevAbsensi && prevAbsensi[s.nisn]);
          if (hasMatchingStudent) {
            const merged = { ...initialAbsensi, ...prevAbsensi };
            setKehadiranMurid(calculateKehadiranSummary(merged, data));
            return merged;
          }
          setKehadiranMurid(calculateKehadiranSummary(initialAbsensi, data));
          return initialAbsensi;
        });
      }
    };
    fetchStudents();
  }, [kelas, tipeJurnal, tanggal, user?.sekolah_id]);

  const handleApplyPiketAttendance = () => {
    if (students.length === 0) return;
    const newAbsensi = { ...absensi };
    let syncedCount = 0;
    students.forEach(s => {
      const isPresentAtGate = (s.nisn && piketAttendance[s.nisn]) || (s.id && piketAttendance[s.id]);
      if (isPresentAtGate) {
        newAbsensi[s.nisn] = 'H';
        syncedCount++;
      }
    });
    setAbsensi(newAbsensi);
    setKehadiranMurid(calculateKehadiranSummary(newAbsensi, students));
    showToast(`Presensi piket berhasil diterapkan: ${syncedCount} siswa ditandai Hadir.`, 'success');
  };

  const handleAbsensiChange = async (nisn: string, status: string) => {
    const newAbsensi = { ...absensi, [nisn]: status };
    setAbsensi(newAbsensi);
    setKehadiranMurid(calculateKehadiranSummary(newAbsensi, students));

    // Live sync to public.absensi
    const student = students.find(s => s.nisn === nisn);
    if (student && tanggal && kelas) {
      const statusMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {
        H: 'Hadir',
        S: 'Sakit',
        I: 'Izin',
        A: 'Alpa'
      };
      const fullStatus = statusMap[status] || 'Hadir';
      const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

      const pRec = (student.nisn && piketAttendance[student.nisn]) || (student.id && piketAttendance[student.id]) || piketAttendance[nisn];
      const isTruant = status === 'A' && Boolean(pRec);

      let aQ = supabase.from('absensi').select('log_perubahan, keterangan').eq('tanggal', tanggal).eq('nisn', nisn);
      if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
      const { data: existing } = await aQ;
      const prevLogs = (existing && existing[0]?.log_perubahan) || [];

      let logEntry = `[${nowWita} WITA] Diubah ke ${fullStatus} oleh ${user?.nama || 'Guru Mapel'} (Guru Mapel)`;
      let noteKeterangan = existing && existing[0]?.keterangan ? existing[0].keterangan : null;

      if (isTruant && pRec) {
        logEntry = `[${nowWita} WITA] Terindikasi Bolos: Hadir di Gerbang Piket (${pRec.jam}), tetapi ditandai Alpa oleh ${user?.nama || 'Guru Mapel'} (${mapel || 'Mapel'})`;
        noteKeterangan = `Terindikasi Bolos (Hadir Gerbang ${pRec.jam}, Alpa Mapel)`;
      }

      supabase.from('absensi').upsert([{
        sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
        tanggal: tanggal,
        kelas: kelas,
        siswa_id: student.id,
        nisn: student.nisn,
        nama_siswa: student.nama_siswa,
        status: fullStatus,
        sumber_perubahan: 'Guru Mapel',
        diubah_oleh: user?.nama || 'Guru Mapel',
        keterangan: noteKeterangan,
        log_perubahan: [...prevLogs, logEntry],
        updated_at: new Date().toISOString()
      }], { onConflict: 'sekolah_id, tanggal, nisn' }).then(null, console.error);
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

    if (!file) {
      return showToast('Foto Dokumentasi Wajib', 'Silakan ambil foto dokumentasi pembelajaran menggunakan kamera atau unggah dari galeri.', 'warning');
    }

    setLoading(true);

    let fileUrl = '';
    try {
      const compressedFile = await compressImageWithCanvas(file);
      fileUrl = await uploadToDrive(compressedFile, user.nama, tipeJurnal, 'Jurnal');
    } catch (err: any) {
      setLoading(false);
      return showToast('Gagal Upload', err.message, 'error');
    }

    const computedKehadiran = tipeJurnal === 'Jurnal KBM'
      ? (kehadiranMurid || calculateKehadiranSummary(absensi, students))
      : 'Hadir';

    const finalKonten = tipeJurnal === 'Jurnal KBM' ? konten : materi;

    // ponytail: prefix keterangan with INVAL marker — no schema change needed
    const invalPrefix = isInval && guruDigantikan
      ? `[INVAL - Menggantikan: ${guruDigantikan.nama}] `
      : '';

    const newJurnal = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      nama_guru: user.nama,
      user_id: user.id,
      mapel: tipeJurnal === 'Jurnal KBM' ? mapel : '-',
      kelas: tipeJurnal === 'Jurnal KBM' ? kelas : '-',
      tanggal: tanggal,
      materi: finalKonten,
      kegiatan: kegiatan,
      absensi_siswa: JSON.stringify(absensi),
      keterangan: `${invalPrefix}${tipeJurnal}`,
      refleksi: refleksi,
      detail_absen: '',
      link_bukti_foto: fileUrl,
      status_verifikasi: 'Menunggu',
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

      const { error } = await supabase.from('jurnal_pembelajaran').insert([newJurnal]);

      if (error) {
        showToast('Error', 'Gagal menyimpan jurnal', 'error');
      } else {
        // Sync student attendance to canonical public.absensi
        if (tipeJurnal === 'Jurnal KBM' && students.length > 0) {
          try {
            const statusMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {
              H: 'Hadir',
              S: 'Sakit',
              I: 'Izin',
              A: 'Alpa'
            };
            const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

            let aQ = supabase.from('absensi').select('nisn, log_perubahan').eq('tanggal', tanggal).eq('kelas', kelas);
            if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
            const { data: existingAbs } = await aQ;
            const existingMap = new Map(existingAbs?.map(a => [a.nisn, a.log_perubahan || []]));

            const absensiRows = students.map(s => {
              const statusCode = absensi[s.nisn] || 'H';
              const fullStatus = statusMap[statusCode] || 'Hadir';
              const prevLogs = existingMap.get(s.nisn) || [];
              const logEntry = `[${nowWita} WITA] Diubah ke ${fullStatus} oleh ${user.nama} (Guru Mapel)`;

              return {
                sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
                tanggal: tanggal,
                kelas: kelas,
                siswa_id: s.id,
                nisn: s.nisn,
                nama_siswa: s.nama_siswa,
                status: fullStatus,
                sumber_perubahan: 'Guru Mapel',
                diubah_oleh: user.nama,
                log_perubahan: [...prevLogs, logEntry],
                updated_at: new Date().toISOString()
              };
            });

            await supabase.from('absensi').upsert(absensiRows, { onConflict: 'sekolah_id, tanggal, nisn' });
          } catch (syncErr) {
            console.error('Error synchronizing attendance to public.absensi:', syncErr);
          }
        }

        showToast('Berhasil', 'Jurnal berhasil disimpan dan presensi disinkronkan!', 'success', {
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false,
        });
        try {
          localStorage.removeItem('sipjam_jurnal_autosave');
        } catch {}
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
        setMapelList(myAssignments);
        setAssignments(myAssignments);
        const origKelas = [...new Set(myAssignments.map(m => m.kelas).filter(Boolean))].sort() as string[];
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
      return showToast('Error', 'Gagal menyimpan jurnal: ' + (err as any).message, 'error');
    }
  };

  // --- Guru Inval Handlers ---
  const handleInvalToggle = (checked: boolean) => {
    setIsInval(checked);
    if (!checked) {
      // Restore original teacher assignments
      setGuruDigantikan(null);
      setMapelList(myAssignments);
      const origKelas = [...new Set(myAssignments.map(m => m.kelas).filter(Boolean))].sort() as string[];
      setKelasList(origKelas);
      setAssignments(myAssignments);
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

    // Fetch jadwal of the selected guru
    let gmQuery = supabase
      .from('guru_mapel')
      .select('*')
      .eq('guru_id', guruId);
    if (user?.sekolah_id) gmQuery = gmQuery.eq('sekolah_id', user.sekolah_id);
    const { data } = await gmQuery.order('nama_mapel', { ascending: true });

    if (data && data.length > 0) {
      const mapels = data.map(d => ({
        id: d.mapel_id || d.id,
        nama_mata_pelajaran: d.nama_mapel,
        nama_mapel: d.nama_mapel,
        kelas: d.kelas,
        mapel_singkat: d.mapel_singkat,
      }));
      setMapelList(mapels);
      setAssignments(data);
      const kelas = [...new Set(data.map(d => d.kelas).filter(Boolean))].sort() as string[];
      setKelasList(kelas);
    } else {
      setMapelList([]);
      setAssignments([]);
      setKelasList([]);
    }
  };

  const handleMapelChange = (val: string) => {
    setMapel(val);
    // Cascading auto-sync: automatically set corresponding class
    const matched = assignments.find(
      a => (a.nama_mapel === val || a.nama_mata_pelajaran === val)
    );
    if (matched && matched.kelas) {
      setKelas(matched.kelas);
    } else {
      const prefix = val.split('_')[0];
      if (prefix && kelasList.includes(prefix)) {
        setKelas(prefix);
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

  return (
    <section id="view-guru-jurnal" className="view-section fade-in">
        <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <i className="fa-solid fa-book-journal-whills text-blue-500 dark:text-blue-400"></i> Form Jurnal
            </h2>

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
                    Jadwal KBM reguler ditiadakan sementara dan digantikan oleh kegiatan khusus ini. Anda hanya perlu mengisi form <strong>Jurnal Kegiatan</strong> di bawah ini (tidak perlu mengisi jurnal absensi kelas reguler).
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
                    <select value={tipeJurnal} disabled className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed">
                        <option value={tipeJurnal}>{tipeJurnal} {dateBlok ? `(Sistem Blok: ${dateBlok.nama_kegiatan})` : dailyState?.isDinasLuar ? '(Dinas Luar)' : ''}</option>
                    </select>
                    <p className="text-[9px] text-gray-500 dark:text-white/80 mt-1 italic ml-1">Jenis jurnal diatur otomatis oleh sistem berdasarkan jadwal Anda.</p>
                </div>

                {/* {tipeJurnal === 'Jurnal KBM' && ( Pertemuan Ke- Kehadiran Murid ) */}
                {tipeJurnal === 'Jurnal KBM' ? (
                  <>
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

                    {/* 7. Mapel & 8. Kelas */}
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
                            {mapelList.map(m => (
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
                            {kelasList.map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* 9. Absensi Murid */}
                    <div className="space-y-3">
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
                          return Boolean(pRec && absensi[s.nisn] === 'A');
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
                              <h3 className="text-[11px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <i className="fa-solid fa-users text-blue-500 dark:text-blue-400"></i> Live Absensi Kelas {kelas}
                              </h3>
                              <button
                                type="button"
                                onClick={handleApplyPiketAttendance}
                                className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1.5 transition self-start sm:self-auto"
                                title="Tandai siswa yang sudah presensi di gerbang piket sebagai Hadir"
                              >
                                <i className="fa-solid fa-wand-magic-sparkles text-[9px]"></i> Terapkan Presensi Piket
                              </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll pr-1">
                              {students.map((siswa, idx) => {
                                const pRec = (siswa.nisn && piketAttendance[siswa.nisn]) || (siswa.id && piketAttendance[siswa.id]);
                                const isTruant = Boolean(pRec && absensi[siswa.nisn] === 'A');
                                return (
                                  <div key={siswa.nisn} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-[10px] font-bold text-gray-500 dark:text-white/80 w-4 shrink-0">{idx + 1}.</span>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-bold text-gray-900 dark:text-white">{siswa.nama_siswa}</span>
                                          {isTruant && pRec ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 shrink-0 animate-pulse">
                                              <i className="fa-solid fa-triangle-exclamation text-[8px]"></i> ⚠️ Terindikasi Bolos (Hadir Gerbang {pRec.jam}, Alpa Mapel)
                                            </span>
                                          ) : pRec ? (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                                              <i className="fa-solid fa-check text-[8px]"></i> ✓ Hadir di Sekolah (Piket {pRec.jam})
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shrink-0">
                                              <i className="fa-solid fa-clock text-[8px]"></i> Belum Presensi Piket
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[9px] text-gray-500 dark:text-white/80">{siswa.nisn}</div>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      {['H', 'S', 'I', 'A'].map(status => (
                                        <button 
                                          key={status}
                                          type="button"
                                          onClick={() => handleAbsensiChange(siswa.nisn, status)}
                                          className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${
                                            absensi[siswa.nisn] === status 
                                            ? (status === 'H' ? 'bg-green-500 text-white shadow-sm' : 
                                               status === 'S' ? 'bg-blue-500 text-white shadow-sm' : 
                                               status === 'I' ? 'bg-orange-500 text-white shadow-sm' : 
                                               'bg-red-500 text-white shadow-sm') 
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                          }`}
                                        >
                                          {status}
                                        </button>
                                      ))}
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
                
                <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-camera text-blue-600 dark:text-blue-400"></i>
                        {tipeJurnal === 'Jurnal KBM' ? 'Dokumentasi KBM' : 'Foto Dokumentasi Kegiatan'}{' '}
                        {isUploadAllowed ? (
                          <span className="text-gray-500 dark:text-gray-400 font-normal">(Kamera Lanskap / Upload Galeri)</span>
                        ) : (
                          <span className="text-red-500 dark:text-red-400 font-normal">(Wajib Kamera Lanskap Langsung)</span>
                        )}
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        {file ? '✓ Foto Terpasang' : uploadMode === 'camera' || !isUploadAllowed ? 'Kamera Aktif' : 'Galeri Aktif'}
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
                          <i className="fa-solid fa-images"></i> Upload Galeri / File
                        </button>
                      </div>
                    )}

                    {/* Camera view (if not allowed or camera mode selected) */}
                    {(!isUploadAllowed || uploadMode === 'camera') && (
                      <CameraSelfieCapture
                        key={`cam-jurnal-${tipeJurnal}`}
                        orientation="landscape"
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
                    <button type="submit" disabled={loading || isLocked} className="btn-click w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? 'Memproses...' : <><i className="fa-solid fa-save"></i> Simpan Jurnal</>}
                    </button>
                </div>
            </form>
        </div>
    </section>
  );
}

