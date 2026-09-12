'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Swal from 'sweetalert2';
import type { Sekolah, User } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-user-role': 'Superadmin'
    }
  }
});

interface SuperadminViewProps {
  user: any;
  initialTab?: 'overview' | 'sekolah' | 'admins';
  onNavigateTab?: (tab: string) => void;
}

export default function SuperadminView({
  user,
  initialTab = 'overview',
  onNavigateTab
}: SuperadminViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'sekolah' | 'admins'>(initialTab);
  const [loading, setLoading] = useState(false);

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

  const switchTab = (tab: 'overview' | 'sekolah' | 'admins') => {
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
      // 1. Fetch schools
      const { data: schools, error: schoolErr } = await supabase
        .from('sekolah')
        .select('*')
        .order('created_at', { ascending: false });

      if (schoolErr) {
        console.error('Error fetching sekolah:', schoolErr);
      } else if (schools) {
        setSekolahList(schools);
      }

      // 2. Fetch admin users (role = 'Admin')
      const { data: admins, error: adminErr } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'Admin')
        .order('nama', { ascending: true });

      if (adminErr) {
        console.error('Error fetching admins:', adminErr);
      } else if (admins) {
        setAdminList(admins);
      }

      // 3. Fetch count of teachers & students across all schools
      const [guruCountRes, siswaCountRes] = await Promise.all([
        supabase.from('data_guru').select('id', { count: 'exact', head: true }),
        supabase.from('data_siswa').select('id', { count: 'exact', head: true })
      ]);

      const totalGuru = guruCountRes.count || 0;
      const totalSiswa = siswaCountRes.count || 0;

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
    } catch (err) {
      console.error('Failed to load Superadmin data:', err);
      Swal.fire('Error', 'Gagal memuat data platform Superadmin.', 'error');
    } finally {
      setLoading(false);
    }
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
          status
        };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error } = await supabase.from('sekolah').insert([formValues]);
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
          updated_at: new Date().toISOString()
        };
      }
    });

    if (formValues) {
      setLoading(true);
      try {
        const { error } = await supabase
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
      const { error } = await supabase
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
      const { error } = await supabase
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
        const { error } = await supabase.from('users').insert([formValues]);
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
        const { error } = await supabase
          .from('users')
          .update(formValues)
          .eq('id', admin.id);

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
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', admin.id);

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

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => switchTab('overview')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
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
          onClick={() => switchTab('sekolah')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
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
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
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
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                            NPSN: {s.npsn}
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
    </div>
  );
}
