'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast, Toast } from '@/lib/toast';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaTimestamp, getWitaDayName, getWitaDateStr } from '@/lib/wita';
import CameraSelfieCapture from '@/components/CameraSelfieCapture';
import { WatermarkCoordinates, dataUrlToFile } from '@/lib/watermarkCanvas';

export default function GuruPresensi({ user }: { user: any }) {
  const isMountedRef = useRef(true);
  const isSwitchingRef = useRef(false);
  const isSyncingRef = useRef(false);

  // ponytail: native canvas image compression for localStorage offline queue
  const compressPhotoForStorage = async (fileOrDataUrl: File | Blob | string, maxDim = 800, quality = 0.6): Promise<string> => {
    if (typeof window === 'undefined') return typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '';
    return new Promise((resolve) => {
      try {
        const img = new Image();
        let srcUrl = '';
        if (typeof fileOrDataUrl === 'string') {
          srcUrl = fileOrDataUrl;
        } else if (fileOrDataUrl instanceof File || (typeof Blob !== 'undefined' && fileOrDataUrl instanceof Blob)) {
          srcUrl = URL.createObjectURL(fileOrDataUrl);
        } else {
          return resolve('');
        }

        img.onload = () => {
          try {
            if (typeof fileOrDataUrl !== 'string') URL.revokeObjectURL(srcUrl);
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : srcUrl);
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch {
            resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
          }
        };
        img.onerror = () => {
          if (typeof fileOrDataUrl !== 'string') URL.revokeObjectURL(srcUrl);
          resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
        };
        img.src = srcUrl;
      } catch {
        resolve(typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
      }
    });
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [tipeAbsen, setTipeAbsen] = useState('Datang');
  const [jenisPresensi, setJenisPresensi] = useState('Sekolah');
  const [detailIzin, setDetailIzin] = useState('Sakit');
  const [keterangan, setKeterangan] = useState('');
  const [durasiHari, setDurasiHari] = useState(1);
  const [tanggalMulai, setTanggalMulai] = useState(getWitaDateStr());
  const [tanggalSelesai, setTanggalSelesai] = useState(getWitaDateStr());

  const addDaysToDateStr = (dateStr: string, days: number): string => {
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
  };

  const getDaysBetween = (startStr: string, endStr: string): number => {
    try {
      const [y1, m1, d1] = startStr.split('-').map(Number);
      const [y2, m2, d2] = endStr.split('-').map(Number);
      const dt1 = new Date(y1, m1 - 1, d1);
      const dt2 = new Date(y2, m2 - 1, d2);
      const diffTime = dt2.getTime() - dt1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(1, diffDays + 1);
    } catch {
      return 1;
    }
  };

  const handleDurasiChange = (val: number) => {
    const durasi = Math.max(1, val);
    setDurasiHari(durasi);
    setTanggalSelesai(addDaysToDateStr(tanggalMulai, durasi - 1));
  };

  const handleTanggalMulaiChange = (newStart: string) => {
    setTanggalMulai(newStart);
    setTanggalSelesai(addDaysToDateStr(newStart, durasiHari - 1));
  };

  const handleTanggalSelesaiChange = (newEnd: string) => {
    // Guard against inverted selection: clamp to tanggalMulai if newEnd < tanggalMulai
    const effectiveEnd = (newEnd && newEnd < tanggalMulai) ? tanggalMulai : newEnd;
    setTanggalSelesai(effectiveEnd);
    const days = getDaysBetween(tanggalMulai, effectiveEnd);
    setDurasiHari(days);
  };

  const memerlukanPersetujuanAdmin = (detailIzin === 'Sakit' && durasiHari >= 3) || (jenisPresensi === 'Izin' && durasiHari > 3);
  const [file, setFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [lokasi, setLokasi] = useState('Mendeteksi lokasi...');
  const [userCoords, setUserCoords] = useState<WatermarkCoordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsConfig, setGpsConfig] = useState({ lat: -6.200000, lng: 106.816666, radius: 100 });
  const [jarakAktual, setJarakAktual] = useState<number | null>(null);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);

  const [jamPresensi, setJamPresensi] = useState({
    datangMulai: '06:00',
    datangBatas: '07:15',
    datangAkhir: '08:00',
    pulangMulai: '11:00',
    pulangJumat: '11:00',
    pulangAkhir: '22:00',
  });

  // Haversine formula
  const getDistanceFromLatLonInM = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return Math.round(R * c * 1000);
  };

  const fetchLocation = (config: any) => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setLokasi('Mendeteksi GPS...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserCoords({ latitude: lat, longitude: lng });
          setLokasi(`GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          
          const jarak = getDistanceFromLatLonInM(lat, lng, config.lat, config.lng);
          setJarakAktual(jarak);
        },
        (error) => {
          setLokasi('Gagal mendapatkan GPS. Pastikan izin lokasi aktif.');
          console.error(error);
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLokasi('Browser tidak mendukung GPS');
    }
  };

  // Fetch Supabase Config & State
  useEffect(() => {
    const initConfig = async () => {
      const { data } = await supabase.from('pengaturan').select('*').in('key', ['gps_lat', 'gps_lng', 'gps_radius', 'jam_datang_mulai', 'jam_datang_batas', 'jam_datang_akhir', 'jam_pulang_mulai', 'jam_pulang_jumat', 'jam_pulang_akhir']);
      let newConfig = { lat: -6.200000, lng: 106.816666, radius: 100 };
      let newJam = { ...jamPresensi };
      if (data) {
        data.forEach((item: any) => {
          if (item.key === 'gps_lat') newConfig.lat = parseFloat(item.value);
          if (item.key === 'gps_lng') newConfig.lng = parseFloat(item.value);
          if (item.key === 'gps_radius') newConfig.radius = parseInt(item.value, 10);
          if (item.key === 'jam_datang_mulai') newJam.datangMulai = item.value;
          if (item.key === 'jam_datang_batas') newJam.datangBatas = item.value;
          if (item.key === 'jam_datang_akhir') newJam.datangAkhir = item.value;
          if (item.key === 'jam_pulang_mulai') newJam.pulangMulai = item.value;
          if (item.key === 'jam_pulang_jumat') newJam.pulangJumat = item.value;
          if (item.key === 'jam_pulang_akhir') newJam.pulangAkhir = item.value;
        });
        setGpsConfig(newConfig);
        setJamPresensi(newJam);
      }
      fetchLocation(newConfig);

      const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
      setDailyState(state);
      if (state.presensiDatangDitolak) {
        setTipeAbsen('Datang');
        setJenisPresensi(state.presensiDatangDitolak.jenis_presensi || 'Sekolah');
      } else if (state.presensiDatang && (!state.presensiPulang || state.presensiPulangDitolak)) {
        setTipeAbsen('Pulang');
        if (state.isDinasLuar) {
          setJenisPresensi('Dinas Luar');
        } else {
          setJenisPresensi(state.presensiPulangDitolak?.jenis_presensi || 'Sekolah');
        }
      }
    };
    initConfig();
  }, [user.nama, user.username]);

  // ponytail: sync queued offline presensi records on reconnect
  const syncOfflinePresensi = async () => {
    if (typeof window === 'undefined' || isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const queueStr = localStorage.getItem('sipjam_offline_presensi_queue') || localStorage.getItem('sipjam_offline_presensi');
      if (!queueStr) return;

      let items: any[] = [];
      try {
        const parsed = JSON.parse(queueStr);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        localStorage.removeItem('sipjam_offline_presensi_queue');
        const fallbackSingle = localStorage.getItem('sipjam_offline_presensi');
        if (fallbackSingle) {
          try {
            const singleParsed = JSON.parse(fallbackSingle);
            items = Array.isArray(singleParsed) ? singleParsed : [singleParsed];
          } catch {
            localStorage.removeItem('sipjam_offline_presensi');
          }
        }
        if (items.length === 0) return;
      }
      if (items.length === 0) return;

      const remaining: any[] = [];
      let syncedCount = 0;

      for (const item of items) {
        try {
          let sent = false;
          const { error } = await supabase.from('presensi_guru').insert([item.payload]);
          if (!error) {
            sent = true;
          } else if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
            // Already stored in database during previous network attempt
            sent = true;
          } else {
            const fallbackRes = await fetch('/api/attendance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            });
            if (fallbackRes.ok) {
              const resData = await fallbackRes.json();
              if (resData.success || resData.message?.includes('duplicate') || resData.message?.includes('already')) {
                sent = true;
              }
            }
          }

          if (sent) {
            syncedCount++;
            if (item.photo) {
              (async () => {
                try {
                  const fileObj = dataUrlToFile(item.photo, item.photoName || 'selfie.jpg');
                  const targetFolder = item.folderName || (item.payload?.jenis_presensi === 'Dinas Luar' ? 'Presensi_DinasLuar' : 'Presensi_Guru');
                  const targetPrefix = item.prefix || (item.isSelfie ? 'Selfie' : 'Dokumen');
                  const teacherName = item.payload?.nama_guru || user?.nama || 'Guru';
                  const driveUrl = await uploadToDrive(fileObj, teacherName, targetFolder, targetPrefix);
                  await supabase.from('presensi_guru').update({ link_bukti: driveUrl }).eq('id', item.id);
                } catch (e) {
                  console.warn('[GuruPresensi] Background GAS upload failed for offline presensi:', e);
                }
              })();
            }
          } else {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }

      if (syncedCount > 0) {
        try {
          if (remaining.length === 0) {
            localStorage.removeItem('sipjam_offline_presensi');
            localStorage.removeItem('sipjam_offline_presensi_queue');
          } else {
            localStorage.setItem('sipjam_offline_presensi', JSON.stringify(remaining[0]));
            localStorage.setItem('sipjam_offline_presensi_queue', JSON.stringify(remaining));
          }
        } catch (storageErr) {
          console.warn('[GuruPresensi] Failed updating offline queue in localStorage after sync:', storageErr);
        }

        showToast(
          'Presensi Tersinkron!',
          `${syncedCount} data presensi offline berhasil dikirim ke server.`,
          'success',
          { toast: true, position: 'top-end', timer: 4000, showConfirmButton: false }
        );

        try {
          const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
          if (isMountedRef.current) setDailyState(state);
        } catch {}
      }
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      syncOfflinePresensi();
    };
    window.addEventListener('online', handleOnline);
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      syncOfflinePresensi();
    }
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user?.nama, user?.username, user?.id, user?.sekolah_id]);

  const togglePresensiFields = async (val: string) => {
    if (isSwitchingRef.current) return;

    const requiresDocumentNew = val === 'Izin' || val === 'Dinas Luar';
    const requiresDocumentOld = jenisPresensi === 'Izin' || jenisPresensi === 'Dinas Luar';

    // If teacher has a live selfie attached and attempts to switch to a document upload mode
    if (file && requiresDocumentNew && !requiresDocumentOld) {
      isSwitchingRef.current = true;
      try {
        const result = await Swal.fire({
          title: 'Ganti Jenis Presensi?',
          text: `Foto selfie yang telah diambil tidak dapat digunakan sebagai lampiran ${val}. Hapus foto selfie?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#10B981',
          cancelButtonColor: '#6B7280',
          confirmButtonText: 'Ya, Ganti',
          cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) {
          return;
        }
        setFile(null);
        setPhotoPreviewUrl(null);
      } finally {
        isSwitchingRef.current = false;
      }
    }
    // If teacher attached a document and attempts to switch to a camera selfie mode
    else if (file && !requiresDocumentNew && requiresDocumentOld) {
      isSwitchingRef.current = true;
      try {
        const result = await Swal.fire({
          title: 'Ganti Jenis Presensi?',
          text: 'File dokumen tidak dapat digunakan sebagai foto selfie. Hapus file?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#10B981',
          cancelButtonColor: '#6B7280',
          confirmButtonText: 'Ya, Ganti',
          cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) {
          return;
        }
        setFile(null);
        setPhotoPreviewUrl(null);
      } finally {
        isSwitchingRef.current = false;
      }
    }
    // Switching between modes of the same type (e.g. Sekolah <-> Terlambat, Izin <-> Dinas Luar) preserves the attachment seamlessly without prompt
    setJenisPresensi(val);
  };

  const handleTipeAbsenChange = async (val: string) => {
    if (isSwitchingRef.current) return;

    let nextJenisPresensi = jenisPresensi;
    if (val === 'Pulang') {
      nextJenisPresensi = dailyState?.isDinasLuar ? 'Dinas Luar' : 'Sekolah';
    } else {
      if (jenisPresensi !== 'Izin' && jenisPresensi !== 'Dinas Luar') {
        nextJenisPresensi = 'Sekolah';
      }
    }

    const requiresDocumentNew = nextJenisPresensi === 'Izin' || nextJenisPresensi === 'Dinas Luar';
    const requiresDocumentOld = jenisPresensi === 'Izin' || jenisPresensi === 'Dinas Luar';

    if (file && !requiresDocumentNew && requiresDocumentOld) {
      isSwitchingRef.current = true;
      try {
        const result = await Swal.fire({
          title: 'Ganti ke Presensi Pulang?',
          text: 'File dokumen yang telah dilampirkan tidak dapat digunakan sebagai foto selfie. Hapus file?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#10B981',
          cancelButtonColor: '#6B7280',
          confirmButtonText: 'Ya, Ganti',
          cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) {
          return;
        }
        setFile(null);
        setPhotoPreviewUrl(null);
      } finally {
        isSwitchingRef.current = false;
      }
    } else if (file && requiresDocumentNew && !requiresDocumentOld) {
      isSwitchingRef.current = true;
      try {
        const result = await Swal.fire({
          title: 'Ganti Tipe Absen?',
          text: 'Foto selfie tidak dapat digunakan sebagai lampiran dokumen. Hapus foto selfie?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#10B981',
          cancelButtonColor: '#6B7280',
          confirmButtonText: 'Ya, Ganti',
          cancelButtonText: 'Batal',
        });
        if (!result.isConfirmed) {
          return;
        }
        setFile(null);
        setPhotoPreviewUrl(null);
      } finally {
        isSwitchingRef.current = false;
      }
    }

    setTipeAbsen(val);
    setJenisPresensi(nextJenisPresensi);
  };

  // Determine if selfie camera is required
  // Required for:
  // 1. Hadir di Sekolah (Datang & Pulang)
  // 2. Terlambat / Izin Terlambat
  // Dinas Luar and Izin/Sakit require file upload instead.
  const isSelfieRequired = jenisPresensi === 'Sekolah' || jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat';

  const handlePresensiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Workflow Pulang
    if (tipeAbsen === 'Pulang') {
      if (dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak) {
        return showToast('Info', 'Anda sudah melakukan Presensi Pulang hari ini.', 'info');
      }
      if (dailyState && !dailyState.canPresensiPulang) {
        return showToast('Terkunci', dailyState.lockedReason || 'Anda belum menyelesaikan Jurnal/Piket.', 'error');
      }
      if (dailyState?.isIzinSakit) {
        return showToast('Info', 'Anda sedang Izin/Sakit hari ini, tidak perlu melakukan presensi pulang.', 'info');
      }
    }

    // Validasi Workflow Datang - kecualikan jika presensi sebelumnya DITOLAK (perlu isi ulang)
    if (tipeAbsen === 'Datang' && dailyState?.presensiDatang && !dailyState?.presensiDatangDitolak) {
      return showToast('Info', 'Anda sudah melakukan Presensi Datang hari ini.', 'info');
    }

    // Validasi Wajib Selfie jika dipersyaratkan
    if (isSelfieRequired && !file) {
      return showToast(
        'Foto Kamera Diperlukan',
        'Silakan ambil dan konfirmasi foto langsung dari kamera perangkat dengan watermark terlebih dahulu.',
        'warning'
      );
    }

    // Validasi File Bukti (Izin / Dinas Luar)
    if (!isSelfieRequired && !file) {
      const docType = jenisPresensi === 'Dinas Luar' ? 'surat tugas' : 'surat keterangan izin/sakit';
      return showToast(
        'Lampiran Wajib',
        `Silakan lampirkan ${docType}.`,
        'warning'
      );
    }

    // Validasi Waktu Presensi (dinormalisasi ke WITA / Asia/Makassar)
    const now = new Date();
    const witaParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(now);

    const currH = parseInt(witaParts.find(p => p.type === 'hour')?.value || '0', 10);
    const currM = parseInt(witaParts.find(p => p.type === 'minute')?.value || '0', 10);
    const currS = parseInt(witaParts.find(p => p.type === 'second')?.value || '0', 10);
    const currTimeVal = currH * 60 + currM;

    const parseTime = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    let keterlambatanDetik = 0;
    const isTerlambat = jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat';

    if (tipeAbsen === 'Datang') {
      const startVal = parseTime(jamPresensi.datangMulai);
      const batasVal = parseTime(jamPresensi.datangBatas);
      const akhirVal = parseTime(jamPresensi.datangAkhir);

      if (currTimeVal < startVal) {
        return showToast('Belum Waktunya', `Presensi datang baru dibuka jam ${jamPresensi.datangMulai} WITA.`, 'warning');
      }
      if (currTimeVal > akhirVal && !isTerlambat) {
        return showToast('Ditutup', `Presensi datang sudah ditutup jam ${jamPresensi.datangAkhir} WITA. Silakan hubungi admin.`, 'error');
      }

      if (currTimeVal > batasVal && (jenisPresensi === 'Sekolah' || isTerlambat)) {
        const currTotalSeconds = currH * 3600 + currM * 60 + currS;
        const batasTotalSeconds = batasVal * 60;
        keterlambatanDetik = Math.max(0, currTotalSeconds - batasTotalSeconds);
      }
    } else if (tipeAbsen === 'Pulang') {
      const isJumat = getWitaDayName(now) === 'Jumat';
      const effectivePulangMulai = isJumat ? (jamPresensi.pulangJumat || jamPresensi.pulangMulai) : jamPresensi.pulangMulai;
      const startVal = parseTime(effectivePulangMulai);
      const akhirVal = parseTime(jamPresensi.pulangAkhir);

      if (currTimeVal < startVal) {
        return showToast('Belum Waktunya', `Presensi pulang baru dibuka jam ${effectivePulangMulai} WITA${isJumat ? ' (Jadwal Khusus Hari Jumat)' : ''}.`, 'warning');
      }
      if (currTimeVal > akhirVal) {
        return showToast('Ditutup', `Presensi pulang ditutup jam ${jamPresensi.pulangAkhir} WITA.`, 'error');
      }
    }

    setLoading(true);
    
    if (jenisPresensi === 'Sekolah' && jarakAktual !== null && jarakAktual > gpsConfig.radius) {
      showToast('Di Luar Jangkauan', `Jarak Anda ${jarakAktual} meter dari sekolah. Maksimal radius adalah ${gpsConfig.radius} meter. Presensi akan masuk antrean verifikasi Admin.`, 'warning');
    }

    const statusVerif = isTerlambat
      ? 'Menunggu' // Izin Terlambat always requires admin verification
      : (jenisPresensi === 'Sekolah' && (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Diverifikasi' : 'Menunggu');
    const presensiId = crypto.randomUUID();

    // Non-blocking Asynchronous GAS Upload:
    // 1. Immediately insert presensi record into Supabase
    // 2. Show instant UI feedback without waiting for GAS
    // 3. Fire background uploadToDrive and update link_bukti upon completion
    const newPresensi: any = {
      id: presensiId,
      timestamp: getWitaTimestamp(),
      nama_guru: user.nama,
      user_id: user.id,
      tipe_absen: tipeAbsen,
      jenis_presensi: jenisPresensi,
      detail_izin: jenisPresensi === 'Izin' ? detailIzin : (isTerlambat ? (keterangan || 'Izin Datang Terlambat') : ''),
      durasi_hari: jenisPresensi === 'Izin' ? durasiHari : 1,
      tanggal_mulai: jenisPresensi === 'Izin' ? tanggalMulai : getWitaDateStr(),
      tanggal_selesai: jenisPresensi === 'Izin' ? tanggalSelesai : getWitaDateStr(),
      memerlukan_persetujuan_admin: jenisPresensi === 'Izin' ? memerlukanPersetujuanAdmin : false,
      is_auto_checkout: false,
      lokasi: lokasi,
      jarak: jarakAktual !== null ? `${jarakAktual} m` : 'Unknown',
      link_bukti: file ? 'pending:uploading' : '',
      status_verifikasi: statusVerif,
      keterlambatan_detik: keterlambatanDetik,
      latitude: userCoords?.latitude || null,
      longitude: userCoords?.longitude || null,
    };
    if (user?.sekolah_id) {
      newPresensi.sekolah_id = user.sekolah_id;
    }

    let insertSuccess = false;
    let insertErrorMsg = '';
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (!isOffline) {
      try {
        const { error } = await supabase.from('presensi_guru').insert([newPresensi]);
        if (!error) {
          insertSuccess = true;
        } else {
          insertErrorMsg = error.message;
        }
      } catch (netErr: any) {
        insertErrorMsg = netErr.message || 'Koneksi jaringan terputus';
      }

      // Fallback: If client direct insert fails (e.g. temporary network drop or client RLS issue), try server route
      if (!insertSuccess) {
        try {
          const fallbackRes = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPresensi)
          });
          if (fallbackRes.ok) {
            const resData = await fallbackRes.json();
            if (resData.success) {
              insertSuccess = true;
            } else {
              insertErrorMsg = resData.message || insertErrorMsg;
            }
          }
        } catch (fallbackErr: any) {
          insertErrorMsg = fallbackErr.message || insertErrorMsg;
        }
      }
    }

    if (!insertSuccess) {
      // Offline fallback: catch network error / offline status and queue in localStorage
      try {
        let photoDataUrl = '';
        if (photoPreviewUrl) {
          photoDataUrl = await compressPhotoForStorage(photoPreviewUrl);
        } else if (file) {
          if (file.type === 'application/pdf') {
            if (file.size <= 500 * 1024) {
              photoDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string) || '');
                reader.onerror = () => resolve('');
                reader.readAsDataURL(file);
              });
            }
          } else {
            photoDataUrl = await compressPhotoForStorage(file);
          }
        }

        const offlineItem = {
          id: presensiId,
          payload: newPresensi,
          photo: photoDataUrl || null,
          photoName: file?.name || 'selfie.jpg',
          isSelfie: isSelfieRequired,
          folderName: jenisPresensi === 'Dinas Luar' ? 'Presensi_DinasLuar' : 'Presensi_Guru',
          prefix: isSelfieRequired ? 'Selfie' : 'Dokumen',
          timestamp: new Date().toISOString()
        };

        const saveToLocalStorage = (itemToSave: any) => {
          localStorage.setItem('sipjam_offline_presensi', JSON.stringify(itemToSave));
          const rawQueue = localStorage.getItem('sipjam_offline_presensi_queue');
          let queue: any[] = [];
          try {
            if (rawQueue) queue = JSON.parse(rawQueue);
            if (!Array.isArray(queue)) queue = [];
          } catch {
            queue = [];
          }
          const existingIdx = queue.findIndex((q: any) => q.id === itemToSave.id);
          if (existingIdx >= 0) {
            queue[existingIdx] = itemToSave;
          } else {
            queue.push(itemToSave);
          }
          localStorage.setItem('sipjam_offline_presensi_queue', JSON.stringify(queue));
        };

        try {
          saveToLocalStorage(offlineItem);
        } catch (quotaErr) {
          // If storage quota exceeded, retry saving without the heavy photo data URL to ensure attendance record is never lost
          console.warn('[GuruPresensi] Quota exceeded, preserving presensi record without photo:', quotaErr);
          const itemWithoutPhoto = { ...offlineItem, photo: null };
          saveToLocalStorage(itemWithoutPhoto);
        }

        showToast(
          'Tersimpan Offline',
          'Koneksi internet terputus. Data presensi dan foto disimpan di perangkat dan akan dikirim otomatis saat koneksi kembali.',
          'info',
          { toast: true, position: 'top-end', timer: 4000, showConfirmButton: false }
        );

        setJenisPresensi('Sekolah');
        setKeterangan('');
        setFile(null);
        setPhotoPreviewUrl(null);
        setLoading(false);
        return;
      } catch (offlineErr) {
        console.error('Failed saving to localStorage offline fallback:', offlineErr);
        setLoading(false);
        return showToast('Error', 'Gagal menyimpan data presensi. Periksa koneksi internet Anda: ' + insertErrorMsg, 'error');
      }
    }

    // If this was a re-submission after rejection, delete the old rejected record
    const rejectedRecord = tipeAbsen === 'Datang' ? dailyState?.presensiDatangDitolak : dailyState?.presensiPulangDitolak;
    if (rejectedRecord?.id) {
      await supabase.from('presensi_guru').delete().eq('id', rejectedRecord.id);
    }

    // Keep references for background upload task
    const fileToUpload = file;
    const currentTeacher = user.nama;
    const isSelfie = isSelfieRequired;
    const currentJenis = jenisPresensi;

    // Instant UI Success Feedback (Non-blocking Toast)
    showToast(
      'Presensi Berhasil Dicatat!',
      fileToUpload 
        ? 'Data kehadiran tersimpan. Foto sedang diunggah ke Google Drive di latar belakang.' 
        : 'Presensi berhasil direkam!',
      'success',
      { toast: true, position: 'top-end', timer: 3000, showConfirmButton: false }
    );

    // Reset Form & Update local states immediately
    setJenisPresensi('Sekolah');
    setKeterangan('');
    setFile(null);
    setPhotoPreviewUrl(null);
    
    // Refresh workflow state
    const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
    if (!isMountedRef.current) return;
    setDailyState(state);
    if (tipeAbsen === 'Datang') {
      setTipeAbsen('Pulang');
      if (state.isDinasLuar) {
        setJenisPresensi('Dinas Luar');
      }
    }
    setLoading(false);

    // Fire background upload to GAS webhook asynchronously
    if (fileToUpload) {
      (async () => {
        try {
          const folderName = currentJenis === 'Dinas Luar' ? 'Presensi_DinasLuar' : 'Presensi_Guru';
          const prefix = isSelfie ? 'Selfie' : 'Dokumen';
          const driveUrl = await uploadToDrive(fileToUpload, currentTeacher, folderName, prefix);
          
          await supabase
            .from('presensi_guru')
            .update({ link_bukti: driveUrl })
            .eq('id', presensiId);

          console.log(`[GuruPresensi] Background GAS upload complete for presensi ${presensiId}:`, driveUrl);
        } catch (uploadErr: any) {
          console.error(`[GuruPresensi] Background GAS upload failed for presensi ${presensiId}:`, uploadErr);
          await supabase
            .from('presensi_guru')
            .update({ link_bukti: 'gagal_upload' })
            .eq('id', presensiId);
          showToast('Sinkronisasi Tertunda', 'Foto tersimpan di database lokal namun gagal diunggah ke Google Drive.', 'warning');
        }
      })();
    }
  };

  const isPulangLocked = tipeAbsen === 'Pulang' && dailyState && !dailyState.canPresensiPulang;

  // Pulang options for Multi-State Transitions:
  // Teachers can select between "Hadir di Sekolah" and "Dinas Luar" when checking out,
  // supporting all 4 state transitions ("Hadir di Sekolah" <-> "Dinas Luar").
  const isJenisDropdownDisabled = false;

  return (
    <section id="view-guru-presensi" className="view-section fade-in">
        <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <i className="fa-solid fa-right-to-bracket text-green-500 dark:text-green-400"></i> Form Presensi
            </h2>

            {dailyState?.isLibur && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                <i className="fa-solid fa-lock mr-2"></i> Akses Terkunci: {dailyState.lockedReason}
              </div>
            )}

            {/* Auto-Checkout (Lupa Checkout) Warning Banner */}
            {dailyState?.lastAutoCheckout && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 mb-4 space-y-1">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <i className="fa-solid fa-triangle-exclamation text-base shrink-0 text-amber-500"></i>
                  <span>Peringatan Presensi: Tercatat Lupa Checkout</span>
                </div>
                <div className="pl-6 text-xs text-amber-700 dark:text-amber-400">
                  Anda tercatat tidak melakukan presensi pulang pada tanggal {dailyState.lastAutoCheckout.timestamp ? dailyState.lastAutoCheckout.timestamp.substring(0, 10) : 'sebelumnya'}. Sistem telah menandai status presensi Anda sebagai <span className="font-bold">Lupa Checkout</span>.
                </div>
              </div>
            )}

            {/* Rejection Alert — Presensi Datang Ditolak */}
            {dailyState?.presensiDatangDitolak && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
                  <i className="fa-solid fa-circle-xmark text-base shrink-0"></i>
                  <span>Presensi Datang Anda Ditolak oleh Admin</span>
                </div>
                {(dailyState.presensiDatangDitolak.catatan_admin || dailyState.presensiDatangDitolak.alasan_penolakan) && (
                  <div className="pl-6 text-xs text-red-700 dark:text-red-300/90 italic leading-relaxed">
                    <span className="font-semibold not-italic">Alasan: </span>
                    {dailyState.presensiDatangDitolak.catatan_admin || dailyState.presensiDatangDitolak.alasan_penolakan}
                  </div>
                )}
                <div className="pl-6 text-xs text-red-600 dark:text-red-400 font-semibold">
                  <i className="fa-solid fa-rotate-right mr-1"></i> Silakan isi ulang presensi datang Anda di bawah.
                </div>
              </div>
            )}

            {/* Rejection Alert — Presensi Pulang Ditolak */}
            {dailyState?.presensiPulangDitolak && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
                  <i className="fa-solid fa-circle-xmark text-base shrink-0"></i>
                  <span>Presensi Pulang Anda Ditolak oleh Admin</span>
                </div>
                {(dailyState.presensiPulangDitolak.catatan_admin || dailyState.presensiPulangDitolak.alasan_penolakan) && (
                  <div className="pl-6 text-xs text-red-700 dark:text-red-300/90 italic leading-relaxed">
                    <span className="font-semibold not-italic">Alasan: </span>
                    {dailyState.presensiPulangDitolak.catatan_admin || dailyState.presensiPulangDitolak.alasan_penolakan}
                  </div>
                )}
                <div className="pl-6 text-xs text-red-600 dark:text-red-400 font-semibold">
                  <i className="fa-solid fa-rotate-right mr-1"></i> Silakan isi ulang presensi pulang Anda di bawah.
                </div>
              </div>
            )}
            
            <form onSubmit={handlePresensiSubmit} className={`space-y-4 ${dailyState?.isLibur ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Tipe Absen</label>
                        <select 
                          value={tipeAbsen} 
                          onChange={e => handleTipeAbsenChange(e.target.value)} 
                          required 
                          className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-nizamudin-green dark:text-nizamudin-gold"
                        >
                            {/* Allow re-selecting Datang if presensiDatang was rejected */}
                            <option value="Datang" disabled={!!dailyState?.presensiDatang && !dailyState?.presensiDatangDitolak}>DATANG</option>
                            <option value="Pulang" disabled={!dailyState?.presensiDatang || (!!dailyState?.presensiPulang && !dailyState?.presensiPulangDitolak)}>PULANG</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Kondisi / Sifat</label>
                        <select 
                          value={jenisPresensi} 
                          onChange={e => togglePresensiFields(e.target.value)} 
                          disabled={isJenisDropdownDisabled} 
                          required 
                          className="w-full px-3 py-3 text-sm rounded-xl input-premium disabled:opacity-50 text-gray-900 dark:text-white"
                        >
                            {tipeAbsen === 'Pulang' ? (
                              <>
                                <option value="Sekolah">Hadir di Sekolah</option>
                                <option value="Dinas Luar">Dinas Luar</option>
                              </>
                            ) : (
                              <>
                                <option value="Sekolah">Hadir di Sekolah</option>
                                <option value="Dinas Luar">Dinas Luar</option>
                                <option value="Izin Terlambat">Izin Terlambat</option>
                                <option value="Izin">Izin / Sakit</option>
                              </>
                            )}
                        </select>
                    </div>
                </div>

                {tipeAbsen === 'Pulang' && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 p-3 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fa-regular fa-clock text-emerald-600 dark:text-emerald-400 text-sm"></i>
                      <div>
                        <div className="font-bold">
                          {getWitaDayName(new Date()) === 'Jumat'
                            ? `Jadwal Pulang Khusus Jumat: ${jamPresensi.pulangJumat || jamPresensi.pulangMulai} - ${jamPresensi.pulangAkhir} WITA`
                            : `Jadwal Pulang Hari Ini: ${jamPresensi.pulangMulai} - ${jamPresensi.pulangAkhir} WITA`}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          {getWitaDayName(new Date()) === 'Jumat'
                            ? 'Ketentuan jam buka presensi pulang hari Jumat diterapkan otomatis.'
                            : 'Presensi pulang dibuka sesuai jam operasional sekolah.'}
                        </div>
                      </div>
                    </div>
                    {getWitaDayName(new Date()) === 'Jumat' && (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                        Hari Jumat
                      </span>
                    )}
                  </div>
                )}

                {isPulangLocked && (
                   <div className="bg-orange-50 text-orange-700 p-3 rounded-xl text-[11px] font-bold border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                     <i className="fa-solid fa-triangle-exclamation mr-1"></i> {dailyState.lockedReason}
                   </div>
                )}
                
                {jenisPresensi === 'Izin' && tipeAbsen === 'Datang' && (
                  <div id="row-detail-izin" className="fade-in space-y-4">
                      <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Kategori Detail</label>
                          <select value={detailIzin} onChange={e => setDetailIzin(e.target.value)} className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white">
                            <option value="Sakit">Sakit</option>
                            <option value="Izin Pribadi">Izin Pribadi</option>
                            <option value="Izin Khusus">Izin Khusus</option>
                          </select>
                      </div>

                      {/* Durasi & Tanggal Izin / Sakit */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                            Durasi (Hari)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={durasiHari}
                            onChange={e => handleDurasiChange(parseInt(e.target.value, 10) || 1)}
                            className="w-full px-3 py-2 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                            Tanggal Mulai
                          </label>
                          <input
                            type="date"
                            value={tanggalMulai}
                            onChange={e => handleTanggalMulaiChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1 ml-1">
                            Tanggal Selesai
                          </label>
                          <input
                            type="date"
                            value={tanggalSelesai}
                            min={tanggalMulai}
                            onChange={e => handleTanggalSelesaiChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                      </div>

                      {/* Informational Badge for Admin Approval Requirement */}
                      {memerlukanPersetujuanAdmin ? (
                        <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
                          detailIzin === 'Sakit'
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                        }`}>
                          <i className={`fa-solid fa-triangle-exclamation text-base shrink-0 ${detailIzin === 'Sakit' ? 'text-rose-500' : 'text-amber-500'}`}></i>
                          <div>
                            <div className="font-bold">
                              {detailIzin === 'Sakit' ? 'Sakit ≥ 3 Hari: Perlu Persetujuan Admin' : 'Izin > 3 Hari: Perlu Persetujuan Admin'}
                            </div>
                            <div className="text-[11px] font-normal opacity-90">
                              {detailIzin === 'Sakit'
                                ? 'Pengajuan sakit selama 3 hari atau lebih wajib melampirkan surat dokter dan disetujui Admin.'
                                : 'Pengajuan izin lebih dari 3 hari tergolong izin jangka panjang dan wajib disetujui Admin.'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2 font-medium">
                          <i className="fa-solid fa-circle-info text-blue-500"></i>
                          <span>Pengajuan {detailIzin} selama {durasiHari} hari.</span>
                        </div>
                      )}
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-2xl">
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-2 flex justify-between items-center">
                              <span><i className="fa-solid fa-pen mr-1 text-yellow-600 dark:text-yellow-400"></i> Penjelasan Detail</span>
                              <span className="text-[9px] text-red-500 dark:text-red-400 uppercase tracking-wide">Wajib Minimal</span>
                          </label>
                          <textarea 
                            value={keterangan}
                            onChange={e => setKeterangan(e.target.value)}
                            rows={3} 
                            required
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-nizamudin-green/20 outline-none transition resize-none placeholder-gray-400 dark:placeholder-gray-500" 
                            placeholder="Jelaskan secara lengkap..."
                          ></textarea>
                      </div>

                  </div>
                )}

                {(jenisPresensi === 'Izin Terlambat' || jenisPresensi === 'Terlambat') && tipeAbsen === 'Datang' && (
                  <div id="row-keterangan-terlambat" className="fade-in space-y-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl">
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white flex justify-between items-center">
                      <span><i className="fa-solid fa-clock mr-1 text-amber-600 dark:text-amber-400"></i> Alasan Keterlambatan (Opsional)</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Menunggu Verifikasi Admin</span>
                    </label>
                    <textarea 
                      value={keterangan}
                      onChange={e => setKeterangan(e.target.value)}
                      rows={2} 
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-nizamudin-green/20 outline-none transition resize-none placeholder-gray-400 dark:placeholder-gray-500" 
                      placeholder="Tuliskan keterangan/alasan keterlambatan jika diperlukan..."
                    ></textarea>
                  </div>
                )}

                {/* File upload for Izin / Sakit or Dinas Luar */}
                {!isSelfieRequired && (
                  <div id="row-file-izin" className="fade-in pt-1 space-y-2">
                      <label className="block text-[11px] font-bold text-red-500 dark:text-red-400 mb-1.5 ml-1">
                        <i className="fa-solid fa-asterisk"></i> Wajib Upload {jenisPresensi === 'Dinas Luar' ? 'Surat Tugas' : 'Surat Keterangan / Sakit'}
                      </label>
                      <input 
                        type="file" 
                        accept="image/*,.pdf" 
                        onChange={e => {
                          setFile(e.target.files ? e.target.files[0] : null);
                          setPhotoPreviewUrl(null);
                        }} 
                        required={!file} 
                        className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                      />
                      {file && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
                            <i className="fa-solid fa-file-lines text-amber-500 text-base"></i>
                            <div>
                              <div>File {jenisPresensi === 'Dinas Luar' ? 'surat tugas' : 'surat izin'} terpasang</div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                {file.name} ({(file.size / 1024).toFixed(0)} KB)
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: `Ganti Surat ${jenisPresensi === 'Dinas Luar' ? 'Tugas' : 'Izin'}?`,
                                text: 'File yang diunggah sebelumnya akan dihapus.',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonColor: '#EF4444',
                                cancelButtonColor: '#6B7280',
                                confirmButtonText: 'Ya, Ganti',
                                cancelButtonText: 'Batal',
                              });
                              if (result.isConfirmed) {
                                setFile(null);
                                setPhotoPreviewUrl(null);
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                          >
                            Ganti File
                          </button>
                        </div>
                      )}
                  </div>
                )}

                {/* Camera Selfie Capture for Datang and Pulang */}
                {isSelfieRequired && (
                  <div id="row-camera-selfie" className="fade-in pt-1 space-y-2">
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white ml-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-camera text-emerald-500"></i>
                        {tipeAbsen === 'Pulang' ? 'Foto Kamera Langsung Presensi Pulang (Wajib)' : 'Foto Selfie Kehadiran (Wajib dengan Watermark)'}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {file ? '✓ Foto Terpasang' : 'Kamera Aktif'}
                      </span>
                    </label>

                    <CameraSelfieCapture
                      key={`camera-presensi-${tipeAbsen}-${jenisPresensi}`}
                      orientation="landscape"
                      initialFacingMode="environment"
                      initialCoordinates={userCoords}
                      existingPhotoUrl={photoPreviewUrl}
                      onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
                        setFile(capturedFile);
                        setPhotoPreviewUrl(previewUrl);
                      }}
                      onRetake={() => {
                        setFile(null);
                        setPhotoPreviewUrl(null);
                      }}
                    />

                    {file && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between transition-all">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                          <i className="fa-solid fa-circle-check text-emerald-500 text-base"></i>
                          <div>
                            <div>Foto selfie siap digunakan</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              {file.name} ({(file.size / 1024).toFixed(0)} KB)
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: 'Ganti Foto?',
                              text: 'Foto selfie yang telah diambil akan dihapus dan kamera dibuka kembali.',
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#EF4444',
                              cancelButtonColor: '#6B7280',
                              confirmButtonText: 'Ya, Ganti',
                              cancelButtonText: 'Batal',
                            });
                            if (result.isConfirmed) {
                              setFile(null);
                              setPhotoPreviewUrl(null);
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition"
                        >
                          Ganti Foto
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div id="row-tempat" className="fade-in pt-1">
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1 flex justify-between">
                        <span>Titik Lokasi (Tempat)</span>
                        <span className="text-[9px] text-blue-500 dark:text-blue-400 cursor-pointer btn-click" onClick={() => fetchLocation(gpsConfig)}>
                          <i className="fa-solid fa-location-crosshairs"></i> Refresh API
                        </span>
                    </label>
                    <input type="text" value={lokasi} readOnly className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed" />
                    {jarakAktual !== null && jenisPresensi === 'Sekolah' && (
                      <div className={`text-[10px] mt-1 ml-1 font-bold ${jarakAktual <= gpsConfig.radius ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                        <i className={`fa-solid ${jarakAktual <= gpsConfig.radius ? 'fa-check-circle' : 'fa-triangle-exclamation'} mr-1`}></i> 
                        Jarak Anda: {jarakAktual} m (Batas: {gpsConfig.radius} m)
                      </div>
                    )}
                </div>

                <div className="pt-2">
                    <button type="submit" disabled={loading || isPulangLocked || dailyState?.isLibur} className="btn-click w-full bg-nizamudin-green text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? 'Menyimpan Presensi...' : isPulangLocked ? 'Terkunci' : <><i className="fa-solid fa-paper-plane"></i> Kirim Presensi</>}
                    </button>
                </div>
            </form>
        </div>
    </section>
  );
}

