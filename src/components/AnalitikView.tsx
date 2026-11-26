'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay } from '@/lib/wita';
import { resolveLinkedUserForTeacher, isTeacherRecordMatch, isBkAccount } from '@/lib/workflow';

export default function AnalitikView({ user }: { user: any }) {
  const [bulan, setBulan] = useState(() => {
    return getWitaDateStr().substring(0, 7);
  });
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[] | null>(null);
  const [stats, setStats] = useState({ hadir: 0, izin: 0, dinasLuar: 0, jurnal: 0, piket: 0 });

  useEffect(() => {
    if (bulan) loadAnalitik();
  }, []);

  const loadAnalitik = async () => {
    setLoading(true);
    try {
      const year = parseInt(bulan.split('-')[0], 10);
      const month = parseInt(bulan.split('-')[1], 10);
      const start = getWitaStartOfDay(`${year}-${String(month).padStart(2, '0')}-01`);
      const lastDay = new Date(year, month, 0).getDate();
      const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const end = getWitaEndOfDay(lastDayStr);
      const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDateStr = lastDayStr;

      // 0. Fetch data_guru & users untuk konsolidasi identitas guru (non-blocking)
      let guruQ = supabase.from('data_guru').select('id, user_id, username, nip, nama_guru, mata_pelajaran, status');
      let usersQ = supabase.from('users').select('id, nama, username, role');
      if (user?.sekolah_id) {
        guruQ = guruQ.eq('sekolah_id', user.sekolah_id);
        usersQ = usersQ.eq('sekolah_id', user.sekolah_id);
      }
      const safeGuruPromise = Promise.resolve(guruQ).then(
        (res: any) => (res?.error ? [] : res?.data || []),
        () => []
      );
      const safeUsersPromise = Promise.resolve(usersQ).then(
        (res: any) => (res?.error ? [] : res?.data || []),
        () => []
      );

      // 1. Fetch Presensi
      let presensiQuery = supabase
        .from('presensi_guru')
        .select('id, user_id, guru_id, nama_guru, nip, jenis_presensi, status_verifikasi, timestamp')
        .gte('timestamp', start)
        .lte('timestamp', end)
        .eq('tipe_absen', 'Datang')
        .in('status_verifikasi', ['Disetujui', 'Diverifikasi']);
      if (user?.sekolah_id) {
        presensiQuery = presensiQuery.eq('sekolah_id', user.sekolah_id);
      }

      // 2. Fetch Jurnal (KBM/Kegiatan + Jurnal BK)
      let jurnalQuery = supabase
        .from('jurnal_pembelajaran')
        .select('id, user_id, guru_id, nama_guru, tanggal, status_verifikasi')
        .gte('tanggal', startDateStr)
        .lte('tanggal', endDateStr)
        .in('status_verifikasi', ['Disetujui', 'Diverifikasi']);
      if (user?.sekolah_id) {
        jurnalQuery = jurnalQuery.eq('sekolah_id', user.sekolah_id);
      }

      let bkJurnalQuery = supabase
        .from('jurnal_bk')
        .select('id, user_id, guru_id, nama_guru, tanggal, status_verifikasi')
        .gte('tanggal', startDateStr)
        .lte('tanggal', endDateStr)
        .in('status_verifikasi', ['Disetujui', 'Diverifikasi']);
      if (user?.sekolah_id) {
        bkJurnalQuery = bkJurnalQuery.eq('sekolah_id', user.sekolah_id);
      }
      const safeBkPromise = Promise.resolve(bkJurnalQuery).then(
        (res: any) => (res?.error || !Array.isArray(res?.data) ? [] : res.data),
        () => []
      );

      // 3. Fetch Piket
      let piketQuery = supabase
        .from('laporan_piket')
        .select('id, user_id, guru_pelapor, tanggal, status_verifikasi')
        .gte('tanggal', startDateStr)
        .lte('tanggal', endDateStr)
        .in('status_verifikasi', ['Disetujui', 'Diverifikasi']);
      if (user?.sekolah_id) {
        piketQuery = piketQuery.eq('sekolah_id', user.sekolah_id);
      }

      const [guruList, usersList, { data: presensi }, { data: jurnal }, bkJurnal, { data: piket }] =
        await Promise.all([
          safeGuruPromise,
          safeUsersPromise,
          presensiQuery,
          jurnalQuery,
          safeBkPromise,
          piketQuery
        ]);

      const linkedUserIds = new Set(
        guruList
          .map((g: any) => resolveLinkedUserForTeacher(g, usersList)?.id)
          .filter(Boolean)
          .map((id: any) => String(id))
      );
      const effectiveTeachers = [
        ...guruList,
        ...usersList
          .filter((u: any) => isBkAccount(u.role) && !linkedUserIds.has(String(u.id)))
          .map((u: any) => ({
            id: `bk-user-${u.id}`,
            user_id: u.id,
            username: u.username,
            nip: u.username || '-',
            nama_guru: (u.nama || u.username || 'Guru BK').trim(),
            mata_pelajaran: 'BK'
          }))
      ];
      const teacherEntries = effectiveTeachers
        .filter((g: any) => g?.nama_guru?.trim())
        .map((g: any) => ({
          teacher: g,
          linkedUser: resolveLinkedUserForTeacher(g, usersList),
          canonicalName: String(g.nama_guru).trim()
        }));

      const resolveAnalitikName = (record: any, fallbackName?: string | null) => {
        const matched = teacherEntries.find(e =>
          isTeacherRecordMatch(record, e.teacher, e.linkedUser)
        );
        return matched ? matched.canonicalName : (fallbackName || '').trim();
      };

      // Aggregate stats
      let h = 0, i = 0, d = 0;
      const allJurnal = [...(jurnal || []), ...(bkJurnal || [])];
      const jCount = allJurnal.length;
      const pkCount = piket?.length || 0;
      
      const lMap: Record<string, { hadir: number, jurnal: number, piket: number, dinasLuar: number }> = {};
      
      presensi?.forEach(p => {
        const nama = resolveAnalitikName(p, p.nama_guru);
        if (!nama) return;
        if (!lMap[nama]) lMap[nama] = { hadir: 0, jurnal: 0, piket: 0, dinasLuar: 0 };
        
        if (p.jenis_presensi === 'Sekolah') {
          h++;
          lMap[nama].hadir++;
        }
        else if (p.jenis_presensi === 'Izin' || p.jenis_presensi === 'Sakit') i++;
        else if (p.jenis_presensi === 'Dinas Luar') {
          d++;
          lMap[nama].dinasLuar++;
        }
      });

      allJurnal.forEach(j => {
        const nama = resolveAnalitikName(j, j.nama_guru);
        if (!nama) return;
        if (!lMap[nama]) lMap[nama] = { hadir: 0, jurnal: 0, piket: 0, dinasLuar: 0 };
        lMap[nama].jurnal++;
      });

      piket?.forEach(pk => {
        const nama = resolveAnalitikName(pk, pk.guru_pelapor);
        if (!nama) return;
        if (!lMap[nama]) lMap[nama] = { hadir: 0, jurnal: 0, piket: 0, dinasLuar: 0 };
        lMap[nama].piket++;
      });

      setStats({ hadir: h, izin: i, dinasLuar: d, jurnal: jCount, piket: pkCount });

      // Calculate real performance score:
      // Hadir Sekolah: 10 poin, Piket: 10 poin, Jurnal: 5 poin, Dinas Luar: 5 poin
      const lArr = Object.keys(lMap).map(nama => {
        const data = lMap[nama];
        const score = (data.hadir * 10) + (data.piket * 10) + (data.jurnal * 5) + (data.dinasLuar * 5);
        return { nama, ...data, score };
      }).sort((a, b) => b.score - a.score).slice(0, 10);

      setLeaderboard(lArr);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPresensi = stats.hadir + stats.izin + stats.dinasLuar;
  const pSeko = totalPresensi ? Math.round((stats.hadir / totalPresensi) * 100) : 0;
  const pIzin = totalPresensi ? Math.round((stats.izin / totalPresensi) * 100) : 0;
  const pDinas = totalPresensi ? Math.round((stats.dinasLuar / totalPresensi) * 100) : 0;

  return (
    <section id="view-analitik" className="view-section fade-in">
        <div className="glass-card p-4 sm:p-5 rounded-3xl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-[#0F766E] dark:text-teal-400"></i> Dasbor Analitik
                </h2>
            </div>
            <div className="neu-inset p-3 rounded-2xl mb-4 flex gap-2.5">
                <input type="month" value={bulan} onChange={e => setBulan(e.target.value)} className="flex-grow px-3 py-2 text-sm rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]" />
                <button type="button" onClick={loadAnalitik} disabled={loading} className="neu-btn neu-btn-primary btn-click text-white px-4 rounded-xl text-xs font-bold transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-rotate-right"></i>}
                </button>
            </div>
            <div className="neu-card-sm rounded-2xl p-4 mb-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Statistik Global (Bulan Ini)</h3>
                    <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] italic">Data terverifikasi</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="neu-inset p-3 rounded-xl text-center">
                    <div className="text-2xl font-black font-num text-[#0F766E] dark:text-teal-400">{stats.hadir}</div>
                    <div className="text-[9px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wide mt-1">Total Hadir</div>
                  </div>
                  <div className="neu-inset p-3 rounded-xl text-center">
                    <div className="text-2xl font-black font-num text-sky-700 dark:text-sky-400">{stats.jurnal}</div>
                    <div className="text-[9px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wide mt-1">Total Jurnal</div>
                  </div>
                  <div className="neu-inset p-3 rounded-xl text-center">
                    <div className="text-2xl font-black font-num text-emerald-700 dark:text-emerald-400">{stats.piket}</div>
                    <div className="text-[9px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wide mt-1">Total Piket</div>
                  </div>
                  <div className="neu-inset p-3 rounded-xl text-center">
                    <div className="text-2xl font-black font-num text-[#D97706] dark:text-amber-400">{stats.dinasLuar}</div>
                    <div className="text-[9px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wide mt-1">Dinas Luar</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-bold text-[#334155] dark:text-[#CBD5E1]">
                      <span>Hadir Sekolah</span>
                      <span className="font-num">{pSeko}%</span>
                    </div>
                    <div className="w-full neu-inset rounded-full h-2.5 p-0.5 overflow-hidden">
                      <div className="bg-[#0F766E] dark:bg-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${pSeko}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-bold text-[#334155] dark:text-[#CBD5E1]">
                      <span>Izin / Sakit</span>
                      <span className="font-num">{pIzin}%</span>
                    </div>
                    <div className="w-full neu-inset rounded-full h-2.5 p-0.5 overflow-hidden">
                      <div className="bg-[#D97706] dark:bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${pIzin}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 font-bold text-[#334155] dark:text-[#CBD5E1]">
                      <span>Dinas Luar</span>
                      <span className="font-num">{pDinas}%</span>
                    </div>
                    <div className="w-full neu-inset rounded-full h-2.5 p-0.5 overflow-hidden">
                      <div className="bg-sky-600 dark:bg-sky-400 h-full rounded-full transition-all duration-500" style={{ width: `${pDinas}%` }}></div>
                    </div>
                  </div>
                </div>
            </div>
            
            <div>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                      <i className="fa-solid fa-medal text-[#D97706] dark:text-amber-400"></i> Papan Peringkat Kinerja (Top 10)
                    </h3>
                    <span className="text-[9px] text-[#475569] dark:text-[#94A3B8] hidden sm:inline font-medium">
                      Formula: Hadir×10 + Piket×10 + Jurnal×5 + Dinas×5
                    </span>
                </div>
                <div id="leaderboard-list" className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[150px]">
                    {!leaderboard && !loading && (
                      <div className="text-center py-5 text-xs text-[#475569] italic dark:text-[#94A3B8] col-span-full">Pilih bulan dan klik proses...</div>
                    )}
                    {leaderboard?.length === 0 && (
                      <div className="text-center py-5 text-xs text-[#475569] italic dark:text-[#94A3B8] col-span-full">Belum ada data untuk bulan ini.</div>
                    )}
                    {leaderboard?.map((l: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 neu-card-sm p-3 rounded-2xl">
                        <div className={`w-8 h-8 rounded-full neu-inset flex items-center justify-center font-black font-num text-xs shrink-0 ${
                          i === 0 ? 'text-[#D97706] dark:text-amber-400' :
                          i === 1 ? 'text-[#334155] dark:text-[#CBD5E1]' :
                          i === 2 ? 'text-amber-700 dark:text-amber-500' :
                          'text-[#0F766E] dark:text-teal-400'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate">{l.nama}</h4>
                          <div className="text-[10px] font-num text-[#475569] dark:text-[#CBD5E1] flex flex-wrap gap-2 mt-0.5">
                            <span><i className="fa-solid fa-check text-[#0F766E] dark:text-teal-400"></i> {l.hadir} Hadir</span>
                            <span><i className="fa-solid fa-shield-halved text-teal-600 dark:text-teal-400"></i> {l.piket || 0} Piket</span>
                            <span><i className="fa-solid fa-book text-sky-600 dark:text-sky-400"></i> {l.jurnal} Jurnal</span>
                            {l.dinasLuar > 0 && <span><i className="fa-solid fa-briefcase text-[#D97706] dark:text-amber-400"></i> {l.dinasLuar} Dinas</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black font-num text-[#0F766E] dark:text-teal-400">{l.score}</div>
                          <div className="text-[9px] text-[#475569] dark:text-[#94A3B8] font-bold uppercase tracking-wider">Poin</div>
                        </div>
                      </div>
                    ))}
                </div>
            </div>
        </div>
    </section>
  );
}
