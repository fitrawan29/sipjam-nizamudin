import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const adminHomePath = path.resolve(process.cwd(), 'src/components/HomeViewAdmin.tsx');
const src = fs.readFileSync(adminHomePath, 'utf-8');

// 1. State & header status: Hari Libur vs Hari Kerja
assert(src.includes('holidayInfo?.isHoliday ? \'Hari Libur\' : \'Hari Kerja\''), 'Header status displays Hari Libur / Hari Kerja');
assert(src.includes('data-testid="holiday-banner"'), 'Admin dashboard renders holiday-banner');
assert(src.includes('Hari Libur: {holidayInfo.keterangan}'), 'Holiday banner shows keterangan');

// 2. Holiday detection supports tipe variations, single/range dates, and Masuk/Efektif override
assert(src.includes("tipe === 'Masuk' || c.tipe === 'Efektif'"), 'Preserves Masuk/Efektif override');
assert(src.includes("t === 'libur' || t.includes('libur')"), 'Supports Libur variants');
assert(src.includes('if (start && !end && start === todayStr) return true;'), 'Supports tanggal_mulai without tanggal_selesai');

// 3. Matrix & KPIs treat holidays as Libur (piket, jurnal, and Sistem Blok)
assert(src.includes('const isPiket = !isSchoolDayOff && isAssignedPiket'), 'Skips piket duty on holidays');
assert(src.includes("let piketStatus = isSchoolDayOff ? 'Libur'"), 'Sets piketStatus to Libur on holidays');
assert(src.includes('else if (isBlokToday && !isSchoolDayOff)'), 'Holiday takes precedence over Sistem Blok');
assert(src.includes("jurnalStatus = isSchoolDayOff ? 'Libur' : 'Bebas KBM'"), 'Sets jurnalStatus to Libur on holidays');

// 4. Realtime sync on kalender_pendidikan
assert(src.includes("table: 'kalender_pendidikan'"), 'Subscribes to kalender_pendidikan realtime changes');

console.log('✅ All HomeViewAdmin holiday display checks passed!');
