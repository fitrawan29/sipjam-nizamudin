'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function AdminBackupView({ user }: { user: any }) {
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRiwayat();
  }, []);

  const fetchRiwayat = async () => {
    const { data } = await supabase.from('riwayat_backup').select('*').order('timestamp', { ascending: false });
    if (data) setRiwayat(data);
  };

  const handleBackup = async () => {
    if (!tahun) return Swal.fire('Error', 'Tahun harus diisi', 'error');
    
    setLoading(true);
    // Simulate delay for backup process
    Swal.fire({
      title: 'Memproses Backup...',
      text: 'Mengekspor data ke format Excel dan mengirim ke Google Drive...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    const newBackup = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      periode: tahun,
      admin: user.nama,
      link_drive: 'https://docs.google.com/spreadsheets/d/simulasi-link-drive/edit'
    };

    const { error } = await supabase.from('riwayat_backup').insert([newBackup]);

    setLoading(false);
    if (error) {
      Swal.fire('Gagal', 'Terjadi kesalahan saat membackup data.', 'error');
    } else {
      Swal.fire('Berhasil', 'Backup data berhasil dilakukan. Cek link di riwayat.', 'success');
      fetchRiwayat();
    }
  };

  return (
    <section id="view-admin-backup" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-hard-drive text-indigo-500"></i> Akses Data & Backup
                </h2>
                <button type="button" onClick={fetchRiwayat} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 text-center">
                <h3 className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 mb-2">Lakukan Backup Manual</h3>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-3">Backup akan memindahkan data transaksi ke file Excel di Google Drive dan <b>mengosongkan data lama</b> dari aplikasi agar performa tetap cepat. Data yang dihapus hanya transaksi (presensi, jurnal, dll), sedangkan data Master tetap utuh.</p>
                <div className="flex justify-center gap-2 max-w-sm mx-auto">
                    <input type="number" value={tahun} onChange={e => setTahun(e.target.value)} className="w-24 px-3 py-2 text-sm rounded-xl input-premium text-center dark:bg-gray-800 dark:text-white" placeholder="Tahun" />
                    <button type="button" onClick={handleBackup} disabled={loading} className="btn-click flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
                      {loading ? 'Memproses...' : <><i className="fa-solid fa-cloud-arrow-up"></i> Proses Backup</>}
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
                  <i className="fa-solid fa-clock-rotate-left mr-1 text-indigo-500"></i> Riwayat Backup / Akses Data
                </h3>
                <div id="list-backup-area" className="space-y-3 min-h-[150px] max-h-[300px] overflow-y-auto custom-scroll pr-1">
                    {riwayat.length === 0 ? (
                      <div className="text-center py-5 text-gray-400 text-[11px] italic dark:text-gray-500">Belum ada riwayat backup.</div>
                    ) : (
                      riwayat.map(item => (
                        <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">Backup {item.periode}</div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">Oleh: {item.admin}</div>
                            </div>
                            <div className="text-[9px] text-gray-400 text-right">
                              {new Date(item.timestamp).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          </div>
                          <a href={item.link_drive} target="_blank" rel="noreferrer" className="mt-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-bold py-1.5 px-3 rounded-lg text-center border border-green-200 dark:border-green-800/50 hover:bg-green-100 transition">
                            <i className="fa-solid fa-file-excel mr-1"></i> Buka File Excel
                          </a>
                        </div>
                      ))
                    )}
                </div>
            </div>
        </div>
    </section>
  );
}
