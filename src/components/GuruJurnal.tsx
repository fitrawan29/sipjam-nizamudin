'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function GuruJurnal({ user }: { user: any }) {
  const [tipeJurnal, setTipeJurnal] = useState('Reguler');
  const [mapel, setMapel] = useState('');
  const [kelas, setKelas] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [materi, setMateri] = useState('');
  const [kegiatan, setKegiatan] = useState('');
  const [catatanSiswa, setCatatanSiswa] = useState('');
  const [refleksi, setRefleksi] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [hasScheduleToday, setHasScheduleToday] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch Mapel and Kelas on mount
    const fetchMasterData = async () => {
      const { data: mapelData } = await supabase.from('data_mapel').select('*');
      if (mapelData) setMapelList(mapelData);

      const { data: siswaData } = await supabase.from('data_siswa').select('kelas');
      if (siswaData) {
        const uniqueKelas = [...new Set(siswaData.map(s => s.kelas).filter(Boolean))].sort();
        setKelasList(uniqueKelas as string[]);
      }
    };
    fetchMasterData();
    
    // Set default date
    setTanggal(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    // Check if the teacher has a schedule on the selected date
    const checkSchedule = async () => {
      if (!tanggal || !user?.nama) return;
      
      const selectedDate = new Date(tanggal);
      const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const selectedHari = hariList[selectedDate.getDay()];
      
      const { data: jadwalData } = await supabase
        .from('jadwal_pelajaran')
        .select('*')
        .eq('hari', selectedHari)
        .eq('nama_guru', user.nama);
      
      if (jadwalData && jadwalData.length > 0) {
        setHasScheduleToday(true);
        setTipeJurnal('Jurnal KBM');
      } else {
        setHasScheduleToday(false);
        setTipeJurnal('Jurnal Kegiatan');
      }
    };
    
    checkSchedule();
  }, [tanggal, user?.nama]);

  const handleJurnalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fileUrl = file ? 'https://example.com/jurnal-file.jpg' : '';

    const newJurnal = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      nama_guru: user.nama,
      mapel: mapel,
      kelas: kelas,
      tanggal: tanggal,
      materi: materi,
      kegiatan: kegiatan,
      absensi_siswa: '[]', // Mocked for now, in real app needs live student checklist
      keterangan: tipeJurnal,
      refleksi: refleksi,
      detail_absen: '',
      link_bukti_foto: fileUrl,
      status_verifikasi: 'Menunggu',
      catatan_khusus_siswa: catatanSiswa
    };

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
    }
    setLoading(false);
  };

  return (
    <section id="view-guru-jurnal" className="view-section fade-in">
        <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
                <i className="fa-solid fa-book-journal-whills text-blue-500"></i> Form Jurnal
            </h2>
            
            <form onSubmit={handleJurnalSubmit} className="space-y-4">
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Jenis Jurnal</label>
                    <select value={tipeJurnal} onChange={e => setTipeJurnal(e.target.value)} className="w-full px-3 py-3 text-sm rounded-xl input-premium font-bold text-blue-600 dark:text-blue-400">
                      {hasScheduleToday === true ? (
                        <option value="Jurnal KBM">Jurnal KBM (Ada Jadwal)</option>
                      ) : hasScheduleToday === false ? (
                        <option value="Jurnal Kegiatan">Jurnal Kegiatan (Tidak Ada Jadwal)</option>
                      ) : (
                        <option value="">Memuat jadwal...</option>
                      )}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3 fade-in">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Mata Pelajaran</label>
                        <select value={mapel} onChange={e => setMapel(e.target.value)} required className="w-full px-3 py-3 text-sm rounded-xl input-premium">
                          <option value="" disabled>Pilih...</option>
                          {mapelList.map(m => (
                            <option key={m.id} value={m.nama_mata_pelajaran}>{m.nama_mata_pelajaran}</option>
                          ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Kelas</label>
                        <select value={kelas} onChange={e => setKelas(e.target.value)} required className="w-full px-3 py-3 text-sm rounded-xl input-premium">
                          <option value="" disabled>Pilih...</option>
                          {kelasList.map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Tanggal</label>
                        <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required className="w-full px-3 py-2.5 text-sm rounded-xl input-premium" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Materi Pokok</label>
                        <input type="text" value={materi} onChange={e => setMateri(e.target.value)} required className="w-full px-3 py-2.5 text-sm rounded-xl input-premium" placeholder="..." />
                    </div>
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Uraian / Deskripsi</label>
                    <textarea value={kegiatan} onChange={e => setKegiatan(e.target.value)} required rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none" placeholder="Deskripsikan selengkapnya..."></textarea>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-3 rounded-xl">
                    <label className="block text-[10px] font-bold text-orange-800 dark:text-orange-400 mb-1.5"><i className="fa-solid fa-clipboard-user mr-1"></i> Catatan Khusus Siswa (Opsional)</label>
                    <textarea value={catatanSiswa} onChange={e => setCatatanSiswa(e.target.value)} rows={2} className="w-full px-3 py-2 text-[11px] rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-gray-800 resize-none" placeholder="Misal: Siswa A mengantuk..."></textarea>
                </div>
                
                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Upload Foto Jurnal (Opsional)</label>
                    <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800" />
                </div>

                <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1.5 ml-1">Refleksi Pembelajaran (Opsional)</label>
                    <textarea value={refleksi} onChange={e => setRefleksi(e.target.value)} rows={1} className="w-full px-3 py-2 text-sm rounded-xl input-premium resize-none"></textarea>
                </div>
                
                <div className="pt-2">
                    <button type="submit" disabled={loading} className="btn-click w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? 'Memproses...' : <><i className="fa-solid fa-save"></i> Simpan Jurnal</>}
                    </button>
                </div>
            </form>
        </div>
    </section>
  );
}
