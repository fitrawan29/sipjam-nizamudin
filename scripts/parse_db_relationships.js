const fs = require('fs');

const content = fs.readFileSync('src/types/database.ts', 'utf8');

// Parse Relationships for each table in database.ts
const tableRegex = /^\s{6}([a-zA-Z0-9_]+): \{([\s\S]*?)(?=^\s{6}[a-zA-Z0-9_]+: \{|^\s{4}\}\r?\n\s{4}Views:)/gm;

const tables = {};
let match;
while ((match = tableRegex.exec(content)) !== null) {
  const tableName = match[1];
  const tableBody = match[2];

  // Extract columns from Row: { ... }
  const rowMatch = tableBody.match(/Row: \{([\s\S]*?)\}/);
  const columns = [];
  let hasSekolahId = false;
  if (rowMatch) {
    const colLines = rowMatch[1].split('\n');
    for (const line of colLines) {
      const colM = line.match(/^\s+([a-zA-Z0-9_]+):/);
      if (colM) {
        columns.push(colM[1]);
        if (colM[1] === 'sekolah_id') hasSekolahId = true;
      }
    }
  }

  // Extract Relationships: [ ... ]
  const relMatch = tableBody.match(/Relationships: \[([\s\S]*?)\]/);
  const relationships = [];
  if (relMatch) {
    const relBody = relMatch[1];
    const relObjMatches = relBody.matchAll(/\{\s*foreignKeyName:\s*"([^"]+)"\s*columns:\s*\["([^"]+)"\]\s*isOneToOne:\s*(true|false)\s*referencedRelation:\s*"([^"]+)"\s*referencedColumns:\s*\["([^"]+)"\]\s*\}/g);
    for (const rm of relObjMatches) {
      relationships.push({
        fkName: rm[1],
        column: rm[2],
        isOneToOne: rm[3] === 'true',
        refTable: rm[4],
        refColumn: rm[5]
      });
    }
  }

  tables[tableName] = {
    columns,
    hasSekolahId,
    relationships
  };
}

console.log('Tables parsed from database.ts:', Object.keys(tables).length);
console.log(JSON.stringify(tables, null, 2));
