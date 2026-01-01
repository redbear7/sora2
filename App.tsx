
import React, { useState, useEffect } from 'react';
import ImageUpload from './components/ImageUpload';
import StoryboardViewer from './components/StoryboardViewer';
import ImageEditor from './components/ImageEditor';
import HistoryList from './components/HistoryList';
import { generateStoryboard, fileToGenerativePart } from './services/geminiService';
import { AppState, StoryboardData, GenerationOptions, SavedStoryboard } from './types';
import { Clapperboard, Loader2, Info, LayoutList, Plus } from 'lucide-react';

const STORAGE_KEY = 'cinescript_history';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImageData, setPreviewImageData] = useState<string | undefined>(undefined);
  const [selectedText, setSelectedText] = useState<string>('');
  const [storyboardData, setStoryboardData] = useState<StoryboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<GenerationOptions | null>(null);
  const [history, setHistory] = useState<SavedStoryboard[]>([]);

  // Initialize and check for "New Window" mode (compatibility)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SavedStoryboard[];
      setHistory(parsed);

      // Check if opening a specific ID via URL
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (id) {
        const found = parsed.find(item => item.id === id);
        if (found) {
          handleViewHistoryItem(found);
        }
      }
    }
  }, []);

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

  const autoDownloadTxt = (data: StoryboardData) => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    
    const fileName = `storyboard_${yy}${mm}${dd}_${hh}${min}.txt`;
    const content = JSON.stringify(data, null, 2);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async (input: File | string, options: GenerationOptions) => {
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
      autoDownloadTxt(data);
      await saveToHistory(data, options, input instanceof File ? input : null);
      setAppState(AppState.STORYBOARD);
    } catch (err) {
      console.error(err);
      setError("스토리보드를 생성하는 도중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setAppState(AppState.UPLOAD);
    }
  };

  const downloadManual = () => {
    const manualContent = `
# CineScript AI 사용자 지침서

CineScript AI를 사용하여 한 장의 이미지나 텍스트 대본으로 전문적인 시네마틱 스토리보드를 제작하는 방법입니다.

## 1. 주요 기능
- **비율 선택:** 세로(9:16) 또는 가로(16:9) 구성을 선택할 수 있습니다.
- **자동 저장:** 생성 완료 시 JSON 데이터가 .txt 파일로 즉시 다운로드됩니다.
- **히스토리 관리:** 생성된 모든 스토리보드는 히스토리에 저장되며 언제든 현재창에서 열어볼 수 있습니다.
- **시각화:** 각 장면의 구도와 연출에 맞게 이미지를 생성합니다.

## 2. 주의 사항
- **구도 준수:** 생성된 JSON 데이터의 첫 composition 필드에 선택한 비율이 명시됩니다.
- **언어:** 기술 데이터는 영문으로, 메인 테마와 로그라인, 인물 대사만 한글로 구성됩니다.
    `;
    const blob = new Blob([manualContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CineScript_AI_지침서.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (window.location.search.includes('id=')) {
        window.history.replaceState({}, '', window.location.pathname);
    }
    setAppState(AppState.UPLOAD);
    setSelectedImage(null);
    setPreviewImageData(undefined);
    setSelectedText('');
    setStoryboardData(null);
    setError(null);
    setSelectedOptions(null);
  };

  const toggleHistory = () => {
    if (appState === AppState.HISTORY) {
        setAppState(AppState.UPLOAD);
    } else {
        setAppState(AppState.HISTORY);
    }
  };

  const enterEditor = () => {
    if (selectedImage || previewImageData) {
        setAppState(AppState.EDITOR);
    }
  };

  const backToStoryboard = () => {
    setAppState(AppState.STORYBOARD);
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
                onClick={toggleHistory} 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    appState === AppState.HISTORY 
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' 
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> 히스토리
            </button>
            <button onClick={downloadManual} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-800 transition-colors">
              <Info className="w-3.5 h-3.5" /> 지침서
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-6 relative">
        <div className="w-full relative z-10">
          {appState === AppState.UPLOAD && (
            <div className="animate-fade-in w-full">
               <div className="text-center mb-12 space-y-4">
                 <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                   이미지 또는 대본을 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">스토리</span>로 만드세요
                 </h2>
               </div>
               {error && (
                 <div className="max-w-2xl mx-auto mb-6 p-4 bg-rose-950/30 border border-rose-900/50 rounded-lg text-rose-300 text-center text-sm">
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
                onEditImage={enterEditor}
                imageModel={selectedOptions?.imageModel || 'Nano Banana'}
                aspectRatio={selectedOptions?.aspectRatio || '9:16'}
            />
          )}

          {appState === AppState.EDITOR && (selectedImage || previewImageData) && (
            <ImageEditor 
                originalImage={selectedImage} 
                previewImageUrl={previewImageData}
                onBack={backToStoryboard} 
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
