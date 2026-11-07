const fs = require('fs');

const sql = fs.readFileSync('supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql', 'utf8');

const tableBlocks = sql.split(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\./i).slice(1);

const photoCols = {};

tableBlocks.forEach(block => {
  const tName = block.match(/^([a-zA-Z0-9_]+)/)[1];
  const lines = block.split('\n');
  const matched = [];
  lines.forEach(l => {
    const m = l.match(/^\s*([a-zA-Z0-9_]+)\s+[A-Za-z0-9_]+/i);
    if (m) {
      const col = m[1];
      if (/foto|avatar|logo|bukti|file|lampiran|url|dokumen|qr_code/i.test(col)) {
        matched.push(col);
      }
    }
  });
  if (matched.length > 0) {
    photoCols[tName] = matched;
  }
});

console.log(JSON.stringify(photoCols, null, 2));
