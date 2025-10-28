import React, { useState, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';

// Helper to get base64 from data URL
const getBase64FromDataUrl = (dataUrl: string) => dataUrl.split(',')[1];
const getMimeTypeFromDataUrl = (dataUrl: string) => dataUrl.match(/data:(.*);base64/)?.[1] || 'image/png';

// Loading spinner component
const Spinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center text-gray-800 p-8">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-semibold">{text}</p>
    </div>
);


export const ImageGallery: React.FC = () => {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [englishPrompt, setEnglishPrompt] = useState('');
    const [chinesePrompt, setChinesePrompt] = useState('');
    
    // Track original translated values to detect user edits
    const [originalEnglishPrompt, setOriginalEnglishPrompt] = useState('');
    const [originalChinesePrompt, setOriginalChinesePrompt] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const ai = useRef<GoogleGenAI | null>(null);

    const promptsAreDirty = (englishPrompt !== originalEnglishPrompt) || (chinesePrompt !== originalChinesePrompt);

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

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                setUploadedImage(result);
                analyzeImageAndTranslate(result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const analyzeImageAndTranslate = async (imageDataUrl: string) => {
        const genAI = getAi();
        if (!genAI) return;

        setIsLoading(true);
        setLoadingText('正在解析圖片...');
        setError(null);
        setEnglishPrompt('');
        setChinesePrompt('');

        try {
            // Step 1: Analyze image to get English prompt
            const imagePart = {
                inlineData: {
                    data: getBase64FromDataUrl(imageDataUrl),
                    mimeType: getMimeTypeFromDataUrl(imageDataUrl),
                }
            };
            const textPart = { text: "Describe this image in a single, detailed paragraph. This description will be used as a prompt for an image generation model. Focus on the visual elements, style, composition, and mood." };
            
            const enResponse = await genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, textPart] },
            });

            const enPrompt = enResponse.text.trim();
            setEnglishPrompt(enPrompt);
            setOriginalEnglishPrompt(enPrompt);

            // Step 2: Translate English prompt to Chinese
            setLoadingText('正在翻譯...');
            const zhResponse = await genAI.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Please translate the following English text into Traditional Chinese: "${enPrompt}"`,
            });
            const zhPrompt = zhResponse.text.trim();
            setChinesePrompt(zhPrompt);
            setOriginalChinesePrompt(zhPrompt);

        } catch (err) {
            console.error("Error during analysis/translation:", err);
            setError("圖片解析或翻譯失敗，請檢查主控台。");
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    };

    const handleRetranslate = async () => {
        const genAI = getAi();
        if (!genAI) return;

        setIsLoading(true);
        setLoadingText('正在重新翻譯...');
        setError(null);

        try {
            // If English has been changed, translate it to Chinese
            if (englishPrompt !== originalEnglishPrompt) {
                const response = await genAI.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Please translate the following English text into Traditional Chinese: "${englishPrompt}"`,
                });
                const newZhPrompt = response.text.trim();
                setChinesePrompt(newZhPrompt);
                setOriginalEnglishPrompt(englishPrompt);
                setOriginalChinesePrompt(newZhPrompt);
            } 
            // If Chinese has been changed, translate it to English
            else if (chinesePrompt !== originalChinesePrompt) {
                 const response = await genAI.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Please translate the following Traditional Chinese text into English for an image generation prompt: "${chinesePrompt}"`,
                });
                const newEnPrompt = response.text.trim();
                setEnglishPrompt(newEnPrompt);
                setOriginalChinesePrompt(chinesePrompt);
                setOriginalEnglishPrompt(newEnPrompt);
            }
        } catch (err) {
            console.error("Error during re-translation:", err);
            setError("重新翻譯失敗，請檢查主控台。");
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    };
    
    const handleGenerateImage = async () => {
        const genAI = getAi();
        if (!genAI || !englishPrompt) {
            setError("沒有可用於生成圖片的英文提示。");
            return;
        };

        setIsLoading(true);
        setGeneratedImage(null);
        setLoadingText('正在生成圖片...');
        setError(null);

        try {
            const response = await genAI.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: englishPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                },
            });
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            setGeneratedImage(imageUrl);
        } catch (err) {
            console.error("Error generating image:", err);
            setError("圖片生成失敗，請檢查主控台。");
        } finally {
            setIsLoading(false);
            setLoadingText('');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(englishPrompt).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };
    
    return (
        <div className="w-full h-full flex flex-col p-4 md:p-8 pt-16 bg-gray-100 gap-4 overflow-y-auto">
            <header className="text-center">
                <h2 className="text-3xl font-bold text-blue-800">百變圖庫</h2>
                <p className="text-gray-600 mt-1">上傳圖片，讓 AI 幫你解析出魔法般的咒語！</p>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
                {/* Left Panel: Image Upload */}
                <div className="relative bg-white rounded-lg shadow-lg flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300">
                    {!uploadedImage ? (
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-gray-700">上傳圖片以開始</h3>
                            <p className="text-sm text-gray-500 mb-4">AI 將會分析您的圖片並生成提示詞</p>
                            <label className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">
                                選擇檔案
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                            <img src={uploadedImage} alt="Uploaded preview" className="max-w-full max-h-[80%] object-contain rounded-md shadow-md"/>
                             <label className="mt-4 cursor-pointer px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-md hover:bg-gray-300 transition-colors">
                                更換圖片
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                            </label>
                        </div>
                    )}
                    <button
                        onClick={handleGenerateImage}
                        disabled={isLoading || !englishPrompt}
                        className={`absolute bottom-4 right-4 z-20 w-48 h-48 bg-contain bg-no-repeat bg-center transition-all transform disabled:opacity-50 disabled:cursor-wait disabled:scale-100 scale-x-[-1] ${
                            isLoading
                                ? 'animate-pulse [filter:drop-shadow(0_0_1.2rem_#60a5fa)]'
                                : '[filter:drop-shadow(0_5px_15px_rgba(0,0,0,0.3))]'
                        }`}
                        style={{ backgroundImage: `url(https://tool.yaohuei.com/Doreamon%20.png)` }}
                        aria-label="生成圖片"
                    >
                        <span className="sr-only">生成圖片</span>
                    </button>
                </div>

                {/* Right Panel: Prompts and Actions */}
                <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col relative">
                    {isLoading && !generatedImage && (
                        <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                            <Spinner text={loadingText}/>
                        </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={handleCopy} disabled={!englishPrompt} className="px-3 py-1 text-sm bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors">
                            {copySuccess ? '已複製!' : '複製英文'}
                        </button>
                        {promptsAreDirty && (
                             <button onClick={handleRetranslate} className="px-3 py-1 text-sm bg-yellow-400 rounded-md hover:bg-yellow-500 transition-colors">
                                重新翻譯
                            </button>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                        <textarea 
                            value={englishPrompt}
                            onChange={(e) => setEnglishPrompt(e.target.value)}
                            placeholder="English Prompt..."
                            className="w-full flex-1 p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-400"
                            aria-label="English Prompt"
                        />
                        <textarea 
                            value={chinesePrompt}
                            onChange={(e) => setChinesePrompt(e.target.value)}
                            placeholder="中文提示詞..."
                            className="w-full flex-1 p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-400"
                             aria-label="Chinese Prompt"
                        />
                    </div>
                </div>
            </div>

             {(generatedImage || (isLoading && loadingText.includes('生成'))) && (
                <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center" onClick={() => { if (!isLoading) { setGeneratedImage(null); setError(null); } }}>
                    <div className="bg-white rounded-lg shadow-2xl p-4 max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                        {isLoading && <Spinner text={loadingText}/>}
                        {error && (
                             <div className="text-center text-red-600 p-8">
                                <h3 className="text-xl font-bold mb-2">發生錯誤</h3>
                                <p>{error}</p>
                                <button onClick={() => setError(null)} className="mt-4 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">關閉</button>
                             </div>
                        )}
                        {generatedImage && (
                            <>
                                <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">生成成功！</h2>
                                <img src={generatedImage} alt="Generated by AI" className="w-full h-auto object-contain rounded-md max-h-[70vh]" />
                                <div className="mt-4 flex justify-end gap-2">
                                   <button onClick={() => setGeneratedImage(null)} className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">關閉</button>
                                   <a href={generatedImage} download={`gallery-result-${Date.now()}.jpg`} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">下載</a>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};