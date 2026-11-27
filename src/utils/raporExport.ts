import JSZip from 'jszip';

export interface RaporExportSubject {
  namaMapel: string;
  nilaiAkhir: number;
  deskripsiCapaian: string;
}

export interface RaporExportPayload {
  schoolName?: string;
  namaSiswa: string;
  nisn: string;
  kelas: string;
  semester: string;
  tahunAjaran: string;
  scores: RaporExportSubject[];
  attendance: {
    sakit: number;
    izin: number;
    alpa: number;
  };
  deepLearning: {
    mindful: string;
    meaningful: string;
    joyful: string;
  };
  catatanWali: string;
  waliNama: string;
  waliNip?: string | null;
  kepalaSekolahLabel?: string;
  kepalaSekolahNama?: string;
  kepalaSekolahNip?: string;
}

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function sanitizeXmlText(value: unknown): string {
  return String(value ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSafeFilename(payload: RaporExportPayload, ext: 'xlsx' | 'docx'): string {
  const clean = (v: string) =>
    String(v || '')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_');
  const ta = clean(payload.tahunAjaran.replace(/\//g, '-'));
  return `E-Rapor_${clean(payload.namaSiswa)}_Kelas_${clean(payload.kelas)}_Semester_${clean(payload.semester)}_TA_${ta}.${ext}`;
}

function colIndexToLetter(index: number): string {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

interface XlsxCell {
  value: string | number;
  style?: number;
}

function buildXlsxRowXml(rowNum: number, cells: XlsxCell[]): string {
  const cellXml = cells
    .map((cell, idx) => {
      const ref = `${colIndexToLetter(idx)}${rowNum}`;
      const styleAttr = cell.style !== undefined ? ` s="${cell.style}"` : '';
      if (typeof cell.value === 'number' && Number.isFinite(cell.value)) {
        return `<c r="${ref}"${styleAttr} t="n"><v>${cell.value}</v></c>`;
      }
      return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${sanitizeXmlText(cell.value)}</t></is></c>`;
    })
    .join('');
  return `<row r="${rowNum}">${cellXml}</row>`;
}

export async function buildRaporXlsxBuffer(payload: RaporExportPayload): Promise<Uint8Array> {
  const zip = new JSZip();

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Rapor Siswa" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // Styles:
  // 0: default (wrapText)
  // 1: title bold 13pt
  // 2: section/label bold
  // 3: table header (bold, gray fill, thin border, center/left)
  // 4: table body text (thin border, wrapText)
  // 5: table body center/numeric (thin border, center)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="13"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2E8F0"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
  </cellXfs>
</styleSheet>`;

  const rows: string[] = [];
  let r = 1;

  if (payload.schoolName) {
    rows.push(buildXlsxRowXml(r++, [{ value: payload.schoolName, style: 1 }]));
  }
  rows.push(buildXlsxRowXml(r++, [{ value: 'LAPORAN HASIL BELAJAR (E-RAPOR SMA)', style: 1 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: `KURIKULUM DEEP LEARNING — SEMESTER ${payload.semester.toUpperCase()} TAHUN AJARAN ${payload.tahunAjaran}`, style: 2 }]));
  r++;

  rows.push(buildXlsxRowXml(r++, [{ value: 'Nama Siswa', style: 2 }, { value: payload.namaSiswa, style: 0 }, { value: 'Kelas', style: 2 }, { value: payload.kelas, style: 0 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: 'NISN', style: 2 }, { value: payload.nisn, style: 0 }, { value: 'Semester / T.A.', style: 2 }, { value: `${payload.semester} / ${payload.tahunAjaran}`, style: 0 }]));
  r++;

  rows.push(buildXlsxRowXml(r++, [{ value: 'A. NILAI CAPAIAN PEMBELAJARAN', style: 2 }]));
  rows.push(buildXlsxRowXml(r++, [
    { value: 'No', style: 3 },
    { value: 'Mata Pelajaran', style: 3 },
    { value: 'Nilai Akhir', style: 3 },
    { value: 'Capaian Kompetensi / Capaian Pembelajaran', style: 3 }
  ]));

  if (payload.scores.length === 0) {
    rows.push(buildXlsxRowXml(r++, [
      { value: '-', style: 5 },
      { value: 'Belum ada mata pelajaran yang memiliki nilai untuk siswa ini.', style: 4 },
      { value: '-', style: 5 },
      { value: '-', style: 4 }
    ]));
  } else {
    payload.scores.forEach((item, idx) => {
      rows.push(buildXlsxRowXml(r++, [
        { value: idx + 1, style: 5 },
        { value: item.namaMapel, style: 4 },
        { value: item.nilaiAkhir, style: 5 },
        { value: item.deskripsiCapaian, style: 4 }
      ]));
    });
  }

  r++;
  rows.push(buildXlsxRowXml(r++, [{ value: 'B. KETIDAKHADIRAN', style: 2 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: '1. Sakit', style: 4 }, { value: `${payload.attendance.sakit} hari`, style: 4 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: '2. Izin', style: 4 }, { value: `${payload.attendance.izin} hari`, style: 4 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: '3. Tanpa Keterangan (Alpa)', style: 4 }, { value: `${payload.attendance.alpa} hari`, style: 4 }]));

  r++;
  rows.push(buildXlsxRowXml(r++, [{ value: 'C. OBSERVASI KURIKULUM DEEP LEARNING', style: 2 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: '1. Mindful Learning (Kesadaran Belajar)', style: 4 }, { value: payload.deepLearning.mindful || '-', style: 4 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: '2. Meaningful Learning (Pemaknaan Materi)', style: 4 }, { value: payload.deepLearning.meaningful || '-', style: 4 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: '3. Joyful Learning (Kegembiraan Belajar)', style: 4 }, { value: payload.deepLearning.joyful || '-', style: 4 }]));

  r++;
  rows.push(buildXlsxRowXml(r++, [{ value: 'D. CATATAN WALI KELAS', style: 2 }]));
  rows.push(buildXlsxRowXml(r++, [{ value: payload.catatanWali, style: 0 }]));

  r++;
  rows.push(buildXlsxRowXml(r++, [
    { value: 'Mengetahui, Orang Tua / Wali Murid', style: 2 },
    { value: '', style: 0 },
    { value: `Wali Kelas ${payload.kelas}`, style: 2 },
    { value: payload.kepalaSekolahNama ? (payload.kepalaSekolahLabel || 'Kepala Sekolah') : '', style: 2 }
  ]));
  rows.push(buildXlsxRowXml(r++, [
    { value: '...........................................', style: 0 },
    { value: '', style: 0 },
    { value: `${payload.waliNama}${payload.waliNip ? ` (NIP. ${payload.waliNip})` : ''}`, style: 0 },
    { value: payload.kepalaSekolahNama ? `${payload.kepalaSekolahNama}${payload.kepalaSekolahNip ? ` (NIP. ${payload.kepalaSekolahNip})` : ''}` : '', style: 0 }
  ]));

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="16" customWidth="1"/>
    <col min="2" max="2" width="34" customWidth="1"/>
    <col min="3" max="3" width="16" customWidth="1"/>
    <col min="4" max="4" width="64" customWidth="1"/>
  </cols>
  <sheetData>${rows.join('')}</sheetData>
</worksheet>`;

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', workbookRels);
  zip.file('xl/styles.xml', stylesXml);
  zip.file('xl/worksheets/sheet1.xml', sheetXml);

  return zip.generateAsync({ type: 'uint8array' });
}

function docxParagraph(text: string, opts?: { bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right'; size?: number; spaceAfter?: number }): string {
  const align = opts?.align ? `<w:jc w:val="${opts.align}"/>` : '';
  const spaceAfter = opts?.spaceAfter !== undefined ? `<w:spacing w:after="${opts.spaceAfter}"/>` : '<w:spacing w:after="80"/>';
  const bold = opts?.bold ? '<w:b/>' : '';
  const italic = opts?.italic ? '<w:i/>' : '';
  const size = opts?.size ? `<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/>` : '';
  return `<w:p><w:pPr>${align}${spaceAfter}</w:pPr><w:r><w:rPr>${bold}${italic}${size}</w:rPr><w:t xml:space="preserve">${sanitizeXmlText(text)}</w:t></w:r></w:p>`;
}

function docxCell(text: string, opts?: { width?: number; bold?: boolean; italic?: boolean; align?: 'left' | 'center' | 'right'; shade?: string; noBorder?: boolean }): string {
  const tcW = opts?.width ? `<w:tcW w:w="${opts.width}" w:type="dxa"/>` : '';
  const shd = opts?.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.shade}"/>` : '';
  const borders = opts?.noBorder
    ? '<w:tcBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>'
    : '';
  const p = docxParagraph(text, { bold: opts?.bold, italic: opts?.italic, align: opts?.align, size: 20, spaceAfter: 40 });
  return `<w:tc><w:tcPr>${tcW}${shd}${borders}</w:tcPr>${p}</w:tc>`;
}

function docxTable(rowsXml: string[], bordered = true): string {
  const tblBorders = bordered
    ? `<w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="94A3B8"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      </w:tblBorders>`
    : `<w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
        <w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="9638" w:type="dxa"/><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar>${tblBorders}</w:tblPr>${rowsXml.join('')}</w:tbl>`;
}

export async function buildRaporDocxBuffer(payload: RaporExportPayload): Promise<Uint8Array> {
  const zip = new JSZip();

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="21"/><w:szCs w:val="21"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  const bodyParts: string[] = [];

  if (payload.schoolName) {
    bodyParts.push(docxParagraph(payload.schoolName.toUpperCase(), { bold: true, align: 'center', size: 24, spaceAfter: 40 }));
  }
  bodyParts.push(docxParagraph('LAPORAN HASIL BELAJAR (E-RAPOR SMA)', { bold: true, align: 'center', size: 26, spaceAfter: 40 }));
  bodyParts.push(docxParagraph(`KURIKULUM DEEP LEARNING — SEMESTER ${payload.semester.toUpperCase()} TAHUN AJARAN ${payload.tahunAjaran}`, { bold: true, align: 'center', size: 20, spaceAfter: 180 }));

  bodyParts.push(docxTable([
    `<w:tr>${docxCell('Nama Siswa', { width: 1800, bold: true, noBorder: true })}${docxCell(`: ${payload.namaSiswa}`, { width: 3200, bold: true, noBorder: true })}${docxCell('Kelas', { width: 1600, bold: true, noBorder: true })}${docxCell(`: ${payload.kelas}`, { width: 3038, bold: true, noBorder: true })}</w:tr>`,
    `<w:tr>${docxCell('NISN', { width: 1800, bold: true, noBorder: true })}${docxCell(`: ${payload.nisn}`, { width: 3200, noBorder: true })}${docxCell('Semester', { width: 1600, bold: true, noBorder: true })}${docxCell(`: ${payload.semester}`, { width: 3038, noBorder: true })}</w:tr>`,
    `<w:tr>${docxCell('Tahun Ajaran', { width: 1800, bold: true, noBorder: true })}${docxCell(`: ${payload.tahunAjaran}`, { width: 3200, noBorder: true })}${docxCell('', { width: 1600, noBorder: true })}${docxCell('', { width: 3038, noBorder: true })}</w:tr>`
  ], false));

  bodyParts.push(docxParagraph('', { spaceAfter: 120 }));
  bodyParts.push(docxParagraph('A. NILAI CAPAIAN PEMBELAJARAN', { bold: true, size: 22, spaceAfter: 80 }));

  const scoreRows = [
    `<w:tr>${docxCell('No', { width: 650, bold: true, align: 'center', shade: 'E2E8F0' })}${docxCell('Mata Pelajaran', { width: 2500, bold: true, shade: 'E2E8F0' })}${docxCell('Nilai Akhir', { width: 1150, bold: true, align: 'center', shade: 'E2E8F0' })}${docxCell('Capaian Kompetensi / Capaian Pembelajaran', { width: 5338, bold: true, shade: 'E2E8F0' })}</w:tr>`
  ];
  if (payload.scores.length === 0) {
    scoreRows.push(`<w:tr>${docxCell('-', { width: 650, align: 'center' })}${docxCell('Belum ada mata pelajaran yang memiliki nilai untuk siswa ini.', { width: 2500, italic: true })}${docxCell('-', { width: 1150, align: 'center' })}${docxCell('-', { width: 5338 })}</w:tr>`);
  } else {
    payload.scores.forEach((item, idx) => {
      scoreRows.push(`<w:tr>${docxCell(String(idx + 1), { width: 650, align: 'center' })}${docxCell(item.namaMapel, { width: 2500, bold: true })}${docxCell(String(item.nilaiAkhir), { width: 1150, bold: true, align: 'center' })}${docxCell(item.deskripsiCapaian, { width: 5338 })}</w:tr>`);
    });
  }
  bodyParts.push(docxTable(scoreRows, true));

  bodyParts.push(docxParagraph('', { spaceAfter: 120 }));
  bodyParts.push(docxParagraph('B. KETIDAKHADIRAN', { bold: true, size: 22, spaceAfter: 80 }));
  bodyParts.push(docxTable([
    `<w:tr>${docxCell('1. Sakit', { width: 6000 })}${docxCell(`${payload.attendance.sakit} hari`, { width: 3638, bold: true, align: 'right' })}</w:tr>`,
    `<w:tr>${docxCell('2. Izin', { width: 6000 })}${docxCell(`${payload.attendance.izin} hari`, { width: 3638, bold: true, align: 'right' })}</w:tr>`,
    `<w:tr>${docxCell('3. Tanpa Keterangan (Alpa)', { width: 6000 })}${docxCell(`${payload.attendance.alpa} hari`, { width: 3638, bold: true, align: 'right' })}</w:tr>`
  ], true));

  bodyParts.push(docxParagraph('', { spaceAfter: 120 }));
  bodyParts.push(docxParagraph('C. OBSERVASI KURIKULUM DEEP LEARNING', { bold: true, size: 22, spaceAfter: 80 }));
  bodyParts.push(docxTable([
    `<w:tr>${docxCell('1. Mindful Learning (Kesadaran Belajar)', { width: 3600, bold: true })}${docxCell(payload.deepLearning.mindful || '-', { width: 6038, italic: true })}</w:tr>`,
    `<w:tr>${docxCell('2. Meaningful Learning (Pemaknaan Materi)', { width: 3600, bold: true })}${docxCell(payload.deepLearning.meaningful || '-', { width: 6038, italic: true })}</w:tr>`,
    `<w:tr>${docxCell('3. Joyful Learning (Kegembiraan Belajar)', { width: 3600, bold: true })}${docxCell(payload.deepLearning.joyful || '-', { width: 6038, italic: true })}</w:tr>`
  ], true));

  bodyParts.push(docxParagraph('', { spaceAfter: 120 }));
  bodyParts.push(docxParagraph('D. CATATAN WALI KELAS', { bold: true, size: 22, spaceAfter: 80 }));
  bodyParts.push(docxTable([
    `<w:tr>${docxCell(payload.catatanWali, { width: 9638, italic: true })}</w:tr>`
  ], true));

  bodyParts.push(docxParagraph('', { spaceAfter: 200 }));
  const sigCols = payload.kepalaSekolahNama
    ? [
        `<w:tr>${docxCell('Mengetahui,\nOrang Tua / Wali Murid', { width: 3212, align: 'center', noBorder: true })}${docxCell(`Wali Kelas ${payload.kelas}`, { width: 3213, align: 'center', noBorder: true })}${docxCell(payload.kepalaSekolahLabel || 'Kepala Sekolah', { width: 3213, align: 'center', noBorder: true })}</w:tr>`,
        `<w:tr>${docxCell('\n\n...........................................', { width: 3212, align: 'center', noBorder: true })}${docxCell(`\n\n${payload.waliNama}${payload.waliNip ? `\nNIP. ${payload.waliNip}` : ''}`, { width: 3213, align: 'center', bold: true, noBorder: true })}${docxCell(`\n\n${payload.kepalaSekolahNama}${payload.kepalaSekolahNip ? `\nNIP. ${payload.kepalaSekolahNip}` : ''}`, { width: 3213, align: 'center', bold: true, noBorder: true })}</w:tr>`
      ]
    : [
        `<w:tr>${docxCell('Mengetahui,\nOrang Tua / Wali Murid', { width: 4819, align: 'center', noBorder: true })}${docxCell(`Wali Kelas ${payload.kelas}`, { width: 4819, align: 'center', noBorder: true })}</w:tr>`,
        `<w:tr>${docxCell('\n\n...........................................', { width: 4819, align: 'center', noBorder: true })}${docxCell(`\n\n${payload.waliNama}${payload.waliNip ? `\nNIP. ${payload.waliNip}` : ''}`, { width: 4819, align: 'center', bold: true, noBorder: true })}</w:tr>`
      ];
  bodyParts.push(docxTable(sigCols, false));

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join('')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rootRels);
  zip.file('word/_rels/document.xml.rels', wordRels);
  zip.file('word/styles.xml', stylesXml);
  zip.file('word/document.xml', documentXml);

  return zip.generateAsync({ type: 'uint8array' });
}

function triggerBlobDownload(bytes: Uint8Array, filename: string, mimeType: string): void {
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadRaporXlsx(payload: RaporExportPayload): Promise<void> {
  const bytes = await buildRaporXlsxBuffer(payload);
  triggerBlobDownload(bytes, buildSafeFilename(payload, 'xlsx'), MIME_XLSX);
}

export async function downloadRaporDocx(payload: RaporExportPayload): Promise<void> {
  const bytes = await buildRaporDocxBuffer(payload);
  triggerBlobDownload(bytes, buildSafeFilename(payload, 'docx'), MIME_DOCX);
}
