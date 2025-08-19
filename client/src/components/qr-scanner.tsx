import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QRScannerProps {
  onScan: (code: string) => void;
  isActive: boolean;
  onActivate: () => void;
}

export function QRScanner({ onScan, isActive, onActivate }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isActive]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment", // Use rear camera on mobile
          width: { ideal: 400 },
          height: { ideal: 400 }
        }
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // For demo purposes, we'll simulate QR code scanning
      // In a real implementation, you'd use a library like react-qr-reader
      // or qr-scanner to decode QR codes from the video stream
      
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Simulate QR code detection for demo
  const simulateQRScan = () => {
    onScan("2025-0001"); // Demo code
  };

  if (!isActive) {
    return (
      <Card className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
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
    <Card className="aspect-square rounded-lg overflow-hidden">
      <CardContent className="p-0 relative">
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
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              data-testid="video-camera-feed"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-lg"></div>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
              <Button
                onClick={simulateQRScan}
                className="bg-success-600 text-white hover:bg-success-700"
                data-testid="button-simulate-scan"
              >
                Simular Scan (Demo)
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
