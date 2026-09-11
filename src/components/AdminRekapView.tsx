'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay } from '@/lib/wita';
import { PrintHeader, PrintSignature } from './PrintHeader';

export default function AdminRekapView({ user }: { user: any }) {
  const [bulan, setBulan] = useState(() => {
    return getWitaDateStr().substring(0, 7);
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [rekapData, setRekapData] = useState<{presensi: any[], jurnal: any[]} | null>(null);

  const tarikDataRekap = async (isCustom: boolean = false) => {
    setLoading(true);
    try {
      let start, end;
      if (isCustom && startDate && endDate) {
        start = getWitaStartOfDay(startDate);
        end = getWitaEndOfDay(endDate);
      } else if (bulan) {
        const year = parseInt(bulan.split('-')[0], 10);
        const month = parseInt(bulan.split('-')[1], 10);
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        start = getWitaStartOfDay(firstDay);
        end = getWitaEndOfDay(lastDayStr);
      } else {
        setLoading(false);
        return;
      }

      const { data: presensi } = await supabase
        .from('presensi_guru')
        .select('*')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .eq('status_verifikasi', 'Disetujui');

      const { data: jurnal } = await supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .eq('status_verifikasi', 'Disetujui');

      // Process presensi
      const pMap: Record<string, any> = {};
      presensi?.forEach(p => {
        const nama = p.nama_guru;
        if (!pMap[nama]) pMap[nama] = { hadir: 0, izin: 0, sakit: 0, dinasLuar: 0, telatDetik: 0 };
        if (p.tipe_absen === 'Datang') {
          if (p.jenis_presensi === 'Sekolah') {
            pMap[nama].hadir++;
            pMap[nama].telatDetik += (p.keterlambatan_detik || 0);
          }
          else if (p.jenis_presensi === 'Dinas Luar') pMap[nama].dinasLuar++;
          else if (p.jenis_presensi === 'Izin') {
            if (p.detail_izin?.includes('Sakit')) pMap[nama].sakit++;
            else pMap[nama].izin++;
          }
        }
      });

      const pArr = Object.keys(pMap).map(k => {
        const telat = pMap[k].telatDetik;
        const alpaOtomatis = Math.floor(telat / 14400); // 4 hours = 14400 seconds
        const hadirEfektif = Math.max(0, pMap[k].hadir - alpaOtomatis);
        return { 
          nama: k, 
          ...pMap[k],
          alpa: alpaOtomatis,
          hadir: hadirEfektif
        };
      }).sort((a,b) => a.nama.localeCompare(b.nama));

      // Process jurnal
      const jMap: Record<string, number> = {};
      jurnal?.forEach(j => {
        const nama = j.nama_guru;
        if (!jMap[nama]) jMap[nama] = 0;
        jMap[nama]++;
      });
      const jArr = Object.keys(jMap).map(k => ({ nama: k, total: jMap[k] })).sort((a,b) => b.total - a.total);

      setRekapData({ presensi: pArr, jurnal: jArr });
    } catch (error) {
      console.error('Rekap load error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="view-admin-rekap" className="view-section fade-in">
        <div className="glass-card p-4">
            <PrintHeader />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5 flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-blue-500 dark:text-blue-400 no-print"></i> Rekapitulasi Akhir
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl mb-5 no-print">
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-2">Pilih Bulan</label>
                <div className="flex gap-2">
                    <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="flex-grow px-3 py-2.5 rounded-xl input-premium text-sm bg-white dark:bg-gray-800 dark:text-white" />
                    <button type="button" onClick={() => tarikDataRekap(false)} disabled={loading} className="btn-click bg-blue-600 text-white px-4 rounded-xl text-xs font-bold shadow-md border border-blue-700 hover:bg-blue-700 disabled:opacity-50">
                      {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                    </button>
                </div>
            </div>
            <details className="mb-5 text-sm group no-print">
                <summary className="font-bold text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer outline-none flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <i className="fa-solid fa-caret-right transition-transform group-open:rotate-90"></i> Filter Rentang Khusus
                </summary>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">DARI</label>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-700 dark:text-white" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[9px] text-gray-500 dark:text-gray-400 mb-1">SAMPAI</label>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium dark:bg-gray-700 dark:text-white" />
                        </div>
                    </div>
                    <button type="button" onClick={() => tarikDataRekap(true)} disabled={loading} className="btn-click w-full bg-gray-800 dark:bg-gray-600 text-white py-2 rounded-lg text-[11px] font-bold shadow-sm hover:bg-gray-900 transition disabled:opacity-50">Tarik Data Custom</button>
                </div>
            </details>
            
            {rekapData ? (
              <div id="hasil-rekap" className="space-y-5 fade-in">
                  <div>
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-user-check text-green-500 dark:text-green-400 no-print"></i> Kehadiran Guru
                      </h3>
                      <div id="card-rekap-presensi" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {rekapData.presensi.map((p, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-sm">
                            <h4 className="text-[11px] font-bold text-gray-800 dark:text-gray-100 mb-2 truncate" title={p.nama}>{p.nama}</h4>
                            <div className="grid grid-cols-3 gap-1 text-center">
                              <div className="bg-green-50 dark:bg-green-900/30 rounded p-1"><div className="text-[8px] text-green-600 dark:text-green-400 font-bold">HADIR</div><div className="text-xs font-black text-green-700 dark:text-green-300">{p.hadir}</div></div>
                              <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-1"><div className="text-[8px] text-blue-600 dark:text-blue-400 font-bold">DINAS</div><div className="text-xs font-black text-blue-700 dark:text-blue-300">{p.dinasLuar}</div></div>
                              <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-1"><div className="text-[8px] text-yellow-600 dark:text-yellow-400 font-bold">SAKIT</div><div className="text-xs font-black text-yellow-700 dark:text-yellow-300">{p.sakit}</div></div>
                              <div className="bg-orange-50 dark:bg-orange-900/30 rounded p-1"><div className="text-[8px] text-orange-600 dark:text-orange-400 font-bold">IZIN</div><div className="text-xs font-black text-orange-700 dark:text-orange-300">{p.izin}</div></div>
                              <div className="bg-red-50 dark:bg-red-900/30 rounded p-1"><div className="text-[8px] text-red-600 dark:text-red-400 font-bold">ALPA</div><div className="text-xs font-black text-red-700 dark:text-red-300">{p.alpa}</div></div>
                              <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-1" title={`${p.telatDetik} detik`}><div className="text-[8px] text-slate-600 dark:text-slate-400 font-bold">TELAT</div><div className="text-xs font-black text-slate-700 dark:text-slate-300">{Math.floor(p.telatDetik / 3600)}j {Math.floor((p.telatDetik % 3600) / 60)}m</div></div>
                            </div>
                          </div>
                        ))}
                        {rekapData.presensi.length === 0 && <div className="text-[10px] text-gray-400 dark:text-gray-500 italic">Tidak ada data presensi.</div>}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 border-t dark:border-gray-800 pt-4">
                        <i className="fa-solid fa-book text-blue-500 dark:text-blue-400 no-print"></i> Total Jurnal Disetujui
                      </h3>
                      <div id="card-rekap-jurnal" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {rekapData.jurnal.map((j, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-2 shadow-sm text-center flex flex-col justify-center">
                            <h4 className="text-[9px] font-bold text-gray-600 dark:text-gray-400 mb-1 truncate" title={j.nama}>{j.nama}</h4>
                            <div className="text-lg font-black text-blue-600 dark:text-blue-400">{j.total}</div>
                            <div className="text-[8px] text-gray-400 dark:text-gray-400">JURNAL</div>
                          </div>
                        ))}
                        {rekapData.jurnal.length === 0 && <div className="text-[10px] text-gray-400 dark:text-gray-500 italic">Tidak ada data jurnal.</div>}
                      </div>
                  </div>
                  
                  <PrintSignature />
                  
                  <div className="pt-2 border-t dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 no-print">
                      <button type="button" onClick={() => {
                        if (!rekapData || rekapData.presensi.length === 0) return;
                        const headers = ['No', 'Nama Guru', 'Hadir', 'Dinas Luar', 'Sakit', 'Izin', 'Jurnal Disetujui'];
                        const csvRows = [headers.join(',')];
                        rekapData.presensi.forEach((r: any, i: number) => {
                          const j = rekapData.jurnal.find(j => j.nama === r.nama);
                          const jCount = j ? j.total : 0;
                          csvRows.push([i+1, `"${r.nama}"`, r.hadir||0, r.dinasLuar||0, r.sakit||0, r.izin||0, jCount].join(','));
                        });
                        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Rekap_Guru_${bulan || 'custom'}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }} className="btn-click w-full bg-green-600 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                        <i className="fa-solid fa-file-excel"></i> Excel
                      </button>
                      <button type="button" onClick={() => window.print()} className="btn-click w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                        <i className="fa-solid fa-print"></i> Cetak Halaman
                      </button>
                  </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 text-xs italic dark:text-gray-500 no-print">
                Pilih bulan atau rentang khusus untuk menarik rekap.
              </div>
            )}
        </div>
    </section>
  );
}
