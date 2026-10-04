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
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    !isFinite(lat) ||
    !isFinite(lon) ||
    isNaN(lat) ||
    isNaN(lon)
  ) {
    return '[Lokasi Tidak Terdeteksi]';
  }
  const fallback = `[GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}]`;

  // Quantize coordinates to ~110m (3 decimal places) for caching
  const quantLat = lat.toFixed(3);
  const quantLon = lon.toFixed(3);
  const cacheKey = `nominatim_loc_${quantLat}_${quantLon}`;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {
      // ignore storage access errors
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `/api/geocode?lat=${lat}&lon=${lon}`;
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
      } catch {
        // ignore storage write errors
      }
    }

    return formatted;
  } catch {
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
  mirror: boolean = false,
  orientation?: 'portrait' | 'landscape'
): string {
  // Determine width and height based on element type
  let width = 640;
  let height = 480;

  if (typeof HTMLVideoElement !== 'undefined' && videoElement instanceof HTMLVideoElement) {
    width = videoElement.videoWidth || videoElement.clientWidth || 640;
    height = videoElement.videoHeight || videoElement.clientHeight || 480;
  } else if (typeof HTMLImageElement !== 'undefined' && videoElement instanceof HTMLImageElement) {
    width = videoElement.naturalWidth || videoElement.width || 640;
    height = videoElement.naturalHeight || videoElement.height || 480;
  }

  // Calculate crop dimensions based on requested orientation or source aspect ratio
  // Anti-zoom 1x scale: If orientation matches the source stream, preserve full 1x scale without artificial crop.
  // Only center-crop when orientation mismatches (e.g., desktop horizontal webcam in portrait mode).
  const isPortrait = orientation === 'portrait' || (!orientation && width < height);

  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (isPortrait) {
    if (width >= height) {
      // Orientation mismatch: source is landscape (e.g. desktop webcam) but portrait requested
      // Center-crop width to achieve vertical portrait orientation (3:4 ratio)
      const targetRatio = 3 / 4;
      drawWidth = height * targetRatio;
      drawHeight = height;
      offsetX = (width - drawWidth) / 2;
    } else {
      // Source is already vertical/portrait: preserve full 1x scale without artificial zoom/crop
      drawWidth = width;
      drawHeight = height;
      offsetX = 0;
      offsetY = 0;
    }
  } else {
    // Landscape mode requested
    if (width < height) {
      // Orientation mismatch: source is portrait but landscape requested
      // Center-crop height to achieve horizontal landscape orientation (16:9 ratio)
      const targetRatio = 16 / 9;
      drawWidth = width;
      drawHeight = width / targetRatio;
      offsetY = (height - drawHeight) / 2;
    } else {
      // Source is already horizontal/landscape: preserve full 1x scale without artificial zoom/crop
      drawWidth = width;
      drawHeight = height;
      offsetX = 0;
      offsetY = 0;
    }
  }

  const canvas = document.createElement('canvas');
  // Canvas dimensions conform to target ratio (3:4 portrait or 16:9 landscape)
  canvas.width = Math.round(drawWidth);
  canvas.height = Math.round(drawHeight);
  drawWidth = canvas.width;
  drawHeight = canvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  // Draw media frame with crop (simulating CSS object-cover)
  if (mirror) {
    // Mirror horizontally for front-facing selfie camera
    ctx.save();
    ctx.translate(drawWidth, 0); // ctx.translate(width, 0)
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
    ctx.restore();
  } else {
    ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight, 0, 0, drawWidth, drawHeight);
  }

  // Re-assign width and height to cropped dimensions for watermark positioning
  width = drawWidth;
  height = drawHeight;

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
  if (
    options.coordinates &&
    typeof options.coordinates.latitude === 'number' &&
    typeof options.coordinates.longitude === 'number' &&
    isFinite(options.coordinates.latitude) &&
    isFinite(options.coordinates.longitude) &&
    !isNaN(options.coordinates.latitude) &&
    !isNaN(options.coordinates.longitude)
  ) {
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
 * Gracefully handles non-data URLs (e.g. remote HTTP URLs) and malformed base64 without throwing DOMException.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  if (!dataUrl || !dataUrl.includes(',')) {
    return new File([], filename, { type: 'image/jpeg' });
  }
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  try {
    const binaryStr = atob(parts[1]);
    let n = binaryStr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = binaryStr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (err) {
    console.warn('[dataUrlToFile] Failed to decode base64, returning placeholder File:', err);
    return new File([], filename, { type: mime });
  }
}

