'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { formatDateWita, formatTimestampWita } from '@/lib/wita';
import { Pengumuman, PengumumanTanggapan } from '@/types/database';

export default function InformasiView({ user, setView }: { user: any; setView?: (view: string) => void }) {
  const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
  const [tanggapanMap, setTanggapanMap] = useState<Record<string, PengumumanTanggapan[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'Semua' | 'Guru' | 'Wali Kelas' | 'Orang Tua'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [judul, setJudul] = useState('');
  const [konten, setKonten] = useState('');
  const [sasaran, setSasaran] = useState<'Semua' | 'Guru' | 'Wali Kelas' | 'Orang Tua'>('Semua');
  const [mode, setMode] = useState<'Satu Arah' | 'Dua Arah'>('Satu Arah');
  const [isPinned, setIsPinned] = useState(false);
  const [lampiranUrl, setLampiranUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Two-way interaction
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});
  const [sendingCommentId, setSendingCommentId] = useState<string | null>(null);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Fetch announcements: pinned first, then newest
      const { data: announcements, error: annError } = await supabase
        .from('pengumuman')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (annError) {
        console.error('Error fetching pengumuman:', annError);
      } else if (announcements) {
        setPengumumanList(announcements as Pengumuman[]);
      }

      // 2. Fetch responses
      const { data: responses, error: respError } = await supabase
        .from('pengumuman_tanggapan')
        .select('*')
        .order('created_at', { ascending: true });

      if (respError) {
        console.error('Error fetching tanggapan:', respError);
      } else if (responses) {
        const grouped: Record<string, PengumumanTanggapan[]> = {};
        responses.forEach((r: PengumumanTanggapan) => {
          if (!grouped[r.pengumuman_id]) grouped[r.pengumuman_id] = [];
          grouped[r.pengumuman_id].push(r);
        });
        setTanggapanMap(grouped);
      }
    } catch (err) {
      console.error('Data load exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setJudul('');
    setKonten('');
    setSasaran('Semua');
    setMode('Satu Arah');
    setIsPinned(false);
    setLampiranUrl('');
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Pengumuman) => {
    setModalMode('edit');
    setEditingId(p.id);
    setJudul(p.judul);
    setKonten(p.konten);
    setSasaran(p.sasaran as any);
    setMode(p.mode as any);
    setIsPinned(!!p.is_pinned);
    setLampiranUrl(p.lampiran_url || '');
    setShowModal(true);
  };

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !konten.trim()) {
      Swal.fire('Peringatan', 'Judul dan konten pengumuman wajib diisi!', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        const payload = {
          judul: judul.trim(),
          konten: konten.trim(),
          sasaran,
          mode,
          penulis_nama: user?.nama || 'Admin',
          penulis_role: user?.role || 'Admin',
          is_pinned: isPinned,
          lampiran_url: lampiranUrl.trim() || null
        };

        const { error } = await supabase.from('pengumuman').insert([payload]);
        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Siaran Berhasil Dibuat',
          text: 'Pengumuman telah dipublikasikan ke sistem.',
          timer: 1800,
          showConfirmButton: false
        });
      } else if (modalMode === 'edit' && editingId) {
        const payload = {
          judul: judul.trim(),
          konten: konten.trim(),
          sasaran,
          mode,
          is_pinned: isPinned,
          lampiran_url: lampiranUrl.trim() || null,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('pengumuman')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Siaran Diperbarui',
          text: 'Perubahan pengumuman berhasil disimpan.',
          timer: 1800,
          showConfirmButton: false
        });
      }

      setShowModal(false);
      loadData();
    } catch (err: any) {
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: 'Hapus Siaran?',
      html: `Apakah Anda yakin ingin menghapus pengumuman <b>"${title}"</b>?<br/><span class="text-xs text-red-500">Semua tanggapan/komentar terkait juga akan terhapus.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('pengumuman').delete().eq('id', id);
        if (error) throw error;

        Swal.fire({
          icon: 'success',
          title: 'Berhasil Dihapus',
          timer: 1500,
          showConfirmButton: false
        });
        loadData();
      } catch (err: any) {
        Swal.fire('Gagal Menghapus', err.message, 'error');
      }
    }
  };

  const handleTogglePin = async (p: Pengumuman) => {
    try {
      const updatedPin = !p.is_pinned;
      const { error } = await supabase
        .from('pengumuman')
        .update({ is_pinned: updatedPin })
        .eq('id', p.id);
      if (error) throw error;

      Swal.fire({
        icon: 'info',
        title: updatedPin ? 'Pengumuman Disematkan (Pinned)' : 'Sematkan Dicabut',
        toast: true,
        position: 'top-end',
        timer: 1500,
        showConfirmButton: false
      });
      loadData();
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleShareWhatsApp = (p: Pengumuman) => {
    const formattedDate = p.created_at ? formatDateWita(p.created_at) : '-';
    const text =
      `📢 *PENGUMUMAN RESMI SIPJAM NIZAMUDIN*\n\n` +
      `📌 *${p.judul}*\n` +
      `🎯 Sasaran: *${p.sasaran}*\n` +
      `📅 Tanggal: ${formattedDate}\n` +
      `✍️ Oleh: ${p.penulis_nama} (${p.penulis_role})\n\n` +
      `${p.konten}\n\n` +
      (p.lampiran_url ? `📎 Lampiran: ${p.lampiran_url}\n\n` : '') +
      `_Pesan broadcast via SIPJAM Nizamudin_`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSubmitComment = async (pengumumanId: string) => {
    const comment = newCommentText[pengumumanId]?.trim();
    if (!comment) return;

    setSendingCommentId(pengumumanId);
    try {
      const payload = {
        pengumuman_id: pengumumanId,
        user_nama: user?.nama || 'Pengguna',
        user_role: user?.role || 'Guru',
        komentar: comment
      };

      const { data, error } = await supabase
        .from('pengumuman_tanggapan')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTanggapanMap(prev => ({
          ...prev,
          [pengumumanId]: [...(prev[pengumumanId] || []), data as PengumumanTanggapan]
        }));
      }

      setNewCommentText(prev => ({ ...prev, [pengumumanId]: '' }));
    } catch (err: any) {
      Swal.fire('Gagal Mengirim Tanggapan', err.message, 'error');
    } finally {
      setSendingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string, pengumumanId: string) => {
    try {
      const { error } = await supabase.from('pengumuman_tanggapan').delete().eq('id', commentId);
      if (error) throw error;

      setTanggapanMap(prev => ({
        ...prev,
        [pengumumanId]: (prev[pengumumanId] || []).filter(c => c.id !== commentId)
      }));
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  // Filter announcements
  const filteredList = pengumumanList.filter(p => {
    // Audience filter
    if (activeFilter !== 'Semua') {
      if (p.sasaran !== activeFilter && p.sasaran !== 'Semua') return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (p.judul || '').toLowerCase().includes(q);
      const matchContent = (p.konten || '').toLowerCase().includes(q);
      const matchAuthor = (p.penulis_nama || '').toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <section id="view-informasi" className="view-section page-enter">
      <div className="glass-card p-4 sm:p-6 mb-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-sm">
                <i className="fa-solid fa-bullhorn text-sm"></i>
              </span>
              Pusat Informasi & Siaran
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Sistem broadcast terpadu KBM, kedinasan, dan komunikasi antar civitas sekolah.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="btn-click flex-1 sm:flex-initial bg-nizamudin-green hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <i className="fa-solid fa-plus text-xs"></i> Buat Siaran Baru
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              title="Muat Ulang Data"
              className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-xl text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Search & Audience Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari siaran berdasarkan judul atau isi..."
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
            {(['Semua', 'Guru', 'Wali Kelas', 'Orang Tua'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all pill-interactive ${
                  activeFilter === tab
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {tab === 'Semua' ? 'Semua Sasaran' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Feed List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-teal-600 mb-2 block"></i>
            Memuat siaran dan pengumuman...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto mb-3 text-lg">
              <i className="fa-solid fa-bullhorn"></i>
            </div>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Belum ada pengumuman untuk sasaran ini</p>
            <p className="text-[11px] text-gray-400 mt-1">
              {isAdmin ? 'Klik tombol "Buat Siaran Baru" di atas untuk mengirim pengumuman.' : 'Pengumuman resmi akan muncul di sini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredList.map(p => {
              const responses = tanggapanMap[p.id] || [];
              const isTwoWay = p.mode === 'Dua Arah';
              const commentsOpen = openCommentsId === p.id;

              return (
                <article
                  key={p.id}
                  className={`card-interactive rounded-2xl border transition-all p-4 sm:p-5 relative ${
                    p.is_pinned
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-700/60 shadow-sm'
                      : 'bg-white dark:bg-gray-800/90 border-gray-100 dark:border-gray-700 shadow-sm'
                  }`}
                >
                  {/* Top Bar: Badges, Date, Pin, Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.is_pinned && (
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <i className="fa-solid fa-thumbtack text-[9px]"></i> Disematkan
                        </span>
                      )}
                      <span className="bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                        🎯 {p.sasaran}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isTwoWay
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <i className={`fa-solid ${isTwoWay ? 'fa-comments' : 'fa-bullhorn'} text-[9px] mr-1`}></i>
                        {p.mode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>{p.created_at ? formatTimestampWita(p.created_at) : ''}</span>

                      {/* Admin Quick Action dropdown/buttons */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(p)}
                            title={p.is_pinned ? 'Cabut Sematan' : 'Sematkan ke Atas'}
                            className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xs transition ${
                              p.is_pinned ? 'text-amber-500 font-bold' : 'text-gray-400'
                            }`}
                          >
                            <i className="fa-solid fa-thumbtack"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Pengumuman"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500 text-xs transition"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(p.id, p.judul)}
                            title="Hapus Pengumuman"
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500 text-xs transition"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Author */}
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug mb-1.5">
                    {p.judul}
                  </h3>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      <i className="fa-solid fa-user-tie mr-1 text-teal-600 dark:text-teal-400"></i>
                      {p.penulis_nama}
                    </span>
                    <span>•</span>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.2 rounded font-medium">
                      {p.penulis_role}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line leading-relaxed mb-4">
                    {p.konten}
                  </div>

                  {/* Attachment if present */}
                  {p.lampiran_url && p.lampiran_url.trim() !== '' && (
                    <div className="mb-4">
                      <a
                        href={p.lampiran_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold transition border border-blue-200 dark:border-blue-800"
                      >
                        <i className="fa-solid fa-paperclip"></i> Buka Dokumen Lampiran
                      </a>
                    </div>
                  )}

                  {/* Footer Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-gray-700/80">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(p)}
                      className="btn-click inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                    >
                      <i className="fa-brands fa-whatsapp text-sm text-emerald-500"></i> Kirim via WhatsApp
                    </button>

                    {/* Two-Way Comment Toggle */}
                    {isTwoWay ? (
                      <button
                        type="button"
                        onClick={() => setOpenCommentsId(commentsOpen ? null : p.id)}
                        className={`btn-click inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          commentsOpen
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        <i className="fa-solid fa-comments"></i>
                        {responses.length > 0 ? `${responses.length} Tanggapan` : 'Beri Tanggapan'}
                        <i className={`fa-solid fa-chevron-${commentsOpen ? 'up' : 'down'} text-[10px] ml-1`}></i>
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">
                        <i className="fa-solid fa-lock text-[10px] mr-1"></i> Siaran Satu Arah
                      </span>
                    )}
                  </div>

                  {/* Two-Way Discussion Thread */}
                  {isTwoWay && commentsOpen && (
                    <div className="mt-4 pt-4 border-t border-purple-100 dark:border-purple-900/40 space-y-3 fade-in bg-purple-50/30 dark:bg-purple-950/10 p-3 sm:p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <i className="fa-solid fa-comments text-purple-600 dark:text-purple-400"></i>
                        Diskusi & Tanggapan ({responses.length})
                      </h4>

                      {/* Comment input box */}
                      <div className="flex gap-2 items-start">
                        <textarea
                          rows={2}
                          value={newCommentText[p.id] || ''}
                          onChange={e => setNewCommentText({ ...newCommentText, [p.id]: e.target.value })}
                          placeholder="Tulis tanggapan atau konfirmasi Anda..."
                          className="flex-1 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 resize-none"
                        />
                        <button
                          type="button"
                          disabled={sendingCommentId === p.id || !newCommentText[p.id]?.trim()}
                          onClick={() => handleSubmitComment(p.id)}
                          className="btn-click bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-2.5 rounded-xl text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                        >
                          {sendingCommentId === p.id ? (
                            <i className="fa-solid fa-spinner animate-spin"></i>
                          ) : (
                            <>
                              <i className="fa-solid fa-paper-plane text-xs"></i>
                              <span className="hidden sm:inline">Kirim</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Comments stream */}
                      {responses.length === 0 ? (
                        <div className="text-center py-3 text-[11px] text-gray-400 italic">
                          Belum ada tanggapan untuk siaran ini. Jadilah yang pertama memberikan masukan.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scroll pr-1">
                          {responses.map(resp => {
                            const canDelete = isAdmin || resp.user_nama === user?.nama;

                            return (
                              <div
                                key={resp.id}
                                className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-purple-100 dark:border-gray-700 shadow-2xs flex justify-between items-start gap-2"
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-gray-900 dark:text-white">
                                      {resp.user_nama}
                                    </span>
                                    <span className="text-[9px] bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.2 rounded font-semibold">
                                      {resp.user_role}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      {resp.created_at ? formatTimestampWita(resp.created_at) : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {resp.komentar}
                                  </p>
                                </div>

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(resp.id, p.id)}
                                    title="Hapus tanggapan"
                                    className="text-gray-400 hover:text-red-500 text-xs p-1 transition"
                                  >
                                    <i className="fa-solid fa-xmark"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Compose / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-gray-100 dark:border-gray-800 modal-pop max-h-[90vh] overflow-y-auto custom-scroll">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-teal-600 dark:text-teal-400"></i>
                {modalMode === 'create' ? 'Buat Siaran / Pengumuman Baru' : 'Edit Siaran Pengumuman'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Judul Pengumuman <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={judul}
                  onChange={e => setJudul(e.target.value)}
                  placeholder="Contoh: Jadwal Ujian Akhir Semester Ganjil 2026/2027"
                  className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Sasaran Audiens
                  </label>
                  <select
                    value={sasaran}
                    onChange={e => setSasaran(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                  >
                    <option value="Semua">Semua Civitas</option>
                    <option value="Guru">Khusus Dewan Guru</option>
                    <option value="Wali Kelas">Wali Kelas</option>
                    <option value="Orang Tua">Orang Tua / Wali Murid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Mode Komunikasi
                  </label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                  >
                    <option value="Satu Arah">Satu Arah (Broadcast Only)</option>
                    <option value="Dua Arah">Dua Arah (Diskusi & Tanggapan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Isi Pengumuman <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={konten}
                  onChange={e => setKonten(e.target.value)}
                  placeholder="Tuliskan detail pengumuman secara rinci, lugas, dan jelas..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Link Lampiran / Surat Edaran (Opsional)
                </label>
                <input
                  type="url"
                  value={lampiranUrl}
                  onChange={e => setLampiranUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/... atau link dokumen lainnya"
                  className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <label htmlFor="pinCheck" className="text-xs font-bold text-gray-800 dark:text-gray-200 cursor-pointer">
                  📌 Sematkan ke Paling Atas (Pin Announcement)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-click bg-nizamudin-green hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner animate-spin"></i> Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane"></i>
                      {modalMode === 'create' ? 'Publikasikan Siaran' : 'Simpan Perubahan'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
