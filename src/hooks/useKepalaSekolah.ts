import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AppUser } from '@/types/user';

/**
 * Normalizes name strings by removing academic and honorary titles
 * (Dr., Drs., Dra., Ir., H., Hj., S.Pd., M.Pd., Gr., etc.)
 */
export function normalizeTeacherName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(',')[0] // remove trailing degrees after comma
    .replace(/\b(dr|drs|dra|ir|prof|h|hj|kh|ust|ustadz|ustadzah|spd|mpd|msi|mag|mm|kom|sn|sos|se)\b\.?/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pure evaluation helper to determine if a user is designated as Kepala Sekolah
 */
export function checkIsKepalaSekolah(
  user: AppUser | any | null,
  schoolData?: any,
  configData?: Record<string, any>
): boolean {
  if (!user) return false;

  // 1. Direct role check
  const roleNorm = (user.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  if (roleNorm === 'kepalasekolah' || roleNorm === 'kepsek') {
    return true;
  }
  if (user.is_kepala_sekolah === true || user.isKepalaSekolah === true) {
    return true;
  }

  // 2. Check designated teacher ID in school configuration or school profile
  const designatedId = configData?.kepala_sekolah_id || configData?.KEPALA_SEKOLAH_ID || schoolData?.kepala_sekolah_id;
  if (designatedId && (user.id === designatedId || user.guru_id === designatedId)) {
    return true;
  }

  // 3. Check NIP match against headmaster NIP
  const kepsekNip = (
    configData?.ttd_kepsek_nip || 
    configData?.NIP_KEPALA_SEKOLAH || 
    schoolData?.nip_kepala_sekolah || 
    ''
  ).trim();
  if (kepsekNip && kepsekNip !== '-' && (user.username === kepsekNip || user.nip === kepsekNip)) {
    return true;
  }

  // 4. Check name match against headmaster name
  const kepsekNama = configData?.ttd_kepsek_nama || configData?.NAMA_KEPALA_SEKOLAH || schoolData?.nama_kepala_sekolah || '';
  if (kepsekNama && (user.nama || user.name)) {
    const normKepsek = normalizeTeacherName(kepsekNama);
    const normUser = normalizeTeacherName(user.nama || user.name);
    if (normKepsek && normUser && (normKepsek === normUser || normKepsek.includes(normUser) || normUser.includes(normKepsek))) {
      return true;
    }
  }

  return false;
}

/**
 * React hook to reactively resolve whether the active user is Kepala Sekolah
 */
export function useKepalaSekolah(
  user: AppUser | null,
  schoolData?: any,
  syncKey?: number
) {
  const [isKepalaSekolah, setIsKepalaSekolah] = useState<boolean>(() => {
    return checkIsKepalaSekolah(user, schoolData);
  });

  useEffect(() => {
    // Initial direct synchronous check
    if (checkIsKepalaSekolah(user, schoolData)) {
      setIsKepalaSekolah(true);
      return;
    }

    let isMounted = true;

    const verifyFromDatabase = async () => {
      try {
        const sekolahId = user?.sekolah_id || schoolData?.id;
        if (!sekolahId) return;

        // Fetch settings from pengaturan
        const { data: configItems } = await supabase
          .from('pengaturan')
          .select('*')
          .eq('sekolah_id', sekolahId);

        const configMap: Record<string, any> = {};
        if (configItems && configItems.length > 0) {
          configItems.forEach(item => {
            configMap[item.key] = item.value;
          });
        }

        if (checkIsKepalaSekolah(user, schoolData, configMap)) {
          if (isMounted) setIsKepalaSekolah(true);
          return;
        }

        // Also check if the teacher record in data_guru has is_kepala_sekolah or jabatan 'Kepala Sekolah'
        if (user?.id || user?.nama || user?.username) {
          const cleanNama = (user?.nama || '').split(',')[0].trim();
          const { data: gData } = await supabase
            .from('data_guru')
            .select('*')
            .or(`user_id.eq.${user?.id || '00000000-0000-0000-0000-000000000000'},id.eq.${user?.id || '00000000-0000-0000-0000-000000000000'},nama_guru.eq."${cleanNama}"`);

          if (gData && gData.length > 0) {
            const g = gData[0] as any;
            if (
              g.is_kepala_sekolah === true || 
              g.is_kepala_sekolah === 'true' ||
              (g.jabatan && g.jabatan.toLowerCase().includes('kepala sekolah'))
            ) {
              if (isMounted) setIsKepalaSekolah(true);
              return;
            }
          }
        }

        if (isMounted) setIsKepalaSekolah(false);
      } catch (err) {
        console.warn('[useKepalaSekolah] Error verifying Kepala Sekolah:', err);
      }
    };

    verifyFromDatabase();

    const handleConfigUpdate = () => {
      verifyFromDatabase();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sipjam:config_updated', handleConfigUpdate);
      window.addEventListener('sipjam:guru_updated', handleConfigUpdate);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('sipjam:config_updated', handleConfigUpdate);
        window.removeEventListener('sipjam:guru_updated', handleConfigUpdate);
      }
    };
  }, [user?.id, user?.role, user?.nama, user?.username, user?.sekolah_id, schoolData, syncKey]);

  return { isKepalaSekolah };
}
