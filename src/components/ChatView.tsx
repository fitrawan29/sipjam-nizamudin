'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ChatMessage } from '@/types/database';
import Swal from 'sweetalert2';

interface ChatViewProps {
  user: any;
}

interface Colleague {
  id: string;
  nama_guru: string;
  nip?: string | null;
  mata_pelajaran?: string | null;
  email?: string | null;
  no_hp?: string | null;
}

export default function ChatView({ user }: ChatViewProps) {
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [activePartner, setActivePartner] = useState<Colleague | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingColleagues, setLoadingColleagues] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [lastMsgMap, setLastMsgMap] = useState<Record<string, { text: string; time: string }>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activePartnerRef = useRef<Colleague | null>(null);

  // Keep ref synchronized for realtime callback
  useEffect(() => {
    activePartnerRef.current = activePartner;
  }, [activePartner]);

  const myId = String(user?.id || user?.username || user?.nama || 'anon');
  const myNama = String(user?.nama || user?.username || 'Pengguna');

  // 1. Fetch colleagues list & unread count
  useEffect(() => {
    fetchColleagues();
  }, [user?.sekolah_id, myId]);

  const fetchColleagues = async () => {
    try {
      setLoadingColleagues(true);
      let query = supabase.from('data_guru').select('id, nama_guru, nip, mata_pelajaran, email, no_hp').order('nama_guru');
      if (user?.sekolah_id) {
        query = query.eq('sekolah_id', user.sekolah_id);
      }
      const { data, error } = await query;
      if (error) {
        console.error('[ChatView] Error fetching colleagues:', error);
      } else if (data) {
        // Filter out current user
        const filtered = (data as Colleague[]).filter(c => {
          if (user?.id && c.id === user.id) return false;
          if (user?.nama && c.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim()) return false;
          if (user?.username && c.nip && c.nip === user.username) return false;
          return true;
        });
        setColleagues(filtered);

        // Fetch recent messages overview to compute unread and last messages
        fetchRecentChatOverview(filtered);
      }
    } catch (err) {
      console.error('[ChatView] Load exception:', err);
    } finally {
      setLoadingColleagues(false);
    }
  };

  const fetchRecentChatOverview = async (colleagueList: Colleague[]) => {
    try {
      let q = supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(200);
      if (user?.sekolah_id) {
        q = q.eq('sekolah_id', user.sekolah_id);
      }
      const { data, error } = await q;
      if (error || !data) return;

      const unread: Record<string, number> = {};
      const lastMsg: Record<string, { text: string; time: string }> = {};

      for (const msg of data as ChatMessage[]) {
        const partnerKey = msg.sender_id === myId || msg.sender_nama === myNama ? msg.recipient_id : msg.sender_id;
        
        // Track last message per partner
        if (!lastMsg[partnerKey]) {
          lastMsg[partnerKey] = {
            text: msg.pesan,
            time: msg.created_at || ''
          };
        }

        // Count unread messages sent TO me
        if ((msg.recipient_id === myId || msg.recipient_nama === myNama) && !msg.is_read) {
          unread[msg.sender_id] = (unread[msg.sender_id] || 0) + 1;
        }
      }

      setUnreadMap(unread);
      setLastMsgMap(lastMsg);
    } catch (err) {
      console.error('[ChatView] Overview exception:', err);
    }
  };

  // 2. Load conversation messages when active partner changes
  useEffect(() => {
    if (!activePartner) {
      setMessages([]);
      return;
    }

    loadConversation(activePartner);
  }, [activePartner?.id]);

  const loadConversation = async (partner: Colleague) => {
    try {
      setLoadingMessages(true);
      const partnerId = partner.id;

      // Query conversation messages between myId and partnerId
      let q = supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq."${myId}",recipient_id.eq."${partnerId}"),` +
          `and(sender_id.eq."${partnerId}",recipient_id.eq."${myId}"),` +
          `and(sender_nama.eq."${myNama}",recipient_nama.eq."${partner.nama_guru}"),` +
          `and(sender_nama.eq."${partner.nama_guru}",recipient_nama.eq."${myNama}")`
        )
        .order('created_at', { ascending: true });

      if (user?.sekolah_id) {
        q = q.eq('sekolah_id', user.sekolah_id);
      }

      const { data, error } = await q;
      if (error) {
        console.error('[ChatView] Conversation error:', error);
      } else if (data) {
        setMessages(data as ChatMessage[]);

        // Mark incoming messages as read
        const unreadIds = (data as ChatMessage[])
          .filter(m => (m.recipient_id === myId || m.recipient_nama === myNama) && !m.is_read)
          .map(m => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadIds);

          // Clear unread count for this partner
          setUnreadMap(prev => ({ ...prev, [partnerId]: 0 }));
        }
      }
    } catch (err) {
      console.error('[ChatView] Error loading conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // 3. Supabase Realtime Subscription for incoming chat messages
  useEffect(() => {
    const channelName = `realtime-chat-${user?.sekolah_id || 'global'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;

          // Tenant guard
          if (user?.sekolah_id && newMsg.sekolah_id && newMsg.sekolah_id !== user.sekolah_id) {
            return;
          }

          const currentPartner = activePartnerRef.current;
          const currentPartnerId = currentPartner?.id;
          const currentPartnerNama = currentPartner?.nama_guru;

          const isForActiveConversation =
            currentPartner &&
            ((newMsg.sender_id === currentPartnerId && (newMsg.recipient_id === myId || newMsg.recipient_nama === myNama)) ||
              (newMsg.sender_id === myId && (newMsg.recipient_id === currentPartnerId || newMsg.recipient_nama === currentPartnerNama)) ||
              (newMsg.sender_nama === currentPartnerNama && (newMsg.recipient_id === myId || newMsg.recipient_nama === myNama)) ||
              (newMsg.sender_nama === myNama && (newMsg.recipient_id === currentPartnerId || newMsg.recipient_nama === currentPartnerNama)));

          if (isForActiveConversation) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            // Automatically mark read if open
            if (newMsg.recipient_id === myId || newMsg.recipient_nama === myNama) {
              supabase.from('chat_messages').update({ is_read: true }).eq('id', newMsg.id).then();
            }
          } else {
            // Not active conversation - increment unread badge if addressed to me
            if (newMsg.recipient_id === myId || newMsg.recipient_nama === myNama) {
              setUnreadMap(prev => ({
                ...prev,
                [newMsg.sender_id]: (prev[newMsg.sender_id] || 0) + 1
              }));
            }
          }

          // Update last message preview
          const partnerKey = newMsg.sender_id === myId ? newMsg.recipient_id : newMsg.sender_id;
          setLastMsgMap(prev => ({
            ...prev,
            [partnerKey]: { text: newMsg.pesan, time: newMsg.created_at || new Date().toISOString() }
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.sekolah_id, myId, myNama]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 4. Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartner || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const payload = {
        sekolah_id: user?.sekolah_id,
        sender_id: myId,
        sender_nama: myNama,
        recipient_id: activePartner.id,
        recipient_nama: activePartner.nama_guru,
        pesan: messageText,
        is_read: false
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('[ChatView] Send error:', error);
        Swal.fire('Gagal Mengirim', error.message || 'Terjadi kesalahan saat mengirim pesan.', 'error');
        setInputText(messageText); // Restore on error
      } else if (data) {
        // Optimistically ensure message is in state if realtime has slight delay
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data as ChatMessage];
        });

        setLastMsgMap(prev => ({
          ...prev,
          [activePartner.id]: { text: messageText, time: data.created_at || new Date().toISOString() }
        }));
      }
    } catch (err: any) {
      console.error('[ChatView] Send exception:', err);
      Swal.fire('Error', err.message || 'Gagal mengirim pesan.', 'error');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const filteredColleagues = colleagues.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.nama_guru.toLowerCase().includes(q) ||
      (c.mata_pelajaran && c.mata_pelajaran.toLowerCase().includes(q)) ||
      (c.nip && c.nip.toLowerCase().includes(q))
    );
  });

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateLabel = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="glass-card overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-nizamudin-green to-emerald-800 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-base shadow-inner">
            <i className="fa-solid fa-comments"></i>
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold leading-tight">Chat Rekan Guru</h1>
            <p className="text-[11px] text-emerald-100/90 font-medium">Komunikasi real-time civitas sekolah</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-900/60 text-emerald-200 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Realtime Aktif
          </span>
        </div>
      </div>

      {/* Main Grid: Sidebar + Chat Pane */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Colleague List (Visible on desktop or when no partner is selected on mobile) */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/60 dark:bg-slate-900/40 ${
            activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Box */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama guru / mapel..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>

          {/* Colleague Scroll List */}
          <div className="flex-1 overflow-y-auto custom-scroll divide-y divide-slate-100 dark:divide-slate-800/60">
            {loadingColleagues ? (
              <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <i className="fa-solid fa-circle-notch fa-spin text-lg text-emerald-600"></i>
                Memuat daftar rekan guru...
              </div>
            ) : filteredColleagues.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <i className="fa-solid fa-user-slash text-2xl mb-2 text-slate-300 dark:text-slate-700 block"></i>
                Tidak ada rekan guru ditemukan.
              </div>
            ) : (
              filteredColleagues.map(colleague => {
                const isSelected = activePartner?.id === colleague.id;
                const unreadCount = unreadMap[colleague.id] || 0;
                const lastMsg = lastMsgMap[colleague.id];

                return (
                  <button
                    key={colleague.id}
                    type="button"
                    onClick={() => setActivePartner(colleague)}
                    className={`w-full text-left p-3 flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {colleague.nama_guru.charAt(0).toUpperCase()}
                      </div>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-md animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Colleague Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {colleague.nama_guru}
                        </h4>
                        {lastMsg?.time && (
                          <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                            {formatTime(lastMsg.time)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {lastMsg ? lastMsg.text : colleague.mata_pelajaran || 'Guru'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Conversation Pane */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${
            !activePartner ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activePartner ? (
            <>
              {/* Partner Conversation Header */}
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    type="button"
                    onClick={() => setActivePartner(null)}
                    className="md:hidden w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs"
                    title="Kembali ke daftar rekan"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>

                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {activePartner.nama_guru.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {activePartner.nama_guru}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {activePartner.mata_pelajaran ? `Mapel: ${activePartner.mata_pelajaran}` : (activePartner.nip ? `NIP: ${activePartner.nip}` : 'Rekan Guru')}
                    </p>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[11px] text-slate-400">Pesan terenkripsi via Supabase Realtime</span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-3 bg-slate-50/30 dark:bg-slate-950/20">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2 text-emerald-600"></i>
                    Memuat percakapan...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl mb-2">
                      <i className="fa-regular fa-comment-dots"></i>
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada riwayat pesan</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                      Kirim pesan pertama Anda untuk memulai koordinasi dengan {activePartner.nama_guru}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === myId || msg.sender_nama === myNama;
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showDateSeparator =
                      !prevMsg ||
                      new Date(msg.created_at || '').toDateString() !== new Date(prevMsg.created_at || '').toDateString();

                    return (
                      <div key={msg.id || idx} className="space-y-2">
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-xs">
                              {formatDateLabel(msg.created_at)}
                            </span>
                          </div>
                        )}

                        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-xs relative group ${
                              isMe
                                ? 'bg-gradient-to-r from-nizamudin-green to-emerald-700 text-white rounded-br-none'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-bl-none'
                            }`}
                          >
                            {!isMe && (
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">
                                {msg.sender_nama}
                              </p>
                            )}
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.pesan}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                                isMe ? 'text-emerald-200/80' : 'text-slate-400'
                              }`}
                            >
                              <span>{formatTime(msg.created_at)}</span>
                              {isMe && (
                                <i
                                  className={`fa-solid ${
                                    msg.is_read ? 'fa-check-double text-emerald-300' : 'fa-check text-emerald-200/60'
                                  }`}
                                  title={msg.is_read ? 'Telah dibaca' : 'Terkirim'}
                                ></i>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={`Tulis pesan untuk ${activePartner.nama_guru}...`}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="btn-click px-4 py-2 rounded-xl bg-nizamudin-green hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {sending ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane text-xs"></i>
                      <span className="hidden sm:inline">Kirim</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Empty State when no partner is selected */
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-2xl mb-3 shadow-inner">
                <i className="fa-solid fa-comments"></i>
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Pilih Rekan Guru untuk Berkirim Pesan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Pilih salah satu guru dari daftar di sebelah kiri untuk membuka percakapan real-time dua arah.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
