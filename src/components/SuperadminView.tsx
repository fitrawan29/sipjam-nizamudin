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
  type SatelliteSchool
} from '@/lib/supabaseClient';

// Platform administrative mutations are pinned to central masterSupabase
// masterSupabase.from('users').insert
// masterSupabase.from('users').update
// masterSupabase.from('users').delete

interface SuperadminViewProps {
  user: any;
  initialTab?: 'overview' | 'jaringan';
  onNavigateTab?: (tab: 'overview' | 'jaringan') => void;
}

export default function SuperadminView({
  user,
  initialTab = 'overview',
  onNavigateTab
}: SuperadminViewProps) {
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jaringan'>(
    initialTab === 'jaringan' ? 'jaringan' : 'overview'
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
          confirmButtonColor: '#0B4619'
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
    const resolvedTab = initialTab === 'jaringan' ? 'jaringan' : 'overview';
    if (resolvedTab !== activeTab) {
      setActiveTab(resolvedTab);
    }
  }, [initialTab, activeTab]);

  // Sync active target school across tabs and custom events
  useEffect(() => {
    const unsubscribe = onActiveTargetSchoolChange((sch) => {
      setActiveTargetSchoolState(sch);
    });
    return unsubscribe;
  }, []);

  const switchTab = (tab: 'overview' | 'jaringan') => {
    setActiveTab(tab);
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  // ----------------------------------------------------------------------------
  // Data Fetching
  // ----------------------------------------------------------------------------
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Satellite School Registry from central master
      let loadedSatellites: SatelliteSchool[] = [];
      try {
        const { data: regData, error: regErr } = await masterSupabase
          .from('sekolah_registry')
          .select('*')
          .order('nama', { ascending: true });

        if (!regErr && regData && regData.length > 0) {
          loadedSatellites = regData as SatelliteSchool[];
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
      confirmButtonColor: '#0B4619',
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
          throw new Error(regErr.message);
        }

        try {
          await masterSupabase.from('sekolah').insert([{
            ...(insertedReg?.id ? { id: insertedReg.id } : {}),
            ...formValues,
            mode_presensi_siswa: 'qr'
          }]);
        } catch (_) {}

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sipjam_satellite_schools_updated'));
        }

        Swal.fire({
          icon: 'success',
          title: 'Sekolah Terdaftar di Jaringan!',
          text: `Sekolah "${formValues.nama}" berhasil didaftarkan ke jaringan pemantauan satelit SIPJAM.`,
          confirmButtonColor: '#0B4619'
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
      confirmButtonColor: '#0B4619',
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
        if (regErr) throw new Error(regErr.message);

        try {
          const { error: schErr } = await masterSupabase.from('sekolah').update(formValues).eq('id', school.id);
          if (schErr && school.npsn) {
            await masterSupabase.from('sekolah').update(formValues).eq('npsn', school.npsn);
          }
        } catch (_) {}

        if (activeTargetSchool?.id === school.id) {
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
      if (regErr) throw new Error(regErr.message);

      try {
        const { error: schErr } = await masterSupabase.from('sekolah').delete().eq('id', school.id);
        if (schErr && school.npsn) {
          await masterSupabase.from('sekolah').delete().eq('npsn', school.npsn);
        }
      } catch (_) {}

      if (activeTargetSchool?.id === school.id) {
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
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-green-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-md mb-2">
              <i className="fa-solid fa-crown text-yellow-400"></i> Platform Operator
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Superadmin Portal
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
              Pusat kendali multi-tenant SIPJAM. Pantau jaringan sekolah satelit, status live database, dan metrik lintas sekolah secara terpusat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddSatelliteSchoolModal}
              className="btn-click bg-white text-emerald-900 font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg hover:bg-emerald-50 transition"
            >
              <i className="fa-solid fa-plus-circle text-emerald-700"></i> Tambah Sekolah Satelit
            </button>
            <button
              type="button"
              onClick={() => checkSatelliteHealthAndMetrics(satelliteSchools)}
              disabled={isPingingAll}
              className="btn-click bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-md border border-white/20 transition"
            >
              <i className={`fa-solid fa-wave-pulse ${isPingingAll ? 'animate-spin' : 'text-emerald-300'}`}></i>
              <span>{isPingingAll ? 'Memeriksa...' : 'Periksa Status Live'}</span>
            </button>
            <button
              type="button"
              onClick={fetchAllData}
              disabled={loading}
              className="btn-click bg-black/30 hover:bg-black/40 text-white px-3 py-2.5 rounded-2xl text-xs flex items-center justify-center transition"
              title="Refresh Data"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>
      </div>

      {/* Target School Monitoring & Scope Switcher Bar */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-emerald-100 dark:border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
            activeTargetSchool
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-emerald-700 dark:text-emerald-400'
          }`}>
            <i className={`fa-solid ${activeTargetSchool ? 'fa-satellite-dish animate-pulse' : 'fa-network-wired'}`}></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Sekolah yang Dipantau:
              </span>
              {activeTargetSchool ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  Instance Satelit Aktif
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  Database Pusat (Master)
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {activeTargetSchool ? activeTargetSchool.nama : 'Pusat Multi-Sekolah (Seluruh Database)'}
            </div>
            {activeTargetSchool?.npsn && (
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
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
              className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
              className="btn-click px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              title="Kembali ke Database Master"
            >
              <i className="fa-solid fa-rotate-left"></i>
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation Bar: Simplified to 2 tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl p-1.5 shadow-sm overflow-x-auto">
        <button
          type="button"
          onClick={() => switchTab('overview')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-nizamudin-green text-white dark:text-nizamudin-gold shadow-md'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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
              ? 'bg-nizamudin-green text-white dark:text-nizamudin-gold shadow-md'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-network-wired"></i>
          <span>Jaringan Sekolah ({satelliteSchools.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW (RINGKASAN PLATFORM JARINGAN SATELIT) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sekolah Satelit */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-emerald-600 dark:border-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Satelit
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-network-wired"></i>
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {satelliteSchools.length}
              </div>
              <div className="flex items-center gap-2 mt-2 text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {stats.sekolahAktif} Aktif
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {stats.sekolahNonaktif} Nonaktif
                </span>
              </div>
            </div>

            {/* Status Live Database */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-green-500 dark:border-green-400">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Database Online
                </span>
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-database"></i>
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {onlineDbCount}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{pausedDbCount} Ter-pause / checking</span>
              </div>
            </div>

            {/* Total Guru Lintas Jaringan */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-purple-600 dark:border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Guru
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-chalkboard-user"></i>
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {totalGuruNetwork}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Tenaga pendidik lintas satelit
              </p>
            </div>

            {/* Total Siswa Lintas Jaringan */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-amber-600 dark:border-amber-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Siswa
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-user-graduate"></i>
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {totalSiswaNetwork}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Siswa di seluruh jaringan satelit
              </p>
            </div>
          </div>

          {/* Quick Actions & Recent Satellite Schools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions Panel */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-bolt text-amber-500"></i> Aksi Cepat Jaringan
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Kelola infrastruktur satelit, validasi status koneksi live database, atau beralih target pemantauan.
              </p>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenAddSatelliteSchoolModal}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-gray-50 dark:bg-gray-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-plus-circle"></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Tambah Sekolah Satelit
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Daftarkan sekolah dan kredensial Supabase ke jaringan
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => checkSatelliteHealthAndMetrics(satelliteSchools)}
                  disabled={isPingingAll}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <i className={`fa-solid fa-wave-pulse ${isPingingAll ? 'animate-spin' : ''}`}></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Periksa Status Live Database
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Ping ketersediaan real-time seluruh database satelit
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('jaringan')}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800/60 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-network-wired"></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Kelola Jaringan Sekolah
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Beralih target aktif, buka Vercel, dan manajemen sekolah
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Satellite Schools Summary List */}
            <div className="glass-card p-5 rounded-2xl lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-building-columns text-emerald-600"></i> Jaringan Sekolah Satelit Terbaru
                </h3>
                <button
                  type="button"
                  onClick={() => switchTab('jaringan')}
                  className="text-xs text-nizamudin-green dark:text-nizamudin-gold font-bold hover:underline"
                >
                  Lihat Semua ({satelliteSchools.length}) <i className="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>

              {satelliteSchools.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 italic">
                  Belum ada sekolah satelit yang terdaftar di jaringan platform.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {satelliteSchools.slice(0, 5).map(sch => {
                    const status = healthMap[sch.id] || (sch.status === 'nonaktif' ? 'paused' : 'online');
                    const metrics = metricsMap[sch.id] || { guruCount: 0, siswaCount: 0 };
                    const isCurrentlyActive = activeTargetSchool?.id === sch.id;

                    return (
                      <div key={sch.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isCurrentlyActive
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}>
                            <i className="fa-solid fa-school text-xs"></i>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {sch.nama}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>NPSN: {sch.npsn || '-'}</span>
                              <span>•</span>
                              <span>{sch.kota_kabupaten || 'Sulawesi Utara'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                            {metrics.guruCount} Guru
                          </span>
                          <span className="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                            {metrics.siswaCount} Siswa
                          </span>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                              status === 'online'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                : status === 'checking'
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700'
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
          <div className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-emerald-100 dark:border-gray-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold mb-1.5 border border-emerald-300 dark:border-emerald-800">
                <i className="fa-solid fa-satellite-dish"></i> Single Sign-On Multi-Tenant Architecture
              </div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-network-wired text-emerald-600"></i> Portal Induk Jaringan Sekolah
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
                Pantau seluruh sekolah satelit dalam 1 portal master. Beralih target pemantauan Supabase secara dinamis tanpa login ulang, periksa status koneksi live database, dan buka web sekolah dengan 1 klik.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => checkSatelliteHealthAndMetrics(satelliteSchools)}
                disabled={isPingingAll}
                className="btn-click px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition flex items-center gap-2 shadow-xs"
                title="Ping Ketersediaan Seluruh Database Satelit"
              >
                <i className={`fa-solid fa-wave-pulse ${isPingingAll ? 'animate-spin text-emerald-500' : 'text-emerald-600'}`}></i>
                <span>{isPingingAll ? 'Memeriksa Database...' : 'Periksa Status Live'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddSatelliteSchoolModal}
                className="btn-click px-4 py-2.5 rounded-xl bg-nizamudin-green hover:bg-emerald-800 text-white dark:text-nizamudin-gold text-xs font-bold transition flex items-center gap-2 shadow-md"
              >
                <i className="fa-solid fa-plus-circle"></i>
                <span>Tambah Sekolah Satelit</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="glass-card p-4 rounded-2xl border-l-4 border-emerald-600">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Total Satelit
              </span>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {satelliteSchools.length}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Sekolah terdaftar di jaringan</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border-l-4 border-green-500">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Database Online
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {onlineDbCount}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Siap melayani request
              </span>
            </div>

            <div className="glass-card p-4 rounded-2xl border-l-4 border-amber-500">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Database Ter-pause
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {pausedDbCount}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Perlu resume / periksa kuota</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border-l-4 border-blue-500">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Total Guru & Siswa
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {totalGuruNetwork + totalSiswaNetwork}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Pengguna di seluruh satelit</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between border border-gray-100 dark:border-gray-800">
            <div className="relative w-full sm:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-gray-400"></i>
              <input
                type="text"
                value={satelliteSearch}
                onChange={e => setSatelliteSearch(e.target.value)}
                placeholder="Cari sekolah satelit, NPSN, kota..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={satelliteStatusFilter}
                onChange={e => setSatelliteStatusFilter(e.target.value as any)}
                className="w-full sm:w-44 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="all">Semua Status Live</option>
                <option value="online">Hanya Database Online</option>
                <option value="paused">Hanya Ter-pause</option>
              </select>
            </div>
          </div>

          {/* Satellite Schools Cards Grid */}
          {filteredSatellite.length === 0 ? (
            <div className="glass-card p-10 rounded-2xl text-center border border-gray-200 dark:border-gray-800">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400 text-xl">
                <i className="fa-solid fa-satellite-dish"></i>
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                Tidak Ada Sekolah Satelit Ditemukan
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
                Belum ada sekolah yang cocok dengan pencarian, atau belum ada sekolah yang didaftarkan ke jaringan monitoring.
              </p>
              <button
                type="button"
                onClick={handleOpenAddSatelliteSchoolModal}
                className="btn-click px-4 py-2 rounded-xl bg-nizamudin-green text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
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
                    className={`glass-card rounded-2xl p-5 flex flex-col justify-between transition-all border ${
                      isCurrentlyActive
                        ? 'border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-800'
                    }`}
                  >
                    <div>
                      {/* Top Header & Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                            isCurrentlyActive
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          }`}>
                            <i className="fa-solid fa-school text-xs"></i>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate" title={sch.nama}>
                              {sch.nama}
                            </h3>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5">
                              <span>NPSN: {sch.npsn || '-'}</span>
                              <span>•</span>
                              <span>{sch.kota_kabupaten || 'Sulut'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Live Database Status Indicator */}
                        <div className="shrink-0">
                          {status === 'checking' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 flex items-center gap-1">
                              <i className="fa-solid fa-spinner animate-spin text-[8px]"></i> Ping
                            </span>
                          ) : status === 'online' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5" title="Database online dan merespons query">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Online
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5" title="Database ter-pause atau tidak terjangkau">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ter-pause
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Real-time Metrics Pill Grid */}
                      <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-chalkboard-user"></i>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400">Guru Aktif</div>
                            <div className="font-black text-gray-900 dark:text-white leading-tight">
                              {metrics.guruCount}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-user-graduate"></i>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-400">Siswa</div>
                            <div className="font-black text-gray-900 dark:text-white leading-tight">
                              {metrics.siswaCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Meta (Vercel & Supabase URLs) */}
                      <div className="space-y-1 mb-4 text-[10px]">
                        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <i className="fa-brands fa-react text-blue-500"></i> Web Vercel:
                          </span>
                          {sch.vercel_url ? (
                            <a
                              href={sch.vercel_url.startsWith('http://') || sch.vercel_url.startsWith('https://') ? sch.vercel_url : `https://${sch.vercel_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline truncate max-w-[150px]"
                              title={sch.vercel_url}
                            >
                              {sch.vercel_url.replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            <span className="italic text-gray-400">Belum diatur</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-database text-emerald-500"></i> Supabase:
                          </span>
                          {sch.supabase_url ? (
                            <span className="font-mono text-gray-600 dark:text-gray-300 truncate max-w-[150px]" title={sch.supabase_url}>
                              {sch.supabase_url.replace(/^https?:\/\//, '').split('.')[0]}.supabase.co
                            </span>
                          ) : (
                            <span className="text-gray-500 font-medium">Database Utama (Pusat)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Action Buttons */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        {isCurrentlyActive ? (
                          <button
                            type="button"
                            onClick={() => handleSelectTargetSchool(null)}
                            className="btn-click flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                            title="Klik untuk kembali ke Master Platform"
                          >
                            <i className="fa-solid fa-circle-check"></i>
                            <span>Sedang Dipantau</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectTargetSchool(sch)}
                            className="btn-click flex-1 py-2 px-3 rounded-xl bg-nizamudin-green hover:bg-emerald-800 text-white dark:text-nizamudin-gold font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                            title="Alihkan pemantauan aktif ke database sekolah ini"
                          >
                            <i className="fa-solid fa-satellite-dish"></i>
                            <span>Kelola Sekolah Ini</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenVercelUrl(sch)}
                          className="btn-click py-2 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          title="Buka Website Vercel Sekolah di Tab Baru"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                          <span className="hidden sm:inline">Buka Web Vercel</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditSatelliteSchool(sch)}
                          className="btn-click w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                          title="Edit Parameter Sekolah Satelit"
                        >
                          <i className="fa-solid fa-pen text-xs"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSatelliteSchool(sch)}
                          className="btn-click w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 dark:bg-gray-800 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center"
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
    </div>
  );
}
