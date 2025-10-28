
import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';

const ASPECT_RATIOS = [
    { value: '16:9', label: '橫向 (16:9)' },
    { value: '4:3', label: '標準 (4:3)' },
    { value: '1:1', label: '方形 (1:1)' },
    { value: '9:16', label: '直向 (9:16)' }
];

const Spinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center text-gray-800 p-8">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-semibold">{text}</p>
    </div>
);

export const GadgetPouchV2: React.FC = () => {
    const [text, setText] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [generatedImages, setGeneratedImages] = useState<{ src: string, selected: boolean }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [zoomedImageSrc, setZoomedImageSrc] = useState<string | null>(null);
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

    const handleGenerate = async () => {
        const genAI = getAi();
        if (!genAI || !text) return;

        setIsLoading(true);
        setLoadingText('正在分析文案...');
        setError(null);
        setGeneratedImages([]);

        try {
             // Step 1: Analyze text to get prompts for single elements on a white background
            const analysisResponse = await genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Analyze the following text and identify 5 key single elements or objects. For each, generate a distinct, detailed, and visually rich prompt for an image generation model. Each prompt must describe ONLY that single element against a completely plain, solid white background, using phrases like 'on a white background' or 'isolated on white'. The prompts must be in English. If the element is a person, specify their ethnicity as Taiwanese, Japanese, or Korean.\n\nText: "${text}"`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            prompts: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING }
                            }
                        }
                    }
                }
            });

            const result = JSON.parse(analysisResponse.text);
            const prompts: string[] = result.prompts;

            if (!prompts || prompts.length === 0) {
                throw new Error("無法從文案中提取有效的圖片生成指令。");
            }
            
            setLoadingText(`準備生成 ${prompts.length} 張圖片...`);

            // Step 2: Generate images for each prompt sequentially to avoid rate limiting
            const imageUrls: string[] = [];
            let imageCount = 1;
            for (const prompt of prompts) {
                setLoadingText(`正在生成第 ${imageCount} / ${prompts.length} 張圖片...`);
                const response = await genAI.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
                    },
                });
                const base64ImageBytes = response.generatedImages[0].image.imageBytes;
                const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
                imageUrls.push(imageUrl);
                imageCount++;
                // Add a small delay between requests to avoid hitting API rate limits.
                // This is a common cause for 429 errors when generating images in a batch.
                if (imageCount <= prompts.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay
                }
            }

            setGeneratedImages(imageUrls.map(src => ({ src, selected: false })));

        } catch (err) {
            console.error("Error during image generation:", err);
            setError("圖片生成失敗，請檢查主控台以取得更多資訊。");
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    };
    
    const downloadImage = (url: string, filename: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadSelected = () => {
        generatedImages.forEach((image, index) => {
            if (image.selected) {
                downloadImage(image.src, `pouch-v2-image-${index + 1}.jpg`);
            }
        });
    };

    const handleSelectImage = (index: number) => {
        const newImages = [...generatedImages];
        newImages[index].selected = !newImages[index].selected;
        setGeneratedImages(newImages);
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setGeneratedImages(generatedImages.map(img => ({ ...img, selected: checked })));
    };

    return (
        <div className="w-full h-full flex flex-col p-4 md:p-8 pt-16 bg-gray-100 gap-4 overflow-y-auto">
            {/* Header */}
            <header className="text-center">
                 <h2 className="text-3xl font-bold text-blue-800">百寶袋 V2</h2>
                 <p className="text-gray-600 mt-1">貼上文案，AI 會為您生成文案中的<strong className="text-blue-600">單一元素</strong>並搭配<strong className="text-blue-600">純白背景</strong>！</p>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
                {/* Left Panel: Input */}
                <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">步驟一：貼上文案</h3>
                    <textarea 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="請在此處貼上您的故事、文章或任何需要配圖的文案..."
                        className="w-full flex-1 p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-400"
                        aria-label="文案輸入框"
                    />
                    <div className="mt-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">步驟二：選擇圖片尺寸</h3>
                        <div className="flex gap-2 flex-wrap">
                            {ASPECT_RATIOS.map(ratio => (
                                <button
                                    key={ratio.value}
                                    onClick={() => setAspectRatio(ratio.value)}
                                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                                        aspectRatio === ratio.value
                                            ? 'bg-blue-500 text-white shadow'
                                            : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                                    }`}
                                >
                                    {ratio.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !text}
                        className={`mt-6 w-full py-3 bg-yellow-400 text-gray-800 font-bold rounded-lg shadow-md hover:bg-yellow-500 transition-transform transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-wait disabled:scale-100`}
                    >
                         {isLoading ? '生成中...' : '魔法生成 (5張) ✨'}
                    </button>
                </div>

                {/* Right Panel: Output */}
                <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col relative">
                     {isLoading && (
                        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                            <Spinner text={loadingText}/>
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center text-center text-red-600 p-4">
                            <div>
                                <h3 className="text-xl font-bold mb-2">發生錯誤</h3>
                                <p>{error}</p>
                                <button onClick={() => setError(null)} className="mt-4 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">關閉</button>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">生成結果</h3>
                         {generatedImages.length > 0 && (
                             <div className="flex items-center gap-4">
                                <div className="flex items-center">
                                    <input 
                                        type="checkbox"
                                        id="selectAllV2"
                                        checked={generatedImages.length > 0 && !generatedImages.some(img => !img.selected)}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="selectAllV2" className="ml-2 text-sm text-gray-700">全選</label>
                                </div>
                                <button 
                                    onClick={handleDownloadSelected}
                                    disabled={generatedImages.every(img => !img.selected)}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    下載選取項目
                                </button>
                            </div>
                         )}
                    </div>
                    
                    {generatedImages.length > 0 ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1">
                            {generatedImages.map((image, index) => (
                                <div key={index} className="relative group aspect-square">
                                    <img 
                                        src={image.src} 
                                        alt={`Generated image ${index + 1}`} 
                                        className="w-full h-full object-cover rounded-md shadow-sm"
                                    />
                                    <div 
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md"
                                        onClick={() => setZoomedImageSrc(image.src)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                        </svg>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={image.selected}
                                        onChange={() => handleSelectImage(index)}
                                        className="absolute top-2 left-2 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                             <p>您的配圖將會顯示在這裡</p>
                        </div>
                    )}
                </div>
            </div>

            {zoomedImageSrc && (
                <div 
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setZoomedImageSrc(null)}
                >
                    <div 
                        className="relative max-w-screen-lg w-full max-h-[90vh]" 
                        onClick={e => e.stopPropagation()}
                    >
                        <img 
                            src={zoomedImageSrc} 
                            alt="Zoomed view" 
                            className="w-full h-full object-contain rounded-lg shadow-2xl"
                        />
                        <button 
                            onClick={() => setZoomedImageSrc(null)} 
                            className="absolute -top-2 -right-2 text-white bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-600 transition-colors"
                            aria-label="關閉"
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
