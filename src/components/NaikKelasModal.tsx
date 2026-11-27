'use client';

import { useState, useMemo, useEffect } from 'react';
import { supabase, getActiveTenantContext } from '@/lib/supabaseClient';
import { isMasterDataModificationAllowed } from '@/lib/dataIntegrityGuard';
import Swal from 'sweetalert2';

export interface NaikKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedStudentIds?: string[];
  students: any[];
  sekolahId?: string;
  role?: string;
}

/**
 * Helper to compute cohort progression for a given class name.
 * Rule:
 * - Grade 12 (XII / 12) -> Lulus (isLulus: true)
 * - Grade 11 (XI / 11) -> Grade 12 (XII / 12)
 * - Grade 10 (X / 10) -> Grade 11 (XI / 11)
 */
export function computeCohortAdvancement(currentKelas: string): { targetKelas: string; isLulus: boolean } {
  const k = (currentKelas || '').trim();
  if (!k) return { targetKelas: 'Lulus', isLulus: true };

  // SMA/SMK
  if (/\bxii\b/i.test(k) || /\b12\b/.test(k)) return { targetKelas: 'Lulus', isLulus: true };
  if (/\bxi\b/i.test(k)) return { targetKelas: k.replace(/\bxi\b/gi, 'XII'), isLulus: false };
  if (/\b11\b/.test(k)) return { targetKelas: k.replace(/\b11\b/, '12'), isLulus: false };
  if (/\bx\b/i.test(k)) return { targetKelas: k.replace(/\bx\b/gi, 'XI'), isLulus: false };
  if (/\b10\b/.test(k)) return { targetKelas: k.replace(/\b10\b/, '11'), isLulus: false };

  // SMP
  if (/\bix\b/i.test(k) || /\b9\b/.test(k)) return { targetKelas: 'Lulus', isLulus: true };
  if (/\bviii\b/i.test(k)) return { targetKelas: k.replace(/\bviii\b/gi, 'IX'), isLulus: false };
  if (/\b8\b/.test(k)) return { targetKelas: k.replace(/\b8\b/, '9'), isLulus: false };
  if (/\bvii\b/i.test(k)) return { targetKelas: k.replace(/\bvii\b/gi, 'VIII'), isLulus: false };
  if (/\b7\b/.test(k)) return { targetKelas: k.replace(/\b7\b/, '8'), isLulus: false };

  // SD
  if (/\bvi\b/i.test(k) || /\b6\b/.test(k)) return { targetKelas: 'Lulus', isLulus: true };
  if (/\bv\b/i.test(k)) return { targetKelas: k.replace(/\bv\b/gi, 'VI'), isLulus: false };
  if (/\b5\b/.test(k)) return { targetKelas: k.replace(/\b5\b/, '6'), isLulus: false };
  if (/\biv\b/i.test(k)) return { targetKelas: k.replace(/\biv\b/gi, 'V'), isLulus: false };
  if (/\b4\b/.test(k)) return { targetKelas: k.replace(/\b4\b/, '5'), isLulus: false };
  if (/\biii\b/i.test(k)) return { targetKelas: k.replace(/\biii\b/gi, 'IV'), isLulus: false };
  if (/\b3\b/.test(k)) return { targetKelas: k.replace(/\b3\b/, '4'), isLulus: false };
  if (/\bii\b/i.test(k)) return { targetKelas: k.replace(/\bii\b/gi, 'III'), isLulus: false };
  if (/\b2\b/.test(k)) return { targetKelas: k.replace(/\b2\b/, '3'), isLulus: false };
  if (/\bi\b/i.test(k)) return { targetKelas: k.replace(/\bi\b/gi, 'II'), isLulus: false };
  if (/\b1\b/.test(k)) return { targetKelas: k.replace(/\b1\b/, '2'), isLulus: false };

  return { targetKelas: `${k} (Lanjutan)`, isLulus: false };
}

export default function NaikKelasModal({
  isOpen,
  onClose,
  onSuccess,
  selectedStudentIds = [],
  students = [],
  sekolahId,
  role
}: NaikKelasModalProps) {
  const effectiveRole = role || getActiveTenantContext()?.role;
  const isAdmin = isMasterDataModificationAllowed(effectiveRole);
  const [mode, setMode] = useState<'perorangan' | 'per_kelas' | 'satu_angkatan'>('perorangan');
  const [loading, setLoading] = useState(false);

  // Mode 1: Perorangan
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedStudentIds);
  const [peroranganTargetKelas, setPeroranganTargetKelas] = useState('');
  const [peroranganIsLulus, setPeroranganIsLulus] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');

  // Mode 2: Per Kelas
  const [sourceKelas, setSourceKelas] = useState('');
  const [perKelasTargetKelas, setPerKelasTargetKelas] = useState('');
  const [perKelasIsLulus, setPerKelasIsLulus] = useState(false);

  // Sync selectedStudentIds if changed from outside
  useMemo(() => {
    if (selectedStudentIds.length > 0) {
      setLocalSelectedIds(selectedStudentIds);
    }
  }, [selectedStudentIds]);

  // List of distinct active classes
  const uniqueClasses = useMemo(() => {
    const list = students
      .map(s => s.kelas)
      .filter(k => Boolean(k) && k !== 'Lulus');
    return Array.from(new Set(list)).sort() as string[];
  }, [students]);

  // Cohort breakdown preview for Satu Angkatan
  const cohortPreview = useMemo(() => {
    const activeStudents = students.filter(s => s.status !== 'Lulus' && s.kelas !== 'Lulus');
    const mapping: {
      sourceKelas: string;
      studentCount: number;
      targetKelas: string;
      isLulus: boolean;
      studentIds: string[];
    }[] = [];

    const groupedByClass: Record<string, any[]> = {};
    activeStudents.forEach(s => {
      const k = s.kelas || 'Tanpa Kelas';
      if (!groupedByClass[k]) groupedByClass[k] = [];
      groupedByClass[k].push(s);
    });

    Object.entries(groupedByClass).forEach(([kls, sList]) => {
      const adv = computeCohortAdvancement(kls);
      mapping.push({
        sourceKelas: kls,
        studentCount: sList.length,
        targetKelas: adv.targetKelas,
        isLulus: adv.isLulus,
        studentIds: sList.map(s => s.id)
      });
    });

    // Sort: XII first, then XI, then X
    mapping.sort((a, b) => {
      const getWeight = (name: string) => {
        if (/xii|12/i.test(name)) return 3;
        if (/xi|11/i.test(name)) return 2;
        if (/x|10/i.test(name)) return 1;
        return 0;
      };
      return getWeight(b.sourceKelas) - getWeight(a.sourceKelas);
    });

    return mapping;
  }, [students]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  // Handler: Execute Perorangan Advancement
  const handleExecutePerorangan = async () => {
    if (!isAdmin) {
      return Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat memodifikasi kenaikan kelas data siswa.', 'error');
    }
    if (localSelectedIds.length === 0) {
      return Swal.fire('Peringatan', 'Pilih minimal 1 siswa untuk dinaikkan kelas.', 'warning');
    }
    if (!peroranganIsLulus && !peroranganTargetKelas.trim()) {
      return Swal.fire('Peringatan', 'Tentukan kelas tujuan atau centang opsi Tandai Lulus.', 'warning');
    }

    const targetKelas = peroranganIsLulus ? 'Lulus' : peroranganTargetKelas.trim();
    const targetStatus = peroranganIsLulus ? 'Lulus' : 'Aktif';

    const confirm = await Swal.fire({
      title: 'Konfirmasi Kenaikan Siswa',
      html: `
        <div class="text-xs text-left">
          <p>Anda akan memperbarui <strong>${localSelectedIds.length} siswa</strong> terpilih:</p>
          <p class="mt-2 text-emerald-700 dark:text-emerald-400 font-bold">
            ➔ Kelas Baru: ${targetKelas} (${targetStatus})
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Proses Sekarang',
      confirmButtonColor: '#0F766E',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      let query = supabase
        .from('data_siswa')
        .update({ kelas: targetKelas, status: targetStatus })
        .in('id', localSelectedIds);

      if (sekolahId) {
        query = query.eq('sekolah_id', sekolahId);
      }

      const { error } = await query;
      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Berhasil memperbarui kelas untuk ${localSelectedIds.length} siswa.`,
        confirmButtonColor: '#0F766E'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      Swal.fire('Gagal Proses', err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Execute Per Kelas Advancement
  const handleExecutePerKelas = async () => {
    if (!isAdmin) {
      return Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat memodifikasi kenaikan kelas data siswa.', 'error');
    }
    if (!sourceKelas) {
      return Swal.fire('Peringatan', 'Pilih kelas asal terlebih dahulu.', 'warning');
    }
    if (!perKelasIsLulus && !perKelasTargetKelas.trim()) {
      return Swal.fire('Peringatan', 'Tentukan kelas tujuan atau centang opsi Tandai Lulus.', 'warning');
    }

    const studentsInSource = students.filter(
      s => s.kelas === sourceKelas && s.status !== 'Lulus'
    );

    if (studentsInSource.length === 0) {
      return Swal.fire('Informasi', `Tidak ada siswa aktif yang ditemukan di kelas ${sourceKelas}.`, 'info');
    }

    const targetKelas = perKelasIsLulus ? 'Lulus' : perKelasTargetKelas.trim();
    const targetStatus = perKelasIsLulus ? 'Lulus' : 'Aktif';
    const targetIds = studentsInSource.map(s => s.id);

    const confirm = await Swal.fire({
      title: `Kenaikan Kelas ${sourceKelas}`,
      html: `
        <div class="text-xs text-left">
          <p>Seluruh siswa di kelas <strong>${sourceKelas}</strong> (${studentsInSource.length} siswa) akan dialihkan ke:</p>
          <p class="mt-2 text-emerald-700 dark:text-emerald-400 font-bold">
            ➔ Kelas Baru: ${targetKelas} (${targetStatus})
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Pindahkan Kelas',
      confirmButtonColor: '#0F766E',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      let query = supabase
        .from('data_siswa')
        .update({ kelas: targetKelas, status: targetStatus })
        .in('id', targetIds);

      if (sekolahId) {
        query = query.eq('sekolah_id', sekolahId);
      }

      const { error } = await query;
      if (error) throw error;

      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Sebanyak ${studentsInSource.length} siswa dari kelas ${sourceKelas} berhasil dinaikkan ke ${targetKelas}.`,
        confirmButtonColor: '#0F766E'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      Swal.fire('Gagal Proses', err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Execute Satu Angkatan Advancement
  const handleExecuteSatuAngkatan = async () => {
    if (!isAdmin) {
      return Swal.fire('Akses Ditolak', 'Hanya Admin yang dapat memodifikasi kenaikan kelas data siswa.', 'error');
    }

    const totalAffected = cohortPreview.reduce((sum, item) => sum + item.studentCount, 0);
    if (totalAffected === 0) {
      return Swal.fire('Informasi', 'Tidak ada siswa aktif yang siap dinaikkan kelas.', 'info');
    }

    const confirm = await Swal.fire({
      title: 'Konfirmasi Kenaikan Satu Angkatan',
      html: `
        <div class="text-xs text-left space-y-1.5">
          <p class="font-semibold text-gray-800 dark:text-gray-200">
            Sistem akan memproses kenaikan kelas secara serentak untuk <strong>${totalAffected} siswa</strong>:
          </p>
          <ul class="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-300">
            ${cohortPreview.map(c => `
              <li><strong>${c.sourceKelas}</strong> (${c.studentCount} siswa) ➔ <span class="text-emerald-600 font-bold">${c.targetKelas}</span></li>
            `).join('')}
          </ul>
          <p class="mt-2 text-amber-600 dark:text-amber-400 italic">
            *Pastikan jadwal dan kelas baru telah dipersiapkan.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Jalankan Kenaikan Angkatan',
      confirmButtonColor: '#0F766E',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      // Execute each cohort batch update
      for (const item of cohortPreview) {
        if (item.studentIds.length === 0) continue;

        let query = supabase
          .from('data_siswa')
          .update({
            kelas: item.targetKelas,
            status: item.isLulus ? 'Lulus' : 'Aktif'
          })
          .in('id', item.studentIds);

        if (sekolahId) {
          query = query.eq('sekolah_id', sekolahId);
        }

        const { error } = await query;
        if (error) throw error;
      }

      await Swal.fire({
        icon: 'success',
        title: 'Kenaikan Angkatan Berhasil!',
        text: `Sebanyak ${totalAffected} siswa berhasil dipromosikan ke tingkat selanjutnya.`,
        confirmButtonColor: '#0F766E'
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      Swal.fire('Gagal Kenaikan Angkatan', err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchStudent) return true;
    const term = searchStudent.toLowerCase();
    return (
      (s.nama_siswa || '').toLowerCase().includes(term) ||
      (s.nisn || '').toLowerCase().includes(term) ||
      (s.kelas || '').toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 dark:bg-black/65 overflow-y-auto"
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Proses Kenaikan Kelas Siswa"
        onClick={(e) => e.stopPropagation()}
        className="neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-3xl w-full max-w-2xl overflow-hidden my-8 max-h-[92dvh] flex flex-col"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0F766E] text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-lg">
              <i className="fa-solid fa-arrow-up-right-dots"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Proses Kenaikan Kelas Siswa</h3>
              <p className="text-[11px] text-white/80">Otomasi kenaikan tingkat semester / tahun ajaran baru</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup modal kenaikan kelas"
            onClick={onClose}
            disabled={loading}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition disabled:opacity-50 shrink-0"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Operational Mode Navigation Tabs */}
        <div role="tablist" aria-label="Mode Kenaikan Kelas" className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-300/60 dark:border-slate-700/60 neu-inset p-2 gap-2 text-xs font-bold">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'perorangan'}
            onClick={() => setMode('perorangan')}
            className={`py-2.5 px-3 min-h-[40px] rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'perorangan'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-user-check text-[11px]"></i>
            <span>Perorangan</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'per_kelas'}
            onClick={() => setMode('per_kelas')}
            className={`py-2.5 px-3 min-h-[40px] rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'per_kelas'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-chalkboard-user text-[11px]"></i>
            <span>Per Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('satu_angkatan')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'satu_angkatan'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-graduation-cap text-[11px]"></i>
            <span>Satu Angkatan</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scroll">
          {!isAdmin && (
            <div className="neu-inset border border-rose-500/30 p-3 rounded-2xl mb-4 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <i className="fa-solid fa-lock text-sm shrink-0"></i>
              <span>Mode Pratinjau: Kenaikan kelas siswa hanya dapat dieksekusi oleh Administrator melalui panel manajemen admin.</span>
            </div>
          )}
          
          {/* ============================================================ */}
          {/* MODE A: PERORANGAN (SELECTED STUDENTS)                        */}
          {/* ============================================================ */}
          {mode === 'perorangan' && (
            <div className="space-y-4">
              <div className="neu-inset border border-teal-500/25 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0F766E] dark:text-teal-300">
                    {localSelectedIds.length} Siswa Terpilih
                  </div>
                  <div className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
                    Pilih siswa melalui checkbox di bawah atau dari halaman utama
                  </div>
                </div>
                {localSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLocalSelectedIds([])}
                    className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Kosongkan Pilihan
                  </button>
                )}
              </div>

              {/* Target Class Selection */}
              <div className="neu-inset p-4 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Tentukan Tujuan Kenaikan:</h4>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="perorangan-lulus"
                    checked={peroranganIsLulus}
                    onChange={e => setPeroranganIsLulus(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E] border-slate-400"
                  />
                  <label htmlFor="perorangan-lulus" className="text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] cursor-pointer">
                    Tandai Siswa sebagai <span className="text-[#0F766E] dark:text-teal-400 font-bold">Lulus (Alumni)</span>
                  </label>
                </div>

                {!peroranganIsLulus && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                      Kelas Tujuan Baru *
                    </label>
                    <input
                      type="text"
                      list="target-kelas-datalist"
                      value={peroranganTargetKelas}
                      onChange={e => setPeroranganTargetKelas(e.target.value)}
                      placeholder="Contoh: XI Merdeka atau XII-1"
                      className="w-full px-3 py-2 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                    />
                    <datalist id="target-kelas-datalist">
                      {uniqueClasses.map(c => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                )}
              </div>

              {/* Student Multi-Select List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Daftar Siswa Aktif:</span>
                  <div className="w-52">
                    <input
                      type="text"
                      placeholder="Cari siswa / kelas..."
                      value={searchStudent}
                      onChange={e => setSearchStudent(e.target.value)}
                      className="w-full px-2.5 py-1 text-[11px] rounded-lg input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto neu-inset rounded-xl divide-y divide-slate-300/50 dark:divide-slate-700/50 custom-scroll">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#475569] dark:text-[#94A3B8] italic">Tidak ada siswa yang sesuai.</div>
                  ) : (
                    filteredStudents.map(s => {
                      const isChecked = localSelectedIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-2.5 hover:bg-white/25 dark:hover:bg-white/5 cursor-pointer transition text-xs ${
                            isChecked ? 'bg-teal-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setLocalSelectedIds(localSelectedIds.filter(id => id !== s.id));
                                } else {
                                  setLocalSelectedIds([...localSelectedIds, s.id]);
                                }
                              }}
                              className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E] border-slate-400"
                            />
                            <div>
                              <div className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">{s.nama_siswa}</div>
                              <div className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                                NISN: {s.nisn || '-'} · Kelas: {s.kelas || '-'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded neu-card-sm text-[#334155] dark:text-[#CBD5E1]">
                            {s.kelas}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-300/60 dark:border-slate-700/60 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#475569] dark:text-[#CBD5E1]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecutePerorangan}
                  disabled={loading || localSelectedIds.length === 0 || !isAdmin}
                  className="neu-btn neu-btn-primary btn-click text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                  Proses Kenaikan ({localSelectedIds.length})
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODE B: PER KELAS (CLASS-WIDE ADVANCEMENT)                    */}
          {/* ============================================================ */}
          {mode === 'per_kelas' && (
            <div className="space-y-4">
              <div className="neu-inset border border-teal-500/25 p-3.5 rounded-2xl text-xs text-[#0F766E] dark:text-teal-300">
                Pilih satu kelas asal untuk memindahkan seluruh siswa yang aktif di kelas tersebut ke kelas baru secara otomatis.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                    1. Pilih Kelas Asal *
                  </label>
                  <select
                    value={sourceKelas}
                    onChange={e => {
                      setSourceKelas(e.target.value);
                      // Auto calculate suggested target class
                      if (e.target.value) {
                        const adv = computeCohortAdvancement(e.target.value);
                        if (adv.isLulus) {
                          setPerKelasIsLulus(true);
                          setPerKelasTargetKelas('Lulus');
                        } else {
                          setPerKelasIsLulus(false);
                          setPerKelasTargetKelas(adv.targetKelas);
                        }
                      }
                    }}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                  >
                    <option value="">-- Pilih Kelas Asal --</option>
                    {uniqueClasses.map(c => {
                      const count = students.filter(s => s.kelas === c && s.status !== 'Lulus').length;
                      return (
                        <option key={c} value={c}>
                          {c} ({count} Siswa Aktif)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {sourceKelas && (
                  <div className="neu-inset p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      2. Tentukan Tujuan Kenaikan untuk Kelas {sourceKelas}:
                    </h4>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="perkelas-lulus"
                        checked={perKelasIsLulus}
                        onChange={e => setPerKelasIsLulus(e.target.checked)}
                        className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E] border-slate-400"
                      />
                      <label htmlFor="perkelas-lulus" className="text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] cursor-pointer">
                        Tandai Seluruh Kelas sebagai <span className="text-[#0F766E] dark:text-teal-400 font-bold">Lulus (Alumni)</span>
                      </label>
                    </div>

                    {!perKelasIsLulus && (
                      <div>
                        <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                          Nama Kelas Tujuan Baru *
                        </label>
                        <input
                          type="text"
                          list="target-kelas-datalist-mode2"
                          value={perKelasTargetKelas}
                          onChange={e => setPerKelasTargetKelas(e.target.value)}
                          placeholder="Contoh: XI Merdeka atau XII-1"
                          className="w-full px-3 py-2 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                        />
                        <datalist id="target-kelas-datalist-mode2">
                          {uniqueClasses.map(c => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-300/60 dark:border-slate-700/60 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#475569] dark:text-[#CBD5E1]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecutePerKelas}
                  disabled={loading || !sourceKelas || !isAdmin}
                  className="neu-btn neu-btn-primary btn-click text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-arrow-right-arrow-left"></i>}
                  Pindahkan Kelas Ini
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODE C: SATU ANGKATAN (FULL COHORT PROGRESSION)               */}
          {/* ============================================================ */}
          {mode === 'satu_angkatan' && (
            <div className="space-y-4">
              <div className="neu-inset border border-amber-500/25 p-3.5 rounded-2xl text-xs text-amber-800 dark:text-amber-300">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <i className="fa-solid fa-triangle-exclamation"></i> Kenaikan Serentak Satu Angkatan
                </div>
                Fitur ini memproses seluruh siswa sekolah secara otomatis sesuai jenjang:
                <div className="mt-1 font-semibold text-[11px] space-y-0.5">
                  <div>• Tingkat XII ➔ Status Lulus</div>
                  <div>• Tingkat XI ➔ Naik ke Tingkat XII</div>
                  <div>• Tingkat X ➔ Naik ke Tingkat XI</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Pratinjau Pemetaan Kenaikan ({cohortPreview.length} Rombel / Kelas):
                </h4>

                <div className="neu-inset rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-300/60 dark:border-slate-700/60 text-[#475569] dark:text-[#CBD5E1]">
                      <tr>
                        <th className="p-2.5 font-bold">Kelas Asal</th>
                        <th className="p-2.5 font-bold text-center">Jumlah Siswa</th>
                        <th className="p-2.5 font-bold">Kelas Tujuan</th>
                        <th className="p-2.5 font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300/50 dark:divide-slate-700/50 text-[#0F172A] dark:text-[#F1F5F9]">
                      {cohortPreview.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-[#475569] dark:text-[#94A3B8] italic">
                            Tidak ada rombel aktif yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        cohortPreview.map(row => (
                          <tr key={row.sourceKelas} className="hover:bg-white/20 dark:hover:bg-white/5">
                            <td className="p-2.5 font-bold">{row.sourceKelas}</td>
                            <td className="p-2.5 text-center font-semibold font-num text-[#475569] dark:text-[#94A3B8]">
                              {row.studentCount}
                            </td>
                            <td className="p-2.5 font-bold text-[#0F766E] dark:text-teal-400">
                              {row.targetKelas}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                row.isLulus
                                  ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
                                  : 'bg-teal-500/15 text-[#0F766E] dark:text-teal-300'
                              }`}>
                                {row.isLulus ? 'Lulus' : 'Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-300/60 dark:border-slate-700/60 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-[#475569] dark:text-[#CBD5E1]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSatuAngkatan}
                  disabled={loading || cohortPreview.length === 0 || !isAdmin}
                  className="neu-btn neu-btn-primary btn-click text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                  Eksekusi Naik Satu Angkatan
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
