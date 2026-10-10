import { useState, useEffect } from 'react';
import { getGuruDailyState } from '@/lib/workflow';
import { AppUser } from '@/types/user';

export function usePiket(
  user: AppUser | null,
  isAdmin: boolean,
  isSuperadmin: boolean,
  syncKey?: number
) {
  const [isPiketHariIni, setIsPiketHariIni] = useState<boolean>(isAdmin || isSuperadmin);

  useEffect(() => {
    if (isAdmin || isSuperadmin) {
      setIsPiketHariIni(true);
      return;
    }
    if (!user) {
      setIsPiketHariIni(false);
      return;
    }

    let isMounted = true;
    const checkPiket = async () => {
      try {
        const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
        if (isMounted) {
          setIsPiketHariIni(Boolean(state?.isPiket));
        }
      } catch (err) {
        console.error('[AppScreen] Error verifying piket hari ini:', err);
        if (isMounted) setIsPiketHariIni(false);
      }
    };

    checkPiket();
    return () => { isMounted = false; };
  }, [user, isAdmin, isSuperadmin, syncKey]);

  return { isPiketHariIni };
}
