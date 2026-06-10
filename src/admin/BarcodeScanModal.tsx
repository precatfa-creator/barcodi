import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertTriangle } from 'lucide-react';

const SCAN_REGION_ID = 'admin-barcode-scan-region';

const formats = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
];

const scoreLabel = (label: string) => {
  const l = label.toLowerCase();
  if (/back|rear|environment|wide|خلف|خلفية/.test(l)) return 4;
  if (/front|user|selfie|أمام|امام/.test(l)) return 0;
  return 1;
};

interface Props {
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export default function BarcodeScanModal({ onClose, onDetected }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!window.isSecureContext) {
        setError('الكاميرا تحتاج اتصالاً آمناً (HTTPS). يمكنك إدخال الباركود يدوياً.');
        return;
      }
      try {
        const scanner = new Html5Qrcode(SCAN_REGION_ID, {
          formatsToSupport: formats,
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });
        scannerRef.current = scanner;

        // Prefer the rear camera by deviceId (most reliable across browsers).
        let deviceId = '';
        try {
          const cams = await Html5Qrcode.getCameras();
          const sorted = [...cams].sort((a, b) => scoreLabel(b.label || '') - scoreLabel(a.label || ''));
          deviceId = sorted[0]?.id || '';
        } catch {
          // fall through to facingMode
        }
        if (cancelled) return;

        const config = {
          fps: 15,
          qrbox: (w: number, h: number) => {
            const width = Math.floor(Math.min(w * 0.82, 300));
            return { width, height: Math.floor(Math.min(h * 0.5, width * 0.6)) };
          },
        };

        const onScan = (text: string) => {
          if (handledRef.current) return;
          handledRef.current = true;
          onDetected(text.trim());
        };

        const source: any = deviceId || { facingMode: { ideal: 'environment' } };
        await scanner.start(source, config, onScan, () => {});
        if (cancelled) {
          try { await scanner.stop(); } catch {}
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
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          if (s.isScanning) {
            s.stop().then(() => { try { s.clear(); } catch {} }).catch(() => {});
          } else {
            s.clear();
          }
        } catch {
          // container may already be gone
        }
      }
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
            <div id={SCAN_REGION_ID} className="w-full overflow-hidden rounded-2xl bg-black aspect-square" />
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
