'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

export interface AdminPenggunaViewProps {
  user: any;
}

export default function AdminPenggunaView({ user }: AdminPenggunaViewProps) {
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
    if (isManualTrigger) {
      setSyncing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');

    try {
      const sekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      const result = await syncTeacherAccounts(supabase, sekolahId);

      if (result.accounts && result.accounts.length > 0) {
        setAccounts(result.accounts);
      } else {
        setAccounts([]);
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
      setErrorMsg(err.message || 'Gagal menyinkronkan akun guru.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [user?.sekolah_id]);

  useEffect(() => {
    handleLoadAndSync(false);
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

  // Handle Edit Credentials Modal
  const handleOpenEditModal = async (item: TeacherAccountItem) => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengelola kredensial pengguna.', 'error');
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
                type="text" 
                class="swal2-input !mt-0 !w-full text-xs font-mono" 
                placeholder="Kosongkan jika tidak ingin mengubah password"
              >
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
        </div>
      `,
      didOpen: (popup) => {
        const defaultBtn = popup.querySelector('#swal-btn-default-pwd') as HTMLButtonElement | null;
        const pwdInput = popup.querySelector('#swal-password') as HTMLInputElement | null;
        if (defaultBtn && pwdInput) {
          defaultBtn.addEventListener('click', () => {
            pwdInput.value = defaultPwd;
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

        if (!usernameVal) {
          Swal.showValidationMessage('Username tidak boleh kosong!');
          return null;
        }

        return {
          newUsername: usernameVal,
          newPassword: passwordVal || undefined
        };
      }
    });

    if (formValues && item.userId) {
      setLoading(true);
      const res = await updateTeacherCredentials(supabase, {
        userId: item.userId,
        guruId: item.guruId,
        oldUsername: item.username,
        newUsername: formValues.newUsername,
        newPassword: formValues.newPassword,
        sekolahId: item.sekolahId
      });
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

    if (!item.userId) {
      showToast('Peringatan', 'Akun pengguna belum terdaftar.', 'warning');
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
        nip: item.nip
      });
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
              onClick={() => handleLoadAndSync(true)}
              disabled={syncing || loading}
              className="clay-btn px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Sinkronkan ulang seluruh guru ke akun pengguna"
            >
              <i className={`fa-solid fa-arrows-rotate ${syncing ? 'animate-spin' : ''}`}></i>
              <span>{syncing ? 'Menyinkronkan...' : 'Tarik / Sinkron Guru'}</span>
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
                              Role: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.role}</span>
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="btn-click px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition"
                            title="Ubah Username & Password"
                          >
                            <i className="fa-solid fa-key text-[10px]"></i>
                            <span>Atur</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickReset(item)}
                            className="btn-click px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 font-bold text-[11px] border border-amber-300/60 transition"
                            title="Reset password ke default NIP27"
                          >
                            <i className="fa-solid fa-rotate-left text-[10px]"></i>
                            <span>NIP27</span>
                          </button>
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
