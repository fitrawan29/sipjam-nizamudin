import assert from 'assert';
import { parseAndValidateMasterCsv, sanitizeUuid, normalizeName } from '../../../src/lib/dataIntegrityGuard';

console.log('--- Adversarial Challenge Test ---');

// 1. Windows GUID with braces
const bracedId = '{61216d32-c2b1-4d42-b282-1fe2a99e28cc}';
const res1 = parseAndValidateMasterCsv(`id,hari,nama_guru,mata_pelajaran,kelas\n${bracedId},Senin,Guru,Mapel,X`, 'jadwal_pelajaran');
assert.strictEqual(res1[0].id, '61216d32-c2b1-4d42-b282-1fe2a99e28cc');
console.log('✔ Braced GUID normalized successfully');

// 2. Uppercase UUID with surrounding whitespace
const upperId = '   61216D32-C2B1-4D42-B282-1FE2A99E28CC   ';
const res2 = parseAndValidateMasterCsv(`id,hari,nama_guru,mata_pelajaran,kelas\n${upperId},Senin,Guru,Mapel,X`, 'jadwal_pelajaran');
assert.strictEqual(res2[0].id, '61216d32-c2b1-4d42-b282-1fe2a99e28cc');
console.log('✔ Uppercase and padded UUID normalized successfully');

// 3. Malformed UUID replaced with genuine UUID without throwing
const malformed = 'not-a-uuid-at-all';
const res3 = parseAndValidateMasterCsv(`id,hari,nama_guru,mata_pelajaran,kelas\n${malformed},Senin,Guru,Mapel,X`, 'jadwal_pelajaran');
assert.match(res3[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
console.log('✔ Malformed UUID replaced with genuine UUID without error 22P02');

// 4. Name normalization
assert.strictEqual(normalizeName('   Dr.   Fitra   Suryazana   '), 'Dr. Fitra Suryazana');
console.log('✔ Name normalization handles excessive spaces correctly');

console.log('All adversarial tests passed!');
