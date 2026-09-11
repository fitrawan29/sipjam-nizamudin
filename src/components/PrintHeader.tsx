'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';

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
        console.error('PrintHeader config error:', err);
      }
    };
    fetchConfig();
  }, []);

  const logoYayasan = transformGoogleDriveUrl(config.logo_yayasan || config.logo_kiri || config.LOGO_KIRI_URL || '');
  const logoDinas = transformGoogleDriveUrl(config.logo_dinas || config.logo_kanan || config.LOGO_KANAN_URL || '');
  const yayasan = config.kop_yayasan || config.NAMA_YAYASAN || '';
  const sekolah = config.kop_sekolah || config.NAMA_SEKOLAH || 'SMA NIZAMUDIN';
  const alamat = config.kop_alamat || config.ALAMAT_SEKOLAH || '';
  const npsn = config.kop_npsn || config.NPSN || '';

  // Dynamic font size scaling based on address length to ensure single-line fit without logo overlap
  const getAddressFontSize = (text: string) => {
    const len = text ? text.length : 0;
    if (len > 110) return '0.45rem';
    if (len > 95) return '0.52rem';
    if (len > 80) return '0.58rem';
    if (len > 65) return '0.65rem';
    if (len > 50) return '0.72rem';
    if (len > 35) return '0.8rem';
    return '0.875rem';
  };

  return (
    <div className="print-header print-only mb-6 border-b-4 border-black pb-4 text-black font-medium leading-none">
      <div className="flex items-center justify-between gap-2">
        {/* Left Logo Container (Yayasan) */}
        <div className="shrink-0 w-24 h-24 flex items-center justify-center">
          {logoYayasan ? (
            <img src={logoYayasan} alt="Logo Yayasan" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-20 h-20" />
          )}
        </div>

        {/* Center Text Container */}
        <div className="print-header-center flex-1 min-w-0 text-center px-2 sm:px-4 overflow-hidden leading-none">
          {yayasan && (
            <h2 className="text-base sm:text-lg font-bold uppercase text-black leading-none tracking-wide mb-1">
              {yayasan}
            </h2>
          )}
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black leading-none mb-1.5">
            {sekolah}
          </h1>
          {alamat && (
            <p
              className="print-address text-black whitespace-nowrap leading-none tracking-tight overflow-hidden"
              style={{
                whiteSpace: 'nowrap',
                lineHeight: 1,
                fontSize: getAddressFontSize(alamat),
                ['--address-font-size' as any]: getAddressFontSize(alamat)
              }}
              title={alamat}
            >
              {alamat}
            </p>
          )}
          {npsn && (
            <p className="text-xs sm:text-sm font-bold mt-1.5 text-black leading-none">
              NPSN: {npsn}
            </p>
          )}
        </div>

        {/* Right Logo Container (Dinas) */}
        <div className="shrink-0 w-24 h-24 flex items-center justify-center">
          {logoDinas ? (
            <img src={logoDinas} alt="Logo Dinas" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-20 h-20" />
          )}
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
        console.error('PrintSignature config error:', err);
      }
    };
    fetchConfig();
    
    const today = new Date();
    // Format Indonesian Date using WITA timezone (Asia/Makassar)
    const formattedDate = today.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    setDateStr(formattedDate);
  }, []);

  // Dynamically resolve region (Kabupaten / Kota) from config or extract from kop_alamat
  const getRegion = () => {
    if (config.kota_kabupaten && typeof config.kota_kabupaten === 'string' && config.kota_kabupaten.trim()) {
      return config.kota_kabupaten.trim();
    }
    if (config.KOTA_KABUPATEN && typeof config.KOTA_KABUPATEN === 'string' && config.KOTA_KABUPATEN.trim()) {
      return config.KOTA_KABUPATEN.trim();
    }
    if (config.kota_ttd && typeof config.kota_ttd === 'string' && config.kota_ttd.trim()) {
      return config.kota_ttd.trim();
    }
    if (config.KOTA_TTD && typeof config.KOTA_TTD === 'string' && config.KOTA_TTD.trim()) {
      return config.KOTA_TTD.trim();
    }
    const alamat = config.kop_alamat || config.ALAMAT_SEKOLAH || '';
    if (alamat && typeof alamat === 'string') {
      const match = alamat.match(/(Kab\.\s*[^,]+|Kota\s*[^,]+|Kabupaten\s*[^,]+)/i);
      if (match) return match[1].trim();
    }
    return '';
  };

  const region = getRegion();
  const kepsekNama = config.ttd_kepsek_nama || config.NAMA_KEPALA_SEKOLAH || 'Kepala Sekolah';
  const kepsekNip = config.ttd_kepsek_nip || config.NIP_KEPALA_SEKOLAH || '';

  return (
    <div className="print-only print-signature mt-10 flex justify-end ml-auto text-black" style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: 'auto' }}>
      <div className="text-center w-64 ml-auto text-black">
        <p className="leading-tight text-xs sm:text-sm">{region ? `${region}, ` : ''}{dateStr}</p>
        <p className="mb-24 leading-tight text-xs sm:text-sm">Kepala Sekolah</p>
        <p className="font-bold underline leading-tight text-xs sm:text-sm">{kepsekNama}</p>
        <p className="leading-tight text-[11px] sm:text-xs">
          {kepsekNip && kepsekNip !== '-' ? `NIP. ${kepsekNip}` : 'NIP. -'}
        </p>
      </div>
    </div>
  );
}
