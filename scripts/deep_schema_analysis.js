const fs = require('fs');
const path = require('path');

// Read SETUP_NEW_SCHOOL_TEMPLATE.sql and migrations
const templateSql = fs.readFileSync('supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql', 'utf8');

// Function to extract CREATE TABLE blocks
function extractTables(sql) {
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\n\);/gi;
  const result = {};
  let match;
  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1].toLowerCase();
    const tableBody = match[2];
    result[tableName] = tableBody;
  }
  return result;
}

const templateTables = extractTables(templateSql);

// Also extract from migrations
const migrationFiles = fs.readdirSync('supabase/migrations');
const migrationTables = {};
migrationFiles.forEach(f => {
  if (f.endsWith('.sql')) {
    const c = fs.readFileSync(path.join('supabase/migrations', f), 'utf8');
    const mt = extractTables(c);
    Object.assign(migrationTables, mt);
  }
});

const allSqlTables = { ...templateTables, ...migrationTables };

console.log('SQL Tables found:', Object.keys(allSqlTables).length);

// Analyze columns, PK, FKs, constraints for each table
function analyzeTable(tableName, body) {
  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('--'));
  
  let pk = 'id'; // default assumption
  const fks = [];
  let hasSekolahId = false;
  let sekolahIdNullable = true;
  const cols = [];

  lines.forEach(line => {
    // Check primary key
    const pkMatch = line.match(/^([a-zA-Z0-9_]+)\s+[^,]*\bPRIMARY\s+KEY\b/i);
    if (pkMatch) {
      pk = pkMatch[1];
    }
    const tablePkMatch = line.match(/^CONSTRAINT\s+[a-zA-Z0-9_]+\s+PRIMARY\s+KEY\s*\(([^)]+)\)/i) || line.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (tablePkMatch) {
      pk = tablePkMatch[1].replace(/["\s]/g, '');
    }

    // Check column
    const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+(?:\([^)]+\))?)/i);
    if (colMatch && !line.toUpperCase().startsWith('CONSTRAINT') && !line.toUpperCase().startsWith('PRIMARY KEY') && !line.toUpperCase().startsWith('FOREIGN KEY')) {
      const colName = colMatch[1];
      cols.push(colName);
      if (colName.toLowerCase() === 'sekolah_id') {
        hasSekolahId = true;
        if (/NOT\s+NULL/i.test(line)) {
          sekolahIdNullable = false;
        }
      }
    }

    // Check inline REFERENCES
    const inlineFkMatch = line.match(/^([a-zA-Z0-9_]+)\s+[^,]*\bREFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?(?:\s+ON\s+DELETE\s+([A-Za-z\s]+))?/i);
    if (inlineFkMatch) {
      const col = inlineFkMatch[1];
      const targetTable = inlineFkMatch[2].toLowerCase();
      const targetCol = inlineFkMatch[3] || 'id';
      const onDelete = inlineFkMatch[4] ? inlineFkMatch[4].trim() : 'NO ACTION';
      const isNullable = !/NOT\s+NULL/i.test(line);
      fks.push({
        column: col,
        targetTable,
        targetCol,
        onDelete,
        isNullable
      });
    }

    // Check table-level CONSTRAINT FOREIGN KEY
    const constraintFkMatch = line.match(/(?:CONSTRAINT\s+[a-zA-Z0-9_]+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:public\.)?([a-zA-Z0-9_]+)\s*(?:\(([^)]+)\))?(?:\s+ON\s+DELETE\s+([A-Za-z\s]+))?/i);
    if (constraintFkMatch) {
      const col = constraintFkMatch[1].replace(/["\s]/g, '');
      const targetTable = constraintFkMatch[2].toLowerCase();
      const targetCol = constraintFkMatch[3] ? constraintFkMatch[3].replace(/["\s]/g, '') : 'id';
      const onDelete = constraintFkMatch[4] ? constraintFkMatch[4].trim() : 'NO ACTION';
      fks.push({
        column: col,
        targetTable,
        targetCol,
        onDelete,
        isNullable: true // assume nullable unless proven
      });
    }
  });

  return {
    tableName,
    pk,
    hasSekolahId,
    sekolahIdNullable,
    fks,
    cols
  };
}

const analysis = {};
for (const [tName, body] of Object.entries(allSqlTables)) {
  analysis[tName] = analyzeTable(tName, body);
}

// Write out JSON
fs.writeFileSync('scripts/schema_analysis_output.json', JSON.stringify(analysis, null, 2));
console.log('Analyzed tables:', Object.keys(analysis).length);
