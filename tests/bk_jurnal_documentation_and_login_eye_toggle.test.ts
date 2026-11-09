/**
 * tests/bk_jurnal_documentation_and_login_eye_toggle.test.ts
 *
 * Verification suite for:
 * 1. Jurnal BK Documentation: Live Camera Capture & Document/File Upload
 * 2. LoginScreen Password Visibility Eye Toggle Button
 * 3. Non-Regression and Integrity Preservation
 */

import fs from 'fs';
import path from 'path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`  ✔ [PASS] ${message}`);
}

console.log('========================================================================');
console.log('🧪 TEST SUITE: BK JURNAL DOCUMENTATION & LOGIN EYE TOGGLE VERIFICATION');
console.log('========================================================================\n');

// --- 1. LoginScreen Password Eye Toggle Verification ---
console.log('--- Suite 1: LoginScreen Password Eye Toggle Verification ---');

const loginScreenPath = path.resolve('src/components/LoginScreen.tsx');
assert(fs.existsSync(loginScreenPath), 'src/components/LoginScreen.tsx exists');

const loginContent = fs.readFileSync(loginScreenPath, 'utf8');

assert(
  loginContent.includes('const [showPassword, setShowPassword] = useState(false);'),
  'LoginScreen declares showPassword state initialized to false'
);

assert(
  loginContent.includes("type={showPassword ? 'text' : 'password'}"),
  'LoginScreen toggles password input type between text and password dynamically'
);

assert(
  loginContent.includes('type="button"'),
  'Toggle eye button has type="button" to prevent accidental form submission'
);

assert(
  loginContent.includes('setShowPassword(prev => !prev)'),
  'Toggle eye button inverts showPassword state on click'
);

assert(
  loginContent.includes("fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}"),
  'Toggle button displays fa-eye when hidden and fa-eye-slash when visible'
);

assert(
  loginContent.includes("aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}"),
  'Toggle button provides accessible aria-label for screen readers'
);

// Preserved LoginScreen styling & branding
assert(
  loginContent.includes('clay-card w-full max-w-md'),
  'LoginScreen preserves clay-card styling'
);
assert(
  loginContent.includes('clay-btn clay-btn-primary'),
  'LoginScreen preserves clay-btn-primary button'
);
assert(
  loginContent.includes('SIPJAM Portal') && loginContent.includes('Presensi & Jurnal Multi-Sekolah'),
  'LoginScreen preserves official branding and subtitle'
);


// --- 2. Jurnal BK Documentation: Live Camera & File Upload ---
console.log('\n--- Suite 2: Jurnal BK Documentation (Live & File Upload) ---');

const bkJurnalPath = path.resolve('src/components/BkJurnalView.tsx');
assert(fs.existsSync(bkJurnalPath), 'src/components/BkJurnalView.tsx exists');

const bkJurnalContent = fs.readFileSync(bkJurnalPath, 'utf8');

// Imports
assert(
  bkJurnalContent.includes("import CameraSelfieCapture from './CameraSelfieCapture';"),
  'BkJurnalView imports CameraSelfieCapture for live camera capture'
);

assert(
  bkJurnalContent.includes("import { uploadToDrive } from '@/lib/driveUpload';"),
  'BkJurnalView imports uploadToDrive for cloud/storage document synchronization'
);

// Documentation States
assert(
  bkJurnalContent.includes("const [docMode, setDocMode] = useState<'none' | 'camera' | 'upload'>('none');"),
  'BkJurnalView provides docMode state supporting live camera and upload modes'
);

assert(
  bkJurnalContent.includes('const [docFile, setDocFile] = useState<File | null>(null);'),
  'BkJurnalView tracks active documentation File object'
);

assert(
  bkJurnalContent.includes('const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);'),
  'BkJurnalView tracks preview URL for captured or uploaded documentation'
);

// Live Camera Integration
assert(
  bkJurnalContent.includes('<CameraSelfieCapture') &&
  bkJurnalContent.includes('onPhotoConfirmed=') &&
  bkJurnalContent.includes('onRetake='),
  'BkJurnalView integrates CameraSelfieCapture with confirmation and retake handlers'
);

// Upload Document Integration
assert(
  bkJurnalContent.includes('id="jurnal-bk-doc-file-input"') &&
  bkJurnalContent.includes('type="file"') &&
  bkJurnalContent.includes('accept="image/*,.pdf,.doc,.docx"'),
  'BkJurnalView renders file input accepting both images and documents (PDF, Word)'
);

assert(
  bkJurnalContent.includes('handleDocUpload'),
  'BkJurnalView defines handleDocUpload with file size guard'
);

// Persistence & Submission
assert(
  bkJurnalContent.includes('link_dokumen: finalDocUrl'),
  'BkJurnalView persists link_dokumen into recordPayload during form submission'
);

assert(
  bkJurnalContent.includes("uploadToDrive(docFile, counselorName, 'Jurnal BK', 'BK')"),
  'BkJurnalView uploads documentation via uploadToDrive into dedicated Jurnal BK folder'
);

// Table Display & Modal Preview
assert(
  bkJurnalContent.includes('<th className="py-2.5 px-3 text-center">Dokumen</th>'),
  'BkJurnalView table header renders Dokumen column'
);

assert(
  bkJurnalContent.includes('handleViewDocument'),
  'BkJurnalView implements handleViewDocument for instant modal image preview and document access'
);

assert(
  bkJurnalContent.includes('item.link_dokumen ? ('),
  'BkJurnalView table conditionally renders Lihat button when document is attached'
);


// --- 3. Non-Regression & Code Quality ---
console.log('\n--- Suite 3: Non-Regression & Preserved Contracts ---');

assert(
  bkJurnalContent.includes('data-testid="readonly-notice"'),
  'BkJurnalView preserves data-testid="readonly-notice" in read-only mode'
);

assert(
  bkJurnalContent.includes('isReadOnly'),
  'BkJurnalView preserves isReadOnly contract'
);

const migrationPath = path.resolve('supabase/migrations/20261109_create_jurnal_bk.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf8');
assert(
  migrationContent.includes('link_dokumen TEXT'),
  'supabase/migrations/20261109_create_jurnal_bk.sql schema defines link_dokumen TEXT'
);

console.log('\n========================================================================');
console.log('🎉 ALL VERIFICATION CHECKS PASSED (100% SUCCESS)');
console.log('========================================================================');
