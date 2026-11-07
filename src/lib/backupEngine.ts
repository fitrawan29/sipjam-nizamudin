import JSZip from 'jszip';
import { supabase } from '@/lib/supabaseClient';

export interface EntityConfig {
  name: string;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  isView?: boolean;
  isRootId?: boolean;
  photoColumns?: string[];
}

export const TOPOLOGICAL_LEVELS: Record<string, string[]> = {
  'Level 0': ['sekolah', 'sekolah_registry', 'pengaturan'],
  'Level 1': [
    'users',
    'data_mapel',
    'data_siswa',
    'kalender_pendidikan',
    'sistem_blok',
    'syarat_perangkat_pembelajaran',
    'jadwal_piket',
    'piket_form_lock',
    'pengumuman',
    'riwayat_backup'
  ],
  'Level 2': [
    'data_guru',
    'jadwal_pelajaran',
    'presensi_guru',
    'jurnal_pembelajaran',
    'laporan_piket',
    'presensi_siswa',
    'absensi',
    'bank_dokumen',
    'chat_messages',
    'push_subscriptions',
    'pengumuman_dibaca',
    'pengumuman_tanggapan'
  ],
  'Level 3': ['guru_mapel', 'wali_kelas', 'penugasan_piket'],
  'Level 4': ['capaian_pembelajaran', 'tujuan_pembelajaran'],
  'Level 5': ['asesmen_kolom', 'nilai_siswa', 'guru_kelas']
};

export const ALL_BACKUP_ENTITIES: EntityConfig[] = [
  // ============================================================================
  // LEVEL 0: Independent Root Tables (3 Entitas)
  // ============================================================================
  {
    name: 'sekolah',
    level: 0,
    isRootId: true,
    photoColumns: ['logo_url', 'logo_kiri_url', 'logo_kanan_url']
  },
  {
    name: 'sekolah_registry',
    level: 0,
    isRootId: true
  },
  {
    name: 'pengaturan',
    level: 0
  },

  // ============================================================================
  // LEVEL 1: Core Master & Config Tables (10 Entitas)
  // ============================================================================
  {
    name: 'users',
    level: 1,
    photoColumns: ['avatar']
  },
  {
    name: 'data_mapel',
    level: 1
  },
  {
    name: 'data_siswa',
    level: 1
  },
  {
    name: 'kalender_pendidikan',
    level: 1
  },
  {
    name: 'sistem_blok',
    level: 1
  },
  {
    name: 'syarat_perangkat_pembelajaran',
    level: 1
  },
  {
    name: 'jadwal_piket',
    level: 1
  },
  {
    name: 'piket_form_lock',
    level: 1
  },
  {
    name: 'pengumuman',
    level: 1,
    photoColumns: ['lampiran_url']
  },
  {
    name: 'riwayat_backup',
    level: 1
  },

  // ============================================================================
  // LEVEL 2: Extended Master & Activity Transactions (12 Entitas)
  // ============================================================================
  {
    name: 'data_guru',
    level: 2
  },
  {
    name: 'jadwal_pelajaran',
    level: 2
  },
  {
    name: 'presensi_guru',
    level: 2,
    photoColumns: ['link_bukti']
  },
  {
    name: 'jurnal_pembelajaran',
    level: 2,
    photoColumns: ['foto_kegiatan', 'link_bukti_foto']
  },
  {
    name: 'laporan_piket',
    level: 2,
    photoColumns: ['link_foto']
  },
  {
    name: 'presensi_siswa',
    level: 2
  },
  {
    name: 'absensi',
    level: 2
  },
  {
    name: 'bank_dokumen',
    level: 2,
    photoColumns: ['link_file']
  },
  {
    name: 'chat_messages',
    level: 2
  },
  {
    name: 'push_subscriptions',
    level: 2
  },
  {
    name: 'pengumuman_dibaca',
    level: 2
  },
  {
    name: 'pengumuman_tanggapan',
    level: 2
  },

  // ============================================================================
  // LEVEL 3: Teacher Relational Assignments (3 Entitas)
  // ============================================================================
  {
    name: 'guru_mapel',
    level: 3
  },
  {
    name: 'wali_kelas',
    level: 3
  },
  {
    name: 'penugasan_piket',
    level: 3
  },

  // ============================================================================
  // LEVEL 4: Learning Objectives & Curriculum (2 Entitas)
  // ============================================================================
  {
    name: 'capaian_pembelajaran',
    level: 4
  },
  {
    name: 'tujuan_pembelajaran',
    level: 4
  },

  // ============================================================================
  // LEVEL 5: Assessment Columns & Student Grades (2 Tables + 1 View)
  // ============================================================================
  {
    name: 'asesmen_kolom',
    level: 5
  },
  {
    name: 'nilai_siswa',
    level: 5
  },
  {
    name: 'guru_kelas',
    level: 5,
    isView: true
  }
];

export interface BackupProgressCallback {
  (step: string, current: number, total: number): void;
}

export interface BackupManifest {
  appName: string;
  app_name?: string;
  version: string;
  timestamp: string;
  sekolah_id: string;
  sekolah_nama: string;
  exportedBy: string;
  tahun_backup: string;
  totalEntities: number;
  tableCounts: Record<string, number>;
  assetCount: number;
  topologicalLevels: Record<string, string[]>;
  photos?: Array<{
    table: string;
    recordId: string;
    column: string;
    path: string;
  }>;
}

/**
 * Fetch all rows from a table using PostgREST range pagination (1000 items/page).
 * Non-destructive and safe against missing tables (e.g. schema cache fallback).
 */
export async function fetchTableRowsPaginated(
  tableName: string,
  isRootId: boolean,
  targetSekolahId: string
): Promise<any[]> {
  let allRows: any[] = [];
  let from = 0;
  const limit = 1000;

  while (true) {
    try {
      let q = supabase.from(tableName).select('*').range(from, from + limit - 1);
      if (isRootId) {
        q = q.eq('id', targetSekolahId);
      } else {
        q = q.eq('sekolah_id', targetSekolahId);
      }
      const { data, error } = await q;
      if (error) {
        console.warn(`[BackupEngine] Query warning on ${tableName}:`, error.message);
        break;
      }
      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < limit) break;
      from += limit;
    } catch (err: any) {
      console.warn(`[BackupEngine] Exception fetching ${tableName}:`, err.message);
      break;
    }
  }

  return allRows;
}

/**
 * Executes a full system backup:
 * - Fetches all 33 database entities
 * - Packages JSON into data/<table_name>.json
 * - Extracts photo/media assets into foto/<folder>/ with compression: 'STORE'
 * - Creates manifest.json
 * - Generates zip Blob
 * - Logs audit record to riwayat_backup
 */
export async function createFullSystemBackupZip(
  user: any,
  tahun: string,
  onProgress?: BackupProgressCallback
): Promise<{
  blob: Blob;
  fileName: string;
  manifest: BackupManifest;
}> {
  const targetSekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';

  // 1. Get school profile for naming
  let sekolahNama = 'Sekolah';
  try {
    const { data: sekolahRow } = await supabase
      .from('sekolah')
      .select('nama')
      .eq('id', targetSekolahId)
      .maybeSingle();
    if (sekolahRow?.nama) {
      sekolahNama = sekolahRow.nama;
    }
  } catch (err) {
    console.warn('[BackupEngine] Failed to fetch sekolah profile:', err);
  }

  const cleanSchool = sekolahNama.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `backup_sipjam_${cleanSchool}_${timestampStr}.zip`;

  const zip = new JSZip();
  const dataFolder = zip.folder('data')!;
  const fotoFolder = zip.folder('foto')!;

  const tableCounts: Record<string, number> = {};
  const photoEntries: Array<{ table: string; recordId: string; column: string; path: string }> = [];
  let assetCount = 0;

  const totalEntities = ALL_BACKUP_ENTITIES.length;

  for (let i = 0; i < totalEntities; i++) {
    const entity = ALL_BACKUP_ENTITIES[i];
    onProgress?.(`Mengambil data ${entity.name}...`, i + 1, totalEntities);

    const rows = await fetchTableRowsPaginated(entity.name, !!entity.isRootId, targetSekolahId);
    tableCounts[entity.name] = rows.length;

    // Extract photo assets
    if (entity.photoColumns && rows.length > 0) {
      for (const row of rows) {
        for (const col of entity.photoColumns) {
          const val = row[col];
          if (!val || typeof val !== 'string' || val === '-' || val.startsWith('avatar_')) {
            continue;
          }

          // Case A: Base64 Data URL
          if (val.startsWith('data:image/')) {
            const match = val.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
            if (match) {
              const mime = match[1];
              const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
              const base64Content = match[2];

              let subfolder = entity.name;
              if (entity.name === 'users') subfolder = 'avatars';
              else if (entity.name === 'sekolah') subfolder = 'sekolah';
              else if (entity.name === 'presensi_guru') subfolder = 'presensi';
              else if (entity.name === 'jurnal_pembelajaran') subfolder = 'jurnal';
              else if (entity.name === 'laporan_piket') subfolder = 'piket';

              const assetPath = `${subfolder}/${row.id || 'asset'}_${col}.${ext}`;
              // ponytail: compression: 'STORE' for images avoids redundant re-compression
              fotoFolder.file(assetPath, base64Content, { base64: true, compression: 'STORE' });
              assetCount++;
              photoEntries.push({
                table: entity.name,
                recordId: row.id,
                column: col,
                path: `foto/${assetPath}`
              });
            }
          }
          // Case B: HTTP URL (Supabase or web)
          else if (val.startsWith('http://') || val.startsWith('https://')) {
            try {
              // Non-blocking fetch with 4s timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 4000);
              const resp = await fetch(val, { signal: controller.signal, mode: 'cors' }).catch(() => null);
              clearTimeout(timeoutId);

              if (resp && resp.ok) {
                const arrayBuf = await resp.arrayBuffer();
                const contentType = resp.headers.get('content-type') || 'image/jpeg';
                const ext = contentType.includes('png') ? 'png' : 'jpg';

                let subfolder = entity.name;
                if (entity.name === 'users') subfolder = 'avatars';
                else if (entity.name === 'sekolah') subfolder = 'sekolah';
                else if (entity.name === 'presensi_guru') subfolder = 'presensi';
                else if (entity.name === 'jurnal_pembelajaran') subfolder = 'jurnal';
                else if (entity.name === 'laporan_piket') subfolder = 'piket';

                const assetPath = `${subfolder}/${row.id || 'asset'}_${col}.${ext}`;
                fotoFolder.file(assetPath, arrayBuf, { binary: true, compression: 'STORE' });
                assetCount++;
                photoEntries.push({
                  table: entity.name,
                  recordId: row.id,
                  column: col,
                  path: `foto/${assetPath}`
                });
              }
            } catch (err: any) {
              console.warn(`[BackupEngine] Skipped remote asset ${val}:`, err.message);
            }
          }
        }
      }
    }

    // Write table JSON
    dataFolder.file(`${entity.name}.json`, JSON.stringify(rows, null, 2));
  }

  // Ensure foto/ directory is explicitly present in ZIP even if zero assets found
  if (assetCount === 0) {
    fotoFolder.file('.gitkeep', '');
  }

  // 2. Build manifest.json
  const manifest: BackupManifest = {
    appName: 'sipjam-app',
    app_name: 'sipjam-app',
    version: '2.0',
    timestamp: new Date().toISOString(),
    sekolah_id: targetSekolahId,
    sekolah_nama: sekolahNama,
    exportedBy: `${user?.nama || 'Admin'} (${user?.role || 'Admin'})`,
    tahun_backup: tahun || new Date().getFullYear().toString(),
    totalEntities: 33,
    tableCounts,
    assetCount,
    topologicalLevels: TOPOLOGICAL_LEVELS,
    photos: photoEntries
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // 3. Compress ZIP
  onProgress?.('Mengompresi berkas cadangan ZIP...', totalEntities, totalEntities);
  const blob = await zip.generateAsync({
    type: 'blob',
    streamFiles: true,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  // 4. Record audit log to riwayat_backup
  try {
    await supabase.from('riwayat_backup').insert([
      {
        id: crypto.randomUUID(),
        sekolah_id: targetSekolahId,
        timestamp: new Date().toISOString(),
        tahun_backup: tahun || new Date().getFullYear().toString(),
        link_file: fileName,
        status: 'Sukses',
        keterangan: `Cadangan ZIP 33 tabel & ${assetCount} aset foto (${fileName})`
      }
    ]);
  } catch (auditErr) {
    console.error('[BackupEngine] Failed to record riwayat_backup:', auditErr);
  }

  return { blob, fileName, manifest };
}

/**
 * Validates a backup archive before restoration.
 */
export async function validateBackupZip(
  zip: JSZip
): Promise<{ valid: boolean; error?: string; manifest?: BackupManifest }> {
  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) {
    return { valid: false, error: 'Berkas ZIP tidak valid: manifest.json tidak ditemukan di root arsip.' };
  }

  try {
    const raw = await manifestEntry.async('text');
    const manifest = JSON.parse(raw);
    const appName = manifest.appName || manifest.app_name;
    if (appName !== 'sipjam-app' && appName !== 'SIPJAM') {
      return {
        valid: false,
        error: `Arsip bukan untuk aplikasi SIPJAM (aplikasi terdaftar: "${appName || 'tidak diketahui'}").`
      };
    }
    return { valid: true, manifest };
  } catch {
    return { valid: false, error: 'Berkas manifest.json rusak atau bukan format JSON yang valid.' };
  }
}

/**
 * Restores system data from a ZIP archive:
 * - Validates manifest.json
 * - Restores photos from foto/
 * - Restores database tables in strict topological order from Level 0 to Level 5
 * - Upserts in chunks of 100 with ignoreDuplicates
 * - Skips database views (such as guru_kelas)
 */
export async function restoreFullSystemBackupZip(
  file: File | Blob,
  currentUser: any,
  onProgress?: BackupProgressCallback
): Promise<{
  restoredTableCount: number;
  restoredRowCount: number;
  manifest: BackupManifest;
}> {
  const targetSekolahId = currentUser?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
  const zip = await JSZip.loadAsync(file);

  const validation = await validateBackupZip(zip);
  if (!validation.valid || !validation.manifest) {
    throw new Error(validation.error || 'Validasi ZIP gagal.');
  }

  const manifest = validation.manifest;

  // 1. Photo Restoration: Build in-memory Data URL maps for local base64 restoration
  const photoMap = new Map<string, string>();
  const avatarMap = new Map<string, string>();
  const logoMap = new Map<string, string>();

  // 1a. If manifest has photos array, read them directly
  if (manifest.photos && Array.isArray(manifest.photos)) {
    for (const p of manifest.photos) {
      const fileEntry = zip.file(p.path);
      if (fileEntry) {
        try {
          const ext = p.path.split('.').pop() || 'png';
          const mime = ext.toLowerCase() === 'jpg' ? 'jpeg' : ext.toLowerCase();
          const b64 = await fileEntry.async('base64');
          const dataUrl = `data:image/${mime};base64,${b64}`;
          photoMap.set(`${p.table}:${p.recordId}:${p.column}`, dataUrl);
          if (p.table === 'users' && p.column === 'avatar') avatarMap.set(p.recordId, dataUrl);
          if (p.table === 'sekolah' && p.column === 'logo_url') logoMap.set(p.recordId, dataUrl);
        } catch (e) {
          console.warn(`[BackupEngine] Failed to decode photo ${p.path}:`, e);
        }
      }
    }
  }

  // 1b. Also scan zip files under foto/ folder for direct path mapping
  for (const [relativePath, zipObj] of Object.entries(zip.files)) {
    if (zipObj.dir || !relativePath.startsWith('foto/')) continue;
    const parts = relativePath.split('/');
    if (parts.length < 3) continue;
    const subfolder = parts[1];
    const filename = parts.slice(2).join('/');
    const ext = filename.split('.').pop() || 'png';
    const mime = ext.toLowerCase() === 'jpg' ? 'jpeg' : ext.toLowerCase();

    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const nameParts = nameWithoutExt.split('_');
    const recordId = nameParts[0];
    const colName = nameParts.length > 1 ? nameParts.slice(1).join('_') : '';

    let tableName = '';
    let defaultCol = '';
    if (subfolder === 'avatars') {
      tableName = 'users';
      defaultCol = 'avatar';
    } else if (subfolder === 'sekolah') {
      tableName = 'sekolah';
      defaultCol = 'logo_url';
    } else if (subfolder === 'presensi') {
      tableName = 'presensi_guru';
      defaultCol = 'link_bukti';
    } else if (subfolder === 'jurnal') {
      tableName = 'jurnal_pembelajaran';
      defaultCol = 'foto_kegiatan';
    } else if (subfolder === 'piket') {
      tableName = 'laporan_piket';
      defaultCol = 'link_foto';
    } else if (subfolder === 'dokumen') {
      tableName = 'bank_dokumen';
      defaultCol = 'link_file';
    }

    if (tableName) {
      const targetCol = colName || defaultCol;
      const key = `${tableName}:${recordId}:${targetCol}`;
      if (!photoMap.has(key)) {
        try {
          const b64 = await zipObj.async('base64');
          const dataUrl = `data:image/${mime};base64,${b64}`;
          photoMap.set(key, dataUrl);
          if (tableName === 'users' && targetCol === 'avatar') avatarMap.set(recordId, dataUrl);
          if (tableName === 'sekolah' && targetCol === 'logo_url') logoMap.set(recordId, dataUrl);
        } catch (e) {
          console.warn(`[BackupEngine] Failed to decode photo ${relativePath}:`, e);
        }
      }
    }
  }

  // 2. Strict Topological Restoration (Level 0 through Level 5)
  let restoredTableCount = 0;
  let restoredRowCount = 0;
  const chunkSize = 100;

  for (let level = 0; level <= 5; level++) {
    const levelEntities = ALL_BACKUP_ENTITIES.filter((e) => e.level === level);

    for (const entity of levelEntities) {
      if (entity.isView) {
        // Skip database views
        continue;
      }

      const tableFile = zip.file(`data/${entity.name}.json`);
      if (!tableFile) continue;

      onProgress?.(`Memulihkan data ${entity.name} (Level ${level})...`, restoredTableCount + 1, 33);

      let rows: any[] = [];
      try {
        const rawJson = await tableFile.async('text');
        rows = JSON.parse(rawJson);
      } catch (err: any) {
        console.warn(`[BackupEngine] Parse error on data/${entity.name}.json:`, err.message);
        continue;
      }

      if (!Array.isArray(rows) || rows.length === 0) continue;

      // Re-link photos if applicable
      if (entity.photoColumns && entity.photoColumns.length > 0) {
        rows = rows.map((r) => {
          let updated = { ...r };
          for (const col of entity.photoColumns!) {
            const key = `${entity.name}:${r.id}:${col}`;
            if (photoMap.has(key)) {
              updated[col] = photoMap.get(key);
            }
          }
          if (entity.name === 'users' && avatarMap.has(r.id)) {
            updated.avatar = avatarMap.get(r.id);
          }
          if (entity.name === 'sekolah' && logoMap.has(r.id)) {
            updated.logo_url = logoMap.get(r.id);
          }
          return updated;
        });
      }

      // Chunked upsert
      for (let idx = 0; idx < rows.length; idx += chunkSize) {
        const chunk = rows.slice(idx, idx + chunkSize);
        const scopedChunk = chunk.map((r: any) => {
          if (entity.isRootId) return r;
          return {
            ...r,
            sekolah_id: r.sekolah_id || targetSekolahId
          };
        });

        try {
          const { error: upsertErr } = await supabase
            .from(entity.name)
            .upsert(scopedChunk, { ignoreDuplicates: true });
          if (upsertErr) {
            console.warn(`[BackupEngine] Warning during restore ${entity.name}:`, upsertErr.message);
          }
        } catch (upsertExc: any) {
          console.warn(`[BackupEngine] Exception upserting ${entity.name}:`, upsertExc.message);
        }
      }

      restoredTableCount++;
      restoredRowCount += rows.length;
    }
  }

  // 3. Record restore audit log to riwayat_backup
  try {
    await supabase.from('riwayat_backup').insert([
      {
        id: crypto.randomUUID(),
        sekolah_id: targetSekolahId,
        timestamp: new Date().toISOString(),
        tahun_backup: manifest.tahun_backup || new Date().getFullYear().toString(),
        link_file: (file as any).name || 'restore.zip',
        status: 'Sukses',
        keterangan: `Restore dari berkas ZIP: ${restoredRowCount} baris data dari ${restoredTableCount} tabel dipulihkan`
      }
    ]);
  } catch (auditErr) {
    console.error('[BackupEngine] Failed to record restore audit:', auditErr);
  }

  return { restoredTableCount, restoredRowCount, manifest };
}
