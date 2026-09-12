'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay } from '@/lib/wita';
import { PrintHeader, PrintSignature, PrintOrientationToggle, formatPeriodHeader } from './PrintHeader';

export default function AdminRekapView({ user }: { user: any }) {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [bulan, setBulan] = useState(() => {
    return getWitaDateStr().substring(0, 7);
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [rekapData, setRekapData] = useState<{presensi: any[], jurnal: any[], piket: any[]} | null>(null);

  useEffect(() => {
    tarikDataRekap(false);
  }, []);

  const tarikDataRekap = async (isCustom: boolean = false) => {
    setLoading(true);
    try {
      let start: string, end: string;
      let startDateStr: string, endDateStr: string;

      if (isCustom && startDate && endDate) {
        start = getWitaStartOfDay(startDate);
        end = getWitaEndOfDay(endDate);
        startDateStr = startDate;
        endDateStr = endDate;
      } else if (bulan) {
        const year = parseInt(bulan.split('-')[0], 10);
        const month = parseInt(bulan.split('-')[1], 10);
        const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        start = getWitaStartOfDay(firstDay);
        end = getWitaEndOfDay(lastDayStr);
        startDateStr = firstDay;
        endDateStr = lastDayStr;
      } else {
        setLoading(false);
        return;
      }

      // 1. Fetch all teachers from data_guru to seed the map (ensures 0 attendance teachers appear)
      const { data: guruList } = await supabase
        .from('data_guru')
        .select('nama_guru')
        .order('nama_guru', { ascending: true });

      // 2. Fetch presensi_guru
      const { data: presensi } = await supabase
        .from('presensi_guru')
        .select('*')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .eq('status_verifikasi', 'Disetujui');

      // 3. Fetch jurnal_pembelajaran
      const { data: jurnal } = await supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .eq('status_verifikasi', 'Disetujui');

      // 4. Fetch laporan_piket
      const { data: piket } = await supabase
        .from('laporan_piket')
        .select('guru_pelapor, tanggal, status_verifikasi')
        .gte('tanggal', startDateStr)
        .lte('tanggal', endDateStr)
        .eq('status_verifikasi', 'Disetujui');

      // Seed map with all teachers from data_guru
      const pMap: Record<string, any> = {};
      guruList?.forEach(g => {
        if (g.nama_guru) {
          pMap[g.nama_guru] = {
            nama: g.nama_guru,
            hadir: 0,
            izin: 0,
            sakit: 0,
            dinasLuar: 0,
            telatDetik: 0,
            piket: 0,
            jurnal: 0
          };
        }
      });

      // Aggregate presensi
      presensi?.forEach(p => {
        const nama = p.nama_guru;
        if (!nama) return;
        if (!pMap[nama]) {
          pMap[nama] = {
            nama,
            hadir: 0,
            izin: 0,
            sakit: 0,
            dinasLuar: 0,
            telatDetik: 0,
            piket: 0,
            jurnal: 0
          };
        }
        if (p.tipe_absen === 'Datang') {
          if (p.jenis_presensi === 'Sekolah') {
            pMap[nama].hadir++;
            pMap[nama].telatDetik += (p.keterlambatan_detik || 0);
          } else if (p.jenis_presensi === 'Dinas Luar') {
            pMap[nama].dinasLuar++;
          } else if (p.jenis_presensi === 'Izin') {
            if (p.detail_izin?.includes('Sakit')) pMap[nama].sakit++;
            else pMap[nama].izin++;
          }
        }
      });

      // Aggregate jurnal
      const jMap: Record<string, number> = {};
      jurnal?.forEach(j => {
        const nama = j.nama_guru;
        if (!nama) return;
        if (pMap[nama]) pMap[nama].jurnal++;
        jMap[nama] = (jMap[nama] || 0) + 1;
      });

      // Aggregate piket
      const pkMap: Record<string, number> = {};
      piket?.forEach(pk => {
        const nama = pk.guru_pelapor;
        if (!nama) return;
        if (pMap[nama]) pMap[nama].piket++;
        pkMap[nama] = (pkMap[nama] || 0) + 1;
      });

      const pArr = Object.keys(pMap).map(k => {
        const telat = pMap[k].telatDetik;
        const alpaOtomatis = Math.floor(telat / 14400); // 4 hours = 14400 seconds
        const hadirEfektif = Math.max(0, pMap[k].hadir - alpaOtomatis);
        return { 
          ...pMap[k],
          alpa: alpaOtomatis,
          hadir: hadirEfektif
        };
      }).sort((a, b) => a.nama.localeCompare(b.nama));

      const jArr = Object.keys(jMap).map(k => ({ nama: k, total: jMap[k] })).sort((a, b) => b.total - a.total);
      const piketArr = Object.keys(pkMap).map(k => ({ nama: k, total: pkMap[k] })).sort((a, b) => b.total - a.total);

      setRekapData({ presensi: pArr, jurnal: jArr, piket: piketArr });
    } catch (error) {
      console.error('Rekap load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPresensi = (rekapData?.presensi || []).filter(p =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  );

  // Summary counts
  const totalGuru = rekapData?.presensi?.length || 0;
  const totalHadirSemua = rekapData?.presensi?.reduce((acc, curr) => acc + (curr.hadir || 0), 0) || 0;
  const totalJurnalSemua = rekapData?.jurnal?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;
  const totalPiketSemua = rekapData?.piket?.reduce((acc, curr) => acc + (curr.total || 0), 0) || 0;

  return (
    <section id="view-admin-rekap" className="view-section fade-in">
        <div className="glass-card p-4">
            <PrintHeader />
            {/* Document Print Subheader */}
            <div className="text-center my-3 print:my-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
                Rekapitulasi Akhir Presensi, Jurnal & Piket Guru
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
                <span><strong>{formatPeriodHeader(bulan, startDate, endDate)}</strong></span>
                <span>Dicetak Oleh: <strong>{user?.nama || 'Administrator'}</strong></span>
              </div>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 no-print">
              <i className="fa-solid fa-file-invoice text-blue-500 dark:text-blue-400 text-base"></i> Rekapitulasi Akhir
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 p-4 rounded-2xl mb-5 no-print">
                <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2">Pilih Bulan</label>
                <div className="flex gap-2">
                    <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="flex-grow px-3 py-2.5 rounded-xl input-premium text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    <button type="button" onClick={() => tarikDataRekap(false)} disabled={loading} className="btn-click bg-blue-600 text-white px-4 rounded-xl text-xs font-bold shadow-md border border-blue-700 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
                      {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-download"></i>}
                    </button>
                </div>
            </div>
            <details className="mb-5 text-sm group no-print">
                <summary className="font-bold text-xs text-gray-900 dark:text-white cursor-pointer outline-none flex items-center gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <i className="fa-solid fa-caret-right transition-transform group-open:rotate-90"></i> Filter Rentang Khusus
                </summary>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mt-2 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">DARI</label>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-700" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">SAMPAI</label>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-700" />
                        </div>
                    </div>
                    <button type="button" onClick={() => tarikDataRekap(true)} disabled={loading} className="btn-click w-full bg-gray-800 dark:bg-gray-600 text-white py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-gray-900 transition disabled:opacity-50">Tarik Data Custom</button>
                </div>
            </details>
            
            {rekapData ? (
              <div id="hasil-rekap" className="space-y-5 fade-in">
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 rounded-xl text-center">
                          <div className="text-xs font-bold text-blue-800 dark:text-blue-300">Total Guru</div>
                          <div className="text-xl font-black text-blue-600 dark:text-blue-400">{totalGuru}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-3 rounded-xl text-center">
                          <div className="text-xs font-bold text-green-800 dark:text-green-300">Total Hadir</div>
                          <div className="text-xl font-black text-green-600 dark:text-green-400">{totalHadirSemua}</div>
                      </div>
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-xl text-center">
                          <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300">Jurnal Disetujui</div>
                          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalJurnalSemua}</div>
                      </div>
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/50 p-3 rounded-xl text-center">
                          <div className="text-xs font-bold text-teal-800 dark:text-teal-300">Piket Disetujui</div>
                          <div className="text-xl font-black text-teal-600 dark:text-teal-400">{totalPiketSemua}</div>
                      </div>
                  </div>

                  {/* Teacher Search Filter & Orientation Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                      <div className="relative flex-1 min-w-[200px]">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="text"
                            placeholder="Cari nama guru..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                          />
                      </div>
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="px-3 py-2 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold"
                        >
                          Reset
                        </button>
                      )}
                      <PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />
                  </div>

                  {/* 10-Column Professional Recap Table */}
                  <div className="overflow-x-auto w-full my-4 rounded-xl border border-gray-300 dark:border-gray-700 print:border-black print:overflow-visible shadow-sm">
                    <table className="w-full text-left text-xs border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-b border-gray-300 dark:border-gray-700 print:bg-gray-100 print:text-black print:border-black">
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold w-10">No</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black font-bold">Nama Guru</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold text-green-700 dark:text-green-400 print:text-black">Hadir</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold text-blue-700 dark:text-blue-400 print:text-black">Dinas Luar</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold text-yellow-700 dark:text-yellow-400 print:text-black">Sakit</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold text-orange-700 dark:text-orange-400 print:text-black">Izin</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold text-red-700 dark:text-red-400 print:text-black">Alpa</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold">Keterlambatan</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold text-teal-700 dark:text-teal-400 print:text-black">Piket</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center font-bold text-indigo-700 dark:text-indigo-400 print:text-black">Jurnal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPresensi.map((r: any, idx: number) => {
                          const jam = Math.floor((r.telatDetik || 0) / 3600);
                          const menit = Math.floor(((r.telatDetik || 0) % 3600) / 60);
                          const telatStr = (r.telatDetik || 0) > 0 ? `${jam > 0 ? `${jam}j ` : ''}${menit}m` : '-';
                          return (
                            <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium">{idx + 1}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-semibold text-gray-900 dark:text-white print:text-black">{r.nama}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-bold text-green-700 dark:text-green-400 print:text-black">{r.hadir || 0}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center text-blue-700 dark:text-blue-400 print:text-black">{r.dinasLuar || 0}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center text-yellow-700 dark:text-yellow-400 print:text-black">{r.sakit || 0}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center text-orange-700 dark:text-orange-400 print:text-black">{r.izin || 0}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center text-red-700 dark:text-red-400 print:text-black">{r.alpa || 0}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-mono text-[11px] print:text-[8pt]">{telatStr}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-bold text-teal-700 dark:text-teal-400 print:text-black">{r.piket || 0}</td>
                              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-bold text-indigo-700 dark:text-indigo-400 print:text-black">{r.jurnal || 0}</td>
                            </tr>
                          );
                        })}
                        {filteredPresensi.length === 0 && (
                          <tr>
                            <td colSpan={10} className="text-center py-8 text-gray-500 dark:text-gray-400 text-xs italic">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <i className="fa-solid fa-user-slash text-2xl text-gray-400 dark:text-gray-500"></i>
                                <span>
                                  {search ? `Tidak ada data guru yang sesuai dengan pencarian "${search}".` : 'Tidak ada data kehadiran guru untuk periode ini.'}
                                </span>
                                {search && (
                                  <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 no-print"
                                  >
                                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <PrintSignature
                    leftTitle="Mengetahui,"
                    leftSubtitle="Pengelola Data / Admin"
                    leftName={user?.nama}
                    leftNip={user?.nip}
                  />
                  
                  <div className="pt-2 border-t dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 no-print">
                      <button type="button" onClick={() => {
                        if (!rekapData || rekapData.presensi.length === 0) return;
                        const headers = ['No', 'Nama Guru', 'Hadir', 'Dinas Luar', 'Sakit', 'Izin', 'Alpa', 'Keterlambatan (Jam/Menit)', 'Piket Disetujui', 'Jurnal Disetujui'];
                        const csvRows = [headers.join(',')];
                        rekapData.presensi.forEach((r: any, i: number) => {
                          const telatStr = `"${Math.floor((r.telatDetik||0) / 3600)}j ${Math.floor(((r.telatDetik||0) % 3600) / 60)}m"`;
                          csvRows.push([
                            i + 1,
                            `"${r.nama}"`,
                            r.hadir || 0,
                            r.dinasLuar || 0,
                            r.sakit || 0,
                            r.izin || 0,
                            r.alpa || 0,
                            telatStr,
                            r.piket || 0,
                            r.jurnal || 0
                          ].join(','));
                        });
                        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Rekap_Guru_${bulan || 'custom'}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }} className="btn-click w-full bg-green-600 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:bg-green-700 transition">
                        <i className="fa-solid fa-file-excel"></i> Excel
                      </button>
                      <button type="button" onClick={() => window.print()} className="btn-click w-full bg-blue-600 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 hover:bg-blue-700 transition">
                        <i className="fa-solid fa-print"></i> Cetak Halaman
                      </button>
                  </div>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 text-xs italic dark:text-gray-400 no-print">
                Pilih bulan atau rentang khusus untuk menarik rekap.
              </div>
            )}
        </div>
    </section>
  );
}

