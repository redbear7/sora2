
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
    sourceScript: { type: Type.STRING },
    aspectRatio: { type: Type.STRING, description: "The screen ratio (e.g., '9:16' or '16:9')" },
    breakdown: {
      type: Type.OBJECT,
      properties: {
        subjects: { type: Type.STRING },
        characters: { type: Type.STRING },
        environmentLighting: { type: Type.STRING },
        visualAnchors: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["subjects", "characters", "environmentLighting", "visualAnchors"]
    },
    theme: {
      type: Type.OBJECT,
      properties: {
        theme: { type: Type.STRING },
        logline: { type: Type.STRING },
        emotionalArc: {
          type: Type.OBJECT,
          properties: {
            setup: { type: Type.STRING },
            build: { type: Type.STRING },
            turn: { type: Type.STRING },
            payoff: { type: Type.STRING },
          },
          required: ["setup", "build", "turn", "payoff"]
        }
      },
      required: ["theme", "logline", "emotionalArc"]
    },
    approach: {
      type: Type.OBJECT,
      properties: {
        shotProgression: { type: Type.STRING },
        cameraMovement: { type: Type.STRING },
        lensExposure: { type: Type.STRING },
        lightColor: { type: Type.STRING }
      },
      required: ["shotProgression", "cameraMovement", "lensExposure", "lightColor"]
    },
    keyframes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          shotType: { type: Type.STRING },
          duration: { type: Type.STRING },
          composition: { type: Type.STRING },
          action: { type: Type.STRING },
          dialogue: { type: Type.STRING },
          camera: { type: Type.STRING },
          lensDoF: { type: Type.STRING },
          lighting: { type: Type.STRING },
          sound: { type: Type.STRING },
        },
        required: ["id", "shotType", "duration", "composition", "action", "dialogue", "camera", "lensDoF", "lighting", "sound"]
      }
    },
    auditions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          characterName: { type: Type.STRING },
          appearance: { type: Type.STRING },
          clips: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                composition: { type: Type.STRING },
                action: { type: Type.STRING },
                dialogue: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  },
  required: ["sourceScript", "aspectRatio", "breakdown", "theme", "approach", "keyframes", "auditions"]
};

export const generateStoryboard = async (input: File | string, options: GenerationOptions): Promise<StoryboardData> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");
  
  const ai = new GoogleGenAI({ apiKey });
  let contentParts = [];
  
  if (options.inputType === 'IMAGE' && input instanceof File) {
    const base64Data = await fileToGenerativePart(input);
    contentParts.push({ inlineData: { mimeType: input.type, data: base64Data } });
  } else if (typeof input === 'string') {
    contentParts.push({ text: `Context: "${input}"` });
  }

  const prompt = `
    Role: Professional Cinematic Director.
    Task: Design a storyboard for a South Korean cinematic project.

    TARGET ASPECT RATIO: ${options.aspectRatio}

    LANGUAGE RULES:
    1. **ONLY** the "dialogue" fields MUST be in Korean.
    2. **ALL OTHER** fields (Action, Composition, Camera, Lighting, ShotType, Appearance, etc.) MUST be in **ENGLISH**.
    3. **CRITICAL**: The very first dialogue in the keyframes array MUST start with a leading space (e.g., " 대사내용").

    JSON STRUCTURE RULES:
    - Include the "aspectRatio" field with value: "${options.aspectRatio}".
    - Generate "auditions" for each main character.
    - Each character has 2 clips: "Upper body shot" and "Full body shot".
    - Character must wear production-appropriate modern Korean costumes (no Hanbok).
    - Dialogue in audition clips must also be in Korean.

    Style: High-end K-Drama/Movie aesthetic. Modern South Korean actors.
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

  if (!response.text) throw new Error("Failed to receive response from Gemini.");
  const data = JSON.parse(response.text) as StoryboardData;
  // Ensure aspect ratio matches requested options if AI fluctuates
  data.aspectRatio = options.aspectRatio;
  return data;
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
  
  const fullPrompt = `Cinematic shot (${aspectRatio}). Detailed South Korean characters. ${characterContext ? `Features: ${characterContext}.` : ''} ${prompt} 8k, photorealistic.`;
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
      if (part.inlineData) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate image.");
}

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
        { text: `${prompt}. Cinematic style, South Korean actors.` },
      ],
    },
  });
  const candidate = response.candidates?.[0];
  if (candidate) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Editing failed.");
};
