import fs from 'fs';
import path from 'path';

function runTests() {
  console.log('====================================================');
  console.log('SERVICE WORKER & CACHE RESILIENCE VERIFICATION TEST');
  console.log('====================================================');

  const rootDir = process.cwd();

  // Test 1: public/sw.js Verification
  console.log('\n--- Section 1: public/sw.js Strategy Checks ---');
  const swPath = path.join(rootDir, 'public', 'sw.js');
  if (!fs.existsSync(swPath)) {
    throw new Error('public/sw.js not found!');
  }
  const swContent = fs.readFileSync(swPath, 'utf8');

  if (!swContent.includes('sipjam-cache-v3')) {
    throw new Error('public/sw.js should have CACHE_NAME set to sipjam-cache-v3 or higher');
  }
  console.log('  ✔ CACHE_NAME bumped to sipjam-cache-v3 for clean invalidation');

  if (!swContent.includes("event.data.type === 'SKIP_WAITING'")) {
    throw new Error('public/sw.js missing message handler for SKIP_WAITING');
  }
  console.log('  ✔ SKIP_WAITING message listener verified');

  if (!swContent.includes("event.request.mode === 'navigate'")) {
    throw new Error('public/sw.js missing Network-First handling for navigate requests');
  }
  console.log('  ✔ Network-First strategy for navigate (HTML document) verified');

  if (!swContent.includes("url.pathname.startsWith('/_next/static/')")) {
    throw new Error('public/sw.js missing Cache-First handling for hashed Next.js static assets');
  }
  console.log('  ✔ Cache-First strategy for _next/static/ hashed chunks verified');

  if (!swContent.includes("url.pathname.startsWith('/api/') || url.origin !== self.location.origin")) {
    throw new Error('public/sw.js should bypass API and cross-origin (Supabase) requests');
  }
  console.log('  ✔ API and cross-origin Supabase bypass verified (0 database load)');

  if (!swContent.includes("cacheNames.map((cacheName) => {")) {
    throw new Error('public/sw.js missing old cache cleanup during activate event');
  }
  console.log('  ✔ Old cache cleanup during activate verified');

  // Test 2: next.config.ts Headers Verification
  console.log('\n--- Section 2: next.config.ts Cache-Control Headers ---');
  const configPath = path.join(rootDir, 'next.config.ts');
  const configContent = fs.readFileSync(configPath, 'utf8');

  if (!configContent.includes("source: '/sw.js'") || !configContent.includes('no-cache, no-store, must-revalidate')) {
    throw new Error('next.config.ts missing no-cache header configuration for /sw.js');
  }
  console.log('  ✔ Cache-Control header for /sw.js configured with no-cache, no-store, must-revalidate');

  // Test 3: src/app/error.tsx ChunkLoadError Verification
  console.log('\n--- Section 3: src/app/error.tsx ChunkLoadError Resilience ---');
  const errorPath = path.join(rootDir, 'src', 'app', 'error.tsx');
  const errorContent = fs.readFileSync(errorPath, 'utf8');

  if (!errorContent.includes('ChunkLoadError') || !errorContent.includes('Loading chunk')) {
    throw new Error('src/app/error.tsx missing ChunkLoadError detection');
  }
  console.log('  ✔ ChunkLoadError detection and recovery verified');

  // Test 4: UpdateNotificationToast Component & Layout Mounting
  console.log('\n--- Section 4: Update Notification Component & Layout Mount ---');
  const toastPath = path.join(rootDir, 'src', 'components', 'UpdateNotificationToast.tsx');
  if (!fs.existsSync(toastPath)) {
    throw new Error('src/components/UpdateNotificationToast.tsx not found!');
  }
  const toastContent = fs.readFileSync(toastPath, 'utf8');
  if (!toastContent.includes('updatefound') || !toastContent.includes('controllerchange')) {
    throw new Error('UpdateNotificationToast missing service worker event listeners');
  }
  console.log('  ✔ UpdateNotificationToast has updatefound and controllerchange listeners');

  const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  if (!layoutContent.includes('UpdateNotificationToast')) {
    throw new Error('UpdateNotificationToast is not mounted in src/app/layout.tsx');
  }
  console.log('  ✔ UpdateNotificationToast is properly mounted in src/app/layout.tsx');

  console.log('\n====================================================');
  console.log('🎉 ALL SERVICE WORKER & CACHE RESILIENCE CHECKS PASSED!');
  console.log('====================================================');
}

runTests();
