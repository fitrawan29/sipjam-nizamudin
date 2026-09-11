/**
 * Utility for parsing and transforming image URLs, particularly Google Drive share links.
 */

/**
 * Extracts the Google Drive file ID from various URL formats.
 */
export function getGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '-') return null;

  // Check if URL belongs to Google domains or is a direct /d/ path
  const isGoogleDomain = /drive\.google\.com|docs\.google\.com|googleusercontent\.com/i.test(trimmed);
  if (!isGoogleDomain && !trimmed.startsWith('/file/d/') && !trimmed.startsWith('/d/')) {
    return null;
  }

  // Format 1: /file/d/{id} or /d/{id} or /document/d/{id}
  const fileDMatch = trimmed.match(/\/(?:file|document|presentation|spreadsheets)?\/?d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Format 2: ?id={id} or &id={id} (e.g. open?id=..., uc?id=..., thumbnail?id=...)
  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idQueryMatch && idQueryMatch[1]) return idQueryMatch[1];

  return null;
}

/**
 * Transforms a standard Google Drive share link into a direct-renderable image URL.
 * Non-Google Drive URLs are returned unchanged.
 */
export function transformGoogleDriveUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '-') return '';

  const fileId = getGoogleDriveFileId(trimmed);
  if (fileId) {
    // drive.google.com/uc?export=view&id={id} provides direct image streaming
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }

  return trimmed;
}

/**
 * Returns a CDN thumbnail URL for Google Drive images (useful for fast loading of large images).
 */
export function getGoogleDriveThumbnailUrl(url: string | null | undefined, size: number = 800): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '-') return '';

  const fileId = getGoogleDriveFileId(trimmed);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }

  return transformGoogleDriveUrl(trimmed);
}

/**
 * Checks if the given URL is a Google Drive link.
 */
export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  return Boolean(getGoogleDriveFileId(url));
}
