'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { formatDateWita, formatTimestampWita } from '@/lib/wita';
import { Pengumuman, PengumumanTanggapan } from '@/types/database';

export default function InformasiView({ user, setView: _setView }: { user: any; setView?: (view: string) => void }) {
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

  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) setShowModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, submitting]);

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
      <div className="glass-card p-4 sm:p-6 mb-6 rounded-3xl">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-slate-300/60 dark:border-slate-700/60 pb-4">
          <div>
            <h2 className="text-xl font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
              <span className="w-9 h-9 rounded-xl neu-inset text-[#0F766E] dark:text-teal-400 flex items-center justify-center">
                <i className="fa-solid fa-bullhorn text-sm"></i>
              </span>
              Pusat Informasi & Siaran
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
              Sistem broadcast terpadu KBM, kedinasan, dan komunikasi antar civitas sekolah.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="neu-btn neu-btn-primary btn-click flex-1 sm:flex-initial text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <i className="fa-solid fa-plus text-xs"></i> Buat Siaran Baru
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              title="Muat Ulang Data"
              className="neu-btn btn-click w-9 h-9 text-[#334155] dark:text-[#F1F5F9] rounded-xl text-xs font-bold flex justify-center items-center"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Search & Audience Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3 text-[#475569] dark:text-[#94A3B8] text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari siaran berdasarkan judul atau isi..."
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
            {(['Semua', 'Guru', 'Wali Kelas', 'Orang Tua'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`neu-btn px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all pill-interactive ${
                  activeFilter === tab
                    ? 'neu-btn-primary text-white'
                    : 'text-[#334155] dark:text-[#CBD5E1]'
                }`}
              >
                {tab === 'Semua' ? 'Semua Sasaran' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Feed List */}
        {loading ? (
          <div className="text-center py-16 text-[#475569] dark:text-[#94A3B8] text-xs">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#0F766E] dark:text-teal-400 mb-2 block"></i>
            Memuat siaran dan pengumuman...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 neu-inset rounded-2xl">
            <div className="w-12 h-12 rounded-full neu-card-sm text-[#475569] dark:text-[#94A3B8] flex items-center justify-center mx-auto mb-3 text-lg">
              <i className="fa-solid fa-bullhorn"></i>
            </div>
            <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Belum ada pengumuman untuk sasaran ini</p>
            <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-1">
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
                  className={`card-interactive rounded-2xl transition-all p-4 sm:p-5 relative ${
                    p.is_pinned
                      ? 'neu-card-sm ring-2 ring-amber-500/40'
                      : 'neu-card-sm'
                  }`}
                >
                  {/* Top Bar: Badges, Date, Pin, Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.is_pinned && (
                        <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                          <i className="fa-solid fa-thumbtack text-[9px]"></i> Disematkan
                        </span>
                      )}
                      <span className="bg-teal-500/15 text-[#0F766E] dark:text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        🎯 {p.sasaran}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isTwoWay
                            ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
                            : 'neu-inset text-[#475569] dark:text-[#94A3B8]'
                        }`}
                      >
                        <i className={`fa-solid ${isTwoWay ? 'fa-comments' : 'fa-bullhorn'} text-[9px] mr-1`}></i>
                        {p.mode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#475569] dark:text-[#94A3B8]">
                      <span>{p.created_at ? formatTimestampWita(p.created_at) : ''}</span>

                      {/* Admin Quick Action dropdown/buttons */}
                      {isAdmin && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-300/60 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(p)}
                            title={p.is_pinned ? 'Cabut Sematan' : 'Sematkan ke Atas'}
                            className={`neu-btn p-1.5 rounded-lg text-xs transition ${
                              p.is_pinned ? 'text-[#D97706] dark:text-amber-400 font-bold' : 'text-[#475569] dark:text-[#94A3B8]'
                            }`}
                          >
                            <i className="fa-solid fa-thumbtack"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Pengumuman"
                            className="neu-btn p-1.5 rounded-lg text-sky-600 dark:text-sky-400 text-xs transition"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAnnouncement(p.id, p.judul)}
                            title="Hapus Pengumuman"
                            className="neu-btn p-1.5 rounded-lg text-rose-600 dark:text-rose-400 text-xs transition"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Author */}
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-snug mb-1.5">
                    {p.judul}
                  </h3>
                  <div className="text-[11px] text-[#475569] dark:text-[#94A3B8] mb-3 flex items-center gap-1.5">
                    <span className="font-semibold text-[#334155] dark:text-[#CBD5E1]">
                      <i className="fa-solid fa-user-tie mr-1 text-[#0F766E] dark:text-teal-400"></i>
                      {p.penulis_nama}
                    </span>
                    <span>•</span>
                    <span className="text-[10px] neu-inset px-2 py-0.5 rounded font-medium">
                      {p.penulis_role}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="text-xs sm:text-sm text-[#334155] dark:text-[#CBD5E1] whitespace-pre-line leading-relaxed mb-4">
                    {p.konten}
                  </div>

                  {/* Attachment if present */}
                  {p.lampiran_url && p.lampiran_url.trim() !== '' && (
                    <div className="mb-4">
                      <a
                        href={p.lampiran_url}
                        target="_blank"
                        rel="noreferrer"
                        className="neu-btn inline-flex items-center gap-2 text-sky-700 dark:text-sky-300 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                      >
                        <i className="fa-solid fa-paperclip"></i> Buka Dokumen Lampiran
                      </a>
                    </div>
                  )}

                  {/* Footer Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-300/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(p)}
                      className="neu-btn btn-click inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                    >
                      <i className="fa-brands fa-whatsapp text-sm text-emerald-600 dark:text-emerald-400"></i> Kirim via WhatsApp
                    </button>

                    {/* Two-Way Comment Toggle */}
                    {isTwoWay ? (
                      <button
                        type="button"
                        onClick={() => setOpenCommentsId(commentsOpen ? null : p.id)}
                        className={`neu-btn btn-click inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                          commentsOpen
                            ? 'neu-btn-primary text-white'
                            : 'text-[#0F766E] dark:text-teal-300'
                        }`}
                      >
                        <i className="fa-solid fa-comments"></i>
                        {responses.length > 0 ? `${responses.length} Tanggapan` : 'Beri Tanggapan'}
                        <i className={`fa-solid fa-chevron-${commentsOpen ? 'up' : 'down'} text-[10px] ml-1`}></i>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#475569] dark:text-[#94A3B8] italic">
                        <i className="fa-solid fa-lock text-[10px] mr-1"></i> Siaran Satu Arah
                      </span>
                    )}
                  </div>

                  {/* Two-Way Discussion Thread */}
                  {isTwoWay && commentsOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-300/60 dark:border-slate-700/60 space-y-3 fade-in neu-inset p-3 sm:p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                        <i className="fa-solid fa-comments text-[#0F766E] dark:text-teal-400"></i>
                        Diskusi & Tanggapan ({responses.length})
                      </h4>

                      {/* Comment input box */}
                      <div className="flex gap-2 items-start">
                        <textarea
                          rows={2}
                          value={newCommentText[p.id] || ''}
                          onChange={e => setNewCommentText({ ...newCommentText, [p.id]: e.target.value })}
                          placeholder="Tulis tanggapan atau konfirmasi Anda..."
                          className="flex-1 px-3 py-2 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9] resize-none"
                        />
                        <button
                          type="button"
                          disabled={sendingCommentId === p.id || !newCommentText[p.id]?.trim()}
                          onClick={() => handleSubmitComment(p.id)}
                          className="neu-btn neu-btn-primary btn-click text-white font-bold px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
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
                        <div className="text-center py-3 text-[11px] text-[#475569] dark:text-[#94A3B8] italic">
                          Belum ada tanggapan untuk siaran ini. Jadilah yang pertama memberikan masukan.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scroll pr-1">
                          {responses.map(resp => {
                            const canDelete = isAdmin || resp.user_nama === user?.nama;

                            return (
                              <div
                                key={resp.id}
                                className="neu-card-sm p-2.5 rounded-xl flex justify-between items-start gap-2"
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-[#0F172A] dark:text-[#F1F5F9]">
                                      {resp.user_nama}
                                    </span>
                                    <span className="text-[9px] bg-teal-500/15 text-[#0F766E] dark:text-teal-300 px-1.5 py-0.5 rounded font-semibold">
                                      {resp.user_role}
                                    </span>
                                    <span className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                                      {resp.created_at ? formatTimestampWita(resp.created_at) : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#334155] dark:text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
                                    {resp.komentar}
                                  </p>
                                </div>

                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(resp.id, p.id)}
                                    title="Hapus tanggapan"
                                    className="text-[#475569] hover:text-rose-500 text-xs p-1 transition"
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
        <div
          className="fixed inset-0 bg-[#0F172A]/50 dark:bg-black/65 z-50 flex items-center justify-center p-4"
          onClick={() => { if (!submitting) setShowModal(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={modalMode === 'create' ? 'Buat Siaran / Pengumuman Baru' : 'Edit Siaran Pengumuman'}
            onClick={(e) => e.stopPropagation()}
            className="neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-3xl w-full max-w-lg p-5 sm:p-6 modal-pop max-h-[90dvh] overflow-y-auto custom-scroll"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-300/60 dark:border-slate-700/60 mb-4">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-[#0F766E] dark:text-teal-400"></i>
                {modalMode === 'create' ? 'Buat Siaran / Pengumuman Baru' : 'Edit Siaran Pengumuman'}
              </h3>
              <button
                type="button"
                aria-label="Tutup modal pengumuman"
                onClick={() => setShowModal(false)}
                className="neu-btn w-11 h-11 rounded-full flex items-center justify-center text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] transition shrink-0"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitAnnouncement} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Judul Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={judul}
                  onChange={e => setJudul(e.target.value)}
                  placeholder="Contoh: Jadwal Ujian Akhir Semester Ganjil 2026/2027"
                  className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                    Sasaran Audiens
                  </label>
                  <select
                    value={sasaran}
                    onChange={e => setSasaran(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                  >
                    <option value="Semua">Semua Civitas</option>
                    <option value="Guru">Khusus Dewan Guru</option>
                    <option value="Wali Kelas">Wali Kelas</option>
                    <option value="Orang Tua">Orang Tua / Wali Murid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                    Mode Komunikasi
                  </label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                  >
                    <option value="Satu Arah">Satu Arah (Broadcast Only)</option>
                    <option value="Dua Arah">Dua Arah (Diskusi & Tanggapan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Isi Pengumuman <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={konten}
                  onChange={e => setKonten(e.target.value)}
                  placeholder="Tuliskan detail pengumuman secara rinci, lugas, dan jelas..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Link Lampiran / Surat Edaran (Opsional)
                </label>
                <input
                  type="url"
                  value={lampiranUrl}
                  onChange={e => setLampiranUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/... atau link dokumen lainnya"
                  className="w-full px-3 py-2.5 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
                />
              </div>

              <div className="flex items-center gap-2 p-3 neu-inset border border-amber-500/25 rounded-xl">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="w-4 h-4 text-[#D97706] rounded focus:ring-amber-500"
                />
                <label htmlFor="pinCheck" className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer">
                  📌 Sematkan ke Paling Atas (Pin Announcement)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-300/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="neu-btn px-4 py-2.5 rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neu-btn neu-btn-primary btn-click text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
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
