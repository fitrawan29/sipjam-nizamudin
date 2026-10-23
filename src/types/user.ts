export type UserRole = 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | string;

export interface AppUser {
  id: string;
  username: string;
  nama: string;
  role: 'superadmin' | 'admin' | 'guru' | 'dinas_pendidikan' | string;
  sekolah_id: string;
  session_token: string;
  avatar?: string | null;
  wali_kelas?: string | { kelas: string } | null;
  nip?: string;
  name?: string;
  penugasan?: any;
  kota_kabupaten?: string | null;
  [key: string]: any;
}
