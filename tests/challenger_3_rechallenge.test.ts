import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {
  REMINDER_INTERVAL_MS,
  evaluateReminderConditions,
  parseTimeToMinutes,
  computeRoleFlags,
  TeacherReminderManager,
} from '../src/components/TeacherReminderManager';

console.log('================================================================');
console.log('CHALLENGER 3 RE-CHALLENGE: EXTENDED ADVERSARIAL VERIFICATION');
console.log('================================================================\n');

let total = 0;
let passed = 0;
let failed = 0;

function assertTest(condition: boolean, title: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`✅ PASS: ${title}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${title}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

// 1. Role Boundary & Matrix Stress
console.log('--- 1. Role Boundary & Matrix Stress ---');

const teacherRoles = ['guru', 'GURU', 'Guru', ' guru ', '\tguru\n', 'teacher', 'TEACHER', 'Teacher', ' teacher '];
teacherRoles.forEach(r => {
  const flags = computeRoleFlags({ role: r });
  assertTest(flags.isGuru && !flags.isAdmin && !flags.isSuperadmin, `Teacher role variation "${r.trim()}" is recognized as isGuru`);
});

const nonTeacherRoles = [
  'siswa', 'SISWA', 'Siswa', ' student ', 'guest', 'GUEST', 'tamu',
  'wali_murid', 'wali-murid', 'walimurid', 'parent', 'tu', 'tata_usaha',
  'kepsek', 'kepala_sekolah', 'alumni', 'operator', '', '   '
];
nonTeacherRoles.forEach(r => {
  const flags = computeRoleFlags({ role: r });
  assertTest(!flags.isGuru, `Non-teacher role "${r.trim() || '<empty>'}" is strictly NOT isGuru`);
});

const adminRoles = [
  'admin', 'ADMIN', 'Admin', 'administrator', 'ADMINISTRATOR', 'Administrator',
  'superadmin', 'SUPERADMIN', 'Superadmin', 'super admin', 'Super Admin', 'super_admin', 'super-admin'
];
adminRoles.forEach(r => {
  const flags = computeRoleFlags({ role: r });
  assertTest(!flags.isGuru && flags.isAdmin, `Admin/Superadmin role variation "${r.trim()}" is blocked from isGuru`);
});

// Non-string / malformed role properties
assertTest(!computeRoleFlags(null).isGuru, 'null user is not isGuru');
assertTest(!computeRoleFlags(undefined).isGuru, 'undefined user is not isGuru');
assertTest(!computeRoleFlags({} as any).isGuru, 'Empty user object is not isGuru');
assertTest(!computeRoleFlags({ role: null } as any).isGuru, 'User with role: null is not isGuru');
assertTest(!computeRoleFlags({ role: undefined } as any).isGuru, 'User with role: undefined is not isGuru');
assertTest(!computeRoleFlags({ role: '' }).isGuru, 'User with empty string role is not isGuru');


// 2. React Component Isolation & SSR Rendering
console.log('\n--- 2. React Component Isolation & SSR Output ---');

const testNonTeacherUsers = [
  { role: 'siswa', name: 'Student 1' },
  { role: 'student', name: 'Student 2' },
  { role: 'guest', name: 'Guest 1' },
  { role: 'wali_murid', name: 'Parent 1' },
  { role: 'admin', name: 'Admin 1' },
  { role: 'superadmin', name: 'Superadmin 1' },
  { role: 'administrator', name: 'Admin 2' },
  { role: '', name: 'No Role' },
  null,
  undefined,
];

testNonTeacherUsers.forEach((u, i) => {
  const html = ReactDOMServer.renderToString(
    React.createElement(TeacherReminderManager, { user: u, onNavigate: () => {} })
  );
  assertTest(html === '', `TeacherReminderManager renders empty string for non-teacher user #${i} (${u?.role ?? 'null/undefined'})`);
});

// 3. Defensive evaluation with exotic / corrupted dailyState structures
console.log('\n--- 3. Defensive evaluation with exotic dailyState structures ---');

const baseConfig = {
  jam_datang_mulai: '06:00',
  jam_datang_batas: '07:15',
  jam_datang_akhir: '12:00',
  jam_pulang_mulai: '14:00',
  jam_pulang_jumat: '11:00',
  jam_pulang_akhir: '18:00',
};

// 3.1 Undefined jurnalKBM
let err1 = false;
try {
  evaluateReminderConditions(
    { jadwalKBM: [{ id: 1, kelas: 'X-1', mata_pelajaran: 'Matematika' }], jurnalKBM: undefined } as any,
    baseConfig,
    new Date('2026-10-05T09:00:00+08:00')
  );
} catch (e) {
  err1 = true;
}
assertTest(!err1, 'evaluateReminderConditions handles undefined jurnalKBM gracefully');

// 3.2 Null jurnalKBM
let err2 = false;
try {
  evaluateReminderConditions(
    { jadwalKBM: [{ id: 1, kelas: 'X-1', mata_pelajaran: 'Matematika' }], jurnalKBM: null } as any,
    baseConfig,
    new Date('2026-10-05T09:00:00+08:00')
  );
} catch (e) {
  err2 = true;
}
assertTest(!err2, 'evaluateReminderConditions handles null jurnalKBM gracefully');

// 3.3 Undefined jadwalKBM
let err3 = false;
try {
  evaluateReminderConditions(
    { jadwalKBM: undefined, jurnalKBM: [] } as any,
    baseConfig,
    new Date('2026-10-05T09:00:00+08:00')
  );
} catch (e) {
  err3 = true;
}
assertTest(!err3, 'evaluateReminderConditions handles undefined jadwalKBM gracefully');

// 3.4 Empty config object (fallback defaults)
let err4 = false;
let res4: any[] = [];
try {
  res4 = evaluateReminderConditions(
    {
      tanggal: '2026-10-05',
      presensiDatang: null,
      jadwalKBM: [],
      jurnalKBM: [],
    } as any,
    {},
    new Date('2026-10-05T06:30:00+08:00')
  );
} catch (e) {
  err4 = true;
}
assertTest(!err4 && res4.length > 0, 'evaluateReminderConditions works with empty config using built-in fallbacks');

// 4. Time parser robustness
console.log('\n--- 4. Time Parser Edge Cases ---');
assertTest(parseTimeToMinutes('06:00') === 360, '06:00 -> 360 min');
assertTest(parseTimeToMinutes('06.00') === 360, '06.00 -> 360 min');
assertTest(parseTimeToMinutes('00:00') === 0, '00:00 -> 0 min');
assertTest(parseTimeToMinutes('23:59') === 1439, '23:59 -> 1439 min');
assertTest(parseTimeToMinutes('') === 0, 'Empty string -> 0 min');
assertTest(parseTimeToMinutes(null as any) === 0, 'null -> 0 min');
assertTest(parseTimeToMinutes(undefined as any) === 0, 'undefined -> 0 min');
assertTest(parseTimeToMinutes('invalid') === 0, 'Invalid string -> 0 min');

console.log('\n================================================================');
console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL CHALLENGER 3 EXTENDED ADVERSARIAL CHECKS PASSED!');
  process.exit(0);
}
