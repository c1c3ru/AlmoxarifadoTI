import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import QrScanner from "qr-scanner";
// Vite: import worker asset URL and set WORKER_PATH
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite query suffix for asset url import
import qrScannerWorkerUrl from "qr-scanner/qr-scanner-worker.min.js?url";

interface QRScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
  onActivate: () => void;
}

export function QRScanner({ onScan, isActive, onActivate }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    QrScanner.WORKER_PATH = qrScannerWorkerUrl as unknown as string;

    if (isActive) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner(true);
    };
  }, [isActive]);

  const startScanner = async () => {
    if (!videoRef.current) return;
    try {
      setError(null);
      // Cleanup any previous instance
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result: { data: string }) => {
          // Debounce: stop after first read
          try {
            setDetected(true);
            // breve feedback visual antes do onScan
            setTimeout(() => setDetected(false), 800);
          } catch {}
          onScan(result.data);
        },
        {
          preferredCamera: "environment",
          maxScansPerSecond: 8,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      scannerRef.current = scanner;
      await scanner.start();
    } catch (err) {
      console.error("Erro ao iniciar scanner:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopScanner = async (destroy = false) => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        if (destroy) scannerRef.current.destroy();
        scannerRef.current = null;
      }
    } catch (err) {
      // noop
    }
  };

  if (!isActive) {
    return (
      <Card className="w-full max-w-xl mx-auto aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <CardContent className="text-center p-6">
          <i className="fas fa-camera text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-500 mb-4">Clique para ativar a câmera</p>
          <Button
            onClick={onActivate}
            className="bg-primary-600 text-white hover:bg-primary-700"
            data-testid="button-activate-camera"
          >
            <i className="fas fa-video mr-2"></i>
            Ativar Câmera
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto aspect-square rounded-lg overflow-hidden">
      <CardContent className="p-0 relative bg-black">
        {error ? (
          <div className="h-full flex items-center justify-center bg-gray-100">
            <div className="text-center p-6">
              <i className="fas fa-exclamation-triangle text-4xl text-error-600 mb-4"></i>
              <p className="text-error-600 mb-4">{error}</p>
              <Button
                onClick={onActivate}
                variant="outline"
                data-testid="button-retry-camera"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black"
              autoPlay
              playsInline
              muted
              data-testid="video-camera-feed"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={
                  `w-56 h-56 max-w-[75%] max-h-[75%] rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] ` +
                  (detected
                    ? "border-4 border-emerald-400 ring-4 ring-emerald-300/40 transition-all duration-200"
                    : "border-2 border-white/90")
                }
              ></div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
