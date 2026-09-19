import { getWitaDateLong } from './wita';

export interface WatermarkCoordinates {
  latitude: number;
  longitude: number;
}

export interface WatermarkOptions {
  timestamp: string;
  coordinates: WatermarkCoordinates | null;
  dateText: string;
  locationName?: string | null;
}

/**
 * Helper to generate default watermark options using current WITA date and time.
 */
export function getDefaultWatermarkOptions(
  coordinates: WatermarkCoordinates | null = null,
  locationName: string | null = null
): WatermarkOptions {
  const now = new Date();
  
  // Format WITA time: e.g. "10:45:00 WITA"
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Makassar',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const timeStr = `${timeFormatter.format(now)} WITA`;

  // Format Indonesian date: e.g. "Kamis, 17 September 2026"
  const dateStr = getWitaDateLong(now);

  return {
    timestamp: timeStr,
    coordinates,
    dateText: dateStr,
    locationName,
  };
}

/**
 * Reverse geocodes coordinates via OpenStreetMap Nominatim API.
 * Uses coordinate quantization (~110m) with sessionStorage caching,
 * and a 3.5-second AbortController timeout with fallback to clean GPS coordinates.
 *
 * Target format: "[desa/kelurahan, kecamatan, kota/kabupaten, provinsi]"
 */
export async function reverseGeocodeNominatim(lat: number, lon: number): Promise<string> {
  const fallback = `[GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}]`;
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return '[Lokasi Tidak Terdeteksi]';
  }

  // Quantize coordinates to ~110m (3 decimal places) for caching
  const quantLat = lat.toFixed(3);
  const quantLon = lon.toFixed(3);
  const cacheKey = `nominatim_loc_${quantLat}_${quantLon}`;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch (_) {}
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return fallback;
    }

    const data = await res.json();
    const addr = data?.address || {};

    const desa = addr.village || addr.kelurahan || addr.suburb || addr.quarter || addr.neighbourhood || addr.hamlet || addr.residential || '';
    const kec = addr.subdistrict || addr.kecamatan || addr.municipality || addr.district || addr.city_district || (addr.town !== desa ? addr.town : '') || '';
    const kota = addr.city || addr.regency || addr.county || addr.state_district || addr.region || '';
    const prov = addr.state || addr.province || '';

    const parts = [desa, kec, kota, prov].map(p => (p || '').trim()).filter(Boolean);
    const formatted = parts.length > 0 ? `[${parts.join(', ')}]` : fallback;

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(cacheKey, formatted);
      } catch (_) {}
    }

    return formatted;
  } catch (_) {
    return fallback;
  }
}

/**
 * Draws a video frame (or image) onto an HTML5 canvas and embeds a high-contrast
 * watermarked dark pill badge at the bottom-center of the image.
 *
 * Fully client-side processing without server dependency.
 *
 * @param videoElement HTMLVideoElement (or HTMLImageElement for fallback)
 * @param options Object containing timestamp, coordinates, and dateText
 * @returns base64 data URL of the watermarked JPEG image
 */
export function drawWatermarkedCanvas(
  videoElement: HTMLVideoElement | HTMLImageElement,
  options: WatermarkOptions,
  mirror: boolean = false
): string {
  // Determine width and height based on element type
  let width = 640;
  let height = 480;

  if (videoElement instanceof HTMLVideoElement) {
    width = videoElement.videoWidth || videoElement.clientWidth || 640;
    height = videoElement.videoHeight || videoElement.clientHeight || 480;
  } else if (videoElement instanceof HTMLImageElement) {
    width = videoElement.naturalWidth || videoElement.width || 640;
    height = videoElement.naturalHeight || videoElement.height || 480;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Draw media frame
  if (mirror) {
    // Mirror horizontally for front-facing selfie camera
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, width, height);
    ctx.restore();
  } else {
    ctx.drawImage(videoElement, 0, 0, width, height);
  }

  // Calculate proportional scaling
  const scale = Math.max(0.65, Math.min(width / 720, 2.0));

  // Pill / Badge dimensions
  const hasLocation = Boolean(options.locationName);
  const badgeWidth = Math.min(width * 0.90, Math.max(340 * scale, width * 0.72));
  const badgeHeight = Math.round((hasLocation ? 116 : 96) * scale);
  const badgeX = (width - badgeWidth) / 2;
  const bottomOffset = Math.round(20 * scale);
  const badgeY = height - badgeHeight - bottomOffset;
  const badgeRadius = Math.round(18 * scale);

  // Draw semi-transparent dark pill background
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
  } else {
    ctx.moveTo(badgeX + badgeRadius, badgeY);
    ctx.arcTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + badgeHeight, badgeRadius);
    ctx.arcTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX, badgeY + badgeHeight, badgeRadius);
    ctx.arcTo(badgeX, badgeY + badgeHeight, badgeX, badgeY, badgeRadius);
    ctx.arcTo(badgeX, badgeY, badgeX + badgeWidth, badgeY, badgeRadius);
    ctx.closePath();
  }

  // High-contrast semi-transparent dark fill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)'; // Slate-900 with 78% opacity
  ctx.fill();

  // Subtle light border stroke for clear edge definition
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = Math.max(1, Math.round(1.5 * scale));
  ctx.stroke();

  // Text inside badge
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text drop shadow for high readability against any background
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = Math.round(4 * scale);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(1 * scale);

  const centerX = badgeX + badgeWidth / 2;
  const titleFontSize = Math.round((hasLocation ? 13.5 : 15) * scale);
  const locFontSize = Math.round(11 * scale);
  const coordFontSize = Math.round((hasLocation ? 11 : 12.5) * scale);
  const timeFontSize = Math.round((hasLocation ? 13 : 14) * scale);

  // Format coordinates string
  let coordText = 'GPS: Lokasi Tidak Terdeteksi';
  if (options.coordinates && typeof options.coordinates.latitude === 'number' && typeof options.coordinates.longitude === 'number') {
    coordText = `Lat: ${options.coordinates.latitude.toFixed(6)}, Long: ${options.coordinates.longitude.toFixed(6)}`;
  }

  if (hasLocation) {
    const verticalSpacing = badgeHeight / 5;
    const line1Y = badgeY + verticalSpacing * 0.95;
    const line2Y = badgeY + verticalSpacing * 1.95;
    const line3Y = badgeY + verticalSpacing * 2.95;
    const line4Y = badgeY + verticalSpacing * 3.95;

    // Line 1: Date in Indonesian format (e.g. Kamis, 17 September 2026)
    ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(options.dateText || getWitaDateLong(new Date()), centerX, line1Y);

    // Line 2: Location Name formatted as [desa/kelurahan, kecamatan, kota/kabupaten, provinsi]
    ctx.font = `600 ${locFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#38BDF8'; // Sky-400 for clear distinguishable location
    let locStr = options.locationName || '';
    const maxTextWidth = badgeWidth - 24 * scale;
    if (ctx.measureText(locStr).width > maxTextWidth) {
      while (locStr.length > 10 && ctx.measureText(locStr + '...').width > maxTextWidth) {
        locStr = locStr.slice(0, -1);
      }
      locStr = locStr + '...';
    }
    ctx.fillText(locStr, centerX, line2Y);

    // Line 3: Coordinates (e.g. Lat: -8.123456, Long: 115.123456)
    ctx.font = `600 ${coordFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif`;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillText(coordText, centerX, line3Y);

    // Line 4: WITA time (e.g. 10:45:00 WITA)
    ctx.font = `bold ${timeFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(options.timestamp || 'WITA', centerX, line4Y);
  } else {
    const verticalSpacing = badgeHeight / 4;
    const line1Y = badgeY + verticalSpacing * 0.95;
    const line2Y = badgeY + verticalSpacing * 2.0;
    const line3Y = badgeY + verticalSpacing * 3.05;

    // Top line: Date in Indonesian format (e.g. Kamis, 17 September 2026)
    ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(options.dateText || getWitaDateLong(new Date()), centerX, line1Y);

    // Middle line: Coordinates (e.g. Lat: -8.123456, Long: 115.123456)
    ctx.font = `600 ${coordFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif`;
    ctx.fillStyle = '#F8FAFC'; // High-contrast clean white
    ctx.fillText(coordText, centerX, line2Y);

    // Bottom line: WITA time (e.g. 10:45:00 WITA)
    ctx.font = `bold ${timeFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(options.timestamp || 'WITA', centerX, line3Y);
  }

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.88);
}

/**
 * Utility to convert base64 data URL into a standard File object for uploads.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binaryStr = atob(parts[1]);
  let n = binaryStr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = binaryStr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
