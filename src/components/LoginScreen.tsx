'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { AppUser } from '@/types/user';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (user: AppUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Use secure verify_login RPC (SECURITY DEFINER — bypasses RLS, works for all roles including Superadmin)
      const { data: rpcData, error: rpcError } = await supabase.rpc('verify_login', {
        p_username: username.trim(),
        p_password: password
      });

      if (rpcError) {
        console.error('[LoginScreen] RPC Error:', rpcError);
        
        if (rpcError.message && rpcError.message.includes('Sekolah nonaktif')) {
          Swal.fire({
            icon: 'warning',
            title: 'Akses Diblokir',
            text: 'Akun sekolah Anda telah dinonaktifkan (kemungkinan karena keterlambatan administrasi). Silakan hubungi Superadmin.',
            confirmButtonColor: '#0F766E'
          });
          return;
        }

        Swal.fire({
          icon: 'error',
          title: 'Koneksi Gagal',
          text: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
          confirmButtonColor: '#0F766E'
        });
        return;
      }

      const userData = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (!userData) {
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: 'ID Pengguna atau Kata Sandi salah.',
          confirmButtonColor: '#0F766E'
        });
      } else {
        onLoginSuccess(userData);
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Masuk',
          text: `Selamat datang, ${userData.nama}! (${userData.role})`,
          showConfirmButton: false,
          timer: 1500
        });
      }
    } catch (err) {
      console.error('[LoginScreen] Error:', err);
      Swal.fire('Error', 'Koneksi ke server gagal. Periksa internet Anda.', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div id="login-screen" className="flex-grow flex flex-col items-center justify-center p-5 sm:p-6 relative overflow-hidden h-full">
      <div className="clay-card w-full max-w-md p-6 sm:p-8 lg:p-10 rounded-3xl text-center relative z-10 mx-auto">
        <div className="neu-card w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 p-2">
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#115E59] flex items-center justify-center shadow-inner">
            <i className="fa-solid fa-graduation-cap text-3xl text-white"></i>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-[#F1F5F9] tracking-tight mb-1">SIPJAM Portal</h1>
        <h2 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-7">Presensi & Jurnal Multi-Sekolah</h2>
        
        <form onSubmit={handleLogin} className="text-left space-y-4 relative z-20">
            <div>
              <label htmlFor="login-username" className="form-label">ID Pengguna / Username</label>
              <input 
                id="login-username"
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required 
                className="w-full px-4 py-3.5 input-premium text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]" 
                placeholder="Masukkan ID Pengguna" 
              />
            </div>
            <div>
              <label htmlFor="login-password" className="form-label">Kata Sandi</label>
              <div className="relative">
                <input 
                  id="login-password"
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required 
                  className="w-full pl-4 pr-12 py-3.5 input-premium text-sm font-medium text-[#0F172A] dark:text-[#F1F5F9]" 
                  placeholder="Masukkan Kata Sandi" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 text-slate-500 hover:text-[#0F766E] dark:text-slate-400 dark:hover:text-teal-300 p-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between px-1 pt-0.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white min-h-[36px]">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 text-[#0F766E] focus:ring-[#0F766E] dark:border-slate-600 dark:bg-slate-800 cursor-pointer accent-[#0F766E]"
                />
                <span>Tampilkan Kata Sandi</span>
              </label>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="clay-btn clay-btn-primary btn-click w-full text-white font-bold py-3.5 min-h-[48px] rounded-2xl mt-4 text-sm flex justify-center items-center gap-2 disabled:opacity-50"
            >
                {loading ? 'Memproses...' : <>Masuk Sistem <i className="fa-solid fa-arrow-right"></i></>}
            </button>
        </form>
      </div>
    </div>
  );
}
