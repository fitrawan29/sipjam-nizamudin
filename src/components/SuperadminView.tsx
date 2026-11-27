'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import {
  masterSupabase,
  getActiveTargetSchool,
  setActiveTargetSchool,
  onActiveTargetSchoolChange,
  getSatelliteSupabaseClient,
  normalizeSupabaseUrl,
  isSchemaCacheOrMissingTableError,
  type SatelliteSchool
} from '@/lib/supabaseClient';
import { validateUserData, normalizeName } from '@/lib/dataIntegrityGuard';

// Platform administrative mutations are pinned to central masterSupabase
// masterSupabase.from('users').insert
// masterSupabase.from('users').update
// masterSupabase.from('users').delete

interface SuperadminViewProps {
  user: any;
  initialTab?: 'overview' | 'jaringan' | 'dinas';
  onNavigateTab?: (tab: 'overview' | 'jaringan' | 'dinas') => void;
}

export interface DinasAccount {
  id: string;
  username: string;
  nama: string;
  role: string;
  sekolah_id: string | null;
  kota_kabupaten: string | null;
  created_at?: string | null;
}

export default function SuperadminView({
  user,
  initialTab = 'overview',
  onNavigateTab
}: SuperadminViewProps) {
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jaringan' | 'dinas'>(
    initialTab === 'jaringan' ? 'jaringan' : initialTab === 'dinas' ? 'dinas' : 'overview'
  );
  const [loading, setLoading] = useState(false);

  // Satellite School Network & Monitoring Scope state
  const [activeTargetSchool, setActiveTargetSchoolState] = useState<SatelliteSchool | null>(() => getActiveTargetSchool());
  const [satelliteSchools, setSatelliteSchools] = useState<SatelliteSchool[]>([]);
  const [satelliteSearch, setSatelliteSearch] = useState('');
  const [satelliteStatusFilter, setSatelliteStatusFilter] = useState<'all' | 'online' | 'paused'>('all');
  const [healthMap, setHealthMap] = useState<Record<string, 'online' | 'paused' | 'checking'>>({});
  const [metricsMap, setMetricsMap] = useState<Record<string, { guruCount: number; siswaCount: number }>>({});
  const [isPingingAll, setIsPingingAll] = useState(false);

  // Dinas Pendidikan Accounts State
  const [dinasUsers, setDinasUsers] = useState<DinasAccount[]>([]);
  const [dinasSearch, setDinasSearch] = useState('');
  const [loadingDinas, setLoadingDinas] = useState(false);

  // Track component lifecycle to prevent setting state on unmounted component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Listen to satellite error events (e.g. 401 Unauthorized from invalid anon key)
  useEffect(() => {
    const handleSatelliteErr = (e: any) => {
      const errSchool = e?.detail?.school;
      if (errSchool) {
        Swal.fire({
          icon: 'error',
          title: 'Koneksi Satelit Gagal (401)',
          html: `Instance Supabase <b>${errSchool.nama}</b> mengembalikan respon 401 Unauthorized.<br><span class="text-xs text-gray-500">Periksa kembali Supabase Anon Key di menu edit sekolah satelit.</span>`,
          confirmButtonColor: '#0F766E'
        });
      }
    };
    window.addEventListener('sipjam_satellite_error', handleSatelliteErr);
    return () => {
      window.removeEventListener('sipjam_satellite_error', handleSatelliteErr);
    };
  }, []);

  // Stats / Overview Data
  const [stats, setStats] = useState({
    totalSekolah: 0,
    sekolahAktif: 0,
    sekolahNonaktif: 0,
    totalGuru: 0,
    totalSiswa: 0
  });

  // Sync tab with props if changed externally
  useEffect(() => {
    const resolvedTab = initialTab === 'jaringan' ? 'jaringan' : initialTab === 'dinas' ? 'dinas' : 'overview';
    if (resolvedTab !== activeTab) {
      setActiveTab(resolvedTab);
    }
  }, [initialTab]);

  // Sync active target school across tabs and custom events
  useEffect(() => {
    const unsubscribe = onActiveTargetSchoolChange((sch) => {
      setActiveTargetSchoolState(sch);
    });
    return unsubscribe;
  }, []);

  const switchTab = (tab: 'overview' | 'jaringan' | 'dinas') => {
    setActiveTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  // ----------------------------------------------------------------------------
  // Data Fetching: Dinas Pendidikan Accounts
  // ----------------------------------------------------------------------------
  const fetchDinasUsers = useCallback(async () => {
    setLoadingDinas(true);
    try {
      const { data, error } = await masterSupabase
        .from('users')
        .select('id, username, nama, role, sekolah_id, kota_kabupaten')
        .ilike('role', '%dinas%')
        .order('nama', { ascending: true });

      if (!error && data) {
        if (isMountedRef.current) {
          setDinasUsers(data as DinasAccount[]);
        }
      } else if (error) {
        console.warn('[SuperadminView] Error fetching dinas users:', error);
      }
    } catch (e) {
      console.warn('[SuperadminView] Exception fetching dinas users:', e);
    } finally {
      if (isMountedRef.current) {
        setLoadingDinas(false);
      }
    }
  }, []);

  // ----------------------------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------------------------
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 0. Fetch Dinas accounts in parallel
      fetchDinasUsers();

      // 1. Fetch Satellite School Registry from central master
      let loadedSatellites: SatelliteSchool[] = [];
      try {
        const { data: regData, error: regErr } = await masterSupabase
          .from('sekolah_registry')
          .select('*')
          .order('nama', { ascending: true });

        if (!regErr && regData && regData.length > 0) {
          loadedSatellites = regData as SatelliteSchool[];
        } else if (regErr && isSchemaCacheOrMissingTableError(regErr)) {
          console.warn('[sekolah_registry] Schema cache / missing table detected on fetch, falling back to public.sekolah:', regErr?.message || (regErr as any)?.error?.message || String(regErr));
        }
      } catch (_) {}

      // Fallback: Populate from central sekolah table if registry is empty
      if (loadedSatellites.length === 0) {
        try {
          const { data: schools } = await masterSupabase
            .from('sekolah')
            .select('*')
            .order('nama', { ascending: true });

          if (schools && schools.length > 0) {
            loadedSatellites = schools.map(s => ({
              id: s.id,
              nama: s.nama,
              npsn: s.npsn,
              kota_kabupaten: s.kota_kabupaten,
              provinsi: s.provinsi,
              vercel_url: (s as any).vercel_url || (s as any).website || null,
              supabase_url: (s as any).supabase_url || null,
              supabase_anon_key: (s as any).supabase_anon_key || null,
              status: s.status || 'aktif'
            }));
          }
        } catch (_) {}
      }

      setSatelliteSchools(loadedSatellites);

      // 2. Fetch count of teachers & students across all schools (or targeted active school)
      let totalGuru = 0;
      let totalSiswa = 0;
      try {
        const countClient = activeTargetSchool?.supabase_url ? getSatelliteSupabaseClient(activeTargetSchool) : masterSupabase;
        let guruQuery = countClient.from('data_guru').select('id', { count: 'exact', head: true });
        let siswaQuery = countClient.from('data_siswa').select('id', { count: 'exact', head: true });

        // If target school is selected and shares the central database, filter counts specifically for this school
        if (activeTargetSchool && !activeTargetSchool.supabase_url) {
          guruQuery = guruQuery.eq('sekolah_id', activeTargetSchool.id);
          siswaQuery = siswaQuery.eq('sekolah_id', activeTargetSchool.id);
        }

        const [guruCountRes, siswaCountRes] = await Promise.all([guruQuery, siswaQuery]);
        totalGuru = guruCountRes?.count || 0;
        totalSiswa = siswaCountRes?.count || 0;
      } catch (countErr) {
        console.warn('[SuperadminView] Could not fetch teacher/student metrics:', countErr);
      }

      const activeCount = loadedSatellites.filter(s => s.status === 'aktif').length;
      const inactiveCount = loadedSatellites.filter(s => s.status === 'nonaktif').length;

      setStats({
        totalSekolah: loadedSatellites.length,
        sekolahAktif: activeCount,
        sekolahNonaktif: inactiveCount,
        totalGuru,
        totalSiswa
      });

      checkSatelliteHealthAndMetrics(loadedSatellites);
    } catch (err) {
      console.error('Failed to load Superadmin data:', err);
      Swal.fire('Error', 'Gagal memuat data platform Superadmin.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTargetSchool]);

  const checkSatelliteHealthAndMetrics = useCallback(async (schoolsToCheck: SatelliteSchool[]) => {
    if (!schoolsToCheck || schoolsToCheck.length === 0) return;
    setIsPingingAll(true);

    const initialChecking: Record<string, 'online' | 'paused' | 'checking'> = {};
    schoolsToCheck.forEach(s => {
      initialChecking[s.id] = 'checking';
    });
    setHealthMap(prev => ({ ...prev, ...initialChecking }));

    const updatedHealth: Record<string, 'online' | 'paused' | 'checking'> = {};
    const updatedMetrics: Record<string, { guruCount: number; siswaCount: number }> = {};

    await Promise.allSettled(
      schoolsToCheck.map(async (sch) => {
        let timerId: any = null;
        try {
          if (sch.supabase_url && sch.supabase_anon_key && sch.supabase_url.trim()) {
            const client = getSatelliteSupabaseClient(sch);
            const pingPromise = client.from('sekolah').select('id').limit(1);
            const timeoutPromise = new Promise<{ error: any }>((_, reject) => {
              timerId = setTimeout(() => reject(new Error('Connection Timeout')), 4000);
            });
            timeoutPromise.catch(() => {}); // prevent unhandled rejection if pingPromise resolves first

            let res: any;
            try {
              res = await Promise.race([pingPromise, timeoutPromise]);
            } finally {
              if (timerId) clearTimeout(timerId);
            }

            // Database is online ONLY if no error or empty-table code (PGRST116).
            // Any network error, timeout, 503, or HTML response (failing JSON parsing) marks it paused/unreachable.
            const isOnline = !res?.error || res?.error?.code === 'PGRST116';
            updatedHealth[sch.id] = isOnline ? 'online' : 'paused';

            const [guruRes, siswaRes] = await Promise.all([
              client.from('data_guru').select('id', { count: 'exact', head: true }),
              client.from('data_siswa').select('id', { count: 'exact', head: true })
            ]);
            updatedMetrics[sch.id] = {
              guruCount: guruRes.count || 0,
              siswaCount: siswaRes.count || 0
            };
          } else {
            // Central master database query
            const [guruRes, siswaRes] = await Promise.all([
              masterSupabase.from('data_guru').select('id', { count: 'exact', head: true }).eq('sekolah_id', sch.id),
              masterSupabase.from('data_siswa').select('id', { count: 'exact', head: true }).eq('sekolah_id', sch.id)
            ]);
            updatedHealth[sch.id] = sch.status === 'nonaktif' ? 'paused' : 'online';
            updatedMetrics[sch.id] = {
              guruCount: guruRes.count || 0,
              siswaCount: siswaRes.count || 0
            };
          }
        } catch (_) {
          if (timerId) clearTimeout(timerId);
          updatedHealth[sch.id] = 'paused';
          updatedMetrics[sch.id] = { guruCount: 0, siswaCount: 0 };
        }
      })
    );

    if (!isMountedRef.current) return;
    setHealthMap(prev => ({ ...prev, ...updatedHealth }));
    setMetricsMap(prev => ({ ...prev, ...updatedMetrics }));
    setIsPingingAll(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filtered Satellite Schools (Jaringan Sekolah Tab)
  const filteredSatellite = satelliteSchools.filter(sch => {
    const term = satelliteSearch.toLowerCase();
    const matchesSearch =
      !satelliteSearch ||
      sch.nama.toLowerCase().includes(term) ||
      (sch.npsn && sch.npsn.toLowerCase().includes(term)) ||
      (sch.kota_kabupaten && sch.kota_kabupaten.toLowerCase().includes(term));

    const status = healthMap[sch.id] || (sch.status === 'nonaktif' ? 'paused' : 'online');
    const matchesStatus =
      satelliteStatusFilter === 'all' ||
      (satelliteStatusFilter === 'online' && status === 'online') ||
      (satelliteStatusFilter === 'paused' && status === 'paused');

    return matchesSearch && matchesStatus;
  });

  // Filtered Dinas Accounts (Akun Dinas Pendidikan Tab)
  const filteredDinasUsers = dinasUsers.filter(u => {
    const term = dinasSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (u.nama && u.nama.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.kota_kabupaten && u.kota_kabupaten.toLowerCase().includes(term))
    );
  });

  // Extract distinct regions (kota_kabupaten) from registered schools
  const getDistinctRegions = () => {
    const regionMap = new Map<string, string>();
    for (const s of satelliteSchools) {
      const trimmed = s.kota_kabupaten?.trim();
      if (trimmed && trimmed.length > 0) {
        const lower = trimmed.toLowerCase();
        if (!regionMap.has(lower)) {
          regionMap.set(lower, trimmed);
        }
      }
    }
    return Array.from(regionMap.values()).sort((a, b) => a.localeCompare(b));
  };

  // ----------------------------------------------------------------------------
  // Dinas Pendidikan Account Management Handlers
  // ----------------------------------------------------------------------------
  const handleOpenAddDinasUserModal = async () => {
    const regions = getDistinctRegions();
    const regionOptionsHtml = regions.length > 0
      ? regions.map(r => `<option value="${r}">${r}</option>`).join('')
      : '<option value="Kab. Bolaang Mongondow Timur">Kab. Bolaang Mongondow Timur</option><option value="Kota Kotamobagu">Kota Kotamobagu</option>';

    const { value: formValues } = await Swal.fire({
      title: '<span class="text-lg font-bold text-gray-900">Tambah Akun Dinas Pendidikan</span>',
      html: `
        <div class="text-left space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Petugas / Kantor Dinas <span class="text-red-500">*</span></label>
            <input id="swal-dinas-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Dinas Pendidikan Kab. Boltim">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Username Login <span class="text-red-500">*</span></label>
            <input id="swal-dinas-username" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: dinas_boltim">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Kata Sandi (Password) <span class="text-red-500">*</span></label>
            <input id="swal-dinas-password" type="password" class="swal2-input !mt-0 !w-full text-xs" placeholder="Minimal 6 karakter">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Daerah Binaan (Kota / Kabupaten) <span class="text-red-500">*</span></label>
            <select id="swal-dinas-region" class="swal2-select !mt-0 !w-full text-xs">
              <option value="">-- Pilih Daerah Binaan --</option>
              ${regionOptionsHtml}
              <option value="__custom__">+ Input Wilayah Baru...</option>
            </select>
          </div>
          <div id="swal-dinas-custom-container" style="display: none;">
            <label class="font-bold text-gray-700 block mb-1">Nama Wilayah Baru</label>
            <input id="swal-dinas-custom-region" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Kab. Bolaang Mongondow">
          </div>
        </div>
      `,
      didOpen: () => {
        const selectEl = document.getElementById('swal-dinas-region') as HTMLSelectElement;
        const customContainer = document.getElementById('swal-dinas-custom-container') as HTMLDivElement;
        if (selectEl && customContainer) {
          selectEl.addEventListener('change', () => {
            customContainer.style.display = selectEl.value === '__custom__' ? 'block' : 'none';
          });
        }
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-plus-circle mr-1"></i> Buat Akun Dinas',
      confirmButtonColor: '#0F766E',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const rawNama = (document.getElementById('swal-dinas-nama') as HTMLInputElement)?.value || '';
        const nama = normalizeName(rawNama);
        const username = (document.getElementById('swal-dinas-username') as HTMLInputElement)?.value?.trim();
        const password = (document.getElementById('swal-dinas-password') as HTMLInputElement)?.value;
        const selectRegion = (document.getElementById('swal-dinas-region') as HTMLSelectElement)?.value?.trim();
        const customRegion = (document.getElementById('swal-dinas-custom-region') as HTMLInputElement)?.value?.trim();

        const region = selectRegion === '__custom__' ? customRegion : selectRegion;

        if (!nama || !username || !password || !region) {
          Swal.showValidationMessage('Seluruh kolom bertanda bintang (*) dan Daerah Binaan wajib diisi!');
          return null;
        }

        const userValidation = validateUserData(username, nama, dinasUsers);
        if (!userValidation.valid) {
          Swal.showValidationMessage(userValidation.message || 'Data akun tidak valid!');
          return null;
        }

        return { nama, username, password, kota_kabupaten: region };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error } = await masterSupabase.from('users').insert({
          nama: formValues.nama,
          username: formValues.username,
          password: formValues.password,
          role: 'dinas_pendidikan',
          sekolah_id: null,
          kota_kabupaten: formValues.kota_kabupaten
        });

        if (error) {
          throw error;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Akun Dinas Berhasil Dibuat',
          text: `Akun ${formValues.nama} untuk wilayah ${formValues.kota_kabupaten} telah aktif.`,
          confirmButtonColor: '#0F766E'
        });

        fetchDinasUsers();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Membuat Akun Dinas',
          text: err.message || 'Terjadi kesalahan sistem saat menyimpan ke database.',
          confirmButtonColor: '#0F766E'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditDinasUser = async (dinasUser: DinasAccount) => {
    const regions = getDistinctRegions();
    if (dinasUser.kota_kabupaten && !regions.includes(dinasUser.kota_kabupaten)) {
      regions.unshift(dinasUser.kota_kabupaten);
    }

    const regionOptionsHtml = regions.map(r => `
      <option value="${r}" ${r === dinasUser.kota_kabupaten ? 'selected' : ''}>${r}</option>
    `).join('');

    const { value: formValues } = await Swal.fire({
      title: '<span class="text-lg font-bold text-gray-900">Edit Akun Dinas Pendidikan</span>',
      html: `
        <div class="text-left space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Petugas / Kantor Dinas <span class="text-red-500">*</span></label>
            <input id="swal-edit-dinas-nama" class="swal2-input !mt-0 !w-full text-xs" value="${dinasUser.nama || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Username Login <span class="text-red-500">*</span></label>
            <input id="swal-edit-dinas-username" class="swal2-input !mt-0 !w-full text-xs" value="${dinasUser.username || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Kata Sandi Baru (Kosongkan jika tidak diubah)</label>
            <input id="swal-edit-dinas-password" type="password" class="swal2-input !mt-0 !w-full text-xs" placeholder="Ganti kata sandi baru">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Daerah Binaan (Kota / Kabupaten) <span class="text-red-500">*</span></label>
            <select id="swal-edit-dinas-region" class="swal2-select !mt-0 !w-full text-xs">
              <option value="">-- Pilih Daerah Binaan --</option>
              ${regionOptionsHtml}
              <option value="__custom__">+ Input Wilayah Baru...</option>
            </select>
          </div>
          <div id="swal-edit-dinas-custom-container" style="display: none;">
            <label class="font-bold text-gray-700 block mb-1">Nama Wilayah Baru</label>
            <input id="swal-edit-dinas-custom-region" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Kab. Bolaang Mongondow">
          </div>
        </div>
      `,
      didOpen: () => {
        const selectEl = document.getElementById('swal-edit-dinas-region') as HTMLSelectElement;
        const customContainer = document.getElementById('swal-edit-dinas-custom-container') as HTMLDivElement;
        if (selectEl && customContainer) {
          selectEl.addEventListener('change', () => {
            customContainer.style.display = selectEl.value === '__custom__' ? 'block' : 'none';
          });
        }
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-save mr-1"></i> Simpan Perubahan',
      confirmButtonColor: '#0F766E',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const rawNama = (document.getElementById('swal-edit-dinas-nama') as HTMLInputElement)?.value || '';
        const nama = normalizeName(rawNama);
        const username = (document.getElementById('swal-edit-dinas-username') as HTMLInputElement)?.value?.trim();
        const password = (document.getElementById('swal-edit-dinas-password') as HTMLInputElement)?.value;
        const selectRegion = (document.getElementById('swal-edit-dinas-region') as HTMLSelectElement)?.value?.trim();
        const customRegion = (document.getElementById('swal-edit-dinas-custom-region') as HTMLInputElement)?.value?.trim();

        const region = selectRegion === '__custom__' ? customRegion : selectRegion;

        if (!nama || !username || !region) {
          Swal.showValidationMessage('Nama, Username, dan Daerah Binaan wajib diisi!');
          return null;
        }

        const userValidation = validateUserData(username, nama, dinasUsers, dinasUser.id);
        if (!userValidation.valid) {
          Swal.showValidationMessage(userValidation.message || 'Data akun tidak valid!');
          return null;
        }

        return { nama, username, password, kota_kabupaten: region };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const updatePayload: Record<string, any> = {
          nama: formValues.nama,
          username: formValues.username,
          kota_kabupaten: formValues.kota_kabupaten,
          role: 'dinas_pendidikan',
          sekolah_id: null
        };
        if (formValues.password && formValues.password.trim().length > 0) {
          updatePayload.password = formValues.password;
        }

        const { error } = await masterSupabase
          .from('users')
          .update(updatePayload)
          .eq('id', dinasUser.id);

        if (error) {
          throw error;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Akun Dinas Diperbarui',
          text: `Data akun ${formValues.nama} berhasil diperbarui.`,
          confirmButtonColor: '#0F766E'
        });

        fetchDinasUsers();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memperbarui Akun Dinas',
          text: err.message || 'Terjadi kesalahan sistem saat memperbarui ke database.',
          confirmButtonColor: '#0F766E'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteDinasUser = async (dinasUser: DinasAccount) => {
    const result = await Swal.fire({
      title: 'Hapus Akun Dinas?',
      html: `Apakah Anda yakin ingin menghapus akun <b>${dinasUser.nama}</b> (${dinasUser.username}) untuk wilayah <b>${dinasUser.kota_kabupaten || 'Semua'}</b>?<br><span class="text-xs text-red-600 font-semibold">Tindakan ini tidak dapat dibatalkan.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-trash mr-1"></i> Ya, Hapus Akun',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#b91c1c',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        const { error } = await masterSupabase
          .from('users')
          .delete()
          .eq('id', dinasUser.id);

        if (error) {
          throw error;
        }

        await Swal.fire({
          icon: 'success',
          title: 'Akun Dihapus',
          text: `Akun dinas ${dinasUser.nama} telah berhasil dihapus.`,
          confirmButtonColor: '#0F766E'
        });

        fetchDinasUsers();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menghapus Akun',
          text: err.message || 'Terjadi kesalahan saat menghapus dari database.',
          confirmButtonColor: '#0F766E'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // ----------------------------------------------------------------------------
  // Satellite School Management Handlers (Jaringan Sekolah Satelit)
  // ----------------------------------------------------------------------------
  const handleSelectTargetSchool = (school: SatelliteSchool | null) => {
    setActiveTargetSchool(school);
    setActiveTargetSchoolState(school);
    fetchAllData();
    if (school) {
      Swal.fire({
        icon: 'success',
        title: 'Target Pemantauan Aktif',
        html: `Sekarang memantau database sekolah <b>${school.nama}</b>.<br><span class="text-xs text-gray-500">Instance Supabase sekolah ini sekarang menjadi target aktif.</span>`,
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Database Master Pusat',
        text: 'Kembali ke lingkup database master seluruh sekolah.',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  const handleOpenVercelUrl = (school: SatelliteSchool) => {
    if (school.vercel_url && school.vercel_url.trim()) {
      let url = school.vercel_url.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Swal.fire({
        title: 'Vercel Web URL Belum Diatur',
        text: `Sekolah "${school.nama}" belum memiliki URL Vercel. Apakah Anda ingin mengaturnya sekarang?`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Edit Sekolah',
        cancelButtonText: 'Tutup'
      }).then((result) => {
        if (result.isConfirmed) {
          handleEditSatelliteSchool(school);
        }
      });
    }
  };

  const handleOpenAddSatelliteSchoolModal = async () => {
    const { value: formValues } = await Swal.fire({
      title: '<span class="text-lg font-bold text-gray-900">Tambah Sekolah Satelit Baru</span>',
      html: `
        <div class="text-left space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Lembaga Sekolah <span class="text-red-500">*</span></label>
            <input id="swal-sat-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: SMA Negeri 1 Modayag">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">NPSN (8 Digit) <span class="text-red-500">*</span></label>
            <input id="swal-sat-npsn" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: 40102031">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kota / Kabupaten <span class="text-red-500">*</span></label>
              <input id="swal-sat-kota" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Kab. Boltim">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Provinsi</label>
              <input id="swal-sat-provinsi" class="swal2-input !mt-0 !w-full text-xs" value="Sulawesi Utara" placeholder="Provinsi">
            </div>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Vercel Web URL (Satu-Klik Akses)</label>
            <input id="swal-sat-vercel" class="swal2-input !mt-0 !w-full text-xs" placeholder="https://sipjam-sekolah.vercel.app">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Supabase Project URL</label>
            <input id="swal-sat-supabase-url" class="swal2-input !mt-0 !w-full text-xs" placeholder="https://xxxx.supabase.co (kosongkan jika database sama)">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Supabase Anon Key</label>
            <input id="swal-sat-supabase-key" class="swal2-input !mt-0 !w-full text-xs" placeholder="eyJhbGciOi... (Anon Public Key)">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Status Operasional</label>
            <select id="swal-sat-status" class="swal2-select !mt-0 !w-full text-xs">
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-plus-circle mr-1"></i> Simpan ke Jaringan',
      confirmButtonColor: '#0F766E',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nama = (document.getElementById('swal-sat-nama') as HTMLInputElement)?.value?.trim();
        const npsn = (document.getElementById('swal-sat-npsn') as HTMLInputElement)?.value?.trim();
        const kota_kabupaten = (document.getElementById('swal-sat-kota') as HTMLInputElement)?.value?.trim();
        const provinsi = (document.getElementById('swal-sat-provinsi') as HTMLInputElement)?.value?.trim() || 'Sulawesi Utara';
        const vercel_url = (document.getElementById('swal-sat-vercel') as HTMLInputElement)?.value?.trim() || null;
        const supabase_url = (document.getElementById('swal-sat-supabase-url') as HTMLInputElement)?.value?.trim() || null;
        const supabase_anon_key = (document.getElementById('swal-sat-supabase-key') as HTMLInputElement)?.value?.trim() || null;
        const status = (document.getElementById('swal-sat-status') as HTMLSelectElement)?.value || 'aktif';

        if (!nama || !npsn || !kota_kabupaten) {
          Swal.showValidationMessage('Nama Sekolah, NPSN, dan Kota/Kabupaten wajib diisi!');
          return null;
        }

        if (supabase_url && !supabase_anon_key) {
          Swal.showValidationMessage('Jika Supabase Project URL diisi, Supabase Anon Key juga wajib diisi!');
          return null;
        }

        if (supabase_anon_key && !supabase_url) {
          Swal.showValidationMessage('Jika Supabase Anon Key diisi, Supabase Project URL juga wajib diisi!');
          return null;
        }

        const normalized_supabase_url = supabase_url ? normalizeSupabaseUrl(supabase_url) : null;

        return {
          nama,
          npsn,
          kota_kabupaten,
          provinsi,
          vercel_url,
          supabase_url: normalized_supabase_url,
          supabase_anon_key,
          status
        };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { data: insertedReg, error: regErr } = await masterSupabase
          .from('sekolah_registry')
          .insert([formValues])
          .select()
          .maybeSingle();
        if (regErr) {
          if (isSchemaCacheOrMissingTableError(regErr)) {
            console.warn('[sekolah_registry] Schema cache / missing table detected on create, falling back to public.sekolah:', regErr?.message || (regErr as any)?.error?.message || String(regErr));
            let { error: schErr } = await masterSupabase.from('sekolah').insert([{
              ...formValues,
              mode_presensi_siswa: 'qr'
            }]);

            // Resilience: If public.sekolah does not have satellite credential columns yet (PGRST204 or missing column)
            if (schErr && (schErr.code === 'PGRST204' || String(schErr.message).includes('column') || schErr.code === '42703')) {
              const { vercel_url: _v, supabase_url: _s, supabase_anon_key: _a, ...coreValues } = formValues;
              let retry = await masterSupabase.from('sekolah').insert([{
                ...coreValues,
                mode_presensi_siswa: 'qr'
              }]);
              if (retry.error && (retry.error.code === 'PGRST204' || String(retry.error.message).includes('column') || retry.error.code === '42703')) {
                retry = await masterSupabase.from('sekolah').insert([coreValues]);
              }
              schErr = retry.error;
            }

            // Resilience: If school with same NPSN already exists (23505 unique violation), update instead of failing
            if (schErr && (schErr.code === '23505' || String(schErr.message).includes('unique'))) {
              const updateRes = await masterSupabase.from('sekolah').update(formValues).eq('npsn', formValues.npsn);
              schErr = updateRes.error;
              // Resilience: If update failed because of missing satellite columns in public.sekolah
              if (schErr && (schErr.code === 'PGRST204' || String(schErr.message).includes('column') || schErr.code === '42703')) {
                const { vercel_url: _v, supabase_url: _s, supabase_anon_key: _a, ...coreValues } = formValues;
                const retryUpdate = await masterSupabase.from('sekolah').update(coreValues).eq('npsn', formValues.npsn);
                schErr = retryUpdate.error;
              }
            }

            if (schErr) throw new Error(schErr.message);
          } else {
            throw new Error(regErr.message);
          }
        } else {
          try {
            let { error: schErr } = await masterSupabase.from('sekolah').insert([{
              ...(insertedReg?.id ? { id: insertedReg.id } : {}),
              ...formValues,
              mode_presensi_siswa: 'qr'
            }]);
            if (schErr && (schErr.code === 'PGRST204' || String(schErr.message).includes('column') || schErr.code === '42703')) {
              const { vercel_url: _v, supabase_url: _s, supabase_anon_key: _a, ...coreValues } = formValues;
              let retry = await masterSupabase.from('sekolah').insert([{
                ...(insertedReg?.id ? { id: insertedReg.id } : {}),
                ...coreValues,
                mode_presensi_siswa: 'qr'
              }]);
              if (retry.error && (retry.error.code === 'PGRST204' || String(retry.error.message).includes('column') || retry.error.code === '42703')) {
                retry = await masterSupabase.from('sekolah').insert([{
                  ...(insertedReg?.id ? { id: insertedReg.id } : {}),
                  ...coreValues
                }]);
              }
              schErr = retry.error;
            }
            if (schErr && (schErr.code === '23505' || String(schErr.message).includes('unique'))) {
              const updateRes = await masterSupabase.from('sekolah').update(formValues).eq('npsn', formValues.npsn);
              if (updateRes.error && (updateRes.error.code === 'PGRST204' || String(updateRes.error.message).includes('column') || updateRes.error.code === '42703')) {
                const { vercel_url: _v, supabase_url: _s, supabase_anon_key: _a, ...coreValues } = formValues;
                await masterSupabase.from('sekolah').update(coreValues).eq('npsn', formValues.npsn);
              }
            }
          } catch (_) {}
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam_satellite_schools_updated'));
        }

        Swal.fire({
          icon: 'success',
          title: 'Sekolah Terdaftar di Jaringan!',
          text: `Sekolah "${formValues.nama}" berhasil didaftarkan ke jaringan pemantauan satelit SIPJAM.`,
          confirmButtonColor: '#0F766E'
        });
        fetchAllData();
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Gagal menyimpan sekolah satelit', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditSatelliteSchool = async (school: SatelliteSchool) => {
    const { value: formValues } = await Swal.fire({
      title: `<span class="text-lg font-bold text-gray-900">Edit Sekolah Satelit: ${school.nama}</span>`,
      html: `
        <div class="text-left space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Lembaga Sekolah <span class="text-red-500">*</span></label>
            <input id="swal-edit-sat-nama" class="swal2-input !mt-0 !w-full text-xs" value="${school.nama || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">NPSN <span class="text-red-500">*</span></label>
            <input id="swal-edit-sat-npsn" class="swal2-input !mt-0 !w-full text-xs" value="${school.npsn || ''}">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kota / Kabupaten <span class="text-red-500">*</span></label>
              <input id="swal-edit-sat-kota" class="swal2-input !mt-0 !w-full text-xs" value="${school.kota_kabupaten || ''}">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Provinsi</label>
              <input id="swal-edit-sat-provinsi" class="swal2-input !mt-0 !w-full text-xs" value="${school.provinsi || 'Sulawesi Utara'}">
            </div>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Vercel Web URL</label>
            <input id="swal-edit-sat-vercel" class="swal2-input !mt-0 !w-full text-xs" value="${school.vercel_url || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Supabase Project URL</label>
            <input id="swal-edit-sat-supabase-url" class="swal2-input !mt-0 !w-full text-xs" value="${school.supabase_url || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Supabase Anon Key</label>
            <input id="swal-edit-sat-supabase-key" class="swal2-input !mt-0 !w-full text-xs" value="${school.supabase_anon_key || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Status Operasional</label>
            <select id="swal-edit-sat-status" class="swal2-select !mt-0 !w-full text-xs">
              <option value="aktif" ${school.status === 'aktif' ? 'selected' : ''}>Aktif</option>
              <option value="nonaktif" ${school.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Perubahan',
      confirmButtonColor: '#0F766E',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nama = (document.getElementById('swal-edit-sat-nama') as HTMLInputElement)?.value?.trim();
        const npsn = (document.getElementById('swal-edit-sat-npsn') as HTMLInputElement)?.value?.trim();
        const kota_kabupaten = (document.getElementById('swal-edit-sat-kota') as HTMLInputElement)?.value?.trim();
        const provinsi = (document.getElementById('swal-edit-sat-provinsi') as HTMLInputElement)?.value?.trim() || 'Sulawesi Utara';
        const vercel_url = (document.getElementById('swal-edit-sat-vercel') as HTMLInputElement)?.value?.trim() || null;
        const supabase_url = (document.getElementById('swal-edit-sat-supabase-url') as HTMLInputElement)?.value?.trim() || null;
        const supabase_anon_key = (document.getElementById('swal-edit-sat-supabase-key') as HTMLInputElement)?.value?.trim() || null;
        const status = (document.getElementById('swal-edit-sat-status') as HTMLSelectElement)?.value || 'aktif';

        if (!nama || !npsn || !kota_kabupaten) {
          Swal.showValidationMessage('Nama Sekolah, NPSN, dan Kota/Kabupaten wajib diisi!');
          return null;
        }

        if (supabase_url && !supabase_anon_key) {
          Swal.showValidationMessage('Jika Supabase Project URL diisi, Supabase Anon Key juga wajib diisi!');
          return null;
        }

        if (supabase_anon_key && !supabase_url) {
          Swal.showValidationMessage('Jika Supabase Anon Key diisi, Supabase Project URL juga wajib diisi!');
          return null;
        }

        const normalized_supabase_url = supabase_url ? normalizeSupabaseUrl(supabase_url) : null;

        return {
          nama,
          npsn,
          kota_kabupaten,
          provinsi,
          vercel_url,
          supabase_url: normalized_supabase_url,
          supabase_anon_key,
          status,
          updated_at: new Date().toISOString()
        };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error: regErr } = await masterSupabase.from('sekolah_registry').update(formValues).eq('id', school.id);
        if (regErr) {
          if (isSchemaCacheOrMissingTableError(regErr)) {
            console.warn('[sekolah_registry] Schema cache / missing table detected on update, falling back to public.sekolah:', regErr?.message || (regErr as any)?.error?.message || String(regErr));
            let { error: schErr } = await masterSupabase.from('sekolah').update(formValues).eq('id', school.id);
            if (schErr && school.npsn) {
              const { error: schErrNpsn } = await masterSupabase.from('sekolah').update(formValues).eq('npsn', school.npsn);
              schErr = schErrNpsn;
            } else if (!schErr && school.npsn) {
              // Ensure update matches if id was not found in sekolah
              await masterSupabase.from('sekolah').update(formValues).eq('npsn', school.npsn);
            }

            // Resilience: If public.sekolah does not have satellite credential columns yet (PGRST204 or missing column)
            if (schErr && (schErr.code === 'PGRST204' || String(schErr.message).includes('column') || schErr.code === '42703')) {
              const { vercel_url: _v, supabase_url: _s, supabase_anon_key: _a, ...coreValues } = formValues;
              const retry = await masterSupabase.from('sekolah').update(coreValues).eq('id', school.id);
              if (school.npsn) {
                const retryNpsn = await masterSupabase.from('sekolah').update(coreValues).eq('npsn', school.npsn);
                schErr = retryNpsn.error || retry.error;
              } else {
                schErr = retry.error;
              }
            }

            if (schErr) throw new Error(schErr.message);
          } else {
            throw new Error(regErr.message);
          }
        } else {
          try {
            let { error: schErr } = await masterSupabase.from('sekolah').update(formValues).eq('id', school.id);
            if (schErr && school.npsn) {
              const npsnRes = await masterSupabase.from('sekolah').update(formValues).eq('npsn', school.npsn);
              schErr = npsnRes.error;
            } else if (!schErr && school.npsn) {
              await masterSupabase.from('sekolah').update(formValues).eq('npsn', school.npsn);
            }
            if (schErr && (schErr.code === 'PGRST204' || String(schErr.message).includes('column') || schErr.code === '42703')) {
              const { vercel_url: _v, supabase_url: _s, supabase_anon_key: _a, ...coreValues } = formValues;
              await masterSupabase.from('sekolah').update(coreValues).eq('id', school.id);
              if (school.npsn) {
                await masterSupabase.from('sekolah').update(coreValues).eq('npsn', school.npsn);
              }
            }
          } catch (_) {}
        }

        if (activeTargetSchool?.id === school.id || (activeTargetSchool?.npsn && school.npsn && activeTargetSchool.npsn === school.npsn)) {
          const updatedTarget: SatelliteSchool = { ...school, ...formValues };
          setActiveTargetSchool(updatedTarget);
          setActiveTargetSchoolState(updatedTarget);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam_satellite_schools_updated'));
        }

        Swal.fire('Berhasil', 'Data sekolah satelit berhasil diperbarui!', 'success');
        fetchAllData();
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Gagal memperbarui sekolah satelit', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteSatelliteSchool = async (school: SatelliteSchool) => {
    const confirm = await Swal.fire({
      title: 'Hapus Sekolah dari Jaringan?',
      html: `
        <p class="text-sm text-gray-700">Apakah Anda yakin ingin menghapus <b>${school.nama}</b> dari jaringan monitoring?</p>
        <p class="text-xs text-gray-500 mt-2">Kredensial monitoring sekolah ini akan dihapus dari portal Superadmin.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const { error: regErr } = await masterSupabase.from('sekolah_registry').delete().eq('id', school.id);
      if (regErr) {
        if (isSchemaCacheOrMissingTableError(regErr)) {
          console.warn('[sekolah_registry] Schema cache / missing table detected on delete, falling back to public.sekolah:', regErr?.message || (regErr as any)?.error?.message || String(regErr));
          let { error: schErr } = await masterSupabase.from('sekolah').delete().eq('id', school.id);
          if (schErr && school.npsn && schErr.code !== '23503') {
            const { error: schErrNpsn } = await masterSupabase.from('sekolah').delete().eq('npsn', school.npsn);
            schErr = schErrNpsn;
          } else if (!schErr && school.npsn) {
            // If id did not match rows in sekolah, try deleting by npsn
            const { error: schErrNpsn } = await masterSupabase.from('sekolah').delete().eq('npsn', school.npsn);
            if (schErrNpsn) schErr = schErrNpsn;
          }

          // Resilience: If foreign key constraint blocks deletion (23503), detach satellite credentials
          // and mark non-operational instead of crashing or showing fatal error dialog
          if (schErr && (schErr.code === '23503' || String(schErr.message).includes('foreign key'))) {
            console.warn('[sekolah] Relational FK constraint detected on delete, detaching satellite credentials instead.');
            const detachRes = await masterSupabase.from('sekolah').update({
              vercel_url: null,
              supabase_url: null,
              supabase_anon_key: null,
              status: 'nonaktif'
            }).eq('id', school.id);

            if (school.npsn) {
              await masterSupabase.from('sekolah').update({
                vercel_url: null,
                supabase_url: null,
                supabase_anon_key: null,
                status: 'nonaktif'
              }).eq('npsn', school.npsn);
            }

            // Resilience: If public.sekolah does not have satellite credential columns yet (PGRST204)
            if (detachRes.error && (detachRes.error.code === 'PGRST204' || String(detachRes.error.message).includes('column') || detachRes.error.code === '42703')) {
              await masterSupabase.from('sekolah').update({ status: 'nonaktif' }).eq('id', school.id);
              if (school.npsn) {
                await masterSupabase.from('sekolah').update({ status: 'nonaktif' }).eq('npsn', school.npsn);
              }
            }
            schErr = null;
          }

          if (schErr) throw new Error(schErr.message);
        } else {
          throw new Error(regErr.message);
        }
      } else {
        try {
          let { error: schErr } = await masterSupabase.from('sekolah').delete().eq('id', school.id);
          if (schErr && school.npsn && schErr.code !== '23503') {
            const { error: schErrNpsn } = await masterSupabase.from('sekolah').delete().eq('npsn', school.npsn);
            if (schErrNpsn) schErr = schErrNpsn;
          } else if (!schErr && school.npsn) {
            const { error: schErrNpsn } = await masterSupabase.from('sekolah').delete().eq('npsn', school.npsn);
            if (schErrNpsn) schErr = schErrNpsn;
          }
          if (schErr && (schErr.code === '23503' || String(schErr.message).includes('foreign key'))) {
            const detachRes = await masterSupabase.from('sekolah').update({
              vercel_url: null,
              supabase_url: null,
              supabase_anon_key: null,
              status: 'nonaktif'
            }).eq('id', school.id);
            if (school.npsn) {
              await masterSupabase.from('sekolah').update({
                vercel_url: null,
                supabase_url: null,
                supabase_anon_key: null,
                status: 'nonaktif'
              }).eq('npsn', school.npsn);
            }
            if (detachRes.error && (detachRes.error.code === 'PGRST204' || String(detachRes.error.message).includes('column') || detachRes.error.code === '42703')) {
              await masterSupabase.from('sekolah').update({ status: 'nonaktif' }).eq('id', school.id);
              if (school.npsn) {
                await masterSupabase.from('sekolah').update({ status: 'nonaktif' }).eq('npsn', school.npsn);
              }
            }
          }
        } catch (_) {}
      }

      if (activeTargetSchool?.id === school.id || (activeTargetSchool?.npsn && school.npsn && activeTargetSchool.npsn === school.npsn)) {
        handleSelectTargetSchool(null);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sipjam_satellite_schools_updated'));
      }

      Swal.fire('Berhasil', `Sekolah "${school.nama}" berhasil dihapus dari jaringan.`, 'success');
      fetchAllData();
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal menghapus sekolah satelit', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onlineDbCount = satelliteSchools.filter(s => (healthMap[s.id] || (s.status === 'aktif' ? 'online' : 'paused')) === 'online').length;
  const pausedDbCount = satelliteSchools.filter(s => (healthMap[s.id] || (s.status === 'aktif' ? 'online' : 'paused')) === 'paused').length;
  const totalGuruNetwork = Object.values(metricsMap).reduce((acc, m) => acc + (m.guruCount || 0), 0) || stats.totalGuru;
  const totalSiswaNetwork = Object.values(metricsMap).reduce((acc, m) => acc + (m.siswaCount || 0), 0) || stats.totalSiswa;

  // ----------------------------------------------------------------------------
  // Render Tab Content
  // ----------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Superadmin Header Banner */}
      <div className="neu-card rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <i className="fa-solid fa-crown absolute -right-4 -bottom-4 text-7xl text-[#0F766E] dark:text-teal-400 opacity-[0.06] rotate-[-12deg] pointer-events-none"></i>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full neu-inset text-xs font-semibold text-[#0F766E] dark:text-teal-300 mb-2">
              <i className="fa-solid fa-crown text-[#D97706] dark:text-amber-400"></i> Platform Operator
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
              Superadmin Portal
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] mt-1 max-w-xl">
              Pusat kendali multi-tenant SIPJAM. Pantau jaringan sekolah satelit, status live database, dan metrik lintas sekolah secara terpusat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddSatelliteSchoolModal}
              className="neu-btn neu-btn-primary btn-click font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition"
            >
              <i className="fa-solid fa-plus-circle"></i> Tambah Sekolah Satelit
            </button>
            <button
              type="button"
              onClick={() => checkSatelliteHealthAndMetrics(satelliteSchools)}
              disabled={isPingingAll}
              className="neu-btn btn-click text-[#0F172A] dark:text-[#F1F5F9] font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition"
            >
              <i className={`fa-solid fa-wave-pulse ${isPingingAll ? 'animate-spin text-[#0F766E]' : 'text-[#0F766E] dark:text-teal-400'}`}></i>
              <span>{isPingingAll ? 'Memeriksa...' : 'Periksa Status Live'}</span>
            </button>
            <button
              type="button"
              onClick={fetchAllData}
              disabled={loading}
              className="neu-btn btn-click text-[#334155] dark:text-[#CBD5E1] px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-center transition"
              title="Refresh Data"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Target School Monitoring & Scope Switcher Bar */}
      <div className="neu-card-sm rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
            activeTargetSchool
              ? 'neu-card-primary text-white'
              : 'neu-inset text-[#0F766E] dark:text-teal-400'
          }`}>
            <i className={`fa-solid ${activeTargetSchool ? 'fa-satellite-dish animate-pulse' : 'fa-network-wired'}`}></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                Sekolah yang Dipantau:
              </span>
              {activeTargetSchool ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
                  Instance Satelit Aktif
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neu-inset text-[#475569] dark:text-[#CBD5E1]">
                  Database Pusat (Master)
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
              {activeTargetSchool ? activeTargetSchool.nama : 'Pusat Multi-Sekolah (Seluruh Database)'}
            </div>
            {activeTargetSchool?.npsn && (
              <div className="text-[11px] text-[#475569] dark:text-[#94A3B8] font-mono">
                NPSN: {activeTargetSchool.npsn} {activeTargetSchool.kota_kabupaten ? `• ${activeTargetSchool.kota_kabupaten}` : ''}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <select
              aria-label="Ganti Sekolah yang Dipantau"
              value={activeTargetSchool?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  handleSelectTargetSchool(null);
                } else {
                  const sch = satelliteSchools.find(s => s.id === val);
                  if (sch) handleSelectTargetSchool(sch);
                }
              }}
              className="neu-input w-full text-xs font-semibold py-2.5 px-3 rounded-xl text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer"
            >
              <option value="">🌐 Database Pusat (Master)</option>
              {satelliteSchools.map(sch => (
                <option key={sch.id} value={sch.id}>
                  🏫 {sch.nama} {sch.npsn ? `(${sch.npsn})` : ''}
                </option>
              ))}
            </select>
          </div>
          {activeTargetSchool && (
            <button
              type="button"
              onClick={() => handleSelectTargetSchool(null)}
              className="neu-btn btn-click px-3 py-2.5 rounded-xl text-[#334155] dark:text-[#CBD5E1] text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              title="Kembali ke Database Master"
            >
              <i className="fa-solid fa-rotate-left"></i>
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar: 3 tabs */}
      <div className="flex neu-inset rounded-2xl p-1.5 gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => switchTab('overview')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'neu-btn neu-btn-primary text-white'
              : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
          }`}
        >
          <i className="fa-solid fa-gauge-high"></i>
          <span>Ringkasan Platform</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('jaringan')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeTab === 'jaringan'
              ? 'neu-btn neu-btn-primary text-white'
              : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
          }`}
        >
          <i className="fa-solid fa-network-wired"></i>
          <span>Jaringan Sekolah ({satelliteSchools.length})</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('dinas')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeTab === 'dinas'
              ? 'neu-btn neu-btn-primary text-white'
              : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
          }`}
        >
          <i className="fa-solid fa-building-columns"></i>
          <span>Akun Dinas Pendidikan ({dinasUsers.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW (RINGKASAN PLATFORM JARINGAN SATELIT) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sekolah Satelit */}
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">
                  Total Satelit
                </span>
                <div className="w-8 h-8 rounded-xl neu-inset text-[#0F766E] dark:text-teal-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-network-wired"></i>
                </div>
              </div>
              <div className="text-2xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">
                {satelliteSchools.length}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px] font-num">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  {stats.sekolahAktif} Aktif
                </span>
                <span className="text-[#475569] dark:text-[#94A3B8]">•</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  {stats.sekolahNonaktif} Nonaktif
                </span>
              </div>
            </div>

            {/* Status Live Database */}
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">
                  Database Online
                </span>
                <div className="w-8 h-8 rounded-xl neu-inset text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-database"></i>
                </div>
              </div>
              <div className="text-2xl font-black font-num text-[#0F766E] dark:text-teal-400">
                {onlineDbCount}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] font-num text-[#475569] dark:text-[#94A3B8]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{pausedDbCount} Ter-pause / checking</span>
              </div>
            </div>

            {/* Total Guru Lintas Jaringan */}
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">
                  Total Guru
                </span>
                <div className="w-8 h-8 rounded-xl neu-inset text-sky-700 dark:text-sky-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-chalkboard-user"></i>
                </div>
              </div>
              <div className="text-2xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">
                {totalGuruNetwork}
              </div>
              <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-2">
                Tenaga pendidik lintas satelit
              </p>
            </div>

            {/* Total Siswa Lintas Jaringan */}
            <div className="glass-card p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider">
                  Total Siswa
                </span>
                <div className="w-8 h-8 rounded-xl neu-inset text-amber-700 dark:text-amber-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-user-graduate"></i>
                </div>
              </div>
              <div className="text-2xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">
                {totalSiswaNetwork}
              </div>
              <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-2">
                Siswa di seluruh jaringan satelit
              </p>
            </div>
          </div>

          {/* Quick Actions & Recent Satellite Schools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions Panel */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                <i className="fa-solid fa-bolt text-amber-500"></i> Aksi Cepat Jaringan
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                Kelola infrastruktur satelit, validasi status koneksi live database, atau beralih target pemantauan.
              </p>
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleOpenAddSatelliteSchoolModal}
                  className="w-full text-left p-3 rounded-xl neu-card-sm hover:ring-2 hover:ring-[#0F766E]/40 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl neu-inset text-[#0F766E] dark:text-teal-300 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-plus-circle"></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Tambah Sekolah Satelit
                    </div>
                    <div className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                      Daftarkan sekolah dan kredensial Supabase ke jaringan
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => checkSatelliteHealthAndMetrics(satelliteSchools)}
                  disabled={isPingingAll}
                  className="w-full text-left p-3 rounded-xl neu-card-sm hover:ring-2 hover:ring-sky-500/40 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl neu-inset text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <i className={`fa-solid fa-wave-pulse ${isPingingAll ? 'animate-spin' : ''}`}></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Periksa Status Live Database
                    </div>
                    <div className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                      Ping ketersediaan real-time seluruh database satelit
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('jaringan')}
                  className="w-full text-left p-3 rounded-xl neu-card-sm hover:ring-2 hover:ring-slate-400/40 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl neu-inset text-[#334155] dark:text-[#CBD5E1] flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-network-wired"></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Kelola Jaringan Sekolah
                    </div>
                    <div className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                      Beralih target aktif, buka Vercel, dan manajemen sekolah
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Satellite Schools Summary List */}
            <div className="glass-card p-5 rounded-2xl lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                  <i className="fa-solid fa-building-columns text-[#0F766E] dark:text-teal-400"></i> Jaringan Sekolah Satelit Terbaru
                </h3>
                <button
                  type="button"
                  onClick={() => switchTab('jaringan')}
                  className="text-xs text-[#0F766E] dark:text-teal-400 font-bold hover:underline"
                >
                  Lihat Semua ({satelliteSchools.length}) <i className="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>

              {satelliteSchools.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#475569] dark:text-[#94A3B8] italic">
                  Belum ada sekolah satelit yang terdaftar di jaringan platform.
                </div>
              ) : (
                <div className="divide-y divide-slate-300/50 dark:divide-slate-700/50">
                  {satelliteSchools.slice(0, 5).map(sch => {
                    const status = healthMap[sch.id] || (sch.status === 'nonaktif' ? 'paused' : 'online');
                    const metrics = metricsMap[sch.id] || { guruCount: 0, siswaCount: 0 };
                    const isCurrentlyActive = activeTargetSchool?.id === sch.id;

                    return (
                      <div key={sch.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrentlyActive
                              ? 'neu-card-primary text-white'
                              : 'neu-inset text-[#0F766E] dark:text-teal-300'
                          }`}>
                            <i className="fa-solid fa-school text-xs"></i>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                              {sch.nama}
                            </div>
                            <div className="text-[11px] text-[#475569] dark:text-[#94A3B8] flex items-center gap-2">
                              <span>NPSN: {sch.npsn || '-'}</span>
                              <span>•</span>
                              <span>{sch.kota_kabupaten || 'Sulawesi Utara'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-sky-500/15 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded-full font-bold font-num">
                            {metrics.guruCount} Guru
                          </span>
                          <span className="text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold font-num">
                            {metrics.siswaCount} Siswa
                          </span>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              status === 'online'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                                : status === 'checking'
                                ? 'neu-inset text-[#475569] dark:text-[#94A3B8]'
                                : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                            {status === 'online' ? 'Online' : status === 'checking' ? 'Ping' : 'Ter-pause'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JARINGAN SEKOLAH SATELIT (PORTAL INDUK MULTI-SEKOLAH) */}
      {activeTab === 'jaringan' && (
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full neu-inset text-[#0F766E] dark:text-teal-300 text-[10px] font-bold mb-1.5">
                <i className="fa-solid fa-satellite-dish"></i> Single Sign-On Multi-Tenant Architecture
              </div>
              <h2 className="text-lg sm:text-xl font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                <i className="fa-solid fa-network-wired text-[#0F766E] dark:text-teal-400"></i> Portal Induk Jaringan Sekolah
              </h2>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5 max-w-2xl">
                Pantau seluruh sekolah satelit dalam 1 portal master. Beralih target pemantauan Supabase secara dinamis tanpa login ulang, periksa status koneksi live database, dan buka web sekolah dengan 1 klik.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => checkSatelliteHealthAndMetrics(satelliteSchools)}
                disabled={isPingingAll}
                className="neu-btn btn-click px-3.5 py-2.5 rounded-xl text-[#0F172A] dark:text-[#F1F5F9] text-xs font-bold transition flex items-center gap-2"
                title="Ping Ketersediaan Seluruh Database Satelit"
              >
                <i className={`fa-solid fa-wave-pulse ${isPingingAll ? 'animate-spin text-[#0F766E]' : 'text-[#0F766E] dark:text-teal-400'}`}></i>
                <span>{isPingingAll ? 'Memeriksa Database...' : 'Periksa Status Live'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddSatelliteSchoolModal}
                className="neu-btn neu-btn-primary btn-click px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                <i className="fa-solid fa-plus-circle"></i>
                <span>Tambah Sekolah Satelit</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                Total Satelit
              </span>
              <div className="text-2xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">
                {satelliteSchools.length}
              </div>
              <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] mt-1 block">Sekolah terdaftar di jaringan</span>
            </div>

            <div className="glass-card p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                Database Online
              </span>
              <div className="text-2xl font-black font-num text-[#0F766E] dark:text-teal-400">
                {onlineDbCount}
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Siap melayani request
              </span>
            </div>

            <div className="glass-card p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                Database Ter-pause
              </span>
              <div className="text-2xl font-black font-num text-[#D97706] dark:text-amber-400">
                {pausedDbCount}
              </div>
              <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] mt-1 block">Perlu resume / periksa kuota</span>
            </div>

            <div className="glass-card p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase tracking-wider block mb-1">
                Total Guru & Siswa
              </span>
              <div className="text-2xl font-black font-num text-sky-700 dark:text-sky-400">
                {totalGuruNetwork + totalSiswaNetwork}
              </div>
              <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] mt-1 block">Pengguna di seluruh satelit</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-[#475569] dark:text-[#94A3B8]"></i>
              <input
                type="text"
                value={satelliteSearch}
                onChange={e => setSatelliteSearch(e.target.value)}
                placeholder="Cari sekolah satelit, NPSN, kota..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={satelliteStatusFilter}
                onChange={e => setSatelliteStatusFilter(e.target.value as any)}
                className="w-full sm:w-44 px-3 py-2 text-xs rounded-xl input-premium text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer"
              >
                <option value="all">Semua Status Live</option>
                <option value="online">Hanya Database Online</option>
                <option value="paused">Hanya Ter-pause</option>
              </select>
            </div>
          </div>

          {/* Satellite Schools Cards Grid */}
          {filteredSatellite.length === 0 ? (
            <div className="glass-card p-10 rounded-2xl text-center">
              <div className="w-14 h-14 neu-inset rounded-full flex items-center justify-center mx-auto mb-3 text-[#475569] dark:text-[#94A3B8] text-xl">
                <i className="fa-solid fa-satellite-dish"></i>
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                Tidak Ada Sekolah Satelit Ditemukan
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] max-w-sm mx-auto mb-4">
                Belum ada sekolah yang cocok dengan pencarian, atau belum ada sekolah yang didaftarkan ke jaringan monitoring.
              </p>
              <button
                type="button"
                onClick={handleOpenAddSatelliteSchoolModal}
                className="neu-btn neu-btn-primary btn-click px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
              >
                <i className="fa-solid fa-plus-circle"></i> Tambah Sekolah Satelit Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSatellite.map(sch => {
                const isCurrentlyActive = activeTargetSchool?.id === sch.id;
                const status = healthMap[sch.id] || (sch.status === 'nonaktif' ? 'paused' : 'online');
                const metrics = metricsMap[sch.id] || {
                  guruCount: sch.id === user?.sekolah_id ? stats.totalGuru : 0,
                  siswaCount: sch.id === user?.sekolah_id ? stats.totalSiswa : 0
                };

                return (
                  <div
                    key={sch.id}
                    className={`glass-card rounded-2xl p-5 flex flex-col justify-between transition-all ${
                      isCurrentlyActive
                        ? 'ring-2 ring-[#0F766E] dark:ring-teal-400'
                        : ''
                    }`}
                  >
                    <div>
                      {/* Top Header & Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                            isCurrentlyActive
                              ? 'bg-[#0F766E] text-white'
                              : 'neu-inset text-[#0F766E] dark:text-teal-300'
                          }`}>
                            <i className="fa-solid fa-school text-xs"></i>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate" title={sch.nama}>
                              {sch.nama}
                            </h3>
                            <div className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-mono flex items-center gap-1.5">
                              <span>NPSN: {sch.npsn || '-'}</span>
                              <span>•</span>
                              <span>{sch.kota_kabupaten || 'Sulut'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Live Database Status Indicator */}
                        <div className="shrink-0">
                          {status === 'checking' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold neu-inset text-[#475569] dark:text-[#94A3B8] flex items-center gap-1">
                              <i className="fa-solid fa-spinner animate-spin text-[8px]"></i> Ping
                            </span>
                          ) : status === 'online' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5" title="Database online dan merespons query">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 flex items-center gap-1.5" title="Database ter-pause atau tidak terjangkau">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ter-pause
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Real-time Metrics Pill Grid */}
                      <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl neu-inset text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg neu-card-sm text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-chalkboard-user"></i>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#475569] dark:text-[#94A3B8]">Guru Aktif</div>
                            <div className="font-black font-num text-[#0F172A] dark:text-[#F1F5F9] leading-tight">
                              {metrics.guruCount}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg neu-card-sm text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-user-graduate"></i>
                          </div>
                          <div>
                            <div className="text-[10px] text-[#475569] dark:text-[#94A3B8]">Siswa</div>
                            <div className="font-black font-num text-[#0F172A] dark:text-[#F1F5F9] leading-tight">
                              {metrics.siswaCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Meta (Vercel & Supabase URLs) */}
                      <div className="space-y-1 mb-4 text-[10px]">
                        <div className="flex items-center justify-between text-[#475569] dark:text-[#94A3B8]">
                          <span className="flex items-center gap-1">
                            <i className="fa-brands fa-react text-sky-600 dark:text-sky-400"></i> Web Vercel:
                          </span>
                          {sch.vercel_url ? (
                            <a
                              href={sch.vercel_url.startsWith('http://') || sch.vercel_url.startsWith('https://') ? sch.vercel_url : `https://${sch.vercel_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[#0F766E] dark:text-teal-400 hover:underline truncate max-w-[150px]"
                              title={sch.vercel_url}
                            >
                              {sch.vercel_url.replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            <span className="italic text-[#475569] dark:text-[#94A3B8]">Belum diatur</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[#475569] dark:text-[#94A3B8]">
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-database text-[#0F766E] dark:text-teal-400"></i> Supabase:
                          </span>
                          {sch.supabase_url ? (
                            <span className="font-mono text-[#334155] dark:text-[#CBD5E1] truncate max-w-[150px]" title={sch.supabase_url}>
                              {sch.supabase_url.replace(/^https?:\/\//, '').split('.')[0]}.supabase.co
                            </span>
                          ) : (
                            <span className="text-[#475569] dark:text-[#94A3B8] font-medium">Database Utama (Pusat)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="pt-3 border-t border-slate-300/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        {isCurrentlyActive ? (
                          <button
                            type="button"
                            onClick={() => handleSelectTargetSchool(null)}
                            className="neu-btn neu-btn-primary btn-click flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                            title="Klik untuk kembali ke Master Platform"
                          >
                            <i className="fa-solid fa-circle-check"></i>
                            <span>Sedang Dipantau</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectTargetSchool(sch)}
                            className="neu-btn neu-btn-primary btn-click flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                            title="Alihkan pemantauan aktif ke database sekolah ini"
                          >
                            <i className="fa-solid fa-satellite-dish"></i>
                            <span>Kelola Sekolah Ini</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenVercelUrl(sch)}
                          className="neu-btn btn-click py-2 px-3 rounded-xl text-[#334155] dark:text-[#CBD5E1] font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          title="Buka Website Vercel Sekolah di Tab Baru"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                          <span className="hidden sm:inline">Buka Web Vercel</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSatelliteSchool(sch)}
                          className="neu-btn btn-click w-8 h-8 rounded-lg text-sky-700 dark:text-sky-400 flex items-center justify-center"
                          title="Edit Parameter Sekolah Satelit"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSatelliteSchool(sch)}
                          className="neu-btn btn-click w-8 h-8 rounded-lg text-rose-600 dark:text-rose-400 flex items-center justify-center"
                          title="Hapus dari Jaringan Monitoring"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AKUN DINAS PENDIDIKAN & PENUGASAN WILAYAH */}
      {activeTab === 'dinas' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="glass-card p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl neu-inset text-sky-700 dark:text-sky-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                <h2 className="text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  Akun Dinas Pendidikan & Penugasan Daerah Binaan
                </h2>
              </div>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1 max-w-2xl">
                Superadmin berwenang menetapkan kota/kabupaten tugas pada setiap akun Dinas Pendidikan. Akun dinas beroperasi secara strictly read-only dan hanya dapat memantau sekolah di wilayah binaannya.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleOpenAddDinasUserModal}
                className="neu-btn neu-btn-primary btn-click flex-1 sm:flex-initial font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition"
              >
                <i className="fa-solid fa-plus-circle"></i>
                <span>Tambah Akun Dinas</span>
              </button>
              <button
                type="button"
                onClick={fetchDinasUsers}
                disabled={loadingDinas}
                className="neu-btn btn-click text-[#334155] dark:text-[#CBD5E1] px-3.5 py-2.5 rounded-2xl text-xs flex items-center justify-center transition"
                title="Muat Ulang Akun Dinas"
              >
                <i className={`fa-solid fa-rotate-right ${loadingDinas ? 'animate-spin' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* Search & Statistics Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#475569] dark:text-[#94A3B8] text-xs"></i>
              <input
                type="text"
                placeholder="Cari dinas, username, kota/kabupaten..."
                value={dinasSearch}
                onChange={(e) => setDinasSearch(e.target.value)}
                className="neu-input w-full pl-9 pr-8 py-2 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9]"
              />
              {dinasSearch && (
                <button
                  type="button"
                  onClick={() => setDinasSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] text-xs"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#475569] dark:text-[#94A3B8] self-end sm:self-center">
              <span className="font-semibold">
                Total Akun Dinas: <b className="font-num text-[#0F172A] dark:text-[#F1F5F9]">{dinasUsers.length}</b>
              </span>
              <span>•</span>
              <span className="font-semibold">
                Terfilter: <b className="font-num text-[#0F172A] dark:text-[#F1F5F9]">{filteredDinasUsers.length}</b>
              </span>
            </div>
          </div>

          {/* Table / List of Dinas Accounts */}
          {filteredDinasUsers.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full neu-inset text-sky-700 dark:text-sky-400 flex items-center justify-center text-2xl">
                <i className="fa-solid fa-building-columns"></i>
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                {dinasSearch ? 'Tidak ada akun dinas yang cocok' : 'Belum Ada Akun Dinas Pendidikan'}
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] max-w-md mx-auto">
                {dinasSearch
                  ? `Tidak ditemukan akun dinas dengan kata kunci "${dinasSearch}". Periksa kembali ejaan pencarian.`
                  : 'Daftarkan akun pengawas atau perwakilan Dinas Pendidikan untuk mulai memantau kehadiran sekolah di wilayah binaan.'}
              </p>
              {!dinasSearch && (
                <button
                  type="button"
                  onClick={handleOpenAddDinasUserModal}
                  className="neu-btn neu-btn-primary btn-click inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs mt-2"
                >
                  <i className="fa-solid fa-plus-circle"></i> Tambah Akun Dinas Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="neu-inset border-b border-slate-300/60 dark:border-slate-700/60 text-[#475569] dark:text-[#CBD5E1] font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Petugas / Instansi Dinas</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4">Daerah Binaan (Wilayah)</th>
                      <th className="py-3.5 px-4">Sekolah di Wilayah</th>
                      <th className="py-3.5 px-4">Hak Akses</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300/50 dark:divide-slate-700/50 text-[#334155] dark:text-[#CBD5E1]">
                    {filteredDinasUsers.map((dinasUser) => {
                      const userRegion = (dinasUser.kota_kabupaten || '').trim().toLowerCase();
                      const matchingSchoolsCount = userRegion
                        ? satelliteSchools.filter(
                            s => (s.kota_kabupaten || '').trim().toLowerCase() === userRegion
                          ).length
                        : 0;

                      return (
                        <tr
                          key={dinasUser.id}
                          className="hover:bg-white/25 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg neu-inset text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-xs shrink-0">
                                <i className="fa-solid fa-building-user"></i>
                              </div>
                              <div>
                                <div className="font-bold text-xs">{dinasUser.nama}</div>
                                <div className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-normal">
                                  ID: {dinasUser.id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-[#475569] dark:text-[#94A3B8]">
                            @{dinasUser.username}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-800 dark:text-sky-300">
                              <i className="fa-solid fa-location-dot text-[10px]"></i>
                              <span>{dinasUser.kota_kabupaten || 'Belum Ditugaskan'}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-num text-[#0F766E] dark:text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-md">
                              <i className="fa-solid fa-school text-[10px]"></i>
                              <span>{matchingSchoolsCount} Sekolah</span>
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full neu-inset text-[#475569] dark:text-[#CBD5E1]">
                              <i className="fa-solid fa-shield-halved text-[9px] text-[#0F766E] dark:text-teal-400"></i>
                              <span>Read-Only</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditDinasUser(dinasUser)}
                                className="neu-btn btn-click w-8 h-8 rounded-lg text-sky-700 dark:text-sky-400 flex items-center justify-center transition"
                                title="Edit Wilayah / Akun"
                              >
                                <i className="fa-solid fa-pen text-xs"></i>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDinasUser(dinasUser)}
                                className="neu-btn btn-click w-8 h-8 rounded-lg text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
                                title="Hapus Akun Dinas"
                              >
                                <i className="fa-solid fa-trash text-xs"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
