'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { formatTimestampWita } from '@/lib/wita';
import {
  createFullSystemBackupZip,
  restoreFullSystemBackupZip
} from '@/lib/backupEngine';

export default function AdminBackupView({ user }: { user: any }) {
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRiwayat();
  }, [user?.sekolah_id]);

  const fetchRiwayat = async () => {
    try {
      let query = supabase.from('riwayat_backup').select('*');
      if (user?.sekolah_id) {
        query = query.eq('sekolah_id', user.sekolah_id);
      }
      const { data, error } = await query.order('timestamp', { ascending: false });
      if (data && !error) setRiwayat(data);
    } catch (error) {
      console.error('Fetch riwayat backup error:', error);
    }
  };

  const handleBackup = async () => {
    if (!tahun) return Swal.fire('Error', 'Tahun harus diisi', 'error');

    const confirm = await Swal.fire({
      title: 'Cadangkan Seluruh Data Sistem?',
      text: 'Sistem akan mengekspor seluruh 33 entitas database dan aset foto ke dalam berkas ZIP mandiri tanpa menghapus data database.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Buat Berkas ZIP',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    Swal.fire({
      title: 'Membuat Berkas Cadangan ZIP...',
      html: '<div id="swal-backup-progress" class="text-xs text-gray-600 dark:text-gray-300 mt-2">Menghubungi database Supabase...</div>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const { blob, fileName, manifest } = await createFullSystemBackupZip(
        user,
        tahun,
        (step, current, total) => {
          const el = document.getElementById('swal-backup-progress');
          if (el) {
            el.innerText = `${step} (${current}/${total})`;
          }
        }
      );

      // Trigger browser download
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);

      Swal.fire(
        'Berhasil',
        `Berkas cadangan <b>${fileName}</b> berhasil dibuat dan diunduh (${manifest.totalEntities} entitas, ${manifest.assetCount} aset foto).`,
        'success'
      );
      fetchRiwayat();
    } catch (error: any) {
      console.error('[AdminBackupView] Backup error:', error);
      Swal.fire('Gagal', error.message || 'Terjadi kesalahan saat membuat cadangan ZIP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerRestore = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const confirm = await Swal.fire({
      title: 'Pulihkan Data dari Berkas ZIP?',
      html: `Anda akan memulihkan data dari berkas: <b>${file.name}</b>.<br><span class="text-xs text-amber-600 dark:text-amber-400">Proses ini akan memperbarui dan menyinkronkan data database berdasarkan urutan relasional (Level 0 - Level 5).</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Mulai Restore',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    Swal.fire({
      title: 'Memulihkan Data Sistem...',
      html: '<div id="swal-restore-progress" class="text-xs text-gray-600 dark:text-gray-300 mt-2">Membaca arsip ZIP...</div>',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const { restoredTableCount, restoredRowCount } = await restoreFullSystemBackupZip(
        file,
        user,
        (step, current, total) => {
          const el = document.getElementById('swal-restore-progress');
          if (el) {
            el.innerText = `${step} (${current}/${total})`;
          }
        }
      );

      Swal.fire(
        'Pemulihan Selesai',
        `Berhasil memulihkan ${restoredRowCount} baris data dari ${restoredTableCount} tabel.`,
        'success'
      );
      fetchRiwayat();
    } catch (err: any) {
      console.error('[AdminBackupView] Restore error:', err);
      Swal.fire('Gagal Restore', err.message || 'Terjadi kesalahan saat memulihkan data dari ZIP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="view-admin-backup" className="space-y-4 fade-in">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <i className="fa-solid fa-hard-drive text-indigo-500 dark:text-indigo-400"></i> Akses Data &amp; Backup
        </h2>
        <button
          type="button"
          onClick={fetchRiwayat}
          className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
        >
          <i className="fa-solid fa-rotate-right"></i>
        </button>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 text-center">
        <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2">
          Lakukan Backup &amp; Restore
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
          Fitur pencadangan mengemas seluruh 33 entitas database dan aset foto ke dalam berkas ZIP mandiri tanpa menghapus data database. Fitur pemulihan membaca kembali berkas ZIP untuk sinkronisasi database berdasarkan urutan topologis relasional (Level 0 - Level 5).
        </p>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelected}
          accept=".zip"
          className="hidden"
        />
        <div className="flex flex-col sm:flex-row justify-center gap-2 max-w-sm mx-auto">
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="w-full sm:w-24 px-3 py-2.5 text-sm rounded-xl input-premium text-center text-gray-900 dark:text-white bg-white dark:bg-gray-800"
            placeholder="Tahun"
          />
          <div className="flex gap-2 flex-grow">
            <button
              type="button"
              onClick={handleBackup}
              disabled={loading}
              className="btn-click flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                'Proses...'
              ) : (
                <>
                  <i className="fa-solid fa-file-zipper"></i> Unduh Cadangan ZIP
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleTriggerRestore}
              disabled={loading}
              className="btn-click flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {loading ? (
                'Proses...'
              ) : (
                <>
                  <i className="fa-solid fa-upload"></i> Pulihkan dari ZIP
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
          <i className="fa-solid fa-clock-rotate-left text-indigo-500 dark:text-indigo-400"></i> Riwayat Backup
        </h3>
        <div
          id="list-backup-area"
          className="space-y-3 min-h-[150px] max-h-[300px] overflow-y-auto custom-scroll pr-1"
        >
          {riwayat.length === 0 ? (
            <div className="text-center py-5 text-gray-500 text-xs italic dark:text-gray-400">
              Belum ada riwayat backup.
            </div>
          ) : (
            riwayat.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        Backup {item.tahun_backup || item.periode || 'Data'}
                      </span>
                      {item.status && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            item.status === 'Sukses'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {item.keterangan || (item.admin ? `Oleh: ${item.admin}` : 'Backup Transaksi')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-right shrink-0">
                    {formatTimestampWita(item.timestamp)}
                  </div>
                </div>
                {item.link_file && item.link_file !== '-' && (
                  <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
                    {item.link_file.startsWith('http://') || item.link_file.startsWith('https://') ? (
                      <a
                        href={item.link_file}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <i className="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> Tautan File / Webhook
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        <i className="fa-solid fa-file-zipper text-[9px] text-indigo-500"></i> {item.link_file}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
