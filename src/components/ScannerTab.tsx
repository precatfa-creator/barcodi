/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, FormEvent, type MouseEvent, type MutableRefObject, type TouchEvent } from 'react';
import Webcam from 'react-webcam';
import { BarcodeDetector } from 'barcode-detector/ponyfill';
import { Camera, Barcode, AlertTriangle, CornerDownLeft, Sparkles, Zap, ZapOff, FlipHorizontal } from 'lucide-react';
import { Product, AppSettings } from '../types';
import { useAppContext } from '../AppContext';

interface ScannerTabProps {
  onProductFound: (product: Product) => void;
  settings: AppSettings;
  isPaused?: boolean;
}

type ScanRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Crisp Synthesized Store Beep Sound
export function playBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(950, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (err) {
    console.log("Web Audio beep omitted:", err);
  }
}

export function ScannerTab({ onProductFound, settings, isPaused = false }: ScannerTabProps) {
  const { products } = useAppContext();
  
  // Refs to avoid closure issues with the scan loop
  const productsRef = useRef(products);
  productsRef.current = products;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onProductFoundRef = useRef(onProductFound);
  onProductFoundRef.current = onProductFound;
  
  // State
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  
  const [cameraManuallyStopped, setCameraManuallyStopped] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [flashlightSupportKnown, setFlashlightSupportKnown] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);
  
  const webcamRef = useRef<Webcam>(null);
  const detectorRef = useRef<any>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enhancedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const scanningRef = useRef(false);
  const detectingRef = useRef(false);
  const lastDetectAtRef = useRef(0);
  const lastRejectedBarcodeRef = useRef('');
  const rejectCooldownUntilRef = useRef(0);
  
  // Initialize BarcodeDetector once on mount
  useEffect(() => {
    let cancelled = false;

    if (!window.isSecureContext) {
      setCameraError('الكاميرا تحتاج رابط آمن HTTPS. على Render استخدم رابط https، ومحلياً استخدم http://localhost وليس IP عادي.');
      setDetectorReady(false);
      return () => { cancelled = true; };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('هذا المتصفح لا يدعم تشغيل الكاميرا من صفحة الويب. جرّب Chrome أو Safari حديث.');
      setDetectorReady(false);
      return () => { cancelled = true; };
    }

    (async () => {
      try {
        // Force the ZXing-powered ponyfill for consistent retail barcode support across browsers.
        const detector = new (BarcodeDetector as any)({
          formats: ['retail_codes', 'industrial_codes', 'qr_code']
        });
        if (!cancelled) {
          detectorRef.current = detector;
          setDetectorReady(true);
        }
      } catch (err) {
        console.error('BarcodeDetector initialization failed:', err);
        if (!cancelled) {
          setCameraError('تعذر تحميل قارئ الباركود في المتصفح. جرّب Chrome أو Safari حديث.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);
  
  // Barcode scan handler
  const handleBarcodeScanned = useCallback((decodedText: string) => {
    const clean = decodedText.trim();
    if (!clean) return false;

    const settings = settingsRef.current;
    if (settings.isTestMode) {
      playBeepSound();
      scanningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const mockProduct: Product = {
        id: `mock-${Date.now()}`,
        barcode: clean,
        name: `منتج تجريبي (${clean.slice(-4)})`,
        price: Number((Math.random() * 50 + 5).toFixed(2)),
        imageEmoji: '📦',
        category: 'عام',
        weight: 'قطعة واحدة',
        description: 'هذا منتج وهمي تم إنشاؤه أثناء وضع الاختبار.'
      };
      onProductFoundRef.current(mockProduct);
      return true;
    }
    
    const p = productsRef.current.find(pr => pr.barcode === clean || pr.id === clean);
    if (p) {
      playBeepSound();
      scanningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      onProductFoundRef.current(p);
      return true;
    } else {
      const now = performance.now();
      if (lastRejectedBarcodeRef.current !== clean || now > rejectCooldownUntilRef.current) {
        lastRejectedBarcodeRef.current = clean;
        rejectCooldownUntilRef.current = now + 2200;
        setCameraError(`تمت قراءة الباركود (${clean}) لكنه غير موجود في منتجات هذا المتجر.`);
      }
      return false;
    }
  }, []);
  
  const getCanvas = (ref: MutableRefObject<HTMLCanvasElement | null>) => {
    if (!ref.current) {
      ref.current = document.createElement('canvas');
    }
    return ref.current;
  };

  const buildScanFrame = (video: HTMLVideoElement, region: ScanRegion, enhance = false) => {
    const videoWidth = video.videoWidth || video.clientWidth;
    const videoHeight = video.videoHeight || video.clientHeight;
    if (!videoWidth || !videoHeight) return null;

    const sourceWidth = videoWidth * region.width;
    const sourceHeight = videoHeight * region.height;
    const sourceX = videoWidth * region.x;
    const sourceY = videoHeight * region.y;
    const targetWidth = Math.min(1400, Math.max(900, Math.round(sourceWidth)));
    const targetHeight = Math.min(700, Math.max(420, Math.round(sourceHeight)));
    const canvas = getCanvas(enhance ? enhancedCanvasRef : scanCanvasRef);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

    if (enhance) {
      const image = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = image.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const highContrast = Math.max(0, Math.min(255, (gray - 118) * 1.65 + 128));
        data[i] = highContrast;
        data[i + 1] = highContrast;
        data[i + 2] = highContrast;
      }
      ctx.putImageData(image, 0, 0);
    }

    return canvas;
  };

  const detectBestBarcode = async (video: HTMLVideoElement) => {
    const detector = detectorRef.current;
    if (!detector) return '';

    const regions: ScanRegion[] = [
      { x: 0.04, y: 0.23, width: 0.92, height: 0.54 },
      { x: 0.02, y: 0.12, width: 0.96, height: 0.72 },
      { x: 0.12, y: 0.30, width: 0.76, height: 0.40 },
    ];

    for (const region of regions) {
      const scanFrame = buildScanFrame(video, region, false);
      if (scanFrame) {
        const barcodes = await detector.detect(scanFrame);
        if (barcodes.length > 0) return String(barcodes[0].rawValue || '').trim();
      }
    }

    for (const region of regions) {
      const enhancedFrame = buildScanFrame(video, region, true);
      if (enhancedFrame) {
        const barcodes = await detector.detect(enhancedFrame);
        if (barcodes.length > 0) return String(barcodes[0].rawValue || '').trim();
      }
    }

    const barcodes = await detector.detect(video);
    if (barcodes.length > 0) return String(barcodes[0].rawValue || '').trim();

    return '';
  };

  // Scan loop — detects barcodes from optimized video frames.
  const scanLoop = useCallback(async () => {
    if (!scanningRef.current || !webcamRef.current?.video || !detectorRef.current || detectingRef.current) {
      return;
    }
    
    const video = webcamRef.current.video;
    if (video.readyState < 2) {
      // Video not ready yet — try again next frame
      if (scanningRef.current) {
        rafRef.current = requestAnimationFrame(scanLoop);
      }
      return;
    }
    
    const now = performance.now();
    if (now - lastDetectAtRef.current < 70) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    lastDetectAtRef.current = now;

    detectingRef.current = true;
    try {
      const decodedText = await detectBestBarcode(video);
      if (decodedText && scanningRef.current) {
        const accepted = handleBarcodeScanned(decodedText);
        if (accepted) {
          detectingRef.current = false;
          return; // Don't schedule next frame after a successful product match.
        }
      }
    } catch (err) {
      // Transient detection errors — ignore and continue
    }
    detectingRef.current = false;
    
    if (scanningRef.current) {
      rafRef.current = requestAnimationFrame(scanLoop);
    }
  }, [handleBarcodeScanned]);
  
  // When webcam stream is ready, check torch support and start scanning
  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
    setCameraError('');
    
    const stream = webcamRef.current?.video?.srcObject as MediaStream | undefined;
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps: any = track.getCapabilities?.() || {};
        setFlashlightSupportKnown('torch' in caps);
        setHasFlashlight(!!caps.torch || facingMode === 'environment');

        track.applyConstraints({
          advanced: [
            { focusMode: 'continuous' } as any,
            { exposureMode: 'continuous' } as any,
            { whiteBalanceMode: 'continuous' } as any,
          ],
        }).catch(() => {});
      }
    }
    
    // Start scanning if not paused and detector is ready
    if (!isPaused && detectorRef.current) {
      scanningRef.current = true;
      scanLoop();
    }
  }, [isPaused, scanLoop]);
  
  // Handle webcam errors
  const handleUserMediaError = useCallback((err: any) => {
    console.error('Webcam error:', err);
    setIsCameraReady(false);
    
    const errName = err?.name || '';
    const errStr = err?.message || err?.toString?.() || '';
    
    if (errName === 'NotAllowedError' || errStr.includes('NotAllowedError') || errName === 'SecurityError') {
      setManualError("لم يتم السماح بالوصول للكاميرا. يرجى إعطاء الصلاحية من متصفحك أو الإدخال يدوياً هنا، (قد تحتاج لفتح التطبيق في تبويب جديد).");
      setActiveMode('manual');
    } else if (errName === 'NotReadableError' || errStr.includes('NotReadableError')) {
      setCameraError("الكاميرا قيد الاستخدام من تطبيق آخر. أغلق أي تطبيق يستخدم الكاميرا ثم أعد المحاولة.");
    } else {
      setCameraError(`تعذر تشغيل الكاميرا (${errName || 'خطأ غير معروف'}). استخدم الإدخال اليدوي بالأسفل.`);
    }
  }, []);
  
  // Pause/resume scanning based on isPaused prop
  useEffect(() => {
    if (!isPaused && isCameraReady && detectorRef.current) {
      scanningRef.current = true;
      scanLoop();
    } else {
      scanningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
    
    return () => {
      scanningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPaused, isCameraReady, detectorReady, scanLoop]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);
  
  // Flashlight toggle
  const toggleFlashlight = async () => {
    const track = (webcamRef.current?.video?.srcObject as MediaStream)?.getVideoTracks()[0];
    if (!track) return;
    
    const nextState = !isFlashlightOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setHasFlashlight(true);
      setFlashlightSupportKnown(true);
      setIsFlashlightOn(nextState);
    } catch (err) {
      console.error('Failed to toggle flashlight:', err);
      setIsFlashlightOn(false);
      setHasFlashlight(false);
      setFlashlightSupportKnown(true);
      setCameraError('هذا الجهاز أو المتصفح لا يسمح بتشغيل الفلاش من صفحة الويب. جرّب تحسين الإضاءة أو استخدم الإدخال اليدوي.');
    }
  };
  
  // Tap-to-focus: refocuses camera on the tapped location (essential for small barcodes)
  const handleTapToFocus = async (e: MouseEvent | TouchEvent) => {
    const track = (webcamRef.current?.video?.srcObject as MediaStream)?.getVideoTracks()[0];
    if (!track) return;
    
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const xRatio = (clientX - rect.left) / rect.width;
    const yRatio = (clientY - rect.top) / rect.height;
    
    try {
      // Try to use ImageCapture for precise point-of-interest focus
      const caps: any = track.getCapabilities?.() || {};
      if (caps.pointsOfInterest) {
        await track.applyConstraints({
          advanced: [{ pointsOfInterest: [{ x: xRatio, y: yRatio }] } as any]
        });
      } else if (caps.focusMode?.includes('single-shot')) {
        // Fallback: trigger single-shot autofocus, then let continuous resume
        await track.applyConstraints({
          advanced: [{ focusMode: 'single-shot' } as any]
        });
        // Return to continuous after brief focus
        setTimeout(() => {
          track.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any]
          }).catch(() => {});
        }, 1500);
      }
    } catch (err) {
      // Focus point API not supported on this device — silent fail
    }
  };
  
  // Switch camera front/back
  const switchCamera = () => {
    scanningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsCameraReady(false);
    setIsFlashlightOn(false);
    setFlashlightSupportKnown(false);
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };
  
  // Manual input submit
  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    setManualError('');
    const clean = manualCode.trim();
    if (!clean) return;
    handleBarcodeScanned(clean);
  };
  
  // Toggle camera on/off
  const toggleCamera = () => {
    if (cameraManuallyStopped) {
      setCameraManuallyStopped(false);
    } else {
      scanningRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsCameraReady(false);
      setIsFlashlightOn(false);
      setFlashlightSupportKnown(false);
      setCameraManuallyStopped(true);
    }
  };
  
  const isEng = settings.language === 'en';
  const showWebcam = activeMode === 'camera' && !cameraManuallyStopped;
  
  const videoConstraints: MediaTrackConstraints = {
    facingMode: { ideal: facingMode },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: { ideal: 16 / 9 },
    frameRate: { ideal: 30 },
    // Continuous autofocus — critical for phone barcode scanning
    advanced: [
      { focusMode: 'continuous' } as any,
      { focusMode: 'auto' } as any, // fallback for older browsers
    ],
  };
  
  return (
    <div className="flex flex-col gap-6" id="scanner-tab-container">
      {/* Visual Tab Buttons for Scanner Mode */}
      <div className="grid grid-cols-2 gap-1 bg-white/40 p-1.5 rounded-2xl border border-white shadow-sm" id="scanner-modes-header">
        <button
          onClick={() => setActiveMode('camera')}
          disabled={!detectorReady}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 ${
            activeMode === 'camera'
              ? 'bg-white text-primary-dark shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-primary-light/30'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          id="btn-mode-camera"
        >
          <Barcode className="w-4.5 h-4.5" />
          <span>{isEng ? 'Camera Scan' : 'المسح الضوئي بالكاميرا'}</span>
        </button>

        <button
          onClick={() => setActiveMode('manual')}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeMode === 'manual'
              ? 'bg-white text-primary-dark shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-primary-light/30'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          id="btn-mode-manual"
        >
          <div className="flex items-center justify-center text-[9px] font-bold tracking-wider font-mono bg-primary-pale text-primary-dark border border-primary-light/30 px-1.5 h-4.5 rounded">6281001234567</div>
          <span>{isEng ? 'Manual Barcode' : 'إدخال الباركود يدوياً'}</span>
        </button>
      </div>

      {settings.isTestMode && (
        <div className="bg-amber-50/80 backdrop-blur-md border border-amber-200/60 rounded-xl p-3 flex gap-2 items-center text-amber-800 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-[11px] font-bold">وضع الاختبار يعمل. أي باركود سيتم فحصه سيطلب اسم وسعر.</p>
        </div>
      )}

      {/* Mode 1: Real Camera Scanning (using react-webcam + BarcodeDetector) */}
      {activeMode === 'camera' && (
        <div className="flex flex-col gap-4 animate-fade-in shrink-0 bg-white/40 p-4 rounded-[2rem] border border-white shadow-sm" id="camera-view">
          <div className="text-center">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1 tracking-tight">قارئ الهاتف الذكي</h3>
            <p className="text-[11px] text-gray-500">ضع الباركود داخل الشريط الأوسط وقرّب الهاتف حتى تظهر الخطوط بوضوح</p>
          </div>

          {/* Camera Frame Viewport */}
          <div
            className="relative w-full aspect-[4/3] max-w-sm mx-auto bg-gray-950 rounded-3xl border-[6px] border-gray-900 shadow-inner overflow-hidden flex items-center justify-center cursor-pointer"
            onClick={handleTapToFocus}
            onTouchStart={handleTapToFocus}
          >
            {showWebcam ? (
              <Webcam
                ref={webcamRef}
                audio={false}
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                className="w-full h-full object-cover absolute inset-0"
                mirrored={facingMode === 'user'}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.92}
                imageSmoothing
                forceScreenshotSourceSize={false}
                disablePictureInPicture
                playsInline
                autoPlay
                muted
              />
            ) : null}

            {/* Loading state while Webcam mounts */}
            {showWebcam && !isCameraReady && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-gray-400 bg-gray-900/60 w-full h-full absolute inset-0 z-10">
                <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-primary-light shadow-md animate-pulse">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-[11px] tracking-wide font-medium max-w-[200px] leading-relaxed text-gray-300">جاري الاتصال بالكاميرا...</p>
              </div>
            )}

            {/* Inactive System Overlay screen (when manually stopped) */}
            {cameraManuallyStopped && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-gray-400 bg-gray-900/60 w-full h-full absolute inset-0 z-0">
                <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-primary-light shadow-md animate-pulse">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-[11px] tracking-wide font-medium max-w-[200px] leading-relaxed text-gray-300">الكاميرا موقفة. اضغط للتفعيل.</p>
                <button
                  onClick={toggleCamera}
                  className="bg-primary-dark hover:bg-gray-900 px-6 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-primary-pale" />
                  <span>تفعيل عدسة المسح</span>
                </button>
              </div>
            )}

            {isCameraReady && (
              <>
                {/* Barcode reading band: matches the cropped frame sent to the detector. */}
                <div className="absolute left-[6%] right-[6%] top-1/2 h-[46%] -translate-y-1/2 rounded-2xl border-2 border-primary-light/90 shadow-[0_0_0_999px_rgba(0,0,0,0.24)] pointer-events-none" />
                
                {/* Neo glowing laser scanning bar sweeping smoothly vertically across the entire viewport */}
                <div className="absolute left-0 right-0 h-[3px] bg-emerald-400 shadow-[0_0_20px_#10b981,0_0_8px_#10b981] animate-laser pointer-events-none z-10" style={{ top: '0%' }} />

                {/* Switch camera (front/back) button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    switchCamera();
                  }}
                  className="absolute top-4 right-4 z-20 p-2.5 rounded-xl backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-md transition-all cursor-pointer hover:bg-black/85 hover:scale-105"
                  title={isEng ? "Switch Camera" : "تبديل الكاميرا"}
                >
                  <FlipHorizontal className="w-4 h-4 text-white" />
                </button>

                {/* Flashlight/Torch toggle button */}
                {hasFlashlight && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlashlight();
                    }}
                    className={`absolute top-16 right-4 z-20 p-2.5 rounded-xl backdrop-blur-md border shadow-md transition-all cursor-pointer ${
                      isFlashlightOn 
                        ? 'bg-amber-500 text-white border-amber-400 font-bold scale-105 shadow-amber-500/20' 
                        : 'bg-black/60 text-white border-white/20 hover:bg-black/85 hover:scale-105'
                    }`}
                    title={
                      isFlashlightOn
                        ? (isEng ? "Turn Off Flash" : "إيقاف الكشاف")
                        : flashlightSupportKnown
                          ? (isEng ? "Turn On Flash" : "تشغيل الكشاف")
                          : (isEng ? "Try Flash" : "تجربة تشغيل الكشاف")
                    }
                  >
                    {isFlashlightOn ? <ZapOff className="w-4 h-4 text-white animate-pulse" /> : <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />}
                  </button>
                )}

                {/* Status Bar inside scanner */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md px-4 py-2.5 rounded-xl text-[10px] font-bold text-white flex items-center justify-between pointer-events-none border border-white/10">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    الكامل مرئي • المسح التلقائي مفعل...
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCamera();
                    }}
                    className="text-gray-300 hover:text-white bg-white/10 px-3 py-1 rounded-md cursor-pointer pointer-events-auto transition-colors font-sans"
                  >
                    {isEng ? 'Stop' : 'إيقاف'}
                  </button>
                </div>
              </>
            )}
          </div>

          {cameraError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3 flex gap-2 items-start leading-relaxed shadow-sm mt-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Manual Input Barcode Form */}
      {activeMode === 'manual' && (
        <div className="flex flex-col gap-4 animate-fade-in bg-white/40 p-5 rounded-[2rem] border border-white shadow-sm" id="manual-view">
          <div className="text-center mb-1">
            <h3 className="text-sm font-bold text-gray-900 mb-1">إدخال الباركود يدوياً</h3>
            <p className="text-[11px] text-gray-500">في حال تعذر قراءة الباركود، يمكنك إدخاله يدوياً فوراً هنا</p>
          </div>

          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3" id="barcode-manual-form">
            <div className="relative">
              <Barcode className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="أدخل باركود المنتج (مثال: 101)"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setManualError('');
                }}
                className="w-full bg-white text-right pr-12 pl-12 py-4 rounded-2xl border border-white focus:outline-none focus:ring-2 focus:ring-primary-dark text-sm font-bold font-mono tracking-wider shadow-sm transition-shadow"
                autoFocus
                id="input-manual-barcode"
              />
              <button
                type="submit"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-primary-dark hover:bg-gray-900 text-white rounded-xl p-2.5 transition-all flex items-center justify-center font-bold shadow-sm"
                id="btn-manual-barcode-submit"
              >
                <CornerDownLeft className="w-4.5 h-4.5" />
              </button>
            </div>

            {manualError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl p-3 flex gap-2 items-center shadow-sm">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{manualError}</span>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
