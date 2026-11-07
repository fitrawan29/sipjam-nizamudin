const fs = require('fs');

const sql = fs.readFileSync('supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql', 'utf8');

const tableBlocks = sql.split(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\./i).slice(1);

const tenantInfo = {};

tableBlocks.forEach(block => {
  const tName = block.match(/^([a-zA-Z0-9_]+)/)[1];
  const lines = block.split('\n');
  let hasSekolahId = false;
  let isNotNull = false;
  let type = '';

  lines.forEach(l => {
    const m = l.match(/^\s*sekolah_id\s+([A-Za-z0-9_]+)/i);
    if (m) {
      hasSekolahId = true;
      type = m[1];
      if (/NOT\s+NULL/i.test(l)) {
        isNotNull = true;
      }
    }
  });

  tenantInfo[tName] = {
    hasSekolahId,
    type,
    isNotNull
  };
});

// Also check sekolah, sekolah_registry, data_kelas
tenantInfo['sekolah'] = { hasSekolahId: false, type: 'N/A', isNotNull: false, note: 'Root tenant container (table represents the tenant)' };
tenantInfo['sekolah_registry'] = { hasSekolahId: false, type: 'N/A', isNotNull: false, note: 'Global multi-school directory' };
tenantInfo['data_kelas'] = { hasSekolahId: true, type: 'UUID', isNotNull: true, note: 'Class directory scoped by school' };

console.log(JSON.stringify(tenantInfo, null, 2));
