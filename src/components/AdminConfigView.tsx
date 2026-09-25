'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
import AccountSettingsModal from './AccountSettingsModal';

export default function AdminConfigView({ user }: { user: any }) {
  const [config, setConfig] = useState({
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil',
    waktu_efektif_mulai: '',
    waktu_efektif_akhir: '',
    hari_sekolah: '6',
    aturan_kehadiran_guru: 'Semua_Hari',
    email_tujuan_upload: '',
    jam_datang_mulai: '06:45',
    jam_datang_batas: '07:15',
    jam_datang_akhir: '08:00',
    jam_pulang_mulai: '11:00',
    jam_pulang_jumat: '11:00',
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
    kota_kabupaten: '',
    gps_lat: '-6.200000',
    gps_lng: '106.816666',
    gps_radius: '100'
  });

  const [guruList, setGuruList] = useState<any[]>([]);
  const [exemptTeacherIds, setExemptTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        let query = supabase.from('pengaturan').select('*');
        if (user?.sekolah_id) {
          query = query.eq('sekolah_id', user.sekolah_id);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          const newConfig = { ...config };
          const ghmList: string[] = [];
          data.forEach(item => {
            if (item.key in newConfig) {
              (newConfig as any)[item.key] = item.value;
            } else if (item.key && item.key.toLowerCase() in newConfig) {
              (newConfig as any)[item.key.toLowerCase()] = item.value;
            }
            if (item.aturan_kehadiran_guru) {
              newConfig.aturan_kehadiran_guru = item.aturan_kehadiran_guru;
            }
            if (item.email_tujuan_upload) {
              newConfig.email_tujuan_upload = item.email_tujuan_upload;
            }
            if (item.jam_pulang_jumat) {
              newConfig.jam_pulang_jumat = item.jam_pulang_jumat;
            }
            if (item.key === 'jam_pulang_jumat' && item.value) {
              newConfig.jam_pulang_jumat = item.value;
            }
            if (item.key === 'guru_hanya_mengajar' && item.value) {
              try {
                const parsed = JSON.parse(item.value);
                if (Array.isArray(parsed)) ghmList.push(...parsed);
                else if (typeof parsed === 'string') ghmList.push(parsed);
              } catch (_) {
                ghmList.push(item.value);
              }
            }
            if (item.guru_hanya_mengajar) {
              try {
                const parsed = JSON.parse(item.guru_hanya_mengajar);
                if (Array.isArray(parsed)) ghmList.push(...parsed);
                else if (typeof parsed === 'string') ghmList.push(parsed);
              } catch (_) {
                ghmList.push(item.guru_hanya_mengajar);
              }
            }
          });
          // Ensure bidirectional fallback between kota_kabupaten and kota_ttd
          if (!newConfig.kota_kabupaten && newConfig.kota_ttd) {
            newConfig.kota_kabupaten = newConfig.kota_ttd;
          }
          if (!newConfig.kota_ttd && newConfig.kota_kabupaten) {
            newConfig.kota_ttd = newConfig.kota_kabupaten;
          }
          setConfig(newConfig);

          // Fetch teachers from data_guru
          let guruQuery = supabase.from('data_guru').select('*').order('nama_guru', { ascending: true });
          if (user?.sekolah_id) {
            guruQuery = guruQuery.eq('sekolah_id', user.sekolah_id);
          }
          const { data: teachers } = await guruQuery;
          if (teachers && teachers.length > 0) {
            setGuruList(teachers);
            const dbExempt = teachers
              .filter(t => t.wajib_hadir_hanya_mengajar === true)
              .map(t => t.id);
            setExemptTeacherIds(Array.from(new Set([...ghmList, ...dbExempt])));
          } else if (ghmList.length > 0) {
            setExemptTeacherIds(Array.from(new Set(ghmList)));
          }
        }
      } catch (err) {
        console.error('Config fetch error:', err);
      }
    };
    fetchConfig();
  }, [user?.sekolah_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'kota_kabupaten') {
      setConfig(prev => ({ ...prev, kota_kabupaten: value, kota_ttd: value }));
    } else if (name === 'kota_ttd') {
      setConfig(prev => ({ ...prev, kota_ttd: value, kota_kabupaten: value }));
    } else {
      setConfig(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      showToast('Error', 'Browser atau perangkat Anda tidak mendukung geolokasi GPS.', 'error');
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
        Swal.close();
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setConfig(prev => ({
          ...prev,
          gps_lat: lat,
          gps_lng: lng
        }));
        showToast('Lokasi Terdeteksi', `Latitude: ${lat}, Longitude: ${lng}`, 'success');
      },
      (err) => {
        Swal.close();
        let msg = err.message || 'Gagal mendapatkan koordinat GPS.';
        if (err.code === 1) msg = 'Izin akses lokasi ditolak oleh pengguna atau browser.';
        else if (err.code === 2) msg = 'Posisi perangkat tidak dapat ditentukan (sinyal GPS lemah).';
        else if (err.code === 3) msg = 'Waktu permintaan GPS habis (timeout).';
        showToast('Gagal Deteksi Lokasi', msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cityVal = config.kota_kabupaten || config.kota_ttd || '';
    const saveConfig = {
      ...config,
      jam_pulang_jumat: config.jam_pulang_jumat || '11:00',
      kota_kabupaten: cityVal,
      kota_ttd: cityVal
    };

    const targetSekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
    const jsonExempt = JSON.stringify(exemptTeacherIds);

    const upsertData = Object.entries(saveConfig).map(([key, value]) => ({
      sekolah_id: targetSekolahId,
      key,
      value: value !== undefined && value !== null ? value.toString() : '',
      aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
      email_tujuan_upload: saveConfig.email_tujuan_upload,
      jam_pulang_jumat: saveConfig.jam_pulang_jumat,
      guru_hanya_mengajar: jsonExempt
    }));

    // Ensure guru_hanya_mengajar is also saved as a key-value row
    upsertData.push({
      sekolah_id: targetSekolahId,
      key: 'guru_hanya_mengajar',
      value: jsonExempt,
      aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
      email_tujuan_upload: saveConfig.email_tujuan_upload,
      jam_pulang_jumat: saveConfig.jam_pulang_jumat,
      guru_hanya_mengajar: jsonExempt
    });

    try {
      const { error } = await supabase.from('pengaturan').upsert(upsertData, { onConflict: 'sekolah_id,key' });

      // Also ensure column values are set on pengaturan rows for this school
      await supabase.from('pengaturan').update({
        aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
        email_tujuan_upload: saveConfig.email_tujuan_upload,
        jam_pulang_jumat: saveConfig.jam_pulang_jumat,
        guru_hanya_mengajar: jsonExempt
      }).eq('sekolah_id', targetSekolahId);

      // Also sync data_guru.wajib_hadir_hanya_mengajar
      if (guruList.length > 0) {
        for (const t of guruList) {
          const isExempt = exemptTeacherIds.includes(t.id) || (t.nama_guru && exemptTeacherIds.includes(t.nama_guru));
          await supabase
            .from('data_guru')
            .update({ wajib_hadir_hanya_mengajar: isExempt })
            .eq('id', t.id);
        }
      }

      if (error) {
        showToast('Error', 'Gagal menyimpan pengaturan: ' + error.message, 'error');
      } else {
        showToast('Berhasil', 'Pengaturan berhasil disimpan!', 'success');
      }
    } catch (err) {
      showToast('Error', 'Gagal menyimpan: ' + (err as any).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="view-admin-config" className="view-section fade-in">
        <div className="glass-card p-5">
            <div className="flex flex-wrap justify-between items-center mb-5 gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-gears text-gray-700 dark:text-gray-300 text-sm"></i> Konfigurasi Sistem
              </h2>
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="btn-click text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-xs"
              >
                <i className="fa-solid fa-user-gear text-xs"></i> Pengaturan Akun & Profil
              </button>
            </div>
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
                    <div>
                      <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Hari Sekolah / Minggu</label>
                      <select name="hari_sekolah" value={config.hari_sekolah} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="6">6 Hari (Senin - Sabtu)</option>
                        <option value="5">5 Hari (Senin - Jumat)</option>
                      </select>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1.5 flex items-start gap-1">
                        <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                        <span>
                          {config.hari_sekolah === '5'
                            ? 'Mode 5 hari kerja aktif: Hari Sabtu & Minggu otomatis menjadi hari libur. Guru tidak dapat melakukan presensi, mengisi jurnal, atau laporan piket pada hari tersebut.'
                            : 'Mode 6 hari kerja aktif: Hanya hari Minggu yang otomatis menjadi hari libur. Hari Sabtu adalah hari kerja normal.'
                          }
                        </span>
                      </p>
                    </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-3 uppercase flex items-center gap-2">
                      <i className="fa-solid fa-user-check text-xs"></i> Aturan Kehadiran Guru
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Kewajiban Kehadiran Harian Guru</label>
                      <select 
                        name="aturan_kehadiran_guru" 
                        value={config.aturan_kehadiran_guru} 
                        onChange={handleChange} 
                        required 
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                      >
                        <option value="Semua_Hari">Semua_Hari (Wajib Hadir Setiap Hari)</option>
                        <option value="Hari_Mengajar_Saja">Hari_Mengajar_Saja (Wajib Hadir Hanya di Hari Mengajar)</option>
                      </select>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-300 mt-1.5 flex items-start gap-1">
                        <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                        <span>
                          {config.aturan_kehadiran_guru === 'Hari_Mengajar_Saja'
                            ? 'Mode Hari Mengajar Saja: Guru yang tidak memiliki jadwal KBM atau tugas piket pada hari berjalan dibebaskan dari kewajiban presensi dan tidak dihitung sebagai Alpa.'
                            : 'Mode Semua Hari: Seluruh guru wajib hadir dan melakukan presensi pada setiap hari aktif sekolah.'
                          }
                        </span>
                      </p>
                    </div>

                    {/* Pengecualian Kehadiran Guru (Hanya wajib hadir saat hari mengajar) */}
                    <div className="mt-4 pt-4 border-t border-indigo-200/60 dark:border-indigo-800/60">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <i className="fa-solid fa-user-gear text-xs text-indigo-600 dark:text-indigo-400"></i>
                            Pengecualian Kehadiran Guru
                          </h4>
                          <p className="text-[10px] text-gray-600 dark:text-gray-300">
                            Tentukan guru yang <strong>Hanya wajib hadir saat hari mengajar / piket</strong>. Guru yang tidak dipilih tetap wajib hadir setiap hari kerja.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExemptTeacherIds(guruList.map(g => g.id))}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            Pilih Semua
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button
                            type="button"
                            onClick={() => setExemptTeacherIds([])}
                            className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            Reset Semua
                          </button>
                        </div>
                      </div>

                      <div className="mb-2">
                        <input
                          type="text"
                          placeholder="Cari nama guru, NIP, atau mata pelajaran..."
                          value={teacherSearch}
                          onChange={e => setTeacherSearch(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scroll">
                        {guruList.length === 0 ? (
                          <div className="text-center py-4 text-[11px] text-gray-500 italic">
                            Tidak ada data guru ditemukan.
                          </div>
                        ) : (
                          guruList
                            .filter(g => {
                              if (!teacherSearch) return true;
                              const s = teacherSearch.toLowerCase();
                              return (
                                (g.nama_guru && g.nama_guru.toLowerCase().includes(s)) ||
                                (g.mata_pelajaran && g.mata_pelajaran.toLowerCase().includes(s)) ||
                                (g.nip && g.nip.toLowerCase().includes(s))
                              );
                            })
                            .map(g => {
                              const isExempt = exemptTeacherIds.includes(g.id) || (g.nama_guru && exemptTeacherIds.includes(g.nama_guru));
                              return (
                                <label
                                  key={g.id}
                                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                                    isExempt
                                      ? 'bg-indigo-100/70 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700'
                                      : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isExempt}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setExemptTeacherIds(prev => [...prev, g.id]);
                                        } else {
                                          setExemptTeacherIds(prev => prev.filter(id => id !== g.id && id !== g.nama_guru));
                                        }
                                      }}
                                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <div className="font-bold text-gray-900 dark:text-white truncate">
                                        {g.nama_guru}
                                      </div>
                                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                        {g.mata_pelajaran ? `Mapel: ${g.mata_pelajaran}` : (g.nip ? `NIP: ${g.nip}` : 'Guru')}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    isExempt
                                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    {isExempt ? 'Hanya Hari Mengajar' : 'Setiap Hari Kerja'}
                                  </span>
                                </label>
                              );
                            })
                        )}
                      </div>
                    </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-3 uppercase flex items-center gap-2"><i className="fa-regular fa-clock text-xs"></i> Pengaturan Jam Presensi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Datang Buka</label><input type="time" name="jam_datang_mulai" value={config.jam_datang_mulai || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Batas Terlambat</label><input type="time" name="jam_datang_batas" value={config.jam_datang_batas || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Datang Tutup</label><input type="time" name="jam_datang_akhir" value={config.jam_datang_akhir || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Pulang Buka</label><input type="time" name="jam_pulang_mulai" value={config.jam_pulang_mulai || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div>
                          <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                            Jam Pulang Hari Jumat
                          </label>
                          <input 
                            type="time" 
                            name="jam_pulang_jumat" 
                            value={config.jam_pulang_jumat || '11:00'} 
                            onChange={handleChange} 
                            required 
                            className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium" 
                          />
                        </div>
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
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kiri (Yayasan)</label>
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
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kanan (Dinas)</label>
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
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Nama Kota/Kabupaten</label>
                        <input type="text" name="kota_kabupaten" value={config.kota_kabupaten || config.kota_ttd || ''} onChange={handleChange} placeholder="Contoh: Kab. Bolaangmongondow Timur" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
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
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-purple-900 dark:text-purple-300 mb-3 uppercase flex items-center gap-2">
                      <i className="fa-brands fa-google-drive text-xs"></i> Integrasi Google Drive & Upload File
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                        Email Tujuan Upload Berkas (Target Email)
                      </label>
                      <input 
                        type="email" 
                        name="email_tujuan_upload" 
                        value={config.email_tujuan_upload || ''} 
                        onChange={handleChange} 
                        placeholder="Contoh: arsip.sekolah@gmail.com" 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                      />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 flex items-start gap-1">
                        <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                        <span>
                          Alamat email Google Drive tujuan penerima berkas foto selfie presensi, bukti jurnal, dan perangkat pembelajaran melalui integrasi Google Apps Script (GAS).
                        </span>
                      </p>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 text-sm flex justify-center items-center gap-2 mt-4 transition disabled:opacity-50">
                  {loading ? 'Menyimpan...' : <><i className="fa-solid fa-save"></i> Simpan Konfigurasi</>}
                </button>
            </form>
        </div>

        {/* Account Settings Modal */}
        <AccountSettingsModal 
          isOpen={accountModalOpen} 
          onClose={() => setAccountModalOpen(false)} 
          user={user} 
        />
    </section>
  );
}
