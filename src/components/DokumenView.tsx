'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaTimestamp, formatTimestampWita } from '@/lib/wita';

export default function DokumenView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'list'|'upload'>('list');
  const [judul, setJudul] = useState('');
  const [jenis, setJenis] = useState('');
  const [search, setSearch] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dokumenList, setDokumenList] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (activeTab === 'list' && (user?.role === 'Admin' || user?.nama)) {
      loadDokumen();
    }
  }, [activeTab, user]);

  const loadDokumen = async () => {
    try {
      setFetching(true);
      let query = supabase
        .from('bank_dokumen')
        .select('*')
        .order('timestamp', { ascending: false });

      // If user is not Admin, filter by the teacher's name. If Admin, fetch all documents.
      if (user?.role !== 'Admin') {
        query = query.eq('nama_guru', user.nama);
      }

      const { data, error } = await query;

      if (!error && data) {
        setDokumenList(data);
      } else if (error) {
        console.error('Dokumen load error:', error);
      }
    } catch (err) {
      console.error('Dokumen load error:', err);
    } finally {
      setFetching(false);
    }
  };

  const handleVerifyDokumen = async (id: string, status: 'Disetujui' | 'Ditolak') => {
    let catatan = '';
    if (status === 'Ditolak') {
      const { value: text } = await Swal.fire({
        title: 'Tolak Dokumen',
        input: 'textarea',
        inputLabel: 'Catatan / Alasan Penolakan',
        inputPlaceholder: 'Tuliskan catatan perbaikan untuk guru...',
        showCancelButton: true,
        confirmButtonText: 'Tolak Dokumen',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Batal',
        inputValidator: (val) => (!val ? 'Catatan perbaikan wajib diisi saat menolak dokumen!' : null)
      });
      if (text === undefined) return;
      catatan = text;
    } else {
      const { value: text } = await Swal.fire({
        title: 'Setujui Dokumen',
        input: 'text',
        inputLabel: 'Catatan Admin (Opsional)',
        inputPlaceholder: 'Contoh: Perangkat pembelajaran telah sesuai standar',
        showCancelButton: true,
        confirmButtonText: 'Ya, Setujui',
        confirmButtonColor: '#16a34a',
        cancelButtonText: 'Batal'
      });
      if (text === undefined) return;
      catatan = text || 'Disetujui oleh Admin';
    }

    setFetching(true);
    const { error } = await supabase
      .from('bank_dokumen')
      .update({
        status_verifikasi: status,
        catatan_admin: catatan
      })
      .eq('id', id);

    setFetching(false);
    if (error) {
      Swal.fire('Gagal Verifikasi', error.message, 'error');
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Verifikasi Berhasil',
        text: `Status dokumen telah diubah menjadi ${status}.`,
        timer: 1500,
        showConfirmButton: false
      });
      loadDokumen();
    }
  };

  const submitDokumen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenis || !judul || !file) {
      Swal.fire('Peringatan', 'Mohon lengkapi semua data', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Upload the file to Google Drive using Webhook
      let fileUrl = '';
      if (file) {
        try {
          fileUrl = await uploadToDrive(file, user.nama, 'Perangkat_Pembelajaran', 'Dokumen');
        } catch (err: any) {
          setLoading(false);
          return Swal.fire('Gagal Upload', err.message, 'error');
        }
      }

      const newDokumen = {
        id: crypto.randomUUID(),
        timestamp: getWitaTimestamp(),
        nama_guru: user.nama,
        jenis_dokumen: jenis,
        judul: judul,
        link_file: fileUrl,
        status_verifikasi: 'Menunggu',
        catatan_admin: ''
      };

      const { error } = await supabase.from('bank_dokumen').insert([newDokumen]);

      if (error) {
        Swal.fire('Error', 'Gagal mengupload dokumen: ' + error.message, 'error');
      } else {
        Swal.fire('Berhasil', 'Dokumen berhasil diupload dan menunggu verifikasi', 'success');
        setJenis('');
        setJudul('');
        setFile(null);
        setActiveTab('list');
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal menyimpan dokumen: ' + (err as any).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDokumen = dokumenList.filter(dok => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (dok.judul || '').toLowerCase().includes(term) ||
      (dok.jenis_dokumen || '').toLowerCase().includes(term) ||
      (dok.nama_guru || '').toLowerCase().includes(term) ||
      (dok.status_verifikasi || '').toLowerCase().includes(term)
    );
  });

  return (
    <section id="view-dokumen" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-folder-open text-amber-500 dark:text-amber-400"></i> Perangkat Pembelajaran {user?.role === 'Admin' ? '(Semua Guru)' : ''}
                </h2>
                <button type="button" onClick={loadDokumen} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className={`fa-solid fa-rotate-right ${fetching ? 'animate-spin' : ''}`}></i>
                </button>
            </div>
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1">
                <button 
                  type="button" 
                  onClick={() => setActiveTab('list')} 
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 shadow-sm border ${activeTab === 'list' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : 'border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-700'}`}
                >
                  Daftar Dokumen {dokumenList.length > 0 ? `(${dokumenList.length})` : ''}
                </button>
                <button 
                  type="button" 
                  onClick={() => setActiveTab('upload')} 
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 border ${activeTab === 'upload' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : 'border-gray-200 text-gray-700 dark:text-gray-200 dark:border-gray-700'}`}
                >
                  Upload Baru
                </button>
            </div>
            
            {activeTab === 'list' && (
              <>
                <div className="relative mb-4">
                  <i className="fa-solid fa-search absolute left-3.5 top-3 text-gray-400 dark:text-gray-400 text-xs"></i>
                  <input 
                    type="text" 
                    value={search} 
                    onChange={e => setSearch(e.target.value)} 
                    placeholder="Cari dokumen, jenis, atau nama guru..." 
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" 
                  />
                </div>

                <div id="dokumen-content-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px] content-start">
                  {fetching ? (
                    <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-white/80">Memuat data dokumen...</div>
                  ) : filteredDokumen.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-white/80">
                      {search ? 'Tidak ditemukan dokumen yang cocok dengan pencarian.' : 'Belum ada dokumen yang diupload.'}
                    </div>
                  ) : (
                    filteredDokumen.map((dok: any) => (
                      <div key={dok.id} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between gap-3 hover:shadow-md transition">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">{dok.jenis_dokumen}</h3>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                dok.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                dok.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>{dok.status_verifikasi || 'Menunggu'}</span>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{dok.judul}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-600 dark:text-gray-300">
                            <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                              <i className="fa-solid fa-chalkboard-user text-amber-500 dark:text-amber-400"></i> {dok.nama_guru || 'Guru'}
                            </span>
                            <span>•</span>
                            <span>{formatTimestampWita(dok.timestamp)}</span>
                          </div>
                          
                          {dok.catatan_admin && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-[10px] border border-gray-100 dark:border-gray-700">
                              <span className="font-bold block mb-0.5 text-gray-900 dark:text-white">Catatan Admin:</span>
                              <span className="text-gray-700 dark:text-gray-300 italic">{dok.catatan_admin}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 space-y-2">
                          {dok.link_file && dok.link_file !== '-' && (
                            <a href={dok.link_file} target="_blank" rel="noreferrer" className="w-full block text-center text-[11px] font-bold bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 rounded-lg transition-colors shadow-sm">
                              <i className="fa-solid fa-file-pdf mr-1.5 text-red-500 dark:text-red-400"></i> Buka Dokumen
                            </a>
                          )}

                          {/* Admin Verification Action Buttons */}
                          {user?.role === 'Admin' && (
                            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                              <button 
                                type="button" 
                                onClick={() => handleVerifyDokumen(dok.id, 'Disetujui')}
                                className="btn-click flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold py-1.5 rounded-lg transition shadow-sm flex items-center justify-center gap-1"
                              >
                                <i className="fa-solid fa-check text-[10px]"></i> Setujui
                              </button>
                              <button 
                                type="button" 
                                onClick={() => handleVerifyDokumen(dok.id, 'Ditolak')}
                                className="btn-click flex-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold py-1.5 rounded-lg transition shadow-sm flex items-center justify-center gap-1"
                              >
                                <i className="fa-solid fa-xmark text-[10px]"></i> Tolak
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'upload' && (
              <div id="dokumen-content-upload" className="fade-in">
                  <form onSubmit={submitDokumen} className="space-y-4">
                      <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Jenis Dokumen</label>
                          <select required value={jenis} onChange={e => setJenis(e.target.value)} className="w-full px-3 py-3 text-sm rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800">
                              <option value="" disabled>Pilih Jenis...</option>
                              <option value="Analisis Capaian Pembelajaran">Analisis Capaian Pembelajaran</option>
                              <option value="Alur Tujuan Pembelajaran">Alur Tujuan Pembelajaran</option>
                              <option value="Rencana Pekan Efektif">Rencana Pekan Efektif</option>
                              <option value="Program Tahunan">Program Tahunan</option>
                              <option value="Program Semester">Program Semester</option>
                              <option value="Rencana Pembelajaran Mendalam">Rencana Pembelajaran Mendalam</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Judul / Deskripsi</label>
                          <input type="text" required value={judul} onChange={e => setJudul(e.target.value)} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium text-gray-900 dark:text-white bg-white dark:bg-gray-800" placeholder="Contoh: Modul Ajar Bab 1 Kelas X" />
                      </div>
                      <div>
                          <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1"><i className="fa-solid fa-asterisk text-red-500 dark:text-red-400 text-[9px] mr-1"></i>File PDF/Gambar (Bisa lebih dari 1)</label>
                          <input type="file" required accept=".pdf,image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                      </div>
                      <div className="pt-2">
                          <button type="submit" disabled={loading} className="btn-click w-full bg-amber-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-amber-900/20 text-sm flex items-center justify-center gap-2 hover:bg-amber-700 transition disabled:opacity-50">
                            {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>} {loading ? 'Mengupload...' : 'Upload'}
                          </button>
                      </div>
                  </form>
              </div>
            )}
        </div>
    </section>
  );
}
