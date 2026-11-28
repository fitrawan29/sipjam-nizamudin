import fs from 'fs';
import path from 'path';
import assert from 'assert';
import JSZip from 'jszip';
import {
  buildRaporXlsxBuffer,
  buildRaporDocxBuffer,
  RaporExportPayload
} from '../src/utils/raporExport';

async function main() {
  const samplePayload: RaporExportPayload = {
    schoolName: 'SMA NIZAMUDIN',
    namaSiswa: 'Aisyah & Budi <Test>',
    nisn: '0012345678',
    kelas: 'X IPA 1',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    scores: [
      {
        namaMapel: 'Matematika',
        nilaiAkhir: 88.5,
        deskripsiCapaian: 'Menunjukkan penguasaan yang sangat baik dalam aljabar & geometri.'
      },
      {
        namaMapel: 'Bahasa Indonesia',
        nilaiAkhir: 91,
        deskripsiCapaian: 'Mampu menganalisis teks eksposisi secara kritis.'
      }
    ],
    attendance: { sakit: 1, izin: 2, alpa: 0 },
    kokurikuler: 'Aktif dalam projek P5 kewirausahaan sekolah.',
    ekstrakurikuler: [
      { kegiatan: 'Pramuka', predikat: 'Sangat Baik', keterangan: 'Disiplin dan aktif memimpin regu.' }
    ],
    catatanWali: 'Pertahankan prestasi dan kedisiplinan.',
    classComparison: [
      { namaMapel: 'Matematika', nilaiSiswa: 88.5, rataRataKelas: 82.4 },
      { namaMapel: 'Bahasa Indonesia', nilaiSiswa: 91, rataRataKelas: 84.0 }
    ],
    waliNama: 'Ibu Sari, S.Pd',
    waliNip: '198501012010012001',
    kepalaSekolahLabel: 'Kepala Sekolah',
    kepalaSekolahNama: 'Drs. Ahmad',
    kepalaSekolahNip: '197001011998021001'
  };

  // 1. Validate .xlsx archive structure and XML content
  const xlsxBytes = await buildRaporXlsxBuffer(samplePayload);
  assert.ok(xlsxBytes instanceof Uint8Array && xlsxBytes.length > 0, 'XLSX buffer must be non-empty');
  const xlsxZip = await JSZip.loadAsync(xlsxBytes);
  assert.ok(xlsxZip.file('[Content_Types].xml'), 'XLSX must contain [Content_Types].xml');
  assert.ok(xlsxZip.file('xl/workbook.xml'), 'XLSX must contain xl/workbook.xml');
  assert.ok(xlsxZip.file('xl/styles.xml'), 'XLSX must contain xl/styles.xml');
  const sheetXml = await xlsxZip.file('xl/worksheets/sheet1.xml')?.async('string');
  assert.ok(sheetXml, 'XLSX must contain xl/worksheets/sheet1.xml');
  assert.ok(sheetXml.includes('Aisyah &amp; Budi &lt;Test&gt;'), 'XLSX must escape XML entities');
  assert.ok(sheetXml.includes('Matematika'), 'XLSX must include subject name');
  assert.ok(sheetXml.includes('<v>88.5</v>'), 'XLSX must store numeric grade as number cell');
  assert.ok(sheetXml.includes('1 hari'), 'XLSX must include attendance');
  assert.ok(sheetXml.includes('Aktif dalam projek P5 kewirausahaan sekolah.'), 'XLSX must include Kokurikuler notes');
  assert.ok(sheetXml.includes('Pramuka'), 'XLSX must include Ekstrakurikuler');

  // 2. Validate .docx archive structure and XML content
  const docxBytes = await buildRaporDocxBuffer(samplePayload);
  assert.ok(docxBytes instanceof Uint8Array && docxBytes.length > 0, 'DOCX buffer must be non-empty');
  const docxZip = await JSZip.loadAsync(docxBytes);
  assert.ok(docxZip.file('[Content_Types].xml'), 'DOCX must contain [Content_Types].xml');
  assert.ok(docxZip.file('word/styles.xml'), 'DOCX must contain word/styles.xml');
  const docXml = await docxZip.file('word/document.xml')?.async('string');
  assert.ok(docXml, 'DOCX must contain word/document.xml');
  assert.ok(docXml.includes('Aisyah &amp; Budi &lt;Test&gt;'), 'DOCX must escape XML entities');
  assert.ok(docXml.includes('Matematika'), 'DOCX must include subject name');
  assert.ok(docXml.includes('88.5'), 'DOCX must include grade');
  assert.ok(docXml.includes('Pertahankan prestasi dan kedisiplinan.'), 'DOCX must include catatan wali');

  // 3. Validate RaporView.tsx UI integration
  const raporPath = path.join(process.cwd(), 'src', 'components', 'RaporView.tsx');
  const raporSource = fs.readFileSync(raporPath, 'utf-8');
  assert.ok(raporSource.includes("handleDownloadRapor('xlsx')"), 'RaporView must wire .xlsx download button');
  assert.ok(raporSource.includes("handleDownloadRapor('docx')"), 'RaporView must wire .docx download button');

  console.log('PASS: rapor_export_xlsx_docx');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
