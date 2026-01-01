
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardData, GenerationOptions, ImageGenModel, AspectRatio } from "../types";

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
    }
  },
  required: ["breakdown", "theme", "approach", "keyframes"]
};

export const generateStoryboard = async (input: File | string, options: GenerationOptions): Promise<StoryboardData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isImageInput = options.inputType === 'IMAGE';
  const isHorizontal = options.aspectRatio === '16:9';
  let contentParts = [];
  
  if (isImageInput && input instanceof File) {
    const base64Data = await fileToGenerativePart(input);
    contentParts.push({ inlineData: { mimeType: input.type, data: base64Data } });
  } else if (typeof input === 'string') {
    contentParts.push({ text: `Source Script/Context: "${input}"` });
  }

  const prompt = `
    Role: Award-winning trailer director + cinematographer specialized in cinematic content.
    Task: Analyze the input and output a cinematic storyboard JSON for video generation models (like VEO or Sora).
    
    CRITICAL MANDATE - ${options.aspectRatio} ASPECT RATIO:
    1. The ENTIRE storyboard and ALL technical descriptions MUST strictly adhere to a ${isHorizontal ? '16:9 Horizontal (Widescreen)' : '9:16 Vertical (Mobile)'} format.
    2. Every scene, composition, and camera movement must be optimized for this specific frame.
    3. The first keyframe's 'composition' field MUST start with the text: "[${options.aspectRatio} ${isHorizontal ? '가로' : '세로'} 구도 준수]".
    4. Ensure all action and blocking descriptions assume ${isHorizontal ? 'horizontal' : 'vertical'} space.

    LANGUAGE RULES:
    1. Technical fields (breakdown, approach, action, camera, lighting, sound, etc.) MUST be in ENGLISH.
    2. The 'theme' (Main Theme), 'logline' (Story Logline), and 'dialogue' fields MUST be in KOREAN.
    
    CONSTRAINTS:
    1. Audio: "No background music" (Focus on foley/dialogue).
    2. Byte Limit: Total JSON output size MUST be under 3,000 bytes. Be extremely concise.

    Keyframes Requirements:
    - Target Video Duration: ${options.duration}.
    - Include variation in shots (Wide, Close-up, POV, etc.).
       
    Output strictly valid JSON matching the schema.
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
    throw new Error("No response from Gemini");
  }

  const data = JSON.parse(response.text) as StoryboardData;
  return data;
};

export const editImageWithPrompt = async (originalFile: File, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToGenerativePart(originalFile);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: originalFile.type } },
        { text: prompt },
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
  throw new Error("No image generated/edited.");
};

export const generateKeyframeImage = async (
  prompt: string, 
  originalFile: File | null,
  modelType: ImageGenModel,
  aspectRatio: AspectRatio,
  characterContext?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = modelType === 'Nano Banana Pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const fullPrompt = `Cinematic movie shot (${aspectRatio}). ${characterContext ? `Character: ${characterContext}` : ''} No Hanbok. ${prompt} 8k, detailed.`;
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
  throw new Error("No image generated.");
}
