/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Barcode, AlertTriangle, CornerDownLeft, Sparkles, Zap, ZapOff } from 'lucide-react';
import { Product, AppSettings } from '../types';
import { useAppContext } from '../AppContext';

interface ScannerTabProps {
  onProductFound: (product: Product) => void;
  settings: AppSettings;
  isPaused?: boolean;
}

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

const cameraLabelScore = (label: string) => {
  const normalized = label.toLowerCase();
  if (/back|rear|environment|خلف|خلفية/.test(normalized)) return 3;
  if (/camera 0|camera1|0/.test(normalized)) return 2;
  return 1;
};

// Graceful safety net for third-party media play() interruptions
if (typeof window !== 'undefined' && window.HTMLMediaElement) {
  const originalPlay = window.HTMLMediaElement.prototype.play;
  window.HTMLMediaElement.prototype.play = function (...args) {
    const promise = originalPlay.apply(this, args);
    if (promise instanceof Promise) {
      promise.catch((err) => {
        const isAbort = err?.name === 'AbortError' || err?.message?.includes('interrupted') || err?.message?.includes('removed');
        if (isAbort) {
          console.debug('Handled and suppressed play() interruption:', err);
        } else {
          console.warn('HTMLMediaElement.play() rejected:', err);
        }
      });
    }
    return promise;
  };
}

// Crisp Synthesized Store Beep Sound
export function playBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(950, audioCtx.currentTime); // High pitch supermarket beep
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
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [manualError, setManualError] = useState('');
  
  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState('');
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);

  // Precision Timeout Refs and Mount Guard to prevent async race conditions & play() interruptions
  const isMountedRef = useRef(true);
  const isStartingRef = useRef<boolean>(false);
  const startTimeoutRef1 = useRef<any>(null);
  const startTimeoutRef2 = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeMode === 'camera' && !isPaused) {
      if (startTimeoutRef1.current) clearTimeout(startTimeoutRef1.current);
      startTimeoutRef1.current = setTimeout(() => {
        if (isMountedRef.current) {
          startCameraScanner();
        }
      }, 300);
    } else {
      stopCameraScanner();
    }
    return () => {
      isMountedRef.current = false;
      if (startTimeoutRef1.current) clearTimeout(startTimeoutRef1.current);
      if (startTimeoutRef2.current) clearTimeout(startTimeoutRef2.current);
      stopCameraScanner();
    };
  }, [activeMode, isPaused]);

  const handleBarcodeScanned = (decodedText: string) => {
    playBeepSound();
    stopCameraScanner();

    if (settings.isTestMode) {
      const mockProduct: Product = {
        id: `mock-${Date.now()}`,
        barcode: decodedText,
        name: `منتج تجريبي (${decodedText.slice(-4)})`,
        price: Number((Math.random() * 50 + 5).toFixed(2)),
        imageEmoji: '📦',
        category: 'عام',
        weight: 'قطعة واحدة',
        description: 'هذا منتج وهمي تم إنشاؤه أثناء وضع الاختبار.'
      };
      onProductFound(mockProduct);
      return;
    }

    const cleanBarcode = decodedText.trim();
    const p = products.find(
      (product) => product.barcode === cleanBarcode || product.id === cleanBarcode
    );
    if (p) {
      onProductFound(p);
    } else {
      setCameraError(`عذراً، الرمز (${decodedText}) ممسوح وغير مسجل لدينا في متجر النخبة.`);
    }
  };

  const loadCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
      }
    } catch (err) {
      console.log("Failed to load cameras on demand:", err);
    }
  };

  // Attempt to check if permissions were already granted to load list early
  useEffect(() => {
    loadCameras();
  }, []);

  const startCameraScanner = async () => {
    setCameraError('');
    setIsCameraActive(true);

    if (startTimeoutRef2.current) clearTimeout(startTimeoutRef2.current);

    // Timeout-delay to allow target div to render
    startTimeoutRef2.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      try {
        if (!window.isSecureContext) {
          setCameraError("الكاميرا تحتاج اتصال آمن HTTPS. على Render استخدم رابط https، ومحلياً استخدم http://localhost وليس عنوان IP عادي.");
          setIsCameraActive(false);
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("هذا المتصفح لا يدعم تشغيل الكاميرا من صفحة الويب. جرّب Chrome أو Safari حديث.");
          setIsCameraActive(false);
          return;
        }

        const scannerId = "camera-viewfinder-output";
        const element = document.getElementById(scannerId);
        if (!element || !isMountedRef.current) return;

        await stopCameraScanner();

        const html5QrCode = new Html5Qrcode(scannerId, {
          formatsToSupport: barcodeFormats,
          useBarCodeDetectorIfSupported: false,
          verbose: false,
        });
        scannerInstanceRef.current = html5QrCode;

        const availableCameras = await Html5Qrcode.getCameras().catch(() => []);
        if (availableCameras.length > 0) {
          setCameras(availableCameras);
        }

        const preferredCamera = [...availableCameras]
          .sort((a, b) => cameraLabelScore(b.label || '') - cameraLabelScore(a.label || ''))[0];

        isStartingRef.current = true;
        try {
          await html5QrCode.start(
            preferredCamera?.id || { facingMode: "environment" },
            {
              fps: 15,
              qrbox: (viewWidth: number, viewHeight: number) => {
                // Use 90% of the smaller dimension for a generous scan area
                const minDim = Math.min(viewWidth, viewHeight);
                const size = Math.floor(minDim * 0.9);
                return { width: size, height: Math.floor(size * 0.55) };
              },
              aspectRatio: 1.333,
              disableFlip: false,
            },
            handleBarcodeScanned,
            (errorMessage: string) => {
              // This fires when no barcode is found in a frame — normal, ignore.
              // Only log unexpected errors for debugging.
              if (errorMessage && !errorMessage.includes('NotFoundException')) {
                console.debug('Scan frame error:', errorMessage);
              }
            }
          );
        } catch (startErr) {
          console.warn("Preferred camera failed, trying generic camera constraints:", startErr);
          if (isMountedRef.current) {
            await html5QrCode.start(
              { facingMode: { ideal: "environment" } },
              {
                fps: 12,
                qrbox: (viewWidth: number, viewHeight: number) => {
                  const minDim = Math.min(viewWidth, viewHeight);
                  const size = Math.floor(minDim * 0.9);
                  return { width: size, height: Math.floor(size * 0.55) };
                },
                disableFlip: false
              },
              handleBarcodeScanned,
              () => {}
            );
          }
        } finally {
          isStartingRef.current = false;
        }

        if (!isMountedRef.current) {
          // If the component unmounted while the start promise was resolving, stop immediately
          stopCameraScanner();
          return;
        }

        // Successfully running
        setIsCameraActive(true);
        loadCameras();

        // Detect if flashlight (torch) option is supported dynamically
        try {
          const track = (html5QrCode as any).getRunningTrack();
          if (track) {
            const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
            const supportsFlash = !!(capabilities as any).torch || 'torch' in capabilities;
            setHasFlashlight(supportsFlash);
          }
        } catch (capErr) {
          console.log("Slight delay or browser limitation on getCapabilities check:", capErr);
        }
      } catch (err: any) {
        isStartingRef.current = false;
        if (!isMountedRef.current) return;
        const errStr = err?.toString?.() || '';
        
        if (err?.name === 'NotAllowedError' || errStr.includes('NotAllowedError')) {
           setManualError("لم يتم السماح بالوصول للكاميرا. يرجى إعطاء الصلاحية من متصفحك أو الإدخال يدوياً هنا، (قد تحتاج لفتح التطبيق في تبويب جديد).");
           setActiveMode('manual');
        } else {
           setCameraError("تـعذر تشغيل الكاميرا. يرجى التأكد من إعطاء الصلاحية أو استخدم الإدخال اليدوي المميز بالأسفل.");
        }
        
        setIsCameraActive(false);
      }
    }, 200);
  };

  const stopCameraScanner = async () => {
    if (startTimeoutRef1.current) clearTimeout(startTimeoutRef1.current);
    if (startTimeoutRef2.current) clearTimeout(startTimeoutRef2.current);

    // If camera is currently starting up, delay the stop call gracefully to avoid play() interruption
    if (isStartingRef.current) {
      setTimeout(() => {
        stopCameraScanner();
      }, 100);
      return;
    }

    if (scannerInstanceRef.current) {
      const scanner = scannerInstanceRef.current;
      scannerInstanceRef.current = null;
      if (scanner.isScanning) {
        try {
          await scanner.stop();
        } catch (err) {
          console.error("Error stopping camera", err);
        }
      }
    }
    setIsCameraActive(false);
    setIsFlashlightOn(false);
    setHasFlashlight(false);
  };

  const toggleFlashlight = async () => {
    if (!scannerInstanceRef.current) return;
    try {
      const track = (scannerInstanceRef.current as any).getRunningTrack();
      if (track) {
        const nextState = !isFlashlightOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any]
        });
        setIsFlashlightOn(nextState);
      }
    } catch (err) {
      console.error("Failed to toggle flashlight:", err);
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    setManualError('');
    const clean = manualCode.trim();
    if (!clean) return;

    handleBarcodeScanned(clean);
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCameraScanner();
    } else {
      startCameraScanner();
    }
  };

  return (
    <div className="flex flex-col gap-6" id="scanner-tab-container">
      {/* Visual Tab Buttons for Scanner Mode */}
      <div className="grid grid-cols-2 gap-1 bg-white/40 p-1.5 rounded-2xl border border-white shadow-sm" id="scanner-modes-header">
        <button
          onClick={() => {
            setActiveMode('camera');
          }}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeMode === 'camera'
              ? 'bg-white text-primary-dark shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-primary-light/30'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          id="btn-mode-camera"
        >
          <Barcode className="w-4.5 h-4.5" />
          <span>{settings.language === 'en' ? 'Camera Scan' : 'المسح الضوئي بالكاميرا'}</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('manual');
          }}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 ${
            activeMode === 'manual'
              ? 'bg-white text-primary-dark shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-primary-light/30'
              : 'text-gray-500 hover:text-gray-800'
          }`}
          id="btn-mode-manual"
        >
          <div className="flex items-center justify-center text-[9px] font-bold tracking-wider font-mono bg-primary-pale text-primary-dark border border-primary-light/30 px-1.5 h-4.5 rounded">6281001234567</div>
          <span>{settings.language === 'en' ? 'Manual Barcode' : 'إدخال الباركود يدوياً'}</span>
        </button>
      </div>

      {settings.isTestMode && (
        <div className="bg-amber-50/80 backdrop-blur-md border border-amber-200/60 rounded-xl p-3 flex gap-2 items-center text-amber-800 shadow-sm animate-fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-[11px] font-bold">وضع الاختبار يعمل. أي باركود سيتم فحصه سيطلب اسم وسعر.</p>
        </div>
      )}

      {/* Mode 1: Real Camera Scanning (using html5-qrcode) */}
      {activeMode === 'camera' && (
        <div className="flex flex-col gap-4 animate-fade-in shrink-0 bg-white/40 p-4 rounded-[2rem] border border-white shadow-sm" id="camera-view">
          <div className="text-center">
            <h3 className="text-[15px] font-bold text-gray-900 mb-1 tracking-tight">قارئ الهاتف الذكي</h3>
            <p className="text-[11px] text-gray-500">موجّه الهاتف نحو باركود المنتج ليتم مسحه تلقائياً في السلة</p>
          </div>

          {/* Camera Frame Viewport */}
          <div className="relative w-full aspect-[4/3] max-w-sm mx-auto bg-gray-950 rounded-3xl border-[6px] border-gray-900 shadow-inner overflow-hidden flex items-center justify-center">
            {/* Camera Viewfinder Container (Always inside the DOM to prevent browser play() exception) */}
            <div 
              id="camera-viewfinder-output" 
              className={`w-full h-full object-cover relative ${isCameraActive ? 'block' : 'hidden'}`} 
            />

            {/* Inactive System Overlay screen */}
            <div className={`flex flex-col items-center justify-center gap-4 p-8 text-center text-gray-400 bg-gray-900/60 w-full h-full absolute inset-0 z-0 ${isCameraActive ? 'hidden' : 'flex'}`}>
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-primary-light shadow-md animate-pulse">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-[11px] tracking-wide font-medium max-w-[200px] leading-relaxed text-gray-300">نظام المسح جاهز لتلقي إشارة الكاميرا والبدء.</p>
              <button
                onClick={toggleCamera}
                className="bg-primary-dark hover:bg-gray-900 px-6 py-3 rounded-2xl text-xs font-bold text-white transition-all shadow-lg flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-primary-pale" />
                <span>تفعيل عدسة المسح</span>
              </button>
            </div>

            {isCameraActive && (
              <>
                {/* Modern subtle corner frames for active indicator scanning boundaries */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-[3px] border-l-[3px] border-primary-dark rounded-tl-xl pointer-events-none" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-[3px] border-r-[3px] border-primary-dark rounded-tr-xl pointer-events-none" />
                <div className="absolute bottom-16 left-4 w-6 h-6 border-b-[3px] border-l-[3px] border-primary-dark rounded-bl-xl pointer-events-none" />
                <div className="absolute bottom-16 right-4 w-6 h-6 border-b-[3px] border-r-[3px] border-primary-dark rounded-br-xl pointer-events-none" />
                
                {/* Neo glowing laser scanning bar sweeping smoothly vertically across the entire viewport */}
                <div className="absolute left-0 right-0 h-[3px] bg-emerald-400 shadow-[0_0_20px_#10b981,0_0_8px_#10b981] animate-laser pointer-events-none z-10" style={{ top: '0%' }} />

                {/* Flashlight/Torch toggle button */}
                {hasFlashlight && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlashlight();
                    }}
                    className={`absolute top-4 left-4 z-20 p-2.5 rounded-xl backdrop-blur-md border shadow-md transition-all cursor-pointer ${
                      isFlashlightOn 
                        ? 'bg-amber-500 text-white border-amber-400 font-bold scale-105 shadow-amber-500/20' 
                        : 'bg-black/60 text-white border-white/20 hover:bg-black/85 hover:scale-105'
                    }`}
                    title={isFlashlightOn ? "إيقاف الكشاف" : "تشغيل الكشاف"}
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
                    إيقاف
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
