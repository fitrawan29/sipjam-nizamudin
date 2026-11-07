const fs = require('fs');

const sql = fs.readFileSync('supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql', 'utf8');

// For each table, find FK columns and check if NOT NULL is specified
const tableBlocks = sql.split(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\./i).slice(1);

const results = [];

tableBlocks.forEach(block => {
  const tName = block.match(/^([a-zA-Z0-9_]+)/)[1];
  const lines = block.split('\n');
  lines.forEach(line => {
    if (/REFERENCES\s+public\.([a-zA-Z0-9_]+)/i.test(line)) {
      const colMatch = line.match(/^\s*([a-zA-Z0-9_]+)/);
      const targetMatch = line.match(/REFERENCES\s+public\.([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
      const isNotNull = /NOT\s+NULL/i.test(line);
      const onDelete = line.match(/ON\s+DELETE\s+([A-Z\s]+)/i);
      if (colMatch && targetMatch) {
        results.push({
          table: tName,
          column: colMatch[1],
          targetTable: targetMatch[1],
          targetCol: targetMatch[2],
          isNotNull,
          onDelete: onDelete ? onDelete[1].trim() : 'RESTRICT'
        });
      }
    }
  });
});

console.log(JSON.stringify(results, null, 2));
