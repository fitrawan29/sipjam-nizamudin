'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';

export default function LoginScreen({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Attempt secure login via verify_login RPC
      let userData: any = null;
      const { data: rpcData, error: rpcError } = await supabase.rpc('verify_login', {
        p_username: username.trim(),
        p_password: password
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        userData = rpcData[0];
      } else {
        // Fallback: direct table select
        const { data: tableData, error: tableError } = await supabase
          .from('users')
          .select('id, username, nama, role, sekolah_id')
          .eq('username', username.trim())
          .eq('password', password)
          .single();

        if (!tableError && tableData) {
          userData = tableData;
        }
      }

      if (!userData) {
        Swal.fire({
          icon: 'error',
          title: 'Login Gagal',
          text: 'ID Pengguna atau Kata Sandi salah.',
          confirmButtonColor: '#0B4619'
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
    <div id="login-screen" className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden h-full">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-100 dark:bg-green-900/10 rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-100 dark:bg-yellow-900/10 rounded-full blur-3xl opacity-40 z-0 pointer-events-none"></div>
      
      <div className="glass-card w-full max-w-md p-6 sm:p-8 border-t-4 border-nizamudin-green dark:border-nizamudin-gold text-center relative z-10 mx-auto">
        <div className="w-20 h-20 bg-nizamudin-green rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border-4 border-white dark:border-gray-800">
            <i className="fa-solid fa-graduation-cap text-3xl text-nizamudin-gold"></i>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">SIPJAM SaaS Portal</h1>
        <h2 className="text-[11px] font-semibold text-gray-700 dark:text-white uppercase tracking-widest mb-6">Presensi & Jurnal Multi-Sekolah</h2>
        
        <form onSubmit={handleLogin} className="text-left space-y-4 relative z-20">
            <div>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                required 
                className="w-full px-4 py-3.5 input-premium text-sm font-medium text-gray-900 dark:text-white" 
                placeholder="ID Pengguna / Username" 
              />
            </div>
            <div>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required 
                className="w-full px-4 py-3.5 input-premium text-sm font-medium text-gray-900 dark:text-white" 
                placeholder="Kata Sandi" 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-click w-full bg-nizamudin-green text-white dark:text-nizamudin-gold font-bold py-3.5 rounded-2xl shadow-md mt-6 text-sm flex justify-center items-center gap-2 disabled:opacity-50"
            >
                {loading ? 'Memproses...' : <>Masuk Sistem <i className="fa-solid fa-arrow-right"></i></>}
            </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Multi-Tenant SaaS • Superadmin, Admin Sekolah & Guru
          </p>
        </div>
      </div>
    </div>
  );
}
