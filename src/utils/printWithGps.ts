import Swal from 'sweetalert2';

export interface GpsPrintCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string;
}

export interface PrintWithGpsOptions {
  onCoordinatesAcquired?: (coords: GpsPrintCoordinates) => void;
  onErrorAlert?: (message: string) => void;
  timeoutMs?: number;
  enableHighAccuracy?: boolean;
}

/**
 * Global cache for current print job GPS coordinates
 */
declare global {
  interface Window {
    __SIPJAM_PRINT_GPS__?: GpsPrintCoordinates | null;
  }
}

/**
 * Triggers native window.print() after acquiring device GPS coordinates.
 * Coordinates are formatted and embedded in official document legal footers.
 * If geolocation permission is denied or blocked, displays a SweetAlert notification.
 */
export async function triggerPrintWithGps(options: PrintWithGpsOptions = {}): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!navigator.geolocation) {
    const errorMsg = 'Browser Anda tidak mendukung layanan geolokasi GPS.';
    if (options.onErrorAlert) {
      options.onErrorAlert(errorMsg);
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'GPS Tidak Didukung',
        text: errorMsg,
        confirmButtonColor: '#0B4619'
      });
    }
    return false;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GpsPrintCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };

        // Cache on window for PrintSignature security footer
        window.__SIPJAM_PRINT_GPS__ = coords;

        if (options.onCoordinatesAcquired) {
          options.onCoordinatesAcquired(coords);
        }

        // Allow DOM to re-render with GPS badge before opening blocking print dialog
        setTimeout(() => {
          window.print();
          resolve(true);
        }, 150);
      },
      async (err) => {
        let errorTitle = 'Akses GPS Terkendala';
        let errorMessage = 'Gagal mendeteksi lokasi GPS.';

        if (err.code === err.PERMISSION_DENIED) {
          errorTitle = 'Akses GPS Diblokir';
          errorMessage = 'Izin lokasi browser diblokir atau ditolak. Mohon izinkan akses lokasi (GPS) pada pengaturan browser Anda untuk mencetak dokumen resmi.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorTitle = 'Sinyal GPS Tidak Tersedia';
          errorMessage = 'Titik lokasi GPS tidak dapat ditemukan pada perangkat Anda.';
        } else if (err.code === err.TIMEOUT) {
          errorTitle = 'Waktu GPS Habis';
          errorMessage = 'Waktu permintaan sinyal GPS habis. Silakan coba lagi.';
        }

        if (options.onErrorAlert) {
          options.onErrorAlert(errorMessage);
        } else {
          await Swal.fire({
            icon: 'warning',
            title: errorTitle,
            text: errorMessage,
            confirmButtonColor: '#0B4619'
          });
        }
        resolve(false);
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeoutMs ?? 7000,
        maximumAge: 60000
      }
    );
  });
}

export const printWithGps = triggerPrintWithGps;
export default triggerPrintWithGps;
