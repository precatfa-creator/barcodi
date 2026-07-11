import { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertTriangle } from 'lucide-react';
import { BarcodeCameraScanner, listCameras, scoreCameraLabel } from '../lib/barcodeScanner';

interface Props {
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export default function BarcodeScanModal({ onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<BarcodeCameraScanner | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!window.isSecureContext) {
        setError('الكاميرا تحتاج اتصالاً آمناً (HTTPS). يمكنك إدخال الباركود يدوياً.');
        return;
      }
      const videoElement = videoRef.current;
      if (!videoElement) return;

      try {
        const scanner = new BarcodeCameraScanner(videoElement, (text: string) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onDetected(text.trim());
        });
        scannerRef.current = scanner;

        // Prefer the rear camera by deviceId (most reliable across browsers).
        let deviceId = '';
        try {
          const cams = await listCameras();
          const sorted = [...cams].sort((a, b) => scoreCameraLabel(b.label) - scoreCameraLabel(a.label));
          deviceId = sorted[0]?.id || '';
        } catch {
          // fall through to facingMode
        }
        if (cancelled) return;

        await scanner.start(deviceId ? { deviceId } : { facingMode: 'environment' });
        if (cancelled) {
          await scanner.stop();
        }
      } catch {
        if (!cancelled) {
          setError('تعذّر تشغيل الكاميرا. تأكد من السماح بالوصول إليها، أو أدخل الباركود يدوياً.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      scanner?.stop().catch(() => {});
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm" dir="rtl">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary-dark" />
            مسح الباركود
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl flex items-start gap-3 border border-rose-100 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            <div className="w-full overflow-hidden rounded-2xl bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            </div>
            <p className="text-xs text-gray-500 font-medium text-center mt-3">وجّه الكاميرا نحو الباركود لقراءته تلقائياً.</p>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
