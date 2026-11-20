import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
import { getDatabaseTargets, getMigrationFiles } from './multi-db-migrator';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function checkHealth() {
  console.log(`\n======================================================`);
  console.log(`🩺 SIPJAM: CLUSTER SUPABASE HEALTH & SCHEMA AUDITOR`);
  console.log(`======================================================\n`);

  const targets = getDatabaseTargets();
  const migrations = getMigrationFiles();

  if (targets.length === 0) {
    console.log(`⚠️ Tidak ada target database yang ditemukan di environment.`);
    console.log(`Set SUPABASE_CLUSTER_DBS atau DB_URL_* di .env.local.`);
    process.exit(0);
  }

  console.log(`🔍 Memeriksa ${targets.length} database target...\n`);

  const results: any[] = [];

  for (const target of targets) {
    const startTime = Date.now();
    const client = new Client({
      connectionString: target.url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      const latency = Date.now() - startTime;

      // Check migration table
      let appliedCount = 0;
      let latestVersion = 'Belum Ada';
      try {
        const migRes = await client.query('SELECT version, executed_at FROM public._schema_migrations ORDER BY executed_at DESC;');
        appliedCount = migRes.rows.length;
        if (migRes.rows.length > 0) {
          latestVersion = migRes.rows[0].version;
        }
      } catch (_) {
        latestVersion = 'Tabel _schema_migrations belum dibuat';
      }

      // Check essential table counts
      const tablesRes = await client.query(`
        SELECT COUNT(*)::int as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      const publicTableCount = tablesRes.rows[0].count;

      await client.end();

      results.push({
        Database: target.name,
        Status: '🟢 ONLINE',
        'Latensi (ms)': `${latency}ms`,
        'Total Tabel': publicTableCount,
        'Migrasi Terpasang': `${appliedCount} / ${migrations.length}`,
        'Migrasi Terakhir': latestVersion.slice(0, 30)
      });
    } catch (err: any) {
      try { await client.end(); } catch (_) {}
      results.push({
        Database: target.name,
        Status: '🔴 OFFLINE',
        'Latensi (ms)': 'TIMEOUT / ERR',
        'Total Tabel': 0,
        'Migrasi Terpasang': 'N/A',
        'Migrasi Terakhir': err.message.slice(0, 30)
      });
    }
  }

  console.table(results);
}

if (require.main === module) {
  checkHealth();
}
