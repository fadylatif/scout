import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, QrCode, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { attendanceApi } from '../../api/attendance';
import type { QRCheckInResponse } from '../../types/attendance';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  onScanSuccess: () => void;
}

// Simple Web Audio feedback synthesizer (no external audio assets needed!)
function playTone(type: 'success' | 'duplicate' | 'error') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'duplicate') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // AudioContext might not be supported or allowed before user interaction
  }
}

export function QRScannerModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  onScanSuccess,
}: QRScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<QRCheckInResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setLastResult(null);
      setErrorMessage(null);
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;
          await handleScan(decodedText);
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 1500); // Debounce scan to avoid duplicate hits in 1.5s
        },
        () => {
          // ignore scan frame errors
        }
      );
      setIsCameraActive(true);
    } catch (err: any) {
      setIsCameraActive(false);
      setErrorMessage(
        'تعذر تشغيل الكاميرا تلقائياً (تأكد من إعطاء إذن الكاميرا)، يمكنك استخدام الإدخال اليدوي أدناه.'
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
      setIsCameraActive(false);
    }
  };

  const handleScan = async (code: string) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await attendanceApi.qrCheckIn(sessionId, code);
      setLastResult(res.data);

      if (res.data.status === 'CHECKED_IN') {
        playTone('success');
        setScanCount((prev) => prev + 1);
        onScanSuccess();
      } else if (res.data.status === 'ALREADY_CHECKED_IN') {
        playTone('duplicate');
      }
    } catch (err: any) {
      playTone('error');
      setLastResult(null);
      setErrorMessage(
        err.response?.data?.error || 'حدث خطأ أثناء فحص الكود أو لم يتم العثور على الفرد.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScan(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-2">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-gold-400" />
            <h2 className="text-lg font-bold text-text-primary">مسح كود QR للحضور</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-text-muted pb-1 border-b border-border">
            <span>الجلسة: <strong className="text-text-primary">{sessionTitle}</strong></span>
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
              تم المسح: {scanCount}
            </span>
          </div>

          {/* Camera Frame Container */}
          <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-border bg-surface-3 flex items-center justify-center min-h-[260px]">
            <div id="qr-reader-container" className="w-full h-full" />
            {!isCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-text-muted gap-2">
                <Camera className="w-8 h-8 opacity-40" />
                <p className="text-xs">الكاميرا غير نشطة. استخدم الإدخال اليدوي أو امنح الإذن للكاميرا.</p>
              </div>
            )}
          </div>

          {/* Scan Feedback Cards */}
          {lastResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                lastResult.status === 'CHECKED_IN'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {lastResult.status === 'CHECKED_IN' ? (
                <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-text-primary">{lastResult.member.full_name}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  كود: {lastResult.member.stage_code || '---'} {lastResult.member.team_name ? `• ${lastResult.member.team_name}` : ''}
                </p>
                <p className="text-xs font-semibold mt-1">{lastResult.message}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl border bg-brand-red/10 border-brand-red/30 text-brand-red text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Manual input fallback */}
          <form onSubmit={handleManualSubmit} className="pt-2">
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              أو أدخل كود الفرد / رمز QR يدوياً:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="مثال: SC-24-A-001 أو المعرف"
                className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-400 transition"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="btn-primary px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>تسجيل</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-2 flex justify-end">
          <button onClick={onClose} className="btn-secondary px-4 py-2 rounded-xl text-sm">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
