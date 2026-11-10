import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AppUser } from '@/types/user';
import { isMatchingWaliGuru } from '@/lib/presensiIntervensi';

export function useWaliKelas(
  user: AppUser | null,
  isAdmin: boolean,
  syncKey?: number
) {
  const [isWaliKelas, setIsWaliKelas] = useState<boolean>(isAdmin);
  const [assignedKelas, setAssignedKelas] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      setIsWaliKelas(true);
      return;
    }

    const directWali = user?.wali_kelas || (user as any)?.penugasan?.kelas_binaan || (user as any)?.penugasan?.kelas || (user as any)?.penugasan?.nama_kelas || (user as any)?.penugasan?.assignedKelas || (user as any)?.penugasan?.wali_kelas || (user as any)?.kelas_binaan || (user as any)?.assignedKelas || (user as any)?.assigned_kelas || (user as any)?.waliKelas || (user as any)?.nama_kelas || (user as any)?.kelas_wali;
    if (directWali) {
      setIsWaliKelas(true);
      const parsed = typeof directWali === 'string' ? directWali : (directWali.kelas || directWali.nama_kelas || directWali.kelas_binaan || null);
      setAssignedKelas(parsed);
      return;
    }

    const checkWaliKelas = async () => {
      try {
        let query = supabase.from('wali_kelas').select('*');
        if (user?.sekolah_id) {
          query = query.eq('sekolah_id', user.sekolah_id);
        }
        const { data } = await query;
        if (data && data.length > 0) {
          const found = data.find(w => isMatchingWaliGuru(user, w));
          if (found) {
            setIsWaliKelas(true);
            setAssignedKelas(found.kelas);
            return;
          }
        }

        // Also check data_guru for wali_kelas field
        if (user?.id || user?.nama) {
          const cleanNama = (user?.nama || '').split(',')[0].trim();
          const { data: gData } = await supabase
            .from('data_guru')
            .select('*')
            .or(`user_id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},id.eq.${user.id || '00000000-0000-0000-0000-000000000000'},nama_guru.eq."${cleanNama}"`);
          if (gData && gData.length > 0) {
            const g = gData[0] as any;
            if (g.wali_kelas) {
              setIsWaliKelas(true);
              setAssignedKelas(typeof g.wali_kelas === 'string' ? g.wali_kelas : (g.wali_kelas.kelas || null));
              return;
            }
          }
        }
      } catch (err) {
        console.error('[AppScreen] Error verifying wali kelas:', err);
      }
    };

    checkWaliKelas();
  }, [user, isAdmin, syncKey]);

  return { isWaliKelas, assignedKelas };
}
