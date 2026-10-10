import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Pengumuman } from '@/types/database';
import { AppUser } from '@/types/user';

export function useBroadcasts(
  user: AppUser | null,
  isAdmin: boolean,
  isWaliKelas: boolean,
  syncKey?: number
) {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState<boolean>(false);
  const [allAnnouncements, setAllAnnouncements] = useState<Pengumuman[]>([]);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState<Pengumuman[]>([]);
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  const myUserId = String(user?.id || user?.username || user?.nama || 'user');

  const fetchBroadcasts = async () => {
    try {
      let annQuery = supabase
        .from('pengumuman')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (user?.sekolah_id) {
        annQuery = annQuery.eq('sekolah_id', user.sekolah_id);
      }
      const { data: annData } = await annQuery;
      if (!annData) return;

      // Filter by sasaran for teachers
      let filtered = annData as Pengumuman[];
      if (!isAdmin) {
        filtered = filtered.filter(a => {
          if (!a.sasaran || a.sasaran === 'Semua') return true;
          if (a.sasaran === 'Guru') return true;
          if (isWaliKelas && a.sasaran === 'Wali Kelas') return true;
          return false;
        });
      }

      // Query read records
      let readQuery = supabase.from('pengumuman_dibaca').select('pengumuman_id');
      if (user?.sekolah_id) {
        readQuery = readQuery.eq('sekolah_id', user.sekolah_id);
      }
      readQuery = readQuery.or(
        `user_id.eq."${myUserId}",user_id.eq."${user?.id || ''}",user_id.eq."${user?.nama || ''}",user_id.eq."${user?.username || ''}"`
      );
      const { data: readData } = await readQuery;

      const newReadMap: Record<string, boolean> = {};
      (readData || []).forEach(r => {
        newReadMap[r.pengumuman_id] = true;
      });

      const unreadList = filtered.filter(a => !newReadMap[a.id]);
      setReadMap(newReadMap);
      setAllAnnouncements(filtered);
      setUnreadAnnouncements(unreadList);
      setUnreadCount(unreadList.length);
    } catch (err) {
      console.error('[AppScreen] Error fetching broadcasts:', err);
    }
  };

  useEffect(() => {
    fetchBroadcasts();

    const channelName = `realtime-broadcasts-${user?.sekolah_id || 'global'}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, () => {
        fetchBroadcasts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman_dibaca' }, () => {
        fetchBroadcasts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.sekolah_id, myUserId, isAdmin, isWaliKelas, syncKey]);

  const handleMarkAsRead = async (announcementId: string) => {
    try {
      const payload = {
        sekolah_id: user?.sekolah_id || '00000000-0000-0000-0000-000000000000',
        pengumuman_id: announcementId,
        user_id: myUserId,
        read_at: new Date().toISOString()
      };
      await supabase.from('pengumuman_dibaca').upsert([payload], { onConflict: 'sekolah_id,pengumuman_id,user_id' });
      setReadMap(prev => ({ ...prev, [announcementId]: true }));
      setUnreadAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[AppScreen] Error marking broadcast as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (unreadAnnouncements.length === 0) return;
      const inserts = unreadAnnouncements.map(a => ({
        sekolah_id: user?.sekolah_id || '00000000-0000-0000-0000-000000000000',
        pengumuman_id: a.id,
        user_id: myUserId,
        read_at: new Date().toISOString()
      }));
      await supabase.from('pengumuman_dibaca').upsert(inserts, { onConflict: 'sekolah_id,pengumuman_id,user_id' });
      const newMap = { ...readMap };
      unreadAnnouncements.forEach(a => {
        newMap[a.id] = true;
      });
      setReadMap(newMap);
      setUnreadAnnouncements([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('[AppScreen] Error marking all broadcasts as read:', err);
    }
  };

  return {
    unreadCount,
    broadcastModalOpen,
    setBroadcastModalOpen,
    allAnnouncements,
    unreadAnnouncements,
    readMap,
    handleMarkAsRead,
    handleMarkAllAsRead,
    fetchBroadcasts,
  };
}
