import { useEffect, useRef } from 'react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeGenerator({ value, size = 64, className = "" }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (!canvasRef.current) return;

      try {
        // Usar uma biblioteca externa para gerar QR Code
        const QRCode = await import('qrcode');
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) return;

        // Limpar canvas
        ctx.clearRect(0, 0, size, size);

        // Gerar QR Code
        await QRCode.toCanvas(canvas, value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        
        // Fallback: desenhar um QR code simples
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(2, 2, size - 4, size - 4);
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(4, 4, size - 8, size - 8);
      }
    };

    generateQRCode();
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`border border-gray-200 rounded ${className}`}
      title={`QR Code para: ${value}`}
    />
  );
} 