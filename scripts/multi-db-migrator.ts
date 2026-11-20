import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

// 1. Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

export interface DatabaseTarget {
  name: string;
  url: string;
}

export interface MigrationFile {
  version: string;
  filename: string;
  filepath: string;
}

export interface MigrationResult {
  name: string;
  status: 'SUCCESS' | 'FAILED' | 'UP_TO_DATE' | 'SKIPPED';
  appliedCount: number;
  totalMigrations: number;
  error?: string;
}

// 2. Discover Database Targets
export function getDatabaseTargets(): DatabaseTarget[] {
  const targets: DatabaseTarget[] = [];

  // A. JSON environment variable: SUPABASE_CLUSTER_DBS
  if (process.env.SUPABASE_CLUSTER_DBS) {
    try {
      const raw = process.env.SUPABASE_CLUSTER_DBS.trim();
      if (raw.startsWith('[') && raw.endsWith(']')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item?.name && item?.url) {
              targets.push({ name: String(item.name).trim(), url: String(item.url).trim() });
            }
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Warning: Failed to parse SUPABASE_CLUSTER_DBS JSON:', (e as Error).message);
    }
  }

  // B. Pattern-based environment variables: DB_URL_* or SUPABASE_DB_URL_*
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('DB_URL_') || key.startsWith('SUPABASE_DB_URL_')) {
      const url = process.env[key]?.trim();
      if (url) {
        const rawName = key.replace(/^(SUPABASE_)?DB_URL_/, '').replace(/_/g, ' ');
        const name = rawName.toUpperCase();
        if (!targets.some(t => t.url === url)) {
          targets.push({ name, url });
        }
      }
    }
  });

  // C. Local config file: supabase/cluster.config.json (optional, ignored by git)
  const configFilePath = path.resolve(process.cwd(), 'supabase/cluster.config.json');
  if (fs.existsSync(configFilePath)) {
    try {
      const content = fs.readFileSync(configFilePath, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item?.name && item?.url && !targets.some(t => t.url === item.url)) {
            targets.push({ name: String(item.name).trim(), url: String(item.url).trim() });
          }
        });
      }
    } catch (e) {
      console.warn('⚠️ Warning: Failed to read supabase/cluster.config.json:', (e as Error).message);
    }
  }

  // D. Fallback default: DATABASE_URL / SUPABASE_DB_URL
  const fallbackUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (fallbackUrl && !targets.some(t => t.url === fallbackUrl)) {
    targets.push({ name: 'PRIMARY_DATABASE', url: fallbackUrl.trim() });
  }

  return targets;
}

// 3. Scan Migration Files
export function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Natural chronological sort due to timestamp prefix

  return files.map(filename => ({
    version: filename.replace(/\.sql$/, ''),
    filename,
    filepath: path.join(migrationsDir, filename)
  }));
}

// 4. Ensure Tracking Table Exists
async function ensureMigrationTable(client: Client): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await client.query(sql);
}

// 5. Get Applied Migrations
async function getAppliedVersions(client: Client): Promise<Set<string>> {
  await ensureMigrationTable(client);
  const res = await client.query('SELECT version FROM public._schema_migrations;');
  return new Set(res.rows.map(r => r.version));
}

// 6. Execute Migrations for a Single Target
async function migrateTarget(
  target: DatabaseTarget,
  migrations: MigrationFile[],
  isDryRun: boolean,
  isBaseline: boolean,
  specificFile?: string
): Promise<MigrationResult> {
  console.log(`\n======================================================`);
  console.log(`📡 Connecting to: [${target.name}]`);
  console.log(`======================================================`);

  const client = new Client({
    connectionString: target.url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    await client.connect();
    console.log(`✅ Connected successfully to PostgreSQL.`);

    const applied = await getAppliedVersions(client);
    console.log(`ℹ️ Current applied migrations in database: ${applied.size} / ${migrations.length}`);

    // If baseline mode requested: mark all existing migrations as already applied
    if (isBaseline) {
      console.log(`🔄 [BASELINE MODE] Registering all ${migrations.length} migrations as already applied...`);
      for (const m of migrations) {
        if (!applied.has(m.version)) {
          if (!isDryRun) {
            await client.query(
              'INSERT INTO public._schema_migrations (version, name, executed_at) VALUES ($1, $2, NOW()) ON CONFLICT (version) DO NOTHING;',
              [m.version, m.filename]
            );
          }
        }
      }
      await client.end();
      return {
        name: target.name,
        status: 'SUCCESS',
        appliedCount: migrations.length - applied.size,
        totalMigrations: migrations.length
      };
    }

    // Filter pending migrations
    let pending = migrations.filter(m => !applied.has(m.version));
    if (specificFile) {
      pending = pending.filter(m => m.filename === specificFile || m.version === specificFile.replace(/\.sql$/, ''));
    }

    if (pending.length === 0) {
      console.log(`🎉 Database [${target.name}] is 100% up-to-date. No pending migrations.`);
      await client.end();
      return {
        name: target.name,
        status: 'UP_TO_DATE',
        appliedCount: 0,
        totalMigrations: migrations.length
      };
    }

    console.log(`⏳ Pending migrations to apply: ${pending.length}`);
    let appliedNow = 0;

    for (const mig of pending) {
      console.log(`  ▶ Applying: ${mig.filename}...`);
      if (isDryRun) {
        console.log(`    [DRY-RUN] Skipped actual execution.`);
        appliedNow++;
        continue;
      }

      const sql = fs.readFileSync(mig.filepath, 'utf8');

      // Execute in transactional block
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO public._schema_migrations (version, name, executed_at) VALUES ($1, $2, NOW()) ON CONFLICT (version) DO NOTHING;',
          [mig.version, mig.filename]
        );
        await client.query('COMMIT');
        console.log(`    ✅ Applied successfully.`);
        appliedNow++;
      } catch (sqlErr: any) {
        await client.query('ROLLBACK');
        console.error(`    ❌ FAILED applying ${mig.filename}!`);
        console.error(`    Reason: ${sqlErr.message}`);
        await client.end();
        return {
          name: target.name,
          status: 'FAILED',
          appliedCount: appliedNow,
          totalMigrations: migrations.length,
          error: `Error in ${mig.filename}: ${sqlErr.message}`
        };
      }
    }

    await client.end();
    return {
      name: target.name,
      status: 'SUCCESS',
      appliedCount: appliedNow,
      totalMigrations: migrations.length
    };
  } catch (err: any) {
    console.error(`❌ Connection failed for [${target.name}]:`, err.message);
    try { await client.end(); } catch (_) {}
    return {
      name: target.name,
      status: 'FAILED',
      appliedCount: 0,
      totalMigrations: migrations.length,
      error: `Connection error: ${err.message}`
    };
  }
}

// 7. Write GitHub Actions Step Summary
function writeGitHubSummary(results: MigrationResult[], isDryRun: boolean): void {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  const title = isDryRun ? '🔍 Supabase Multi-Database Migration (DRY-RUN)' : '🚀 Supabase Multi-Database Migration Summary';
  let md = `## ${title}\n\n`;
  md += `| Database Name | Status | Applied / Total | Detail |\n`;
  md += `| :--- | :--- | :--- | :--- |\n`;

  results.forEach(r => {
    const icon = r.status === 'SUCCESS' ? '✅ SUCCESS' : r.status === 'UP_TO_DATE' ? '🟢 UP TO DATE' : '❌ FAILED';
    const detail = r.error ? `\`${r.error.replace(/\|/g, '-')}\`` : `${r.appliedCount} new migrations`;
    md += `| **${r.name}** | ${icon} | ${r.appliedCount} / ${r.totalMigrations} | ${detail} |\n`;
  });

  md += `\n*Executed at ${new Date().toISOString()} via GitHub Actions*\n`;

  try {
    fs.appendFileSync(summaryFile, md, 'utf8');
  } catch (e) {
    console.warn('Could not write GITHUB_STEP_SUMMARY:', (e as Error).message);
  }
}

// 8. Main Orchestrator
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isBaseline = args.includes('--baseline');

  let schoolFilter: string | undefined;
  const schoolArg = args.find(a => a.startsWith('--school='));
  if (schoolArg) {
    schoolFilter = schoolArg.split('=')[1]?.trim();
  }

  let fileFilter: string | undefined;
  const fileArg = args.find(a => a.startsWith('--file='));
  if (fileArg) {
    fileFilter = fileArg.split('=')[1]?.trim();
  }

  console.log(`\n======================================================`);
  console.log(`🚀 SIPJAM: MULTI-DATABASE SUPABASE MIGRATION ENGINE`);
  console.log(`======================================================`);
  if (isDryRun) console.log(`🔍 MODE: DRY-RUN (Tidak ada perubahan yang ditulis)`);
  if (isBaseline) console.log(`🔄 MODE: BASELINE (Menandai seluruh migrasi sebagai telah diterapkan)`);
  if (schoolFilter) console.log(`🎯 TARGET FILTER: [${schoolFilter}]`);
  if (fileFilter) console.log(`📄 FILE FILTER: [${fileFilter}]`);

  const migrations = getMigrationFiles();
  console.log(`📂 Total migration files found: ${migrations.length}`);

  let targets = getDatabaseTargets();

  if (schoolFilter) {
    targets = targets.filter(t => t.name.toLowerCase().includes(schoolFilter!.toLowerCase()));
  }

  if (targets.length === 0) {
    console.log(`\n⚠️ Tidak ada database target yang dikonfigurasi!`);
    console.log(`Panduan konfigurasi database target:`);
    console.log(`1. Set environment variable SUPABASE_CLUSTER_DBS di .env.local atau GitHub Secrets:`);
    console.log(`   SUPABASE_CLUSTER_DBS='[{"name":"SMA Nizamudin","url":"postgresql://..."},{"name":"SIPJAM-SMANTUTUYAN","url":"postgresql://..."}]'`);
    console.log(`2. Atau set environment variable terpisah:`);
    console.log(`   DB_URL_NIZAMUDIN=postgresql://...`);
    console.log(`   DB_URL_SMANTUTUYAN=postgresql://...`);
    console.log(`3. Atau buat file supabase/cluster.config.json (sudah di-ignore oleh git)\n`);
    process.exit(0);
  }

  console.log(`🎯 Cluster database terdaftar: ${targets.length}`);
  targets.forEach((t, i) => console.log(`  ${i + 1}. ${t.name}`));

  const results: MigrationResult[] = [];

  for (const target of targets) {
    const res = await migrateTarget(target, migrations, isDryRun, isBaseline, fileFilter);
    results.push(res);
  }

  console.log(`\n========================================================================`);
  console.log(`📊 RINGKASAN SINKRONISASI MULTI-DATABASE SUPABASE`);
  console.log(`========================================================================`);
  console.table(
    results.map(r => ({
      Database: r.name,
      Status: r.status,
      'Baru Diterapkan': r.appliedCount,
      'Total Migrasi': r.totalMigrations,
      Catatan: r.error || (r.status === 'UP_TO_DATE' ? 'Sudah Mutakhir' : 'Berhasil Disinkronkan')
    }))
  );

  // Write GitHub Step Summary if running in GitHub Actions
  writeGitHubSummary(results, isDryRun);

  const hasFailure = results.some(r => r.status === 'FAILED');
  if (hasFailure) {
    console.error(`\n❌ Beberapa database mengalami kegagalan migrasi. Periksa log di atas!`);
    process.exit(1);
  } else {
    console.log(`\n✅ Seluruh database Supabase berhasil disinkronkan tanpa error.`);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
