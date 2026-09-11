'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaTimestamp } from '@/lib/wita';

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

  // New R2 state variables
  const [pertemuanKe, setPertemuanKe] = useState('');
  const [jamKe, setJamKe] = useState('');
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState('');
  const [kehadiranMurid, setKehadiranMurid] = useState('');
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isFetchingAssignments, setIsFetchingAssignments] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [absensi, setAbsensi] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);

  const calculateKehadiranSummary = (abs: Record<string, string>, stList: any[]): string => {
    if (!stList || stList.length === 0) return 'Semua Hadir';
    const counts = { H: 0, S: 0, I: 0, A: 0 };
    const absents: string[] = [];

    stList.forEach(s => {
      const status = (abs[s.nisn] || 'H').toUpperCase();
      if (status === 'H') counts.H++;
      else if (status === 'S') { counts.S++; absents.push(`${s.nama_siswa} (S)`); }
      else if (status === 'I') { counts.I++; absents.push(`${s.nama_siswa} (I)`); }
      else if (status === 'A') { counts.A++; absents.push(`${s.nama_siswa} (A)`); }
    });

    if (counts.S === 0 && counts.I === 0 && counts.A === 0) {
      return `Semua Hadir (${counts.H} siswa)`;
    }
    let summary = `Hadir: ${counts.H}`;
    if (counts.S > 0) summary += `, Sakit: ${counts.S}`;
    if (counts.I > 0) summary += `, Izin: ${counts.I}`;
    if (counts.A > 0) summary += `, Alpa: ${counts.A}`;
    if (absents.length > 0) {
      summary += ` [${absents.join(', ')}]`;
    }
    return summary;
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
          const { data: mapelData } = await supabase
            .from('data_mapel')
            .select('*')
            .order('nama_mata_pelajaran', { ascending: true });
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

          const { data: siswaData } = await supabase
            .from('data_siswa')
            .select('kelas');
          if (siswaData) {
            const uniqueKelas = [...new Set(siswaData.map(s => s.kelas).filter(Boolean))].sort();
            setKelasList(uniqueKelas as string[]);
          }
          setIsFetchingAssignments(false);
          return;
        }

        // Teacher role: query guru_mapel matching nip (user.username) or nama_guru (user.nama)
        let query = supabase.from('guru_mapel').select('*');
        if (user.username && user.nama) {
          query = query.or(`nip.eq.${user.username},nama_guru.ilike.%${user.nama}%`);
        } else if (user.username) {
          query = query.eq('nip', user.username);
        } else if (user.nama) {
          query = query.ilike('nama_guru', `%${user.nama}%`);
        }

        const { data, error } = await query.order('nama_mapel', { ascending: true });

        if (error) {
          console.error('Error fetching guru_mapel:', error);
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
          setKelasList([]);
        }
      } catch (err) {
        console.error('fetchMasterData error:', err);
      } finally {
        setIsFetchingAssignments(false);
      }
    };

    fetchMasterData();
    
    // Set default date
    setTanggal(getWitaDateStr());
  }, [user?.username, user?.nama, user?.role]);

  useEffect(() => {
    // Check Workflow State
    const checkState = async () => {
      if (!user?.nama) return;
      
      const state = await getGuruDailyState(user.nama);
      setDailyState(state);
      
      // Auto-select Tipe Jurnal based on workflow
      if (state.isDinasLuar) {
        setTipeJurnal('Jurnal Kegiatan');
      } else if (state.jadwalKBM && state.jadwalKBM.length > 0) {
        setTipeJurnal('Jurnal KBM');
      } else {
        setTipeJurnal('Jurnal Kegiatan');
      }
    };
    
    checkState();
  }, [user?.nama]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!kelas || tipeJurnal !== 'Jurnal KBM') {
        setStudents([]);
        setAbsensi({});
        setKehadiranMurid('');
        return;
      }
      const { data } = await supabase.from('data_siswa').select('*').eq('kelas', kelas).order('nama_siswa', { ascending: true });
      if (data) {
        setStudents(data);
        const initialAbsensi: Record<string, string> = {};
        data.forEach(s => { initialAbsensi[s.nisn] = 'H'; });
        setAbsensi(initialAbsensi);
        setKehadiranMurid(`Semua Hadir (${data.length} siswa)`);
      }
    };
    fetchStudents();
  }, [kelas, tipeJurnal]);

  const handleAbsensiChange = (nisn: string, status: string) => {
    const newAbsensi = { ...absensi, [nisn]: status };
    setAbsensi(newAbsensi);
    setKehadiranMurid(calculateKehadiranSummary(newAbsensi, students));
  };

  const handleJurnalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let fileUrl = '';
    if (file) {
      try {
        fileUrl = await uploadToDrive(file, user.nama, tipeJurnal, 'Jurnal');
      } catch (err: any) {
        setLoading(false);
        return Swal.fire('Gagal Upload', err.message, 'error');
      }
    }

    const computedKehadiran = tipeJurnal === 'Jurnal KBM'
      ? (kehadiranMurid || calculateKehadiranSummary(absensi, students))
      : 'Hadir';

    const newJurnal = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      nama_guru: user.nama,
      mapel: tipeJurnal === 'Jurnal KBM' ? mapel : '-',
      kelas: tipeJurnal === 'Jurnal KBM' ? kelas : '-',
      tanggal: tanggal,
      materi: materi,
      kegiatan: kegiatan,
      absensi_siswa: JSON.stringify(absensi),
      keterangan: tipeJurnal,
      refleksi: refleksi,
      detail_absen: '',
      link_bukti_foto: fileUrl,
      status_verifikasi: 'Menunggu',
      catatan_khusus_siswa: catatanSiswa,
      // Dual-write new R2 columns
      pertemuan_ke: tipeJurnal === 'Jurnal KBM' ? (pertemuanKe || '1') : '-',
      jam_ke: tipeJurnal === 'Jurnal KBM' ? (jamKe || '1-2') : '-',
      tujuan_pembelajaran: tipeJurnal === 'Jurnal KBM' ? (tujuanPembelajaran || '-') : '-',
      materi_pembelajaran: materi,
      kehadiran_murid: computedKehadiran,
      catatan_refleksi: refleksi || '-',
      foto_kegiatan: fileUrl
    };

    try {
      const { error } = await supabase.from('jurnal_pembelajaran').insert([newJurnal]);

      if (error) {
        Swal.fire('Error', 'Gagal menyimpan jurnal', 'error');
      } else {
        Swal.fire('Berhasil', 'Jurnal berhasil disimpan!', 'success');
        setMateri('');
        setKegiatan('');
        setCatatanSiswa('');
        setRefleksi('');
        setFile(null);
        setPertemuanKe('');
        setJamKe('');
        setTujuanPembelajaran('');
        setKehadiranMurid('');
        // Refresh state to update canPresensiPulang
        getGuruDailyState(user.nama).then(setDailyState).catch(console.error);
      }
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      return Swal.fire('Error', 'Gagal menyimpan jurnal: ' + (err as any).message, 'error');
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
  const isLocked = !!(dailyState?.isLibur || (dailyState && !dailyState.canOpenJurnal) || hasNoKbmAssignments);
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
            
            <form onSubmit={handleJurnalSubmit} className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Jenis Jurnal</label>
                    <select value={tipeJurnal} disabled className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-blue-600 dark:text-blue-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed">
                        <option value={tipeJurnal}>{tipeJurnal} {dailyState?.isDinasLuar ? '(Dinas Luar)' : ''}</option>
                    </select>
                    <p className="text-[9px] text-gray-500 dark:text-white/80 mt-1 italic ml-1">Jenis jurnal diatur otomatis oleh sistem berdasarkan jadwal Anda.</p>
                </div>

                {tipeJurnal === 'Jurnal KBM' && (
                  <>
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
                                Mata Pelajaran {mapelList.length > 0 && user?.role !== 'Admin' && <span className="text-gray-400 dark:text-gray-500 font-normal">({mapelList.length} mapel Anda)</span>}
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
                                Kelas {kelasList.length > 0 && user?.role !== 'Admin' && <span className="text-gray-400 dark:text-gray-500 font-normal">({kelasList.length} kelas Anda)</span>}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                          Pertemuan Ke- <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pertemuanKe}
                          onChange={e => setPertemuanKe(e.target.value)}
                          required={tipeJurnal === 'Jurnal KBM'}
                          placeholder="Contoh: 1 atau 1-2"
                          className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                          Jam Ke- <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={jamKe}
                          onChange={e => setJamKe(e.target.value)}
                          required={tipeJurnal === 'Jurnal KBM'}
                          placeholder="Contoh: 1 - 2 (07.15 - 08.35)"
                          className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Tanggal</label>
                        <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">{tipeJurnal === 'Jurnal KBM' ? 'Materi Pembelajaran' : 'Nama Kegiatan'}</label>
                        <input type="text" value={materi} onChange={e => setMateri(e.target.value)} required className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white" placeholder="..." />
                    </div>
                </div>

                {tipeJurnal === 'Jurnal KBM' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                      Tujuan Pembelajaran <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={tujuanPembelajaran}
                      onChange={e => setTujuanPembelajaran(e.target.value)}
                      required={tipeJurnal === 'Jurnal KBM'}
                      rows={2}
                      className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"
                      placeholder="Tuliskan capaian/tujuan pembelajaran..."
                    />
                  </div>
                )}

                <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                      {tipeJurnal === 'Jurnal KBM' ? 'Kegiatan Pembelajaran' : 'Uraian / Deskripsi'}
                    </label>
                    <textarea value={kegiatan} onChange={e => setKegiatan(e.target.value)} required rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white" placeholder="Deskripsikan selengkapnya..."></textarea>
                </div>

                {tipeJurnal === 'Jurnal KBM' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                      Kehadiran Murid <span className="text-gray-500 dark:text-gray-400 font-normal">(Tersinkronisasi Otomatis)</span>
                    </label>
                    <input
                      type="text"
                      value={kehadiranMurid}
                      onChange={e => setKehadiranMurid(e.target.value)}
                      placeholder="Contoh: Semua Hadir (29 siswa) atau Hadir: 28, Sakit: 1"
                      className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {tipeJurnal === 'Jurnal KBM' && (
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-3 rounded-xl">
                      <label className="block text-[10px] font-bold text-orange-800 dark:text-orange-400 mb-1.5"><i className="fa-solid fa-clipboard-user mr-1"></i> Catatan Khusus Siswa (Opsional)</label>
                      <textarea value={catatanSiswa} onChange={e => setCatatanSiswa(e.target.value)} rows={2} className="w-full px-3 py-2 text-[11px] rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none" placeholder="Misal: Siswa A mengantuk..."></textarea>
                  </div>
                )}
                
                {tipeJurnal === 'Jurnal KBM' && students.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3 rounded-xl fade-in">
                    <h3 className="text-[11px] font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-users text-blue-500 dark:text-blue-400"></i> Live Absensi Kelas {kelas}
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll pr-1">
                      {students.map((siswa, idx) => (
                        <div key={siswa.nisn} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-white/80 w-4">{idx + 1}.</span>
                            <div>
                              <div className="text-xs font-bold text-gray-900 dark:text-white">{siswa.nama_siswa}</div>
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
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Upload Foto / Dokumen <span className="text-red-500 dark:text-red-400">(Wajib)</span></label>
                    <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Catatan Refleksi (Opsional)</label>
                    <textarea value={refleksi} onChange={e => setRefleksi(e.target.value)} rows={1} className="w-full px-3 py-2 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white"></textarea>
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
