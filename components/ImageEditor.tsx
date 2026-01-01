
import React, { useState } from 'react';
import { editImageWithPrompt } from '../services/geminiService';
import { Wand2, RefreshCw, ChevronLeft, Download } from 'lucide-react';

interface ImageEditorProps {
  originalImage: File | null;
  previewImageUrl?: string;
  onBack: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ originalImage, previewImageUrl, onBack }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // If we only have a base64 string from history, we can't easily re-edit using the current File-based API 
      // without extra conversion logic. For now, we prioritze the File object.
      if (!originalImage) {
          throw new Error("히스토리에서 불러온 이미지는 직접 편집이 불가능합니다. (원본 파일 필요)");
      }
      const result = await editImageWithPrompt(originalImage, prompt);
      setGeneratedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const displayImageUrl = originalImage ? URL.createObjectURL(originalImage) : previewImageUrl;

  return (
    <div className="w-full max-w-2xl mx-auto pb-20 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
        >
            <ChevronLeft className="w-6 h-6 text-zinc-400" />
        </button>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-indigo-400" />
            AI 이미지 편집
        </h2>
      </div>

      <div className="flex flex-col gap-12 mb-8">
        {/* Step 1: Original View & Prompt */}
        <div className="space-y-6">
            <div className="relative rounded-xl overflow-hidden border border-zinc-700 group shadow-2xl">
                {displayImageUrl ? (
                    <img src={displayImageUrl} alt="Original" className="w-full h-auto object-cover" />
                ) : (
                    <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center text-zinc-700">No Image Available</div>
                )}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-3 py-1 rounded text-xs text-white font-medium">ORIGINAL REFERENCE</div>
            </div>
            
            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
                <label className="block text-sm font-medium text-zinc-300 uppercase tracking-wider">편집 프롬프트 입력</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="예: 레트로 필터를 추가해줘..."
                        className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim() || !originalImage}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                        편집하기
                    </button>
                </div>
                {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
                {!originalImage && <p className="text-amber-500/80 text-xs mt-1">히스토리에서 열린 프로젝트는 원본 파일이 없어 편집 기능이 제한됩니다.</p>}
            </div>
        </div>

        {/* Step 2: Output Side */}
        <div className="flex flex-col w-full">
            <div className="flex-1 bg-zinc-950 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center relative overflow-hidden min-h-[500px] shadow-inner">
                {generatedImage ? (
                    <img src={generatedImage} alt="Edited" className="w-full h-full object-contain" />
                ) : (
                    <div className="text-center text-zinc-600 p-12">
                        <div className="bg-zinc-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Wand2 className="w-10 h-10 opacity-20" />
                        </div>
                        <p className="text-lg font-medium opacity-50">상단의 프롬프트를 입력하여<br/>편집된 이미지를 확인하세요.</p>
                    </div>
                )}
            </div>
            {generatedImage && (
                <a 
                    href={generatedImage} 
                    download={`edited_${Date.now()}.png`}
                    className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg"
                >
                    <Download className="w-5 h-5" />
                    편집된 이미지 다운로드
                </a>
            )}
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;
