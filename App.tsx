
import React, { useState, useEffect, useCallback } from 'react';
import ImageUpload from './components/ImageUpload';
import StoryboardViewer from './components/StoryboardViewer';
import ImageEditor from './components/ImageEditor';
import HistoryList from './components/HistoryList';
import ApiKeyModal from './components/ApiKeyModal';
import { generateStoryboard, fileToGenerativePart } from './services/geminiService';
import { AppState, StoryboardData, GenerationOptions, SavedStoryboard } from './types';
import { Clapperboard, Loader2, Settings, LayoutList, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'cinescript_history_v2';
const LOCAL_KEY_NAME = 'cinescript_api_key';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImageData, setPreviewImageData] = useState<string | undefined>(undefined);
  const [selectedText, setSelectedText] = useState<string>('');
  const [storyboardData, setStoryboardData] = useState<StoryboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<GenerationOptions | null>(null);
  const [history, setHistory] = useState<SavedStoryboard[]>([]);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check API key status on mount
  useEffect(() => {
    const checkKeyStatus = () => {
      const savedKey = localStorage.getItem(LOCAL_KEY_NAME);
      const envKey = process.env.API_KEY;
      setHasKey(!!savedKey || !!envKey);
    };

    checkKeyStatus();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SavedStoryboard[];
        setHistory(parsed);
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleKeySave = (key: string) => {
    setHasKey(!!key || !!process.env.API_KEY);
  };

  const handleViewHistoryItem = (item: SavedStoryboard) => {
    setStoryboardData(item.data);
    setSelectedOptions(item.options);
    setPreviewImageData(item.previewImage);
    setSelectedImage(null); 
    setAppState(AppState.STORYBOARD);
  };

  const saveToHistory = async (data: StoryboardData, options: GenerationOptions, imageFile?: File | null) => {
    let base64Image = undefined;
    if (imageFile) {
        try {
            const rawData = await fileToGenerativePart(imageFile);
            base64Image = `data:${imageFile.type};base64,${rawData}`;
        } catch (e) {
            console.warn("Failed to save preview image to history", e);
        }
    }

    const newItem: SavedStoryboard = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      data,
      options,
      previewImage: base64Image
    };

    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  };

  const deleteFromHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleGenerate = async (input: File | string, options: GenerationOptions) => {
    const savedKey = localStorage.getItem(LOCAL_KEY_NAME);
    const envKey = process.env.API_KEY;
    
    if (!savedKey && !envKey) {
      setError("API 키가 설정되지 않았습니다. 설정에서 Gemini API 키를 입력해주세요.");
      setIsSettingsOpen(true);
      return;
    }

    // 상태 업데이트
    if (input instanceof File) {
      setSelectedImage(input);
      setSelectedText('');
    } else {
      setSelectedText(input);
      setSelectedImage(null);
    }
    
    setSelectedOptions(options);
    setAppState(AppState.ANALYZING);
    setError(null);

    try {
      const data = await generateStoryboard(input, options);
      setStoryboardData(data);
      // 생성 완료 후 히스토리에 저장
      await saveToHistory(data, options, input instanceof File ? input : null);
      setAppState(AppState.STORYBOARD);
    } catch (err: any) {
      console.error("Generation error:", err);
      
      let msg = "스토리보드를 생성하는 도중 오류가 발생했습니다.";
      if (err.message?.includes("API key")) {
        msg = "API 키 인증에 실패했습니다. 설정에서 키를 확인해주세요.";
        setIsSettingsOpen(true);
      } else if (err.message?.includes("JSON")) {
        msg = "AI가 유효한 데이터 형식을 생성하지 못했습니다. 다시 시도해주세요.";
      } else if (err.message?.includes("Requested entity was not found")) {
        msg = "유효하지 않은 프로젝트이거나 API 키가 올바르지 않습니다.";
        setIsSettingsOpen(true);
      }
      
      setError(msg);
      setAppState(AppState.UPLOAD);
    }
  };

  const handleReset = () => {
    setAppState(AppState.UPLOAD);
    setSelectedImage(null);
    setPreviewImageData(undefined);
    setSelectedText('');
    setStoryboardData(null);
    setError(null);
    setSelectedOptions(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-200 selection:bg-indigo-500/30">
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
            <div className="p-2 bg-indigo-600 rounded-lg group-hover:bg-indigo-500 transition-colors">
              <Clapperboard className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              CineScript <span className="text-indigo-400">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button 
                onClick={() => setAppState(appState === AppState.HISTORY ? AppState.UPLOAD : AppState.HISTORY)} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    appState === AppState.HISTORY 
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> 히스토리
            </button>
            <button 
              onClick={handleOpenSettings} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-sm ${
                !hasKey 
                ? 'bg-rose-900/20 border-rose-500/50 text-rose-400 animate-pulse' 
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> 
              설정
              {!hasKey && <AlertCircle className="w-3 h-3" />}
              {hasKey && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 relative">
        <div className="w-full relative z-10">
          {appState === AppState.UPLOAD && (
            <div className="animate-fade-in w-full">
               <div className="text-center mb-12">
                 <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                   K-Drama 스타일 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">스토리보드</span>
                 </h2>
                 <p className="text-zinc-500">한국인 배우, 현대적 복장 등이 적용된 전문 시네마틱 스토리보드 제작</p>
                 {!hasKey && (
                   <div className="mt-6 flex items-center justify-center gap-2 text-rose-400 text-sm bg-rose-950/20 py-2 px-4 rounded-full border border-rose-900/30 w-fit mx-auto animate-bounce">
                     <AlertCircle className="w-4 h-4" />
                     <span>상단 '설정'에서 Gemini API 키를 먼저 연결해주세요.</span>
                   </div>
                 )}
               </div>
               {error && (
                 <div className="max-w-2xl mx-auto mb-6 p-4 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-300 text-center text-sm flex items-center justify-center gap-3">
                   <AlertCircle className="w-4 h-4 shrink-0" />
                   {error}
                 </div>
               )}
               <ImageUpload onGenerate={handleGenerate} />
            </div>
          )}

          {appState === AppState.HISTORY && (
             <div className="animate-fade-in w-full space-y-8">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white">프로젝트 히스토리</h2>
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all"
                    >
                        <Plus className="w-4 h-4" /> 새 프로젝트
                    </button>
                </div>
                <HistoryList 
                  items={history} 
                  onDelete={deleteFromHistory} 
                  onClearAll={clearHistory}
                  onView={handleViewHistoryItem}
                />
             </div>
          )}

          {appState === AppState.ANALYZING && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
              <Loader2 className="w-16 h-16 text-indigo-400 animate-spin" />
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white">시네마틱 분석 중...</h3>
                <p className="text-zinc-400">전문 연출가 AI가 구성을 설계하고 있습니다.</p>
              </div>
            </div>
          )}

          {appState === AppState.STORYBOARD && storyboardData && (
            <StoryboardViewer 
                data={storyboardData} 
                originalImage={selectedImage}
                previewImageUrl={previewImageData}
                originalText={selectedText}
                onEditImage={() => setAppState(AppState.EDITOR)}
                onRegenerate={(newText) => {
                  if (selectedOptions) {
                    // 재생성 시 inputType을 TEXT로 명시적으로 변경하여 분석 품질 향상
                    handleGenerate(newText, { ...selectedOptions, inputType: 'TEXT' });
                  }
                }}
                imageModel={selectedOptions?.imageModel || 'Nano Banana'}
                aspectRatio={selectedOptions?.aspectRatio || '9:16'}
            />
          )}

          {appState === AppState.EDITOR && (selectedImage || previewImageData) && (
            <ImageEditor 
                originalImage={selectedImage} 
                previewImageUrl={previewImageData}
                onBack={() => setAppState(AppState.STORYBOARD)} 
            />
          )}
        </div>
      </main>

      <ApiKeyModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleKeySave}
      />
    </div>
  );
};

export default App;
