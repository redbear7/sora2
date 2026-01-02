import React, { useState, useEffect, useMemo } from 'react';
import { StoryboardData, ImageGenModel, AspectRatio, Headline } from '../types';
import { Film, Download, Clapperboard, Camera, Zap, Palette, MapPin, FileJson, Copy, Check, Wand2, Loader2, Image as ImageIcon, MessageSquareQuote, FileText, User, LayoutGrid, MoveVertical } from 'lucide-react';
import { generateKeyframeImage } from '../services/geminiService';

interface StoryboardViewerProps {
  data: StoryboardData;
  originalImage: File | null;
  previewImageUrl?: string;
  onEditImage: () => void;
  imageModel: ImageGenModel;
  aspectRatio: AspectRatio;
  originalText?: string;
}

const TEXT_COLORS = [
  '#FFFFFF', '#FFFF00', '#EF4444', '#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#000000'
];

const StoryboardViewer: React.FC<StoryboardViewerProps> = ({ data, originalImage, previewImageUrl, onEditImage, imageModel, aspectRatio, originalText }) => {
  const [copied, setCopied] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{[key: number]: string}>({});
  const [loadingImages, setLoadingImages] = useState<{[key: number]: boolean}>({});
  const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
  
  const [sourceScript, setSourceScript] = useState(data.sourceScript || originalText || '');
  const [editableData, setEditableData] = useState<StoryboardData>(data);

  // Styling state for Headline
  const [headlineColors, setHeadlineColors] = useState({ line1: '#FFFFFF', line2: '#FFFFFF' });
  const [lineGap, setLineGap] = useState(0);
  const [selectedLine, setSelectedLine] = useState<'line1' | 'line2'>('line1');

  useEffect(() => {
    setEditableData(data);
    setSourceScript(data.sourceScript || originalText || '');
  }, [data, originalText]);

  const jsonString = useMemo(() => {
    const dataForExport = { ...editableData };
    return JSON.stringify(dataForExport, null, 2);
  }, [editableData]);
  
  const jsonByteSize = useMemo(() => new Blob([jsonString]).size, [jsonString]);

  const handleHeadlineChange = (line: keyof Headline, val: string) => {
    setEditableData(prev => ({
      ...prev,
      headline: { ...prev.headline, [line]: val }
    }));
  };

  const handleDialogueChange = (id: number, newDialogue: string) => {
    setEditableData(prev => ({
      ...prev,
      keyframes: prev.keyframes.map(kf => 
        kf.id === id ? { ...kf, dialogue: newDialogue } : kf
      )
    }));
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

  const copySourceScript = () => {
    navigator.clipboard.writeText(sourceScript).then(() => {
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2000);
    });
  };

  const generateVisual = async (id: number, action: string, composition: string, lighting: string) => {
    if (loadingImages[id]) return;
    setLoadingImages(prev => ({ ...prev, [id]: true }));
    
    try {
      const prompt = `Action: ${action}. Composition: ${composition}. Lighting: ${lighting}.`;
      const imageUrl = await generateKeyframeImage(prompt, originalImage, imageModel, aspectRatio, editableData.breakdown.characters);
      setGeneratedImages(prev => ({ ...prev, [id]: imageUrl }));
    } catch (error) {
      console.error(`Failed to generate image for KF ${id}:`, error);
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
      const headerHeight = 280; 
      const rows = Math.ceil(editableData.keyframes.length / cols);
      
      canvas.width = cols * cellWidth;
      canvas.height = headerHeight + (rows * cellHeight);

      ctx.fillStyle = '#09090b'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#18181b'; 
      ctx.fillRect(0, 0, canvas.width, headerHeight);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`CINEMATIC STORYBOARD (${aspectRatio})`, 60, 50);

      ctx.fillStyle = '#818cf8'; 
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText(`THEME: ${editableData.theme.theme}`, 60, 130);

      ctx.fillStyle = '#a1a1aa'; 
      ctx.font = 'italic 24px sans-serif';
      const logline = `LOGLINE: "${editableData.theme.logline}"`;
      ctx.fillText(logline, 60, 180);

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
          ctx.fillStyle = '#27272a';
          ctx.fillRect(x, y, cellWidth, cellHeight);
          ctx.fillStyle = '#3f3f46';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText("NO VISUAL", x + cellWidth/2, y + cellHeight/2);
          ctx.textAlign = 'left'; 
        }

        const barHeight = isHorizontal ? 60 : 80; 
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(x, y + cellHeight - barHeight, cellWidth, barHeight);
        ctx.strokeStyle = '#06b6d4'; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + cellHeight - barHeight);
        ctx.lineTo(x + cellWidth, y + cellHeight - barHeight);
        ctx.stroke();

        ctx.fillStyle = '#22d3ee'; 
        ctx.font = 'bold 20px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(`KF #${String(kf.id).padStart(2, '0')}`, x + 15, y + cellHeight - barHeight/2);

        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);
      }

      const link = document.createElement('a');
      link.download = `storyboard_master_${aspectRatio.replace(':', 'x')}_${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (e) {
      console.error("Master board generation failed", e);
      alert("마스터 보드 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingMaster(false);
    }
  };

  const displayImageUrl = originalImage ? URL.createObjectURL(originalImage) : previewImageUrl;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 pb-20 animate-fade-in">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-md py-4 border-b border-zinc-800 gap-4">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent text-center md:text-left">
          Cinematic Breakdown ({aspectRatio})
        </h2>
        <div className="flex gap-4 flex-wrap justify-center">
            <button 
              onClick={generateAllVisuals}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-pink-900/20"
            >
              <ImageIcon className="w-4 h-4" />
              모든 장면 시각화 ({imageModel})
            </button>
            <button 
              onClick={downloadMasterBoard}
              disabled={isGeneratingMaster}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-700 hover:bg-cyan-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-cyan-900/20"
            >
              {isGeneratingMaster ? <Loader2 className="w-4 h-4 animate-spin" /> : <LayoutGrid className="w-4 h-4" />}
              마스터 보드 저장
            </button>
            <button 
              onClick={downloadJson}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-900/20"
            >
              <Download className="w-4 h-4" />
              JSON 내보내기
            </button>
        </div>
      </div>

      {/* Headline Editor Section (NEW) */}
      <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-6">
         <div className="flex items-center justify-between">
           <h3 className="text-lg font-bold text-white flex items-center gap-2">
             <Palette className="w-4 h-4 text-pink-400" /> 썸네일 헤드라인 설정
           </h3>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Visual Preview */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-700 shadow-2xl flex flex-col items-center justify-center p-4">
               {displayImageUrl && <img src={displayImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-[2px]" alt="Background" />}
               <div className="relative z-10 w-full flex flex-col items-center" style={{ gap: `${lineGap}px` }}>
                  <input 
                    type="text" 
                    value={editableData.headline.line1} 
                    onChange={(e) => handleHeadlineChange('line1', e.target.value)}
                    onFocus={() => setSelectedLine('line1')}
                    style={{ color: headlineColors.line1 }}
                    className={`w-full bg-transparent text-center text-4xl font-black outline-none border-b border-transparent focus:border-white/30 transition-all drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] ${selectedLine === 'line1' ? 'scale-105' : 'opacity-80'}`}
                  />
                  <input 
                    type="text" 
                    value={editableData.headline.line2} 
                    onChange={(e) => handleHeadlineChange('line2', e.target.value)}
                    onFocus={() => setSelectedLine('line2')}
                    style={{ color: headlineColors.line2 }}
                    className={`w-full bg-transparent text-center text-4xl font-black outline-none border-b border-transparent focus:border-white/30 transition-all drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] ${selectedLine === 'line2' ? 'scale-105' : 'opacity-80'}`}
                  />
               </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
               <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    <MoveVertical className="w-3 h-3" /> 줄 간격 (Gap)
                  </div>
                  <input 
                    type="range" min="-40" max="80" step="1" 
                    value={lineGap} 
                    onChange={(e) => setLineGap(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600">
                    <span>-40px</span>
                    <span>{lineGap}px</span>
                    <span>80px</span>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    <Palette className="w-3 h-3" /> 글자 색상 ({selectedLine === 'line1' ? '상단' : '하단'})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TEXT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setHeadlineColors(prev => ({ ...prev, [selectedLine]: color }))}
                        className={`w-6 h-6 rounded-full border border-white/20 transition-all ${headlineColors[selectedLine] === color ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Breakdown Details */}
      <div className="flex flex-col gap-8">
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" /> 장면 분석
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-zinc-300">
            <div className="space-y-3">
              <div>
                <span className="text-zinc-500 uppercase text-xs font-bold block mb-1">피사체 (Subjects)</span>
                {editableData.breakdown.subjects}
              </div>
              <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/30">
                <span className="text-indigo-300 uppercase text-xs font-bold block mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> 인물 및 국적 (Characters)
                </span>
                <span className="text-indigo-100">{editableData.breakdown.characters}</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-zinc-500 uppercase text-xs font-bold block mb-1">환경 및 조명 (Env & Lighting)</span>
                {editableData.breakdown.environmentLighting}
              </div>
              <div>
                <span className="text-zinc-500 uppercase text-xs font-bold block mb-1">시각적 고정점 (Visual Anchors)</span>
                <div className="flex flex-wrap gap-2">
                  {editableData.breakdown.visualAnchors.map((anchor, i) => (
                    <span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs border border-zinc-700">{anchor}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-6 rounded-xl border border-zinc-800 relative overflow-hidden">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clapperboard className="w-5 h-5 text-indigo-400" /> 테마 및 스토리
          </h3>
          <div className="space-y-6">
            <div>
              <p className="text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">Main Theme</p>
              <h4 className="text-3xl font-bold text-white mb-3">
                {editableData.theme.theme}
              </h4>
              <p className="text-zinc-400 text-lg italic leading-relaxed">"{editableData.theme.logline}"</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(editableData.theme.emotionalArc).map(([key, value]) => (
                <div key={key} className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800">
                  <span className="text-xs text-zinc-500 uppercase font-bold block mb-2">{key}</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyframes Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 pb-4 border-b border-zinc-800">
          <Film className="w-5 h-5 text-rose-400" /> 키프레임 시퀀스 (Keyframes)
        </h3>
        
        <div className="flex flex-col gap-12">
          {editableData.keyframes.map((kf, index) => (
            <div key={kf.id} className="bg-zinc-900 group hover:bg-zinc-800/50 transition-colors rounded-xl border border-zinc-800 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 shadow-2xl">
              
              {/* Visual Side */}
              <div className={`bg-black border-r border-zinc-800 relative group/image overflow-hidden mx-auto w-full ${aspectRatio === '16:9' ? 'aspect-video md:h-auto' : 'aspect-[9/16] md:h-[600px] max-w-[340px] md:max-w-none'}`}>
                {generatedImages[kf.id] ? (
                  <>
                    <img src={generatedImages[kf.id]} alt={`Keyframe ${kf.id}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = generatedImages[kf.id];
                        link.download = `${String(index + 1).padStart(2, '0')}_Scene_${kf.shotType.replace(/\s+/g, '_')}.png`;
                        link.click();
                      }}
                      className="absolute bottom-4 right-4 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-950">
                    {loadingImages[kf.id] ? (
                      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                    ) : (
                       <button 
                         onClick={() => generateVisual(kf.id, kf.action, kf.composition, kf.lighting)}
                         className="flex flex-col items-center justify-center text-zinc-600 hover:text-indigo-400 transition-colors"
                       >
                         <Wand2 className="w-8 h-8 mb-2" />
                         <span className="text-xs font-medium">Generate Visual</span>
                       </button>
                    )}
                  </div>
                )}
                
                <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent">
                  <span className="font-mono text-rose-400 text-xl font-bold drop-shadow-lg">#{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-xs bg-zinc-800/90 px-3 py-1.5 rounded-full text-zinc-200 border border-zinc-600/50 backdrop-blur-md">{kf.shotType}</span>
                </div>
              </div>
              
              {/* Data Side */}
              <div className="p-8 flex flex-col justify-center space-y-6">
                 <div className="space-y-3">
                    <span className="text-xs font-bold uppercase text-zinc-500 tracking-widest">Scene Action</span>
                    <p className="text-zinc-200 text-lg leading-relaxed">{kf.action}</p>
                 </div>

                 <div className="bg-zinc-950/80 p-5 rounded-xl border border-zinc-800/50 flex flex-col gap-3 shadow-inner">
                    <div className="flex items-center gap-2">
                        <MessageSquareQuote className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-bold uppercase text-indigo-500 tracking-tighter">Dialogue (KR)</span>
                    </div>
                    <textarea
                      value={kf.dialogue}
                      onChange={(e) => handleDialogueChange(kf.id, e.target.value)}
                      className="w-full bg-transparent text-indigo-100 text-base font-medium italic focus:outline-none resize-none"
                      rows={3}
                    />
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4 pt-4">
                    <div className="flex items-start gap-3 text-sm p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50">
                        <Zap className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <span className="text-zinc-300"><span className="text-zinc-500 font-bold uppercase text-[10px] block mb-1">Composition</span> {kf.composition}</span>
                    </div>
                 </div>

                 <div className="flex justify-between items-center pt-6 border-t border-zinc-800 mt-auto text-xs text-zinc-500">
                    <span>Duration: {kf.duration}</span>
                    <span>Sound: {kf.sound}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryboardViewer;