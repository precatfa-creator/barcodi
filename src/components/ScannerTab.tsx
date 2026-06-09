/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Barcode, AlertTriangle, CornerDownLeft, Sparkles, Zap, ZapOff, FlipHorizontal } from 'lucide-react';
import { Product, AppSettings } from '../types';
import { useAppContext } from '../AppContext';

interface ScannerTabProps {
  onProductFound: (product: Product) => void;
  settings: AppSettings;
  isPaused?: boolean;
}

type CameraDevice = {
  id: string;
  label: string;
};

const SCANNER_ELEMENT_ID = 'camera-viewfinder-output';

const barcodeFormats = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
];

const scoreCameraLabel = (label: string) => {
  const normalized = label.toLowerCase();
  if (/back|rear|environment|wide|خلف|خلفية/.test(normalized)) return 4;
  if (/camera\s*0|camera1|0/.test(normalized)) return 2;
  if (/front|user|selfie|أمام|امام/.test(normalized)) return 0;
  return 1;
};

const isAbortLikeMediaError = (err: any) => {
  const msg = String(err?.message || err || '');
  return err?.name === 'AbortError' || msg.includes('interrupted') || msg.includes('removed');
};

// html5-qrcode can trigger benign media play interruption promises during rapid
// React unmount/remount cycles. Suppress only that known browser noise.
if (typeof window !== 'undefined' && window.HTMLMediaElement && !(window as any).__barcodiPlayPatched) {
  const originalPlay = window.HTMLMediaElement.prototype.play;
  window.HTMLMediaElement.prototype.play = function (...args) {
    const promise = originalPlay.apply(this, args);
    if (promise instanceof Promise) {
      promise.catch((err) => {
        if (!isAbortLikeMediaError(err)) {
          console.warn('HTMLMediaElement.play() rejected:', err);
        }
      });
    }
    return promise;
  };
  (window as any).__barcodiPlayPatched = true;
}

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
    console.log('Web Audio beep omitted:', err);
  }
}

export function ScannerTab({ onProductFound, settings, isPaused = false }: ScannerTabProps) {
  const { products } = useAppContext();

  const productsRef = useRef(products);
  productsRef.current = products;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onProductFoundRef = useRef(onProductFound);
  onProductFoundRef.current = onProductFound;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const startTimerRef = useRef<number | null>(null);
  const lastRejectedBarcodeRef = useRef('');
  const rejectCooldownUntilRef = useRef(0);

  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  const [cameraManuallyStopped, setCameraManuallyStopped] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [activeCameraId, setActiveCameraId] = useState('');
  const [preferredFacingMode, setPreferredFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [flashlightSupportKnown, setFlashlightSupportKnown] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);

  const isEng = settings.language === 'en';
  const showCamera = activeMode === 'camera' && !cameraManuallyStopped;

  const clearStartTimer = () => {
    if (startTimerRef.current !== null) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  };

  const stopCameraScanner = useCallback(async () => {
    clearStartTimer();

    if (startingRef.current) {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        if (!isAbortLikeMediaError(err)) {
          console.warn('Scanner stop failed:', err);
        }
      }

      try {
        scanner.clear();
      } catch {
        // The container may already be gone during route changes.
      }
    }

    const container = document.getElementById(SCANNER_ELEMENT_ID);
    if (container) container.innerHTML = '';

    setIsCameraReady(false);
    setIsFlashlightOn(false);
    setHasFlashlight(false);
    setFlashlightSupportKnown(false);
  }, []);

  const markTorchCapability = (scanner: Html5Qrcode) => {
    try {
      const track = (scanner as any).getRunningTrack?.();
      const caps = track?.getCapabilities?.() || {};
      setFlashlightSupportKnown('torch' in caps);
      setHasFlashlight(Boolean(caps.torch) || preferredFacingMode === 'environment');
    } catch {
      setFlashlightSupportKnown(false);
      setHasFlashlight(preferredFacingMode === 'environment');
    }
  };

  const handleBarcodeScanned = useCallback((decodedText: string) => {
    const clean = decodedText.trim();
    if (!clean) return false;

    const currentSettings = settingsRef.current;
    if (currentSettings.isTestMode) {
      playBeepSound();
      stopCameraScanner();
      onProductFoundRef.current({
        id: `mock-${Date.now()}`,
        barcode: clean,
        name: `منتج تجريبي (${clean.slice(-4)})`,
        price: Number((Math.random() * 50 + 5).toFixed(2)),
        imageEmoji: '📦',
        category: 'عام',
        weight: 'قطعة واحدة',
        description: 'هذا منتج وهمي تم إنشاؤه أثناء وضع الاختبار.',
      });
      return true;
    }

    const product = productsRef.current.find((item) => item.barcode === clean || item.id === clean);
    if (product) {
      playBeepSound();
      stopCameraScanner();
      onProductFoundRef.current(product);
      return true;
    }

    const now = performance.now();
    if (lastRejectedBarcodeRef.current !== clean || now > rejectCooldownUntilRef.current) {
      lastRejectedBarcodeRef.current = clean;
      rejectCooldownUntilRef.current = now + 2200;
      setCameraError(`تمت قراءة الباركود (${clean}) لكنه غير موجود في منتجات هذا المتجر.`);
    }
    return false;
  }, [stopCameraScanner]);

  const refreshCameras = useCallback(async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      const ordered = [...devices]
        .map((device) => ({ id: device.id, label: device.label || '' }))
        .sort((a, b) => scoreCameraLabel(b.label) - scoreCameraLabel(a.label));
      setCameras(ordered);
      return ordered;
    } catch (err) {
      console.debug('Camera list unavailable:', err);
      return [];
    }
  }, []);

  const startCameraScanner = useCallback(() => {
    clearStartTimer();
    setCameraError('');
    setManualError('');

    startTimerRef.current = window.setTimeout(async () => {
      if (!mountedRef.current || activeMode !== 'camera' || cameraManuallyStopped || isPaused) return;

      try {
        if (!window.isSecureContext) {
          setCameraError('الكاميرا تحتاج رابط آمن HTTPS. على Render استخدم رابط https، ومحلياً استخدم http://localhost وليس IP عادي.');
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('هذا المتصفح لا يدعم تشغيل الكاميرا من صفحة الويب. جرّب Chrome أو Safari حديث.');
          return;
        }

        const element = document.getElementById(SCANNER_ELEMENT_ID);
        if (!element) return;

        await stopCameraScanner();
        if (!mountedRef.current) return;

        startingRef.current = true;

        const scanConfig = {
          fps: 25,
          qrbox: (viewWidth: number, viewHeight: number) => {
            const width = Math.floor(Math.min(viewWidth * 0.78, 320));
            const height = Math.floor(Math.min(viewHeight * 0.38, width * 0.55, 160));
            return { width, height };
          },
          aspectRatio: 4 / 3,
          disableFlip: false,
        };

        const scanSuccess = (decodedText: string) => {
          handleBarcodeScanned(decodedText);
        };

        const scanError = (errorMessage: string) => {
          if (errorMessage && !errorMessage.includes('NotFoundException')) {
            console.debug('Scan frame warning:', errorMessage);
          }
        };

        const strategies: Array<{
          name: string;
          source: string | MediaTrackConstraints;
        }> = [];

        if (selectedCameraId) {
          strategies.push({ name: 'selected device', source: selectedCameraId });
        }

        strategies.push(
          {
            name: 'rear facing mode',
            source: {
              facingMode: { ideal: preferredFacingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
              focusMode: { ideal: 'continuous' } as any,
            },
          },
          {
            name: 'environment fallback',
            source: { facingMode: 'environment', focusMode: { ideal: 'continuous' } as any },
          },
          { name: 'any camera fallback', source: { facingMode: 'user' } },
        );

        let startedScanner: Html5Qrcode | null = null;
        let lastError: any = null;

        for (const strategy of strategies) {
          if (!mountedRef.current) break;

          const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
            formatsToSupport: barcodeFormats,
            useBarCodeDetectorIfSupported: true,
            verbose: false,
          });
          scannerRef.current = scanner;

          try {
            await scanner.start(strategy.source as any, scanConfig, scanSuccess, scanError);
            startedScanner = scanner;
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`Camera start strategy failed (${strategy.name}):`, err?.name || err, err?.message || '');
            try {
              if (scanner.isScanning) await scanner.stop();
            } catch {}
            try {
              scanner.clear();
            } catch {}
            scannerRef.current = null;

            const container = document.getElementById(SCANNER_ELEMENT_ID);
            if (container) container.innerHTML = '';
          }
        }

        if (!startedScanner) {
          throw lastError || new Error('All camera strategies failed');
        }

        scannerRef.current = startedScanner;
        setIsCameraReady(true);
        setCameraError('');
        markTorchCapability(startedScanner);

        const devices = await refreshCameras();
        setActiveCameraId(selectedCameraId || devices[0]?.id || '');
      } catch (err: any) {
        if (!mountedRef.current) return;

        const errName = err?.name || '';
        const errStr = err?.message || err?.toString?.() || '';
        console.error('Camera failed to start:', errName, errStr, err);

        if (errName === 'NotAllowedError' || errStr.includes('NotAllowedError') || errName === 'SecurityError') {
          setManualError('لم يتم السماح بالوصول للكاميرا. يرجى إعطاء الصلاحية من متصفحك أو الإدخال يدوياً هنا، (قد تحتاج لفتح التطبيق في تبويب جديد).');
          setActiveMode('manual');
        } else if (errName === 'NotReadableError' || errStr.includes('NotReadableError')) {
          setCameraError('الكاميرا قيد الاستخدام من تطبيق آخر. أغلق أي تطبيق يستخدم الكاميرا ثم أعد المحاولة.');
        } else if (errName === 'NotFoundError' || errName === 'OverconstrainedError' || errStr.includes('OverconstrainedError')) {
          setCameraError('لم يتم العثور على كاميرا مناسبة على هذا الجهاز. استخدم الإدخال اليدوي بالأسفل.');
        } else {
          setCameraError(`تعذر تشغيل الكاميرا (${errName || 'خطأ غير معروف'}). استخدم الإدخال اليدوي بالأسفل.`);
        }
      } finally {
        startingRef.current = false;
      }
    }, 220);
  }, [
    activeMode,
    cameraManuallyStopped,
    handleBarcodeScanned,
    isPaused,
    preferredFacingMode,
    refreshCameras,
    selectedCameraId,
    stopCameraScanner,
  ]);

  useEffect(() => {
    mountedRef.current = true;

    if (showCamera && !isPaused) {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      mountedRef.current = false;
      stopCameraScanner();
    };
  }, [showCamera, isPaused, selectedCameraId, preferredFacingMode, startCameraScanner, stopCameraScanner]);

  const toggleFlashlight = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    try {
      const track = (scanner as any).getRunningTrack?.();
      if (!track) return;

      const nextState = !isFlashlightOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setHasFlashlight(true);
      setFlashlightSupportKnown(true);
      setIsFlashlightOn(nextState);
      setCameraError('');
    } catch (err) {
      console.error('Failed to toggle flashlight:', err);
      setIsFlashlightOn(false);
      setHasFlashlight(false);
      setFlashlightSupportKnown(true);
      setCameraError('هذا الجهاز أو المتصفح لا يسمح بتشغيل الفلاش من صفحة الويب. جرّب تحسين الإضاءة أو استخدم الإدخال اليدوي.');
    }
  };

  const switchCamera = async () => {
    const availableCameras = cameras.length > 0 ? cameras : await refreshCameras();
    await stopCameraScanner();
    setCameraManuallyStopped(false);
    setIsFlashlightOn(false);
    setFlashlightSupportKnown(false);
    setHasFlashlight(false);

    if (availableCameras.length > 1) {
      const currentId = selectedCameraId || activeCameraId;
      const currentIndex = availableCameras.findIndex((camera) => camera.id === currentId);
      const nextCamera = availableCameras[(currentIndex + 1 + availableCameras.length) % availableCameras.length];
      setSelectedCameraId(nextCamera.id);
      return;
    }

    setSelectedCameraId('');
    setPreferredFacingMode((mode) => (mode === 'environment' ? 'user' : 'environment'));
  };

  const toggleCamera = async () => {
    if (cameraManuallyStopped) {
      setCameraManuallyStopped(false);
    } else {
      await stopCameraScanner();
      setCameraManuallyStopped(true);
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    setManualError('');
    const clean = manualCode.trim();
    if (!clean) return;
    handleBarcodeScanned(clean);
  };

  return (
    <div className="flex flex-col gap-6" id="scanner-tab-container">
      <div className="grid grid-cols-2 gap-1 bg-white/40 p-1.5 rounded-2xl border border-white shadow-sm" id="scanner-modes-header">
        <button
          onClick={() => setActiveMode('camera')}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
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

      {activeMode === 'camera' && (
        <div className="flex flex-col gap-4 animate-fade-in shrink-0 bg-white/40 p-4 rounded-[2rem] border border-white shadow-sm" id="camera-view">
          <div className="text-center">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1 tracking-tight">قارئ الهاتف الذكي</h3>
            <p className="text-[11px] text-gray-500">وجّه الباركود داخل الإطار الأخضر — قرّب الهاتف حتى يملأ الخطوط الإطار</p>
          </div>

          <div className="relative w-full aspect-[4/3] max-w-sm mx-auto bg-gray-950 rounded-3xl border-[6px] border-gray-900 shadow-inner overflow-hidden flex items-center justify-center">
            {showCamera && (
              <div
                id={SCANNER_ELEMENT_ID}
                className="w-full h-full [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_canvas]:hidden"
              />
            )}

            {showCamera && !isCameraReady && (
              <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-gray-400 bg-gray-900/60 w-full h-full absolute inset-0 z-10">
                <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-primary-light shadow-md animate-pulse">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="text-[11px] tracking-wide font-medium max-w-[200px] leading-relaxed text-gray-300">جاري الاتصال بالكاميرا...</p>
              </div>
            )}

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
                <div className="absolute left-[11%] right-[11%] top-1/2 h-[38%] -translate-y-1/2 rounded-2xl border-2 border-primary-light/90 shadow-[0_0_0_999px_rgba(0,0,0,0.30)] pointer-events-none" />
                <div className="absolute left-0 right-0 h-[3px] bg-emerald-400 shadow-[0_0_20px_#10b981,0_0_8px_#10b981] animate-laser pointer-events-none z-10" style={{ top: '0%' }} />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    switchCamera();
                  }}
                  className="absolute top-4 right-4 z-20 p-2.5 rounded-xl backdrop-blur-md bg-black/60 text-white border border-white/20 shadow-md transition-all cursor-pointer hover:bg-black/85 hover:scale-105"
                  title={isEng ? 'Switch Camera' : 'تبديل الكاميرا'}
                >
                  <FlipHorizontal className="w-4 h-4 text-white" />
                </button>

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
                        ? (isEng ? 'Turn Off Flash' : 'إيقاف الكشاف')
                        : flashlightSupportKnown
                          ? (isEng ? 'Turn On Flash' : 'تشغيل الكشاف')
                          : (isEng ? 'Try Flash' : 'تجربة تشغيل الكشاف')
                    }
                  >
                    {isFlashlightOn ? <ZapOff className="w-4 h-4 text-white animate-pulse" /> : <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />}
                  </button>
                )}

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
