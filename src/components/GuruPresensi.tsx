'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function GuruPresensi({ user }: { user: any }) {
  const [tipeAbsen, setTipeAbsen] = useState('Datang');
  const [jenisPresensi, setJenisPresensi] = useState('Sekolah');
  const [detailIzin, setDetailIzin] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [lokasi, setLokasi] = useState('Mendeteksi lokasi...');
  const [loading, setLoading] = useState(false);
  const [gpsConfig, setGpsConfig] = useState({ lat: -6.200000, lng: 106.816666, radius: 100 });
  const [jarakAktual, setJarakAktual] = useState<number | null>(null);

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
      setLokasi('Browser tidak mendukung Geolocation.');
    }
  };

  // Fetch Supabase Config
  useEffect(() => {
    const initConfig = async () => {
      const { data } = await supabase.from('pengaturan').select('*').in('key', ['gps_lat', 'gps_lng', 'gps_radius']);
      let newConfig = { lat: -6.200000, lng: 106.816666, radius: 100 };
      if (data) {
        data.forEach(item => {
          if (item.key === 'gps_lat') newConfig.lat = parseFloat(item.value);
          if (item.key === 'gps_lng') newConfig.lng = parseFloat(item.value);
          if (item.key === 'gps_radius') newConfig.radius = parseInt(item.value, 10);
        });
        setGpsConfig(newConfig);
      }
      fetchLocation(newConfig);
    };
    initConfig();
  }, []);

  const togglePresensiFields = (val: string) => {
    setJenisPresensi(val);
  };

  const handlePresensiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (jenisPresensi === 'Sekolah' && jarakAktual !== null && jarakAktual > gpsConfig.radius) {
      Swal.fire('Di Luar Jangkauan', `Jarak Anda ${jarakAktual} meter dari sekolah. Maksimal radius adalah ${gpsConfig.radius} meter. Presensi akan masuk antrean verifikasi Admin.`, 'warning');
    }

    // In a real implementation we would upload `file` to Supabase Storage first and get the URL
    const fileUrl = file ? 'https://example.com/file-uploaded.jpg' : '';

    const statusVerif = jenisPresensi === 'Sekolah' && (jarakAktual === null || jarakAktual <= gpsConfig.radius) ? 'Diverifikasi' : 'Menunggu';

    const newPresensi = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      nama_guru: user.nama,
      tipe_absen: tipeAbsen,
      jenis_presensi: jenisPresensi,
      detail_izin: jenisPresensi === 'Izin' ? detailIzin : '',
      lokasi: lokasi,
      jarak: jarakAktual !== null ? `${jarakAktual} m` : 'Unknown',
      link_bukti: fileUrl,
      status_verifikasi: statusVerif
    };

    const { error } = await supabase.from('presensi_guru').insert([newPresensi]);

    if (error) {
      Swal.fire('Error', 'Gagal menyimpan presensi', 'error');
    } else {
      Swal.fire('Berhasil', 'Presensi berhasil direkam!', 'success');
      // Reset form
      setJenisPresensi('Sekolah');
      setKeterangan('');
      setFile(null);
    }
    setLoading(false);
  };

  return (
    <section id="view-guru-presensi" className="view-section fade-in">
        <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                <i className="fa-solid fa-right-to-bracket text-green-500"></i> Form Presensi
            </h2>
            
            <form onSubmit={handlePresensiSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Tipe Absen</label>
                        <select value={tipeAbsen} onChange={e => setTipeAbsen(e.target.value)} required className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-nizamudin-green dark:text-nizamudin-gold">
                            <option value="Datang">DATANG</option>
                            <option value="Pulang">PULANG</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Kondisi / Sifat</label>
                        <select value={jenisPresensi} onChange={e => togglePresensiFields(e.target.value)} required className="w-full px-3 py-3 text-sm rounded-xl input-premium">
                            <option value="Sekolah">Hadir Sekolah</option>
                            <option value="Dinas Luar">Dinas Luar</option>
                            <option value="Izin">Izin / Sakit</option>
                        </select>
                    </div>
                </div>
                
                {jenisPresensi === 'Izin' && (
                  <div id="row-detail-izin" className="fade-in space-y-4">
                      <div>
                          <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Kategori Detail</label>
                          <select value={detailIzin} onChange={e => setDetailIzin(e.target.value)} className="w-full px-3 py-3 text-sm rounded-xl input-premium">
                            <option value="Sakit">Sakit</option>
                            <option value="Izin Pribadi">Izin Pribadi</option>
                            <option value="Izin Khusus">Izin Khusus</option>
                          </select>
                      </div>
                      
                      <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-2xl">
                          <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-2 flex justify-between items-center">
                              <span><i className="fa-solid fa-pen mr-1 text-yellow-600"></i> Penjelasan Detail</span>
                              <span className="text-[9px] text-red-500 uppercase tracking-wide">Wajib Minimal</span>
                          </label>
                          <textarea 
                            value={keterangan}
                            onChange={e => setKeterangan(e.target.value)}
                            rows={3} 
                            className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-nizamudin-green/20 outline-none transition resize-none placeholder-gray-400" 
                            placeholder="Jelaskan secara lengkap..."
                          ></textarea>
                          <div className="mt-2 flex justify-end">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400">
                                {keterangan.trim().split(/\s+/).filter(Boolean).length} Kata
                              </span>
                          </div>
                      </div>
                  </div>
                )}

                {jenisPresensi !== 'Sekolah' && (
                  <div id="row-file" className="fade-in pt-1">
                      <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1 text-red-500"><i className="fa-solid fa-asterisk"></i> Wajib Upload Surat Keterangan</label>
                      <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800" />
                  </div>
                )}

                <div id="row-tempat" className="fade-in pt-1">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1 flex justify-between">
                        <span>Titik Lokasi (Tempat)</span>
                        <span className="text-[9px] text-blue-500 cursor-pointer btn-click" onClick={() => fetchLocation(gpsConfig)}>
                          <i className="fa-solid fa-location-crosshairs"></i> Refresh API
                        </span>
                    </label>
                    <input type="text" value={lokasi} readOnly className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-gray-100 dark:bg-gray-800 cursor-not-allowed" />
                    {jarakAktual !== null && jenisPresensi === 'Sekolah' && (
                      <div className={`text-[10px] mt-1 ml-1 font-bold ${jarakAktual <= gpsConfig.radius ? 'text-green-600' : 'text-red-500'}`}>
                        <i className={`fa-solid ${jarakAktual <= gpsConfig.radius ? 'fa-check-circle' : 'fa-triangle-exclamation'} mr-1`}></i> 
                        Jarak Anda: {jarakAktual} m (Batas: {gpsConfig.radius} m)
                      </div>
                    )}
                </div>

                <div className="text-[10px] text-gray-500 text-center italic mt-2"><i className="fa-solid fa-map-pin text-red-500"></i> Sistem akan merekam otomatis titik GPS (lokasi) Anda.</div>

                <div className="pt-2">
                    <button type="submit" disabled={loading} className="btn-click w-full bg-nizamudin-green text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-green-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? 'Memproses...' : <><i className="fa-solid fa-paper-plane"></i> Kirim Presensi</>}
                    </button>
                </div>
            </form>
        </div>
    </section>
  );
}
