'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function PrintHeader() {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase.from('pengaturan').select('*');
        if (data && data.length > 0) {
          const newConfig: any = {};
          data.forEach(item => {
            newConfig[item.key] = item.value;
          });
          setConfig(newConfig);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();
  }, []);

  return (
    <div className="print-only mb-6 border-b-4 border-black pb-4 text-black font-medium">
      <div className="flex items-center justify-between">
        <div className="w-24 h-24 flex items-center justify-center">
          {config.logo_kiri && <img src={config.logo_kiri} alt="Logo Kiri" className="max-w-full max-h-full object-contain" />}
        </div>
        <div className="flex-1 text-center px-4">
          {config.kop_yayasan && <h2 className="text-lg font-bold uppercase text-black">{config.kop_yayasan}</h2>}
          <h1 className="text-2xl font-black uppercase tracking-wider text-black">{config.kop_sekolah}</h1>
          <p className="text-sm mt-1 text-black">{config.kop_alamat}</p>
          {config.kop_npsn && <p className="text-sm font-bold mt-1 text-black">NPSN: {config.kop_npsn}</p>}
        </div>
        <div className="w-24 h-24 flex items-center justify-center">
          {config.logo_kanan && <img src={config.logo_kanan} alt="Logo Kanan" className="max-w-full max-h-full object-contain" />}
        </div>
      </div>
    </div>
  );
}

export function PrintSignature() {
  const [config, setConfig] = useState<any>({});
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await supabase.from('pengaturan').select('*');
        if (data && data.length > 0) {
          const newConfig: any = {};
          data.forEach(item => {
            newConfig[item.key] = item.value;
          });
          setConfig(newConfig);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchConfig();
    
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    setDateStr(today.toLocaleDateString('id-ID', options));
  }, []);

  return (
    <div className="print-only mt-10 flex justify-end text-black">
      <div className="text-center w-64 text-black">
        <p>{dateStr}</p>
        <p className="mb-24">Kepala Sekolah</p>
        <p className="font-bold underline">{config.ttd_kepsek_nama}</p>
        {config.ttd_kepsek_nip ? <p>NIP. {config.ttd_kepsek_nip}</p> : null}
      </div>
    </div>
  );
}
