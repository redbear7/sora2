
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
    headline: {
      type: Type.OBJECT,
      properties: {
        line1: { type: Type.STRING, description: "Thumbnail top line text" },
        line2: { type: Type.STRING, description: "Thumbnail bottom line text" }
      },
      required: ["line1", "line2"]
    },
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
  required: ["headline", "breakdown", "theme", "approach", "keyframes"]
};

// Creating fresh GoogleGenAI instance inside the function to ensure the latest API key is used
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
    Role: Professional Cinematic Storyboard Director.
    Task: Analyze the input and generate a storyboard for a Korean Drama/Film context.
    
    NATIONALITY & STYLE:
    - Characters MUST be described as "South Korean" with contemporary Korean hairstyles and features.
    - Clothing: Modern, stylish, or business attire.
    - **CRITICAL RESTRICTION**: STRICTLY NO HANBOK (Traditional Clothing) unless the scene is explicitly a wedding (결혼식) or funeral (장례식).
    
    HEADLINE:
    - Create 2 powerful lines for a YouTube/Video thumbnail. 
    - Keep it under 15 characters per line. Korean language.

    CRITICAL MANDATE - ${options.aspectRatio} ASPECT RATIO:
    - Adhere strictly to ${options.aspectRatio} format.
    - First keyframe composition must include: "[${options.aspectRatio} ${isHorizontal ? '가로' : '세로'} 구도 준수]".

    LANGUAGE:
    - theme, logline, dialogue: KOREAN.
    - Technical fields (breakdown, action, etc.): ENGLISH.
    
    Output strictly valid JSON.
  `;

  contentParts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: { parts: contentParts },
    config: {
      responseMimeType: "application/json",
      responseSchema: storyboardSchema,
      temperature: 0.5, 
    }
  });

  if (!response.text) {
    throw new Error("No response from Gemini");
  }

  const data = JSON.parse(response.text) as StoryboardData;
  return data;
};

// Creating fresh GoogleGenAI instance inside the function to ensure the latest API key is used
export const editImageWithPrompt = async (originalFile: File, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = await fileToGenerativePart(originalFile);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', 
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType: originalFile.type } },
        { text: `${prompt}. Cinematic style, South Korean actors, no hanbok unless specified.` },
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

// Creating fresh GoogleGenAI instance inside the function to ensure the latest API key is used
export const generateKeyframeImage = async (
  prompt: string, 
  originalFile: File | null,
  modelType: ImageGenModel,
  aspectRatio: AspectRatio,
  characterContext?: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = modelType === 'Nano Banana Pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  const fullPrompt = `Cinematic shot (${aspectRatio}). Korean characters. No Hanbok (Traditional clothes) unless ritual. ${characterContext ? `Character details: ${characterContext}.` : ''} ${prompt} 8k, photorealistic.`;
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
