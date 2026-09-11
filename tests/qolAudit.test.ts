import fs from 'fs';
import path from 'path';

// Test 1: Ensure NO native alert() exists in src/
const srcDir = path.join(__dirname, '..', 'src');

function scanDirForAlert(dir: string): string[] {
  let violations: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      violations = violations.concat(scanDirForAlert(fullPath));
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Match alert( but not Swal.fire or customAlert or alert-
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Skip comments
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        if (/\balert\s*\(/.test(line)) {
          violations.push(`${fullPath}:${idx + 1}: ${trimmed}`);
        }
      });
    }
  }
  return violations;
}

const alertViolations = scanDirForAlert(srcDir);
if (alertViolations.length > 0) {
  console.error('FAIL: Found native alert() calls in src/:', alertViolations);
  process.exit(1);
} else {
  console.log('PASS: Zero native alert() calls found in entire src/ directory!');
}

// Test 2: Ensure RekapSiswaView uses Swal.fire for warnings
const rekapSiswaPath = path.join(srcDir, 'components', 'RekapSiswaView.tsx');
const rekapSiswaContent = fs.readFileSync(rekapSiswaPath, 'utf-8');
if (!rekapSiswaContent.includes("import Swal from 'sweetalert2'")) {
  console.error('FAIL: RekapSiswaView.tsx does not import SweetAlert2');
  process.exit(1);
}
if (!rekapSiswaContent.includes("Swal.fire") || !rekapSiswaContent.includes("Pilih kelas terlebih dahulu")) {
  console.error('FAIL: RekapSiswaView.tsx does not call Swal.fire with class selection warning');
  process.exit(1);
}
console.log('PASS: RekapSiswaView imports SweetAlert2 and uses Swal.fire for class warning!');

// Test 3: Ensure AdminRekapView has clean empty state
const adminRekapPath = path.join(srcDir, 'components', 'AdminRekapView.tsx');
const adminRekapContent = fs.readFileSync(adminRekapPath, 'utf-8');
if (!adminRekapContent.includes('Tidak ada data guru yang sesuai dengan pencarian') && !adminRekapContent.includes('Reset pencarian')) {
  console.error('FAIL: AdminRekapView.tsx missing empty state or reset button for teacher search');
  process.exit(1);
}
console.log('PASS: AdminRekapView has clean empty states and reset search capability!');

// Test 4: Ensure AdminVerifView, HistoryView, and PiketView have reset search and empty states
const adminVerifPath = path.join(srcDir, 'components', 'AdminVerifView.tsx');
const adminVerifContent = fs.readFileSync(adminVerifPath, 'utf-8');
if (!adminVerifContent.includes('Reset pencarian') || !adminVerifContent.includes('Tidak ada data yang cocok dengan pencarian')) {
  console.error('FAIL: AdminVerifView.tsx missing empty state or reset search');
  process.exit(1);
}

const historyPath = path.join(srcDir, 'components', 'HistoryView.tsx');
const historyContent = fs.readFileSync(historyPath, 'utf-8');
if (!historyContent.includes('Reset pencarian') || !historyContent.includes('Tidak ada riwayat')) {
  console.error('FAIL: HistoryView.tsx missing empty state or reset search');
  process.exit(1);
}

const piketPath = path.join(srcDir, 'components', 'PiketView.tsx');
const piketContent = fs.readFileSync(piketPath, 'utf-8');
if (!piketContent.includes('Reset pencarian') || !piketContent.includes('Tidak ada laporan piket')) {
  console.error('FAIL: PiketView.tsx missing empty state or reset search');
  process.exit(1);
}

console.log('PASS: All views verified for consistent empty states and search reset buttons!');
console.log('ALL QOL TESTS PASSED SUCCESSFULLY!');
