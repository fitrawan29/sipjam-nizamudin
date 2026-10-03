import fs from 'fs';
import path from 'path';
import vm from 'vm';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import AIAssistant from '../src/components/AIAssistant/AIAssistant';
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
  // SECTION 1: R1 - AI ASSISTANT ROBOT ICON VERIFICATION
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
  let openWindowCalls: string[] = [];
  let focusCalls: string[] = [];
  let skippedWaiting = false;
  let claimed = false;

  function resetSandbox() {
    listeners = {};
    showNotificationCalls = [];
    showNotificationRejectNext = false;
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
          openWindowCalls.push(url);
          return { url };
        }
      },
      registration: {
        showNotification: async (title: string, options: any) => {
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
      match: async () => null
    };

    const sandbox = {
      self: mockSelf,
      caches: mockCaches,
      Date: Date,
      JSON: JSON,
      URL: URL,
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
  // Verify that the fallback showNotification is executed cleanly with minimal options!
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
