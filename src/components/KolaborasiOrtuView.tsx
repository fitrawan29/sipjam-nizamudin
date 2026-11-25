'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import ClayCard from './ClayCard';
import ClayButton from './ClayButton';
import { showToast } from '@/lib/toast';
import { formatDateWita, formatTimestampWita, getWitaDateStr } from '@/lib/wita';
import { buildAbsensiRowsFromIzin, isOrangTuaRole } from '@/lib/kolaborasiSync';
import { AppUser } from '@/types/user';

interface StudentOption {
  id: string;
  nama_siswa: string;
  nisn: string;
  kelas: string;
  hubungan?: string;
}

interface TopikItem {
  id: string;
  sekolah_id: string;
  siswa_id: string;
  kelas: string;
  judul: string;
  kategori: string;
  dibuat_oleh_id: string | null;
  dibuat_oleh_nama: string;
  dibuat_oleh_role: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

interface PesanItem {
  id: string;
  topik_id: string;
  pengirim_id: string | null;
  pengirim_nama: string;
  pengirim_role: string;
  isi: string;
  lampiran_url: string | null;
  created_at: string;
}

interface IzinItem {
  id: string;
  sekolah_id: string;
  siswa_id: string;
  nisn: string | null;
  nama_siswa: string;
  kelas: string;
  orang_tua_id: string | null;
  orang_tua_nama: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  jenis: string;
  alasan: string;
  lampiran_url: string | null;
  status: string;
  catatan_guru: string | null;
  diproses_oleh: string | null;
  diproses_at: string | null;
  created_at: string;
}

export default function KolaborasiOrtuView({ user }: { user: AppUser }) {
  const isOrtu = isOrangTuaRole(user?.role);
  const sekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';

  const [activeTab, setActiveTab] = useState<'diskusi' | 'monitoring' | 'izin'>('diskusi');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('');
  const [filterKelas, setFilterKelas] = useState<string>('ALL');

  // Diskusi state
  const [topics, setTopics] = useState<TopikItem[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PesanItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Monitoring state
  const [absensiRows, setAbsensiRows] = useState<any[]>([]);
  const [presensiGerbangRows, setPresensiGerbangRows] = useState<any[]>([]);
  const [nilaiRows, setNilaiRows] = useState<any[]>([]);
  const [loadingMonitor, setLoadingMonitor] = useState(false);

  // Izin state
  const [izinList, setIzinList] = useState<IzinItem[]>([]);
  const [izinJenis, setIzinJenis] = useState<'Izin' | 'Sakit'>('Izin');
  const [izinMulai, setIzinMulai] = useState(getWitaDateStr());
  const [izinSelesai, setIzinSelesai] = useState(getWitaDateStr());
  const [izinAlasan, setIzinAlasan] = useState('');
  const [izinLampiran, setIzinLampiran] = useState('');
  const [submittingIzin, setSubmittingIzin] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedSiswaId) || null,
    [students, selectedSiswaId]
  );

  const kelasOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.kelas).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const studentMap = useMemo(() => {
    const map: Record<string, StudentOption> = {};
    students.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  // 1. Load linked students (for Orang Tua) or all school students (for Guru/BK/Admin)
  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      if (isOrtu) {
        const { data: links } = await supabase
          .from('orang_tua_siswa')
          .select('siswa_id, hubungan')
          .eq('sekolah_id', sekolahId)
          .eq('user_id', user.id);

        const ids = (links || []).map((l: any) => l.siswa_id).filter(Boolean);
        if (ids.length === 0) {
          setStudents([]);
          setSelectedSiswaId('');
          return;
        }
        const hubMap: Record<string, string> = {};
        (links || []).forEach((l: any) => {
          hubMap[l.siswa_id] = l.hubungan;
        });

        const { data: siswaRows } = await supabase
          .from('data_siswa')
          .select('id, nama_siswa, nisn, kelas')
          .in('id', ids)
          .order('nama_siswa');

        const mapped: StudentOption[] = (siswaRows || []).map((s: any) => ({
          id: s.id,
          nama_siswa: s.nama_siswa || '-',
          nisn: s.nisn || '-',
          kelas: s.kelas || '-',
          hubungan: hubMap[s.id] || 'Orang Tua',
        }));
        setStudents(mapped);
        if (mapped.length > 0 && !selectedSiswaId) {
          setSelectedSiswaId(mapped[0].id);
        }
      } else {
        const { data: siswaRows } = await supabase
          .from('data_siswa')
          .select('id, nama_siswa, nisn, kelas')
          .eq('sekolah_id', sekolahId)
          .order('kelas')
          .order('nama_siswa');

        const mapped: StudentOption[] = (siswaRows || []).map((s: any) => ({
          id: s.id,
          nama_siswa: s.nama_siswa || '-',
          nisn: s.nisn || '-',
          kelas: s.kelas || '-',
        }));
        setStudents(mapped);
        if (mapped.length > 0 && !selectedSiswaId) {
          setSelectedSiswaId(mapped[0].id);
        }
      }
    } catch (err) {
      console.error('[KolaborasiOrtuView] loadStudents error:', err);
    } finally {
      setLoading(false);
    }
  }, [isOrtu, sekolahId, user?.id]);

  // 2. Load topics & izin list
  const loadTopicsAndIzin = useCallback(async () => {
    if (isOrtu && students.length === 0) {
      setTopics([]);
      setIzinList([]);
      return;
    }
    const allowedIds = isOrtu ? students.map((s) => s.id) : null;

    let topQuery = supabase
      .from('kolaborasi_topik')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('last_message_at', { ascending: false });
    if (allowedIds) {
      topQuery = topQuery.in('siswa_id', allowedIds);
    }
    const { data: topData } = await topQuery;
    setTopics((topData || []) as TopikItem[]);

    let izinQuery = supabase
      .from('izin_siswa_ortu')
      .select('*')
      .eq('sekolah_id', sekolahId)
      .order('created_at', { ascending: false });
    if (allowedIds) {
      izinQuery = izinQuery.in('siswa_id', allowedIds);
    }
    const { data: izinData } = await izinQuery;
    setIzinList((izinData || []) as IzinItem[]);
  }, [isOrtu, sekolahId, students]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadTopicsAndIzin();
  }, [loadTopicsAndIzin]);

  // 3. Load messages for selected topic
  const loadMessages = useCallback(async (topicId: string | null) => {
    if (!topicId) {
      setMessages([]);
      return;
    }
    const { data } = await supabase
      .from('kolaborasi_pesan')
      .select('*')
      .eq('topik_id', topicId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as PesanItem[]);
  }, []);

  useEffect(() => {
    loadMessages(selectedTopicId);
  }, [selectedTopicId, loadMessages]);

  // 4. Load monitoring data when tab === 'monitoring' or selectedSiswaId changes
  useEffect(() => {
    if (activeTab !== 'monitoring' || !selectedSiswaId) return;
    let cancelled = false;
    const fetchMonitor = async () => {
      setLoadingMonitor(true);
      try {
        const [{ data: absData }, { data: presData }, { data: nilData }] = await Promise.all([
          supabase
            .from('absensi')
            .select('*')
            .eq('sekolah_id', sekolahId)
            .eq('siswa_id', selectedSiswaId)
            .order('tanggal', { ascending: false })
            .limit(30),
          supabase
            .from('presensi_siswa')
            .select('*')
            .eq('sekolah_id', sekolahId)
            .eq('siswa_id', selectedSiswaId)
            .order('tanggal', { ascending: false })
            .limit(20),
          supabase
            .from('nilai_siswa')
            .select('*, asesmen_kolom(nama, kategori)')
            .eq('sekolah_id', sekolahId)
            .eq('siswa_id', selectedSiswaId)
            .order('updated_at', { ascending: false })
            .limit(40),
        ]);
        if (!cancelled) {
          setAbsensiRows(absData || []);
          setPresensiGerbangRows(presData || []);
          setNilaiRows(nilData || []);
        }
      } finally {
        if (!cancelled) setLoadingMonitor(false);
      }
    };
    fetchMonitor();
    return () => {
      cancelled = true;
    };
  }, [activeTab, sekolahId, selectedSiswaId]);

  // Create new discussion topic
  const handleCreateTopic = async () => {
    if (students.length === 0) {
      showToast('Belum Ada Siswa', 'Tidak ada data siswa yang tersedia untuk diskusi.', 'warning');
      return;
    }
    const filteredForModal = filterKelas === 'ALL' ? students : students.filter((s) => s.kelas === filterKelas);
    const optionsHtml = (filteredForModal.length > 0 ? filteredForModal : students)
      .map(
        (s) =>
          `<option value="${s.id}" ${s.id === selectedSiswaId ? 'selected' : ''}>${s.kelas} — ${s.nama_siswa}</option>`
      )
      .join('');

    const { value: form } = await Swal.fire({
      title: 'Buat Topik Kolaborasi Baru',
      width: '480px',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Siswa *</label>
            <select id="swal-kolab-siswa" class="swal2-input !mt-0 !w-full text-xs">${optionsHtml}</select>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Kategori *</label>
            <select id="swal-kolab-kat" class="swal2-input !mt-0 !w-full text-xs">
              <option value="Akademik">Akademik</option>
              <option value="Kehadiran">Kehadiran</option>
              <option value="Perilaku & BK">Perilaku & BK</option>
              <option value="Umum">Umum</option>
            </select>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Judul Topik *</label>
            <input id="swal-kolab-judul" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Perkembangan tugas matematika...">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Pesan Pembuka *</label>
            <textarea id="swal-kolab-isi" rows="3" class="swal2-textarea !mt-0 !w-full text-xs" placeholder="Tulis pesan untuk memulai diskusi..."></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Buat Topik',
      confirmButtonColor: '#0B4619',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const siswaId = (document.getElementById('swal-kolab-siswa') as HTMLSelectElement)?.value;
        const kategori = (document.getElementById('swal-kolab-kat') as HTMLSelectElement)?.value || 'Umum';
        const judul = (document.getElementById('swal-kolab-judul') as HTMLInputElement)?.value?.trim();
        const isi = (document.getElementById('swal-kolab-isi') as HTMLTextAreaElement)?.value?.trim();
        if (!siswaId || !judul || !isi) {
          Swal.showValidationMessage('Siswa, Judul Topik, dan Pesan Pembuka wajib diisi!');
          return null;
        }
        return { siswaId, kategori, judul, isi };
      },
    });

    if (!form) return;
    const stu = studentMap[form.siswaId];
    const nowIso = new Date().toISOString();
    const { data: insertedTopic, error: topErr } = await supabase
      .from('kolaborasi_topik')
      .insert({
        sekolah_id: sekolahId,
        siswa_id: form.siswaId,
        kelas: stu?.kelas || '-',
        judul: form.judul,
        kategori: form.kategori,
        dibuat_oleh_id: user.id,
        dibuat_oleh_nama: user.nama,
        dibuat_oleh_role: isOrtu ? 'Orang Tua' : user.role || 'Guru',
        status: 'Terbuka',
        last_message_at: nowIso,
      })
      .select()
      .single();

    if (topErr || !insertedTopic) {
      showToast('Gagal', topErr?.message || 'Gagal membuat topik.', 'error');
      return;
    }

    await supabase.from('kolaborasi_pesan').insert({
      sekolah_id: sekolahId,
      topik_id: insertedTopic.id,
      pengirim_id: user.id,
      pengirim_nama: user.nama,
      pengirim_role: isOrtu ? 'Orang Tua' : user.role || 'Guru',
      isi: form.isi,
    });

    showToast('Berhasil', 'Topik diskusi berhasil dibuat.', 'success');
    await loadTopicsAndIzin();
    setSelectedTopicId(insertedTopic.id);
  };

  // Send reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopicId || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from('kolaborasi_pesan').insert({
        sekolah_id: sekolahId,
        topik_id: selectedTopicId,
        pengirim_id: user.id,
        pengirim_nama: user.nama,
        pengirim_role: isOrtu ? 'Orang Tua' : user.role || 'Guru',
        isi: replyText.trim(),
      });
      if (error) throw error;

      await supabase
        .from('kolaborasi_topik')
        .update({ last_message_at: nowIso, updated_at: nowIso })
        .eq('id', selectedTopicId);

      setReplyText('');
      await loadMessages(selectedTopicId);
      await loadTopicsAndIzin();
    } catch (err: any) {
      showToast('Gagal Mengirim', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleTopicStatus = async (topic: TopikItem) => {
    const nextStatus = topic.status === 'Terbuka' ? 'Selesai' : 'Terbuka';
    const { error } = await supabase
      .from('kolaborasi_topik')
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', topic.id);
    if (error) {
      showToast('Gagal', error.message, 'error');
      return;
    }
    showToast('Status Diperbarui', `Topik ditandai ${nextStatus}.`, 'success');
    await loadTopicsAndIzin();
  };

  // Submit parent leave request
  const handleSubmitIzin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !izinAlasan.trim()) {
      showToast('Lengkapi Form', 'Pilih siswa dan isi alasan izin/sakit.', 'warning');
      return;
    }
    if (izinSelesai < izinMulai) {
      showToast('Tanggal Tidak Valid', 'Tanggal selesai tidak boleh sebelum tanggal mulai.', 'warning');
      return;
    }
    setSubmittingIzin(true);
    try {
      const { error } = await supabase.from('izin_siswa_ortu').insert({
        sekolah_id: sekolahId,
        siswa_id: selectedStudent.id,
        nisn: selectedStudent.nisn,
        nama_siswa: selectedStudent.nama_siswa,
        kelas: selectedStudent.kelas,
        orang_tua_id: user.id,
        orang_tua_nama: user.nama,
        tanggal_mulai: izinMulai,
        tanggal_selesai: izinSelesai,
        jenis: izinJenis,
        alasan: izinAlasan.trim(),
        lampiran_url: izinLampiran.trim() || null,
        status: 'Menunggu',
      });
      if (error) throw error;
      setIzinAlasan('');
      setIzinLampiran('');
      showToast('Pengajuan Terkirim', 'Permohonan izin berhasil dikirim ke pihak sekolah.', 'success');
      await loadTopicsAndIzin();
    } catch (err: any) {
      showToast('Gagal Mengajukan', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setSubmittingIzin(false);
    }
  };

  // Teacher/Admin approve or reject leave request
  const handleProcessIzin = async (item: IzinItem, decision: 'Disetujui' | 'Ditolak') => {
    const { value: catatan, isConfirmed } = await Swal.fire({
      title: decision === 'Disetujui' ? 'Setujui Pengajuan Izin?' : 'Tolak Pengajuan Izin?',
      text: `${item.nama_siswa} (${item.kelas}) — ${item.jenis} (${item.tanggal_mulai} s.d. ${item.tanggal_selesai})`,
      input: 'text',
      inputLabel: 'Catatan Guru / Wali Kelas (opsional)',
      inputPlaceholder: decision === 'Disetujui' ? 'Disetujui, semoga lekas membaik...' : 'Alasan penolakan...',
      showCancelButton: true,
      confirmButtonText: decision === 'Disetujui' ? 'Ya, Setujui & Sinkron Absensi' : 'Ya, Tolak',
      confirmButtonColor: decision === 'Disetujui' ? '#0B4619' : '#DC2626',
      cancelButtonText: 'Batal',
    });

    if (!isConfirmed) return;

    try {
      const nowIso = new Date().toISOString();
      const { error: updErr } = await supabase
        .from('izin_siswa_ortu')
        .update({
          status: decision,
          catatan_guru: (catatan || '').trim() || null,
          diproses_oleh: user.nama,
          diproses_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', item.id);

      if (updErr) throw updErr;

      if (decision === 'Disetujui') {
        const rows = buildAbsensiRowsFromIzin({
          sekolahId,
          siswaId: item.siswa_id,
          nisn: item.nisn || '-',
          namaSiswa: item.nama_siswa,
          kelas: item.kelas,
          tanggalMulai: item.tanggal_mulai,
          tanggalSelesai: item.tanggal_selesai,
          jenis: item.jenis,
          alasan: item.alasan,
          diubahOleh: user.nama,
        });

        for (const r of rows) {
          const { data: existing } = await supabase
            .from('absensi')
            .select('id')
            .eq('sekolah_id', sekolahId)
            .eq('siswa_id', r.siswa_id)
            .eq('tanggal', r.tanggal)
            .maybeSingle();

          if (existing?.id) {
            await supabase.from('absensi').update(r).eq('id', existing.id);
          } else {
            await supabase.from('absensi').insert(r);
          }
        }
      }

      showToast('Berhasil', `Pengajuan izin ${decision.toLowerCase()}.`, 'success');
      await loadTopicsAndIzin();
    } catch (err: any) {
      showToast('Gagal Memproses', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  const visibleStudents = useMemo(() => {
    if (filterKelas === 'ALL') return students;
    return students.filter((s) => s.kelas === filterKelas);
  }, [students, filterKelas]);

  const visibleTopics = useMemo(() => {
    return topics.filter((t) => {
      if (filterKelas !== 'ALL' && t.kelas !== filterKelas) return false;
      if (selectedSiswaId && !isOrtu && t.siswa_id !== selectedSiswaId) return false;
      return true;
    });
  }, [topics, filterKelas, selectedSiswaId, isOrtu]);

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  const absensiSummary = useMemo(() => {
    const counts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    absensiRows.forEach((r) => {
      if (r.status === 'Hadir') counts.Hadir++;
      else if (r.status === 'Sakit') counts.Sakit++;
      else if (r.status === 'Izin') counts.Izin++;
      else if (r.status === 'Alpa') counts.Alpa++;
    });
    return counts;
  }, [absensiRows]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <ClayCard variant="primary" className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">
              <i className="fa-solid fa-comments"></i>
              <span>Kolaborasi Sekolah & Keluarga</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Ruang Kolaborasi Guru & Orang Tua
            </h1>
            <p className="text-xs text-emerald-100/90 mt-1">
              {isOrtu
                ? 'Pantau perkembangan belajar, kehadiran anak, diskusi 2 arah dengan guru, serta pengajuan izin online.'
                : 'Komunikasi 2 arah dengan orang tua/wali murid, pemantauan perkembangan siswa, dan persetujuan izin online.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isOrtu && kelasOptions.length > 0 && (
              <select
                value={filterKelas}
                onChange={(e) => {
                  setFilterKelas(e.target.value);
                  setSelectedSiswaId('');
                }}
                className="px-3 py-2 rounded-xl bg-white/15 text-white text-xs font-bold border border-white/25 focus:outline-none"
              >
                <option value="ALL" className="text-gray-800">Semua Kelas</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k} className="text-gray-800">{k}</option>
                ))}
              </select>
            )}
            <select
              value={selectedSiswaId}
              onChange={(e) => setSelectedSiswaId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white text-gray-800 text-xs font-bold border border-white/40 focus:outline-none max-w-[220px]"
            >
              {!isOrtu && <option value="">Semua Siswa</option>}
              {visibleStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_siswa} ({s.kelas})
                </option>
              ))}
            </select>
          </div>
        </div>
      </ClayCard>

      {isOrtu && !loading && students.length === 0 ? (
        <ClayCard className="p-8 text-center">
          <i className="fa-solid fa-user-clock text-3xl text-amber-500 mb-3"></i>
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Akun Belum Terhubung ke Data Siswa</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Silakan hubungi Admin Sekolah untuk menautkan akun Anda dengan data putra/putri Anda.
          </p>
        </ClayCard>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'diskusi', label: 'Diskusi 2 Arah', icon: 'fa-comments' },
              { id: 'monitoring', label: 'Monitoring Kehadiran & Nilai', icon: 'fa-chart-line' },
              { id: 'izin', label: 'Pengajuan Izin Online', icon: 'fa-envelope-open-text' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#0B4619] text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className={`fa-solid ${t.icon}`}></i>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: DISKUSI 2 ARAH */}
          {activeTab === 'diskusi' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <ClayCard className="p-4 lg:col-span-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-gray-800 dark:text-white">Daftar Topik</h2>
                  <ClayButton variant="primary" size="sm" onClick={handleCreateTopic}>
                    <i className="fa-solid fa-plus mr-1"></i> Topik Baru
                  </ClayButton>
                </div>

                {visibleTopics.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">Belum ada topik diskusi.</p>
                ) : (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {visibleTopics.map((t) => {
                      const stu = studentMap[t.siswa_id];
                      const active = t.id === selectedTopicId;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTopicId(t.id)}
                          className={`w-full text-left p-3 rounded-2xl border transition cursor-pointer ${
                            active
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500'
                              : 'bg-gray-50/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {t.kategori}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                t.status === 'Selesai'
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">
                            {t.judul}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {stu ? `${stu.nama_siswa} (${stu.kelas})` : t.kelas} • {formatDateWita(t.last_message_at)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ClayCard>

              <ClayCard className="p-4 lg:col-span-2 flex flex-col min-h-[420px]">
                {!selectedTopic ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                    <i className="fa-regular fa-comments text-4xl mb-2"></i>
                    <p className="text-xs">Pilih topik di sebelah kiri atau buat topik baru untuk berdiskusi.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <h3 className="text-sm font-black text-gray-900 dark:text-white">{selectedTopic.judul}</h3>
                        <p className="text-[11px] text-gray-500">
                          Siswa: <strong>{studentMap[selectedTopic.siswa_id]?.nama_siswa || '-'}</strong> ({selectedTopic.kelas}) • Dibuat oleh {selectedTopic.dibuat_oleh_nama} ({selectedTopic.dibuat_oleh_role})
                        </p>
                      </div>
                      {!isOrtu && (
                        <ClayButton
                          variant={selectedTopic.status === 'Terbuka' ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleTopicStatus(selectedTopic)}
                        >
                          {selectedTopic.status === 'Terbuka' ? 'Tandai Selesai' : 'Buka Kembali'}
                        </ClayButton>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 py-4 max-h-[360px] overflow-y-auto">
                      {messages.map((m) => {
                        const isMine = m.pengirim_id === user.id;
                        return (
                          <div key={m.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs ${
                                isMine
                                  ? 'bg-[#0B4619] text-white rounded-br-none'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none'
                              }`}
                            >
                              <div className="text-[10px] font-bold opacity-80 mb-0.5">
                                {m.pengirim_nama} ({m.pengirim_role})
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">{m.isi}</p>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 px-1">
                              {formatTimestampWita(m.created_at)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <form onSubmit={handleSendReply} className="pt-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={selectedTopic.status === 'Selesai' ? 'Topik sudah selesai...' : 'Tulis balasan pesan...'}
                        disabled={selectedTopic.status === 'Selesai' || sendingReply}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none"
                      />
                      <ClayButton
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={selectedTopic.status === 'Selesai' || sendingReply || !replyText.trim()}
                      >
                        <i className="fa-solid fa-paper-plane mr-1"></i> Kirim
                      </ClayButton>
                    </form>
                  </>
                )}
              </ClayCard>
            </div>
          )}

          {/* TAB 2: MONITORING KEHADIRAN & NILAI */}
          {activeTab === 'monitoring' && (
            <div className="space-y-5">
              {!selectedStudent ? (
                <ClayCard className="p-6 text-center text-xs text-gray-500">
                  Pilih salah satu siswa pada dropdown di atas untuk melihat ringkasan kehadiran dan nilai.
                </ClayCard>
              ) : loadingMonitor ? (
                <ClayCard className="p-6 text-center text-xs text-gray-500">
                  Memuat data monitoring {selectedStudent.nama_siswa}...
                </ClayCard>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <ClayCard variant="mint" className="p-4 text-center">
                      <div className="text-2xl font-black">{absensiSummary.Hadir}</div>
                      <div className="text-[11px] font-bold">Hadir</div>
                    </ClayCard>
                    <ClayCard variant="amber" className="p-4 text-center">
                      <div className="text-2xl font-black">{absensiSummary.Sakit}</div>
                      <div className="text-[11px] font-bold">Sakit</div>
                    </ClayCard>
                    <ClayCard variant="blue" className="p-4 text-center">
                      <div className="text-2xl font-black">{absensiSummary.Izin}</div>
                      <div className="text-[11px] font-bold">Izin</div>
                    </ClayCard>
                    <ClayCard variant="rose" className="p-4 text-center">
                      <div className="text-2xl font-black">{absensiSummary.Alpa}</div>
                      <div className="text-[11px] font-bold">Alpa</div>
                    </ClayCard>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <ClayCard className="p-4">
                      <h3 className="text-sm font-black text-gray-800 dark:text-white mb-3">
                        Riwayat Kehadiran Terbaru ({selectedStudent.nama_siswa})
                      </h3>
                      {absensiRows.length === 0 && presensiGerbangRows.length === 0 ? (
                        <p className="text-xs text-gray-500 py-4 text-center">Belum ada catatan kehadiran.</p>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto">
                          {absensiRows.map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/70 text-xs">
                              <div>
                                <div className="font-bold text-gray-800 dark:text-white">{formatDateWita(a.tanggal)}</div>
                                <div className="text-[11px] text-gray-500">{a.keterangan || a.sumber_perubahan}</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                {a.status}
                              </span>
                            </div>
                          ))}
                          {presensiGerbangRows.map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-900/20 text-xs">
                              <div>
                                <div className="font-bold text-gray-800 dark:text-white">{formatDateWita(p.tanggal)} • {p.jam}</div>
                                <div className="text-[11px] text-gray-500">Presensi Gerbang / QR</div>
                              </div>
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                                {p.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </ClayCard>

                    <ClayCard className="p-4">
                      <h3 className="text-sm font-black text-gray-800 dark:text-white mb-3">
                        Rekap Nilai Asesmen Terbaru
                      </h3>
                      {nilaiRows.length === 0 ? (
                        <p className="text-xs text-gray-500 py-4 text-center">Belum ada nilai asesmen yang tercatat.</p>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto">
                          {nilaiRows.map((n) => (
                            <div key={n.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/70 text-xs">
                              <div>
                                <div className="font-bold text-gray-800 dark:text-white">
                                  {n.mapel} — {n.asesmen_kolom?.nama || 'Asesmen'}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Guru: {n.nama_guru} {n.catatan ? `• ${n.catatan}` : ''}
                                </div>
                              </div>
                              <span className="px-3 py-1 rounded-xl text-xs font-black bg-purple-100 text-purple-900">
                                {n.nilai ?? '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </ClayCard>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: PENGAJUAN IZIN ONLINE */}
          {activeTab === 'izin' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {isOrtu && (
                <ClayCard className="p-4 lg:col-span-1">
                  <h3 className="text-sm font-black text-gray-800 dark:text-white mb-3">
                    Form Pengajuan Izin / Sakit
                  </h3>
                  <form onSubmit={handleSubmitIzin} className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold block mb-1">Siswa</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedStudent ? `${selectedStudent.nama_siswa} (${selectedStudent.kelas})` : '-'}
                        className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Jenis Permohonan</label>
                      <select
                        value={izinJenis}
                        onChange={(e) => setIzinJenis(e.target.value as 'Izin' | 'Sakit')}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      >
                        <option value="Izin">Izin</option>
                        <option value="Sakit">Sakit</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold block mb-1">Tanggal Mulai</label>
                        <input
                          type="date"
                          value={izinMulai}
                          onChange={(e) => setIzinMulai(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                      <div>
                        <label className="font-bold block mb-1">Tanggal Selesai</label>
                        <input
                          type="date"
                          value={izinSelesai}
                          onChange={(e) => setIzinSelesai(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Alasan *</label>
                      <textarea
                        rows={3}
                        required
                        value={izinAlasan}
                        onChange={(e) => setIzinAlasan(e.target.value)}
                        placeholder="Jelaskan alasan izin/sakit anak..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold block mb-1">Link Surat / Bukti (Opsional)</label>
                      <input
                        type="url"
                        value={izinLampiran}
                        onChange={(e) => setIzinLampiran(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      />
                    </div>
                    <ClayButton type="submit" variant="primary" className="w-full" disabled={submittingIzin}>
                      {submittingIzin ? 'Mengirim...' : 'Kirim Pengajuan Izin'}
                    </ClayButton>
                  </form>
                </ClayCard>
              )}

              <ClayCard className={`p-4 ${isOrtu ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
                <h3 className="text-sm font-black text-gray-800 dark:text-white mb-3">
                  Daftar Pengajuan Izin Siswa
                </h3>
                {izinList.length === 0 ? (
                  <p className="text-xs text-gray-500 py-8 text-center">Belum ada pengajuan izin online.</p>
                ) : (
                  <div className="space-y-3">
                    {izinList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-gray-900 dark:text-white">
                              {item.nama_siswa} ({item.kelas})
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              {item.jenis}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.status === 'Disetujui'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'Ditolak'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600 dark:text-gray-300">
                            Tanggal: <strong>{formatDateWita(item.tanggal_mulai)}</strong> s.d.{' '}
                            <strong>{formatDateWita(item.tanggal_selesai)}</strong> • Oleh: {item.orang_tua_nama}
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-200">{item.alasan}</p>
                          {item.lampiran_url && (
                            <a
                              href={item.lampiran_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 underline inline-block"
                            >
                              Lihat Lampiran Bukti
                            </a>
                          )}
                          {item.catatan_guru && (
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                              Catatan Sekolah ({item.diproses_oleh || 'Guru'}): {item.catatan_guru}
                            </p>
                          )}
                        </div>

                        {!isOrtu && item.status === 'Menunggu' && (
                          <div className="flex gap-2 shrink-0">
                            <ClayButton variant="primary" size="sm" onClick={() => handleProcessIzin(item, 'Disetujui')}>
                              Setujui
                            </ClayButton>
                            <ClayButton variant="rose" size="sm" onClick={() => handleProcessIzin(item, 'Ditolak')}>
                              Tolak
                            </ClayButton>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ClayCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
