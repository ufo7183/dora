import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import { ImageCanvas, ImageCanvasRef } from './ImageCanvas';

const getBase64FromDataUrl = (dataUrl: string) => dataUrl.split(',')[1];
const getMimeTypeFromDataUrl = (dataUrl: string) => dataUrl.match(/data:(.*);base64/)?.[1] || 'image/png';

const isMaskEmpty = (mask: HTMLCanvasElement): boolean => {
    const maskCtx = mask.getContext('2d', { willReadFrequently: true });
    if (!maskCtx) return true;
    try {
        const imageData = maskCtx.getImageData(0, 0, mask.width, mask.height);
        const data = imageData.data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 0) return false; // Found a non-transparent pixel
        }
    } catch (e) {
        console.error("Could not get image data from mask:", e);
        return true;
    }
    return true;
};

export const ChemicalLab: React.FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const baseImageRef = useRef<ImageCanvasRef>(null);
    const replacementImageRef = useRef<ImageCanvasRef>(null);
    const ai = useRef<GoogleGenAI | null>(null);

    const getAi = useCallback(() => {
        if (!ai.current) {
            if (!process.env.API_KEY) {
                setError("API_KEY 環境變數未設定。");
                return null;
            }
            ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        }
        return ai.current;
    }, []);

    const processImage = (
        image: HTMLImageElement,
        mask: HTMLCanvasElement,
        mode: 'erase' | 'crop'
    ): string => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        
        if (mode === 'erase') {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            ctx.drawImage(image, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(mask, 0, 0, image.naturalWidth, image.naturalHeight);
            return canvas.toDataURL('image/png');
        } else { // crop
            const maskCtx = mask.getContext('2d');
            if (!maskCtx) return '';
            const imageData = maskCtx.getImageData(0, 0, mask.width, mask.height);
            const data = imageData.data;
            let minX = mask.width, minY = mask.height, maxX = -1, maxY = -1;

            for (let y = 0; y < mask.height; y++) {
                for (let x = 0; x < mask.width; x++) {
                    const alpha = data[(y * mask.width + x) * 4 + 3];
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        maxX = Math.max(maxX, x);
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            if (maxX === -1) return ''; // No mask drawn

            const cropWidth = maxX - minX;
            const cropHeight = maxY - minY;
            canvas.width = cropWidth;
            canvas.height = cropHeight;

            // Scale factors from rendered canvas size to original image size
            const scaleX = image.naturalWidth / mask.width;
            const scaleY = image.naturalHeight / mask.height;

            ctx.drawImage(
                image,
                minX * scaleX, minY * scaleY, // source x, y
                cropWidth * scaleX, cropHeight * scaleY, // source width, height
                0, 0, // dest x, y
                cropWidth, cropHeight // dest width, height
            );
            return canvas.toDataURL('image/png');
        }
    };

    const handleCombine = async () => {
        const genAI = getAi();
        if (!genAI) return;
        
        const baseData = baseImageRef.current?.getImageAndMask();
        const replacementData = replacementImageRef.current?.getImageAndMask();

        if (!baseData || !replacementData) {
            setError("請上傳底圖和素材圖。");
            return;
        }

        if (isMaskEmpty(baseData.mask)) {
            setError("請在底圖上畫出要合成的區域。");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setResultImage(null);

        try {
            const erasedBaseImageDataUrl = processImage(baseData.image, baseData.mask, 'erase');
            
            let replacementImageDataUrl = processImage(replacementData.image, replacementData.mask, 'crop');
            if (!replacementImageDataUrl) {
                // If no mask is drawn on the replacement image, use the whole image.
                replacementImageDataUrl = replacementData.image.src;
            }

            const baseImagePart = {
                inlineData: {
                    data: getBase64FromDataUrl(erasedBaseImageDataUrl),
                    mimeType: getMimeTypeFromDataUrl(erasedBaseImageDataUrl),
                }
            };
            
            const replacementImagePart = {
                inlineData: {
                    data: getBase64FromDataUrl(replacementImageDataUrl),
                    mimeType: getMimeTypeFromDataUrl(replacementImageDataUrl),
                }
            };

            const textPart = { text: "In the first image, seamlessly fill the transparent area with the content from the second image. Match the style, lighting, and perspective of the first image." };

            const response: GenerateContentResponse = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [baseImagePart, replacementImagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes = part.inlineData.data;
                    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
                    setResultImage(imageUrl);
                    break;
                }
            }

        } catch (err) {
            console.error("Error during image generation:", err);
            setError("圖片合成失敗，請檢查主控台以取得更多資訊。");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col p-4 md:p-8 bg-gray-100 gap-4 overflow-y-auto">
            <header className="text-center pt-12">
                <h2 className="text-3xl font-bold text-blue-800">多啦A夢化學實驗室</h2>
                <p className="text-gray-600 mt-1">混合不同的圖片，看看會發生什麼神奇的化學反應！</p>
            </header>
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                <div className="w-full md:w-5/12 h-64 md:h-full">
                    <ImageCanvas ref={baseImageRef} title="步驟一：上傳底圖" subtitle="這是你的畫布" />
                </div>
                <div className="text-4xl font-bold text-gray-500">+</div>
                <div className="w-full md:w-5/12 h-64 md:h-full">
                    <ImageCanvas ref={replacementImageRef} title="步驟二：上傳素材" subtitle="PS: 背景盡量單一" />
                </div>
            </div>
            
            <button
                onClick={handleCombine}
                disabled={isGenerating}
                className={`fixed bottom-8 right-8 z-20 w-48 h-48 bg-contain bg-no-repeat bg-center transition-all transform disabled:opacity-50 disabled:cursor-wait disabled:scale-100 scale-x-[-1] ${
                    isGenerating
                        ? 'animate-pulse [filter:drop-shadow(0_0_1.2rem_#60a5fa)]'
                        : '[filter:drop-shadow(0_5px_15px_rgba(0,0,0,0.3))]'
                }`}
                style={{ backgroundImage: `url(https://tool.yaohuei.com/Doreamon%20.png)` }}
                aria-label="合成圖片"
            >
                <span className="sr-only">合成</span>
            </button>

            {(isGenerating || resultImage || error) && (
                <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center" onClick={() => { if (!isGenerating) { setResultImage(null); setError(null); } }}>
                    <div className="bg-white rounded-lg shadow-2xl p-4 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        {isGenerating && (
                             <div className="flex flex-col items-center justify-center text-gray-800 p-8">
                                <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-lg font-semibold">正在進行化學反應...</p>
                                <p className="text-sm">這可能需要一些時間。</p>
                            </div>
                        )}
                        {error && (
                             <div className="text-center text-red-600 p-8">
                                <h3 className="text-xl font-bold mb-2">發生錯誤</h3>
                                <p>{error}</p>
                                <button onClick={() => setError(null)} className="mt-4 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">關閉</button>
                             </div>
                        )}
                        {resultImage && (
                            <>
                                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">合成成功！</h2>
                                <img src={resultImage} alt="Generated by AI" className="w-full h-auto object-contain rounded-md max-h-[70vh]" />
                                <div className="mt-4 flex justify-end gap-2">
                                   <button onClick={() => {setResultImage(null); setError(null);}} className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">關閉</button>
                                   <a href={resultImage} download={`doraemon-lab-result-${Date.now()}.png`} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">下載</a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};