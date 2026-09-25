'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast, Toast } from '@/lib/toast';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaTimestamp, getWitaDayName } from '@/lib/wita';
import CameraSelfieCapture from '@/components/CameraSelfieCapture';
import { WatermarkCoordinates } from '@/lib/watermarkCanvas';

export default function GuruPresensi({ user }: { user: any }) {
  const [tipeAbsen, setTipeAbsen] = useState('Datang');
  const [jenisPresensi, setJenisPresensi] = useState('Sekolah');
  const [detailIzin, setDetailIzin] = useState('Sakit');
  const [keterangan, setKeterangan] = useState('');
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

      const state = await getGuruDailyState(user.nama, user.username, user.id);
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

  const togglePresensiFields = async (val: string) => {
    if (file && val !== 'Izin' && jenisPresensi === 'Izin' && !file.type.startsWith('image/')) {
      const result = await Swal.fire({
        title: 'Ganti Jenis Presensi?',
        text: 'File bukti izin tidak dapat digunakan sebagai foto selfie. Hapus file?',
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
    }
    setJenisPresensi(val);
  };

  const handleTipeAbsenChange = (val: string) => {
    setTipeAbsen(val);
    if (val === 'Pulang') {
      if (dailyState?.isDinasLuar) {
        setJenisPresensi('Dinas Luar');
      } else {
        setJenisPresensi('Sekolah');
      }
    } else {
      setJenisPresensi('Sekolah');
    }
  };

  // Determine if selfie camera is required
  // Required for:
  // 1. All Presensi Pulang
  // 2. Presensi Datang (Sekolah & Dinas Luar)
  // 3. Any Dinas Luar
  const isSelfieRequired = tipeAbsen === 'Pulang' || (tipeAbsen === 'Datang' && jenisPresensi !== 'Izin') || jenisPresensi === 'Dinas Luar';

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

    // Validasi File Bukti Izin
    if (jenisPresensi === 'Izin' && tipeAbsen === 'Datang' && !file) {
      return showToast(
        'Surat Keterangan Wajib',
        'Silakan lampirkan surat keterangan izin atau surat dokter.',
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

    if (tipeAbsen === 'Datang') {
      const startVal = parseTime(jamPresensi.datangMulai);
      const batasVal = parseTime(jamPresensi.datangBatas);
      const akhirVal = parseTime(jamPresensi.datangAkhir);

      if (currTimeVal < startVal) {
        return showToast('Belum Waktunya', `Presensi datang baru dibuka jam ${jamPresensi.datangMulai} WITA.`, 'warning');
      }
      if (currTimeVal > akhirVal) {
        return showToast('Ditutup', `Presensi datang sudah ditutup jam ${jamPresensi.datangAkhir} WITA. Silakan hubungi admin.`, 'error');
      }

      if (currTimeVal > batasVal && jenisPresensi === 'Sekolah') {
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

    const statusVerif = jenisPresensi === 'Sekolah' && (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Diverifikasi' : 'Menunggu';
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
      detail_izin: jenisPresensi === 'Izin' ? detailIzin : '',
      lokasi: lokasi,
      jarak: jarakAktual !== null ? `${jarakAktual} m` : 'Unknown',
      link_bukti: file ? 'pending:uploading' : '',
      status_verifikasi: statusVerif,
      keterlambatan_detik: keterlambatanDetik,
    };
    if (user?.sekolah_id) {
      newPresensi.sekolah_id = user.sekolah_id;
    }

    const { error } = await supabase.from('presensi_guru').insert([newPresensi]);

    if (error) {
      setLoading(false);
      return showToast('Error', 'Gagal menyimpan data presensi: ' + error.message, 'error');
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
    const state = await getGuruDailyState(user.nama, user.username, user.id);
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
        }
      })();
    }
  };

  const isPulangLocked = tipeAbsen === 'Pulang' && dailyState && !dailyState.canPresensiPulang;

  // Pulang options for Dinas Luar:
  // If teacher checked in as Dinas Luar (dailyState?.isDinasLuar is true), allow choosing between "Di Sekolah" and "Dinas Luar".
  // Dropdown is only disabled if doing Pulang and NOT Dinas Luar.
  const isJenisDropdownDisabled = tipeAbsen === 'Pulang' && !dailyState?.isDinasLuar;

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
                            {tipeAbsen === 'Pulang' && dailyState?.isDinasLuar ? (
                              <>
                                <option value="Sekolah">Di Sekolah</option>
                                <option value="Dinas Luar">Dinas Luar</option>
                              </>
                            ) : (
                              <>
                                <option value="Sekolah">Hadir Sekolah</option>
                                <option value="Dinas Luar">Dinas Luar</option>
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

                      {/* File upload for Izin / Sakit */}
                      <div id="row-file-izin" className="fade-in pt-1">
                          <label className="block text-[11px] font-bold text-red-500 dark:text-red-400 mb-1.5 ml-1">
                            <i className="fa-solid fa-asterisk"></i> Wajib Upload Surat Keterangan / Sakit
                          </label>
                          <input 
                            type="file" 
                            accept="image/*,.pdf" 
                            onChange={e => {
                              setFile(e.target.files ? e.target.files[0] : null);
                              setPhotoPreviewUrl(null);
                            }} 
                            required 
                            className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                          />
                      </div>
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
                      key="camera-selfie"
                      initialCoordinates={userCoords}
                      existingPhotoUrl={photoPreviewUrl}
                      onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
                        setFile(capturedFile);
                        setPhotoPreviewUrl(previewUrl);
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

