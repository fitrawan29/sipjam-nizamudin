'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaTimestamp } from '@/lib/wita';

export default function GuruPresensi({ user }: { user: any }) {
  const [tipeAbsen, setTipeAbsen] = useState('Datang');
  const [jenisPresensi, setJenisPresensi] = useState('Sekolah');
  const [detailIzin, setDetailIzin] = useState('Sakit');
  const [keterangan, setKeterangan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lokasi, setLokasi] = useState('Mendeteksi lokasi...');
  const [loading, setLoading] = useState(false);
  const [gpsConfig, setGpsConfig] = useState({ lat: -6.200000, lng: 106.816666, radius: 100 });
  const [jarakAktual, setJarakAktual] = useState<number | null>(null);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);

  const [jamPresensi, setJamPresensi] = useState({
    datangMulai: '06:00',
    datangBatas: '07:15',
    datangAkhir: '08:00',
    pulangMulai: '11:00',
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
    if (navigator.geolocation) {
      setLokasi('Mendeteksi GPS...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
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
      const { data } = await supabase.from('pengaturan').select('*').in('key', ['gps_lat', 'gps_lng', 'gps_radius', 'jam_datang_mulai', 'jam_datang_batas', 'jam_datang_akhir', 'jam_pulang_mulai', 'jam_pulang_akhir']);
      let newConfig = { lat: -6.200000, lng: 106.816666, radius: 100 };
      let newJam = { ...jamPresensi };
      if (data) {
        data.forEach(item => {
          if (item.key === 'gps_lat') newConfig.lat = parseFloat(item.value);
          if (item.key === 'gps_lng') newConfig.lng = parseFloat(item.value);
          if (item.key === 'gps_radius') newConfig.radius = parseInt(item.value, 10);
          if (item.key === 'jam_datang_mulai') newJam.datangMulai = item.value;
          if (item.key === 'jam_datang_batas') newJam.datangBatas = item.value;
          if (item.key === 'jam_datang_akhir') newJam.datangAkhir = item.value;
          if (item.key === 'jam_pulang_mulai') newJam.pulangMulai = item.value;
          if (item.key === 'jam_pulang_akhir') newJam.pulangAkhir = item.value;
        });
        setGpsConfig(newConfig);
        setJamPresensi(newJam);
      }
      fetchLocation(newConfig);

      const state = await getGuruDailyState(user.nama);
      setDailyState(state);
      if (state.presensiDatang && !state.presensiPulang) {
        setTipeAbsen('Pulang');
      }
    };
    initConfig();
  }, [user.nama]);

  const togglePresensiFields = (val: string) => {
    setJenisPresensi(val);
  };

  const handlePresensiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi Workflow Pulang
    if (tipeAbsen === 'Pulang') {
      if (dailyState && !dailyState.canPresensiPulang) {
        return Swal.fire('Terkunci', dailyState.lockedReason || 'Anda belum menyelesaikan Jurnal/Piket.', 'error');
      }
      if (dailyState?.isIzinSakit) {
        return Swal.fire('Info', 'Anda sedang Izin/Sakit hari ini, tidak perlu melakukan presensi pulang.', 'info');
      }
    }

    // Validasi Workflow Datang
    if (tipeAbsen === 'Datang' && dailyState?.presensiDatang) {
      return Swal.fire('Info', 'Anda sudah melakukan Presensi Datang hari ini.', 'info');
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
        return Swal.fire('Belum Waktunya', `Presensi datang baru dibuka jam ${jamPresensi.datangMulai} WITA.`, 'warning');
      }
      if (currTimeVal > akhirVal) {
        return Swal.fire('Ditutup', `Presensi datang sudah ditutup jam ${jamPresensi.datangAkhir} WITA. Silakan hubungi admin.`, 'error');
      }

      if (currTimeVal > batasVal && jenisPresensi === 'Sekolah') {
        const currTotalSeconds = currH * 3600 + currM * 60 + currS;
        const batasTotalSeconds = batasVal * 60;
        keterlambatanDetik = Math.max(0, currTotalSeconds - batasTotalSeconds);
      }
    } else if (tipeAbsen === 'Pulang') {
      const startVal = parseTime(jamPresensi.pulangMulai);
      const akhirVal = parseTime(jamPresensi.pulangAkhir);

      if (currTimeVal < startVal) {
        return Swal.fire('Belum Waktunya', `Presensi pulang baru dibuka jam ${jamPresensi.pulangMulai} WITA.`, 'warning');
      }
      if (currTimeVal > akhirVal) {
        return Swal.fire('Ditutup', `Presensi pulang ditutup jam ${jamPresensi.pulangAkhir} WITA.`, 'error');
      }
    }

    setLoading(true);
    
    if (jenisPresensi === 'Sekolah' && jarakAktual !== null && jarakAktual > gpsConfig.radius) {
      Swal.fire('Di Luar Jangkauan', `Jarak Anda ${jarakAktual} meter dari sekolah. Maksimal radius adalah ${gpsConfig.radius} meter. Presensi akan masuk antrean verifikasi Admin.`, 'warning');
    }

    // Upload to Google Drive if there's a file
    let fileUrl = '';
    if (file) {
      try {
        fileUrl = await uploadToDrive(file, user.nama, 'Presensi_Guru', 'Presensi');
      } catch (err: any) {
        setLoading(false);
        return Swal.fire('Gagal Upload', err.message, 'error');
      }
    }
    const statusVerif = jenisPresensi === 'Sekolah' && (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Diverifikasi' : 'Menunggu';

    const newPresensi = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      nama_guru: user.nama,
      tipe_absen: tipeAbsen,
      jenis_presensi: jenisPresensi,
      detail_izin: jenisPresensi === 'Izin' ? detailIzin : '',
      lokasi: lokasi,
      jarak: jarakAktual !== null ? `${jarakAktual} m` : 'Unknown',
      link_bukti: fileUrl,
      status_verifikasi: statusVerif,
      keterlambatan_detik: keterlambatanDetik
    };

    const { error } = await supabase.from('presensi_guru').insert([newPresensi]);

    if (error) {
      Swal.fire('Error', 'Gagal menyimpan presensi', 'error');
    } else {
      Swal.fire('Berhasil', 'Presensi berhasil direkam!', 'success');
      setJenisPresensi('Sekolah');
      setKeterangan('');
      setFile(null);
      
      // Update state
      const state = await getGuruDailyState(user.nama);
      setDailyState(state);
      if (tipeAbsen === 'Datang') setTipeAbsen('Pulang');
    }
    setLoading(false);
  };

  const isPulangLocked = tipeAbsen === 'Pulang' && dailyState && !dailyState.canPresensiPulang;

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
            
            <form onSubmit={handlePresensiSubmit} className={`space-y-4 ${dailyState?.isLibur ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Tipe Absen</label>
                        <select value={tipeAbsen} onChange={e => setTipeAbsen(e.target.value)} required className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-nizamudin-green dark:text-nizamudin-gold">
                            <option value="Datang" disabled={!!dailyState?.presensiDatang}>DATANG</option>
                            <option value="Pulang" disabled={!dailyState?.presensiDatang}>PULANG</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Kondisi / Sifat</label>
                        <select value={jenisPresensi} onChange={e => togglePresensiFields(e.target.value)} disabled={tipeAbsen === 'Pulang'} required className="w-full px-3 py-3 text-sm rounded-xl input-premium disabled:opacity-50 text-gray-900 dark:text-white">
                            <option value="Sekolah">Hadir Sekolah</option>
                            <option value="Dinas Luar">Dinas Luar</option>
                            <option value="Izin">Izin / Sakit</option>
                        </select>
                    </div>
                </div>

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
                  </div>
                )}

                {jenisPresensi !== 'Sekolah' && tipeAbsen === 'Datang' && (
                  <div id="row-file" className="fade-in pt-1">
                      <label className="block text-[11px] font-bold text-red-500 dark:text-red-400 mb-1.5 ml-1"><i className="fa-solid fa-asterisk"></i> Wajib Upload Surat Keterangan</label>
                      <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
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
                        {loading ? 'Memproses...' : isPulangLocked ? 'Terkunci' : <><i className="fa-solid fa-paper-plane"></i> Kirim Presensi</>}
                    </button>
                </div>
            </form>
        </div>
    </section>
  );
}
