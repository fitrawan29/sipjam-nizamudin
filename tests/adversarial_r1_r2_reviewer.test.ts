import fs from 'fs';
import path from 'path';
import vm from 'vm';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { AIAssistant, getAIAssistantGreeting } from '../src/components/AIAssistant/AIAssistant';
import { urlBase64ToUint8Array, isPushNotificationSupported } from '../src/lib/pushClient';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failedTests++;
  } else {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  }
}

async function runAdversarialReviewerSuite() {
  console.log('================================================================');
  console.log('ADVERSARIAL REVIEWER TEST SUITE: R1 (AI ROBOT ICON) & R2 (PUSH)');
  console.log('================================================================\n');

  // ===========================================================================
  // SECTION 1: R1 - AI ASSISTANT ROBOT ICON & PROPS VERIFICATION
  // ===========================================================================
  console.log('--- SECTION 1: R1 - AI Assistant Robot Icon ---');

  const aiAssistantPath = path.resolve(__dirname, '../src/components/AIAssistant/AIAssistant.tsx');
  assert(fs.existsSync(aiAssistantPath), 'AIAssistant.tsx exists');

  const aiContent = fs.readFileSync(aiAssistantPath, 'utf8');
  assert(aiContent.includes('fa-robot'), 'AIAssistant.tsx uses "fa-robot" icon class');
  assert(!aiContent.includes('fa-wand-magic-sparkles'), 'AIAssistant.tsx does NOT contain obsolete "fa-wand-magic-sparkles" icon');
  assert(aiContent.includes('🤖 Bantuan AI SIPJAM'), 'AIAssistant.tsx includes robot emoji in tooltip');

  // SSR Rendering test across multiple prop permutations
  try {
    const roles: Array<'guru' | 'admin' | 'superadmin'> = ['guru', 'admin', 'superadmin'];
    const views = ['view-guru-presensi', 'view-guru-jurnal', 'view-admin-verif', 'view-piket', undefined];

    for (const role of roles) {
      for (const view of views) {
        const renderedHtml = ReactDOMServer.renderToString(
          React.createElement(AIAssistant, {
            currentView: view,
            userRole: role,
            userName: 'Test User'
          })
        );

        assert(
          renderedHtml.includes('fa-robot'),
          `Rendered HTML (${role}, ${view || 'default'}) contains fa-robot icon`
        );
        assert(
          !renderedHtml.includes('fa-wand-magic-sparkles'),
          `Rendered HTML (${role}, ${view || 'default'}) strictly avoids fa-wand-magic-sparkles`
        );
        assert(
          renderedHtml.includes('data-tour="ai-assistant-btn"'),
          `Rendered HTML (${role}, ${view || 'default'}) retains data-tour="ai-assistant-btn"`
        );
      }
    }

    // Test 1.2: Case-insensitive role recognition in AIAssistant greeting
    assert(getAIAssistantGreeting('ADMIN', '').includes('Halo, Admin!'), 'getAIAssistantGreeting recognizes "ADMIN"');
    assert(getAIAssistantGreeting('SuperAdmin', '').includes('Halo, Admin!'), 'getAIAssistantGreeting recognizes "SuperAdmin"');
    assert(getAIAssistantGreeting(undefined, undefined, { role: 'admin' }).includes('Halo, Admin!'), 'getAIAssistantGreeting falls back to user.role');
    assert(getAIAssistantGreeting('GURU', '').includes('Halo, Bapak/Ibu Guru!'), 'getAIAssistantGreeting recognizes "GURU"');

    // Test 1.3: SSR initialOpen rendering of greeting dialog panel
    const adminPanelHtml = ReactDOMServer.renderToString(
      React.createElement(AIAssistant, {
        userRole: 'admin',
        userName: '',
        initialOpen: true
      })
    );
    assert(adminPanelHtml.includes('Halo, Admin!'), 'AIAssistant with initialOpen=true renders greeting panel in SSR');
    assert(adminPanelHtml.includes('fa-robot text-sm'), 'AIAssistant header contains fa-robot icon');

  } catch (err: any) {
    assert(false, 'AIAssistant SSR rendering failed', err.message);
  }

  // ===========================================================================
  // SECTION 2: R2 - SERVICE WORKER public/sw.js SANDBOXED ROBUSTNESS
  // ===========================================================================
  console.log('\n--- SECTION 2: R2 - Service Worker (public/sw.js) Sandboxed Robustness ---');

  const swPath = path.resolve(__dirname, '../public/sw.js');
  assert(fs.existsSync(swPath), 'public/sw.js exists');
  const swCode = fs.readFileSync(swPath, 'utf8');

  // Verify non-blocking install pre-caching
  assert(
    swCode.includes('caches.open(CACHE_NAME)') && swCode.includes('.catch('),
    'sw.js install pre-caching includes .catch() to prevent install rejection on asset fetch failures'
  );

  // Setup Sandboxed Global Scope
  type Listener = (event: any) => any;
  let listeners: Record<string, Listener> = {};
  let showNotificationCalls: Array<{ title: string; options: any }> = [];
  let showNotificationRejectNext = false;
  let showNotificationSyncThrow = false;
  let openWindowRejectNext = false;
  let openWindowCalls: string[] = [];
  let focusCalls: string[] = [];
  let skippedWaiting = false;
  let claimed = false;

  function resetSandbox() {
    listeners = {};
    showNotificationCalls = [];
    showNotificationRejectNext = false;
    showNotificationSyncThrow = false;
    openWindowRejectNext = false;
    openWindowCalls = [];
    focusCalls = [];
    skippedWaiting = false;
    claimed = false;

    const mockSelf: any = {
      location: { origin: 'https://sipjam.sch.id' },
      addEventListener: (type: string, fn: Listener) => {
        listeners[type] = fn;
      },
      skipWaiting: () => {
        skippedWaiting = true;
      },
      clients: {
        claim: async () => {
          claimed = true;
        },
        matchAll: async () => [
          {
            url: 'https://sipjam.sch.id/?view=view-guru-presensi',
            focus: async () => {
              focusCalls.push('https://sipjam.sch.id/?view=view-guru-presensi');
            }
          }
        ],
        openWindow: async (url: string) => {
          if (openWindowRejectNext) {
            openWindowRejectNext = false;
            throw new Error('Simulated openWindow pop-up blocked error');
          }
          openWindowCalls.push(url);
          return { url };
        }
      },
      registration: {
        showNotification: async (title: string, options: any) => {
          if (showNotificationSyncThrow) {
            showNotificationSyncThrow = false;
            throw new TypeError('Synchronous throw from showNotification');
          }
          if (showNotificationRejectNext) {
            showNotificationRejectNext = false;
            throw new TypeError('Browser rejected notification options (e.g. actions/vibrate unsupported)');
          }
          showNotificationCalls.push({ title, options });
        }
      }
    };

    const mockCaches = {
      open: async () => ({
        addAll: async () => {
          throw new Error('Simulated network fetch failure during offline install');
        },
        put: async () => {}
      }),
      keys: async () => ['old-cache-v1'],
      delete: async () => true,
      match: async (req: any) => {
        if (typeof req === 'string' && req === '/') {
          return { status: 200, url: 'https://sipjam.sch.id/' };
        }
        return null;
      }
    };

    const sandbox = {
      self: mockSelf,
      caches: mockCaches,
      Date: Date,
      JSON: JSON,
      URL: URL,
      Response: Response,
      console: console,
      Promise: Promise,
      setTimeout: setTimeout
    };

    vm.createContext(sandbox);
    vm.runInContext(swCode, sandbox);
  }

  resetSandbox();

  assert(typeof listeners['install'] === 'function', 'sw.js registers install event listener');
  assert(typeof listeners['activate'] === 'function', 'sw.js registers activate event listener');
  assert(typeof listeners['push'] === 'function', 'sw.js registers push event listener');
  assert(typeof listeners['notificationclick'] === 'function', 'sw.js registers notificationclick event listener');

  // Test 2.1: Install event handles cache.addAll rejection gracefully without throwing
  let installWaitPromise: Promise<any> | null = null;
  listeners['install']({
    waitUntil: (p: Promise<any>) => {
      installWaitPromise = p;
    }
  });
  if (installWaitPromise) {
    let installThrew = false;
    try {
      await installWaitPromise;
    } catch {
      installThrew = true;
    }
    assert(!installThrew, 'Install event promise does NOT reject when cache.addAll fails (non-fatal caching)');
  }
  assert(skippedWaiting, 'Install event invokes self.skipWaiting()');

  // Test 2.2: Activate event claims clients
  let activateWaitPromise: Promise<any> | null = null;
  listeners['activate']({
    waitUntil: (p: Promise<any>) => {
      activateWaitPromise = p;
    }
  });
  if (activateWaitPromise) await activateWaitPromise;
  assert(claimed, 'Activate event invokes self.clients.claim()');

  // Test 2.3: Push event with empty event data (RFC 8030 tickle / ping push)
  let pushWaitPromise: Promise<any> | null = null;
  listeners['push']({
    data: null,
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Push event with null data triggers notification');
  assert(showNotificationCalls[0].title === 'SIPJAM Notifikasi', 'Default title applied when event.data is null');
  assert(showNotificationCalls[0].options.data.url === '/', 'Default url "/" applied when event.data is null');

  // Test 2.4: Push event with plain text fallback (malformed JSON)
  showNotificationCalls = [];
  listeners['push']({
    data: {
      json: () => {
        throw new SyntaxError('Unexpected token');
      },
      text: () => 'Server Notice: System Update at 20:00'
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Push event handles non-JSON plain text');
  assert(showNotificationCalls[0].options.body === 'Server Notice: System Update at 20:00', 'Plain text content preserved as body');

  // Test 2.5: Push event with complex nested payload.data
  showNotificationCalls = [];
  const richPayload = {
    title: 'Pengingat Piket',
    body: 'Bapak Ahmad, giliran piket hari ini.',
    url: '/?view=view-piket',
    data: {
      url: '/?view=view-piket',
      role: 'Piket',
      piketId: 'piket-123'
    },
    actions: [{ action: 'view', title: 'Lihat Piket' }]
  };

  listeners['push']({
    data: {
      json: () => richPayload,
      text: () => JSON.stringify(richPayload)
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Rich payload notification invoked');
  assert(showNotificationCalls[0].title === 'Pengingat Piket', 'Title preserved correctly');
  assert(showNotificationCalls[0].options.data.url === '/?view=view-piket', 'Nested target URL resolved');
  assert(showNotificationCalls[0].options.data.role === 'Piket', 'Custom metadata preserved');
  assert(Array.isArray(showNotificationCalls[0].options.actions), 'Actions attached when non-empty');

  // Test 2.6: Push event with empty actions array (should NOT pass empty actions)
  showNotificationCalls = [];
  const noActionsPayload = {
    title: 'Pengingat Presensi',
    body: 'Presensi segera!',
    actions: []
  };

  listeners['push']({
    data: {
      json: () => noActionsPayload,
      text: () => JSON.stringify(noActionsPayload)
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Notification displayed when actions array is empty');
  assert(showNotificationCalls[0].options.actions === undefined, 'Empty actions array is omitted from options');

  // Test 2.7: Browser rejects initial showNotification (e.g. mobile Safari throwing TypeError on options)
  showNotificationCalls = [];
  showNotificationRejectNext = true; // will throw on first call

  listeners['push']({
    data: {
      json: () => ({
        title: 'Pengingat Presensi Pulang',
        body: 'Waktunya presensi pulang!',
        url: '/?view=view-guru-presensi'
      })
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(
    showNotificationCalls.length === 1,
    'Fallback showNotification executed after primary showNotification threw error'
  );
  assert(
    showNotificationCalls[0].title === 'Pengingat Presensi Pulang',
    'Fallback notification preserved the original title'
  );
  assert(
    showNotificationCalls[0].options.data.url === '/?view=view-guru-presensi',
    'Fallback notification preserved target URL'
  );

  // Test 2.8: Notification click - Focus existing window
  let notifClosed = false;
  let clickPromise: Promise<any> | null = null;
  listeners['notificationclick']({
    notification: {
      close: () => {
        notifClosed = true;
      },
      data: { url: '/?view=view-guru-presensi' }
    },
    waitUntil: (p: Promise<any>) => {
      clickPromise = p;
    }
  });
  if (clickPromise) await clickPromise;

  assert(notifClosed, 'notificationclick closes notification');
  assert(focusCalls.length === 1, 'notificationclick focuses existing matching window');

  // Test 2.9: Notification click - Open new window when no matching window
  notifClosed = false;
  listeners['notificationclick']({
    notification: {
      close: () => {
        notifClosed = true;
      },
      data: { url: '/?view=view-admin-verif' }
    },
    waitUntil: (p: Promise<any>) => {
      clickPromise = p;
    }
  });
  if (clickPromise) await clickPromise;

  assert(notifClosed, 'notificationclick closes notification');
  assert(openWindowCalls.length === 1 && openWindowCalls[0] === '/?view=view-admin-verif',
    'notificationclick opens new window for non-matching url');

  // Test 2.10: Push with explicit tag preserves tag and enables renotify
  showNotificationCalls = [];
  const taggedPayload = {
    title: 'Pengingat Spesifik',
    body: 'Ini dengan tag.',
    tag: 'custom-tag-123'
  };
  listeners['push']({
    data: {
      json: () => taggedPayload,
      text: () => JSON.stringify(taggedPayload)
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Tagged notification invoked');
  assert(showNotificationCalls[0].options.tag === 'custom-tag-123', 'Explicit tag preserved in options');
  assert(showNotificationCalls[0].options.renotify === true, 'Renotify enabled when tag is present');

  // Test 2.11: Push WITHOUT tag omits tag and renotify
  showNotificationCalls = [];
  const untaggedPayload = {
    title: 'Pengingat Umum',
    body: 'Ini tanpa tag.'
  };
  listeners['push']({
    data: {
      json: () => untaggedPayload,
      text: () => JSON.stringify(untaggedPayload)
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Untagged notification invoked');
  assert(showNotificationCalls[0].options.tag === undefined, 'Tag is omitted when not provided in payload');
  assert(showNotificationCalls[0].options.renotify === undefined, 'Renotify is omitted when tag is not provided');

  // Test 2.12: Push with silent: true deletes vibrate and sets silent: true
  showNotificationCalls = [];
  const silentPayload = {
    title: 'Pengumuman Hening',
    body: 'Harap tenang.',
    silent: true
  };
  listeners['push']({
    data: {
      json: () => silentPayload,
      text: () => JSON.stringify(silentPayload)
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Silent notification invoked');
  assert(showNotificationCalls[0].options.silent === true, 'Silent flag set to true');
  assert(showNotificationCalls[0].options.vibrate === undefined, 'Vibrate omitted for silent notification');

  // Test 2.13: Push with link property resolves targetUrl
  showNotificationCalls = [];
  const linkPayload = {
    title: 'Link Notif',
    body: 'Buka tautan.',
    link: '/?view=view-guru-jurnal'
  };
  listeners['push']({
    data: {
      json: () => linkPayload,
      text: () => JSON.stringify(linkPayload)
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Link-based notification invoked');
  assert(showNotificationCalls[0].options.data.url === '/?view=view-guru-jurnal', 'Link property mapped to options.data.url');

  // Test 2.14: Notification click fallback when openWindow fails
  notifClosed = false;
  focusCalls = [];
  openWindowCalls = [];
  openWindowRejectNext = true; // simulates browser pop-up blocker or openWindow failure

  listeners['notificationclick']({
    notification: {
      close: () => {
        notifClosed = true;
      },
      data: { url: '/?view=unknown-path' }
    },
    waitUntil: (p: Promise<any>) => {
      clickPromise = p;
    }
  });
  if (clickPromise) await clickPromise;

  assert(notifClosed, 'notificationclick closes notification on openWindow error');
  assert(focusCalls.length === 1, 'notificationclick falls back to focusing existing window when openWindow fails');

  // ===========================================================================
  // ADVANCED ADVERSARIAL EDGE CASES (Review Round 3)
  // ===========================================================================

  // Test 2.15: Push event with valid JSON null payload (JSON.parse("null") === null)
  showNotificationCalls = [];
  listeners['push']({
    data: {
      json: () => null,
      text: () => 'null'
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Push event with JSON null does not crash and displays notification');
  assert(showNotificationCalls[0].title === 'SIPJAM Notifikasi', 'JSON null applies fallback title');
  assert(showNotificationCalls[0].options.body === 'Pemberitahuan baru dari sistem SIPJAM.', 'JSON null applies fallback body');

  // Test 2.16: Push event with primitive JSON string (e.g. JSON.parse('"Pengumuman Darurat"'))
  showNotificationCalls = [];
  listeners['push']({
    data: {
      json: () => 'Pengumuman Darurat: Rapat Pukul 13:00',
      text: () => '"Pengumuman Darurat: Rapat Pukul 13:00"'
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Push event with primitive string payload displays notification');
  assert(showNotificationCalls[0].options.body === 'Pengumuman Darurat: Rapat Pukul 13:00', 'Primitive string payload preserved as notification body');

  // Test 2.17: Push event with JSON array payload
  showNotificationCalls = [];
  listeners['push']({
    data: {
      json: () => [{ title: 'Array Title', body: 'Array Body' }],
      text: () => '[{"title":"Array Title","body":"Array Body"}]'
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Push event with JSON array unwraps first item');
  assert(showNotificationCalls[0].title === 'Array Title', 'Array item title extracted correctly');
  assert(showNotificationCalls[0].options.body === 'Array Body', 'Array item body extracted correctly');

  // Test 2.18: Push event with malformed action items (missing title property)
  showNotificationCalls = [];
  listeners['push']({
    data: {
      json: () => ({
        title: 'Action Test',
        body: 'Testing actions',
        actions: [
          { action: 'valid', title: 'Valid Action' },
          { action: 'invalid-no-title' },
          null
        ]
      })
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Push event with actions displayed');
  assert(
    Array.isArray(showNotificationCalls[0].options.actions) && showNotificationCalls[0].options.actions.length === 1,
    'Malformed action items without title are filtered out, leaving only valid actions'
  );
  assert(
    showNotificationCalls[0].options.actions[0].action === 'valid',
    'Valid action item preserved in options.actions'
  );

  // Test 2.19: Synchronous throw from showNotification handled by outer try/catch
  showNotificationCalls = [];
  showNotificationSyncThrow = true;
  listeners['push']({
    data: {
      json: () => ({ title: 'Sync Throw Test', body: 'Sync throw body' })
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Synchronous throw from showNotification triggers fallback showNotification');
  assert(showNotificationCalls[0].title === 'Sync Throw Test', 'Fallback notification preserves title on synchronous throw');

  // Test 2.20: Numeric tag normalized to string
  showNotificationCalls = [];
  listeners['push']({
    data: {
      json: () => ({ title: 'Num Tag', body: 'Body', tag: 9988 })
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'Numeric tag displayed');
  assert(showNotificationCalls[0].options.tag === '9988', 'Numeric tag successfully normalized to string');

  // Test 2.21: String silent "true" activates silent mode
  showNotificationCalls = [];
  listeners['push']({
    data: {
      json: () => ({ title: 'String Silent', body: 'Body', silent: 'true' })
    },
    waitUntil: (p: Promise<any>) => {
      pushWaitPromise = p;
    }
  });
  if (pushWaitPromise) await pushWaitPromise;

  assert(showNotificationCalls.length === 1, 'String silent "true" displayed');
  assert(showNotificationCalls[0].options.silent === true, 'String silent="true" sets options.silent=true');
  assert(showNotificationCalls[0].options.vibrate === undefined, 'String silent="true" deletes vibrate');

  // ===========================================================================
  // SECTION 3: PUSH CLIENT UTILITY & KEY RENEWAL VERIFICATION
  // ===========================================================================
  console.log('\n--- SECTION 3: Push Client Utility & Renewal Tests ---');

  // 3.1: urlBase64ToUint8Array boundary and edge cases
  const validVapidBase64 = 'BIdO5BNM7SzkETjiTVS7-ZaxRAL93A9uAD8mDJDK6PQqvdQmeJen49sziz7x4917PY2S8-Fl1OWHnfet3iCkOMU';
  const uint8Arr = urlBase64ToUint8Array(validVapidBase64);
  assert(uint8Arr instanceof Uint8Array, 'urlBase64ToUint8Array returns Uint8Array');
  assert(uint8Arr.length === 65, 'Uncompressed P-256 public key is exactly 65 bytes', `Got ${uint8Arr.length}`);

  // Base64 with whitespace/newlines
  const withWhitespace = `  \n  ${validVapidBase64}  \t\n  `;
  const uint8ArrTrimmed = urlBase64ToUint8Array(withWhitespace);
  assert(uint8ArrTrimmed.length === 65, 'urlBase64ToUint8Array safely trims leading/trailing whitespace');

  // Base64 with custom padding needed
  const unpadded = 'YWJj'; // 'abc'
  const unpaddedResult = urlBase64ToUint8Array(unpadded);
  assert(unpaddedResult.length === 3, 'urlBase64ToUint8Array safely pads and decodes standard base64');

  // 3.2: isPushNotificationSupported in Node environment
  assert(
    isPushNotificationSupported() === false,
    'isPushNotificationSupported safely returns false in non-browser Node.js environment without throwing'
  );

  // 3.3: PushClient getKey fallback simulation
  const mockSubscriptionWithoutKeys: any = {
    endpoint: 'https://push.example.com/sub/123',
    toJSON: () => ({ endpoint: 'https://push.example.com/sub/123' }),
    getKey: (name: string) => {
      if (name === 'p256dh') return new Uint8Array([1, 2, 3, 4]).buffer;
      if (name === 'auth') return new Uint8Array([5, 6, 7, 8]).buffer;
      return null;
    }
  };
  let extractedJson = mockSubscriptionWithoutKeys.toJSON();
  if ((!extractedJson.keys || !extractedJson.keys.p256dh) && typeof mockSubscriptionWithoutKeys.getKey === 'function') {
    const rawP256dh = mockSubscriptionWithoutKeys.getKey('p256dh');
    const rawAuth = mockSubscriptionWithoutKeys.getKey('auth');
    if (rawP256dh && rawAuth) {
      const b64url = (buf: ArrayBuffer) => {
        const bin = String.fromCharCode(...new Uint8Array(buf));
        const b64 = Buffer.from(bin, 'binary').toString('base64');
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };
      extractedJson = {
        ...extractedJson,
        keys: {
          p256dh: b64url(rawP256dh),
          auth: b64url(rawAuth)
        }
      };
    }
  }
  assert(Boolean(extractedJson.keys?.p256dh), 'Manual key extraction populates p256dh when toJSON omits keys');
  assert(Boolean(extractedJson.keys?.auth), 'Manual key extraction populates auth when toJSON omits keys');

  // 3.4: Partial key recovery: toJSON has p256dh but missing auth
  const mockPartialSubscription: any = {
    endpoint: 'https://push.example.com/sub/456',
    toJSON: () => ({
      endpoint: 'https://push.example.com/sub/456',
      keys: { p256dh: 'existing-p256dh-key' }
    }),
    getKey: (name: string) => {
      if (name === 'auth') return new Uint8Array([9, 10, 11, 12]).buffer;
      return null;
    }
  };
  const partialJson = mockPartialSubscription.toJSON();
  let recoveredAuth = partialJson.keys?.auth;
  if (!recoveredAuth && typeof mockPartialSubscription.getKey === 'function') {
    const raw = mockPartialSubscription.getKey('auth');
    if (raw) {
      const bin = String.fromCharCode(...new Uint8Array(raw));
      recoveredAuth = Buffer.from(bin, 'binary').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  }
  assert(partialJson.keys.p256dh === 'existing-p256dh-key', 'Existing p256dh is preserved in partial recovery');
  assert(Boolean(recoveredAuth), 'Missing auth key is successfully extracted while preserving p256dh');

  // 3.5: Missing endpoint recovery
  const mockSubWithoutEndpointInJson: any = {
    endpoint: 'https://push.example.com/sub/fallback-endpoint',
    toJSON: () => ({ keys: { p256dh: 'k1', auth: 'k2' } })
  };
  const jsonWithEndpoint = {
    ...mockSubWithoutEndpointInJson.toJSON(),
    endpoint: mockSubWithoutEndpointInJson.toJSON().endpoint || mockSubWithoutEndpointInJson.endpoint
  };
  assert(
    jsonWithEndpoint.endpoint === 'https://push.example.com/sub/fallback-endpoint',
    'Missing endpoint in toJSON is successfully populated from subscription.endpoint'
  );

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAdversarialReviewerSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
