'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function AdminConfigView({ user }: { user: any }) {
  const [config, setConfig] = useState({
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil',
    waktu_efektif_mulai: '',
    waktu_efektif_akhir: '',
    hari_sekolah: '6',
    kop_yayasan: '',
    kop_sekolah: '',
    kop_alamat: '',
    kop_npsn: '',
    logo_kiri: '',
    logo_kanan: '',
    ttd_kepsek_nama: '',
    ttd_kepsek_nip: '',
    gps_lat: '-6.200000',
    gps_lng: '106.816666',
    gps_radius: '100'
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('pengaturan').select('*');
      if (data && data.length > 0) {
        const newConfig = { ...config };
        data.forEach(item => {
          if (item.key in newConfig) {
            (newConfig as any)[item.key] = item.value;
          }
        });
        setConfig(newConfig);
      }
    };
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const upsertData = Object.entries(config).map(([key, value]) => ({
      key,
      value: value.toString()
    }));

    const { error } = await supabase.from('pengaturan').upsert(upsertData, { onConflict: 'key' });

    if (error) {
      Swal.fire('Error', 'Gagal menyimpan pengaturan', 'error');
    } else {
      Swal.fire('Berhasil', 'Pengaturan berhasil disimpan!', 'success');
    }
    setLoading(false);
  };

  return (
    <section id="view-admin-config" className="view-section fade-in">
        <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-gears text-gray-500"></i> Konfigurasi
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1">TAHUN AJARAN</label>
                      <input type="text" name="tahun_ajaran" value={config.tahun_ajaran} onChange={handleChange} required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1">SEMESTER</label>
                      <select name="semester" value={config.semester} onChange={handleChange} required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 dark:text-white">
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-[10px] font-bold text-gray-400 mb-3 uppercase flex items-center gap-1.5"><i className="fa-regular fa-calendar"></i> Waktu Efektif</h3>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">Mulai Sem.</label><input type="date" name="waktu_efektif_mulai" value={config.waktu_efektif_mulai} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">Akhir Sem.</label><input type="date" name="waktu_efektif_akhir" value={config.waktu_efektif_akhir} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white" /></div>
                    </div>
                    <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">Hari Sekolah / Minggu</label><select name="hari_sekolah" value={config.hari_sekolah} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 dark:text-white"><option value="6">6 Hari (Senin - Sabtu)</option><option value="5">5 Hari (Senin - Jumat)</option></select></div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4">
                    <h3 className="text-[10px] font-bold text-blue-800 dark:text-blue-500 mb-3 uppercase flex items-center gap-1.5"><i className="fa-solid fa-print"></i> Pengaturan Kop Surat</h3>
                    <div className="space-y-2.5">
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Nama Yayasan</label><input type="text" name="kop_yayasan" value={config.kop_yayasan} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 dark:text-white" placeholder="Contoh: YAYASAN NIZAMUDIN" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Nama Sekolah</label><input type="text" name="kop_sekolah" value={config.kop_sekolah} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 dark:text-white" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Alamat Lengkap</label><input type="text" name="kop_alamat" value={config.kop_alamat} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" /></div>
                        <div><label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">NPSN</label><input type="text" name="kop_npsn" value={config.kop_npsn} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Nomor Pokok Sekolah Nasional" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Logo Kiri (Dinas)</label>
                                <input type="text" name="logo_kiri" value={config.logo_kiri} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Link Hosting JPEG/PNG" />
                            </div>
                            <div>
                                <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Logo Kanan (Sekolah)</label>
                                <input type="text" name="logo_kanan" value={config.logo_kanan} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Link Hosting JPEG/PNG" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-[10px] font-bold text-gray-400 mb-3 uppercase flex items-center gap-1.5"><i className="fa-solid fa-signature"></i> Tanda Tangan Laporan</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Nama Kepala Sekolah</label>
                            <input type="text" name="ttd_kepsek_nama" value={config.ttd_kepsek_nama} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">NIP Kepala Sekolah</label>
                            <input type="text" name="ttd_kepsek_nip" value={config.ttd_kepsek_nip} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" placeholder="Kosongkan jika tidak ada" />
                        </div>
                    </div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-4">
                    <h3 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-500 mb-3 uppercase flex items-center gap-1.5"><i className="fa-solid fa-location-dot"></i> Kordinat GPS Absensi</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Latitude</label>
                            <input type="text" name="gps_lat" value={config.gps_lat} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Longitude</label>
                            <input type="text" name="gps_lng" value={config.gps_lng} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-0.5">Radius (Meter)</label>
                            <input type="number" name="gps_radius" value={config.gps_radius} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 dark:text-white" />
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
