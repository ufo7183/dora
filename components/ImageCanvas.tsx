import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import type { Point } from '../types';

interface ImageCanvasProps {
  title: string;
  subtitle: string;
}

export interface ImageCanvasRef {
  getImageAndMask: () => { image: HTMLImageElement; mask: HTMLCanvasElement; } | null;
}

export const ImageCanvas = forwardRef<ImageCanvasRef, ImageCanvasProps>(({ title, subtitle }, ref) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPoint = useRef<Point | null>(null);

  useImperativeHandle(ref, () => ({
    getImageAndMask: () => {
      if (imageRef.current && canvasRef.current) {
        return { image: imageRef.current, mask: canvasRef.current };
      }
      return null;
    }
  }));

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImageSrc(result);
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            // Set canvas resolution to image's native resolution
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            // Clear previous drawings
            ctx?.clearRect(0, 0, canvas.width, canvas.height); 
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const getPoint = (e: React.MouseEvent): Point => {
      const rect = canvasRef.current!.getBoundingClientRect();
      // Calculate scale to convert screen coordinates to native canvas coordinates
      const scaleX = canvasRef.current!.width / rect.width;
      const scaleY = canvasRef.current!.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDrawing(true);
    lastPoint.current = getPoint(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !canvasRef.current || !lastPoint.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentPoint = getPoint(e);

    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.strokeStyle = 'rgba(255, 0, 255, 1)';
    ctx.lineWidth = 30; // Brush size
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPoint.current = currentPoint;
  };
  
  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };
  
  const handleClearMask = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className="w-full h-full bg-gray-200 rounded-lg shadow-inner flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-gray-400">
      <h3 className="text-lg font-bold text-gray-700">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      
      {!imageSrc ? (
        <label className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
          上傳圖片
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>
      ) : (
        <div className="w-full h-full flex-1 relative flex flex-col items-center justify-center">
            <p className="text-blue-600 font-semibold mb-2">請在圖上畫出要合成的區域</p>
            <div className="relative w-full max-w-full h-auto max-h-[calc(100%-50px)] aspect-auto flex items-center justify-center">
                <img ref={imageRef} src={imageSrc} className="max-w-full max-h-full object-contain select-none" alt="Uploaded content" />
                <canvas 
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full cursor-crosshair opacity-50"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />
            </div>
            <button onClick={handleClearMask} className="mt-2 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">清除標記</button>
        </div>
      )}
    </div>
  );
});