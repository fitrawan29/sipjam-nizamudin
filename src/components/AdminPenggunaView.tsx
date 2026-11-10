'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { renderUserAvatar } from '@/lib/avatars';
import {
  syncTeacherAccounts,
  updateTeacherCredentials,
  resetTeacherPasswordToDefault,
  getDefaultTeacherPassword,
  TeacherAccountItem
} from '@/lib/teacherUserSync';
import { isMasterDataModificationAllowed } from '@/lib/dataIntegrityGuard';
import { downloadMasterDataCsv } from '@/lib/csvExport';

export interface AdminPenggunaViewProps {
  user: any;
}

export default function AdminPenggunaView({ user }: AdminPenggunaViewProps) {
  const isMountedRef = useRef<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filterMapel, setFilterMapel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [accounts, setAccounts] = useState<TeacherAccountItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const ITEMS_PER_PAGE = 15;

  const isAdmin = isMasterDataModificationAllowed(user?.role);

  // Load and sync data
  const handleLoadAndSync = useCallback(async (isManualTrigger = false) => {
    if (!isMountedRef.current) return;
    if (isManualTrigger) {
      setSyncing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');

    try {
      const sekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      const result = await syncTeacherAccounts(supabase, sekolahId);

      // Load Tata Usaha accounts without altering teacher sync
      const { data: tuUsers } = await supabase
        .from('users')
        .select('*')
        .eq('sekolah_id', sekolahId);

      const tuAccounts: TeacherAccountItem[] = (tuUsers || [])
        .filter((u: any) => {
          const norm = (u.role || '').toLowerCase().replace(/[\s_-]+/g, '');
          return norm === 'tatausaha';
        })
        .map((u: any) => ({
          guruId: u.id,
          userId: u.id,
          nama: u.nama,
          nip: u.nip || '-',
          username: u.username,
          defaultPassword: '-',
          role: 'tata_usaha',
          mataPelajaran: 'Tata Usaha (Administrasi)',
          status: 'Aktif',
          hasAccount: true,
          sekolahId: u.sekolah_id
        }));

      // Load BK accounts
      const bkAccounts: TeacherAccountItem[] = (tuUsers || [])
        .filter((u: any) => {
          const norm = (u.role || '').toLowerCase().replace(/[\s_-]+/g, '');
          return norm === 'bk' || norm === 'gurubk' || norm === 'bimbingankonseling' || norm === 'bimbingandankonseling';
        })
        .map((u: any) => ({
          guruId: u.id,
          userId: u.id,
          nama: u.nama,
          nip: u.nip || '-',
          username: u.username,
          defaultPassword: '-',
          role: 'bk',
          mataPelajaran: 'Bimbingan Konseling (BK)',
          status: 'Aktif',
          hasAccount: true,
          sekolahId: u.sekolah_id
        }));

      if (!isMountedRef.current) return;

      const existingUserIds = new Set((result.accounts || []).map(a => a.userId).filter(Boolean));
      const filteredTuAccounts = tuAccounts.filter(a => !existingUserIds.has(a.userId));
      const filteredBkAccounts = bkAccounts.filter(a => !existingUserIds.has(a.userId));

      const combinedAccounts = [
        ...(result.accounts || []).map((acc: TeacherAccountItem) => {
          if ((acc.mataPelajaran || '').toLowerCase().includes('tata usaha')) {
            return { ...acc, role: 'tata_usaha' };
          }
          const normAcc = (acc.role || '').toLowerCase().replace(/[\s_-]+/g, '');
          const isAccBk = normAcc === 'bk' || normAcc === 'gurubk' || normAcc === 'bimbingankonseling' || normAcc === 'bimbingandankonseling' ||
            (acc.mataPelajaran || '').toLowerCase().includes('bimbingan konseling') ||
            (acc.mataPelajaran || '').toLowerCase().includes('bimbingan dan konseling') ||
            (acc.mataPelajaran || '').toLowerCase().trim() === 'bk';
          if (isAccBk) {
            return { ...acc, role: 'bk' };
          }
          return acc;
        }),
        ...filteredTuAccounts,
        ...filteredBkAccounts
      ];
      setAccounts(combinedAccounts);

      if (result.errors && result.errors.length > 0) {
        setErrorMsg(result.errors.join('; '));
      }

      if (isManualTrigger) {
        if (result.createdCount > 0) {
          showToast(
            'Sinkronisasi Berhasil',
            `Berhasil menyinkronkan ${result.totalTeachers} guru (${result.createdCount} akun baru dibuat dengan password NIP27).`,
            'success'
          );
        } else {
          showToast(
            'Sinkronisasi Selesai',
            `Seluruh ${result.totalTeachers} data guru sudah terdaftar dengan akun aktif.`,
            'info'
          );
        }
      }
    } catch (err: any) {
      console.error('[AdminPenggunaView] Error syncing teacher accounts:', err);
      if (isMountedRef.current) {
        setErrorMsg(err.message || 'Gagal menyinkronkan akun guru.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setSyncing(false);
      }
    }
  }, [user?.sekolah_id]);

  useEffect(() => {
    isMountedRef.current = true;
    handleLoadAndSync(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [handleLoadAndSync]);

  // Unique mapel list for filter
  const mapelOptions = useMemo(() => {
    const set = new Set<string>();
    accounts.forEach(acc => {
      if (acc.mataPelajaran && acc.mataPelajaran !== '-') {
        set.add(acc.mataPelajaran.trim());
      }
    });
    return Array.from(set).sort();
  }, [accounts]);

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter(acc => {
      // Search matches nama, NIP, or username
      const matchSearch = !q ||
        (acc.nama && acc.nama.toLowerCase().includes(q)) ||
        (acc.nip && acc.nip.toLowerCase().includes(q)) ||
        (acc.username && acc.username.toLowerCase().includes(q));

      // Filter mapel
      const matchMapel = filterMapel === 'ALL' || acc.mataPelajaran === filterMapel;

      // Filter status
      const matchStatus = filterStatus === 'ALL' || acc.status === filterStatus;

      return matchSearch && matchMapel && matchStatus;
    });
  }, [accounts, search, filterMapel, filterStatus]);

  // Paginated accounts
  const paginatedAccounts = useMemo(() => {
    const start = page * ITEMS_PER_PAGE;
    return filteredAccounts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAccounts, page]);

  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE) || 1;

  // Export Pengguna to CSV
  const handleExportUsersCsv = () => {
    const isFilterApplied = Boolean((search && search.trim()) || filterMapel !== 'ALL' || filterStatus !== 'ALL');
    const listToExport = isFilterApplied ? filteredAccounts : (accounts && accounts.length > 0 ? accounts : filteredAccounts);
    if (!listToExport || listToExport.length === 0) {
      showToast('Info', isFilterApplied ? 'Tidak ada pengguna yang sesuai filter untuk diekspor.' : 'Belum ada data pengguna untuk diekspor.', 'info');
      return;
    }
    const result = downloadMasterDataCsv('Pengguna', listToExport);
    showToast('Berhasil', `Data Pengguna (${result.rowCount} akun) berhasil diekspor ke CSV!`, 'success');
  };

  // Handle Toggle Tata Usaha Role Assignment (Mekanisme 1: Tunjuk TU / Ke Guru)
  const handleToggleTuAssignment = async (item: TeacherAccountItem) => {
    if (!isAdmin) return;
    const isCurrentlyTU = (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
    const targetRole = isCurrentlyTU ? 'Guru' : 'tata_usaha';
    const actionLabel = isCurrentlyTU ? 'Kembalikan ke Guru' : 'Tunjuk sebagai Tata Usaha (TU)';

    const confirm = await Swal.fire({
      title: `${actionLabel}?`,
      text: isCurrentlyTU
        ? `Akun "${item.nama}" akan dikembalikan ke role Guru.`
        : `Akun "${item.nama}" akan dialihkan ke role Tata Usaha (TU). Hak akses akan disesuaikan ke modul TU.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Lanjutkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#0D9488'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      if (item.userId) {
        const { error: updErr } = await supabase
          .from('users')
          .update({ role: targetRole })
          .eq('id', item.userId);

        if (updErr) {
          if (updErr.message?.includes('users_role_check')) {
            const newMapel = targetRole === 'tata_usaha' ? 'Tata Usaha (Administrasi)' : '-';
            await supabase
              .from('data_guru')
              .update({ mata_pelajaran: newMapel })
              .or(`user_id.eq.${item.userId},id.eq.${item.guruId}`);

            await Swal.fire({
              icon: 'warning',
              title: 'Constraint Database Perlu Dihapus',
              html: `
                <div class="text-left text-xs space-y-3">
                  <p>Database Supabase Anda masih menerapkan constraint <code>users_role_check</code> lama yang membatasi role.</p>
                  <p class="text-gray-600 dark:text-gray-400">Jalankan perintah SQL berikut di <b>Supabase SQL Editor</b> agar role dapat disimpan di tabel <code>users</code>:</p>
                  <div class="p-2.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] select-all border border-gray-300 dark:border-gray-700">
                    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
                  </div>
                  <p class="text-[11px] text-teal-700 dark:text-teal-400 font-semibold">Tugas di data guru telah disesuaikan ke "${newMapel}".</p>
                </div>
              `,
              confirmButtonText: 'Salin Perintah SQL',
              showCancelButton: true,
              cancelButtonText: 'Tutup',
              confirmButtonColor: '#0D9488'
            }).then((res) => {
              if (res.isConfirmed && typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;');
                showToast('Disalin', 'Perintah SQL berhasil disalin ke clipboard.', 'success');
              }
            });
            handleLoadAndSync(false);
            return;
          }
          throw updErr;
        }

        const newMapel = targetRole === 'tata_usaha' ? 'Tata Usaha (Administrasi)' : '-';
        await supabase
          .from('data_guru')
          .update({ mata_pelajaran: newMapel })
          .or(`user_id.eq.${item.userId},id.eq.${item.guruId}`);
      }
      showToast('Berhasil', `Role ${item.nama} berhasil diubah menjadi ${targetRole === 'tata_usaha' ? 'Tata Usaha' : 'Guru'}.`, 'success');
      handleLoadAndSync(false);
    } catch (err: any) {
      showToast('Gagal Mengubah Role', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Tata Usaha Account (Mekanisme 2: Form Akun Baru TU - 4 Field Wajib)
  const handleCreateTuUser = async () => {
    if (!isAdmin) return;
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Akun Tata Usaha',
      width: '450px',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">NIP (Nomor Induk Pegawai) *</label>
            <input id="swal-tu-nip" class="swal2-input !mt-0 !w-full text-xs font-mono" placeholder="NIP staf TU...">
          </div>
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Nama Lengkap *</label>
            <input id="swal-tu-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Nama lengkap staf TU...">
          </div>
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Nomor HP (WhatsApp) *</label>
            <input id="swal-tu-hp" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 081234567890...">
          </div>
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Email Aktif *</label>
            <input id="swal-tu-email" type="email" class="swal2-input !mt-0 !w-full text-xs" placeholder="email@sekolah.sch.id...">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Akun TU',
      confirmButtonColor: '#0D9488',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nip = (document.getElementById('swal-tu-nip') as HTMLInputElement)?.value?.trim();
        const nama = (document.getElementById('swal-tu-nama') as HTMLInputElement)?.value?.trim();
        const no_hp = (document.getElementById('swal-tu-hp') as HTMLInputElement)?.value?.trim();
        const email = (document.getElementById('swal-tu-email') as HTMLInputElement)?.value?.trim();
        if (!nip || !nama || !no_hp || !email) {
          Swal.showValidationMessage('Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!');
          return null;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Swal.showValidationMessage('Format email aktif tidak valid (contoh: user@sekolah.sch.id)!');
          return null;
        }
        return { nip, nama, no_hp, email };
      }
    });

    if (formValues) {
      setLoading(true);
      const targetSekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      const userId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `usr-tu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const defaultPassword = `${formValues.nip}27`;

      let { error: insUserErr } = await supabase.from('users').insert({
        id: userId,
        nama: formValues.nama,
        username: formValues.nip,
        password: defaultPassword,
        role: 'tata_usaha',
        sekolah_id: targetSekolahId
      });

      if (insUserErr && insUserErr.message?.includes('users_role_check')) {
        const { error: retryErr } = await supabase.from('users').insert({
          id: userId,
          nama: formValues.nama,
          username: formValues.nip,
          password: defaultPassword,
          role: 'Guru',
          sekolah_id: targetSekolahId
        });
        if (!retryErr) {
          insUserErr = null;
          Swal.fire({
            icon: 'info',
            title: 'Akun Dibuat (Perlu Update Constraint)',
            html: `
              <div class="text-left text-xs space-y-2">
                <p>Akun TU berhasil dibuat. Namun database Supabase Anda masih menerapkan constraint <code>users_role_check</code>.</p>
                <p class="text-gray-600 dark:text-gray-400">Jalankan perintah SQL ini di <b>Supabase SQL Editor</b> agar role dapat tersimpan sebagai <code>tata_usaha</code> murni:</p>
                <div class="p-2 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[10px] select-all border border-gray-300 dark:border-gray-700">
                  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
                </div>
              </div>
            `,
            confirmButtonText: 'Salin SQL',
            showCancelButton: true,
            cancelButtonText: 'Tutup',
            confirmButtonColor: '#0D9488'
          }).then((r) => {
            if (r.isConfirmed && typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;');
              showToast('Disalin', 'Perintah SQL disalin ke clipboard.', 'success');
            }
          });
        }
      }

      if (insUserErr) {
        setLoading(false);
        showToast('Gagal Membuat Akun', insUserErr.message, 'error');
        return;
      }

      const { error: insGuruErr } = await supabase.from('data_guru').insert({
        sekolah_id: targetSekolahId,
        user_id: userId,
        nip: formValues.nip,
        nama_guru: formValues.nama,
        mata_pelajaran: 'Tata Usaha (Administrasi)',
        no_hp: formValues.no_hp,
        email: formValues.email,
        status: 'Aktif'
      });
      setLoading(false);
      if (insGuruErr) {
        console.warn('data_guru insert note:', insGuruErr.message);
      }
      showToast('Berhasil', `Akun Tata Usaha "${formValues.nama}" berhasil dibuat.`, 'success');
      handleLoadAndSync(false);
    }
  };

  // Handle Delete Tata Usaha Account
  const handleDeleteTu = async (item: TeacherAccountItem) => {
    if (!isAdmin) return;
    const result = await Swal.fire({
      title: 'Hapus Akun TU?',
      text: `Hapus akun "${item.nama}" (${item.username})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });
    if (result.isConfirmed) {
      setLoading(true);
      const { error: delErr } = await supabase.from('users').delete().eq('id', item.userId);
      setLoading(false);
      if (delErr) {
        showToast('Gagal Menghapus', delErr.message, 'error');
      } else {
        showToast('Berhasil', 'Akun Tata Usaha berhasil dihapus.', 'success');
        handleLoadAndSync(false);
      }
    }
  };

  // Helper to sync local session if the user being updated matches currently logged-in user
  const syncLocalSessionIfMatching = (userId?: string, username?: string, targetRole?: string) => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const stored = localStorage.getItem('sipjam_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if ((userId && parsed.id === userId) || (username && parsed.username === username)) {
          if (targetRole) {
            parsed.role = targetRole;
            if (targetRole === 'bk' || targetRole === 'guru_bk') {
              parsed.mata_pelajaran = 'Bimbingan Konseling (BK)';
            } else {
              const currentMapel = (parsed.mata_pelajaran || '').toLowerCase();
              if (
                currentMapel.includes('bimbingan konseling') ||
                currentMapel.includes('bimbingan dan konseling') ||
                currentMapel.trim() === 'bk'
              ) {
                parsed.mata_pelajaran = '-';
              }
            }
          }
          const serialized = JSON.stringify(parsed);
          localStorage.setItem('sipjam_user', serialized);
          try {
            window.dispatchEvent(new StorageEvent('storage', { key: 'sipjam_user', newValue: serialized }));
          } catch (_) {
            window.dispatchEvent(new Event('storage'));
          }
        }
      }
    } catch (_) {}
  };

  // Handle Toggle BK Role Assignment (Mekanisme 1: Tunjuk BK / Ke Guru)
  const handleToggleBkAssignment = async (item: TeacherAccountItem) => {
    if (!isAdmin) return;
    const normItemRole = (item.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    const normItemMapel = (item.mataPelajaran || '').toLowerCase();
    const isCurrentlyBk =
      normItemRole === 'bk' ||
      normItemRole === 'gurubk' ||
      normItemRole === 'bimbingankonseling' ||
      normItemRole === 'bimbingandankonseling' ||
      normItemMapel.includes('bimbingan konseling') ||
      normItemMapel.includes('bimbingan dan konseling') ||
      normItemMapel.trim() === 'bk';
    const targetRole = isCurrentlyBk ? 'Guru' : 'bk';
    const actionLabel = isCurrentlyBk ? 'Kembalikan ke Guru' : 'Tunjuk sebagai Guru BK';

    const confirm = await Swal.fire({
      title: `${actionLabel}?`,
      text: isCurrentlyBk
        ? `Akun "${item.nama}" akan dikembalikan ke role Guru.`
        : `Akun "${item.nama}" akan dialihkan ke role Guru BK (Bimbingan Konseling). Hak akses akan disesuaikan ke modul Jurnal BK.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Lanjutkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#E11D48'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      if (item.userId) {
        let { error: updErr } = await supabase
          .from('users')
          .update({ role: targetRole })
          .eq('id', item.userId);

        if (updErr && updErr.message?.includes('users_role_check')) {
          const fallbackRole = targetRole === 'bk' ? 'guru_bk' : 'Guru';
          const { error: retryErr } = await supabase
            .from('users')
            .update({ role: fallbackRole })
            .eq('id', item.userId);
          if (!retryErr) {
            updErr = null;
          }
        }

        if (updErr) {
          if (updErr.message?.includes('users_role_check')) {
            const newMapel = targetRole === 'bk' ? 'Bimbingan Konseling (BK)' : '-';
            await supabase
              .from('data_guru')
              .update({ mata_pelajaran: newMapel })
              .or(`user_id.eq.${item.userId},id.eq.${item.guruId}`);

            // Sync active session even in fallback mode
            syncLocalSessionIfMatching(item.userId, item.username, targetRole);

            await Swal.fire({
              icon: 'warning',
              title: 'Constraint Database Perlu Dihapus',
              html: `
                <div class="text-left text-xs space-y-3">
                  <p>Database Supabase Anda masih menerapkan constraint <code>users_role_check</code> lama yang membatasi role.</p>
                  <p class="text-gray-600 dark:text-gray-400">Jalankan perintah SQL berikut di <b>Supabase SQL Editor</b> agar role dapat disimpan di tabel <code>users</code>:</p>
                  <div class="p-2.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-[11px] select-all border border-gray-300 dark:border-gray-700">
                    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
                  </div>
                  <p class="text-[11px] text-rose-700 dark:text-rose-400 font-semibold">Tugas di data guru telah disesuaikan ke "${newMapel}".</p>
                </div>
              `,
              confirmButtonText: 'Salin Perintah SQL',
              showCancelButton: true,
              cancelButtonText: 'Tutup',
              confirmButtonColor: '#E11D48'
            }).then((res) => {
              if (res.isConfirmed && typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;');
                showToast('Disalin', 'Perintah SQL berhasil disalin ke clipboard.', 'success');
              }
            });
            handleLoadAndSync(false);
            return;
          }
          throw updErr;
        }

        const newMapel = targetRole === 'bk' ? 'Bimbingan Konseling (BK)' : '-';
        await supabase
          .from('data_guru')
          .update({ mata_pelajaran: newMapel })
          .or(`user_id.eq.${item.userId},id.eq.${item.guruId}`);
      } else if (item.guruId) {
        const newMapel = targetRole === 'bk' ? 'Bimbingan Konseling (BK)' : '-';
        await supabase
          .from('data_guru')
          .update({ mata_pelajaran: newMapel })
          .eq('id', item.guruId);
      }

      // Sync active session if currently logged-in user is updated
      syncLocalSessionIfMatching(item.userId, item.username, targetRole);

      showToast('Berhasil', `Role ${item.nama} berhasil diubah menjadi ${targetRole === 'bk' ? 'Guru BK' : 'Guru'}.`, 'success');
      handleLoadAndSync(false);
    } catch (err: any) {
      showToast('Gagal Mengubah Role', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Create BK Account (Mekanisme 2: Form Akun Baru BK - 4 Field Wajib)
  const handleCreateBkUser = async () => {
    if (!isAdmin) return;
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Akun Guru BK',
      width: '450px',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">NIP (Nomor Induk Pegawai) *</label>
            <input id="swal-bk-nip" class="swal2-input !mt-0 !w-full text-xs font-mono" placeholder="NIP guru BK...">
          </div>
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Nama Lengkap *</label>
            <input id="swal-bk-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Nama lengkap guru BK...">
          </div>
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Nomor HP (WhatsApp) *</label>
            <input id="swal-bk-hp" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 081234567890...">
          </div>
          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Email Aktif *</label>
            <input id="swal-bk-email" type="email" class="swal2-input !mt-0 !w-full text-xs" placeholder="email@sekolah.sch.id...">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Akun BK',
      confirmButtonColor: '#E11D48',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nip = (document.getElementById('swal-bk-nip') as HTMLInputElement)?.value?.trim();
        const nama = (document.getElementById('swal-bk-nama') as HTMLInputElement)?.value?.trim();
        const no_hp = (document.getElementById('swal-bk-hp') as HTMLInputElement)?.value?.trim();
        const email = (document.getElementById('swal-bk-email') as HTMLInputElement)?.value?.trim();
        if (!nip || !nama || !no_hp || !email) {
          Swal.showValidationMessage('Semua 4 data (NIP, Nama Lengkap, Nomor HP, dan Email Aktif) wajib diisi!');
          return null;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          Swal.showValidationMessage('Format email aktif tidak valid (contoh: user@sekolah.sch.id)!');
          return null;
        }
        return { nip, nama, no_hp, email };
      }
    });

    if (formValues) {
      setLoading(true);
      const targetSekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      const userId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `usr-bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const defaultPassword = `${formValues.nip}27`;

      let { error: insUserErr } = await supabase.from('users').insert({
        id: userId,
        nama: formValues.nama,
        username: formValues.nip,
        password: defaultPassword,
        role: 'bk',
        sekolah_id: targetSekolahId
      });

      if (insUserErr && insUserErr.message?.includes('users_role_check')) {
        let { error: retryBkErr } = await supabase.from('users').insert({
          id: userId,
          nama: formValues.nama,
          username: formValues.nip,
          password: defaultPassword,
          role: 'guru_bk',
          sekolah_id: targetSekolahId
        });
        if (!retryBkErr) {
          insUserErr = null;
        } else if (retryBkErr.message?.includes('users_role_check')) {
          const { error: retryErr } = await supabase.from('users').insert({
            id: userId,
            nama: formValues.nama,
            username: formValues.nip,
            password: defaultPassword,
            role: 'Guru',
            sekolah_id: targetSekolahId
          });
          if (!retryErr) {
            insUserErr = null;
          }
        }
      }

      if (insUserErr) {
        setLoading(false);
        showToast('Gagal Membuat Akun', insUserErr.message, 'error');
        return;
      }

      const { error: insGuruErr } = await supabase.from('data_guru').insert({
        sekolah_id: targetSekolahId,
        user_id: userId,
        nip: formValues.nip,
        nama_guru: formValues.nama,
        mata_pelajaran: 'Bimbingan Konseling (BK)',
        no_hp: formValues.no_hp,
        email: formValues.email,
        status: 'Aktif'
      });
      setLoading(false);
      if (insGuruErr) {
        console.warn('data_guru insert note:', insGuruErr.message);
      }
      showToast('Berhasil', `Akun Guru BK "${formValues.nama}" berhasil dibuat.`, 'success');
      handleLoadAndSync(false);
    }
  };

  // Handle Delete BK Account
  const handleDeleteBk = async (item: TeacherAccountItem) => {
    if (!isAdmin) return;
    const result = await Swal.fire({
      title: 'Hapus Akun BK?',
      text: `Hapus akun "${item.nama}" (${item.username})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });
    if (result.isConfirmed) {
      setLoading(true);
      const { error: delErr } = await supabase.from('users').delete().eq('id', item.userId);
      setLoading(false);
      if (delErr) {
        showToast('Gagal Menghapus', delErr.message, 'error');
      } else {
        showToast('Berhasil', 'Akun Guru BK berhasil dihapus.', 'success');
        handleLoadAndSync(false);
      }
    }
  };

  // Handle Edit Credentials Modal
  const handleOpenEditModal = async (item: TeacherAccountItem) => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengelola kredensial pengguna.', 'error');
      return;
    }

    const normRole = (item.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    const normMapel = (item.mataPelajaran || '').toLowerCase();
    const isBkAccount =
      normRole === 'bk' ||
      normRole === 'gurubk' ||
      normRole === 'bimbingankonseling' ||
      normRole === 'bimbingandankonseling' ||
      normMapel.includes('bimbingan konseling') ||
      normMapel.includes('bimbingan dan konseling') ||
      normMapel.trim() === 'bk';
    if (item.role === 'tata_usaha' || isBkAccount) {
      const roleTitle = isBkAccount ? 'Guru BK' : 'Tata Usaha';
      const btnColor = isBkAccount ? '#E11D48' : '#0D9488';
      const { value: formValues } = await Swal.fire({
        title: `Atur Kredensial Akun ${roleTitle}`,
        width: '450px',
        html: `
          <div class="text-left space-y-3 text-xs">
            <div>
              <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Nama Lengkap *</label>
              <input id="swal-tu-nama" class="swal2-input !mt-0 !w-full text-xs" value="${item.nama}" placeholder="Nama...">
            </div>
            <div>
              <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Username Login *</label>
              <input id="swal-tu-user" class="swal2-input !mt-0 !w-full text-xs font-mono" value="${item.username}" placeholder="Username...">
            </div>
            <div>
              <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Kata Sandi Baru (Opsional)</label>
              <input id="swal-tu-pwd" type="password" class="swal2-input !mt-0 !w-full text-xs font-mono" placeholder="Kosongkan jika tidak diubah...">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        confirmButtonColor: btnColor,
        cancelButtonText: 'Batal',
        preConfirm: () => {
          const nama = (document.getElementById('swal-tu-nama') as HTMLInputElement)?.value?.trim();
          const username = (document.getElementById('swal-tu-user') as HTMLInputElement)?.value?.trim();
          const password = (document.getElementById('swal-tu-pwd') as HTMLInputElement)?.value?.trim();
          if (!nama || !username) {
            Swal.showValidationMessage('Nama dan username tidak boleh kosong!');
            return null;
          }
          return { nama, username, password };
        }
      });
      if (formValues) {
        setLoading(true);
        const updateData: any = { nama: formValues.nama, username: formValues.username };
        if (formValues.password) updateData.password = formValues.password;
        const { error: updErr } = await supabase.from('users').update(updateData).eq('id', item.userId);
        setLoading(false);
        if (updErr) {
          showToast('Gagal Memperbarui', updErr.message, 'error');
        } else {
          syncLocalSessionIfMatching(item.userId, formValues.username);
          showToast('Berhasil', `Akun ${roleTitle} berhasil diperbarui.`, 'success');
          handleLoadAndSync(false);
        }
      }
      return;
    }

    const defaultPwd = getDefaultTeacherPassword(item.nip !== '-' ? item.nip : item.username);

    const { value: formValues } = await Swal.fire({
      title: 'Atur Kredensial Akun Guru',
      width: '520px',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div class="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl">
            <div class="font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">${item.nama}</div>
            <div class="text-[11px] text-gray-600 dark:text-gray-400">
              <span class="font-semibold">NIP:</span> <span class="font-mono">${item.nip}</span> &bull; 
              <span class="font-semibold">Mapel:</span> ${item.mataPelajaran}
            </div>
          </div>

          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Username Login <span class="text-red-500">*</span>
            </label>
            <input 
              id="swal-username" 
              class="swal2-input !mt-0 !w-full text-xs font-mono" 
              value="${item.username}" 
              placeholder="Username login guru"
            >
            <p class="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
              Username awal ditarik otomatis dari NIP guru.
            </p>
          </div>

          <div>
            <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">
              Kata Sandi Baru (Password)
            </label>
            <div class="relative">
              <input 
                id="swal-password" 
                type="password" 
                class="swal2-input !mt-0 !w-full text-xs font-mono pr-9" 
                placeholder="Kosongkan jika tidak ingin mengubah password"
              >
              <button 
                type="button" 
                id="swal-btn-toggle-pwd" 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1" 
                title="Tampilkan / Sembunyikan Password"
              >
                <i id="swal-icon-toggle-pwd" class="fa-solid fa-eye text-xs"></i>
              </button>
            </div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-[10px] text-gray-500 dark:text-gray-400">
                Default: <span class="font-mono font-bold text-purple-700 dark:text-purple-300">${defaultPwd}</span>
              </span>
              <button 
                type="button" 
                id="swal-btn-default-pwd" 
                class="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
              >
                Gunakan Password Default (${defaultPwd})
              </button>
            </div>
          </div>

          <div class="pt-1 border-t border-gray-100 dark:border-gray-800">
            <label class="flex items-center gap-2 cursor-pointer text-[11px] text-gray-700 dark:text-gray-300">
              <input 
                id="swal-sync-nip" 
                type="checkbox" 
                class="rounded text-purple-600 focus:ring-purple-500"
                ${/^\d{8,25}$/.test((item.nip !== '-' ? item.nip : item.username).replace(/[-.\s]/g, '')) ? 'checked' : ''}
              >
              <span>Sinkronkan username ke NIP di Data Guru</span>
            </label>
          </div>
        </div>
      `,
      didOpen: (popup) => {
        const toggleBtn = popup.querySelector('#swal-btn-toggle-pwd') as HTMLButtonElement | null;
        const pwdInput = popup.querySelector('#swal-password') as HTMLInputElement | null;
        const iconToggle = popup.querySelector('#swal-icon-toggle-pwd') as HTMLElement | null;
        if (toggleBtn && pwdInput) {
          toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (pwdInput.type === 'password') {
              pwdInput.type = 'text';
              if (iconToggle) iconToggle.className = 'fa-solid fa-eye-slash text-xs';
            } else {
              pwdInput.type = 'password';
              if (iconToggle) iconToggle.className = 'fa-solid fa-eye text-xs';
            }
          });
        }

        const defaultBtn = popup.querySelector('#swal-btn-default-pwd') as HTMLButtonElement | null;
        if (defaultBtn && pwdInput) {
          defaultBtn.addEventListener('click', () => {
            pwdInput.value = defaultPwd;
            pwdInput.type = 'text';
            if (iconToggle) iconToggle.className = 'fa-solid fa-eye-slash text-xs';
          });
        }
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Kredensial',
      confirmButtonColor: '#7C3AED',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const usernameVal = (document.getElementById('swal-username') as HTMLInputElement)?.value?.trim();
        const passwordVal = (document.getElementById('swal-password') as HTMLInputElement)?.value?.trim();
        const syncNipVal = (document.getElementById('swal-sync-nip') as HTMLInputElement)?.checked ?? false;

        if (!usernameVal) {
          Swal.showValidationMessage('Username tidak boleh kosong!');
          return null;
        }

        return {
          newUsername: usernameVal,
          newPassword: passwordVal || undefined,
          syncNipToDataGuru: syncNipVal
        };
      }
    });

    if (formValues) {
      setLoading(true);
      const res = await updateTeacherCredentials(supabase, {
        userId: item.userId,
        guruId: item.guruId,
        oldUsername: item.username,
        newUsername: formValues.newUsername,
        newPassword: formValues.newPassword,
        syncNipToDataGuru: formValues.syncNipToDataGuru,
        sekolahId: item.sekolahId || user?.sekolah_id,
        newNama: item.nama
      });

      if (!isMountedRef.current) return;
      setLoading(false);

      if (res.success) {
        showToast('Berhasil', res.message, 'success');
        handleLoadAndSync(false);
      } else {
        showToast('Gagal Memperbarui', res.message, 'error');
      }
    }
  };

  // Handle Quick Reset to NIP27
  const handleQuickReset = async (item: TeacherAccountItem) => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mereset kata sandi.', 'error');
      return;
    }

    const defaultPwd = getDefaultTeacherPassword(item.nip !== '-' ? item.nip : item.username);

    const result = await Swal.fire({
      title: 'Reset Password ke Default?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p>Apakah Anda yakin ingin mereset kata sandi untuk guru <b>${item.nama}</b>?</p>
          <div class="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-900 dark:text-amber-300">
            Kata sandi akan direset ke format default: <span class="font-mono font-bold">${defaultPwd}</span>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7C3AED',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Ya, Reset Password',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setLoading(true);
      const res = await resetTeacherPasswordToDefault(supabase, {
        userId: item.userId,
        username: item.username,
        nip: item.nip,
        nama: item.nama,
        sekolahId: item.sekolahId || user?.sekolah_id
      });

      if (!isMountedRef.current) return;
      setLoading(false);

      if (res.success) {
        showToast('Reset Berhasil', res.message, 'success');
        handleLoadAndSync(false);
      } else {
        showToast('Gagal Mereset', res.message, 'error');
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="glass-card p-8 text-center max-w-lg mx-auto mt-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 text-xl shadow-inner">
          <i className="fa-solid fa-lock"></i>
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          Sub menu <strong>Pengguna</strong> secara eksklusif hanya dapat diakses oleh Administrator untuk mengelola kredensial akun guru.
        </p>
      </div>
    );
  }

  return (
    <div id="sub-menu-pengguna" className="space-y-4 fade-in">
      {/* Information & Automatic Pull Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border-2 border-purple-200/80 dark:border-purple-800/60 shadow-xs">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <i className="fa-solid fa-users-gear text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <span>Manajemen Kredensial Akun Guru</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-300/60">
                  Sinkron Otomatis
                </span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                Data akun ditarik otomatis dari <strong>Data Guru</strong>. Username awal sesuai <strong>NIP</strong> dan password default berupa <strong>NIP27</strong>.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateTuUser}
              disabled={syncing || loading}
              className="clay-btn px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Tambah akun pengguna Tata Usaha baru"
            >
              <i className="fa-solid fa-user-plus"></i>
              <span>+ Akun TU</span>
            </button>
            <button
              type="button"
              onClick={handleCreateBkUser}
              disabled={syncing || loading}
              className="clay-btn px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Tambah akun pengguna Guru BK baru"
            >
              <i className="fa-solid fa-user-plus"></i>
              <span>+ Akun BK</span>
            </button>
            <button
              type="button"
              onClick={() => handleLoadAndSync(true)}
              disabled={syncing || loading}
              className="clay-btn px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Sinkronkan ulang seluruh guru ke akun pengguna"
            >
              <i className={`fa-solid fa-arrows-rotate ${syncing ? 'animate-spin' : ''}`}></i>
              <span>{syncing ? 'Menyinkronkan...' : 'Tarik / Sinkron Guru'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportUsersCsv}
              disabled={loading}
              className="clay-btn px-3 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Ekspor daftar pengguna ke berkas CSV"
            >
              <i className="fa-solid fa-file-export text-purple-600 dark:text-purple-400"></i>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/40">
          <div className="bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-xl border border-purple-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Total Guru</span>
            <span className="text-xs font-black text-purple-900 dark:text-purple-300">{accounts.length}</span>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-xl border border-purple-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Akun Terdaftar</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
              {accounts.filter(a => a.hasAccount).length}
            </span>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-xl border border-purple-100 dark:border-gray-700 col-span-2 sm:col-span-1 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Format Password</span>
            <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300">NIP + 27</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <i className="fa-solid fa-circle-exclamation mr-1"></i> {errorMsg}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 justify-between">
        <div className="relative flex-grow w-full sm:w-auto">
          <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Cari guru, NIP, atau username..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
          <select
            value={filterMapel}
            onChange={(e) => {
              setFilterMapel(e.target.value);
              setPage(0);
            }}
            className="text-xs py-2 px-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium"
          >
            <option value="ALL">Semua Mapel</option>
            {mapelOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
            className="text-xs py-2 px-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-medium"
          >
            <option value="ALL">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-spinner animate-spin text-purple-600 text-lg mb-2 block"></i>
            Memuat dan menyinkronkan akun guru...
          </div>
        ) : paginatedAccounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-user-slash text-2xl text-gray-300 dark:text-gray-600 mb-2 block"></i>
            Tidak ada akun guru yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scroll">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-purple-50/70 dark:bg-gray-800/60 text-purple-900 dark:text-purple-300 font-bold border-b border-gray-200 dark:border-gray-800">
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3">Nama Guru</th>
                  <th className="py-2.5 px-3">NIP</th>
                  <th className="py-2.5 px-3">Username Login</th>
                  <th className="py-2.5 px-3">Password Default</th>
                  <th className="py-2.5 px-3">Mata Pelajaran</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center w-36">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedAccounts.map((item, idx) => {
                  const rowNumber = page * ITEMS_PER_PAGE + idx + 1;
                  const isItemBk =
                    (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'bk' ||
                    (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'gurubk' ||
                    (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'bimbingankonseling' ||
                    (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'bimbingandankonseling' ||
                    (item.mataPelajaran || '').toLowerCase().includes('bimbingan konseling') ||
                    (item.mataPelajaran || '').toLowerCase().includes('bimbingan dan konseling') ||
                    (item.mataPelajaran || '').toLowerCase().trim() === 'bk';
                  return (
                    <tr
                      key={item.guruId}
                      className="hover:bg-purple-50/40 dark:hover:bg-gray-800/40 transition"
                    >
                      <td className="py-2.5 px-3 text-center font-semibold text-gray-500 text-[11px]">
                        {rowNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                            {renderUserAvatar(undefined, 'w-6 h-6')}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white leading-tight">
                              {item.nama}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              Role: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{isItemBk ? 'Guru BK' : item.role === 'tata_usaha' ? 'Tata Usaha' : item.role}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                        {item.nip}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/50">
                          {item.username}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md" title="Password default: NIP + 27">
                          {item.defaultPassword}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                        {item.mataPelajaran}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleTuAssignment(item)}
                            className={`btn-click px-2 py-1 rounded-lg font-bold text-[11px] border transition flex items-center gap-1 ${
                              (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha'
                                ? 'bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300/60'
                                : 'bg-teal-100 hover:bg-teal-200 text-teal-900 dark:bg-teal-900/40 dark:text-teal-300 border-teal-300/60'
                            }`}
                            title={
                              (item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha'
                                ? 'Kembalikan role ke Guru'
                                : 'Tunjuk sebagai staf Tata Usaha'
                            }
                          >
                            <i className={`fa-solid ${(item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha' ? 'fa-chalkboard-user' : 'fa-id-card-clip'} text-[10px]`}></i>
                            <span>{(item.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha' ? 'Ke Guru' : 'Tunjuk TU'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleBkAssignment(item)}
                            className={`btn-click px-2 py-1 rounded-lg font-bold text-[11px] border transition flex items-center gap-1 ${
                              isItemBk
                                ? 'bg-blue-100 hover:bg-blue-200 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300/60'
                                : 'bg-rose-100 hover:bg-rose-200 text-rose-900 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300/60'
                            }`}
                            title={
                              isItemBk
                                ? 'Kembalikan role ke Guru'
                                : 'Tunjuk sebagai Guru BK'
                            }
                          >
                            <i className={`fa-solid ${isItemBk ? 'fa-chalkboard-user' : 'fa-heart-pulse'} text-[10px]`}></i>
                            <span>{isItemBk ? 'Ke Guru' : 'Tunjuk BK'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="btn-click px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                            title="Ubah Username & Password"
                          >
                            <i className="fa-solid fa-key text-[10px]"></i>
                            <span>Atur</span>
                          </button>
                          {item.role === 'tata_usaha' ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteTu(item)}
                              className="btn-click px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300 font-bold text-[11px] border border-red-300/60 transition"
                              title="Hapus akun Tata Usaha"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]"></i>
                              <span>Hapus</span>
                            </button>
                          ) : item.role === 'bk' ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteBk(item)}
                              className="btn-click px-2 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300 font-bold text-[11px] border border-red-300/60 transition"
                              title="Hapus akun Guru BK"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]"></i>
                              <span>Hapus</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickReset(item)}
                              className="btn-click px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 font-bold text-[11px] border border-amber-300/60 transition"
                              title="Reset password ke default NIP27"
                            >
                              <i className="fa-solid fa-rotate-left text-[10px]"></i>
                              <span>NIP27</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              Menampilkan {page * ITEMS_PER_PAGE + 1} - {Math.min((page + 1) * ITEMS_PER_PAGE, filteredAccounts.length)} dari {filteredAccounts.length} akun guru
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-bold text-gray-800 dark:text-gray-200">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
