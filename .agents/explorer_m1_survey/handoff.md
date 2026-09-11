# Handoff Report: Requirement R1 - Default Theme & Google Drive Image Rendering

## 1. Observation

### A. Theme Architecture & Current State
1. **`src/app/layout.tsx` (Lines 33–42)**:
   ```tsx
   export default function RootLayout({
     children,
   }: Readonly<{
     children: React.ReactNode;
   }>) {
     return (
       <html lang="id" className="light">
         <head>
           <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
         </head>
         <body className={`${amiri.variable} ${poppins.variable} ${spaceMono.variable} font-sans bg-gray-100 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300`}>
           {children}
         </body>
       </html>
     );
   }
   ```
   - Direct observation: The `<html>` element has `className="light"` at initial render.

2. **`src/components/AppScreen.tsx` (Lines 22–45)**:
   ```tsx
   export default function AppScreen({ user, onLogout }: { user: any, onLogout: () => void }) {
     const [currentView, setCurrentView] = useState('view-home');
     const [sidebarOpen, setSidebarOpen] = useState(false);
     const [theme, setTheme] = useState('light');

     useEffect(() => {
       // Check system preference
       if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
         setTheme('dark');
         document.documentElement.classList.add('dark');
       }
     }, []);

     const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
     
     const toggleTheme = () => {
       if (theme === 'light') {
         setTheme('dark');
         document.documentElement.classList.add('dark');
       } else {
         setTheme('light');
         document.documentElement.classList.remove('dark');
       }
     };
   ```
   - Direct observation: In `AppScreen.tsx` lines 27–33, the component runs `window.matchMedia('(prefers-color-scheme: dark)').matches`. If the operating system or browser is configured for dark mode, it unconditionally sets the theme to `'dark'` and appends the `'dark'` class to `document.documentElement`.
   - Direct observation: Theme selection is never saved to or retrieved from `localStorage`.
   - Direct observation: There is currently no `ThemeContext` or `ThemeProvider` anywhere in the repository (`grep_search` for `createContext` returned no results).

3. **`src/components/AppScreen.tsx` (Lines 130–133)**:
   ```tsx
   <div className="flex items-center gap-2">
       <button type="button" onClick={toggleTheme} className="btn-click w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700">
           <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
       </button>
   ```
   - Direct observation: Theme toggle button exists in the header, toggling between `'dark'` and `'light'`.

### B. Image Rendering & Google Drive Sharing URLs
1. **`src/components/PrintHeader.tsx` (Lines 30–42)**:
   ```tsx
   <div className="w-24 h-24 flex items-center justify-center">
     {config.logo_kiri && <img src={config.logo_kiri} alt="Logo Kiri" className="max-w-full max-h-full object-contain" />}
   </div>
   ...
   <div className="w-24 h-24 flex items-center justify-center">
     {config.logo_kanan && <img src={config.logo_kanan} alt="Logo Kanan" className="max-w-full max-h-full object-contain" />}
   </div>
   ```
   - Direct observation: Direct HTML `<img>` elements render `config.logo_kiri` and `config.logo_kanan` raw without URL parsing or transformation.

2. **`src/components/AdminConfigView.tsx` (Lines 171–180)**:
   ```tsx
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
       <div>
           <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kiri (Dinas)</label>
           <input type="text" name="logo_kiri" value={config.logo_kiri} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting JPEG/PNG" />
       </div>
       <div>
           <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kanan (Sekolah)</label>
           <input type="text" name="logo_kanan" value={config.logo_kanan} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting JPEG/PNG" />
       </div>
   </div>
   ```
   - Direct observation: Admin enters URLs for `logo_kiri` and `logo_kanan`. Users frequently paste standard Google Drive share links (`https://drive.google.com/file/d/.../view?usp=sharing`). No preview exists in this view.

3. **`src/lib/driveUpload.ts` (Lines 24–29)**:
   ```tsx
   const json = await response.json();
   if (json.success && json.url) {
     resolve(json.url);
   }
   ```
   - Direct observation: Files uploaded through the Google Apps Script webhook return `json.url` (typically `https://drive.google.com/file/d/{id}/view?usp=drivesdk` or `https://drive.google.com/open?id={id}`).

4. **`src/components/AdminVerifView.tsx` (Lines 290–316)**:
   ```tsx
   {/* Presensi Tab */}
   {item.link_bukti && item.link_bukti !== '-' && (
     <a href={item.link_bukti} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
       <i className="fa-solid fa-link mr-1"></i> Bukti Lampiran
     </a>
   )}
   ...
   {/* Jurnal Tab */}
   {item.link_bukti_foto && item.link_bukti_foto !== '-' && (
     <a href={item.link_bukti_foto} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
       <i className="fa-solid fa-link mr-1"></i> Bukti Lampiran
     </a>
   )}
   ...
   {/* Piket Tab */}
   {item.link_foto && item.link_foto !== '-' && (
     <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline mt-1 block">
       <i className="fa-solid fa-camera mr-1"></i> Foto Piket
     </a>
   )}
   ```
   - Direct observation: Links are rendered as plain `<a>` tags. In a verification dashboard, administrators need direct visual thumbnail rendering of the uploaded photos.

5. **`src/components/HistoryView.tsx` (Lines 148–158 & 186–196)**:
   - Direct observation: Renders links for `item.link_bukti` ("Lihat Bukti Presensi") and `item.link_bukti_foto` ("Lihat Bukti Foto").

6. **`src/components/PiketView.tsx` (Lines 345–349 & 602–606)**:
   - Direct observation: Renders `item.link_foto` as `<a>` tag with "Foto Piket" and "Lihat Foto Dokumentasi".

7. **`next.config.ts` (Lines 1–8)**:
   ```ts
   import type { NextConfig } from "next";

   const nextConfig: NextConfig = {
     /* config options here */
   };

   export default nextConfig;
   ```
   - Direct observation: No `images.remotePatterns` are declared for `drive.google.com` or `*.googleusercontent.com`.

---

## 2. Logic Chain

### A. Default Theme to Light Mode
1. **Step 1 (Root cause identification)**: From Observation 2 (`AppScreen.tsx` lines 27–33), `window.matchMedia('(prefers-color-scheme: dark)').matches` forces dark mode if the user's OS is configured to dark mode. This causes first-time or unconfigured visits on dark-mode OS devices to become dark mode instead of light mode.
2. **Step 2 (Requirement alignment)**: The user specification states: "Make 'Light Mode' the default theme for the application... Verify that switching themes manually still works, but new or unconfigured sessions default to light mode."
3. **Step 3 (Theme persistence & context)**: To satisfy the acceptance criterion ("confirm theme contexts default to light mode"), a clean React `ThemeContext` (`src/context/ThemeContext.tsx`) with `<ThemeProvider defaultTheme="light">` must be introduced:
   - It sets initial state to `'light'`.
   - On hydration, it checks `localStorage.getItem('sipjam_theme')`.
   - If and only if the user explicitly stored `'dark'`, it activates dark mode (`document.documentElement.classList.add('dark')`).
   - If the stored value is empty/null (new or unconfigured session) or `'light'`, it strictly applies light mode (`document.documentElement.classList.remove('dark')`).
   - It does NOT listen to or apply `prefers-color-scheme: dark`.
   - In `AppScreen.tsx`, the local state and `matchMedia` effect must be replaced with `const { theme, toggleTheme } = useTheme()`.

### B. Google Drive Image Rendering
1. **Step 1 (Root cause identification)**: Standard Google Drive share URLs like `https://drive.google.com/file/d/{id}/view` return an interactive HTML viewer page (`Content-Type: text/html`), not an image binary (`image/jpeg` or `image/png`). When loaded in `<img src="...">`, the browser encounters a MIME type mismatch and fails to render the image.
2. **Step 2 (Drive direct URL endpoints)**: Google Drive provides direct media streaming endpoints given a file ID:
   - `https://drive.google.com/uc?export=view&id={id}` (or `https://drive.google.com/uc?id={id}`)
   - `https://lh3.googleusercontent.com/d/{id}` (Google's CDN direct format)
   - `https://drive.google.com/thumbnail?id={id}&sz=w1000`
   The prompt explicitly recommends `drive.google.com/uc?id=`.
3. **Step 3 (Regex / URL extractor design)**: A standard file ID in Google Drive consists of 25–45 alphanumeric characters including hyphens and underscores (`[a-zA-Z0-9_-]+`). The parser must handle all common input formats:
   - `/file/d/([a-zA-Z0-9_-]+)`
   - `[?&]id=([a-zA-Z0-9_-]+)`
   - `/d/([a-zA-Z0-9_-]+)`
4. **Step 4 (Application targets)**:
   - `PrintHeader.tsx`: Needs `transformGoogleDriveUrl(config.logo_kiri)` and `transformGoogleDriveUrl(config.logo_kanan)` inside `<img src="...">`.
   - `AdminConfigView.tsx`: Add image preview below the logo URL input fields.
   - `AdminVerifView.tsx`, `HistoryView.tsx`, `PiketView.tsx`, `RekapJurnalView.tsx`: Integrate image preview / thumbnail tags (`<img src={transformGoogleDriveUrl(...)} />`) for `link_bukti_foto`, `link_foto`, and `link_bukti`.
   - `driveUpload.ts`: Can sanitize/transform URLs before saving, ensuring compatibility at the source.
   - `next.config.ts`: Add `images.remotePatterns` for `drive.google.com` and `lh3.googleusercontent.com`.

---

## 3. Caveats
1. **Permissions of Google Drive Files**: The URL transformer converts sharing links to direct image stream URLs. However, if the file in Google Drive has not been set to "Anyone with the link can view" (i.e., it is strictly private to an individual Google account), Google will return HTTP 403. All image tags should therefore include an `onError` fallback to prevent broken UI layouts.
2. **Non-Image Files**: In `AdminVerifView`, `HistoryView`, and `DokumenView`, users may sometimes upload PDF files instead of images. The transformer safely handles all URLs, but when rendering image tags, an extension/MIME check or `onError` hide/fallback should be used so PDF links remain clickable as documents rather than attempting to decode as an image.
3. **SSG / SSR Hydration**: Initial SSR HTML should stay `className="light"`, with theme hydration running client-side without causing layout shifts.

---

## 4. Conclusion & Concrete Implementation Blueprint

### Blueprint A: Theme Implementation

#### 1. Create `src/context/ThemeContext.tsx`
```tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ 
  children, 
  defaultTheme = 'light' 
}: { 
  children: React.ReactNode; 
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  useEffect(() => {
    // Check localStorage for an explicit user preference; default strictly to 'light'
    const savedTheme = localStorage.getItem('sipjam_theme') as Theme | null;
    if (savedTheme === 'dark') {
      setThemeState('dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      // Default to light mode (ignore OS dark mode preference per requirement)
      setThemeState('light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setThemeState(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('sipjam_theme', nextTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('sipjam_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

#### 2. Modify `src/app/layout.tsx`
Wrap children with `<ThemeProvider defaultTheme="light">`:
```tsx
import { ThemeProvider } from '@/context/ThemeContext';
...
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="light" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${amiri.variable} ${poppins.variable} ${spaceMono.variable} font-sans bg-gray-100 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300`}>
        <ThemeProvider defaultTheme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

#### 3. Modify `src/components/AppScreen.tsx`
Remove lines 25–33 and 37–45. Replace with:
```tsx
import { useTheme } from '@/context/ThemeContext';
...
export default function AppScreen({ user, onLogout }: { user: any, onLogout: () => void }) {
  const [currentView, setCurrentView] = useState('view-home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  ...
```

---

### Blueprint B: Google Drive Image Rendering Implementation

#### 1. Create `src/lib/imageUrl.ts`
```ts
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

  // Format 1: https://drive.google.com/file/d/{id}/... or https://docs.google.com/file/d/{id}/...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Format 2: https://drive.google.com/open?id={id} or uc?id={id} or thumbnail?id={id}
  const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idQueryMatch && idQueryMatch[1]) return idQueryMatch[1];

  // Format 3: https://lh3.googleusercontent.com/d/{id} or /d/{id}
  const dMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/i);
  if (dMatch && dMatch[1]) return dMatch[1];

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
  const fileId = getGoogleDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
  }
  return transformGoogleDriveUrl(url);
}

/**
 * Checks if the given URL is a Google Drive link.
 */
export function isGoogleDriveUrl(url: string | null | undefined): boolean {
  return Boolean(getGoogleDriveFileId(url));
}
```

#### 2. Modify `src/components/PrintHeader.tsx`
Lines 31 & 40:
```tsx
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
...
<div className="w-24 h-24 flex items-center justify-center">
  {config.logo_kiri && (
    <img 
      src={transformGoogleDriveUrl(config.logo_kiri)} 
      alt="Logo Kiri" 
      className="max-w-full max-h-full object-contain" 
    />
  )}
</div>
...
<div className="w-24 h-24 flex items-center justify-center">
  {config.logo_kanan && (
    <img 
      src={transformGoogleDriveUrl(config.logo_kanan)} 
      alt="Logo Kanan" 
      className="max-w-full max-h-full object-contain" 
    />
  )}
</div>
```

#### 3. Modify `src/components/AdminConfigView.tsx`
Add image preview under the `logo_kiri` and `logo_kanan` fields (lines 173–180):
```tsx
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
...
<div>
    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kiri (Dinas)</label>
    <input type="text" name="logo_kiri" value={config.logo_kiri} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting / Google Drive" />
    {config.logo_kiri && (
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[10px] text-gray-500">Preview:</span>
        <img src={transformGoogleDriveUrl(config.logo_kiri)} alt="Preview Logo Kiri" className="w-10 h-10 object-contain border border-gray-200 dark:border-gray-700 rounded bg-white p-0.5" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
      </div>
    )}
</div>
<div>
    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-0.5">Logo Kanan (Sekolah)</label>
    <input type="text" name="logo_kanan" value={config.logo_kanan} onChange={handleChange} required className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white" placeholder="Link Hosting / Google Drive" />
    {config.logo_kanan && (
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-[10px] text-gray-500">Preview:</span>
        <img src={transformGoogleDriveUrl(config.logo_kanan)} alt="Preview Logo Kanan" className="w-10 h-10 object-contain border border-gray-200 dark:border-gray-700 rounded bg-white p-0.5" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
      </div>
    )}
</div>
```

#### 4. Modify `src/components/AdminVerifView.tsx`
For `activeTab === 'Jurnal'` and `activeTab === 'Piket'` and Presensi:
Include image preview tags:
```tsx
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
...
{/* In Jurnal item card: */}
{item.link_bukti_foto && item.link_bukti_foto !== '-' && (
  <div className="mt-2 flex items-center gap-2">
    <img 
      src={transformGoogleDriveUrl(item.link_bukti_foto)} 
      alt="Bukti Jurnal" 
      className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
    />
    <a href={item.link_bukti_foto} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs block">
      <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Buka Foto Bukti
    </a>
  </div>
)}

{/* In Piket item card: */}
{item.link_foto && item.link_foto !== '-' && (
  <div className="mt-2 flex items-center gap-2">
    <img 
      src={transformGoogleDriveUrl(item.link_foto)} 
      alt="Foto Piket" 
      className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
    />
    <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline text-xs block">
      <i className="fa-solid fa-camera mr-1"></i> Buka Foto Piket
    </a>
  </div>
)}
```

#### 5. Modify `src/components/HistoryView.tsx`
Render an inline thumbnail inside the history card for `item.link_bukti_foto` and `item.link_bukti`.

#### 6. Modify `src/components/PiketView.tsx`
Render an inline thumbnail inside the report card for `item.link_foto`.

#### 7. Update `next.config.ts`
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
```

---

## 5. Verification Method

### A. Theme Verification
1. **Unconfigured Session Test**:
   - Clear `localStorage`: `localStorage.removeItem('sipjam_theme')`.
   - Set device/browser operating system to Dark Mode.
   - Load the application in a fresh browser session.
   - Verify that `document.documentElement.classList.contains('dark')` is `false`, and the UI displays pure light mode.
2. **Manual Toggle Test**:
   - Click the theme toggle icon in the header.
   - Verify theme switches to dark mode (`document.documentElement.classList.contains('dark') === true`).
   - Verify `localStorage.getItem('sipjam_theme') === 'dark'`.
   - Reload the page. Verify dark mode is retained for this configured user session.
   - Click the toggle again; verify it switches back to light mode, and `localStorage` updates to `'light'`.

### B. Google Drive URL Transformer Unit Tests
Inspect and run tests against `transformGoogleDriveUrl`:
| Input URL | Expected Output |
|---|---|
| `https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144/view?usp=sharing` | `https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` |
| `https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144/view` | `https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` |
| `https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` | `https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` |
| `https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` | `https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` |
| `https://lh3.googleusercontent.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` | `https://drive.google.com/uc?export=view&id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIvE2e144` |
| `https://example.com/logo.png` | `https://example.com/logo.png` |
| `""` or `"-"` or `null` | `""` |

### C. Build & Integrity Validation
Run `npm run build` or `npm run lint` to verify that TypeScript types, React 19 hydration, and Next.js 16 build configurations pass cleanly without errors.
