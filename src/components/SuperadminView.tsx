'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Swal from 'sweetalert2';
import type { Sekolah, User } from '@/types/database';
import {
  supabase,
  masterSupabase,
  getActiveTargetSchool,
  setActiveTargetSchool,
  onActiveTargetSchoolChange,
  getSatelliteSupabaseClient,
  normalizeSupabaseUrl,
  type SatelliteSchool
} from '@/lib/supabaseClient';

interface SuperadminViewProps {
  user: any;
  initialTab?: 'overview' | 'jaringan' | 'sekolah' | 'admins';
  onNavigateTab?: (tab: string) => void;
}

export default function SuperadminView({
  user,
  initialTab = 'overview',
  onNavigateTab
}: SuperadminViewProps) {
  const isMountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jaringan' | 'sekolah' | 'admins'>(initialTab);
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
    totalAdmin: 0,
    totalGuru: 0,
    totalSiswa: 0
  });

  // Schools state
  const [sekolahList, setSekolahList] = useState<Sekolah[]>([]);
  const [sekolahSearch, setSekolahSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktif' | 'nonaktif'>('all');

  // Admins state
  const [adminList, setAdminList] = useState<User[]>([]);
  const [adminSearch, setAdminSearch] = useState('');

  // Sync tab with props if changed externally
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync active target school across tabs and custom events
  useEffect(() => {
    const unsubscribe = onActiveTargetSchoolChange((sch) => {
      setActiveTargetSchoolState(sch);
    });
    return unsubscribe;
  }, []);

  const switchTab = (tab: 'overview' | 'jaringan' | 'sekolah' | 'admins') => {
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
      // 1. Fetch schools from central master
      const { data: schools, error: schoolErr } = await masterSupabase
        .from('sekolah')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolErr) {
        console.error('Error fetching sekolah:', schoolErr);
      } else if (schools) {
        setSekolahList(schools);
      }

      // 2. Fetch admin users (role = 'Admin') from central master
      const { data: admins, error: adminErr } = await masterSupabase
        .from('users')
        .select('*')
        .eq('role', 'Admin')
        .order('nama', { ascending: true });

      if (adminErr) {
        console.error('Error fetching admins:', adminErr);
      } else if (admins) {
        setAdminList(admins);
      }

      // 3. Fetch count of teachers & students across all schools (or targeted active school)
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

      const activeSchools = (schools || []).filter(s => s.status === 'aktif').length;
      const inactiveSchools = (schools || []).filter(s => s.status === 'nonaktif').length;

      setStats({
        totalSekolah: (schools || []).length,
        sekolahAktif: activeSchools,
        sekolahNonaktif: inactiveSchools,
        totalAdmin: (admins || []).length,
        totalGuru,
        totalSiswa
      });

      // 4. Fetch Satellite School Registry from central master
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

      if (loadedSatellites.length === 0 && schools && schools.length > 0) {
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

      setSatelliteSchools(loadedSatellites);
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

  // Dynamic list of unique cities for filtering
  const uniqueCities = Array.from(
    new Set(
      sekolahList
        .map(s => s.kota_kabupaten)
        .filter((city): city is string => Boolean(city && city.trim()))
    )
  ).sort();

  // Create school ID to Name lookup map
  const schoolNameMap = new Map<string, string>();
  sekolahList.forEach(s => {
    schoolNameMap.set(s.id, s.nama);
  });

  // Filtered Schools
  const filteredSekolah = sekolahList.filter(s => {
    const matchesSearch =
      !sekolahSearch ||
      s.nama.toLowerCase().includes(sekolahSearch.toLowerCase()) ||
      (s.npsn && s.npsn.toLowerCase().includes(sekolahSearch.toLowerCase())) ||
      (s.nama_kepala_sekolah && s.nama_kepala_sekolah.toLowerCase().includes(sekolahSearch.toLowerCase()));

    const matchesCity = !cityFilter || s.kota_kabupaten === cityFilter;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    return matchesSearch && matchesCity && matchesStatus;
  });

  // Filtered Admins
  const filteredAdmins = adminList.filter(adm => {
    const schoolName = adm.sekolah_id ? (schoolNameMap.get(adm.sekolah_id) || '') : '';
    const term = adminSearch.toLowerCase();

    return (
      !adminSearch ||
      (adm.username || '').toLowerCase().includes(term) ||
      (adm.nama || '').toLowerCase().includes(term) ||
      schoolName.toLowerCase().includes(term)
    );
  });

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

  // ----------------------------------------------------------------------------
  // School Management Handlers
  // ----------------------------------------------------------------------------
  const handleOpenAddSchoolModal = async () => {
    const { value: formValues } = await Swal.fire({
      title: '<span class="text-lg font-bold text-gray-900">Daftarkan Sekolah Baru</span>',
      html: `
        <div class="text-left space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Sekolah <span class="text-red-500">*</span></label>
            <input id="swal-sch-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: SMA Negeri 1 Manado">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">NPSN <span class="text-red-500">*</span></label>
            <input id="swal-sch-npsn" class="swal2-input !mt-0 !w-full text-xs" placeholder="Nomor Pokok Sekolah Nasional (8 digit)">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Alamat Sekolah</label>
            <input id="swal-sch-alamat" class="swal2-input !mt-0 !w-full text-xs" placeholder="Jl. Sam Ratulangi No. 12">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kota / Kabupaten <span class="text-red-500">*</span></label>
              <input id="swal-sch-kota" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Kota Manado">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Provinsi</label>
              <input id="swal-sch-provinsi" class="swal2-input !mt-0 !w-full text-xs" value="Sulawesi Utara" placeholder="Provinsi">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Kepala Sekolah</label>
              <input id="swal-sch-kepsek" class="swal2-input !mt-0 !w-full text-xs" placeholder="Nama lengkap & gelar">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">NIP Kepala Sekolah</label>
              <input id="swal-sch-nip" class="swal2-input !mt-0 !w-full text-xs" placeholder="18 digit NIP / -">
            </div>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">URL Logo Sekolah (Opsional)</label>
            <input id="swal-sch-logo" class="swal2-input !mt-0 !w-full text-xs" placeholder="https://drive.google.com/... atau URL gambar">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Status Awal</label>
            <select id="swal-sch-status" class="swal2-select !mt-0 !w-full text-xs">
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Mode Jurnal Pembelajaran</label>
            <select id="swal-sch-mode-jurnal" class="swal2-select !mt-0 !w-full text-xs">
              <option value="camera_upload" selected>Live Camera + Upload Foto</option>
              <option value="camera_only">Live Camera Langsung</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-save mr-1"></i> Daftarkan Sekolah',
      confirmButtonColor: '#0B4619',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nama = (document.getElementById('swal-sch-nama') as HTMLInputElement)?.value?.trim();
        const npsn = (document.getElementById('swal-sch-npsn') as HTMLInputElement)?.value?.trim();
        const alamat = (document.getElementById('swal-sch-alamat') as HTMLInputElement)?.value?.trim() || null;
        const kota_kabupaten = (document.getElementById('swal-sch-kota') as HTMLInputElement)?.value?.trim();
        const provinsi = (document.getElementById('swal-sch-provinsi') as HTMLInputElement)?.value?.trim() || 'Sulawesi Utara';
        const nama_kepala_sekolah = (document.getElementById('swal-sch-kepsek') as HTMLInputElement)?.value?.trim() || null;
        const nip_kepala_sekolah = (document.getElementById('swal-sch-nip') as HTMLInputElement)?.value?.trim() || null;
        const logo_url = (document.getElementById('swal-sch-logo') as HTMLInputElement)?.value?.trim() || null;
        const status = (document.getElementById('swal-sch-status') as HTMLSelectElement)?.value || 'aktif';
        const mode_jurnal = (document.getElementById('swal-sch-mode-jurnal') as HTMLSelectElement)?.value || 'camera_upload';

        if (!nama || !npsn || !kota_kabupaten) {
          Swal.showValidationMessage('Nama Sekolah, NPSN, dan Kota/Kabupaten wajib diisi!');
          return null;
        }

        return {
          nama,
          npsn,
          alamat,
          kota_kabupaten,
          provinsi,
          nama_kepala_sekolah,
          nip_kepala_sekolah,
          logo_url,
          status,
          mode_jurnal,
          mode_presensi_siswa: 'qr'
        };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error } = await masterSupabase.from('sekolah').insert([formValues]);
        if (error) {
          Swal.fire('Gagal Mendaftarkan Sekolah', error.message, 'error');
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Sekolah Terdaftar!',
            text: `Sekolah "${formValues.nama}" berhasil didaftarkan ke platform SIPJAM.`,
            confirmButtonColor: '#0B4619'
          });
          fetchAllData();
        }
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditSchool = async (school: Sekolah) => {
    const { value: formValues } = await Swal.fire({
      title: '<span class="text-lg font-bold text-gray-900">Edit Data Sekolah</span>',
      html: `
        <div class="text-left space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Sekolah <span class="text-red-500">*</span></label>
            <input id="swal-edit-nama" class="swal2-input !mt-0 !w-full text-xs" value="${school.nama || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">NPSN <span class="text-red-500">*</span></label>
            <input id="swal-edit-npsn" class="swal2-input !mt-0 !w-full text-xs" value="${school.npsn || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Alamat Sekolah</label>
            <input id="swal-edit-alamat" class="swal2-input !mt-0 !w-full text-xs" value="${school.alamat || ''}">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Kota / Kabupaten <span class="text-red-500">*</span></label>
              <input id="swal-edit-kota" class="swal2-input !mt-0 !w-full text-xs" value="${school.kota_kabupaten || ''}">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">Provinsi</label>
              <input id="swal-edit-provinsi" class="swal2-input !mt-0 !w-full text-xs" value="${school.provinsi || 'Sulawesi Utara'}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="font-bold text-gray-700 block mb-1">Nama Kepala Sekolah</label>
              <input id="swal-edit-kepsek" class="swal2-input !mt-0 !w-full text-xs" value="${school.nama_kepala_sekolah || ''}">
            </div>
            <div>
              <label class="font-bold text-gray-700 block mb-1">NIP Kepala Sekolah</label>
              <input id="swal-edit-nip" class="swal2-input !mt-0 !w-full text-xs" value="${school.nip_kepala_sekolah || ''}">
            </div>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">URL Logo Sekolah</label>
            <input id="swal-edit-logo" class="swal2-input !mt-0 !w-full text-xs" value="${school.logo_url || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Status Operasional</label>
            <select id="swal-edit-status" class="swal2-select !mt-0 !w-full text-xs">
              <option value="aktif" ${school.status === 'aktif' ? 'selected' : ''}>Aktif</option>
              <option value="nonaktif" ${school.status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
            </select>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Mode Jurnal Pembelajaran</label>
            <select id="swal-edit-mode-jurnal" class="swal2-select !mt-0 !w-full text-xs">
              <option value="camera_only" ${(school as any).mode_jurnal === 'camera_only' ? 'selected' : ''}>Live Camera Langsung</option>
              <option value="camera_upload" ${(school as any).mode_jurnal === 'camera_upload' || !(school as any).mode_jurnal ? 'selected' : ''}>Live Camera + Upload Foto</option>
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
        const nama = (document.getElementById('swal-edit-nama') as HTMLInputElement)?.value?.trim();
        const npsn = (document.getElementById('swal-edit-npsn') as HTMLInputElement)?.value?.trim();
        const alamat = (document.getElementById('swal-edit-alamat') as HTMLInputElement)?.value?.trim() || null;
        const kota_kabupaten = (document.getElementById('swal-edit-kota') as HTMLInputElement)?.value?.trim();
        const provinsi = (document.getElementById('swal-edit-provinsi') as HTMLInputElement)?.value?.trim() || 'Sulawesi Utara';
        const nama_kepala_sekolah = (document.getElementById('swal-edit-kepsek') as HTMLInputElement)?.value?.trim() || null;
        const nip_kepala_sekolah = (document.getElementById('swal-edit-nip') as HTMLInputElement)?.value?.trim() || null;
        const logo_url = (document.getElementById('swal-edit-logo') as HTMLInputElement)?.value?.trim() || null;
        const status = (document.getElementById('swal-edit-status') as HTMLSelectElement)?.value || 'aktif';
        const mode_jurnal = (document.getElementById('swal-edit-mode-jurnal') as HTMLSelectElement)?.value || 'camera_upload';

        if (!nama || !npsn || !kota_kabupaten) {
          Swal.showValidationMessage('Nama Sekolah, NPSN, dan Kota/Kabupaten wajib diisi!');
          return null;
        }

        return {
          nama,
          npsn,
          alamat,
          kota_kabupaten,
          provinsi,
          nama_kepala_sekolah,
          nip_kepala_sekolah,
          logo_url,
          status,
          mode_jurnal,
          updated_at: new Date().toISOString()
        };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error } = await masterSupabase
          .from('sekolah')
          .update(formValues)
          .eq('id', school.id);

        if (error) {
          Swal.fire('Gagal Memperbarui', error.message, 'error');
        } else {
          Swal.fire('Berhasil', 'Data sekolah berhasil diperbarui!', 'success');
          fetchAllData();
        }
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleSchoolStatus = async (school: Sekolah) => {
    const newStatus = school.status === 'aktif' ? 'nonaktif' : 'aktif';
    const actionWord = newStatus === 'aktif' ? 'Mengaktifkan' : 'Menonaktifkan';

    const confirm = await Swal.fire({
      title: `${actionWord} Sekolah?`,
      text: `Apakah Anda yakin ingin mengubah status "${school.nama}" menjadi ${newStatus}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Ya, Ubah ke ${newStatus}`,
      confirmButtonColor: newStatus === 'aktif' ? '#0B4619' : '#d97706',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const { error } = await masterSupabase
        .from('sekolah')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', school.id);

      if (error) {
        Swal.fire('Gagal Mengubah Status', error.message, 'error');
      } else {
        Swal.fire('Berhasil', `Status sekolah berhasil diubah menjadi ${newStatus}.`, 'success');
        fetchAllData();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = async (school: Sekolah) => {
    const confirm = await Swal.fire({
      title: 'Hapus Data Sekolah?',
      html: `
        <p class="text-sm text-gray-700">Apakah Anda yakin ingin menghapus <b>${school.nama}</b> (NPSN: ${school.npsn})?</p>
        <p class="text-xs text-red-600 font-bold mt-2">PERINGATAN: Menghapus sekolah akan menghapus seluruh relasi admin, guru, siswa, dan catatan presensi sekolah ini (CASCADE)!</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Permanen',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const { error } = await masterSupabase
        .from('sekolah')
        .delete()
        .eq('id', school.id);

      if (error) {
        Swal.fire('Gagal Menghapus Sekolah', error.message, 'error');
      } else {
        Swal.fire('Berhasil', `Sekolah "${school.nama}" berhasil dihapus.`, 'success');
        fetchAllData();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // School Admin Management Handlers
  // ----------------------------------------------------------------------------
  const handleOpenAddAdminModal = async () => {
    const activeSchools = sekolahList.filter(s => s.status === 'aktif');
    if (activeSchools.length === 0) {
      Swal.fire('Perhatian', 'Belum ada sekolah dengan status aktif. Harap daftarkan atau aktifkan sekolah terlebih dahulu.', 'warning');
      return;
    }

    const schoolOptionsHtml = activeSchools
      .map(s => `<option value="${s.id}">${s.nama} (${s.kota_kabupaten || 'Sulut'})</option>`)
      .join('');

    const { value: formValues } = await Swal.fire({
      title: '<span class="text-lg font-bold text-gray-900">Buat Akun Admin Sekolah</span>',
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Sekolah yang Ditugaskan <span class="text-red-500">*</span></label>
            <select id="swal-adm-sekolah" class="swal2-select !mt-0 !w-full text-xs">
              ${schoolOptionsHtml}
            </select>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Lengkap Admin <span class="text-red-500">*</span></label>
            <input id="swal-adm-nama" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: Admin SMA Negeri 1">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Username Login <span class="text-red-500">*</span></label>
            <input id="swal-adm-username" class="swal2-input !mt-0 !w-full text-xs" placeholder="Contoh: admin_sman1">
            <span class="text-[10px] text-gray-500">Username harus unik dan tanpa spasi.</span>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Kata Sandi (Password) <span class="text-red-500">*</span></label>
            <input id="swal-adm-password" type="text" class="swal2-input !mt-0 !w-full text-xs" placeholder="Minimal 6 karakter">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-user-plus mr-1"></i> Buat Akun Admin',
      confirmButtonColor: '#0B4619',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const sekolah_id = (document.getElementById('swal-adm-sekolah') as HTMLSelectElement)?.value;
        const nama = (document.getElementById('swal-adm-nama') as HTMLInputElement)?.value?.trim();
        const username = (document.getElementById('swal-adm-username') as HTMLInputElement)?.value?.trim()?.toLowerCase();
        const password = (document.getElementById('swal-adm-password') as HTMLInputElement)?.value?.trim();

        if (!sekolah_id || !nama || !username || !password) {
          Swal.showValidationMessage('Semua kolom wajib diisi!');
          return null;
        }

        if (password.length < 6) {
          Swal.showValidationMessage('Kata sandi minimal 6 karakter!');
          return null;
        }

        return {
          username,
          password,
          nama,
          role: 'Admin',
          sekolah_id
        };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error } = await masterSupabase.from('users').insert([formValues]);
        if (error) {
          if (error.code === '23505') {
            Swal.fire('Gagal Membuat Admin', `Username "${formValues.username}" sudah digunakan. Gunakan username lain.`, 'error');
          } else {
            Swal.fire('Gagal Membuat Admin', error.message, 'error');
          }
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Akun Admin Dibuat!',
            html: `Akun Admin <b>${formValues.username}</b> berhasil dibuat dan ditautkan ke sekolah.`,
            confirmButtonColor: '#0B4619'
          });
          fetchAllData();
        }
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditAdmin = async (admin: User) => {
    const activeSchools = sekolahList.filter(s => s.status === 'aktif');
    const schoolOptionsHtml = activeSchools
      .map(
        s =>
          `<option value="${s.id}" ${admin.sekolah_id === s.id ? 'selected' : ''}>${s.nama} (${s.kota_kabupaten || 'Sulut'})</option>`
      )
      .join('');

    const { value: formValues } = await Swal.fire({
      title: `<span class="text-lg font-bold text-gray-900">Edit Akun Admin: ${admin.username}</span>`,
      html: `
        <div class="text-left space-y-3 text-xs">
          <div>
            <label class="font-bold text-gray-700 block mb-1">Nama Lengkap Admin <span class="text-red-500">*</span></label>
            <input id="swal-edit-adm-nama" class="swal2-input !mt-0 !w-full text-xs" value="${admin.nama || ''}">
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Sekolah yang Ditugaskan <span class="text-red-500">*</span></label>
            <select id="swal-edit-adm-sekolah" class="swal2-select !mt-0 !w-full text-xs">
              ${schoolOptionsHtml}
            </select>
          </div>
          <div>
            <label class="font-bold text-gray-700 block mb-1">Ganti Password (Kosongkan jika tidak diubah)</label>
            <input id="swal-edit-adm-pwd" type="text" class="swal2-input !mt-0 !w-full text-xs" placeholder="Masukkan password baru jika ingin diganti">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Simpan Perubahan',
      confirmButtonColor: '#0B4619',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const nama = (document.getElementById('swal-edit-adm-nama') as HTMLInputElement)?.value?.trim();
        const sekolah_id = (document.getElementById('swal-edit-adm-sekolah') as HTMLSelectElement)?.value;
        const newPassword = (document.getElementById('swal-edit-adm-pwd') as HTMLInputElement)?.value?.trim();

        if (!nama || !sekolah_id) {
          Swal.showValidationMessage('Nama dan Sekolah wajib diisi!');
          return null;
        }

        const payload: any = { nama, sekolah_id };
        if (newPassword) {
          if (newPassword.length < 6) {
            Swal.showValidationMessage('Password baru minimal 6 karakter!');
            return null;
          }
          payload.password = newPassword;
        }
        return payload;
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error } = await masterSupabase.from('users').update(formValues).eq('id', admin.id);

        if (error) {
          Swal.fire('Gagal Memperbarui Admin', error.message, 'error');
        } else {
          Swal.fire('Berhasil', 'Akun Admin berhasil diperbarui!', 'success');
          fetchAllData();
        }
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAdmin = async (admin: User) => {
    const confirm = await Swal.fire({
      title: 'Hapus Akun Admin?',
      html: `Apakah Anda yakin ingin menghapus admin <b>${admin.nama}</b> (${admin.username})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus Admin',
      confirmButtonColor: '#dc2626',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      const { error } = await masterSupabase.from('users').delete().eq('id', admin.id);

      if (error) {
        Swal.fire('Gagal Menghapus Admin', error.message, 'error');
      } else {
        Swal.fire('Berhasil', `Akun admin ${admin.username} berhasil dihapus.`, 'success');
        fetchAllData();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setLoading(false);
    }
  };

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
              Pusat kendali multi-tenant SIPJAM. Daftarkan lembaga sekolah, kelola akun administrator sekolah, dan pantau metrik lintas sekolah secara terpusat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenAddSchoolModal}
              className="btn-click bg-white text-emerald-900 font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg hover:bg-emerald-50 transition"
            >
              <i className="fa-solid fa-plus-circle text-emerald-700"></i> Tambah Sekolah
            </button>
            <button
              type="button"
              onClick={handleOpenAddAdminModal}
              className="btn-click bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-md border border-white/20 transition"
            >
              <i className="fa-solid fa-user-shield text-yellow-300"></i> Buat Admin
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

      {/* Tabs Navigation Bar */}
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
        <button
          type="button"
          onClick={() => switchTab('sekolah')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeTab === 'sekolah'
              ? 'bg-nizamudin-green text-white dark:text-nizamudin-gold shadow-md'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-school"></i>
          <span>Kelola Sekolah ({sekolahList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab('admins')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 ${
            activeTab === 'admins'
              ? 'bg-nizamudin-green text-white dark:text-nizamudin-gold shadow-md'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <i className="fa-solid fa-user-shield"></i>
          <span>Admin Sekolah ({adminList.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sekolah */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-emerald-600 dark:border-emerald-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Sekolah
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-school"></i>
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {stats.totalSekolah}
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

            {/* Total Admin Sekolah */}
            <div className="glass-card p-5 rounded-2xl border-l-4 border-blue-600 dark:border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin Sekolah
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-user-shield"></i>
                </div>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white">
                {stats.totalAdmin}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Pengelola tingkat sekolah terdaftar
              </p>
            </div>

            {/* Total Guru */}
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
                {stats.totalGuru}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Tenaga pendidik lintas sekolah
              </p>
            </div>

            {/* Total Siswa */}
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
                {stats.totalSiswa}
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Siswa terdaftar di seluruh sekolah
              </p>
            </div>
          </div>

          {/* Quick Actions & Recent Schools */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions Panel */}
            <div className="glass-card p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-bolt text-amber-500"></i> Aksi Cepat Superadmin
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Lakukan pendaftaran instan sekolah atau akun operator baru dalam beberapa klik.
              </p>
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleOpenAddSchoolModal}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-gray-50 dark:bg-gray-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-school-flag"></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Tambah Lembaga Sekolah
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Input NPSN, alamat, dan data kepala sekolah
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddAdminModal}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-user-plus"></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Buat Akun Admin Sekolah
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Tautkan akun operator ke sekolah tertentu
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => switchTab('sekolah')}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800/60 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-list-check"></i>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white">
                      Kelola Daftar Sekolah
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Lihat status, edit profil, dan filter kota
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* School Overview Table Summary */}
            <div className="glass-card p-5 rounded-2xl lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-building-columns text-emerald-600"></i> Sekolah Terdaftar Terbaru
                </h3>
                <button
                  type="button"
                  onClick={() => switchTab('sekolah')}
                  className="text-xs text-nizamudin-green dark:text-nizamudin-gold font-bold hover:underline"
                >
                  Lihat Semua <i className="fa-solid fa-arrow-right ml-1"></i>
                </button>
              </div>

              {sekolahList.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 italic">
                  Belum ada sekolah yang terdaftar di database.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sekolahList.slice(0, 5).map(s => {
                    const adminsCount = adminList.filter(a => a.sekolah_id === s.id).length;
                    return (
                      <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-black flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                            <i className="fa-solid fa-school text-xs"></i>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {s.nama}
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>NPSN: {s.npsn}</span>
                              <span>•</span>
                              <span>{s.kota_kabupaten || 'Sulawesi Utara'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                            {adminsCount} Admin
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              s.status === 'aktif'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}
                          >
                            {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
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

      {/* TAB 2: SCHOOL MANAGEMENT */}
      {activeTab === 'sekolah' && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-school text-emerald-600"></i> Manajemen Sekolah
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kelola daftar lembaga sekolah, status operasional, dan parameter identitas sekolah.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddSchoolModal}
              className="btn-click bg-nizamudin-green text-white dark:text-nizamudin-gold font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md hover:opacity-90 transition shrink-0"
            >
              <i className="fa-solid fa-plus-circle"></i> Daftarkan Sekolah Baru
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-gray-400"></i>
              <input
                type="text"
                value={sekolahSearch}
                onChange={e => setSekolahSearch(e.target.value)}
                placeholder="Cari nama, NPSN, atau kepala sekolah..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <select
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
              >
                <option value="">Semua Kota / Kabupaten</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
              >
                <option value="all">Semua Status</option>
                <option value="aktif">Hanya Aktif</option>
                <option value="nonaktif">Hanya Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Schools Table */}
          <div className="overflow-x-auto custom-scroll rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 uppercase font-bold border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">Nama Lembaga & NPSN</th>
                  <th className="p-3">Wilayah</th>
                  <th className="p-3">Kepala Sekolah</th>
                  <th className="p-3 text-center">Admin</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredSekolah.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500 dark:text-gray-400 italic">
                      Tidak ada data sekolah yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSekolah.map((s, idx) => {
                    const admins = adminList.filter(a => a.sekolah_id === s.id);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                        <td className="p-3 text-center text-gray-500 font-semibold">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-gray-900 dark:text-white">{s.nama}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1.5 flex-wrap">
                            <span>NPSN: {s.npsn}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                              (s as any).mode_jurnal === 'camera_only'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                              <i className={`fa-solid ${(s as any).mode_jurnal === 'camera_only' ? 'fa-camera' : 'fa-camera-rotate'} mr-1`}></i>
                              {(s as any).mode_jurnal === 'camera_only' ? 'Kamera Langsung' : 'Kamera + Upload'}
                            </span>
                          </div>
                          {s.alamat && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {s.alamat}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          <div>{s.kota_kabupaten}</div>
                          <div className="text-[10px] text-gray-500">{s.provinsi || 'Sulawesi Utara'}</div>
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          <div className="font-semibold">{s.nama_kepala_sekolah || '-'}</div>
                          {s.nip_kepala_sekolah && s.nip_kepala_sekolah !== '-' && (
                            <div className="text-[10px] text-gray-500 font-mono">NIP. {s.nip_kepala_sekolah}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              admins.length > 0
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}
                            title={admins.map(a => a.username).join(', ')}
                          >
                            {admins.length} Admin
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSchoolStatus(s)}
                            className={`btn-click px-2.5 py-1 rounded-full text-[10px] font-bold transition flex items-center justify-center gap-1 mx-auto ${
                              s.status === 'aktif'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200'
                            }`}
                            title="Klik untuk ubah status"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'aktif' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                            {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                Swal.fire({
                                  title: 'Tagihan / Invoice',
                                  text: `Tindakan untuk ${s.nama}`,
                                  icon: 'question',
                                  showCancelButton: true,
                                  showDenyButton: true,
                                  confirmButtonText: '<i class="fa-brands fa-whatsapp"></i> Kirim WA',
                                  denyButtonText: '<i class="fa-solid fa-file-pdf"></i> Cetak PDF',
                                  cancelButtonText: 'Batal',
                                  confirmButtonColor: '#25D366',
                                  denyButtonColor: '#0B4619'
                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    const phone = prompt('Masukkan nomor WhatsApp (contoh: 62812...):', '628');
                                    if (phone && phone.trim() !== '') {
                                      const text = `Halo Admin ${s.nama},
Kami mengingatkan bahwa tagihan tahunan sistem SIPJAM sebesar *Rp 3.000.000* sudah jatuh tempo. Mohon segera melakukan pembayaran agar akses sistem Anda tidak dibekukan.

Terima kasih,
Superadmin SIPJAM`;
                                      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                    }
                                  } else if (result.isDenied) {
                                    // Generate simple PDF layout via window.print
                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                      printWindow.document.write(`
                                        <html>
                                          <head>
                                            <title>Invoice - ${s.nama}</title>
                                            <style>
                                              body { font-family: sans-serif; padding: 40px; color: #333; }
                                              .header { border-bottom: 2px solid #0B4619; padding-bottom: 20px; margin-bottom: 40px; }
                                              .title { font-size: 24px; font-weight: bold; color: #0B4619; }
                                              .details { margin-bottom: 40px; line-height: 1.6; }
                                              .table { w-full border-collapse: collapse; width: 100%; margin-bottom: 40px; }
                                              .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                              .table th { background: #f9fafb; }
                                              .total { font-weight: bold; font-size: 18px; text-align: right; }
                                              .footer { margin-top: 60px; font-size: 14px; text-align: center; color: #666; }
                                            </style>
                                          </head>
                                          <body>
                                            <div class="header">
                                              <div class="title">INVOICE TAHUNAN SIPJAM</div>
                                              <div>Sistem Informasi Presensi & Jurnal Multi-Sekolah</div>
                                            </div>
                                            <div class="details">
                                              <strong>Kepada Yth:</strong><br/>
                                              Kepala Sekolah / Admin<br/>
                                              ${s.nama}<br/>
                                              ${s.alamat || ''}<br/>
                                              ${s.kota_kabupaten} - ${s.provinsi || ''}
                                            </div>
                                            <table class="table">
                                              <thead>
                                                <tr>
                                                  <th>Deskripsi</th>
                                                  <th>Periode</th>
                                                  <th>Jumlah</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                <tr>
                                                  <td>Biaya Maintenance & Server SIPJAM</td>
                                                  <td>1 Tahun</td>
                                                  <td>Rp 3.000.000</td>
                                                </tr>
                                              </tbody>
                                            </table>
                                            <div class="total">Total Tagihan: Rp 3.000.000</div>
                                            <div class="footer">
                                              Harap simpan halaman ini sebagai PDF (Cetak -> Simpan sebagai PDF) lalu kirim ke WhatsApp admin sekolah.<br/>
                                              Dicetak pada: ${new Date().toLocaleDateString('id-ID')}
                                            </div>
                                            <script>window.print(); setTimeout(() => window.close(), 500);</script>
                                          </body>
                                        </html>
                                      `);
                                      printWindow.document.close();
                                    }
                                  }
                                });
                              }}
                              className="btn-click w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-400 flex items-center justify-center"
                              title="Tagihan / Invoice"
                            >
                              <i className="fa-solid fa-file-invoice-dollar text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditSchool(s)}
                              className="btn-click w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                              title="Edit Data Sekolah"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSchool(s)}
                              className="btn-click w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center"
                              title="Hapus Sekolah"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ADMIN ACCOUNTS */}
      {activeTab === 'admins' && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-user-shield text-blue-600"></i> Akun Admin Sekolah
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kelola akun administrator lembaga yang memiliki wewenang mengelola data guru, siswa, dan pengaturan sekolahnya.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddAdminModal}
              className="btn-click bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md hover:bg-blue-700 transition shrink-0"
            >
              <i className="fa-solid fa-user-plus"></i> Buat Akun Admin Baru
            </button>
          </div>

          {/* Search Admin Bar */}
          <div className="max-w-md">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-gray-400"></i>
              <input
                type="text"
                value={adminSearch}
                onChange={e => setAdminSearch(e.target.value)}
                placeholder="Cari nama admin, username, atau sekolah..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Admin Table */}
          <div className="overflow-x-auto custom-scroll rounded-xl border border-gray-100 dark:border-gray-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 uppercase font-bold border-b border-gray-200 dark:border-gray-700">
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">Nama Admin</th>
                  <th className="p-3">Username Login</th>
                  <th className="p-3">Sekolah Ditugaskan</th>
                  <th className="p-3 text-center">Peran</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gray-500 dark:text-gray-400 italic">
                      Tidak ada akun Admin yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((adm, idx) => {
                    const schoolName = adm.sekolah_id
                      ? schoolNameMap.get(adm.sekolah_id) || 'Sekolah Tidak Ditemukan'
                      : 'Global / Belum Ditautkan';

                    return (
                      <tr key={adm.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition">
                        <td className="p-3 text-center text-gray-500 font-semibold">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs">
                              <i className="fa-solid fa-user-shield"></i>
                            </div>
                            <span>{adm.nama}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            {adm.username}
                          </code>
                        </td>
                        <td className="p-3 text-gray-700 dark:text-gray-300">
                          <div className="font-semibold">{schoolName}</div>
                          {adm.sekolah_id && (
                            <div className="text-[9px] text-gray-400 font-mono">{adm.sekolah_id}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            {adm.role}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditAdmin(adm)}
                              className="btn-click w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                              title="Edit Admin & Reset Password"
                            >
                              <i className="fa-solid fa-pen text-xs"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(adm)}
                              className="btn-click w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center"
                              title="Hapus Akun Admin"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: JARINGAN SEKOLAH SATELIT (PORTAL INDUK MULTI-SEKOLAH) */}
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
                {satelliteSchools.filter(s => (healthMap[s.id] || (s.status === 'aktif' ? 'online' : 'paused')) === 'online').length}
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
                {satelliteSchools.filter(s => (healthMap[s.id] || (s.status === 'aktif' ? 'online' : 'paused')) === 'paused').length}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 block">Perlu resume / periksa kuota</span>
            </div>

            <div className="glass-card p-4 rounded-2xl border-l-4 border-blue-500">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Total Guru & Siswa
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {Object.values(metricsMap).reduce((acc, m) => acc + (m.guruCount || 0) + (m.siswaCount || 0), 0) || (stats.totalGuru + stats.totalSiswa)}
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
