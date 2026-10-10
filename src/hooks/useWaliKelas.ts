import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { AppUser } from '@/types/user';

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

    if (user?.wali_kelas) {
      setIsWaliKelas(true);
      setAssignedKelas(typeof user.wali_kelas === 'string' ? user.wali_kelas : (user.wali_kelas.kelas || null));
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
          const found = data.find(w => 
            (user?.id && w.guru_id === user.id) ||
            (user?.nama && w.nama_guru && w.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim()) ||
            (user?.username && w.nip && w.nip === user.username)
          );
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
