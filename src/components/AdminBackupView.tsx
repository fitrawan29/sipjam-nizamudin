'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { formatTimestampWita } from '@/lib/wita';

export default function AdminBackupView({ user }: { user: any }) {
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const webhookUrl = process.env.NEXT_PUBLIC_SPREADSHEET_WEBHOOK_URL;

  useEffect(() => {
    fetchRiwayat();
  }, []);

  const fetchRiwayat = async () => {
    try {
      const { data } = await supabase.from('riwayat_backup').select('*').order('timestamp', { ascending: false });
      if (data) setRiwayat(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBackup = async () => {
    if (!tahun) return Swal.fire('Error', 'Tahun harus diisi', 'error');
    if (!webhookUrl) return Swal.fire('Error', 'Webhook URL belum dikonfigurasi di .env.local', 'error');
    
    // Confirm backup
    const confirm = await Swal.fire({
      title: 'Yakin Backup & Kosongkan Data?',
      text: "Data presensi dan jurnal di database akan dikirim ke Spreadsheet dan dihapus dari sistem ini.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Backup Sekarang!'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    Swal.fire({ title: 'Memproses Backup...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      // 1. Fetch data
      const { data: presensi } = await supabase.from('presensi_guru').select('*');
      const { data: jurnal } = await supabase.from('jurnal_pembelajaran').select('*');

      if ((!presensi || presensi.length === 0) && (!jurnal || jurnal.length === 0)) {
        Swal.fire('Info', 'Tidak ada data presensi atau jurnal untuk dibackup.', 'info');
        setLoading(false);
        return;
      }

      // 2. Post to Webhook (Presensi)
      if (presensi && presensi.length > 0) {
        const resP = await fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify({ table: 'presensi_guru', data: presensi })
        });
        const resPJson = await resP.json();
        if (!resPJson.success) throw new Error("Gagal mengirim presensi ke spreadsheet");
      }

      // 3. Post to Webhook (Jurnal)
      if (jurnal && jurnal.length > 0) {
        const resJ = await fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify({ table: 'jurnal_pembelajaran', data: jurnal })
        });
        const resJJson = await resJ.json();
        if (!resJJson.success) throw new Error("Gagal mengirim jurnal ke spreadsheet");
      }

      // 4. Hapus data dari Supabase (filter by id isnot null)
      await supabase.from('presensi_guru').delete().neq('id', 'dummy');
      await supabase.from('jurnal_pembelajaran').delete().neq('id', 'dummy');

      // 5. Catat riwayat backup
      const newBackup = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        periode: tahun,
        admin: user.nama,
        link_drive: webhookUrl // can be replaced with actual spreadsheet link if known
      };
      await supabase.from('riwayat_backup').insert([newBackup]);

      Swal.fire('Berhasil', 'Backup data berhasil dilakukan dan database dikosongkan.', 'success');
      fetchRiwayat();
    } catch (error: any) {
      Swal.fire('Gagal', error.message || 'Terjadi kesalahan saat membackup data.', 'error');
    }
    setLoading(false);
  };

  const handleRestore = async () => {
    if (!webhookUrl) return Swal.fire('Error', 'Webhook URL belum dikonfigurasi di .env.local', 'error');

    const confirm = await Swal.fire({
      title: 'Tarik Data Kembali?',
      text: "Data dari Spreadsheet akan dimasukkan kembali ke Supabase.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Tarik Data!'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    Swal.fire({ title: 'Menarik Data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const res = await fetch(webhookUrl);
      const json = await res.json();

      if (!json.success || !json.data) throw new Error("Gagal menarik data dari Spreadsheet");

      const presensiToInsert = json.data.filter((r: any) => r.Tabel === 'presensi_guru').map((r: any) => {
        const { Tabel, ...rest } = r;
        return rest;
      });

      const jurnalToInsert = json.data.filter((r: any) => r.Tabel === 'jurnal_pembelajaran').map((r: any) => {
        const { Tabel, ...rest } = r;
        return rest;
      });

      let count = 0;
      if (presensiToInsert.length > 0) {
        await supabase.from('presensi_guru').upsert(presensiToInsert, { ignoreDuplicates: true });
        count += presensiToInsert.length;
      }
      if (jurnalToInsert.length > 0) {
        await supabase.from('jurnal_pembelajaran').upsert(jurnalToInsert, { ignoreDuplicates: true });
        count += jurnalToInsert.length;
      }

      Swal.fire('Berhasil', `Berhasil mengembalikan ${count} baris data ke database.`, 'success');
    } catch (error: any) {
      Swal.fire('Gagal', error.message || 'Terjadi kesalahan saat restore data.', 'error');
    }
    setLoading(false);
  };

  return (
    <section id="view-admin-backup" className="view-section fade-in">
        <div className="glass-card p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-hard-drive text-indigo-500 dark:text-indigo-400"></i> Akses Data & Backup
                </h2>
                <button type="button" onClick={fetchRiwayat} className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center">
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/50 p-4 rounded-2xl mb-4 text-center">
                <h3 className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 mb-2">Lakukan Backup & Restore</h3>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-3">Backup akan memindahkan data transaksi (presensi, jurnal) ke Spreadsheet dan <b>mengosongkan database Supabase</b> agar performa tetap cepat. Gunakan Restore untuk menarik kembali data tersebut ke Supabase.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-2 max-w-sm mx-auto">
                    <input type="number" value={tahun} onChange={e => setTahun(e.target.value)} className="w-full sm:w-24 px-3 py-2.5 text-sm rounded-xl input-premium text-center dark:bg-gray-800 dark:text-white" placeholder="Tahun" />
                    <div className="flex gap-2 flex-grow">
                      <button type="button" onClick={handleBackup} disabled={loading} className="btn-click flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-[10px] font-bold shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50">
                        {loading ? 'Proses...' : <><i className="fa-solid fa-cloud-arrow-up"></i> Backup</>}
                      </button>
                      <button type="button" onClick={handleRestore} disabled={loading} className="btn-click flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-[10px] font-bold shadow-md flex items-center justify-center gap-1.5 transition disabled:opacity-50">
                        {loading ? 'Proses...' : <><i className="fa-solid fa-cloud-arrow-down"></i> Restore</>}
                      </button>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
                  <i className="fa-solid fa-clock-rotate-left mr-1 text-indigo-500 dark:text-indigo-400"></i> Riwayat Backup
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
                              {formatTimestampWita(item.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                </div>
            </div>
        </div>
    </section>
  );
}
