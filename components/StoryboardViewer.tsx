
import React, { useState, useEffect, useMemo } from 'react';
import { StoryboardData, ImageGenModel, AspectRatio } from '../types';
import { Film, Download, Clapperboard, FileJson, Copy, Check, Wand2, Loader2, Image as ImageIcon, MessageSquareQuote, FileText, LayoutGrid, Braces, Quote, RefreshCw, Sparkles, UserCheck, Video } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'STORY' | 'AUDITION'>('STORY');
  const [copied, setCopied] = useState<'full' | 'audition' | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{[key: string]: string}>({});
  const [loadingImages, setLoadingImages] = useState<{[key: string]: boolean}>({});
  
  const [editableData, setEditableData] = useState<StoryboardData>(data);
  const [localScript, setLocalScript] = useState<string>('');

  useEffect(() => {
    setEditableData(data);
    setLocalScript(originalText || data.sourceScript || '');
  }, [data, originalText]);

  const fullJson = useMemo(() => JSON.stringify(editableData, null, 2), [editableData]);
  const auditionJson = useMemo(() => JSON.stringify(editableData.auditions, null, 2), [editableData]);

  const handleCopy = (type: 'full' | 'audition') => {
    const text = type === 'full' ? fullJson : auditionJson;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const generateVisual = async (key: string, action: string, composition: string) => {
    if (loadingImages[key]) return;
    setLoadingImages(prev => ({ ...prev, [key]: true }));
    try {
      const charCtx = editableData.breakdown.characters;
      const imageUrl = await generateKeyframeImage(`Action: ${action}. Composition: ${composition}.`, originalImage, imageModel, aspectRatio, charCtx);
      setGeneratedImages(prev => ({ ...prev, [key]: imageUrl }));
    } catch (e) {
      console.error(e);
      alert('이미지 생성 실패');
    } finally {
      setLoadingImages(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
      
      {/* 탭 네비게이션 */}
      <div className="flex justify-center border-b border-zinc-800">
        <button 
          onClick={() => setActiveTab('STORY')}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'STORY' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          <Clapperboard className="w-4 h-4" /> 스토리보드
        </button>
        <button 
          onClick={() => setActiveTab('AUDITION')}
          className={`px-8 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'AUDITION' ? 'border-indigo-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          <UserCheck className="w-4 h-4" /> 오디션 데이터
        </button>
      </div>

      {activeTab === 'STORY' ? (
        <div className="space-y-10">
          <div className="flex justify-between items-center bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
             <h2 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">시네마틱 스토리보드</h2>
             <button onClick={() => handleCopy('full')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all">
                {copied === 'full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} JSON 복사
             </button>
          </div>

          <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><FileText className="w-4 h-4" /> 대본 원본</h3>
                <button onClick={() => onRegenerate(localScript)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/30">
                  <RefreshCw className="w-3.5 h-3.5" /> 재생성
                </button>
             </div>
             <textarea 
               value={localScript} 
               onChange={(e) => setLocalScript(e.target.value)}
               className="w-full bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 text-sm text-zinc-300 min-h-[120px] focus:outline-none"
             />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {editableData.keyframes.map((kf, idx) => (
              <div key={idx} className="bg-zinc-900/60 rounded-3xl border border-zinc-800 overflow-hidden grid grid-cols-1 lg:grid-cols-2 shadow-2xl">
                 <div className={`relative bg-black flex items-center justify-center ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'}`}>
                    {generatedImages[`kf_${idx}`] ? (
                      <img src={generatedImages[`kf_${idx}`]} className="w-full h-full object-cover" />
                    ) : (
                      <button onClick={() => generateVisual(`kf_${idx}`, kf.action, kf.composition)} className="flex flex-col items-center gap-2 text-zinc-600 hover:text-indigo-400">
                        {loadingImages[`kf_${idx}`] ? <Loader2 className="w-8 h-8 animate-spin" /> : <Wand2 className="w-8 h-8" />}
                        <span className="text-[10px] font-bold uppercase">비주얼 생성</span>
                      </button>
                    )}
                 </div>
                 <div className="p-8 flex flex-col justify-center space-y-6">
                    <div>
                      <span className="text-[10px] font-black text-zinc-500 uppercase">Action (EN)</span>
                      <p className="text-lg font-bold text-zinc-100">{kf.action}</p>
                    </div>
                    <div className="bg-indigo-600/5 p-5 rounded-2xl border border-indigo-500/20">
                       <span className="text-[10px] font-black text-indigo-500 uppercase block mb-1">Dialogue (KO)</span>
                       <p className="text-indigo-100 text-lg font-bold italic">"{kf.dialogue}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-[10px] text-zinc-500">
                       <p><span className="font-bold text-zinc-400">CAM:</span> {kf.camera}</p>
                       <p><span className="font-bold text-zinc-400">COMP:</span> {kf.composition}</p>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-12 animate-fade-in">
          <div className="flex justify-between items-center">
             <div className="space-y-1">
                <h3 className="text-2xl font-black text-white flex items-center gap-2"><UserCheck className="w-6 h-6 text-emerald-400" /> 오디션 패키지</h3>
                <p className="text-sm text-zinc-500">캐릭터별 상반신/전신 프로필 및 오디션 대사 데이터입니다.</p>
             </div>
             <button onClick={() => handleCopy('audition')} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all">
                {copied === 'audition' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 오디션 JSON 복사
             </button>
          </div>

          {editableData.auditions.map((aud, charIdx) => (
            <div key={charIdx} className="bg-zinc-900/60 rounded-3xl border border-zinc-800 p-8 space-y-8">
               <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-zinc-800 pb-6">
                  <div>
                    <h4 className="text-3xl font-black text-white">{aud.characterName}</h4>
                    <span className="text-xs text-emerald-500 font-mono">CHAR_00{charIdx}</span>
                  </div>
                  <div className="max-w-md">
                     <span className="text-[10px] font-black text-zinc-500 uppercase">Appearance (EN)</span>
                     <p className="text-sm text-zinc-300 italic">{aud.appearance}</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {aud.clips.map((clip, clipIdx) => (
                    <div key={clipIdx} className="bg-zinc-950/50 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col">
                       <div className="aspect-square bg-black relative flex items-center justify-center">
                          {generatedImages[`aud_${charIdx}_${clipIdx}`] ? (
                            <img src={generatedImages[`aud_${charIdx}_${clipIdx}`]} className="w-full h-full object-cover" />
                          ) : (
                            <button onClick={() => generateVisual(`aud_${charIdx}_${clipIdx}`, clip.action, clip.composition)} className="flex flex-col items-center gap-2 text-zinc-700 hover:text-emerald-500">
                               {loadingImages[`aud_${charIdx}_${clipIdx}`] ? <Loader2 className="w-8 h-8 animate-spin" /> : <Video className="w-8 h-8" />}
                               <span className="text-[10px] font-bold">샷 생성</span>
                            </button>
                          )}
                          <div className="absolute top-4 left-4">
                             <span className="px-2 py-1 bg-emerald-600/90 rounded text-[9px] font-bold text-white uppercase">{clip.composition}</span>
                          </div>
                       </div>
                       <div className="p-6 space-y-4">
                          <div>
                             <span className="text-[9px] font-black text-zinc-500 uppercase">Action (EN)</span>
                             <p className="text-xs text-zinc-300">{clip.action}</p>
                          </div>
                          <div className="p-4 bg-emerald-600/5 rounded-xl border border-emerald-500/20">
                             <span className="text-[9px] font-black text-emerald-500 uppercase">Audition Line (KO)</span>
                             <p className="text-emerald-100 font-bold italic">"{clip.dialogue}"</p>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          ))}
        </div>
      )}

      {/* 전체 데이터 뷰어 (하단) */}
      <div className="pt-16 border-t border-zinc-800 space-y-4">
         <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2"><Braces className="w-5 h-5 text-indigo-500" /> Full Production JSON</h3>
            <button onClick={() => handleCopy('full')} className="text-xs text-zinc-500 hover:text-white underline">전체 복사</button>
         </div>
         <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
            <pre className="text-[11px] font-mono text-indigo-400/70 whitespace-pre-wrap">{fullJson}</pre>
         </div>
      </div>
    </div>
  );
};

export default StoryboardViewer;
