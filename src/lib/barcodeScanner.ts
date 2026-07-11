/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared camera barcode scanning built on the Barcode Detection API.
 *
 * Uses the browser's native `BarcodeDetector` where it actually supports our
 * formats (Chrome on Android — hardware-accelerated, fastest), and falls back
 * to the zxing-cpp WebAssembly ponyfill everywhere else (iOS Safari, desktop
 * browsers). This gives uniform, fast 1D decoding on every phone instead of
 * the old html5-qrcode behavior where unsupported browsers dropped to a slow
 * JavaScript decoder that struggled with EAN-13/UPC.
 */

import {
  BarcodeDetector as ZXingBarcodeDetector,
  prepareZXingModule,
  type BarcodeFormat,
  type DetectedBarcode,
} from 'barcode-detector/ponyfill';
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// Self-host the wasm binary through the Vite build instead of the default
// jsDelivr CDN — scanning must not depend on third-party CDN reachability.
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? zxingWasmUrl : prefix + path,
  },
});

export const SCAN_FORMATS: BarcodeFormat[] = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'itf',
];

export type CameraDevice = { id: string; label: string };

/**
 * Rank cameras so the main rear sensor sorts first. Secondary rear lenses
 * (ultrawide/telephoto/macro/depth) usually have no torch and can't focus
 * close enough for barcodes, so they rank below the plain back camera even
 * though they are rear-facing.
 */
export const scoreCameraLabel = (label: string) => {
  const normalized = label.toLowerCase();
  let score = 1;
  if (/back|rear|environment|خلف|خلفية/.test(normalized)) score = 4;
  else if (/camera\s*0|camera1|0/.test(normalized)) score = 2;
  if (/front|user|selfie|أمام|امام/.test(normalized)) return 0;
  if (score === 4 && /ultra|wide|tele|zoom|macro|depth|infrared/.test(normalized)) score = 3;
  // "camera 0" is almost always the main sensor on Android.
  if (score >= 3 && /camera2?\s*0/.test(normalized)) score = 5;
  return score;
};

interface DetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

let detectorPromise: Promise<DetectorLike> | null = null;

/**
 * Prefer the native BarcodeDetector only when it reports support for every
 * format we need. Some browsers (e.g. Chrome on Windows/Linux) expose the
 * constructor but support no formats, so existence alone is not enough.
 */
async function getDetector(): Promise<DetectorLike> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const NativeDetector = (globalThis as any).BarcodeDetector;
      if (NativeDetector?.getSupportedFormats) {
        try {
          const supported: string[] = await NativeDetector.getSupportedFormats();
          if (SCAN_FORMATS.every((format) => supported.includes(format))) {
            return new NativeDetector({ formats: SCAN_FORMATS }) as DetectorLike;
          }
        } catch {
          // fall through to the wasm ponyfill
        }
      }
      return new ZXingBarcodeDetector({ formats: SCAN_FORMATS });
    })();
  }
  return detectorPromise;
}

/**
 * List video input devices, requesting a temporary stream first when labels
 * are hidden behind the permission prompt (mirrors Html5Qrcode.getCameras).
 */
export async function listCameras(): Promise<CameraDevice[]> {
  const media = navigator.mediaDevices;
  if (!media?.enumerateDevices) return [];

  const videoInputs = async () =>
    (await media.enumerateDevices()).filter((device) => device.kind === 'videoinput');

  let cameras = await videoInputs();
  if ((cameras.length === 0 || cameras.every((camera) => !camera.label)) && media.getUserMedia) {
    let probeStream: MediaStream | null = null;
    try {
      probeStream = await media.getUserMedia({ video: true });
      cameras = await videoInputs();
    } finally {
      probeStream?.getTracks().forEach((track) => track.stop());
    }
  }

  return cameras.map((camera) => ({ id: camera.deviceId, label: camera.label || '' }));
}

export interface ScannerStartSource {
  /** Concrete deviceId — most reliable across browsers. */
  deviceId?: string;
  facingMode?: 'environment' | 'user';
}

const DETECT_INTERVAL_MS = 120;

export class BarcodeCameraScanner {
  private video: HTMLVideoElement;
  private onDetect: (text: string) => void;
  private stream: MediaStream | null = null;
  private running = false;
  private timer: number | null = null;
  private cropCanvas: HTMLCanvasElement | null = null;

  constructor(video: HTMLVideoElement, onDetect: (text: string) => void) {
    this.video = video;
    this.onDetect = onDetect;
  }

  get isScanning() {
    return this.running;
  }

  getTrack(): MediaStreamTrack | null {
    return this.stream?.getVideoTracks()[0] ?? null;
  }

  async start(source: ScannerStartSource): Promise<void> {
    // Request a high-resolution stream: 1D barcodes need horizontal pixel
    // density, and the browser default (often 640x480) is the main reason
    // weaker phones never manage a read.
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      ...(source.deviceId
        ? { deviceId: { exact: source.deviceId } }
        : { facingMode: { ideal: source.facingMode ?? 'environment' } }),
    };

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: videoConstraints,
    });

    const track = this.getTrack();
    if (track) {
      try {
        const capabilities: any = track.getCapabilities?.() ?? {};
        if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
        }
      } catch {
        // focus hint is best-effort
      }
    }

    this.video.srcObject = this.stream;
    this.video.setAttribute('playsinline', 'true');
    this.video.muted = true;
    await this.video.play();

    this.running = true;
    void this.runLoop();
  }

  async setTorch(on: boolean): Promise<void> {
    const track = this.getTrack();
    if (!track) throw new Error('No active video track');
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as any] });
    } catch {
      // Some browsers reject the `advanced` form but accept torch directly.
      await track.applyConstraints({ torch: on } as any);
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video.srcObject) {
      this.video.srcObject = null;
    }
  }

  private async runLoop(): Promise<void> {
    const detector = await getDetector();

    const tick = async () => {
      if (!this.running) return;
      try {
        if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const frame = this.cropCenterBand() ?? this.video;
          const results = await detector.detect(frame);
          const hit = results.find((result) => result.rawValue);
          if (hit && this.running) {
            this.onDetect(hit.rawValue);
          }
        }
      } catch {
        // Per-frame decode errors are expected noise; keep scanning.
      }
      if (this.running) {
        this.timer = window.setTimeout(tick, DETECT_INTERVAL_MS);
      }
    };

    void tick();
  }

  /**
   * Crop the frame to a full-width center band at native stream resolution.
   * Halves the pixels the wasm decoder chews per frame without sacrificing
   * the horizontal resolution 1D codes depend on, and matches the on-screen
   * scan-frame overlay where users aim the barcode.
   */
  private cropCenterBand(): HTMLCanvasElement | null {
    const { videoWidth, videoHeight } = this.video;
    if (!videoWidth || !videoHeight) return null;

    const bandHeight = Math.floor(videoHeight * 0.5);
    const bandTop = Math.floor((videoHeight - bandHeight) / 2);

    if (!this.cropCanvas) this.cropCanvas = document.createElement('canvas');
    const canvas = this.cropCanvas;
    if (canvas.width !== videoWidth) canvas.width = videoWidth;
    if (canvas.height !== bandHeight) canvas.height = bandHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(this.video, 0, bandTop, videoWidth, bandHeight, 0, 0, videoWidth, bandHeight);
    return canvas;
  }
}
