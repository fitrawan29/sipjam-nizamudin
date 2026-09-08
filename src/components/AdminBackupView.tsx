'use client';

import { useState } from 'react';

export default function AdminBackupView({ user }: { user: any }) {
  const [tahun, setTahun] = useState('');

  return (
    <section id="view-admin-backup" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-hard-drive text-indigo-500"></i> Akses Data & Backup
                </h2>
                <button type="button" className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 text-center">
                <h3 className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 mb-2">Lakukan Backup Manual</h3>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-3">Backup akan memindahkan data transaksi ke file Excel di Google Drive dan <b>mengosongkan data lama</b> dari aplikasi agar performa tetap cepat. Data yang dihapus hanya transaksi (presensi, jurnal, dll), sedangkan data Master tetap utuh.</p>
                <div className="flex justify-center gap-2 max-w-sm mx-auto">
                    <input type="number" value={tahun} onChange={e => setTahun(e.target.value)} className="w-24 px-3 py-2 text-sm rounded-xl input-premium text-center dark:bg-gray-800 dark:text-white" placeholder="Tahun" />
                    <button type="button" className="btn-click flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                      <i className="fa-solid fa-cloud-arrow-up"></i> Proses Backup
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
                  <i className="fa-solid fa-clock-rotate-left mr-1 text-indigo-500"></i> Riwayat Backup / Akses Data
                </h3>
                <div id="list-backup-area" className="space-y-3 min-h-[150px]">
                    <div className="text-center py-5 text-gray-400 text-[11px] italic dark:text-gray-500">Belum ada riwayat backup.</div>
                </div>
            </div>
        </div>
    </section>
  );
}
