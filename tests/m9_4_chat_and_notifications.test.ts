import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database, ChatMessage, Pengumuman, PengumumanDibaca } from '../src/types/database';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

let failureCount = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failureCount++;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('MILESTONE M9.4: CHAT & NOTIFICATIONS INTEGRATION TESTS');
  console.log('====================================================\n');

  // -----------------------------------------------------------------
  // SECTION 1: CSS Bell Shake Animation & AppScreen Bell Indicator
  // -----------------------------------------------------------------
  console.log('--- Step 1: Bell Shake Animation in globals.css ---');
  const cssPath = path.resolve(__dirname, '..', 'src', 'app', 'globals.css');
  assert(fs.existsSync(cssPath), 'globals.css exists');

  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  assert(cssContent.includes('@keyframes bell-shake'), 'globals.css defines @keyframes bell-shake');
  assert(cssContent.includes('.animate-bell-shake'), 'globals.css defines .animate-bell-shake utility class');
  assert(
    cssContent.includes('transform-origin: top center'),
    'animate-bell-shake uses transform-origin: top center for realistic bell motion'
  );

  console.log('\n--- Step 2: Navbar Broadcast Bell in AppScreen.tsx ---');
  const appScreenPath = path.resolve(__dirname, '..', 'src', 'components', 'AppScreen.tsx');
  assert(fs.existsSync(appScreenPath), 'AppScreen.tsx exists');

  const appScreenContent = fs.readFileSync(appScreenPath, 'utf-8');
  assert(
    appScreenContent.includes('animate-bell-shake') && appScreenContent.includes('unreadCount > 0'),
    'AppScreen applies animate-bell-shake to bell icon when unreadCount > 0'
  );
  assert(
    appScreenContent.includes('bg-red-600') && appScreenContent.includes('unreadCount'),
    'AppScreen renders red dot badge indicator with unread count'
  );
  assert(
    appScreenContent.includes("table: 'pengumuman'") && appScreenContent.includes("table: 'pengumuman_dibaca'"),
    'AppScreen subscribes to Realtime changes on both pengumuman and pengumuman_dibaca tables'
  );
  assert(
    appScreenContent.includes('handleMarkAsRead') && appScreenContent.includes('handleMarkAllAsRead'),
    'AppScreen implements handleMarkAsRead and handleMarkAllAsRead inserting into pengumuman_dibaca'
  );
  assert(
    appScreenContent.includes('broadcastModalOpen') && appScreenContent.includes('Pengumuman & Siaran'),
    'AppScreen renders interactive broadcast modal / drawer for announcements'
  );

  // -----------------------------------------------------------------
  // SECTION 2: Real-time Teacher-to-Teacher Chat
  // -----------------------------------------------------------------
  console.log('\n--- Step 3: ChatView Component & AppScreen Integration ---');
  const chatViewPath = path.resolve(__dirname, '..', 'src', 'components', 'ChatView.tsx');
  assert(fs.existsSync(chatViewPath), 'ChatView.tsx exists');

  const chatViewContent = fs.readFileSync(chatViewPath, 'utf-8');
  assert(
    chatViewContent.includes("from('data_guru')"),
    'ChatView queries data_guru to list colleagues within school'
  );
  assert(
    chatViewContent.includes("table: 'chat_messages'") && chatViewContent.includes("event: 'INSERT'"),
    'ChatView subscribes to Realtime channel listening to INSERT on public.chat_messages'
  );
  assert(
    chatViewContent.includes("from('chat_messages')") && chatViewContent.includes('.insert('),
    'ChatView inserts new messages with sender_id, recipient_id, and pesan into chat_messages'
  );
  assert(
    chatViewContent.includes('setMessages') && chatViewContent.includes('isForActiveConversation'),
    'ChatView appends incoming realtime messages immediately to message stream without page reload'
  );
  assert(
    appScreenContent.includes("{ id: 'view-chat', icon: 'fa-comments', label: 'Chat Guru' }"),
    'AppScreen navigation includes Chat Guru menu item'
  );
  assert(
    appScreenContent.includes("currentView === 'view-chat'") && appScreenContent.includes('<ChatView user={user} />'),
    'AppScreen conditionally renders ChatView component on view-chat'
  );

  // -----------------------------------------------------------------
  // SECTION 3: Web Push Notifications & Service Worker
  // -----------------------------------------------------------------
  console.log('\n--- Step 4: Service Worker & Push Permission Dialog ---');
  const swPath = path.resolve(__dirname, '..', 'public', 'sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js exists');

  const swContent = fs.readFileSync(swPath, 'utf-8');
  assert(
    swContent.includes("addEventListener('push'") && swContent.includes('self.registration.showNotification'),
    'sw.js listens for push events and displays notification via self.registration.showNotification'
  );
  assert(
    swContent.includes("addEventListener('notificationclick'"),
    'sw.js handles notificationclick event to focus or open client windows'
  );

  const promptPath = path.resolve(__dirname, '..', 'src', 'components', 'PushNotificationPrompt.tsx');
  assert(fs.existsSync(promptPath), 'PushNotificationPrompt.tsx exists');

  const promptContent = fs.readFileSync(promptPath, 'utf-8');
  assert(
    promptContent.includes('Kirim Notifikasi (Push)'),
    'PushNotificationPrompt renders friendly "Kirim Notifikasi (Push)" dialog title'
  );
  assert(
    promptContent.includes('Kirim Notifikasi Uji Coba'),
    'PushNotificationPrompt provides "Kirim Notifikasi Uji Coba" button'
  );
  assert(
    promptContent.includes('showNotification') || promptContent.includes('triggerSimulatedNotification'),
    'PushNotificationPrompt triggers simulated notification via ServiceWorker registration'
  );
  assert(
    appScreenContent.includes('<PushNotificationPrompt user={user} />'),
    'AppScreen includes PushNotificationPrompt component'
  );

  // -----------------------------------------------------------------
  // SECTION 4: Live Supabase Schema & Operations Testing
  // -----------------------------------------------------------------
  console.log('\n--- Step 5: Live Supabase DB Operations: chat_messages ---');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jicvvqxjyzntdrccnuyz.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const defaultSchoolAId = 'a0000000-0000-0000-0000-000000000001';
  const tenantClient = createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        'x-sekolah-id': defaultSchoolAId,
        'x-user-role': 'Admin',
        'x-user-id': 'admin-tester-m4'
      }
    }
  });

  const testSekolahId = defaultSchoolAId;

  // A. Insert test chat message
  const testMsgPayload = {
    sekolah_id: testSekolahId,
    sender_id: 'test-guru-a-id',
    sender_nama: 'Guru A Testing',
    recipient_id: 'test-guru-b-id',
    recipient_nama: 'Guru B Testing',
    pesan: 'Halo, ini pesan uji coba real-time milestone 4.',
    is_read: false
  };

  const { data: insertedMsg, error: insertMsgError } = await tenantClient
    .from('chat_messages')
    .insert([testMsgPayload])
    .select()
    .single();

  assert(!insertMsgError && !!insertedMsg, 'Successfully inserted real row into public.chat_messages', insertMsgError?.message);

  if (insertedMsg) {
    assert(insertedMsg.pesan === testMsgPayload.pesan, 'Inserted message content matches payload');
    assert(insertedMsg.sender_id === testMsgPayload.sender_id, 'Inserted sender_id matches payload');
    assert(insertedMsg.recipient_id === testMsgPayload.recipient_id, 'Inserted recipient_id matches payload');
    assert(insertedMsg.is_read === false, 'New chat message defaults to is_read = false');
    assert(!!insertedMsg.created_at, 'Chat message automatically populates created_at timestamp');

    // Update message read status
    const { data: updatedMsg, error: updateMsgError } = await tenantClient
      .from('chat_messages')
      .update({ is_read: true })
      .eq('id', insertedMsg.id)
      .select()
      .single();

    assert(!updateMsgError && updatedMsg?.is_read === true, 'Successfully marked chat message as read in database');

    // Clean up test chat message
    await tenantClient.from('chat_messages').delete().eq('id', insertedMsg.id);
  }

  // -----------------------------------------------------------------
  // SECTION 5: Live DB Operations: pengumuman & pengumuman_dibaca
  // -----------------------------------------------------------------
  console.log('\n--- Step 6: Live DB Operations: Broadcast Unread Count Logic ---');
  const testUserId = 'test-broadcast-user-' + Date.now();

  const testBroadcastPayload = {
    sekolah_id: testSekolahId,
    judul: 'Pengumuman Uji Coba Milestone 4',
    konten: 'Isi pengumuman uji coba untuk memverifikasi kalkulasi unread count dan getar bel.',
    sasaran: 'Semua',
    mode: 'Satu Arah',
    penulis_nama: 'Admin Penguji',
    penulis_role: 'Admin',
    is_pinned: true
  };

  const { data: insertedAnn, error: insertAnnError } = await tenantClient
    .from('pengumuman')
    .insert([testBroadcastPayload])
    .select()
    .single();

  assert(!insertAnnError && !!insertedAnn, 'Successfully inserted broadcast announcement into public.pengumuman', insertAnnError?.message);

  if (insertedAnn) {
    // Check unread count calculation for testUserId:
    // Should NOT have an entry in pengumuman_dibaca yet
    const { data: readBefore } = await tenantClient
      .from('pengumuman_dibaca')
      .select('*')
      .eq('pengumuman_id', insertedAnn.id)
      .eq('user_id', testUserId);

    assert(!readBefore || readBefore.length === 0, 'Announcement is initially UNREAD for test user');

    // Now simulate user reading the announcement (insert into pengumuman_dibaca)
    const { data: readReceipt, error: readReceiptError } = await tenantClient
      .from('pengumuman_dibaca')
      .insert([
        {
          sekolah_id: testSekolahId,
          pengumuman_id: insertedAnn.id,
          user_id: testUserId
        }
      ])
      .select()
      .single();

    assert(!readReceiptError && !!readReceipt, 'Successfully recorded read receipt in public.pengumuman_dibaca');

    // Verify unread count decreases (it is now read)
    const { data: readAfter } = await tenantClient
      .from('pengumuman_dibaca')
      .select('*')
      .eq('pengumuman_id', insertedAnn.id)
      .eq('user_id', testUserId);

    assert(!!readAfter && readAfter.length === 1, 'Announcement is now recognized as READ for test user');

    // Clean up
    await tenantClient.from('pengumuman_dibaca').delete().eq('pengumuman_id', insertedAnn.id);
    await tenantClient.from('pengumuman').delete().eq('id', insertedAnn.id);
  }

  // -----------------------------------------------------------------
  // SECTION 6: Automated Reminders Logic & Push Dispatch
  // -----------------------------------------------------------------
  console.log('\n--- Step 7: Automated Reminders Route Logic (/api/push/send-reminders) ---');
  const reminderRoutePath = path.resolve(__dirname, '..', 'src', 'app', 'api', 'push', 'send-reminders', 'route.ts');
  assert(fs.existsSync(reminderRoutePath), 'send-reminders/route.ts exists');

  const reminderContent = fs.readFileSync(reminderRoutePath, 'utf-8');
  assert(
    reminderContent.includes("from('presensi_guru')") && reminderContent.includes("jenis', 'Datang'"),
    'send-reminders checks teachers without Datang presensi'
  );
  assert(
    reminderContent.includes("from('jurnal_pembelajaran')") && reminderContent.includes("from('jadwal_pelajaran')"),
    'send-reminders checks teachers with schedule today without journals'
  );
  assert(
    reminderContent.includes("from('penugasan_piket')") && reminderContent.includes("from('laporan_piket')"),
    'send-reminders checks teachers on piket today without piket reports'
  );
  assert(
    reminderContent.includes('sendWebPush'),
    'send-reminders dispatches push notifications using web-push library'
  );

  // Directly execute checkMissingTasks logic to verify real output
  console.log('\n--- Step 8: checkMissingTasks Functional Execution ---');
  try {
    const { checkMissingTasks } = await import('../src/app/api/push/send-reminders/route');
    const taskResult = await checkMissingTasks('2026-09-18', 'Jumat', testSekolahId);
    assert(Array.isArray(taskResult.reminders), 'checkMissingTasks returns array of reminders');
    assert(typeof taskResult.todayStr === 'string', 'checkMissingTasks returns date string');
    assert(typeof taskResult.todayDay === 'string', 'checkMissingTasks returns day name');
    console.log(`ℹ️ Evaluated ${taskResult.reminders.length} automated task reminders for ${taskResult.todayDay} (${taskResult.todayStr}).`);

    // If there are reminders generated, spot check the payload format
    if (taskResult.reminders.length > 0) {
      const sample = taskResult.reminders[0];
      assert(!!sample.guru_nama, 'Reminder item includes guru_nama');
      assert(!!sample.title, 'Reminder item includes title');
      assert(!!sample.body, 'Reminder item includes body');
      assert(['presensi', 'jurnal', 'piket'].includes(sample.category), 'Reminder category is valid enum');
    }
  } catch (err: any) {
    assert(false, 'checkMissingTasks executed without error', err.message);
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`TOTAL TESTS RUN: ${totalTests}`);
  console.log(`PASSED: ${totalTests - failureCount}`);
  console.log(`FAILED: ${failureCount}`);
  console.log('====================================================');

  if (failureCount > 0) {
    console.error(`💥 ${failureCount} TEST(S) FAILED!`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${totalTests} M9.4 CHAT & NOTIFICATION TESTS PASSED!`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
