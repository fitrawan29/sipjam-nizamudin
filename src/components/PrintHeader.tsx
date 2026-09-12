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
      <div className="flex items-center justify-center gap-4 sm:gap-8 max-w-4xl mx-auto">
        {/* Left Logo Container (Yayasan) */}
        {logoYayasan && (
          <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <img src={logoYayasan} alt="Logo Yayasan" className="max-w-full max-h-full object-contain" />
          </div>
        )}

        {/* Center Text Container */}
        <div className="print-header-center flex-1 min-w-0 text-center px-2 overflow-hidden leading-none">
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
        {logoDinas && (
          <div className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <img src={logoDinas} alt="Logo Dinas" className="max-w-full max-h-full object-contain" />
          </div>
        )}
      </div>
    </div>
  );
}

export interface PrintSignatureProps {
  leftTitle?: string;
  leftSubtitle?: string;
  leftName?: string;
  leftNip?: string;
  rightTitle?: string;
  rightName?: string;
  rightNip?: string;
  singleColumn?: boolean;
}

export function PrintSignature({
  leftTitle,
  leftSubtitle,
  leftName,
  leftNip,
  rightTitle,
  rightName,
  rightNip,
  singleColumn = false
}: PrintSignatureProps = {}) {
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
  const kepsekNama = rightName || config.ttd_kepsek_nama || config.NAMA_KEPALA_SEKOLAH || 'Kepala Sekolah';
  const kepsekNip = rightNip || config.ttd_kepsek_nip || config.NIP_KEPALA_SEKOLAH || '';
  const defaultKepalaTitle = (config.kop_sekolah || config.NAMA_SEKOLAH) ? `Kepala ${config.kop_sekolah || config.NAMA_SEKOLAH}` : 'Kepala Sekolah';

  const containerClass = singleColumn
    ? "print-only print-signature mt-10 flex justify-end ml-auto text-black"
    : "print-only print-signature w-full flex justify-between items-start mt-8 pt-4 page-break-inside-avoid text-black";

  const containerStyle = singleColumn
    ? { display: 'flex', justifyContent: 'flex-end', marginLeft: 'auto' }
    : { display: 'flex', justifyContent: 'space-between', width: '100%' };

  return (
    <div className={containerClass} style={containerStyle}>
      {/* Left Signer: Guru Mata Pelajaran / Wali Kelas */}
      {!singleColumn && (
        <div className="text-center min-w-[200px] text-black">
          <span className="block whitespace-nowrap text-xs sm:text-sm font-medium leading-normal">
            {leftTitle || 'Mengetahui,'}
          </span>
          <span className="block whitespace-nowrap text-xs sm:text-sm leading-normal">
            {leftSubtitle || 'Guru Mata Pelajaran'}
          </span>
          <div className="h-20 sm:h-24" />
          <div className="inline-block text-left">
            <span className="block whitespace-nowrap font-bold underline text-xs sm:text-sm leading-normal">
              {leftName || '( ........................................ )'}
            </span>
            <span className="block whitespace-nowrap text-[11px] sm:text-xs leading-normal">
              {leftNip && leftNip !== '-' ? `NIP. ${leftNip}` : 'NIP. -'}
            </span>
          </div>
        </div>
      )}

      {/* Right Signer: Kepala Sekolah with [Kabupaten/Kota], [Date] */}
      <div className={`text-center min-w-[200px] text-black ${singleColumn ? 'w-64 ml-auto' : ''}`}>
        <span className="block whitespace-nowrap text-xs sm:text-sm font-medium leading-normal">
          {region ? `${region}, ` : ''}{dateStr}
        </span>
        <span className="block whitespace-nowrap text-xs sm:text-sm leading-normal">
          {rightTitle || defaultKepalaTitle}
        </span>
        <div className="h-20 sm:h-24" />
        <div className="inline-block text-left">
          <span className="block whitespace-nowrap font-bold underline text-xs sm:text-sm leading-normal">
            {kepsekNama}
          </span>
          <span className="block whitespace-nowrap text-[11px] sm:text-xs leading-normal">
            {kepsekNip && kepsekNip !== '-' ? `NIP. ${kepsekNip}` : 'NIP. -'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PrintOrientationToggle({
  orientation,
  setOrientation
}: {
  orientation: 'landscape' | 'portrait';
  setOrientation: (val: 'landscape' | 'portrait') => void;
}) {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 ${orientation} !important;
            margin: ${orientation === 'landscape' ? '8mm 10mm' : '12mm 15mm'} !important;
          }
          header, nav, aside, .app-header, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
      <div className="flex items-center gap-2 no-print">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
          <i className="fa-solid fa-arrows-rotate text-[11px] text-gray-400"></i> Orientasi Cetak:
        </span>
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 p-1 shadow-inner">
          <button
            type="button"
            onClick={() => setOrientation('portrait')}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              orientation === 'portrait'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-file text-[11px]"></i> Portrait
          </button>
          <button
            type="button"
            onClick={() => setOrientation('landscape')}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              orientation === 'landscape'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-file fa-rotate-90 text-[11px]"></i> Landscape
          </button>
        </div>
      </div>
    </>
  );
}

export function formatPeriodHeader(bulan?: string, startDate?: string, endDate?: string): string {
  const formatDateIndo = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    return dateStr;
  };

  if (startDate && endDate) {
    if (startDate === endDate) {
      return `Periode: ${formatDateIndo(startDate)}`;
    }
    return `Periode: ${formatDateIndo(startDate)} - ${formatDateIndo(endDate)}`;
  }
  if (startDate && !endDate) {
    return `Periode: Sejak ${formatDateIndo(startDate)}`;
  }
  if (!startDate && endDate) {
    return `Periode: Sampai ${formatDateIndo(endDate)}`;
  }
  if (bulan && bulan.includes('-')) {
    const [year, month] = bulan.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mIdx = parseInt(month, 10) - 1;
    const monthName = monthNames[mIdx] || month;
    return `Periode: ${monthName} ${year}`;
  }
  return 'Periode: Semua Data';
}
