const fs = require('fs');
const path = require('path');

// 1. Check database.ts
const dbTs = fs.readFileSync('src/types/database.ts', 'utf8');
const tablesMatch = dbTs.match(/Tables: \{([\s\S]*?)\n    \}\r?\n    Views:/);
const dbTables = [];
if (tablesMatch) {
  const tableBlock = tablesMatch[1];
  const matches = tableBlock.matchAll(/^\s{6}([a-zA-Z0-9_]+): \{/gm);
  for (const m of matches) {
    dbTables.push(m[1]);
  }
}

// 2. Check SETUP_NEW_SCHOOL_TEMPLATE.sql
const templateSql = fs.readFileSync('supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql', 'utf8');
const templateTables = [];
const tMatches = templateSql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi);
for (const m of tMatches) {
  templateTables.push(m[1].toLowerCase());
}

// 3. Search all .from('...') in src/
function walk(dir) {
  let res = [];
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next' && f !== '.git') res = res.concat(walk(p));
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) {
      res.push(p);
    }
  });
  return res;
}

const allSrcFiles = walk('src');
const fromTables = new Set();
allSrcFiles.forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const fromMatches = c.matchAll(/\.from\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/g);
  for (const m of fromMatches) {
    fromTables.add(m[1]);
  }
});

console.log('--- Tables in database.ts (count: ' + dbTables.length + ') ---');
console.log(dbTables.sort());

console.log('\n--- Tables in SETUP_NEW_SCHOOL_TEMPLATE.sql (count: ' + templateTables.length + ') ---');
console.log(templateTables.sort());

console.log('\n--- Tables queried in src/ .from() (count: ' + fromTables.size + ') ---');
console.log(Array.from(fromTables).sort());

// Check diffs
const all = new Set([...dbTables, ...templateTables, ...fromTables]);
console.log('\n--- All unique entities discovered (count: ' + all.size + ') ---');
console.log(Array.from(all).sort());
