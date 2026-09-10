// src/components/CameraCaptureModal.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, Sliders, AlertCircle } from 'lucide-react';

export default function CameraCaptureModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access not granted or unavailable on this device. You can still upload files directly.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    // Draw original image
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Preprocessing: contrast enhancement and grayscale for OCR readability
    if (enhanceContrast) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Luminance grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // High-contrast stretch
        const contrast = (gray - 128) * 1.35 + 128;
        const clamped = Math.max(0, Math.min(255, contrast));
        data[i] = clamped;
        data[i + 1] = clamped;
        data[i + 2] = clamped;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const confirmCapture = () => {
    if (!capturedImage) return;
    // Convert base64 dataUrl to File
    const byteString = atob(capturedImage.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: 'image/jpeg' });
    const file = new File([blob], `Camera_Scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

    onCapture(file, capturedImage);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="text-primary-400" size={20} />
            <h3 className="font-bold text-base">Camera Document Scanner</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-300">
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 space-y-2">
              <AlertCircle size={36} className="text-amber-400 mx-auto" />
              <p className="font-semibold text-sm">{cameraError}</p>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured Document" className="max-h-[400px] w-auto object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[400px] object-cover"
              />
              {/* Document Alignment Frame */}
              <div className="absolute inset-8 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none flex items-center justify-center">
                <span className="bg-black/50 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">
                  Align prescription or lab report inside frame
                </span>
              </div>
            </>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-600 px-2">
            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={e => setEnhanceContrast(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <Sliders size={14} /> Auto-enhance text contrast for OCR
            </label>
            <span className="text-[11px] text-slate-400">High-resolution document capture</span>
          </div>

          <div className="flex gap-2">
            {capturedImage ? (
              <>
                <button
                  onClick={startCamera}
                  className="btn-secondary flex-1 py-3 text-xs sm:text-sm"
                >
                  <RefreshCw size={15} /> Retake Photo
                </button>
                <button
                  onClick={confirmCapture}
                  className="btn-primary flex-1 py-3 text-xs sm:text-sm"
                >
                  <Check size={15} /> Use This Document
                </button>
              </>
            ) : (
              <button
                onClick={takeSnapshot}
                disabled={!!cameraError}
                className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
              >
                <Camera size={18} /> Capture Document Photo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
