'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';

export default function AdminConfigView({ user }: { user: any }) {
  const [config, setConfig] = useState({
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil',
    waktu_efektif_mulai: '',
    waktu_efektif_akhir: '',
    hari_sekolah: '6',
    jam_datang_mulai: '06:45',
    jam_datang_batas: '07:15',
    jam_datang_akhir: '08:00',
    jam_pulang_mulai: '11:00',
    jam_pulang_akhir: '22:00',
    kop_yayasan: '',
    kop_sekolah: '',
    kop_alamat: '',
    kop_npsn: '',
    logo_kiri: '',
    logo_kanan: '',
    ttd_kepsek_nama: '',
    ttd_kepsek_nip: '',
    kota_ttd: '',
    gps_lat: '-6.200000',
    gps_lng: '106.816666',
    gps_radius: '100'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase.from('pengaturan').select('*');
        if (data && data.length > 0) {
          const newConfig = { ...config };
          data.forEach(item => {
            if (item.key in newConfig) {
              (newConfig as any)[item.key] = item.value;
            } else if (item.key.toLowerCase() in newConfig) {
              (newConfig as any)[item.key.toLowerCase()] = item.value;
            }
          });
          setConfig(newConfig);
        }
      } catch (err) {
        console.error('Config fetch error:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      Swal.fire('Error', 'Browser atau perangkat Anda tidak mendukung geolokasi GPS.', 'error');
      return;
    }

    Swal.fire({
      title: 'Mendeteksi GPS...',
      text: 'Mohon izinkan akses lokasi jika diminta oleh browser.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setConfig(prev => ({
          ...prev,
          gps_lat: lat,
          gps_lng: lng
        }));
        Swal.fire({
          icon: 'success',
          title: 'Lokasi Terdeteksi',
          text: `Koordinat GPS berhasil diperbarui:\nLatitude: ${lat}\nLongitude: ${lng}`,
          confirmButtonColor: '#059669',
          timer: 3000
        });
      },
      (err) => {
        let msg = err.message || 'Gagal mendapatkan koordinat GPS.';
        if (err.code === 1) msg = 'Izin akses lokasi ditolak oleh pengguna atau browser.';
        else if (err.code === 2) msg = 'Posisi perangkat tidak dapat ditentukan (sinyal GPS lemah).';
        else if (err.code === 3) msg = 'Waktu permintaan GPS habis (timeout).';
        Swal.fire('Gagal Deteksi Lokasi', msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const upsertData = Object.entries(config).map(([key, value]) => ({
      key,
      value: value.toString()
    }));

    try {
      const { error } = await supabase.from('pengaturan').upsert(upsertData, { onConflict: 'key' });

      if (error) {
        Swal.fire('Error', 'Gagal menyimpan pengaturan: ' + error.message, 'error');
      } else {
        Swal.fire('Berhasil', 'Pengaturan berhasil disimpan!', 'success');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan: ' + (err as any).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="view-admin-config" className="view-section fade-in">
        <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-gears text-gray-700 dark:text-gray-300 text-sm"></i> Konfigurasi
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1 ml-1">TAHUN AJARAN</label>
                      <input type="text" name="tahun_ajaran" value={config.tahun_ajaran} onChange={handleChange} required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1 ml-1">SEMESTER</label>
                      <select name="semester" value={config.semester} onChange={handleChange} required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase flex items-center gap-2"><i className="fa-regular fa-calendar text-xs text-blue-600 dark:text-blue-400"></i> Waktu Efektif</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Mulai Sem.</label><input type="date" name="waktu_efektif_mulai" value={config.waktu_efektif_mulai} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Akhir Sem.</label><input type="date" name="waktu_efektif_akhir" value={config.waktu_efektif_akhir} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                    </div>
                    <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Hari Sekolah / Minggu</label><select name="hari_sekolah" value={config.hari_sekolah} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white"><option value="6">6 Hari (Senin - Sabtu)</option><option value="5">5 Hari (Senin - Jumat)</option></select></div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-3 uppercase flex items-center gap-2"><i className="fa-regular fa-clock text-xs"></i> Pengaturan Jam Presensi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Datang Buka</label><input type="time" name="jam_datang_mulai" value={config.jam_datang_mulai || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Batas Terlambat</label><input type="time" name="jam_datang_batas" value={config.jam_datang_batas || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Datang Tutup</label><input type="time" name="jam_datang_akhir" value={config.jam_datang_akhir || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Pulang Buka</label><input type="time" name="jam_pulang_mulai" value={config.jam_pulang_mulai || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Pulang Tutup</label><input type="time" name="jam_pulang_akhir" value={config.jam_pulang_akhir || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 italic">* Sistem akan menghitung akumulasi jam keterlambatan (Batas Terlambat). Setiap total 4 jam keterlambatan = 1 Hari Alpa otomatis.</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-3 uppercase flex items-center gap-2"><i className="fa-solid fa-print text-xs"></i> Pengaturan Kop Surat</h3>
                    <div className="space-y-2.5">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Nama Yayasan</label><input type="text" name="kop_yayasan" value={config.kop_yayasan} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Contoh: YAYASAN NIZAMUDIN" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Nama Sekolah</label><input type="text" name="kop_sekolah" value={config.kop_sekolah} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Alamat Lengkap</label><input type="text" name="kop_alamat" value={config.kop_alamat} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">NPSN</label><input type="text" name="kop_npsn" value={config.kop_npsn} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Nomor Pokok Sekolah Nasional" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kiri (Dinas)</label>
                                <input type="text" name="logo_kiri" value={config.logo_kiri} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting / Google Drive" />
                                {config.logo_kiri && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Preview:</span>
                                    <img 
                                      src={transformGoogleDriveUrl(config.logo_kiri)} 
                                      alt="Preview Logo Kiri" 
                                      className="w-10 h-10 object-contain border border-gray-200 dark:border-gray-700 rounded bg-white p-0.5 shadow-sm" 
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                                    />
                                  </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kanan (Sekolah)</label>
                                <input type="text" name="logo_kanan" value={config.logo_kanan} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting / Google Drive" />
                                {config.logo_kanan && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Preview:</span>
                                    <img 
                                      src={transformGoogleDriveUrl(config.logo_kanan)} 
                                      alt="Preview Logo Kanan" 
                                      className="w-10 h-10 object-contain border border-gray-200 dark:border-gray-700 rounded bg-white p-0.5 shadow-sm" 
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                                    />
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase flex items-center gap-2"><i className="fa-solid fa-signature text-xs text-blue-600 dark:text-blue-400"></i> Tanda Tangan Laporan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Nama Kepala Sekolah</label>
                            <input type="text" name="ttd_kepsek_nama" value={config.ttd_kepsek_nama} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">NIP Kepala Sekolah</label>
                            <input type="text" name="ttd_kepsek_nip" value={config.ttd_kepsek_nip} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Kosongkan jika tidak ada" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Kabupaten / Kota Tanda Tangan</label>
                        <input type="text" name="kota_ttd" value={config.kota_ttd || ''} onChange={handleChange} placeholder="Contoh: Kab. Bolaangmongondow Timur" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-4">
                    <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                        <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase flex items-center gap-2">
                          <i className="fa-solid fa-location-dot text-xs"></i> Kordinat GPS Absensi
                        </h3>
                        <button 
                          type="button" 
                          onClick={handleDetectGps}
                          className="btn-click text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/70 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-sm transition"
                        >
                          <i className="fa-solid fa-crosshairs text-xs"></i> Deteksi Lokasi Saat Ini
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Latitude</label>
                            <input type="text" name="gps_lat" value={config.gps_lat} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Longitude</label>
                            <input type="text" name="gps_lng" value={config.gps_lng} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Radius (Meter)</label>
                            <input type="number" name="gps_radius" value={config.gps_radius} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 text-sm flex justify-center items-center gap-2 mt-4 transition disabled:opacity-50">
                  {loading ? 'Menyimpan...' : <><i className="fa-solid fa-save"></i> Simpan Konfigurasi</>}
                </button>
            </form>
        </div>
    </section>
  );
}
