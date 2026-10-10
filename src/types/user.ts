export interface AppUser {
  id: string;
  username: string;
  nama: string;
  role: string;
  sekolah_id: string;
  session_token: string;
  avatar?: string | null;
  wali_kelas?: string | { kelas: string } | null;
  nip?: string;
  name?: string;
  penugasan?: any;
  [key: string]: any;
}
