
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardData, GenerationOptions, ImageGenModel, AspectRatio } from "../types";

const LOCAL_KEY_NAME = 'cinescript_api_key';

const getApiKey = () => {
  const savedKey = localStorage.getItem(LOCAL_KEY_NAME);
  return savedKey || process.env.API_KEY || "";
};

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const storyboardSchema = {
  type: Type.OBJECT,
  properties: {
    sourceScript: { 
      type: Type.STRING, 
      description: "입력된 원본 대본 또는 문맥을 그대로 유지하거나 한국어로 요약한 내용." 
    },
    breakdown: {
      type: Type.OBJECT,
      properties: {
        subjects: { type: Type.STRING, description: "장면의 주요 주제나 사물 (한국어)" },
        characters: { type: Type.STRING, description: "등장인물의 상세한 외모, 나이, 의상 스타일 묘사. 일관성을 위해 구체적으로 서술 (한국어)" },
        environmentLighting: { type: Type.STRING, description: "장소의 분위기와 조명 조건 (한국어)" },
        visualAnchors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "시각적 포인트가 되는 핵심 요소들 (한국어)" }
      },
      required: ["subjects", "characters", "environmentLighting", "visualAnchors"]
    },
    theme: {
      type: Type.OBJECT,
      properties: {
        theme: { type: Type.STRING, description: "작품의 핵심 테마 (한국어)" },
        logline: { type: Type.STRING, description: "작품의 한 줄 요약 (한국어)" },
        emotionalArc: {
          type: Type.OBJECT,
          properties: {
            setup: { type: Type.STRING, description: "도입부의 감정 상태 (한국어)" },
            build: { type: Type.STRING, description: "감정의 고조 (한국어)" },
            turn: { type: Type.STRING, description: "감정의 전환점 (한국어)" },
            payoff: { type: Type.STRING, description: "감정의 해소 및 결말 (한국어)" },
          },
          required: ["setup", "build", "turn", "payoff"]
        }
      },
      required: ["theme", "logline", "emotionalArc"]
    },
    approach: {
      type: Type.OBJECT,
      properties: {
        shotProgression: { type: Type.STRING, description: "전체적인 샷의 흐름과 연출 의도 (한국어)" },
        cameraMovement: { type: Type.STRING, description: "주요 카메라 무브먼트 전략 (한국어)" },
        lensExposure: { type: Type.STRING, description: "렌즈 선택 및 노출 스타일 (한국어)" },
        lightColor: { type: Type.STRING, description: "주요 색조와 빛의 색감 (한국어)" }
      },
      required: ["shotProgression", "cameraMovement", "lensExposure", "lightColor"]
    },
    keyframes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          shotType: { type: Type.STRING, description: "샷의 종류 (예: 클로즈업, 풀샷) (한국어)" },
          duration: { type: Type.STRING, description: "예상 지속 시간 (한국어)" },
          composition: { type: Type.STRING, description: "구도와 프레이밍 설명 (한국어)" },
          action: { type: Type.STRING, description: "인물의 움직임과 액션 (한국어)" },
          dialogue: { type: Type.STRING, description: "대사 (한국어)" },
          camera: { type: Type.STRING, description: "이 샷에서의 구체적 카메라 워킹 (한국어)" },
          lensDoF: { type: Type.STRING, description: "피사체 심도 및 렌즈 효과 (한국어)" },
          lighting: { type: Type.STRING, description: "이 샷의 세부 조명 연출 (한국어)" },
          sound: { type: Type.STRING, description: "효과음 및 배경 음악 연출 (한국어)" },
        },
        required: ["id", "shotType", "duration", "composition", "action", "dialogue", "camera", "lensDoF", "lighting", "sound"]
      }
    }
  },
  required: ["sourceScript", "breakdown", "theme", "approach", "keyframes"]
};

export const generateStoryboard = async (input: File | string, options: GenerationOptions): Promise<StoryboardData> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const isImageInput = options.inputType === 'IMAGE';
  const isHorizontal = options.aspectRatio === '16:9';
  let contentParts = [];
  
  if (isImageInput && input instanceof File) {
    const base64Data = await fileToGenerativePart(input);
    contentParts.push({ inlineData: { mimeType: input.type, data: base64Data } });
  } else if (typeof input === 'string') {
    contentParts.push({ text: `입력 대본/맥락: "${input}"` });
  }

  const prompt = `
    역할: 전문 시네마틱 스토리보드 감독.
    작업: 입력된 데이터를 분석하여 한국 드라마/영화 스타일의 고품질 스토리보드를 설계하십시오.
    
    언어 및 출력 규칙:
    - **중요**: 모든 필드(Action, Composition, Camera, Lighting 등)의 값은 반드시 **한국어**로 작성하십시오.
    - JSON 구조의 키 값은 유지하되, 내용은 풍부하고 전문적인 한국어 표현을 사용하십시오.
    
    인물 및 스타일 일관성 (엄격 준수):
    - 모든 등장인물은 "한국인"으로 묘사하며, 현대적인 헤어스타일과 이목구비를 가집니다.
    - 의상: 세련된 현대복, 오피스룩, 캐주얼 등 현대 한국 스타일.
    - **등장인물 묘사 일관성**: 'breakdown.characters' 필드에서 정의한 인물의 외모 특징(나이대, 머리색, 안경 유무, 특유의 인상 등)을 모든 키프레임의 'action' 및 'composition' 묘사에서도 동일하게 유지하십시오.
    - 전통 한복(Hanbok)은 결혼식이나 장례식 등의 명시적 상황이 아닐 경우 절대 사용하지 마십시오.
    
    화면 비율 준수 - ${options.aspectRatio}:
    - 모든 구도 설계는 ${options.aspectRatio} 비율에 최적화하십시오.
    - 첫 번째 키프레임의 composition에 "[${options.aspectRatio} ${isHorizontal ? '가로' : '세로'} 포맷 최적화]" 문구를 포함하십시오.

    최종 결과물은 유효한 JSON 형식이어야 합니다.
  `;

  contentParts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: storyboardSchema,
      temperature: 0.4, 
    }
  });

  if (!response.text) {
    throw new Error("Gemini로부터 응답을 받지 못했습니다.");
  }

  const data = JSON.parse(response.text) as StoryboardData;
  return data;
};

export const editImageWithPrompt = async (originalFile: File, prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");
  
  const ai = new GoogleGenAI({ apiKey });
  const base64Data = await fileToGenerativePart(originalFile);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: originalFile.type } },
        { text: `${prompt}. 시네마틱 스타일, 한국인 배우, 현대적 복장.` },
      ],
    },
  });
  
  const candidate = response.candidates?.[0];
  if (candidate) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("이미지를 생성하거나 편집하지 못했습니다.");
};

export const generateKeyframeImage = async (
  prompt: string, 
  originalFile: File | null,
  modelType: ImageGenModel,
  aspectRatio: AspectRatio,
  characterContext?: string
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = modelType === 'Nano Banana Pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  // 영문 프롬프트 변환 로직 (이미지 생성 모델은 영문 성능이 좋으므로 내부적으로는 영문 가이드를 섞음)
  const fullPrompt = `Cinematic shot (${aspectRatio}). Highly detailed South Korean characters. Consistent look. No Hanbok unless ritual. ${characterContext ? `Character details to maintain: ${characterContext}.` : ''} ${prompt} 8k, photorealistic, cinematic lighting.`;
  const parts: any[] = [{ text: fullPrompt }];
  
  if (originalFile) {
    const base64Data = await fileToGenerativePart(originalFile);
    parts.unshift({ inlineData: { data: base64Data, mimeType: originalFile.type } });
  }
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: parts },
    config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(modelType === 'Nano Banana Pro' ? { imageSize: "1K" } : {})
        }
    }
  });
  
  const candidate = response.candidates?.[0];
  if (candidate) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
  }
  throw new Error("이미지 생성에 실패했습니다.");
}
