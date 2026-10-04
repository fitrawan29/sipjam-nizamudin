import {
  generateStudentCardCanvas,
  downloadStudentCardPng,
  printStudentQrCardWithSchool,
  getStudentQrIdentifier,
  generateQrMatrix
} from '../../../src/lib/qrSiswa';

console.log('Testing student card generation...');

const mockStudent = {
  id: '12345678-1234-1234-1234-123456789012',
  nama_siswa: 'Budi Santoso',
  nisn: '1234567890',
  kelas: 'XII MIPA 1',
  gender: 'Laki-laki',
  status: 'Aktif',
  sekolah_id: 'sch-1'
};

const canvas = generateStudentCardCanvas({
  student: mockStudent,
  schoolName: 'SMA Negeri 1 Jakarta',
  qrIdentifier: '1234567890'
});

console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
if (canvas.width !== 600 || canvas.height !== 960) {
  throw new Error(`Expected 600x960, got ${canvas.width}x${canvas.height}`);
}

const dataUrl = canvas.toDataURL('image/png');
console.log(`Canvas toDataURL generated (prefix: ${dataUrl.slice(0, 30)}...)`);
if (!dataUrl.startsWith('data:image/png')) {
  throw new Error('Expected dataUrl to start with data:image/png');
}

// In Node.js environment without window/document, download returns false gracefully
const downloadRes = downloadStudentCardPng({
  student: mockStudent,
  schoolName: 'SMA Negeri 1 Jakarta',
  qrIdentifier: '1234567890'
});
console.log(`downloadStudentCardPng returned: ${downloadRes}`);

// printStudentQrCardWithSchool safely handles Node without throwing
printStudentQrCardWithSchool({
  student: mockStudent,
  schoolName: 'SMA Negeri 1 Jakarta'
});
console.log('printStudentQrCardWithSchool safely handled in Node environment.');

const matrix = generateQrMatrix('1234567890');
console.log(`QR matrix rows: ${matrix.length}`);
if (matrix.length < 21) {
  throw new Error('Matrix size too small');
}

console.log('ALL STUDENT CARD CHECKS PASSED SUCCESSFULLY!');
