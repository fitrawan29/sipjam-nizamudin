'use client';

import { useState, useEffect } from 'react';
import { supabase, masterSupabase, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
import AccountSettingsModal from './AccountSettingsModal';
import AdminBackupView from './AdminBackupView';
import ClayTabs, { TabItem } from '@/components/ClayTabs';
import { isMasterDataModificationAllowed, getStorageCache, setStorageCache, isInvalidMapel } from '@/lib/dataIntegrityGuard';
import { formatKepalaSekolahLabel, normalizeStatusKepalaSekolah } from '@/utils/textUtils';
import {
  isTeacherRecordMatch,
  resolveLinkedUserForTeacher,
  resolveSchoolAturanKehadiran,
  resolveSchoolLegacyGhmList,
  resolveTeacherAttendancePolicy,
  getTeacherScheduleSummary
} from '@/lib/workflow';

export interface AdminConfigViewProps {
  user: any;
  onUserUpdated?: (updatedUser: any) => void;
  initialTab?: string;
}

export default function AdminConfigView({
  user,
  onUserUpdated,
  initialTab
}: AdminConfigViewProps) {
  const [config, setConfig] = useState({
    tahun_ajaran: '2024/2025',
    semester: 'Ganjil',
    waktu_efektif_mulai: '',
    waktu_efektif_akhir: '',
    hari_sekolah: '6',
    aturan_kehadiran_guru: 'Semua_Hari',
    email_tujuan_upload: '',
    jam_datang_mulai: '06:45',
    jam_datang_batas: '07:15',
    jam_datang_akhir: '08:00',
    jam_pulang_mulai: '11:00',
    jam_pulang_jumat: '11:00',
    jam_pulang_akhir: '22:00',
    jam_batas_intervensi_siswa: '08:00',
    akumulasi_telat_aktif: 'true',
    batas_jam_penalti_telat: '4',
    jumlah_hari_penalti_telat: '1',
    kop_yayasan: '',
    kop_sekolah: '',
    kop_alamat: '',
    kop_npsn: '',
    logo_kiri: '',
    logo_kanan: '',
    ttd_kepsek_nama: '',
    ttd_kepsek_nip: '',
    status_kepala_sekolah: 'Definitif',
    kepala_sekolah_id: '',
    ttd_pengawas_aktif: 'false',
    ttd_pengawas_nama: '',
    ttd_pengawas_nip: '',
    ttd_pengawas_jabatan: 'Pengawas Pembina',
    kota_ttd: '',
    kota_kabupaten: '',
    gps_lat: '-6.200000',
    gps_lng: '106.816666',
    gps_radius: '100'
  });

  const [guruList, setGuruList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [jadwalList, setJadwalList] = useState<any[]>([]);
  const [exemptTeacherIds, setExemptTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [attendanceFilterTab, setAttendanceFilterTab] = useState<'all' | 'setiap_hari' | 'hanya_kbm'>('all');
  const [roleFilterTab, setRoleFilterTab] = useState<'all' | 'guru' | 'tu' | 'kepsek'>('all');

  const isTuStaff = (t: any): boolean => {
    const mp = (t?.mata_pelajaran || '').toLowerCase();
    const role = (t?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    return mp.includes('tata usaha') || mp.includes('tu (administrasi)') || mp === 'tu' || role === 'tatausaha';
  };

  const isKepsekStaff = (t: any): boolean => {
    if (!t) return false;
    if (config.kepala_sekolah_id && t.id === config.kepala_sekolah_id) return true;
    if (t.is_kepala_sekolah === true || t.is_kepala_sekolah === 'true') return true;
    if (config.ttd_kepsek_nip && t.nip && t.nip !== '-' && t.nip === config.ttd_kepsek_nip) return true;
    if (config.ttd_kepsek_nama && t.nama_guru && (
      t.nama_guru.toLowerCase().trim() === config.ttd_kepsek_nama.toLowerCase().trim() ||
      config.ttd_kepsek_nama.toLowerCase().includes(t.nama_guru.toLowerCase().trim())
    )) return true;
    return false;
  };

  const isBkStaff = (t: any): boolean => {
    if (!t) return false;
    const mp = (t?.mata_pelajaran || '').toLowerCase();
    const role = (t?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    return mp.includes('bk') || mp.includes('bimbingan') || role === 'bk' || role === 'gurubk';
  };

  const getTeacherKbmCount = (t: any, schedules: any[] = jadwalList, uList: any[] = usersList): number => {
    if (isTuStaff(t)) return 0;
    const linkedUser = resolveLinkedUserForTeacher(t, uList);
    return getTeacherScheduleSummary(t, schedules || [], linkedUser).totalJadwal;
  };

  const [loading, setLoading] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const tabs: TabItem[] = [
    { id: 'umum', label: 'Umum & Kalender', icon: 'fa-regular fa-calendar' },
    { id: 'jam_kerja', label: 'Jam Kerja & GPS', icon: 'fa-solid fa-clock' },
    { id: 'kop', label: 'KOP & Pejabat', icon: 'fa-solid fa-stamp' },
    { id: 'kehadiran', label: 'Kebijakan Guru', icon: 'fa-solid fa-user-check' },
    { id: 'backup', label: 'Pencadangan Database', icon: 'fa-solid fa-database' }
  ];

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (initialTab === 'backup') return 'backup';
    if (initialTab === 'jam_kerja' || initialTab === 'kop' || initialTab === 'kehadiran') return initialTab;
    return 'umum';
  });

  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'backup') setActiveTab('backup');
      else if (['umum', 'jam_kerja', 'kop', 'kehadiran'].includes(initialTab)) setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        let query = supabase.from('pengaturan').select('*');
        if (user?.sekolah_id) {
          query = query.eq('sekolah_id', user.sekolah_id);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          const newConfig = { ...config };
          const ghmList: string[] = [];
          const canonicalKeysSeen = new Set<string>();
          data.forEach(item => {
            if (item.key in newConfig) {
              (newConfig as any)[item.key] = item.value;
              canonicalKeysSeen.add(item.key);
            } else if (item.key && item.key.toLowerCase() in newConfig) {
              const lowerKey = item.key.toLowerCase();
              if (!canonicalKeysSeen.has(lowerKey)) {
                (newConfig as any)[lowerKey] = item.value;
              }
            }
            // Aliases for pengawas bina and kepala sekolah
            if (item.key === 'opsi_ttd_pengawas' || item.key === 'pengawas_bina_aktif') {
              newConfig.ttd_pengawas_aktif = item.value;
            }
            if (item.key === 'nama_pengawas_bina' || item.key === 'NAMA_PENGAWAS_BINA') {
              newConfig.ttd_pengawas_nama = item.value;
            }
            if (item.key === 'nip_pengawas_bina' || item.key === 'NIP_PENGAWAS_BINA') {
              newConfig.ttd_pengawas_nip = item.value;
            }
            if (item.key === 'jabatan_pengawas_bina' || item.key === 'JABATAN_PENGAWAS_BINA') {
              newConfig.ttd_pengawas_jabatan = item.value;
            }
            if (item.key === 'NAMA_KEPALA_SEKOLAH' && !newConfig.ttd_kepsek_nama) {
              newConfig.ttd_kepsek_nama = item.value;
            }
            if (item.key === 'NIP_KEPALA_SEKOLAH' && !newConfig.ttd_kepsek_nip) {
              newConfig.ttd_kepsek_nip = item.value;
            }
            if (item.key === 'status_kepala_sekolah' || item.key === 'STATUS_KEPALA_SEKOLAH') {
              newConfig.status_kepala_sekolah = item.value;
              newConfig.status_kepala_sekolah = normalizeStatusKepalaSekolah(item.value);
            }
            if (item.email_tujuan_upload && !canonicalKeysSeen.has('email_tujuan_upload')) {
              newConfig.email_tujuan_upload = item.email_tujuan_upload;
            }
          });
          const jpjKeyRow = data.find((r: any) => r.key === 'jam_pulang_jumat' && r.value);
          if (jpjKeyRow) {
            newConfig.jam_pulang_jumat = jpjKeyRow.value;
          } else {
            const jpjColRow = data.find((r: any) => r.jam_pulang_jumat);
            if (jpjColRow?.jam_pulang_jumat) {
              newConfig.jam_pulang_jumat = jpjColRow.jam_pulang_jumat;
            }
          }
          newConfig.aturan_kehadiran_guru = resolveSchoolAturanKehadiran(data);
          ghmList.push(...resolveSchoolLegacyGhmList(data));
          // Ensure bidirectional fallback between kota_kabupaten and kota_ttd
          if (!newConfig.kota_kabupaten && newConfig.kota_ttd) {
            newConfig.kota_kabupaten = newConfig.kota_ttd;
          }
          if (!newConfig.kota_ttd && newConfig.kota_kabupaten) {
            newConfig.kota_ttd = newConfig.kota_kabupaten;
          }

          // Fetch teachers from data_guru
          let guruQuery = supabase.from('data_guru').select('*').order('nama_guru', { ascending: true });
          if (user?.sekolah_id) {
            guruQuery = guruQuery.eq('sekolah_id', user.sekolah_id);
          }
          const { data: teachers } = await guruQuery;

          // Also fetch users with role 'tata_usaha' or 'Tata Usaha' to ensure any TU staff account is included
          let allPersonnel: any[] = teachers ? [...teachers] : [];
          let fetchedUsers: any[] = [];
          try {
            let tuUserQuery = supabase.from('users').select('id, username, nama, role, sekolah_id');
            if (user?.sekolah_id) {
              tuUserQuery = tuUserQuery.eq('sekolah_id', user.sekolah_id);
            }
            const { data: tuUsers } = await tuUserQuery;
            if (tuUsers && tuUsers.length > 0) {
              fetchedUsers = tuUsers;
              setUsersList(tuUsers);
              const tuFiltered = tuUsers.filter((u: any) => {
                const r = (u.role || '').toLowerCase().replace(/[\s_-]+/g, '');
                return r === 'tatausaha';
              });
              for (const tu of tuFiltered) {
                const exists = allPersonnel.some(p =>
                  (p.user_id && p.user_id === tu.id) ||
                  (p.id && p.id === tu.id) ||
                  (p.nip && tu.username && p.nip.trim() === tu.username.trim()) ||
                  (p.nama_guru && tu.nama && p.nama_guru.trim().toLowerCase() === tu.nama.trim().toLowerCase())
                );
                if (!exists) {
                  allPersonnel.push({
                    id: tu.id,
                    user_id: tu.id,
                    nama_guru: tu.nama || 'Staf Tata Usaha',
                    nip: tu.username || '-',
                    mata_pelajaran: 'Tata Usaha (Administrasi)',
                    role: 'tata_usaha',
                    wajib_hadir_hanya_mengajar: null,
                    sekolah_id: tu.sekolah_id || user?.sekolah_id
                  });
                }
              }
            }
          } catch (_) {}

          // Fetch teaching schedules to accurately identify teachers with KBM vs without KBM
          let jadwalQuery = supabase.from('jadwal_pelajaran').select('*');
          if (user?.sekolah_id) {
            jadwalQuery = jadwalQuery.eq('sekolah_id', user.sekolah_id);
          }
          const { data: rawJadwal } = await jadwalQuery;
          const allSchoolJadwal = (rawJadwal || []).filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel));
          setJadwalList(allSchoolJadwal);

          if (allPersonnel && allPersonnel.length > 0) {
            setGuruList(allPersonnel);

            // Auto-match kepala_sekolah_id if not explicitly set
            if (!newConfig.kepala_sekolah_id && (newConfig.ttd_kepsek_nama || newConfig.ttd_kepsek_nip)) {
              const matched = allPersonnel.find(t => 
                (newConfig.ttd_kepsek_nip && t.nip && t.nip === newConfig.ttd_kepsek_nip) ||
                (newConfig.ttd_kepsek_nama && t.nama_guru && (
                  t.nama_guru.toLowerCase().trim() === newConfig.ttd_kepsek_nama.toLowerCase().trim() ||
                  newConfig.ttd_kepsek_nama.toLowerCase().includes(t.nama_guru.toLowerCase().trim())
                ))
              );
              if (matched) {
                newConfig.kepala_sekolah_id = matched.id;
              }
            }

            const effectiveExemptIds = allPersonnel
              .filter(t => {
                const linkedUser = resolveLinkedUserForTeacher(t, fetchedUsers);
                return resolveTeacherAttendancePolicy({
                  teacher: t,
                  linkedUser,
                  weeklySchedules: allSchoolJadwal,
                  aturanGlobal: newConfig.aturan_kehadiran_guru,
                  guruHanyaMengajarList: ghmList
                }).isTeacherExempt;
              })
              .map(t => t.id)
              .filter(Boolean);
            setExemptTeacherIds(Array.from(new Set(effectiveExemptIds)));
          } else if (ghmList.length > 0) {
            setExemptTeacherIds(Array.from(new Set(ghmList)));
          }

          // Pre-populate school profile fields from sekolah table if missing in pengaturan
          if (user?.sekolah_id) {
            try {
              const { data: schoolProfile } = await supabase
                .from('sekolah')
                .select('*')
                .eq('id', user.sekolah_id)
                .maybeSingle();

              if (schoolProfile) {
                if (!newConfig.kop_sekolah && schoolProfile.nama) newConfig.kop_sekolah = schoolProfile.nama;
                if (!newConfig.kop_alamat && schoolProfile.alamat) newConfig.kop_alamat = schoolProfile.alamat;
                if (!newConfig.kop_npsn && schoolProfile.npsn) newConfig.kop_npsn = schoolProfile.npsn;
                if (!newConfig.kota_kabupaten && schoolProfile.kota_kabupaten) {
                  newConfig.kota_kabupaten = schoolProfile.kota_kabupaten;
                  newConfig.kota_ttd = schoolProfile.kota_kabupaten;
                }
                if (!newConfig.logo_kiri && (schoolProfile.logo_kiri_url || schoolProfile.logo_url)) {
                  newConfig.logo_kiri = schoolProfile.logo_kiri_url || schoolProfile.logo_url;
                }
                if (!newConfig.logo_kanan && schoolProfile.logo_kanan_url) {
                  newConfig.logo_kanan = schoolProfile.logo_kanan_url;
                }
                if (!newConfig.ttd_kepsek_nama && schoolProfile.nama_kepala_sekolah) {
                  newConfig.ttd_kepsek_nama = schoolProfile.nama_kepala_sekolah;
                }
                if (!newConfig.ttd_kepsek_nip && schoolProfile.nip_kepala_sekolah) {
                  newConfig.ttd_kepsek_nip = schoolProfile.nip_kepala_sekolah;
                }
                if (!newConfig.status_kepala_sekolah && (schoolProfile as any).status_kepala_sekolah) {
                  newConfig.status_kepala_sekolah = normalizeStatusKepalaSekolah((schoolProfile as any).status_kepala_sekolah);
                }
              }
            } catch (_) {}
          }

          setConfig(newConfig);
        }
      } catch (err) {
        console.error('Config fetch error:', err);
      }
    };
    fetchConfig();
  }, [user?.sekolah_id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'kota_kabupaten') {
      setConfig(prev => ({ ...prev, kota_kabupaten: value, kota_ttd: value }));
    } else if (name === 'kota_ttd') {
      setConfig(prev => ({ ...prev, kota_ttd: value, kota_kabupaten: value }));
    } else if (name === 'aturan_kehadiran_guru') {
      setConfig(prev => ({ ...prev, aturan_kehadiran_guru: value }));
      if (value === 'Hari_Mengajar_Saja') {
        const eligibleIds = guruList
          .filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0)
          .map(g => g.id)
          .filter(Boolean);
        setExemptTeacherIds(eligibleIds);
      } else if (value === 'Semua_Hari') {
        setExemptTeacherIds([]);
      }
    } else {
      setConfig(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleKepsekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setConfig(prev => ({ ...prev, kepala_sekolah_id: '' }));
      return;
    }
    const selectedTeacher = guruList.find(g => g.id === selectedId);
    if (selectedTeacher) {
      setConfig(prev => ({
        ...prev,
        kepala_sekolah_id: selectedTeacher.id,
        ttd_kepsek_nama: selectedTeacher.nama_guru || prev.ttd_kepsek_nama,
        ttd_kepsek_nip: selectedTeacher.nip || prev.ttd_kepsek_nip || ''
      }));
    }
  };

  const handleTogglePengawas = () => {
    const isCurrentlyActive = String(config.ttd_pengawas_aktif) === 'true';
    setConfig(prev => ({
      ...prev,
      ttd_pengawas_aktif: (!isCurrentlyActive).toString()
    }));
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      showToast('Error', 'Browser atau perangkat Anda tidak mendukung geolokasi GPS.', 'error');
      return;
    }

    Swal.fire({
      title: 'Mendeteksi GPS...',
      text: 'Mohon izinkan akses lokasi jika diminta oleh browser.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        Swal.close();
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setConfig(prev => ({
          ...prev,
          gps_lat: lat,
          gps_lng: lng
        }));
        showToast('Lokasi Terdeteksi', `Latitude: ${lat}, Longitude: ${lng}`, 'success');
      },
      (err) => {
        Swal.close();
        let msg = err.message || 'Gagal mendapatkan koordinat GPS.';
        if (err.code === 1) msg = 'Izin akses lokasi ditolak oleh pengguna atau browser.';
        else if (err.code === 2) msg = 'Posisi perangkat tidak dapat ditentukan (sinyal GPS lemah).';
        else if (err.code === 3) msg = 'Waktu permintaan GPS habis (timeout).';
        showToast('Gagal Deteksi Lokasi', msg, 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isMasterDataModificationAllowed(user?.role)) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengubah konfigurasi sistem dan data master guru.', 'error');
      return;
    }

    setLoading(true);

    const cityVal = config.kota_kabupaten || config.kota_ttd || '';
    const saveConfig = {
      ...config,
      status_kepala_sekolah: config.status_kepala_sekolah || 'Definitif',
      jam_pulang_jumat: config.jam_pulang_jumat || '11:00',
      kota_kabupaten: cityVal,
      kota_ttd: cityVal
    };

    const targetSekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
    // Strictly restrict exemption to teachers with actual KBM hours (non-TU and KBM count > 0)
    const validExemptTeachers = guruList.filter(t => !isTuStaff(t) && getTeacherKbmCount(t, jadwalList) > 0);
    const validExemptIdSet = new Set(validExemptTeachers.map(t => t.id));

    const exemptIds = guruList.length > 0
      ? guruList
          .filter(t => exemptTeacherIds.includes(t.id) || (t.nama_guru && exemptTeacherIds.includes(t.nama_guru)) || (t.nip && t.nip !== '-' && exemptTeacherIds.includes(t.nip)))
          .map(t => t.id)
          .filter(Boolean)
      : [];
    const nonExemptIds = guruList.length > 0
      ? guruList.filter(t => !exemptIds.includes(t.id)).map(t => t.id).filter(Boolean)
      : [];
    const jsonExempt = JSON.stringify(exemptIds);

    const upsertData = Object.entries(saveConfig).map(([key, value]) => ({
      sekolah_id: targetSekolahId,
      key,
      value: value !== undefined && value !== null ? value.toString() : '',
      aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
      email_tujuan_upload: saveConfig.email_tujuan_upload,
      jam_pulang_jumat: saveConfig.jam_pulang_jumat,
      guru_hanya_mengajar: jsonExempt
    }));

    // Ensure guru_hanya_mengajar is also saved as a key-value row
    upsertData.push({
      sekolah_id: targetSekolahId,
      key: 'guru_hanya_mengajar',
      value: jsonExempt,
      aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
      email_tujuan_upload: saveConfig.email_tujuan_upload,
      jam_pulang_jumat: saveConfig.jam_pulang_jumat,
      guru_hanya_mengajar: jsonExempt
    });

    try {
      let hasColumnError = false;
      let { error } = await supabase.from('pengaturan').upsert(upsertData, { onConflict: 'sekolah_id,key' });

      // Schema cache fallback resilience (PGRST204 or missing column such as guru_hanya_mengajar)
      if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
        hasColumnError = true;
        console.warn('[AdminConfigView] Missing column in pengaturan table schema cache, falling back to canonical key-value upsert:', error.message);
        const cleanUpsertData = Object.entries(saveConfig).map(([key, value]) => ({
          sekolah_id: targetSekolahId,
          key,
          value: value !== undefined && value !== null ? value.toString() : ''
        }));
        cleanUpsertData.push({
          sekolah_id: targetSekolahId,
          key: 'guru_hanya_mengajar',
          value: jsonExempt
        });
        const retryRes = await supabase.from('pengaturan').upsert(cleanUpsertData, { onConflict: 'sekolah_id,key' });
        error = retryRes.error;
      }

      // Also ensure column values are set on pengaturan rows for this school if columns exist in schema
      if (!error && !hasColumnError) {
        try {
          await supabase.from('pengaturan').update({
            aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
            email_tujuan_upload: saveConfig.email_tujuan_upload,
            jam_pulang_jumat: saveConfig.jam_pulang_jumat,
            guru_hanya_mengajar: jsonExempt
          }).eq('sekolah_id', targetSekolahId);
        } catch (_) {}
      }

      // Clean up legacy UPPERCASE duplicate keys that would conflict with canonical lowercase keys
      try {
        const uppercaseKeysToDelete = Object.keys(saveConfig).map(k => k.toUpperCase());
        await supabase
          .from('pengaturan')
          .delete()
          .eq('sekolah_id', targetSekolahId)
          .in('key', uppercaseKeysToDelete);
      } catch (_) {}

      // Persistently update all school profile fields (nama, alamat, npsn, kota_kabupaten, logo)
      // into the sekolah table in addition to pengaturan
      try {
        const updatePayload: Record<string, any> = {
          nama_kepala_sekolah: saveConfig.ttd_kepsek_nama,
          nip_kepala_sekolah: saveConfig.ttd_kepsek_nip,
          status_kepala_sekolah: saveConfig.status_kepala_sekolah || 'Definitif'
        };
        updatePayload.kepala_sekolah_id = saveConfig.kepala_sekolah_id || null;
        if (saveConfig.kop_sekolah) {
          updatePayload.nama = saveConfig.kop_sekolah;
        }
        if (saveConfig.kop_alamat) {
          updatePayload.alamat = saveConfig.kop_alamat;
        }
        if (saveConfig.kop_npsn !== undefined && saveConfig.kop_npsn !== null) {
          updatePayload.npsn = saveConfig.kop_npsn;
        }
        const cityValue = saveConfig.kota_kabupaten || saveConfig.kota_ttd;
        if (cityValue) {
          updatePayload.kota_kabupaten = cityValue;
        }
        if (saveConfig.logo_kiri) {
          updatePayload.logo_kiri_url = saveConfig.logo_kiri;
        }
        if (saveConfig.logo_kanan) {
          updatePayload.logo_kanan_url = saveConfig.logo_kanan;
        }
        if (saveConfig.logo_kiri || saveConfig.logo_kanan) {
          updatePayload.logo_url = saveConfig.logo_kiri || saveConfig.logo_kanan;
        }

        let { error: sekolahError } = await supabase
          .from('sekolah')
          .update(updatePayload)
          .eq('id', targetSekolahId);

        if (sekolahError && (sekolahError.code === 'PGRST204' || sekolahError.message?.includes('status_kepala_sekolah') || sekolahError.message?.includes('column'))) {
          delete updatePayload.status_kepala_sekolah;
          sekolahError = (await supabase.from('sekolah').update(updatePayload).eq('id', targetSekolahId)).error;
        }

        if (sekolahError) {
          console.warn('[AdminConfigView] Error updating sekolah table with client, retrying with masterSupabase:', sekolahError.message);
          try {
            await masterSupabase
              .from('sekolah')
              .update(updatePayload)
              .eq('id', targetSekolahId);
          } catch (_) {}
        }

        if (typeof window !== 'undefined') {
          try {
            const rawUser = localStorage.getItem('sipjam_user');
            if (rawUser) {
              const u = JSON.parse(rawUser);
              if (saveConfig.kop_sekolah) u.sekolah_nama = saveConfig.kop_sekolah;
              u.status_kepala_sekolah = saveConfig.status_kepala_sekolah;
              localStorage.setItem('sipjam_user', JSON.stringify(u));
            }
          } catch (_) {}
        }
      } catch (schoolErr) {
        console.error('[AdminConfigView] Exception updating sekolah table:', schoolErr);
      }

      // Sync Kepala Sekolah designation in data_guru
      try {
        await supabase.from('data_guru').update({ is_kepala_sekolah: false }).eq('sekolah_id', targetSekolahId);
        if (saveConfig.kepala_sekolah_id) {
          await supabase.from('data_guru').update({ is_kepala_sekolah: true }).eq('id', saveConfig.kepala_sekolah_id);
        }
      } catch (_) {}

      // Also sync data_guru.wajib_hadir_hanya_mengajar (resilient to schema cache)
      if (guruList.length > 0) {
        try {
          if (exemptIds.length > 0) {
            const { error: exErr } = await supabase.from('data_guru').update({ wajib_hadir_hanya_mengajar: true }).in('id', exemptIds);
            if (exErr && (exErr.code === 'PGRST204' || String(exErr.message).includes('wajib_hadir_hanya_mengajar') || isSchemaCacheOrMissingTableError(exErr))) {
              console.warn('[AdminConfigView] Schema cache missing wajib_hadir_hanya_mengajar on data_guru (exempt), skipping column update:', exErr.message);
            }
          }
          if (nonExemptIds.length > 0) {
            const { error: nonExErr } = await supabase.from('data_guru').update({ wajib_hadir_hanya_mengajar: false }).in('id', nonExemptIds);
            if (nonExErr && (nonExErr.code === 'PGRST204' || String(nonExErr.message).includes('wajib_hadir_hanya_mengajar') || isSchemaCacheOrMissingTableError(nonExErr))) {
              console.warn('[AdminConfigView] Schema cache missing wajib_hadir_hanya_mengajar on data_guru (non-exempt), skipping column update:', nonExErr.message);
            }
          }
        } catch (syncErr) {
          console.warn('[AdminConfigView] Error updating data_guru.wajib_hadir_hanya_mengajar:', syncErr);
        }

        // Update local guruList state so UI reflects the newly persisted values
        setGuruList(prev => prev.map(t => ({
          ...t,
          wajib_hadir_hanya_mengajar: exemptIds.includes(t.id)
        })));
        setExemptTeacherIds(exemptIds);
      }

      // Synchronize tahun_ajaran on master data wali_kelas for this school
      if (saveConfig.tahun_ajaran && saveConfig.tahun_ajaran.trim()) {
        const cleanTa = saveConfig.tahun_ajaran.trim();
        try {
          let wUpdateQ = supabase
            .from('wali_kelas')
            .update({ tahun_ajaran: cleanTa });
          if (targetSekolahId) {
            wUpdateQ = wUpdateQ.eq('sekolah_id', targetSekolahId);
          }
          await wUpdateQ;
        } catch (wErr) {
          console.warn('[AdminConfigView] Error syncing wali_kelas tahun_ajaran:', wErr);
        }

        try {
          const cachedWali = getStorageCache('Wali_Kelas', targetSekolahId);
          if (Array.isArray(cachedWali) && cachedWali.length > 0) {
            const updatedWali = cachedWali.map((w: any) => ({ ...w, tahun_ajaran: cleanTa }));
            setStorageCache('Wali_Kelas', targetSekolahId, updatedWali);
          }
        } catch (_) {}
      }

      // Realtime synchronization: dispatch local window custom events, storage event, and Supabase channel broadcast
      const syncPayload = {
        sekolah_id: targetSekolahId,
        tahun_ajaran: saveConfig.tahun_ajaran,
        semester: saveConfig.semester,
        aturan_kehadiran_guru: saveConfig.aturan_kehadiran_guru,
        exemptTeacherIds: exemptIds,
        timestamp: Date.now(),
        config: saveConfig
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sipjam:config_updated', { detail: syncPayload }));
        window.dispatchEvent(new CustomEvent('sipjam:guru_updated', { detail: syncPayload }));
        try {
          localStorage.setItem('sipjam_config_sync', JSON.stringify(syncPayload));
        } catch (_) {}
      }

      try {
        const topic = `school-config-${targetSekolahId}`;
        const existingChannel = supabase.getChannels().find(
          (c: any) => c.topic === `realtime:${topic}` || c.topic === topic
        );
        if (existingChannel && (existingChannel.state === 'joined' || (existingChannel as any).state === 'SUBSCRIBED')) {
          await existingChannel.send({
            type: 'broadcast',
            event: 'config_updated',
            payload: syncPayload
          });
        } else {
          const configChannel = supabase.channel(topic);
          await Promise.race([
            new Promise<void>((resolve) => {
              configChannel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  configChannel.send({
                    type: 'broadcast',
                    event: 'config_updated',
                    payload: syncPayload
                  }).finally(() => {
                    supabase.removeChannel(configChannel);
                    resolve();
                  });
                }
              });
            }),
            new Promise<void>((resolve) => setTimeout(() => {
              supabase.removeChannel(configChannel);
              resolve();
            }, 1500))
          ]);
        }
      } catch (broadcastErr) {
        console.warn('Realtime channel broadcast warning:', broadcastErr);
      }

      if (error) {
        showToast('Error', 'Gagal menyimpan pengaturan: ' + error.message, 'error');
      } else {
        showToast('Berhasil', 'Pengaturan berhasil disimpan!', 'success');
      }
    } catch (err) {
      showToast('Error', 'Gagal menyimpan: ' + (err as any).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isPengawasAktif = String(config.ttd_pengawas_aktif) === 'true';

  return (
    <section id="view-admin-config" className="view-section fade-in">
        <div className="glass-card p-5">
            <div className="flex flex-wrap justify-between items-center mb-5 gap-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <i className="fa-solid fa-gears text-gray-700 dark:text-gray-300 text-sm"></i> Konfigurasi Sistem
              </h2>
              <button
                type="button"
                onClick={() => setAccountModalOpen(true)}
                className="btn-click text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-xs"
              >
                <i className="fa-solid fa-user-gear text-xs"></i> Pengaturan Akun & Profil
              </button>
            </div>

            <ClayTabs
              items={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              className="mb-5"
            />

            {/* TAB 5: BACKUP & DATABASE (Standalone Keep-Alive & Embedding) */}
            <div className={activeTab === 'backup' ? 'block' : 'hidden'}>
              <AdminBackupView user={user} />
            </div>

            <form onSubmit={handleSave} noValidate className={activeTab === 'backup' ? 'hidden' : 'space-y-4'}>
              {/* TAB 1: UMUM & KALENDER */}
              <div className={activeTab === 'umum' ? 'space-y-4' : 'hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1 ml-1">TAHUN AJARAN</label>
                      <input type="text" name="tahun_ajaran" value={config.tahun_ajaran} onChange={handleChange} required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1 ml-1">SEMESTER</label>
                      <select name="semester" value={config.semester} onChange={handleChange} required className="w-full px-3 py-2.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                      </select>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase flex items-center gap-2"><i className="fa-regular fa-calendar text-xs text-blue-600 dark:text-blue-400"></i> Waktu Efektif</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Mulai Sem.</label><input type="date" name="waktu_efektif_mulai" value={config.waktu_efektif_mulai} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Akhir Sem.</label><input type="date" name="waktu_efektif_akhir" value={config.waktu_efektif_akhir} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Hari Sekolah / Minggu</label>
                      <select name="hari_sekolah" value={config.hari_sekolah} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        <option value="6">6 Hari (Senin - Sabtu)</option>
                        <option value="5">5 Hari (Senin - Jumat)</option>
                      </select>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1.5 flex items-start gap-1">
                        <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                        <span>
                          {config.hari_sekolah === '5'
                            ? 'Mode 5 hari kerja aktif: Hari Sabtu & Minggu otomatis menjadi hari libur. Guru tidak dapat melakukan presensi, mengisi jurnal, atau laporan piket pada hari tersebut.'
                            : 'Mode 6 hari kerja aktif: Hanya hari Minggu yang otomatis menjadi hari libur. Hari Sabtu adalah hari kerja normal.'
                          }
                        </span>
                      </p>
                    </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-purple-900 dark:text-purple-300 mb-3 uppercase flex items-center gap-2">
                      <i className="fa-brands fa-google-drive text-xs"></i> Integrasi Google Drive & Upload File
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                        Email Tujuan Upload Berkas (Target Email)
                      </label>
                      <input 
                        type="email" 
                        name="email_tujuan_upload" 
                        value={config.email_tujuan_upload || ''} 
                        onChange={handleChange} 
                        placeholder="Contoh: arsip.sekolah@gmail.com" 
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" 
                      />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 flex items-start gap-1">
                        <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                        <span>
                          Alamat email Google Drive tujuan penerima berkas foto selfie presensi, bukti jurnal, dan perangkat pembelajaran melalui integrasi Google Apps Script (GAS).
                        </span>
                      </p>
                    </div>
                </div>
              </div>

              {/* TAB 4: KEBIJAKAN GURU, TATA USAHA & KEPALA SEKOLAH */}
              <div className={activeTab === 'kehadiran' ? 'space-y-3' : 'hidden'}>
                <div className="bg-indigo-50/70 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded-2xl p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase flex items-center gap-2">
                        <i className="fa-solid fa-user-check text-xs"></i> Kebijakan Kehadiran Guru
                      </h3>
                      <select 
                        name="aturan_kehadiran_guru" 
                        value={config.aturan_kehadiran_guru} 
                        onChange={handleChange} 
                        required 
                        aria-label="Aturan Kehadiran Default Sekolah"
                        className="w-full sm:w-auto px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                      >
                        <option value="Semua_Hari">Default: Hadir Setiap Hari (Semua_Hari)</option>
                        <option value="Hari_Mengajar_Saja">Default: Sesuai Hari KBM (Hari_Mengajar_Saja)</option>
                      </select>
                    </div>

                    {/* Pengecualian Kehadiran Guru */}
                    <div className="pt-3 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                          <i className="fa-solid fa-user-gear text-xs text-indigo-600 dark:text-indigo-400"></i>
                          Pengecualian Kehadiran Guru
                        </h4>
                        <div className="grid grid-cols-1 xs:grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setExemptTeacherIds([]);
                              showToast('Kebijakan Kehadiran', 'Seluruh personel disetel Wajib Hadir Setiap Hari.', 'info');
                            }}
                            className="btn-click text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <i className="fa-solid fa-calendar-check text-[10px]"></i>
                            <span>Set Semua Hadir Setiap Hari</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const eligibleTeachers = guruList.filter(g => !isTuStaff(g) && !isKepsekStaff(g) && getTeacherKbmCount(g, jadwalList) > 0);
                              setExemptTeacherIds(eligibleTeachers.map(g => g.id).filter(Boolean));
                              showToast('Kebijakan Kehadiran', 'Seluruh guru berjadwal KBM disetel Hanya Hadir di Hari KBM.', 'info');
                            }}
                            className="btn-click text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <i className="fa-solid fa-graduation-cap text-[10px]"></i>
                            <span>Set Semua Hanya Hari KBM</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const eligibleTeachers = guruList.filter(g => !isTuStaff(g) && getTeacherKbmCount(g, jadwalList) > 0);
                              setExemptTeacherIds(eligibleTeachers.map(g => g.id).filter(Boolean));
                              showToast('Info Kebijakan', `${eligibleTeachers.length} Guru berjadwal disetel Hanya Hari KBM.`, 'info');
                            }}
                            className="btn-click text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                            <span>Otomatis Sesuai KBM</span>
                          </button>
                        </div>
                      </div>

                      {/* Filter & Search Ringkas */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="flex items-center gap-1 p-0.5 bg-gray-200/80 dark:bg-gray-800 rounded-xl text-[11px] font-semibold overflow-x-auto">
                            <button
                              type="button"
                              onClick={() => setAttendanceFilterTab('all')}
                              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                                attendanceFilterTab === 'all'
                                  ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              Semua ({guruList.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendanceFilterTab('setiap_hari')}
                              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                                attendanceFilterTab === 'setiap_hari'
                                  ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-xs font-bold'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              Setiap Hari ({guruList.filter(g => !exemptTeacherIds.includes(g.id) && !(g.nama_guru && exemptTeacherIds.includes(g.nama_guru)) && !(g.nip && g.nip !== '-' && exemptTeacherIds.includes(g.nip))).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendanceFilterTab('hanya_kbm')}
                              className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                                attendanceFilterTab === 'hanya_kbm'
                                  ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-bold'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              Sesuai KBM ({guruList.filter(g => exemptTeacherIds.includes(g.id) || (g.nama_guru && exemptTeacherIds.includes(g.nama_guru)) || (g.nip && g.nip !== '-' && exemptTeacherIds.includes(g.nip))).length})
                            </button>
                          </div>

                          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-[10px] font-semibold border border-gray-200 dark:border-gray-700">
                            {(['all', 'guru', 'tu', 'kepsek'] as const).map(role => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setRoleFilterTab(role)}
                                className={`px-2 py-1 rounded-lg transition whitespace-nowrap ${
                                  roleFilterTab === role
                                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                              >
                                {role === 'all' ? 'Semua Peran' : role === 'guru' ? 'Guru' : role === 'tu' ? 'TU' : 'Kepsek'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative w-full md:w-56">
                          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="text"
                            placeholder="Cari nama atau NIP..."
                            value={teacherSearch}
                            onChange={e => setTeacherSearch(e.target.value)}
                            className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Daftar Guru Sederhana & Responsif */}
                      <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 custom-scroll">
                        {guruList.length === 0 ? (
                          <div className="text-center py-6 text-[11px] text-gray-500 italic">
                            Tidak ada data guru ditemukan.
                          </div>
                        ) : (
                          guruList
                            .filter(g => {
                              const isExempt = exemptTeacherIds.includes(g.id) || (g.nama_guru && exemptTeacherIds.includes(g.nama_guru)) || (g.nip && g.nip !== '-' && exemptTeacherIds.includes(g.nip));
                              if (attendanceFilterTab === 'setiap_hari' && isExempt) return false;
                              if (attendanceFilterTab === 'hanya_kbm' && !isExempt) return false;
                              
                              const isTu = isTuStaff(g);
                              const isKepsek = isKepsekStaff(g);
                              if (roleFilterTab === 'guru' && (isTu || isKepsek)) return false;
                              if (roleFilterTab === 'tu' && !isTu) return false;
                              if (roleFilterTab === 'kepsek' && !isKepsek) return false;

                              const s = teacherSearch.trim().toLowerCase();
                              if (!s) return true;
                              return (
                                (g.nama_guru && g.nama_guru.toLowerCase().includes(s)) ||
                                (g.mata_pelajaran && g.mata_pelajaran.toLowerCase().includes(s)) ||
                                (g.nip && String(g.nip).toLowerCase().includes(s))
                              );
                            })
                            .map(g => {
                              const isTu = isTuStaff(g);
                              const isKepsek = isKepsekStaff(g);
                              const isBk = isBkStaff(g);
                              const linkedUser = resolveLinkedUserForTeacher(g, usersList);
                              const schedSummary = getTeacherScheduleSummary(g, jadwalList, linkedUser);
                              const kbmCount = schedSummary.totalJadwal;
                              const hariMengajarStr = schedSummary.hariMengajarList.join(', ');
                              const isExempt = exemptTeacherIds.includes(g.id) || (g.nama_guru && exemptTeacherIds.includes(g.nama_guru)) || (g.nip && g.nip !== '-' && exemptTeacherIds.includes(g.nip));
                              const roleMeta = isKepsek
                                ? 'Kepala Sekolah'
                                : isTu
                                ? 'Tata Usaha'
                                : isBk
                                ? 'Guru BK'
                                : kbmCount > 0
                                ? `KBM: ${hariMengajarStr || `${kbmCount} jadwal`}`
                                : 'Tanpa Jam KBM';
                              return (
                                <div
                                  key={g.id}
                                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-gray-50/80 dark:hover:bg-gray-800/60 transition"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                                      {g.nama_guru}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                      {roleMeta}{g.nip && g.nip !== '-' ? ` • ${g.nip}` : ''}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isExempt}
                                    onClick={() => {
                                      if (isExempt) {
                                        setExemptTeacherIds(prev => prev.filter(id => id !== g.id && id !== g.nama_guru && id !== g.nip));
                                      } else {
                                        setExemptTeacherIds(prev => [...prev, g.id]);
                                      }
                                    }}
                                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition cursor-pointer select-none ${
                                      isExempt
                                        ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                    title={isExempt ? 'Hanya Hari KBM' : 'Wajib Hadir Setiap Hari'}
                                  >
                                    <span
                                      className={`relative inline-block w-7 h-3.5 rounded-full transition-colors ${
                                        isExempt ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block w-2.5 h-2.5 transform bg-white rounded-full transition-transform shadow-2xs mt-0.5 ml-0.5 ${
                                          isExempt ? 'translate-x-3.5' : 'translate-x-0'
                                        }`}
                                      />
                                    </span>
                                    <span>{isExempt ? 'Sesuai KBM' : 'Setiap Hari'}</span>
                                  </button>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                </div>
              </div>

              {/* TAB 2: JAM KERJA & GPS */}
              <div className={activeTab === 'jam_kerja' ? 'space-y-4' : 'hidden'}>
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-3 uppercase flex items-center gap-2"><i className="fa-regular fa-clock text-xs"></i> Pengaturan Jam Presensi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Datang Buka</label><input type="time" name="jam_datang_mulai" value={config.jam_datang_mulai || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Batas Terlambat</label><input type="time" name="jam_datang_batas" value={config.jam_datang_batas || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Datang Tutup</label><input type="time" name="jam_datang_akhir" value={config.jam_datang_akhir || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Pulang Buka</label><input type="time" name="jam_pulang_mulai" value={config.jam_pulang_mulai || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div>
                          <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                            Jam Pulang Hari Jumat
                          </label>
                          <input 
                            type="time" 
                            name="jam_pulang_jumat" 
                            value={config.jam_pulang_jumat || '11:00'} 
                            onChange={handleChange} 
                            required 
                            className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium" 
                          />
                        </div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">Pulang Tutup</label><input type="time" name="jam_pulang_akhir" value={config.jam_pulang_akhir || ''} onChange={handleChange} required className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1">
                            <i className="fa-solid fa-user-clock text-amber-600 dark:text-amber-400"></i> Batas Intervensi Presensi Siswa
                          </label>
                          <input 
                            type="time" 
                            name="jam_batas_intervensi_siswa" 
                            value={config.jam_batas_intervensi_siswa || '08:00'} 
                            onChange={handleChange} 
                            required 
                            className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium" 
                          />
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                            Batas waktu intervensi presensi pagi siswa (default 08:00 WITA). Wali Kelas memiliki akses pagi diperpanjang hingga pk. 12:00 WITA.
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1">
                            <i className="fa-solid fa-stopwatch text-amber-600 dark:text-amber-400"></i> Akumulasi Telat & Penalti
                          </label>
                          <select
                            name="akumulasi_telat_aktif"
                            value={config.akumulasi_telat_aktif ?? 'true'}
                            onChange={handleChange}
                            className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                          >
                            <option value="true">Aktif (Penalti Alpa Otomatis)</option>
                            <option value="false">Nonaktif (Tanpa Penalti Alpa)</option>
                          </select>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                            Aktifkan atau nonaktifkan konversi akumulasi keterlambatan menjadi potongan Alpa otomatis.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-1">
                              Batas Telat (Jam)
                            </label>
                            <input
                              type="number"
                              name="batas_jam_penalti_telat"
                              min="0.5"
                              step="0.5"
                              value={config.batas_jam_penalti_telat ?? '4'}
                              onChange={handleChange}
                              disabled={String(config.akumulasi_telat_aktif) === 'false'}
                              required
                              className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium disabled:opacity-50"
                            />
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                              Default: 4 jam
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-900 dark:text-white mb-1">
                              Penalti (Hari Alpa)
                            </label>
                            <input
                              type="number"
                              name="jumlah_hari_penalti_telat"
                              min="1"
                              step="1"
                              value={config.jumlah_hari_penalti_telat ?? '1'}
                              onChange={handleChange}
                              disabled={String(config.akumulasi_telat_aktif) === 'false'}
                              required
                              className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium disabled:opacity-50"
                            />
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                              Default: 1 hari
                            </p>
                          </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 italic">
                      {String(config.akumulasi_telat_aktif) === 'false'
                        ? '* Penalti Alpa dari akumulasi keterlambatan dinonaktifkan. Jam keterlambatan tetap dicatat tanpa potongan hari Alpa otomatis.'
                        : `* Sistem akan menghitung akumulasi jam keterlambatan (Batas Terlambat). Setiap total ${config.batas_jam_penalti_telat || '4'} jam keterlambatan = ${config.jumlah_hari_penalti_telat || '1'} Hari Alpa otomatis.`}
                    </p>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-4">
                    <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                        <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase flex items-center gap-2">
                          <i className="fa-solid fa-location-dot text-xs"></i> Kordinat GPS Absensi
                        </h3>
                        <button 
                          type="button" 
                          onClick={handleDetectGps}
                          className="btn-click text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/70 px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-sm transition"
                        >
                          <i className="fa-solid fa-crosshairs text-xs"></i> Deteksi Lokasi Saat Ini
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Latitude</label>
                            <input type="text" name="gps_lat" value={config.gps_lat} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Longitude</label>
                            <input type="text" name="gps_lng" value={config.gps_lng} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Radius (Meter)</label>
                            <input type="number" name="gps_radius" value={config.gps_radius} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                    </div>
                </div>
              </div>

              {/* TAB 3: KOP & PEJABAT */}
              <div className={activeTab === 'kop' ? 'space-y-4' : 'hidden'}>
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-3 uppercase flex items-center gap-2"><i className="fa-solid fa-print text-xs"></i> Pengaturan Kop Surat</h3>
                    <div className="space-y-2.5">
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Nama Yayasan</label><input type="text" name="kop_yayasan" value={config.kop_yayasan} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Contoh: YAYASAN NIZAMUDIN" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Nama Sekolah</label><input type="text" name="kop_sekolah" value={config.kop_sekolah} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Alamat Lengkap</label><input type="text" name="kop_alamat" value={config.kop_alamat} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></div>
                        <div><label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">NPSN</label><input type="text" name="kop_npsn" value={config.kop_npsn} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Nomor Pokok Sekolah Nasional" /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kiri (Yayasan)</label>
                                <input type="text" name="logo_kiri" value={config.logo_kiri} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting / Google Drive" />
                                {config.logo_kiri && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Preview:</span>
                                    <img 
                                      src={transformGoogleDriveUrl(config.logo_kiri)} 
                                      alt="Preview Logo Kiri" 
                                      className="w-10 h-10 object-contain border border-gray-200 dark:border-gray-700 rounded bg-white p-0.5 shadow-sm" 
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                                    />
                                  </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kanan (Dinas)</label>
                                <input type="text" name="logo_kanan" value={config.logo_kanan} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting / Google Drive" />
                                {config.logo_kanan && (
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Preview:</span>
                                    <img 
                                      src={transformGoogleDriveUrl(config.logo_kanan)} 
                                      alt="Preview Logo Kanan" 
                                      className="w-10 h-10 object-contain border border-gray-200 dark:border-gray-700 rounded bg-white p-0.5 shadow-sm" 
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                                    />
                                  </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase flex items-center gap-2"><i className="fa-solid fa-signature text-xs text-blue-600 dark:text-blue-400"></i> Tanda Tangan Laporan & {formatKepalaSekolahLabel(config.status_kepala_sekolah)}</h3>
                    
                    {/* Penunjukan Akun Kepala Sekolah */}
                    <div className="mb-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
                        <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
                          <i className="fa-solid fa-user-tie text-blue-600 dark:text-blue-400"></i> Penunjukan {formatKepalaSekolahLabel(config.status_kepala_sekolah)} (Dari Data Guru)
                        </label>
                        <select
                          name="kepala_sekolah_id"
                          value={config.kepala_sekolah_id || ''}
                          onChange={handleKepsekChange}
                          className="w-full px-2.5 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                        >
                          <option value="">-- Pilih Guru yang Ditunjuk sebagai {formatKepalaSekolahLabel(config.status_kepala_sekolah)} --</option>
                          {guruList.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.nama_guru} {g.nip ? `(NIP: ${g.nip})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          Guru yang ditunjuk sebagai {formatKepalaSekolahLabel(config.status_kepala_sekolah)} memperoleh akses peninjauan/monitoring fitur Administrator (antara lain Rekap Presensi, Verifikasi, Analitik, Jurnal, dan Presensi Siswa) dalam mode read-only.
                        </p>
                    </div>

                    {/* Status Jabatan Kepala Sekolah: Definitif, Plt, Plh */}
                    <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5" htmlFor="status_kepala_sekolah">
                          Status Jabatan Kepala Sekolah
                        </label>
                        <select
                          id="status_kepala_sekolah"
                          name="status_kepala_sekolah"
                          value={normalizeStatusKepalaSekolah(config.status_kepala_sekolah || 'Definitif')}
                          onChange={handleChange}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                          data-testid="select-status-kepala-sekolah"
                        >
                          <option value="Definitif">Definitif</option>
                          <option value="Plt">Plt (Pelaksana Tugas)</option>
                          <option value="Plh">Plh (Pelaksana Harian)</option>
                        </select>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          Tentukan status jabatan Kepala Sekolah (Definitif, Plt, atau Plh). Selain status definitif, awalan status otomatis ditambahkan di depan tulisan Kepala Sekolah pada lembar cetak dokumen, rapor, dan rekapitulasi.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">
                              {config.status_kepala_sekolah && config.status_kepala_sekolah !== 'Definitif' ? `Nama ${formatKepalaSekolahLabel(config.status_kepala_sekolah)}` : 'Nama Kepala Sekolah'}
                            </label>
                            <input type="text" name="ttd_kepsek_nama" value={config.ttd_kepsek_nama} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">
                              {config.status_kepala_sekolah && config.status_kepala_sekolah !== 'Definitif' ? `NIP ${formatKepalaSekolahLabel(config.status_kepala_sekolah)}` : 'NIP Kepala Sekolah'}
                            </label>
                            <input type="text" name="ttd_kepsek_nip" value={config.ttd_kepsek_nip} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Kosongkan jika tidak ada" />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Nama Kota/Kabupaten</label>
                        <input type="text" name="kota_kabupaten" value={config.kota_kabupaten || config.kota_ttd || ''} onChange={handleChange} placeholder="Contoh: Kab. Bolaangmongondow Timur" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                    </div>

                    {/* Pengaturan Tanda Tangan Pengawas Bina */}
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div>
                                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <i className="fa-solid fa-user-check text-indigo-600 dark:text-indigo-400"></i>
                                    Opsi Tanda Tangan Pengawas Bina
                                </h4>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    Aktifkan pembubuhan tanda tangan Pengawas Bina pada seluruh laporan cetak (Jurnal Pembelajaran, Jurnal Kegiatan, dan Rekap Presensi).
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={isPengawasAktif}
                                onClick={handleTogglePengawas}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition select-none self-start sm:self-auto ${
                                    isPengawasAktif
                                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-200'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`relative inline-block w-8 h-4 rounded-full transition-colors duration-200 ease-in-out ${
                                        isPengawasAktif ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                                >
                                    <span
                                        className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform duration-200 ease-in-out shadow-xs mt-0.5 ml-0.5 ${
                                            isPengawasAktif ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                    />
                                </span>
                                <span>
                                    {isPengawasAktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </button>
                        </div>

                        {isPengawasAktif && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                                <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">
                                        Nama Lengkap Pengawas Bina
                                    </label>
                                    <input
                                        type="text"
                                        name="ttd_pengawas_nama"
                                        value={config.ttd_pengawas_nama}
                                        onChange={handleChange}
                                        required={isPengawasAktif}
                                        placeholder="Contoh: Drs. H. Ahmad Dahlan, M.Pd."
                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">
                                        NIP / NIK Pengawas Bina
                                    </label>
                                    <input
                                        type="text"
                                        name="ttd_pengawas_nip"
                                        value={config.ttd_pengawas_nip}
                                        onChange={handleChange}
                                        placeholder="Contoh: 19680512 199303 1 004"
                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">
                                        Jabatan / Sebutan Pengawas
                                    </label>
                                    <input
                                        type="text"
                                        name="ttd_pengawas_jabatan"
                                        value={config.ttd_pengawas_jabatan || ''}
                                        onChange={handleChange}
                                        placeholder="Contoh: Pengawas Pembina"
                                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-900/20 text-sm flex justify-center items-center gap-2 mt-4 transition disabled:opacity-50">
                {loading ? 'Menyimpan...' : <><i className="fa-solid fa-save"></i> Simpan Konfigurasi</>}
              </button>
            </form>
        </div>

        {/* Account Settings Modal */}
        <AccountSettingsModal 
          isOpen={accountModalOpen} 
          onClose={() => setAccountModalOpen(false)} 
          user={user} 
          onUserUpdated={(updated) => onUserUpdated && onUserUpdated(updated)}
        />
    </section>
  );
}
