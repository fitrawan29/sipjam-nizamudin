'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { drawWatermarkedCanvas, dataUrlToFile, getDefaultWatermarkOptions, WatermarkCoordinates } from '@/lib/watermarkCanvas';

export interface CameraSelfieCaptureProps {
  onPhotoConfirmed: (file: File, previewUrl: string) => void;
  onCancel?: () => void;
  initialCoordinates?: WatermarkCoordinates | null;
  existingPhotoUrl?: string | null;
}

export default function CameraSelfieCapture({
  onPhotoConfirmed,
  onCancel,
  initialCoordinates = null,
  existingPhotoUrl = null,
}: CameraSelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(existingPhotoUrl || null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<WatermarkCoordinates | null>(initialCoordinates);
  const [gpsStatus, setGpsStatus] = useState<string>('Mendeteksi GPS...');

  // 1. Live Geolocation tracking
  const requestLocation = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGpsStatus('Mencari sinyal GPS...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCoordinates(coords);
          setGpsStatus(`GPS OK (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
        },
        (err) => {
          console.warn('[CameraSelfie] Geolocation warning:', err.message);
          setGpsStatus('GPS tidak aktif / izin lokasi ditolak');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsStatus('Browser tidak mendukung geolokasi');
    }
  }, []);

  // 2. Stop camera stream gracefully
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // 3. Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung. Silakan gunakan opsi unggah foto.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user', // Front selfie camera
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn('Video play error:', e));
          setIsStreaming(true);
        };
      }
    } catch (err: any) {
      console.error('[CameraSelfie] Camera access error:', err);
      let message = 'Gagal mengakses kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'Kamera tidak ditemukan pada perangkat Anda.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else {
        message = `Akses kamera gagal: ${err.message || 'Error tidak diketahui'}`;
      }
      setCameraError(message);
      setIsStreaming(false);
    }
  }, [stopCamera]);

  // Initial mount: update GPS and start camera if no image captured yet
  useEffect(() => {
    requestLocation();
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [capturedImage, requestLocation, startCamera, stopCamera]);

  // 4. Capture photo and draw watermark
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    try {
      const watermarkOpts = getDefaultWatermarkOptions(coordinates);
      const dataUrl = drawWatermarkedCanvas(videoRef.current, watermarkOpts);
      const file = dataUrlToFile(dataUrl, `selfie_presensi_${Date.now()}.jpg`);

      setCapturedImage(dataUrl);
      setCapturedFile(file);
      stopCamera();
    } catch (err: any) {
      console.error('[CameraSelfie] Error capturing frame:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mengambil Foto',
        text: err.message || 'Silakan coba lagi.',
        confirmButtonColor: '#10B981',
      });
    }
  };

  // 5. Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera();
    requestLocation();
  };

  // 6. Confirm and use photo
  const handleConfirmPhoto = () => {
    if (!capturedFile && capturedImage) {
      // If capturedImage exists but capturedFile doesn't (e.g. from existing photo)
      const file = dataUrlToFile(capturedImage, `selfie_presensi_${Date.now()}.jpg`);
      stopCamera();
      onPhotoConfirmed(file, capturedImage);
      return;
    }

    if (capturedFile && capturedImage) {
      stopCamera();
      onPhotoConfirmed(capturedFile, capturedImage);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Foto Belum Diambil',
        text: 'Harap ambil foto terlebih dahulu sebelum konfirmasi.',
        confirmButtonColor: '#10B981',
      });
    }
  };

  // 7. Fallback file upload handling
  const handleFallbackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const watermarkOpts = getDefaultWatermarkOptions(coordinates);
          const dataUrl = drawWatermarkedCanvas(img, watermarkOpts);
          const watermarkedFile = dataUrlToFile(dataUrl, `selfie_upload_${Date.now()}.jpg`);

          setCapturedImage(dataUrl);
          setCapturedFile(watermarkedFile);
          stopCamera();
        } catch (canvasErr: any) {
          console.error('[CameraSelfie] Fallback watermark error:', canvasErr);
          Swal.fire({
            icon: 'error',
            title: 'Gagal Memproses Watermark',
            text: 'Gagal memproses watermark pada foto yang dipilih.',
            confirmButtonColor: '#10B981',
          });
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 shadow-sm transition-all">
      {/* Header status bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {capturedImage ? 'Preview Foto Selfie (Watermarked)' : 'Kamera Selfie Presensi'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <i className="fa-solid fa-location-dot text-emerald-500"></i>
          <span className="truncate max-w-[160px] sm:max-w-none">{gpsStatus}</span>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-300 dark:border-slate-700">
        {/* Captured Image Preview */}
        {capturedImage ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedImage}
              alt="Preview Presensi"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white font-medium flex items-center gap-1.5 border border-white/20">
              <i className="fa-solid fa-check text-emerald-400"></i> Foto Terverifikasi
            </div>
          </div>
        ) : (
          <>
            {/* Live Camera View */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isStreaming ? 'block' : 'hidden'
              }`}
            />

            {/* Video loading state */}
            {!isStreaming && !cameraError && (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-500"></i>
                <span className="text-xs font-medium">Menghubungkan ke kamera selfie...</span>
              </div>
            )}

            {/* Camera Error state */}
            {cameraError && (
              <div className="flex flex-col items-center justify-center p-5 text-center text-red-400 gap-3">
                <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
                <div className="text-xs max-w-xs">{cameraError}</div>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-rotate-right"></i> Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-file-arrow-up"></i> Pilih Foto dari Perangkat
                  </button>
                </div>
              </div>
            )}

            {/* Live Overlay Guide for Camera */}
            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between items-start">
                  <span className="bg-black/50 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                    <i className="fa-solid fa-circle-dot text-red-500 animate-pulse"></i> LIVE
                  </span>
                  <span className="bg-black/50 backdrop-blur-sm text-[10px] text-slate-200 px-2 py-0.5 rounded-md border border-white/10">
                    Kamera Depan
                  </span>
                </div>
                <div className="text-center text-white/70 text-[11px] font-medium drop-shadow bg-black/40 backdrop-blur-sm py-1 rounded-md mx-auto px-3">
                  Posisikan wajah Anda di tengah layar
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden fallback file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFallbackFileChange}
        className="hidden"
      />

      {/* Controls & Action Buttons */}
      <div className="mt-3.5">
        {capturedImage ? (
          /* Preview Mode Action Buttons */
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <i className="fa-solid fa-camera-rotate text-slate-500"></i>
              Foto Ulang
            </button>
            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <i className="fa-solid fa-check"></i>
              Gunakan Foto
            </button>
          </div>
        ) : (
          /* Live Camera Controls */
          <div className="flex items-center justify-center gap-3">
            {/* Fallback upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Unggah foto manual"
              className="p-2.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <i className="fa-solid fa-upload text-sm"></i>
            </button>

            {/* Visual Capture Button */}
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={!isStreaming}
              className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/20 transition transform active:scale-95"
            >
              <span className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
              </span>
              Ambil Foto Selfie
            </button>

            {/* Refresh GPS button */}
            <button
              type="button"
              onClick={requestLocation}
              title="Perbarui koordinat GPS"
              className="p-2.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <i className="fa-solid fa-location-crosshairs text-sm text-emerald-500"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
