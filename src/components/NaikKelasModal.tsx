'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export interface NaikKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedStudentIds?: string[];
  students: any[];
  sekolahId?: string;
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
  sekolahId
}: NaikKelasModalProps) {
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

  if (!isOpen) return null;

  // Handler: Execute Perorangan Advancement
  const handleExecutePerorangan = async () => {
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
      confirmButtonColor: '#059669',
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
        confirmButtonColor: '#059669'
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
      confirmButtonColor: '#059669',
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
        confirmButtonColor: '#059669'
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
      confirmButtonColor: '#059669',
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
        confirmButtonColor: '#059669'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-600 dark:bg-emerald-800 text-white flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
              <i className="fa-solid fa-arrow-up-right-dots"></i>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight">Proses Kenaikan Kelas Siswa</h3>
              <p className="text-[11px] text-white/80">Otomasi kenaikan tingkat semester / tahun ajaran baru</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition disabled:opacity-50"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Operational Mode Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850 p-1.5 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('perorangan')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'perorangan'
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-user-check text-[11px]"></i>
            <span>Perorangan</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('per_kelas')}
            className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
              mode === 'per_kelas'
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-graduation-cap text-[11px]"></i>
            <span>Satu Angkatan</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scroll">
          
          {/* ============================================================ */}
          {/* MODE A: PERORANGAN (SELECTED STUDENTS)                        */}
          {/* ============================================================ */}
          {mode === 'perorangan' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    {localSelectedIds.length} Siswa Terpilih
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Pilih siswa melalui checkbox di bawah atau dari halaman utama
                  </div>
                </div>
                {localSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setLocalSelectedIds([])}
                    className="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Kosongkan Pilihan
                  </button>
                )}
              </div>

              {/* Target Class Selection */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">Tentukan Tujuan Kenaikan:</h4>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="perorangan-lulus"
                    checked={peroranganIsLulus}
                    onChange={e => setPeroranganIsLulus(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="perorangan-lulus" className="text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                    Tandai Siswa sebagai <span className="text-emerald-600 dark:text-emerald-400 font-bold">Lulus (Alumni)</span>
                  </label>
                </div>

                {!peroranganIsLulus && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Kelas Tujuan Baru *
                    </label>
                    <input
                      type="text"
                      list="target-kelas-datalist"
                      value={peroranganTargetKelas}
                      onChange={e => setPeroranganTargetKelas(e.target.value)}
                      placeholder="Contoh: XI Merdeka atau XII-1"
                      className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
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
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Daftar Siswa Aktif:</span>
                  <div className="w-52">
                    <input
                      type="text"
                      placeholder="Cari siswa / kelas..."
                      value={searchStudent}
                      onChange={e => setSearchStudent(e.target.value)}
                      className="w-full px-2.5 py-1 text-[11px] rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 custom-scroll">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400 italic">Tidak ada siswa yang sesuai.</div>
                  ) : (
                    filteredStudents.map(s => {
                      const isChecked = localSelectedIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition text-xs ${
                            isChecked ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
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
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                            />
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{s.nama_siswa}</div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                NISN: {s.nisn || '-'} · Kelas: {s.kelas || '-'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                            {s.kelas}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecutePerorangan}
                  disabled={loading || localSelectedIds.length === 0}
                  className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
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
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3.5 rounded-2xl text-xs text-emerald-900 dark:text-emerald-300">
                Pilih satu kelas asal untuk memindahkan seluruh siswa yang aktif di kelas tersebut ke kelas baru secara otomatis.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
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
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
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
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                      2. Tentukan Tujuan Kenaikan untuk Kelas {sourceKelas}:
                    </h4>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="perkelas-lulus"
                        checked={perKelasIsLulus}
                        onChange={e => setPerKelasIsLulus(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                      />
                      <label htmlFor="perkelas-lulus" className="text-xs font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">
                        Tandai Seluruh Kelas sebagai <span className="text-emerald-600 dark:text-emerald-400 font-bold">Lulus (Alumni)</span>
                      </label>
                    </div>

                    {!perKelasIsLulus && (
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Nama Kelas Tujuan Baru *
                        </label>
                        <input
                          type="text"
                          list="target-kelas-datalist-mode2"
                          value={perKelasTargetKelas}
                          onChange={e => setPerKelasTargetKelas(e.target.value)}
                          placeholder="Contoh: XI Merdeka atau XII-1"
                          className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
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
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecutePerKelas}
                  disabled={loading || !sourceKelas}
                  className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
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
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-3.5 rounded-2xl text-xs text-amber-900 dark:text-amber-300">
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
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  Pratinjau Pemetaan Kenaikan ({cohortPreview.length} Rombel / Kelas):
                </h4>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="p-2.5 font-bold">Kelas Asal</th>
                        <th className="p-2.5 font-bold text-center">Jumlah Siswa</th>
                        <th className="p-2.5 font-bold">Kelas Tujuan</th>
                        <th className="p-2.5 font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-900 dark:text-white">
                      {cohortPreview.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-gray-400 italic">
                            Tidak ada rombel aktif yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        cohortPreview.map(row => (
                          <tr key={row.sourceKelas} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="p-2.5 font-bold">{row.sourceKelas}</td>
                            <td className="p-2.5 text-center font-semibold text-gray-600 dark:text-gray-400">
                              {row.studentCount}
                            </td>
                            <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                              {row.targetKelas}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                row.isLulus
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
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
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSatuAngkatan}
                  disabled={loading || cohortPreview.length === 0}
                  className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
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
