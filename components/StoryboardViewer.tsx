
import React, { useState, useEffect, useMemo } from 'react';
import { StoryboardData, ImageGenModel, AspectRatio } from '../types';
import { Film, Download, Clapperboard, Camera, Zap, Palette, MapPin, FileJson, Copy, Check, Wand2, Loader2, Image as ImageIcon, MessageSquareQuote, FileText, User, LayoutGrid, Braces, Quote, RefreshCw, Sparkles } from 'lucide-react';
import { generateKeyframeImage } from '../services/geminiService';

interface StoryboardViewerProps {
  data: StoryboardData;
  originalImage: File | null;
  previewImageUrl?: string;
  onEditImage: () => void;
  onRegenerate: (newText: string) => void;
  imageModel: ImageGenModel;
  aspectRatio: AspectRatio;
  originalText?: string;
}

const StoryboardViewer: React.FC<StoryboardViewerProps> = ({ data, originalImage, previewImageUrl, onEditImage, onRegenerate, imageModel, aspectRatio, originalText }) => {
  const [copied, setCopied] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{[key: number]: string}>({});
  const [loadingImages, setLoadingImages] = useState<{[key: number]: boolean}>({});
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  
  const [editableData, setEditableData] = useState<StoryboardData>(data);
  const [localScript, setLocalScript] = useState<string>('');

  useEffect(() => {
    setEditableData(data);
    setLocalScript(originalText || data.sourceScript || '');
  }, [data, originalText]);

  const jsonString = useMemo(() => {
    return JSON.stringify(editableData, null, 2);
  }, [editableData]);
  
  const jsonByteSize = useMemo(() => new Blob([jsonString]).size, [jsonString]);

  const handleDialogueChange = (id: number, newDialogue: string) => {
    setEditableData(prev => ({
      ...prev,
      keyframes: prev.keyframes.map(kf => 
        kf.id === id ? { ...kf, dialogue: newDialogue } : kf
      )
    }));
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!localScript.trim()) {
      alert("대본 내용이 비어있습니다.");
      return;
    }

    if (window.confirm("현재 편집된 대본 내용을 바탕으로 스토리보드를 다시 설계하시겠습니까?")) {
      onRegenerate(localScript);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = "storyboard_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyJsonToClipboard = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateVisual = async (id: number, action: string, composition: string, lighting: string) => {
    if (loadingImages[id]) return;
    setLoadingImages(prev => ({ ...prev, [id]: true }));
    
    try {
      const prompt = `액션: ${action}. 구도: ${composition}. 조명: ${lighting}.`;
      const imageUrl = await generateKeyframeImage(prompt, originalImage, imageModel, aspectRatio, editableData.breakdown.characters);
      setGeneratedImages(prev => ({ ...prev, [id]: imageUrl }));
    } catch (error) {
      console.error(`이미지 생성 실패 (KF ${id}):`, error);
      alert('이미지 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoadingImages(prev => ({ ...prev, [id]: false }));
    }
  };

  const generateAllVisuals = async () => {
    for (const kf of editableData.keyframes) {
      if (!generatedImages[kf.id]) {
        await generateVisual(kf.id, kf.action, kf.composition, kf.lighting);
      }
    }
  };

  const downloadMasterBoard = async () => {
    setIsGeneratingMaster(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isHorizontal = aspectRatio === '16:9';
      const cols = isHorizontal ? 2 : 3;
      const cellWidth = isHorizontal ? 640 : 360;
      const cellHeight = isHorizontal ? 360 : 640;
      const headerHeight = 240; 
      const rows = Math.ceil(editableData.keyframes.length / cols);
      
      canvas.width = cols * cellWidth;
      canvas.height = headerHeight + (rows * cellHeight);

      ctx.fillStyle = '#09090b'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`시네마틱 스토리보드 (${aspectRatio})`, 60, 60);

      ctx.fillStyle = '#818cf8'; 
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`테마: ${editableData.theme.theme}`, 60, 130);

      for (let i = 0; i < editableData.keyframes.length; i++) {
        const kf = editableData.keyframes[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellWidth;
        const y = headerHeight + (row * cellHeight);

        if (generatedImages[kf.id]) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = generatedImages[kf.id];
          await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });

          const imgRatio = img.width / img.height;
          const targetRatio = cellWidth / cellHeight;
          let renderW, renderH, offsetX, offsetY;

          if (imgRatio > targetRatio) {
             renderH = cellHeight;
             renderW = cellHeight * imgRatio;
             offsetX = (cellWidth - renderW) / 2;
             offsetY = 0;
          } else {
             renderW = cellWidth;
             renderH = cellWidth / imgRatio;
             offsetX = 0;
             offsetY = (cellHeight - renderH) / 2;
          }

          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, cellWidth, cellHeight);
          ctx.clip();
          ctx.drawImage(img, x + offsetX, y + offsetY, renderW, renderH);
          ctx.restore();
        } else {
          ctx.fillStyle = '#18181b';
          ctx.fillRect(x, y, cellWidth, cellHeight);
        }

        const barHeight = 60; 
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y + cellHeight - barHeight, cellWidth, barHeight);
        ctx.fillStyle = '#22d3ee'; 
        ctx.font = 'bold 18px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(`키프레임 #${String(kf.id).padStart(2, '0')}`, x + 20, y + cellHeight - barHeight/2);

        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);
      }

      const link = document.createElement('a');
      link.download = `storyboard_${aspectRatio.replace(':', 'x')}_${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (e) {
      console.error("Master board 생성 실패", e);
      alert("마스터 보드 저장 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingMaster(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 pb-20 animate-fade-in">
      
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md py-4 border-b border-zinc-800 gap-4">
        <h2 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          시네마틱 스토리보드 ({aspectRatio})
        </h2>
        <div className="flex gap-3 flex-wrap justify-center">
            <button 
              onClick={generateAllVisuals}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-pink-900/10"
            >
              <ImageIcon className="w-4 h-4" />
              전체 장면 시각화
            </button>
            <button 
              onClick={downloadMasterBoard}
              disabled={isGeneratingMaster}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 text-white rounded-lg text-xs font-bold border border-zinc-700 transition-colors"
            >
              {isGeneratingMaster ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4" />}
              마스터 보드 저장
            </button>
            <button 
              onClick={downloadJson}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              데이터 내보내기 (JSON)
            </button>
        </div>
      </div>

      {/* 1. Editable Original Script (Top Section) */}
      <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <Quote className="w-24 h-24 text-white" />
         </div>
         <div className="relative z-10 space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
               <FileText className="w-4 h-4" /> 원본 대본 / 소스 문맥 (수정 가능)
             </h3>
             <button 
              onClick={handleRegenerate}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg text-[11px] font-bold border border-indigo-500/30 transition-all group/btn"
             >
               <RefreshCw className="w-3.5 h-3.5 group-hover/btn:rotate-180 transition-transform duration-500" />
               재생성
               <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
             </button>
           </div>
           <div className="relative group/area">
             <textarea
                value={localScript}
                onChange={(e) => setLocalScript(e.target.value)}
                placeholder="대본 내용을 입력하세요..."
                className="w-full bg-zinc-950/50 p-5 rounded-xl border border-zinc-800/50 min-h-[160px] text-sm text-zinc-300 leading-relaxed font-medium italic focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/30 transition-all custom-scrollbar resize-none"
             />
             <div className="absolute bottom-3 right-3 opacity-0 group-hover/area:opacity-100 transition-opacity pointer-events-none">
               <span className="text-[10px] text-zinc-600 font-mono">수정 중...</span>
             </div>
           </div>
         </div>
      </div>

      {/* 2. Scene Breakdown & Theme */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4" /> 장면 분석 (Breakdown)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
               <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">핵심 주제 (Subjects)</span>
                  <p className="text-zinc-200">{editableData.breakdown.subjects}</p>
               </div>
               <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">등장인물 설정 (Characters)</span>
                  <p className="text-zinc-100 font-bold">{editableData.breakdown.characters}</p>
               </div>
               <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">환경 및 조명 (Env & Lighting)</span>
                  <p className="text-zinc-200">{editableData.breakdown.environmentLighting}</p>
               </div>
               <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">시각적 앵커 (Visual Anchors)</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {editableData.breakdown.visualAnchors.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] border border-zinc-700 text-zinc-400">{a}</span>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-900/20 to-zinc-900/40 p-6 rounded-2xl border border-indigo-900/30 flex flex-col justify-between">
           <div className="space-y-2">
             <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">테마 및 로그라인</h3>
             <h4 className="text-xl font-bold text-white tracking-tight leading-tight">{editableData.theme.theme}</h4>
             <p className="text-sm text-zinc-400 italic">"{editableData.theme.logline}"</p>
           </div>
           <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="grid grid-cols-2 gap-2">
                 {Object.keys(editableData.theme.emotionalArc).map((k) => (
                    <div key={k} className="p-2 bg-zinc-950/40 rounded border border-zinc-800/50">
                       <span className="text-[9px] font-bold text-zinc-600 uppercase block">{k === 'setup' ? '도입' : k === 'build' ? '고조' : k === 'turn' ? '반전' : '해소'}</span>
                       <span className="text-[10px] text-zinc-300 line-clamp-2">{(editableData.theme.emotionalArc as any)[k]}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* 3. Keyframes */}
      <div className="space-y-8">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <Film className="w-5 h-5 text-rose-500" /> 키프레임 시퀀스
        </h3>
        
        <div className="grid grid-cols-1 gap-12">
          {editableData.keyframes.map((kf, index) => (
            <div key={kf.id} className="bg-zinc-900/60 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-2">
              
              {/* Image side */}
              <div className={`relative bg-black flex items-center justify-center overflow-hidden w-full ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] max-h-[600px] lg:max-h-none'}`}>
                {generatedImages[kf.id] ? (
                  <img src={generatedImages[kf.id]} className="w-full h-full object-cover" alt="Visual" />
                ) : (
                  <div className="text-center p-8">
                     {loadingImages[kf.id] ? (
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                     ) : (
                        <button 
                          onClick={() => generateVisual(kf.id, kf.action, kf.composition, kf.lighting)}
                          className="group flex flex-col items-center gap-3 text-zinc-600 hover:text-indigo-400 transition-colors"
                        >
                          <Wand2 className="w-10 h-10 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold uppercase tracking-widest">장면 시각화 생성</span>
                        </button>
                     )}
                  </div>
                )}
                <div className="absolute top-6 left-6 flex flex-col gap-1">
                  <span className="text-2xl font-black text-white/20 font-mono tracking-tighter">SCENE #{String(index + 1).padStart(2, '0')}</span>
                  <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black text-white border border-white/20 uppercase tracking-widest">{kf.shotType}</span>
                </div>
              </div>

              {/* Data side */}
              <div className="p-8 lg:p-10 flex flex-col justify-center space-y-6">
                 <div className="space-y-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">연출 액션 (Action)</span>
                    <p className="text-lg font-bold text-zinc-100 leading-snug">{kf.action}</p>
                 </div>

                 <div className="bg-indigo-600/5 p-6 rounded-2xl border border-indigo-500/20 shadow-inner">
                    <div className="flex items-center gap-2 mb-3">
                        <MessageSquareQuote className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">대사 (Dialogue)</span>
                    </div>
                    <textarea
                      value={kf.dialogue}
                      onChange={(e) => handleDialogueChange(kf.id, e.target.value)}
                      className="w-full bg-transparent text-indigo-100 text-lg font-bold italic focus:outline-none resize-none"
                      rows={2}
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50 text-[11px]">
                    <div>
                      <span className="text-zinc-500 font-bold uppercase block mb-1">구도 및 프레이밍</span>
                      <p className="text-zinc-300">{kf.composition}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase block mb-1">카메라 워크</span>
                      <p className="text-zinc-300">{kf.camera}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase block mb-1">샷 조명 연출</span>
                      <p className="text-zinc-300">{kf.lighting}</p>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold uppercase block mb-1">사운드 디자인</span>
                      <p className="text-zinc-300">{kf.sound}</p>
                    </div>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Metadata (JSON) */}
      <div className="space-y-6 pt-16 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Braces className="w-5 h-5 text-indigo-500" /> 제작용 JSON 데이터
            </h3>
            <p className="text-xs text-zinc-500">Sora / Veo 등 영상 생성 모델을 위한 메타데이터입니다.</p>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
               용량: {(jsonByteSize / 1024).toFixed(2)} KB
             </span>
             <button 
               onClick={copyJsonToClipboard}
               className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold border border-zinc-700 transition-all shadow-sm"
             >
               {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
               {copied ? '복사됨' : 'JSON 복사'}
             </button>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            <pre className="text-xs font-mono leading-relaxed text-indigo-400/80 whitespace-pre-wrap">
              {jsonString}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryboardViewer;
