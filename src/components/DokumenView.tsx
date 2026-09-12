'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaTimestamp, formatTimestampWita } from '@/lib/wita';
import { BankDokumen, DataGuru, GuruMapel } from '@/types/database';

export const KURIKULUM_DOCS = [
  { id: 'CP', code: 'CP', name: 'Analisis Capaian Pembelajaran', short: 'CP' },
  { id: 'ATP', code: 'ATP', name: 'Alur Tujuan Pembelajaran', short: 'ATP' },
  { id: 'RPE', code: 'RPE', name: 'Rencana Pekan Efektif', short: 'RPE' },
  { id: 'Prota', code: 'Prota', name: 'Program Tahunan', short: 'Prota' },
  { id: 'Promes', code: 'Promes', name: 'Program Semester', short: 'Promes' },
  { id: 'RPM', code: 'RPM', name: 'Rencana Pembelajaran Mendalam', short: 'RPM' }
] as const;

export default function DokumenView({ user }: { user: any }) {
  const isAdmin = user?.role === 'Admin';
  const [activeTab, setActiveTab] = useState<'matrix' | 'list' | 'upload'>(isAdmin ? 'matrix' : 'list');
  
  // Data states
  const [dokumenList, setDokumenList] = useState<BankDokumen[]>([]);
  const [teachersList, setTeachersList] = useState<DataGuru[]>([]);
  const [guruMapelList, setGuruMapelList] = useState<GuruMapel[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Lengkap' | 'Belum Lengkap' | 'Menunggu'>('Semua');

  // Preview & Verification Modal
  const [previewDoc, setPreviewDoc] = useState<BankDokumen | null>(null);

  // Teacher Upload Form States (For non-admin)
  const [judul, setJudul] = useState('');
  const [jenis, setJenis] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    try {
      setFetching(true);
      // 1. Fetch bank_dokumen
      let docQuery = supabase
        .from('bank_dokumen')
        .select('*')
        .order('timestamp', { ascending: false });

      if (!isAdmin && user?.nama) {
        docQuery = docQuery.eq('nama_guru', user.nama);
      }

      const { data: docs, error: docError } = await docQuery;
      if (docError) console.error('Error fetching bank_dokumen:', docError);
      if (docs) setDokumenList(docs as BankDokumen[]);

      // 2. Fetch all teachers
      const { data: teachers, error: teacherError } = await supabase
        .from('data_guru')
        .select('*')
        .order('nama_guru', { ascending: true });
      if (teacherError) console.error('Error fetching data_guru:', teacherError);
      if (teachers) setTeachersList(teachers as DataGuru[]);

      // 3. Fetch guru_mapel relations
      const { data: gm, error: gmError } = await supabase
        .from('guru_mapel')
        .select('*');
      if (gmError) console.error('Error fetching guru_mapel:', gmError);
      if (gm) setGuruMapelList(gm as GuruMapel[]);

    } catch (err) {
      console.error('loadAllData exception:', err);
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
        inputPlaceholder: 'Contoh: Perangkat pembelajaran telah sesuai standar kurikulum',
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
      // Update preview doc if open
      if (previewDoc && previewDoc.id === id) {
        setPreviewDoc({ ...previewDoc, status_verifikasi: status, catatan_admin: catatan });
      }
      loadAllData();
    }
  };

  const submitDokumen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenis || !judul || !file) {
      Swal.fire('Peringatan', 'Mohon lengkapi semua data dan lampirkan file dokumen.', 'warning');
      return;
    }

    setLoading(true);
    try {
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
        Swal.fire('Berhasil', 'Dokumen berhasil diupload dan menunggu verifikasi admin.', 'success');
        setJenis('');
        setJudul('');
        setFile(null);
        setActiveTab('list');
        loadAllData();
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menyimpan dokumen: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper to match a document to one of the 6 Kurikulum Merdeka types
  const matchDocToType = (teacherDocs: BankDokumen[], docId: string) => {
    return teacherDocs.find(d => {
      const j = (d.jenis_dokumen || '').toLowerCase();
      if (docId === 'CP') return j.includes('capaian') || j.includes('cp');
      if (docId === 'ATP') return j.includes('tujuan') || j.includes('atp');
      if (docId === 'RPE') return j.includes('pekan') || j.includes('rpe');
      if (docId === 'Prota') return j.includes('tahunan') || j.includes('prota');
      if (docId === 'Promes') return j.includes('semester') || j.includes('promes');
      if (docId === 'RPM') return j.includes('mendalam') || j.includes('rpm') || j.includes('modul');
      return false;
    });
  };

  // Teacher Matrix Calculations
  const teacherMatrixData = teachersList.map(teacher => {
    const teacherDocs = dokumenList.filter(
      d => (d.nama_guru || '').trim().toLowerCase() === (teacher.nama_guru || '').trim().toLowerCase()
    );

    const teacherMapel = guruMapelList.filter(
      gm => (gm.nama_guru || '').trim().toLowerCase() === (teacher.nama_guru || '').trim().toLowerCase()
    );

    const docStatusMap: Record<string, BankDokumen | undefined> = {};
    let completedCount = 0;

    KURIKULUM_DOCS.forEach(doc => {
      const match = matchDocToType(teacherDocs, doc.id);
      docStatusMap[doc.id] = match;
      if (match) completedCount += 1;
    });

    const completionRate = Math.round((completedCount / 6) * 100);
    const isComplete = completedCount === 6;
    const hasPendingVerification = Object.values(docStatusMap).some(
      d => d && (d.status_verifikasi === 'Menunggu' || !d.status_verifikasi)
    );

    return {
      teacher,
      teacherDocs,
      teacherMapel,
      docStatusMap,
      completedCount,
      completionRate,
      isComplete,
      hasPendingVerification
    };
  });

  // Filtered Teacher Matrix
  const filteredTeacherMatrix = teacherMatrixData.filter(item => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (item.teacher.nama_guru || '').toLowerCase().includes(q);
      const matchNip = (item.teacher.nip || '').toLowerCase().includes(q);
      const matchMapel = item.teacherMapel.some(
        m => (m.nama_mapel || '').toLowerCase().includes(q) || (m.kelas || '').toLowerCase().includes(q)
      );
      if (!matchName && !matchNip && !matchMapel) return false;
    }

    // Status filter
    if (statusFilter === 'Lengkap') return item.isComplete;
    if (statusFilter === 'Belum Lengkap') return !item.isComplete;
    if (statusFilter === 'Menunggu') return item.hasPendingVerification;

    return true;
  });

  // KPI Statistics
  const totalGuru = teachersList.length;
  const totalLengkap = teacherMatrixData.filter(t => t.isComplete).length;
  const totalBelumLengkap = totalGuru - totalLengkap;
  const totalMenungguVerif = dokumenList.filter(
    d => d.status_verifikasi === 'Menunggu' || !d.status_verifikasi
  ).length;

  return (
    <section id="view-dokumen" className="view-section page-enter">
      <div className="glass-card p-4 sm:p-6 mb-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4 no-print">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-folder-open text-sm"></i>
              </span>
              Perangkat Pembelajaran Kurikulum Merdeka
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isAdmin
                ? 'Matriks kelengkapan 6 dokumen administrasi KBM seluruh dewan guru.'
                : 'Kelola dan unggah 6 dokumen administrasi pembelajaran Anda.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAllData}
              title="Muat Ulang Data"
              className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-xl text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
            >
              <i className={`fa-solid fa-rotate-right ${fetching ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto custom-scroll pb-1 no-print">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all pill-interactive ${
                activeTab === 'matrix'
                  ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              <i className="fa-solid fa-table-cells mr-1.5 text-amber-600 dark:text-amber-400"></i> Matriks Guru ({totalGuru})
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all pill-interactive ${
                  activeTab === 'list'
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <i className="fa-solid fa-file-lines mr-1.5 text-amber-600 dark:text-amber-400"></i> Dokumen Saya ({dokumenList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all pill-interactive ${
                  activeTab === 'upload'
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <i className="fa-solid fa-cloud-arrow-up mr-1.5 text-amber-600 dark:text-amber-400"></i> Upload Baru
              </button>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ADMIN VIEW: TEACHER MATRIX CARD SYSTEM (R4.2)                             */}
        {/* ========================================================================= */}
        {isAdmin && activeTab === 'matrix' && (
          <div className="space-y-6 fade-in">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-3.5 rounded-2xl">
                <div className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                  Total Dewan Guru
                </div>
                <div className="text-xl font-black text-amber-900 dark:text-white mt-1">
                  {totalGuru} <span className="text-xs font-normal text-gray-500">Guru</span>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 p-3.5 rounded-2xl">
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
                  Dokumen Lengkap (6/6)
                </div>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                  {totalLengkap}{' '}
                  <span className="text-xs font-normal text-gray-500">
                    ({totalGuru > 0 ? Math.round((totalLengkap / totalGuru) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 p-3.5 rounded-2xl">
                <div className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wide">
                  Belum Lengkap (&lt;6)
                </div>
                <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1">
                  {totalBelumLengkap} <span className="text-xs font-normal text-gray-500">Guru</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 p-3.5 rounded-2xl">
                <div className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wide">
                  Menunggu Verifikasi
                </div>
                <div className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
                  {totalMenungguVerif} <span className="text-xs font-normal text-gray-500">Dokumen</span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama guru, NIP, atau mata pelajaran..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
                {(['Semua', 'Lengkap', 'Belum Lengkap', 'Menunggu'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all pill-interactive ${
                      statusFilter === f
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                  >
                    {f === 'Semua' ? 'Semua Guru' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Matrix Cards Grid */}
            {filteredTeacherMatrix.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs italic bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                Tidak ada data guru yang cocok dengan filter atau pencarian.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTeacherMatrix.map(({ teacher, teacherMapel, docStatusMap, completedCount, completionRate, isComplete }) => {
                  return (
                    <div
                      key={teacher.id}
                      className="bg-white dark:bg-gray-800/90 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-4 shadow-sm hover:shadow-md transition-all card-interactive flex flex-col justify-between"
                    >
                      <div>
                        {/* Teacher Header Info */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-black text-sm flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/50">
                              <i className="fa-solid fa-user-graduate"></i>
                            </div>
                            <div>
                              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                {teacher.nama_guru}
                              </h3>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                NIP: {teacher.nip || '-'}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}
                          >
                            {completedCount}/6 ({completionRate}%)
                          </span>
                        </div>

                        {/* KPI Completion Bar */}
                        <div className="mb-3.5">
                          <div className="flex justify-between items-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                            <span>Kelengkapan Kurikulum Merdeka</span>
                            <span>{completionRate}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isComplete
                                  ? 'bg-emerald-500'
                                  : completionRate >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>

                        {/* Assigned Subjects Badges */}
                        <div className="mb-4">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            Mata Pelajaran Diampu:
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scroll">
                            {teacherMapel.length === 0 ? (
                              <span className="text-[10px] text-gray-400 italic">
                                {teacher.mata_pelajaran || 'Belum ada mapel diinput'}
                              </span>
                            ) : (
                              teacherMapel.map(m => (
                                <span
                                  key={m.id}
                                  className="text-[9px] font-semibold bg-gray-100 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 rounded"
                                >
                                  {m.nama_mapel} ({m.kelas})
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* 6 Kurikulum Merdeka Document Matrix Grid */}
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                            Status 6 Perangkat Wajib:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {KURIKULUM_DOCS.map(doc => {
                              const matchDoc = docStatusMap[doc.id];
                              const isUploaded = Boolean(matchDoc);

                              return (
                                <button
                                  key={doc.id}
                                  type="button"
                                  onClick={() => matchDoc && setPreviewDoc(matchDoc)}
                                  disabled={!isUploaded}
                                  title={
                                    isUploaded
                                      ? `${doc.name} - Klik untuk preview / verifikasi`
                                      : `${doc.name} - Belum Diunggah`
                                  }
                                  className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between min-h-[56px] ${
                                    isUploaded
                                      ? 'bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 dark:border-emerald-800/60 cursor-pointer'
                                      : 'bg-gray-50/70 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700/60 opacity-70 cursor-default'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-black text-gray-800 dark:text-gray-200">
                                      {doc.short}
                                    </span>
                                    {isUploaded ? (
                                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px]">
                                        <i className="fa-solid fa-check"></i>
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 dark:text-gray-600 text-[9px]">
                                        <i className="fa-solid fa-minus"></i>
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[8.5px] mt-1 truncate">
                                    {isUploaded ? (
                                      <span
                                        className={`font-semibold ${
                                          matchDoc?.status_verifikasi === 'Disetujui'
                                            ? 'text-emerald-700 dark:text-emerald-400'
                                            : matchDoc?.status_verifikasi === 'Ditolak'
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-amber-600 dark:text-amber-400'
                                        }`}
                                      >
                                        {matchDoc?.status_verifikasi || 'Menunggu'}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">Belum Ada</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TEACHER VIEW: MY DOCUMENTS LIST & PERSONAL COMPLETENESS CHECKLIST         */}
        {/* ========================================================================= */}
        {!isAdmin && activeTab === 'list' && (
          <div className="space-y-6 fade-in">
            {/* Personal Curriculum Completeness Checklist for Teacher */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-400 flex items-center gap-1.5">
                  <i className="fa-solid fa-list-check"></i> Checklist 6 Perangkat Pembelajaran Anda
                </h3>
                <span className="text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-0.5 rounded-md">
                  {KURIKULUM_DOCS.filter(d => matchDocToType(dokumenList, d.id)).length}/6 Selesai
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {KURIKULUM_DOCS.map(doc => {
                  const matchDoc = matchDocToType(dokumenList, doc.id);
                  const uploaded = Boolean(matchDoc);

                  return (
                    <div
                      key={doc.id}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between min-h-[64px] ${
                        uploaded
                          ? 'bg-white dark:bg-gray-800 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 opacity-80'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-xs text-gray-900 dark:text-white">{doc.short}</span>
                        {uploaded ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs">
                            <i className="fa-solid fa-circle-check"></i>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">
                            <i className="fa-regular fa-circle"></i>
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate mt-1">
                        {uploaded ? matchDoc?.status_verifikasi || 'Menunggu' : 'Belum upload'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Uploaded Documents List */}
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3">
                Riwayat Dokumen yang Telah Anda Unggah ({dokumenList.length})
              </h3>

              {dokumenList.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs italic bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                  Belum ada dokumen yang diunggah. Klik tab &quot;Upload Baru&quot; untuk mengunggah berkas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dokumenList.map(dok => (
                    <div
                      key={dok.id}
                      className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-2xs flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                            {dok.jenis_dokumen}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              dok.status_verifikasi === 'Disetujui'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : dok.status_verifikasi === 'Ditolak'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {dok.status_verifikasi || 'Menunggu'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                          {dok.judul}
                        </h4>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                          {dok.timestamp ? formatTimestampWita(dok.timestamp) : '-'}
                        </div>

                        {dok.catatan_admin && (
                          <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-[10px] border border-gray-100 dark:border-gray-700">
                            <span className="font-bold block text-gray-700 dark:text-gray-300">Catatan Admin:</span>
                            <span className="text-gray-600 dark:text-gray-400 italic">{dok.catatan_admin}</span>
                          </div>
                        )}
                      </div>

                      {dok.link_file && (
                        <a
                          href={dok.link_file}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full text-center text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50 py-1.5 rounded-lg transition border border-amber-200 dark:border-amber-800"
                        >
                          <i className="fa-solid fa-file-pdf mr-1 text-red-500"></i> Buka Dokumen
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TEACHER VIEW: UPLOAD NEW DOCUMENT FORM                                    */}
        {/* ========================================================================= */}
        {!isAdmin && activeTab === 'upload' && (
          <div id="dokumen-content-upload" className="fade-in max-w-xl mx-auto">
            <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-cloud-arrow-up text-amber-600 dark:text-amber-400"></i>
                Upload Perangkat Pembelajaran Baru
              </h3>
              <form onSubmit={submitDokumen} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Jenis Dokumen Kurikulum Merdeka <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={jenis}
                    onChange={e => setJenis(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                  >
                    <option value="" disabled>-- Pilih Jenis Dokumen --</option>
                    {KURIKULUM_DOCS.map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.short})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Judul / Deskripsi Dokumen <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={judul}
                    onChange={e => setJudul(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                    placeholder="Contoh: Modul Ajar Matematika Bab 1 Kelas X Merdeka"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">
                    Upload Berkas (PDF / Dokumen) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*,.docx,.doc"
                    onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full px-3 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-click w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Mengupload...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up"></i> Upload Perangkat
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* QUICK PREVIEW & VERIFICATION MODAL FOR ADMIN & TEACHERS                   */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-gray-100 dark:border-gray-800 modal-pop space-y-4 max-h-[90vh] overflow-y-auto custom-scroll">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                  {previewDoc.jenis_dokumen}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mt-0.5 leading-snug">
                  {previewDoc.judul}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Nama Guru Pengunggah:</span>
                <span className="font-bold text-gray-900 dark:text-white">{previewDoc.nama_guru}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Tanggal Upload:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {previewDoc.timestamp ? formatTimestampWita(previewDoc.timestamp) : '-'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-800 items-center">
                <span className="text-gray-500 dark:text-gray-400">Status Verifikasi:</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    previewDoc.status_verifikasi === 'Disetujui'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : previewDoc.status_verifikasi === 'Ditolak'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  {previewDoc.status_verifikasi || 'Menunggu'}
                </span>
              </div>

              {previewDoc.catatan_admin && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Catatan Verifikasi Admin:
                  </span>
                  <p className="text-gray-600 dark:text-gray-300 italic text-xs leading-relaxed">
                    {previewDoc.catatan_admin}
                  </p>
                </div>
              )}
            </div>

            {/* File view link */}
            {previewDoc.link_file && (
              <a
                href={previewDoc.link_file}
                target="_blank"
                rel="noreferrer"
                className="btn-click w-full block text-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <i className="fa-solid fa-arrow-up-right-from-square mr-1.5 text-blue-500"></i> Buka Dokumen di Tab Baru
              </a>
            )}

            {/* Admin Verification Actions */}
            {isAdmin && (
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => handleVerifyDokumen(previewDoc.id, 'Disetujui')}
                  className="btn-click flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-check"></i> Setujui Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyDokumen(previewDoc.id, 'Ditolak')}
                  className="btn-click flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-xl transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-xmark"></i> Tolak Dokumen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
